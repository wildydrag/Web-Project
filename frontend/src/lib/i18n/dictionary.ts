/**
 * Persian → English translations.
 *
 * The app is authored in Persian, so the Persian string doubles as the lookup
 * key. That keeps call sites readable — `t("ورود به نوا")` — and means any
 * string without an entry simply renders in Persian instead of breaking or
 * showing a raw key.
 */
export const EN: Record<string, string> = {
  // ── Brand & auth ─────────────────────────────────────────────────────────
  "نوا": "Nava",
  "ورود به نوا": "Sign in to Nava",
  "وارد حساب خود شوید و به موسیقی گوش دهید.": "Sign in and start listening.",
  "ایمیل": "Email",
  "رمز عبور": "Password",
  "تکرار رمز عبور": "Confirm password",
  "فراموشی رمز عبور؟": "Forgot password?",
  "ورود": "Sign in",
  "خروج": "Sign out",
  "حساب ندارید؟": "No account?",
  "حساب دارید؟": "Already have an account?",
  "ثبت‌نام": "Sign up",
  "ساخت حساب": "Create account",
  "به نوا بپیوندید.": "Join Nava.",
  "ساخت حساب و ورود": "Create account and sign in",
  "نام نمایشی": "Display name",
  "تاریخ تولد": "Date of birth",
  "جنسیت": "Gender",
  "زن": "Female",
  "مرد": "Male",
  "سایر": "Other",
  "ترجیح می‌دهم نگویم": "Prefer not to say",
  "کاربر عادی": "Listener",
  "هنرمند": "Artist",
  "نام هنری": "Stage name",
  "حساب‌های نمایشی — یک نقش در هر ردیف": "Demo accounts — one per role",
  "رمز عبور همه‌ی حساب‌های بالا یکسان است.": "All demo accounts share the same password.",

  // ── Navigation ───────────────────────────────────────────────────────────
  "خانه": "Home",
  "آلبوم‌ها و تک‌آهنگ‌ها": "Albums & singles",
  "پلی‌لیست‌ها": "Playlists",
  "مدیریت آثار": "Studio",
  "نمایه من": "My profile",
  "اعلانات": "Notifications",
  "تنظیمات": "Settings",
  "نمای کلی": "Overview",
  "تیکت‌ها": "Tickets",
  "احراز هویت هنرمندان": "Artist verification",
  "حسابرسی": "Auditing",
  "اشتراک‌ها و قیمت‌ها": "Subscriptions & pricing",

  // ── Home ─────────────────────────────────────────────────────────────────
  "صبح بخیر": "Good morning",
  "ظهر بخیر": "Good afternoon",
  "عصر بخیر": "Good evening",
  "شب بخیر": "Good night",
  "دسترسی زودهنگام": "Early access",
  "آثار تازه، زودتر از همه برای اعضای طلایی.": "New releases, early for gold members.",
  "پلی‌لیست‌های اخیر": "Recent playlists",
  "آخرین آلبوم‌ها": "Latest albums",
  "پرشنونده‌ها": "Most played",
  "مشاهده همه": "View all",
  "پیشنهاد برای شما": "Recommended for you",

  // ── Player ───────────────────────────────────────────────────────────────
  "پخش": "Play",
  "توقف": "Pause",
  "بعدی": "Next",
  "قبلی": "Previous",
  "صف پخش": "Queue",
  "متن آهنگ": "Lyrics",
  "تکرار": "Repeat",
  "پخش تصادفی": "Shuffle",
  "میزان صدا": "Volume",

  // ── Settings ─────────────────────────────────────────────────────────────
  "زبان": "Language",
  "فارسی": "فارسی",
  "English": "English",
  "اعلان‌ها": "Notifications",
  "تم": "Theme",
  "روشن": "Light",
  "تاریک": "Dark",
  "اشتراک": "Subscription",
  "ارتقا": "Upgrade",
  "حذف حساب کاربری": "Delete account",

  // ── Tiers ────────────────────────────────────────────────────────────────
  "پایه": "Basic",
  "پایه (رایگان)": "Basic (free)",
  "نقره‌ای": "Silver",
  "طلایی": "Gold",

  // ── Roles ────────────────────────────────────────────────────────────────
  "شنونده": "Listener",
  "پشتیبان": "Support",
  "مدیر سامانه": "Administrator",

  // ── Common actions & states ──────────────────────────────────────────────
  "ذخیره": "Save",
  "انصراف": "Cancel",
  "حذف": "Delete",
  "ویرایش": "Edit",
  "بستن": "Close",
  "جستجو": "Search",
  "تایید": "Approve",
  "رد": "Reject",
  "وضعیت": "Status",
  "تاریخ": "Date",
  "موضوع": "Subject",
  "کاربر": "User",
  "شناسه": "ID",
  "عملیات": "Actions",
  "در حال بارگذاری…": "Loading…",
  "چیزی یافت نشد": "Nothing found",
};

/** Languages the interface can be displayed in. */
export type Language = "fa" | "en";

export const DIRECTION: Record<Language, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};
