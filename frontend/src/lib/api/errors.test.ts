import { describe, expect, it } from "vitest";

import { ApiError, NetworkError } from "@/lib/api/client";
import { loginErrorMessage, registerErrorMessage } from "@/lib/api/errors";

/**
 * These screens previously blamed the user's credentials for every failure, so
 * a backend that was not running looked like a wrong password. The point of
 * these tests is that the message matches the actual cause.
 */
describe("loginErrorMessage", () => {
  it("says the server is unreachable when the request never landed", () => {
    const { title, description } = loginErrorMessage(new NetworkError());
    expect(title).toContain("ارتباط با سرور");
    expect(description).toContain("بک‌اند"); // tells them to start the backend
  });

  it("blames the credentials only on a real 401", () => {
    expect(loginErrorMessage(new ApiError(401, { detail: "No active account" })).title)
      .toContain("ایمیل یا رمز عبور");
  });

  it("passes through a server-supplied message for other failures", () => {
    const error = new ApiError(400, { errors: { email: ["این ایمیل معتبر نیست."] } });
    expect(registerErrorMessage(error).description).toBe("این ایمیل معتبر نیست.");
  });

  it("falls back gracefully for an unknown error", () => {
    const { title, description } = loginErrorMessage(new Error("boom"));
    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
  });
});

describe("registerErrorMessage", () => {
  it("reports a duplicate email using the server's own wording", () => {
    const error = new ApiError(400, {
      errors: { email: ["این ایمیل قبلاً ثبت شده است."] },
    });
    expect(registerErrorMessage(error).description).toBe("این ایمیل قبلاً ثبت شده است.");
  });

  it("does not claim a duplicate email when the server is down", () => {
    // The exact bug that was reported: a stopped backend read as "email taken".
    const { description } = registerErrorMessage(new NetworkError());
    expect(description).not.toContain("قبلاً ثبت شده");
  });

  it("reads a detail-style error body", () => {
    expect(registerErrorMessage(new ApiError(500, { detail: "خطای سرور" })).description)
      .toBe("خطای سرور");
  });
});

describe("ApiError.firstMessage", () => {
  it("prefers detail when present", () => {
    expect(new ApiError(400, { detail: "d" }).firstMessage).toBe("d");
  });

  it("reads the first field error otherwise", () => {
    expect(new ApiError(400, { errors: { password: ["کوتاه است"] } }).firstMessage)
      .toBe("کوتاه است");
  });

  it("returns null when the body carries no message", () => {
    expect(new ApiError(400, null).firstMessage).toBeNull();
    expect(new ApiError(400, { errors: {} }).firstMessage).toBeNull();
  });
});
