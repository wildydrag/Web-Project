/**
 * Typed HTTP client for the Nava (Phase 2) backend.
 *
 * The backend serializes camelCase, so responses map straight onto the
 * `lib/types.ts` contract with no transformation. JWT access/refresh tokens are
 * kept in localStorage; a 401 triggers a single refresh-and-retry.
 */

/**
 * Where the API lives, from the browser's point of view.
 *
 * Docker Compose passes this in at build time. The fallback is the port the
 * README tells you to run the backend on, so a fresh clone with no `.env.local`
 * still talks to a manually started backend instead of failing with
 * "could not reach the server".
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001/api";

const ACCESS_KEY = "nava-access";
const REFRESH_KEY = "nava-refresh";

export const tokenStore = {
  get access(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(`API ${status}`);
    this.name = "ApiError";
  }

  /**
   * The first human-readable message the server sent, if any.
   *
   * DRF replies either `{detail: "..."}` or `{errors: {field: ["..."]}}`
   * (see `common.exceptions`). Surfacing this is what lets the UI say *why*
   * a request failed instead of guessing.
   */
  get firstMessage(): string | null {
    const data = this.data as
      | { detail?: string; errors?: Record<string, string[] | string> }
      | null;
    if (!data) return null;
    if (typeof data.detail === "string") return data.detail;
    const errors = data.errors;
    if (errors) {
      for (const value of Object.values(errors)) {
        const message = Array.isArray(value) ? value[0] : value;
        if (typeof message === "string" && message.trim()) return message;
      }
    }
    return null;
  }
}

/**
 * The request never reached the server — it is down, on another port, or
 * blocked by CORS. Distinct from {@link ApiError} so the UI can tell the user
 * to start the backend rather than blaming their credentials.
 */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("network");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

async function refreshAccess(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    return false; // offline: fall through to the original 401
  }
  if (!res.ok) return false;
  const data = (await res.json()) as { access: string; refresh?: string };
  tokenStore.set(data.access, data.refresh);
  return true;
}

interface RequestOptions {
  json?: unknown;
  form?: FormData;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const build = (): RequestInit => {
    const headers: Record<string, string> = {};
    let body: BodyInit | undefined;
    if (opts.form) {
      body = opts.form; // browser sets multipart boundary
    } else if (opts.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.json);
    }
    const access = tokenStore.access;
    if (access) headers["Authorization"] = `Bearer ${access}`;
    return { method, headers, body };
  };

  // A failed `fetch` means the request never reached the server; that is a very
  // different problem from the server rejecting it, so it gets its own error.
  const send = async () => {
    try {
      return await fetch(`${BASE_URL}${path}`, build());
    } catch (error) {
      throw new NetworkError(error);
    }
  };

  let res = await send();
  if (res.status === 401 && (await refreshAccess())) {
    res = await send();
  }

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, data);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Unwrap a DRF paginated list (or pass through a bare array). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, json?: unknown) => request<T>("POST", path, { json }),
  patch: <T>(path: string, json?: unknown) => request<T>("PATCH", path, { json }),
  del: <T = void>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, form: FormData) => request<T>("POST", path, { form }),
  patchForm: <T>(path: string, form: FormData) => request<T>("PATCH", path, { form }),
  /** Fetch every page of a paginated collection. */
  async list<T>(path: string): Promise<T[]> {
    const sep = path.includes("?") ? "&" : "?";
    const data = await request<Paginated<T> | T[]>("GET", `${path}${sep}page_size=100`);
    return Array.isArray(data) ? data : data.results;
  },
};

export { BASE_URL };
