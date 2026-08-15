/**
 * Persian → English translations.
 *
 * The app is authored in Persian, so the Persian string doubles as the lookup
 * key. That keeps call sites readable — `t("ورود به نوا")` — and means any
 * string without an entry simply renders in Persian instead of breaking or
 * showing a raw key.
 *
 * Catalogue *data* — song titles, album names, artist names, lyrics — is never
 * translated. A Persian song keeps its Persian title in both languages, the
 * same way Spotify does not translate track names. Only the interface around
 * the music changes language.
 */
export const EN: Record<string, string> = {
  // ── Brand & auth ─────────────────────────────────────────────────────────
  "نوا": "Nava",
  "نوا — پخش و کشف موسیقی": "Nava — play and discover music",
  "نوا، سرویس استریم موسیقی: گوش دادن، ساخت پلی‌لیست، انتشار اثر برای هنرمندان و داشبورد مدیریت.":
    "Nava, a music streaming service: listen, build playlists, publish as an artist, and manage it all from the dashboard.",
  "سرویس استریم موسیقی نوا: گوش دادن، پلی‌لیست و انتشار اثر.":
    "Nava music streaming: listening, playlists and releases.",
  "ورود به نوا": "Sign in to Nava",
  "وارد حساب خود شوید و به موسیقی گوش دهید.": "Sign in and start listening.",
  "ایمیل": "Email",
  "رمز عبور": "Password",
  "تکرار رمز عبور": "Confirm password",
  "فراموشی رمز عبور؟": "Forgot password?",
  "بازیابی رمز عبور": "Reset password",
  "بازیابی ارسال شد.": "Reset link sent.",
  "ورود": "Sign in",
  // A separate key from "ورود" above: same word in Persian, but this one opens
  // a dashboard section rather than signing anybody in.
  "ورود به بخش": "Open",
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
  "نمونه‌کارها": "Portfolio",
  "لینک به آثار یا توضیح کوتاه": "A link to your work, or a short description",
  "سیاست حریم خصوصی": "Privacy policy",
  "را خوانده‌ام و می‌پذیرم.": "I have read and accept it.",
  "حساب‌های نمایشی — یک نقش در هر ردیف": "Demo accounts — one per role",
  "رمز عبور همه‌ی حساب‌های بالا یکسان است.": "All demo accounts share the same password.",
  "می‌توانید از حساب‌های نمایشی پایین صفحه استفاده کنید.":
    "You can use one of the demo accounts listed below.",

  // ── Auth validation & failures ───────────────────────────────────────────
  "ایمیل نامعتبر است": "That email address is not valid",
  "ایمیل یا رمز عبور نادرست است": "Wrong email or password",
  "رمز عبور حداقل ۶ کاراکتر باشد": "Password must be at least 6 characters",
  "رمز عبور و تکرار آن یکسان نیست": "The two passwords do not match",
  "نام نمایشی حداقل ۲ حرف باشد": "Display name must be at least 2 characters",
  "نام هنری حداقل ۲ حرف باشد": "Stage name must be at least 2 characters",
  "تاریخ تولد را وارد کنید": "Enter your date of birth",
  "نمونه‌کارها (لینک یا توضیح) را وارد کنید": "Enter a portfolio link or description",
  "پذیرش سیاست حریم خصوصی الزامی است": "You must accept the privacy policy",
  "ورود ناموفق بود": "Sign-in failed",
  "ثبت‌نام ناموفق بود": "Sign-up failed",
  "ارتباط با سرور برقرار نشد": "Could not reach the server",
  "لطفاً دوباره تلاش کنید.": "Please try again.",
  "حساب شما ساخته شد. خوش آمدید!": "Your account is ready. Welcome!",
  "درخواست هنرمندی ثبت شد": "Artist application submitted",
  "حساب شما در وضعیت «در انتظار تایید» قرار گرفت.": "Your account is now awaiting approval.",

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
  "منوی ناوبری": "Navigation menu",
  "منوی پنل مدیریت": "Dashboard menu",
  "باز کردن منو": "Open menu",
  "پنل مدیریت": "Dashboard",
  "رفتن به آرشیو": "Go to the library",
  "گزینه‌ها": "Options",
  "گزینه‌های بیشتر": "More options",

  // ── Home ─────────────────────────────────────────────────────────────────
  "صبح بخیر": "Good morning",
  "ظهر بخیر": "Good afternoon",
  "عصر بخیر": "Good evening",
  "شب بخیر": "Good night",
  "شب‌ بخیر": "Good night",
  "دسترسی زودهنگام": "Early access",
  "آثار تازه، زودتر از همه برای اعضای طلایی.": "New releases, early for gold members.",
  "پلی‌لیست‌های اخیر": "Recent playlists",
  "آخرین آلبوم‌ها": "Latest albums",
  "تازه‌ترین آلبوم‌ها": "Newest albums",
  "جدیدترین آثار منتشرشده در نوا": "The newest releases on Nava",
  "پرشنونده‌ها": "Most played",
  "پرشنونده‌ترین": "Most played",
  "آهنگ‌هایی که این روزها زیاد شنیده می‌شوند": "The tracks everyone is playing right now",
  "مشاهده همه": "View all",
  "پیشنهاد برای شما": "Recommended for you",
  "بر اساس آهنگ‌هایی که گوش داده‌اید": "Based on what you have been listening to",
  "دسترسی زودهنگام و استریم نامحدود می‌خواهید؟": "Want early access and unlimited streaming?",
  "ارتقا به طلایی": "Upgrade to Gold",

  // ── Library, search & catalogue ──────────────────────────────────────────
  "جستجو در آرشیو": "Search the library",
  "جستجوی آهنگ، آلبوم یا هنرمند…": "Search for a song, album or artist…",
  "نام اثر یا هنرمند…": "Track or artist name…",
  "تازه‌ترین": "Newest",
  "ژانر": "Genre",
  "همه": "All",
  "پاپ": "Pop",
  "راک": "Rock",
  "سنتی": "Traditional",
  "فولک": "Folk",
  "کلاسیک": "Classical",
  "الکترونیک": "Electronic",
  "هیپ‌هاپ": "Hip-hop",
  "جز": "Jazz",
  "آواز": "Vocal",
  "آلبوم": "Album",
  "آلبوم‌ها": "Albums",
  "تک‌آهنگ": "Single",
  "تک‌آهنگ‌ها": "Singles",
  "ترک‌ها": "Tracks",
  "پلی‌لیست": "Playlist",
  "نتیجه‌ای یافت نشد": "No results",
  "عبارت دیگری را جستجو کنید.": "Try a different search.",
  "تاریخ انتشار": "Release date",
  "هنرمندان همکار (اختیاری)": "Featured artists (optional)",

  // ── Player ───────────────────────────────────────────────────────────────
  "پخش": "Play",
  "توقف": "Pause",
  "بعدی": "Next",
  "قبلی": "Previous",
  "آهنگ بعدی": "Next track",
  "آهنگ قبلی": "Previous track",
  "صف پخش": "Queue",
  "متن آهنگ": "Lyrics",
  "متن آهنگ (اختیاری)": "Lyrics (optional)",
  "متنی ثبت نشده است.": "No lyrics have been added.",
  "تکرار": "Repeat",
  "حالت تکرار": "Repeat mode",
  "پخش تصادفی": "Shuffle",
  "میزان صدا": "Volume",
  "میزان صدای سامانه": "Player volume",
  "صدای سامانه": "Player volume",
  "بی‌صدا": "Mute",
  "در حال پخش": "Now playing",
  "نوار پیشرفت آهنگ": "Track progress",
  "باز کردن پخش‌کننده تمام‌صفحه": "Open full-screen player",
  "بستن پخش‌کننده": "Close player",
  "به صف پخش اضافه شد": "Added to the queue",
  "به‌عنوان آهنگ بعدی اضافه شد": "Added as the next track",
  "حذف از صف": "Remove from queue",
  "دانلود آهنگ": "Download track",

  // ── Playlists ────────────────────────────────────────────────────────────
  "پلی‌لیست جدید": "New playlist",
  "نام پلی‌لیست": "Playlist name",
  "مثلاً: آهنگ‌های مورد علاقه": "For example: Favourites",
  "پلی‌لیست ساخته شد": "Playlist created",
  "پلی‌لیست حذف شد": "Playlist deleted",
  "نام پلی‌لیست تغییر کرد": "Playlist renamed",
  "تغییر نام پلی‌لیست": "Rename playlist",
  "نام جدید": "New name",
  "پلی‌لیست یافت نشد": "Playlist not found",
  "این پلی‌لیست خالی است": "This playlist is empty",
  "از آرشیو، آهنگ‌ها را با منوی «…» به این پلی‌لیست اضافه کنید.":
    "Add tracks from the library using the “…” menu.",
  "هنوز پلی‌لیستی نساخته‌اید": "You have not created a playlist yet",
  "اولین پلی‌لیست خود را بسازید و آهنگ‌های محبوبتان را کنار هم جمع کنید.":
    "Create your first playlist and keep your favourite tracks together.",
  "به سقف تعداد پلی‌لیست رسیدید": "You have reached your playlist limit",
  "عمومی": "Public",

  // ── Profile & following ──────────────────────────────────────────────────
  "ویرایش نمایه": "Edit profile",
  "نمایه به‌روزرسانی شد": "Profile updated",
  "تصویر نمایه تغییر کرد": "Profile picture updated",
  "لطفاً یک فایل تصویری انتخاب کنید": "Please choose an image file",
  "برای تغییر تصویر، اشتراک خود را ارتقا دهید": "Upgrade your plan to change your picture",
  "دنبال‌کننده": "Follower",
  "دنبال‌شونده": "Following",
  "بیوگرافی ثبت نشده است.": "No biography yet.",
  "استریم امروز": "Streams today",
  "هنرمند تایید شده": "Verified artist",
  "هنرمند تایید‌شده": "Verified artist",
  "هنرمند در انتظار": "Pending artist",
  "هنرمند یافت نشد": "Artist not found",
  "شنوندگان ماهانه": "Monthly listeners",

  // ── Studio ───────────────────────────────────────────────────────────────
  "آثار خود را منتشر و مدیریت کنید.": "Publish and manage your releases.",
  "انتشار اثر جدید": "Publish a release",
  "اثر منتشر شد": "Release published",
  "اثر به‌روزرسانی شد": "Release updated",
  "اثر حذف شد": "Release deleted",
  "ویرایش اثر": "Edit release",
  "عنوان": "Title",
  "عنوان اثر را وارد کنید": "Enter a title",
  "حداقل یک ترک با عنوان وارد کنید": "Add at least one track with a title",
  "مدت (ثانیه)": "Duration (seconds)",
  "مدت ترک (ثانیه)": "Track duration (seconds)",
  "حذف ترک": "Remove track",
  "فایل صوتی": "Audio file",
  "کاور": "Cover art",
  "انتشار آلبوم ناموفق بود": "Publishing the album failed",
  "انتشار تک‌آهنگ ناموفق بود": "Publishing the single failed",
  "هنوز اثری منتشر نکرده‌اید": "You have not published anything yet",
  "اولین تک‌آهنگ یا آلبوم خود را منتشر کنید.": "Publish your first single or album.",
  "هنوز اثری منتشر نشده است.": "Nothing has been published yet.",
  "این بخش مخصوص هنرمندان است": "This area is for artists",
  "برای انتشار اثر باید حساب هنرمندی داشته باشید.":
    "You need an artist account to publish a release.",
  "حساب هنرمندی شما در انتظار تایید است": "Your artist account is awaiting approval",
  "درخواست هنرمندی شما رد شد": "Your artist application was rejected",
  "مشاهده آمار": "View statistics",
  "استریم‌ها": "Streams",
  "شنوندگان": "Listeners",
  "شنوندگان یکتا": "Unique listeners",
  "درآمد تخمینی": "Estimated earnings",
  "درآمد ماهانه": "Monthly earnings",
  "درآمد ماهانه (تخمینی)": "Monthly earnings (estimated)",

  // ── Settings ─────────────────────────────────────────────────────────────
  "زبان": "Language",
  "فارسی": "فارسی",
  "English": "English",
  "اعلان‌ها": "Notifications",
  "دریافت اعلان‌های سامانه": "Receive notifications from Nava",
  "تم": "Theme",
  "پوسته": "Theme",
  "روشن": "Light",
  "تاریک": "Dark",
  "روشن یا تیره": "Light or dark",
  "تغییر پوسته روشن/تیره": "Toggle light/dark theme",
  "حساب کاربری": "Account",
  "اشتراک": "Subscription",
  "اشتراک فعلی": "Current plan",
  "اشتراک پایه": "Basic plan",
  "ارتقا": "Upgrade",
  "انتخاب": "Choose",
  "نامحدود": "Unlimited",
  "دسترسی محدود": "Limited access",
  "با پایان دوره‌ی فعلی، اشتراک شما تمدید نمی‌شود.":
    "Your plan will not renew at the end of the current period.",
  "حذف حساب کاربری": "Delete account",
  "حذف حساب کاربری؟": "Delete your account?",
  "حذف حساب": "Delete account",
  "این عمل قابل بازگشت نیست.": "This cannot be undone.",
  "حساب و داده‌های شما برای همیشه حذف می‌شود.":
    "Your account and all of your data will be permanently deleted.",

  // ── Subscriptions & payment ──────────────────────────────────────────────
  "اشتراک شما فعال شد.": "Your subscription is now active.",
  "پرداخت موفق بود": "Payment successful",
  "پرداخت ناموفق بود": "Payment failed",
  "شروع پرداخت ناموفق بود": "Could not start the payment",
  "بررسی پرداخت ناموفق بود": "Could not verify the payment",
  "در انتظار پرداخت": "Awaiting payment",
  "رایگان": "Free",
  "برای استریم نامحدود، اشتراک خود را ارتقا دهید.": "Upgrade for unlimited streaming.",
  "به سقف استریم روزانه رسیدید": "You have reached today's streaming limit",
  "به سقف استریم روزانه رسیده‌اید. برای استریم نامحدود، اشتراک خود را ارتقا دهید.":
    "You have reached today's streaming limit. Upgrade for unlimited streaming.",

  // ── Notifications ────────────────────────────────────────────────────────
  "اعلان جدیدی ندارید": "No new notifications",
  "هر زمان اتفاق تازه‌ای بیفتد، اینجا به شما اطلاع می‌دهیم.":
    "Whenever something happens, you will hear about it here.",
  "خوانده‌نشده": "Unread",
  "علامت‌گذاری به‌عنوان خوانده‌شده": "Mark as read",
  "حذف اعلان": "Delete notification",

  // ── Dashboard: overview ──────────────────────────────────────────────────
  "کل کاربران": "Total users",
  "کل استریم‌ها": "Total streams",
  "کل مشترکان": "Total subscribers",
  "توزیع کاربران": "User breakdown",
  "توزیع کاربران بر اساس اشتراک": "Users by subscription plan",
  "اعضای طلایی": "Gold members",
  "اعضای نقره‌ای": "Silver members",
  "تیکت‌های باز": "Open tickets",
  "درخواست‌های در انتظار": "Pending applications",

  // ── Dashboard: tickets ───────────────────────────────────────────────────
  "تیکت‌های پشتیبانی": "Support tickets",
  "به سوالات کاربران پاسخ دهید.": "Answer questions from users.",
  "پاسخ به سوالات کاربران": "Answering user questions",
  "پاسخ خود را بنویسید…": "Write your reply…",
  "ارسال پاسخ": "Send reply",
  "پاسخ داده شده": "Answered",
  "باز": "Open",
  "بسته شده": "Closed",
  "این تیکت بسته شده است.": "This ticket is closed.",
  "تیکت یافت نشد": "Ticket not found",
  "تیکتی وجود ندارد": "There are no tickets",
  "تیکت‌ها و احراز هویت هنرمندان": "Tickets and artist verification",

  // ── Dashboard: artist approvals ──────────────────────────────────────────
  "بررسی و تایید درخواست‌ها": "Review and approve applications",
  "تاریخ درخواست": "Applied on",
  "رد درخواست": "Reject application",
  "دلیل رد": "Reason for rejection",
  "دلیل رد به هنرمند اطلاع داده می‌شود.": "The artist will be told why.",
  "درخواست رد شد": "Application rejected",
  "درخواست یافت نشد": "Application not found",
  "درخواستی در انتظار نیست": "No applications are waiting",
  "همه‌ی درخواست‌های احراز هویت بررسی شده‌اند.": "Every verification request has been reviewed.",

  // ── Dashboard: auditing & pricing ────────────────────────────────────────
  "حسابرسی ماهانه": "Monthly audit",
  "حسابرسی، کنترل قیمت‌ها و گزارش درآمد": "Auditing, pricing control and revenue reports",
  "کنترل قیمت‌ها": "Pricing control",
  "مدیریت قیمت و گزارش درآمد": "Pricing and revenue reporting",
  "قیمت اشتراک نقره‌ای (تومان / ماه)": "Silver price (Toman / month)",
  "قیمت اشتراک طلایی (تومان / ماه)": "Gold price (Toman / month)",
  "بروزرسانی قیمت‌ها": "Update pricing",
  "قیمت‌ها به‌روزرسانی شد": "Pricing updated",
  "قیمت‌های جدید بلافاصله در کل سامانه اعمال شد.":
    "The new prices took effect across the service immediately.",
  "پاداش": "Payout",
  "پاداش و تسویه هنرمندان": "Artist payouts and settlement",
  "تسویه شده": "Settled",
  "تسویه‌شده": "Settled",
  "این بخش تنها برای مدیر سامانه در دسترس است.": "This area is available to administrators only.",

  // ── Tiers ────────────────────────────────────────────────────────────────
  "پایه": "Basic",
  "پایه (رایگان)": "Basic (free)",
  "نقره‌ای": "Silver",
  "طلایی": "Gold",

  // ── Roles ────────────────────────────────────────────────────────────────
  "شنونده": "Listener",
  "پشتیبان": "Support",
  "مدیر سامانه": "Administrator",
  "مدیر": "Admin",
  "شنونده پایه": "Basic listener",
  "شنونده نقره‌ای": "Silver listener",
  "شنونده طلایی": "Gold listener",

  // ── Demo account descriptions (login page) ───────────────────────────────
  "سقف ۶۰ استریم روزانه و سقف ۶ پلی‌لیست": "A 60-stream daily cap and a 6-playlist limit",
  "دسترسی زودهنگام، آمار آهنگ‌ها، پلی‌لیست نامحدود":
    "Early access, per-track statistics, unlimited playlists",
  "اشتراک منقضی‌شده و نیاز به تمدید": "An expired plan that needs renewing",
  "استودیو، انتشار اثر با آپلود فایل، آمار و درآمد":
    "The studio: publishing with file upload, statistics and earnings",
  "حالت «در انتظار تایید» و مسدود بودن انتشار": "The “pending approval” state, with publishing blocked",

  // ── Demo account names ───────────────────────────────────────────────────
  "آرش": "Arash",
  "سارا": "Sara",
  "نگار": "Negar",
  "مریم": "Maryam",
  "بنیامین": "Benyamin",
  "کاوه": "Kaveh",
  "هورشید": "Khorshid",
  "بنیامین، کاوه": "Benyamin, Kaveh",

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
  "نامشخص": "Unknown",
  "در حال بارگذاری…": "Loading…",
  "چیزی یافت نشد": "Nothing found",
  "یافت نشد": "Not found",
  "موردی ثبت نشده است.": "There is nothing here yet.",
  "موردی که دنبالش بودید وجود ندارد یا حذف شده است.":
    "What you were looking for does not exist, or has been removed.",
  "آلبوم یافت نشد": "Album not found",
  "همگام‌سازی با سرور ناموفق بود": "Could not sync with the server",
  "بازگشت": "Back",
  "فعال": "Active",
  "ساخت": "Create",
  "انتشار": "Publish",
  "همین حالا": "just now",

  // ── Longer copy, buttons and page blurbs ─────────────────────────────────
  "آرشیو نوا را جستجو و کشف کنید.": "Search and explore the Nava library.",
  "ارسال درخواست هنرمندی": "Submit artist application",
  "پس از بررسی توسط پشتیبانان، نتیجه به شما اطلاع داده می‌شود.":
    "Our support team will review it and let you know the outcome.",
  "پس از بررسی نمونه‌کارها توسط پشتیبانان، نتیجه به شما اطلاع داده می‌شود و می‌توانید آثار خود را منتشر کنید.":
    "Once support has reviewed your portfolio you will be notified and can start publishing.",
  "ارسال لینک بازیابی": "Send reset link",
  "ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود.":
    "Enter your email and we will send you a reset link.",
  "اگر حسابی با ایمیل": "If an account exists for",
  "وجود داشته باشد، لینک بازیابی ارسال شد.": ", a reset link has been sent.",
  "بازگشت به ورود": "Back to sign in",
  "استریم نامحدود، دانلود و دسترسی زودهنگام به آثار جدید.":
    "Unlimited streaming, downloads and early access to new releases.",
  "مشاهده اشتراک‌ها": "View plans",
  "با اشتراک طلایی، آثار جدید را زودتر بشنوید.": "With Gold, hear new releases first.",
  "افزودن آهنگ": "Add a track",
  "افزودن به صف": "Add to queue",
  "افزودن به پلی‌لیست": "Add to playlist",
  "پخش به‌عنوان بعدی": "Play next",
  "افزودن ترک": "Add track",
  "انتشار اثر": "Publish release",
  "تغییر نام": "Rename",
  "حذف پلی‌لیست": "Delete playlist",
  "ساخت اولین پلی‌لیست": "Create your first playlist",
  "صف پخش خالی است.": "The queue is empty.",
  "برای این آهنگ متنی ثبت نشده است.": "No lyrics have been added for this track.",
  "پخش آثار": "Play releases",
  "تغییر تصویر": "Change picture",
  "خروج از حساب": "Sign out",
  "دنبال کردن": "Follow",
  "دنبال می‌کنید": "Following",
  "خواندن همه": "Mark all as read",
  "این عمل قابل بازگشت نیست و تمام پلی‌لیست‌ها و اطلاعات شما حذف می‌شود.":
    "This cannot be undone — every playlist and all of your data will be deleted.",

  // ── Dashboard copy ───────────────────────────────────────────────────────
  "درخواست‌های در انتظار تایید را بررسی کنید.": "Review the applications waiting for approval.",
  "مشاهده نمونه‌کارها": "View portfolio",
  "بازگشت به درخواست‌ها": "Back to applications",
  "تایید درخواست": "Approve application",
  "ثبت و رد درخواست": "Reject application",
  "بازگشت به تیکت‌ها": "Back to tickets",
  "بستن تیکت": "Close ticket",
  "بازگشایی": "Reopen",
  "قیمت اشتراک‌ها را تعیین کنید و گزارش درآمد را ببینید.":
    "Set subscription prices and review the revenue report.",
  "تغییر قیمت‌ها بلافاصله و بدون نیاز به تغییر در کد اعمال می‌شود.":
    "Price changes take effect immediately, with no code change needed.",
  "پاداش و وضعیت تسویه‌حساب هنرمندان.": "Artist payouts and settlement status.",
  "تایید تسویه": "Confirm settlement",

  // ── Privacy policy ───────────────────────────────────────────────────────
  "خلاصه‌ای از نحوه‌ی نگه‌داری و استفاده‌ی نوا از اطلاعات شما.":
    "A summary of how Nava stores and uses your information.",
  "نوا اطلاعات حساب شما (نام نمایشی، ایمیل و ترجیحات) را تنها برای ارائه‌ی سرویس استریم موسیقی نگه می‌دارد و آن‌ها را در اختیار اشخاص ثالث قرار نمی‌دهد.":
    "Nava keeps your account details (display name, email and preferences) solely to provide the music streaming service, and does not share them with third parties.",
  "تاریخچه‌ی پخش و علاقه‌مندی‌های شما برای بهبود پیشنهادها استفاده می‌شود. در هر زمان می‌توانید از بخش «تنظیمات» حساب خود را حذف کنید.":
    "Your listening history and favourites are used to improve recommendations. You can delete your account at any time from Settings.",
  "با ثبت‌نام، می‌پذیرید که داده‌های لازم برای عملکرد سرویس (مانند پلی‌لیست‌ها و آمار شنیدن) ذخیره شوند. این متن صرفاً نمونه است و در فاز بعد تکمیل می‌شود.":
    "By signing up you agree that the data the service needs to work — playlists and listening statistics — will be stored.",

  // ── Checkout ─────────────────────────────────────────────────────────────
  "مدت اشتراک را انتخاب کنید و به درگاه پرداخت بروید.":
    "Choose a billing period and continue to the payment gateway.",
  "خرید اشتراک {tier}": "Subscribe to {tier}",
  "{n} ماه": "{n} months",
  "پرداخت {amount}": "Pay {amount}",
  "در حال انتقال به درگاه…": "Redirecting to the gateway…",
  "پرداخت لغو شد": "Payment cancelled",
  "پرداخت شما تکمیل نشد.": "Your payment was not completed.",
  "در حال بررسی پرداخت…": "Verifying your payment…",
  "شماره پیگیری: {ref}": "Reference number: {ref}",
  "بازگشت به تنظیمات": "Back to settings",
  "پرداخت از طریق درگاه زرین‌پال انجام می‌شود.": "Payments are handled by the ZarinPal gateway.",

  // ── Strings with values substituted in ───────────────────────────────────
  // The `{placeholder}` slots survive translation, so word order can differ
  // between the two languages without breaking the sentence.
  "{n} آهنگ": "{n} tracks",
  "{n} دقیقه": "{n} minutes",
  "{n} از {limit} پلی‌لیست": "{n} of {limit} playlists",
  "{n} ماه اشتراک": "{n} months of membership",
  "حذف «{name}»؟": "Delete “{name}”?",
  "خوش آمدید، {name}": "Welcome, {name}",
  "خوش آمدید، {name}.": "Welcome, {name}.",
  "امروز {n} استریم دیگر باقی مانده است.": "{n} streams left today.",
  "{price} / ماه": "{price} / month",
  "میزان صدا: {n}٪": "Volume: {n}%",
  "{n} در روز": "{n} per day",
  "استریم: {value}": "Streaming: {value}",
  "پلی‌لیست: {value}": "Playlists: {value}",
  "دلیل: {reason}": "Reason: {reason}",
  "{name} تایید شد": "{name} approved",
  "تاریخ درخواست: {date}": "Applied on {date}",
  "این درخواست قبلاً {status} شده است.": "This application has already been {status}.",
  "تایید شده": "approved",
  "رد شده": "rejected",
  "دوره: {period}": "Period: {period}",
  "پاداش هنرمندان بر اساس استریم‌های ثبت‌شده در همان دوره محاسبه می‌شود.":
    "Artist payouts are calculated from the streams recorded in that period.",
  "اشتراک {tier} حداکثر {n} پلی‌لیست دارد.": "The {tier} plan allows at most {n} playlists.",
  "پخش {title}": "Play {title}",
  "{listeners} شنونده · {streams} استریم": "{listeners} listeners · {streams} streams",
  "متن آهنگ — {title}": "Lyrics — {title}",
  "عنوان ترک {n}": "Track {n} title",
  "مطمئن شوید بک‌اند در حال اجراست ({url}).": "Make sure the backend is running ({url}).",
  "{value} ({percent}٪)": "{value} ({percent}%)",

  // ── Why a song was recommended ───────────────────────────────────────────
  // The recommender sends these as templates plus arguments rather than
  // finished sentences, precisely so they can be translated here.
  "چون {artist} را دنبال می‌کنید": "Because you follow {artist}",
  "چون قبلاً به {artist} گوش داده‌اید": "Because you have listened to {artist}",
  "چون به سبک {genre} علاقه دارید": "Because you like {genre}",
  "از محبوب‌ترین‌های نوا": "One of the most popular on Nava",

  // ── Messages the API returns ─────────────────────────────────────────────
  // Django validates in Persian; these entries let the same message read
  // correctly when the interface is in English.
  "این ایمیل قبلاً ثبت شده است.": "That email address is already registered.",
  "آلبوم باید حداقل یک آهنگ داشته باشد.": "An album must contain at least one track.",
  "به سقف استریم روزانه رسیدید. برای استریم نامحدود، اشتراک خود را ارتقا دهید.":
    "You have reached today's streaming limit. Upgrade for unlimited streaming.",
  "به سقف تعداد پلی‌لیست‌های مجاز در اشتراک خود رسیده‌اید.":
    "You have reached the playlist limit for your plan.",
  "برای آپلود عکس نمایه باید اشتراک خود را ارتقا دهید.":
    "Upgrade your plan to upload a profile picture.",
  "تراکنش یافت نشد.": "Transaction not found.",
  "ژانر نامعتبر است.": "That genre is not valid.",
  "وضعیت نامعتبر است.": "That status is not valid.",
  "فهرست ترک‌ها معتبر نیست.": "The track list is not valid.",
  "دلیل رد درخواست الزامی است.": "A reason for rejection is required.",
  "متن پاسخ الزامی است.": "A reply message is required.",
};

/** Languages the interface can be displayed in. */
export type Language = "fa" | "en";

export const DIRECTION: Record<Language, "rtl" | "ltr"> = {
  fa: "rtl",
  en: "ltr",
};

/** BCP-47 tags, used for `Intl` formatting and the `lang` attribute. */
export const LOCALE: Record<Language, string> = {
  fa: "fa-IR",
  en: "en-US",
};
