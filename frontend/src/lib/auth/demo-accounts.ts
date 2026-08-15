/**
 * Demo accounts surfaced on the login screen.
 *
 * One per role/tier so a reviewer can reach every surface of the app in a
 * click, and the credentials are shown in full so they can also be typed by
 * hand. These are seeded by the backend's `seed` management command and all
 * share {@link DEMO_PASSWORD}.
 */
export interface DemoAccount {
  email: string;
  label: string;
  /** Role/tier, e.g. "شنونده طلایی". */
  hint: string;
  /** What this account is useful for demonstrating. */
  shows: string;
}

/** Every seeded demo account uses this password. */
export const DEMO_PASSWORD = "nava1234";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "gold@nava.app",
    label: "سارا",
    hint: "شنونده طلایی",
    shows: "دسترسی زودهنگام، آمار آهنگ‌ها، پلی‌لیست نامحدود",
  },
  {
    email: "silver@nava.app",
    label: "آرش",
    hint: "شنونده نقره‌ای",
    shows: "اشتراک منقضی‌شده و نیاز به تمدید",
  },
  {
    email: "basic@nava.app",
    label: "نگار",
    hint: "شنونده پایه",
    shows: "سقف ۶۰ استریم روزانه و سقف ۶ پلی‌لیست",
  },
  {
    email: "artist@nava.app",
    label: "بنیامین",
    hint: "هنرمند تایید‌شده",
    shows: "استودیو، انتشار اثر با آپلود فایل، آمار و درآمد",
  },
  {
    email: "pending@nava.app",
    label: "هورشید",
    hint: "هنرمند در انتظار",
    shows: "حالت «در انتظار تایید» و مسدود بودن انتشار",
  },
  {
    email: "support@nava.app",
    label: "مریم",
    hint: "پشتیبان",
    shows: "تیکت‌ها و احراز هویت هنرمندان",
  },
  {
    email: "admin@nava.app",
    label: "مدیر",
    hint: "مدیر سامانه",
    shows: "حسابرسی، کنترل قیمت‌ها و گزارش درآمد",
  },
];
