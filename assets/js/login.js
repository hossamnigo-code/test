// HB Bank — login / sign-up page logic.
import { initLang, toggleLang, t } from "./i18n.js";
import { signIn, signUp, redirectIfAuthed, isConfigured } from "./auth.js";

initLang();
document.getElementById("langToggle")?.addEventListener("click", toggleLang);

const tabSignin = document.getElementById("tabSignin");
const tabSignup = document.getElementById("tabSignup");
const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");
const msg = document.getElementById("formMsg");

function showMsg(text, type = "error") {
  msg.textContent = text;
  msg.className = "form-msg show " + type;
}
function clearMsg() {
  msg.className = "form-msg";
  msg.textContent = "";
}

function setTab(which) {
  const signup = which === "signup";
  tabSignup.classList.toggle("active", signup);
  tabSignin.classList.toggle("active", !signup);
  signupForm.classList.toggle("active", signup);
  signinForm.classList.toggle("active", !signup);
  clearMsg();
}

tabSignin.addEventListener("click", () => setTab("signin"));
tabSignup.addEventListener("click", () => setTab("signup"));
document.getElementById("goSignup")?.addEventListener("click", (e) => { e.preventDefault(); setTab("signup"); });
document.getElementById("goSignin")?.addEventListener("click", (e) => { e.preventDefault(); setTab("signin"); });
if (location.hash === "#signup") setTab("signup");

// Disable the forms if the backend hasn't been configured yet.
if (!isConfigured) {
  document.getElementById("notConfigured").classList.remove("hide");
  document.querySelectorAll(".auth-form input, .auth-form button").forEach((el) => (el.disabled = true));
} else {
  redirectIfAuthed();
}

function mapError(err) {
  const m = (err && err.message ? err.message : "").toLowerCase();
  if (m.includes("invalid login")) return t("error.invalidCredentials");
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) return t("error.emailInUse");
  if (m.includes("password")) return t("error.weakPassword");
  return (err && err.message) || t("error.generic");
}

async function withButton(btn, fn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = t("login.processing");
  try {
    await fn();
  } finally {
    if (btn.isConnected) { btn.disabled = false; btn.textContent = label; }
  }
}

signinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearMsg();
  const email = document.getElementById("si-email").value.trim();
  const password = document.getElementById("si-pass").value;
  if (!email || !password) { showMsg(t("error.fields")); return; }
  withButton(document.getElementById("signinBtn"), async () => {
    try {
      await signIn({ email, password });
      window.location.replace("dashboard.html");
    } catch (err) {
      showMsg(mapError(err));
    }
  });
});

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearMsg();
  const fullName = document.getElementById("su-name").value.trim();
  const email = document.getElementById("su-email").value.trim();
  const phone = document.getElementById("su-phone").value.trim();
  const password = document.getElementById("su-pass").value;
  const lang = document.documentElement.lang === "ar" ? "ar" : "en";
  if (!fullName || !email || !password) { showMsg(t("error.fields")); return; }
  if (password.length < 6) { showMsg(t("error.weakPassword")); return; }
  withButton(document.getElementById("signupBtn"), async () => {
    try {
      const data = await signUp({ email, password, fullName, phone, lang });
      if (data.session) {
        window.location.replace("dashboard.html");
      } else {
        showMsg(t("auth.checkEmail"), "success");
        setTab("signin");
        document.getElementById("si-email").value = email;
      }
    } catch (err) {
      showMsg(mapError(err));
    }
  });
});
