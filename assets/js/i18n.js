// HB Bank — internationalisation (English + Arabic) with RTL switching.
//
// Usage in HTML:
//   <span data-i18n="nav.login"></span>           → sets textContent
//   <input data-i18n-placeholder="login.email">    → sets placeholder
//   <h2 data-i18n-html="cta.title"></h2>           → sets innerHTML (allows markup)
//
// In JS: import { t, applyLang, getLang, formatCurrency, formatDate } from "./i18n.js";
// Listen for re-render hooks: window.addEventListener("hb:langchange", e => { ... });

const STORAGE_KEY = "hb_lang";

const dict = {
  en: {
    // ── Top bar / nav ──
    "brand.name": "HB Bank",
    "topbar.hotline": "Hotline 19888",
    "topbar.internetBanking": "Internet Banking",
    "nav.personal": "Personal",
    "nav.business": "Business",
    "nav.accounts": "Accounts",
    "nav.cards": "Cards",
    "nav.loans": "Loans",
    "nav.about": "About Us",
    "nav.login": "Login",
    "nav.openAccount": "Open Account",
    "lang.switch": "العربية",

    // ── Hero slides ──
    "hero1.tag": "Personal Banking",
    "hero1.title": "Banking that moves with you",
    "hero1.sub": "Open an HB account in minutes and manage your money anytime, anywhere.",
    "hero1.cta": "Open an account",
    "hero2.tag": "HB Cards",
    "hero2.title": "Smart cards, real rewards",
    "hero2.sub": "Earn cashback on everyday spending with a card designed around your life.",
    "hero2.cta": "Explore cards",
    "hero3.tag": "Finance",
    "hero3.title": "Loans tailored to your goals",
    "hero3.sub": "Flexible personal, auto and home finance with fast approvals.",
    "hero3.cta": "Discover loans",

    // ── Quick services ──
    "quick.title": "Quick services",
    "quick.openAccount": "Open Account",
    "quick.transfer": "Transfer Money",
    "quick.cards": "Cards",
    "quick.loans": "Loans",
    "quick.rates": "Exchange Rates",
    "quick.support": "Support",

    // ── Products ──
    "products.tag": "What we offer",
    "products.title": "Everything you need from your bank",
    "products.accounts.title": "Accounts & Deposits",
    "products.accounts.desc": "Current and savings accounts with competitive returns and zero hidden fees.",
    "products.cards.title": "Cards",
    "products.cards.desc": "Debit and credit cards with cashback, rewards and worldwide acceptance.",
    "products.loans.title": "Loans & Finance",
    "products.loans.desc": "Personal, auto and home finance with flexible tenors and fast approval.",
    "products.digital.title": "Digital Banking",
    "products.digital.desc": "Bank online and on mobile — transfers, payments and more, 24/7.",
    "products.learnMore": "Learn more",

    // ── Exchange rates ──
    "rates.title": "Exchange rates",
    "rates.subtitle": "Indicative rates against the Egyptian Pound (EGP)",
    "rates.currency": "Currency",
    "rates.buy": "Buy",
    "rates.sell": "Sell",
    "rates.note": "Rates are indicative and shown for demonstration purposes only.",
    "currency.USD": "US Dollar",
    "currency.EUR": "Euro",
    "currency.GBP": "British Pound",
    "currency.SAR": "Saudi Riyal",
    "currency.AED": "UAE Dirham",

    // ── Why HB ──
    "why.title": "Why bank with HB",
    "why.secure.title": "Bank-grade security",
    "why.secure.desc": "Your money and data are protected with encryption and strict access controls.",
    "why.support.title": "24/7 support",
    "why.support.desc": "Our team is here around the clock, every day of the year.",
    "why.network.title": "Nationwide network",
    "why.network.desc": "Hundreds of branches and thousands of ATMs across the country.",
    "why.fast.title": "Instant transfers",
    "why.fast.desc": "Move money between accounts and to others in seconds.",

    // ── Stats ──
    "stats.customers": "Customers",
    "stats.branches": "Branches",
    "stats.atms": "ATMs",
    "stats.years": "Years of trust",

    // ── CTA band ──
    "cta.title": "Ready to start banking smarter?",
    "cta.desc": "Open your HB account today — it only takes a few minutes.",
    "cta.button": "Open your account",

    // ── Footer ──
    "footer.tagline": "Modern banking for everyone. Secure, simple and always within reach.",
    "footer.col.banking": "Banking",
    "footer.col.company": "Company",
    "footer.col.support": "Support",
    "footer.accounts": "Accounts",
    "footer.cards": "Cards",
    "footer.loans": "Loans",
    "footer.digital": "Digital Banking",
    "footer.about": "About Us",
    "footer.careers": "Careers",
    "footer.press": "Newsroom",
    "footer.help": "Help Center",
    "footer.branches": "Branches & ATMs",
    "footer.contact": "Contact Us",
    "footer.security": "Security",
    "footer.rights": "© 2026 HB Bank. All rights reserved.",
    "footer.disclaimer": "HB Bank is a demonstration project and not a real financial institution.",

    // ── Login / sign up ──
    "login.brandSub": "Internet Banking",
    "login.welcome": "Welcome back",
    "login.welcomeSub": "Sign in to access your accounts.",
    "login.createTitle": "Create your account",
    "login.createSub": "Join HB Bank in a couple of minutes.",
    "login.tab.signin": "Sign In",
    "login.tab.signup": "Sign Up",
    "login.fullName": "Full name",
    "login.email": "Email address",
    "login.phone": "Phone (optional)",
    "login.password": "Password",
    "login.signinBtn": "Sign In",
    "login.signupBtn": "Create Account",
    "login.processing": "Please wait…",
    "login.backHome": "← Back to home",
    "login.haveAccount": "Already have an account?",
    "login.noAccount": "New to HB Bank?",
    "login.signupSeed": "Every new account starts with a demo balance so you can try transfers right away.",

    // ── Dashboard ──
    "dash.brandSub": "Internet Banking",
    "dash.nav.overview": "Overview",
    "dash.nav.transfer": "Transfer",
    "dash.nav.transactions": "Transactions",
    "dash.nav.settings": "Settings",
    "dash.logout": "Log out",
    "dash.greeting": "Welcome back",
    "dash.totalBalance": "Total balance",
    "dash.acrossAccounts": "Across all your accounts",
    "dash.yourAccounts": "Your accounts",
    "dash.account.checking": "Current account",
    "dash.account.savings": "Savings account",
    "dash.accountNumber": "Account number",
    "dash.available": "Available balance",
    "dash.recent": "Recent activity",
    "dash.viewAll": "View all",

    "transfer.title": "Transfer money",
    "transfer.sub": "Send money between your accounts or to another HB account.",
    "transfer.from": "From account",
    "transfer.to": "To account number",
    "transfer.toPlaceholder": "e.g. HB000000000000",
    "transfer.amount": "Amount (EGP)",
    "transfer.amountPlaceholder": "0.00",
    "transfer.description": "Description (optional)",
    "transfer.descriptionPlaceholder": "What's this for?",
    "transfer.submit": "Send transfer",
    "transfer.sending": "Sending…",
    "transfer.success": "Transfer completed successfully.",
    "transfer.successInternal": "Transfer completed — funds moved instantly.",
    "transfer.errInsufficient": "Insufficient funds in the selected account.",
    "transfer.errSameAccount": "You can't transfer to the same account.",
    "transfer.errNotFound": "Source account not found.",
    "transfer.errAmount": "Please enter an amount greater than zero.",
    "transfer.errToRequired": "Please enter a destination account number.",

    "tx.title": "Transaction history",
    "tx.filter": "Account",
    "tx.all": "All accounts",
    "tx.date": "Date",
    "tx.description": "Description",
    "tx.counterparty": "Counterparty",
    "tx.amount": "Amount",
    "tx.balance": "Balance",
    "tx.empty": "No transactions yet.",

    "settings.title": "Settings",
    "settings.sub": "Manage your profile and preferences.",
    "settings.fullName": "Full name",
    "settings.phone": "Phone number",
    "settings.language": "Preferred language",
    "settings.langEn": "English",
    "settings.langAr": "Arabic",
    "settings.save": "Save changes",
    "settings.saving": "Saving…",
    "settings.saved": "Your settings have been saved.",

    // ── Generic ──
    "common.loading": "Loading…",
    "common.cancel": "Cancel",
    "common.credit": "Credit",
    "common.debit": "Debit",
    "common.notConfigured": "The banking backend isn't connected yet. Add your Supabase URL and key to config.js to enable sign-in.",
    "error.generic": "Something went wrong. Please try again.",
    "error.invalidCredentials": "Invalid email or password.",
    "error.emailInUse": "This email is already registered. Try signing in.",
    "error.weakPassword": "Password must be at least 6 characters.",
    "error.fields": "Please fill in all required fields.",
    "auth.checkEmail": "Account created. If email confirmation is on, check your inbox to confirm, then sign in.",
  },

  ar: {
    // ── Top bar / nav ──
    "brand.name": "بنك إتش بي",
    "topbar.hotline": "الخط الساخن 19888",
    "topbar.internetBanking": "الإنترنت البنكي",
    "nav.personal": "أفراد",
    "nav.business": "شركات",
    "nav.accounts": "الحسابات",
    "nav.cards": "البطاقات",
    "nav.loans": "القروض",
    "nav.about": "عن البنك",
    "nav.login": "تسجيل الدخول",
    "nav.openAccount": "افتح حساباً",
    "lang.switch": "English",

    // ── Hero slides ──
    "hero1.tag": "الخدمات المصرفية للأفراد",
    "hero1.title": "خدمات مصرفية تواكب حياتك",
    "hero1.sub": "افتح حسابك في بنك إتش بي خلال دقائق وأدِر أموالك في أي وقت ومن أي مكان.",
    "hero1.cta": "افتح حساباً",
    "hero2.tag": "بطاقات إتش بي",
    "hero2.title": "بطاقات ذكية ومكافآت حقيقية",
    "hero2.sub": "احصل على استرداد نقدي على مشترياتك اليومية مع بطاقة مصممة لحياتك.",
    "hero2.cta": "استكشف البطاقات",
    "hero3.tag": "التمويل",
    "hero3.title": "قروض مصممة لتحقيق أهدافك",
    "hero3.sub": "تمويل شخصي وسيارات وعقارات مرن مع موافقات سريعة.",
    "hero3.cta": "اكتشف القروض",

    // ── Quick services ──
    "quick.title": "خدمات سريعة",
    "quick.openAccount": "افتح حساباً",
    "quick.transfer": "تحويل الأموال",
    "quick.cards": "البطاقات",
    "quick.loans": "القروض",
    "quick.rates": "أسعار الصرف",
    "quick.support": "الدعم",

    // ── Products ──
    "products.tag": "ماذا نقدم",
    "products.title": "كل ما تحتاجه من بنكك",
    "products.accounts.title": "الحسابات والودائع",
    "products.accounts.desc": "حسابات جارية وتوفير بعوائد تنافسية وبدون رسوم خفية.",
    "products.cards.title": "البطاقات",
    "products.cards.desc": "بطاقات خصم وائتمان مع استرداد نقدي ومكافآت وقبول عالمي.",
    "products.loans.title": "القروض والتمويل",
    "products.loans.desc": "تمويل شخصي وسيارات وعقارات بآجال مرنة وموافقة سريعة.",
    "products.digital.title": "الخدمات المصرفية الرقمية",
    "products.digital.desc": "تعامل عبر الإنترنت والهاتف — تحويلات ومدفوعات والمزيد على مدار الساعة.",
    "products.learnMore": "اعرف المزيد",

    // ── Exchange rates ──
    "rates.title": "أسعار الصرف",
    "rates.subtitle": "أسعار استرشادية مقابل الجنيه المصري",
    "rates.currency": "العملة",
    "rates.buy": "شراء",
    "rates.sell": "بيع",
    "rates.note": "الأسعار استرشادية ولأغراض العرض التوضيحي فقط.",
    "currency.USD": "الدولار الأمريكي",
    "currency.EUR": "اليورو",
    "currency.GBP": "الجنيه الإسترليني",
    "currency.SAR": "الريال السعودي",
    "currency.AED": "الدرهم الإماراتي",

    // ── Why HB ──
    "why.title": "لماذا بنك إتش بي",
    "why.secure.title": "أمان بمعايير مصرفية",
    "why.secure.desc": "أموالك وبياناتك محمية بالتشفير وضوابط وصول صارمة.",
    "why.support.title": "دعم على مدار الساعة",
    "why.support.desc": "فريقنا متاح على مدار اليوم طوال أيام السنة.",
    "why.network.title": "شبكة على مستوى البلاد",
    "why.network.desc": "مئات الفروع وآلاف أجهزة الصراف الآلي في كل مكان.",
    "why.fast.title": "تحويلات فورية",
    "why.fast.desc": "حوّل الأموال بين حساباتك وإلى الآخرين في ثوانٍ.",

    // ── Stats ──
    "stats.customers": "عميل",
    "stats.branches": "فرع",
    "stats.atms": "صراف آلي",
    "stats.years": "عاماً من الثقة",

    // ── CTA band ──
    "cta.title": "هل أنت مستعد لتجربة مصرفية أذكى؟",
    "cta.desc": "افتح حسابك في بنك إتش بي اليوم — لا يستغرق الأمر سوى دقائق.",
    "cta.button": "افتح حسابك",

    // ── Footer ──
    "footer.tagline": "خدمات مصرفية حديثة للجميع. آمنة وبسيطة وفي متناول يدك دائماً.",
    "footer.col.banking": "الخدمات المصرفية",
    "footer.col.company": "الشركة",
    "footer.col.support": "الدعم",
    "footer.accounts": "الحسابات",
    "footer.cards": "البطاقات",
    "footer.loans": "القروض",
    "footer.digital": "الخدمات الرقمية",
    "footer.about": "عن البنك",
    "footer.careers": "الوظائف",
    "footer.press": "الأخبار",
    "footer.help": "مركز المساعدة",
    "footer.branches": "الفروع والصرافات",
    "footer.contact": "اتصل بنا",
    "footer.security": "الأمان",
    "footer.rights": "© 2026 بنك إتش بي. جميع الحقوق محفوظة.",
    "footer.disclaimer": "بنك إتش بي مشروع توضيحي وليس مؤسسة مالية حقيقية.",

    // ── Login / sign up ──
    "login.brandSub": "الإنترنت البنكي",
    "login.welcome": "مرحباً بعودتك",
    "login.welcomeSub": "سجّل الدخول للوصول إلى حساباتك.",
    "login.createTitle": "أنشئ حسابك",
    "login.createSub": "انضم إلى بنك إتش بي في دقائق معدودة.",
    "login.tab.signin": "تسجيل الدخول",
    "login.tab.signup": "إنشاء حساب",
    "login.fullName": "الاسم الكامل",
    "login.email": "البريد الإلكتروني",
    "login.phone": "الهاتف (اختياري)",
    "login.password": "كلمة المرور",
    "login.signinBtn": "تسجيل الدخول",
    "login.signupBtn": "إنشاء حساب",
    "login.processing": "يرجى الانتظار…",
    "login.backHome": "→ العودة للرئيسية",
    "login.haveAccount": "لديك حساب بالفعل؟",
    "login.noAccount": "جديد في بنك إتش بي؟",
    "login.signupSeed": "كل حساب جديد يبدأ برصيد تجريبي حتى تجرب التحويلات على الفور.",

    // ── Dashboard ──
    "dash.brandSub": "الإنترنت البنكي",
    "dash.nav.overview": "نظرة عامة",
    "dash.nav.transfer": "تحويل",
    "dash.nav.transactions": "المعاملات",
    "dash.nav.settings": "الإعدادات",
    "dash.logout": "تسجيل الخروج",
    "dash.greeting": "مرحباً بعودتك",
    "dash.totalBalance": "إجمالي الرصيد",
    "dash.acrossAccounts": "عبر جميع حساباتك",
    "dash.yourAccounts": "حساباتك",
    "dash.account.checking": "الحساب الجاري",
    "dash.account.savings": "حساب التوفير",
    "dash.accountNumber": "رقم الحساب",
    "dash.available": "الرصيد المتاح",
    "dash.recent": "آخر العمليات",
    "dash.viewAll": "عرض الكل",

    "transfer.title": "تحويل الأموال",
    "transfer.sub": "حوّل الأموال بين حساباتك أو إلى حساب آخر في بنك إتش بي.",
    "transfer.from": "من حساب",
    "transfer.to": "إلى رقم الحساب",
    "transfer.toPlaceholder": "مثال: HB000000000000",
    "transfer.amount": "المبلغ (ج.م)",
    "transfer.amountPlaceholder": "0.00",
    "transfer.description": "الوصف (اختياري)",
    "transfer.descriptionPlaceholder": "ما الغرض من التحويل؟",
    "transfer.submit": "إرسال التحويل",
    "transfer.sending": "جارٍ الإرسال…",
    "transfer.success": "تم التحويل بنجاح.",
    "transfer.successInternal": "تم التحويل — انتقلت الأموال على الفور.",
    "transfer.errInsufficient": "رصيد غير كافٍ في الحساب المحدد.",
    "transfer.errSameAccount": "لا يمكنك التحويل إلى نفس الحساب.",
    "transfer.errNotFound": "لم يتم العثور على الحساب المصدر.",
    "transfer.errAmount": "يرجى إدخال مبلغ أكبر من صفر.",
    "transfer.errToRequired": "يرجى إدخال رقم الحساب المستلم.",

    "tx.title": "سجل المعاملات",
    "tx.filter": "الحساب",
    "tx.all": "جميع الحسابات",
    "tx.date": "التاريخ",
    "tx.description": "الوصف",
    "tx.counterparty": "الطرف الآخر",
    "tx.amount": "المبلغ",
    "tx.balance": "الرصيد",
    "tx.empty": "لا توجد معاملات بعد.",

    "settings.title": "الإعدادات",
    "settings.sub": "أدر ملفك الشخصي وتفضيلاتك.",
    "settings.fullName": "الاسم الكامل",
    "settings.phone": "رقم الهاتف",
    "settings.language": "اللغة المفضلة",
    "settings.langEn": "الإنجليزية",
    "settings.langAr": "العربية",
    "settings.save": "حفظ التغييرات",
    "settings.saving": "جارٍ الحفظ…",
    "settings.saved": "تم حفظ إعداداتك.",

    // ── Generic ──
    "common.loading": "جارٍ التحميل…",
    "common.cancel": "إلغاء",
    "common.credit": "إيداع",
    "common.debit": "سحب",
    "common.notConfigured": "لم يتم ربط النظام المصرفي بعد. أضف رابط Supabase والمفتاح في ملف config.js لتفعيل تسجيل الدخول.",
    "error.generic": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    "error.invalidCredentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "error.emailInUse": "هذا البريد مسجل بالفعل. حاول تسجيل الدخول.",
    "error.weakPassword": "يجب ألا تقل كلمة المرور عن 6 أحرف.",
    "error.fields": "يرجى ملء جميع الحقول المطلوبة.",
    "auth.checkEmail": "تم إنشاء الحساب. إذا كان تأكيد البريد مفعّلاً، تحقق من بريدك ثم سجّل الدخول.",
  },
};

let currentLang = "en";

export function getLang() {
  return currentLang;
}

export function t(key, vars) {
  const table = dict[currentLang] || dict.en;
  let str = (key in table ? table[key] : (key in dict.en ? dict.en[key] : key));
  if (vars) {
    for (const k in vars) str = str.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
  }
  return str;
}

// Currency formatting. Keeps Latin digits in Arabic for legibility (-u-nu-latn).
export function formatCurrency(amount, currency = "EGP") {
  const locale = currentLang === "ar" ? "ar-EG-u-nu-latn" : "en-EG";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch {
    return (Number(amount) || 0).toFixed(2) + " " + currency;
  }
}

export function formatDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  const locale = currentLang === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

// Applies a language across the document and notifies listeners.
export function applyLang(lang) {
  currentLang = dict[lang] ? lang : "en";
  try { localStorage.setItem(STORAGE_KEY, currentLang); } catch {}

  const html = document.documentElement;
  html.lang = currentLang;
  html.dir = currentLang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });

  window.dispatchEvent(new CustomEvent("hb:langchange", { detail: { lang: currentLang } }));
}

export function toggleLang() {
  applyLang(currentLang === "en" ? "ar" : "en");
}

// Reads the saved language (or browser default) and applies it. Call on load.
export function initLang() {
  let lang = "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dict[saved]) lang = saved;
    else if ((navigator.language || "").toLowerCase().startsWith("ar")) lang = "ar";
  } catch {}
  applyLang(lang);
  return lang;
}
