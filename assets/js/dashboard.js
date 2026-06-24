// HB Bank — online banking dashboard.
import { initLang, applyLang, toggleLang, t, getLang, formatCurrency, formatDate } from "./i18n.js";
import { supabase, isConfigured, requireAuth, signOut, getUser } from "./auth.js";

const $ = (id) => document.getElementById(id);

initLang();
$("langToggle")?.addEventListener("click", toggleLang);

// ── State ──
let user = null;
let profile = null;
let accounts = [];
let transactions = [];

// ── Toast ──
let toastTimer;
function toast(msg, type = "") {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast"), 3000);
}
function showFormMsg(el, text, type = "error") {
  el.textContent = text;
  el.className = "form-msg show " + type;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Panel navigation ──
const navButtons = Array.from(document.querySelectorAll("#dashNav button"));
function showPanel(name) {
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
  document.querySelectorAll(".dash-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
}
navButtons.forEach((b) => b.addEventListener("click", () => showPanel(b.dataset.panel)));
$("seeAllTx")?.addEventListener("click", () => showPanel("transactions"));

// ── Logout ──
$("logoutBtn").addEventListener("click", async () => {
  await signOut();
  window.location.replace("login.html");
});

// ── Boot ──
if (!isConfigured) {
  $("notConfigured").classList.remove("hide");
} else {
  start();
}

async function start() {
  const session = await requireAuth();
  if (!session) return;
  user = await getUser();
  await loadAll();
  fillSettings();
  window.addEventListener("hb:langchange", renderAll);
  wireForms();
}

async function loadAll() {
  const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  profile = prof || {
    full_name: (user.user_metadata && user.user_metadata.full_name) || user.email,
    phone: "",
    preferred_language: getLang(),
  };

  const { data: accs, error: accErr } = await supabase
    .from("accounts").select("*").order("account_type", { ascending: true });
  if (accErr) toast(t("error.generic"), "error");
  accounts = accs || [];

  const { data: txs } = await supabase
    .from("transactions")
    .select("*, accounts(account_number, account_type)")
    .order("created_at", { ascending: false });
  transactions = txs || [];

  renderAll();
}

// ── Rendering ──
function accountTypeLabel(type) {
  return type === "savings" ? t("dash.account.savings") : t("dash.account.checking");
}
function emptyRow() {
  return `<tr><td class="empty-row" colspan="5">${t("tx.empty")}</td></tr>`;
}
function txRow(tx) {
  const sign = tx.type === "credit" ? "+" : "−";
  const acctNo = tx.accounts ? tx.accounts.account_number : "";
  return `<tr>
    <td>${formatDate(tx.created_at)}</td>
    <td>${escapeHtml(tx.description || "")}${acctNo ? `<div class="muted" style="font-size:12px">${acctNo}</div>` : ""}</td>
    <td>${escapeHtml(tx.counterparty || "")}</td>
    <td class="tx-amt ${tx.type}">${sign}${formatCurrency(tx.amount)}</td>
    <td class="tx-bal">${formatCurrency(tx.balance_after)}</td>
  </tr>`;
}

function renderAll() {
  renderUser();
  renderOverview();
  renderFromSelect();
  renderTxFilter();
  renderTransactions();
}

function renderUser() {
  const name = (profile && profile.full_name) || (user && user.email) || "";
  $("userName").textContent = name;
  $("greetName").textContent = name.split(" ")[0] || name;
  const initials = name.trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "HB";
  $("userAvatar").textContent = initials;
}

function renderOverview() {
  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);
  $("totalBalance").textContent = formatCurrency(total);

  $("accountsGrid").innerHTML = accounts.map((a) => `
    <div class="acct-card ${a.account_type}">
      <div>
        <div class="acct-type">${accountTypeLabel(a.account_type)}</div>
        <div class="acct-no">${a.account_number}</div>
      </div>
      <div>
        <div class="acct-bal-label">${t("dash.available")}</div>
        <div class="acct-bal">${formatCurrency(a.balance, a.currency)}</div>
      </div>
    </div>`).join("");

  const recent = transactions.slice(0, 5);
  $("recentTable").querySelector("tbody").innerHTML = recent.length ? recent.map(txRow).join("") : emptyRow();
}

function renderFromSelect() {
  const sel = $("tf-from");
  const prev = sel.value;
  sel.innerHTML = accounts.map((a) =>
    `<option value="${a.id}">${accountTypeLabel(a.account_type)} · ${a.account_number} (${formatCurrency(a.balance, a.currency)})</option>`
  ).join("");
  if (prev) sel.value = prev;
}

function renderTxFilter() {
  const sel = $("txFilter");
  const prev = sel.value;
  sel.innerHTML = `<option value="all">${t("tx.all")}</option>` +
    accounts.map((a) => `<option value="${a.id}">${accountTypeLabel(a.account_type)} · ${a.account_number}</option>`).join("");
  sel.value = prev || "all";
  sel.onchange = renderTransactions;
}

function renderTransactions() {
  const filter = $("txFilter").value || "all";
  const rows = transactions.filter((tx) => filter === "all" || tx.account_id === filter);
  $("txTable").querySelector("tbody").innerHTML = rows.length ? rows.map(txRow).join("") : emptyRow();
}

function fillSettings() {
  $("st-name").value = (profile && profile.full_name) || "";
  $("st-phone").value = (profile && profile.phone) || "";
  $("st-lang").value = (profile && profile.preferred_language) || getLang();
}

// ── Forms ──
function mapTransferError(err) {
  const m = (err && err.message ? err.message : "").toLowerCase();
  if (m.includes("insufficient")) return t("transfer.errInsufficient");
  if (m.includes("same account")) return t("transfer.errSameAccount");
  if (m.includes("source account not found")) return t("transfer.errNotFound");
  if (m.includes("greater than zero")) return t("transfer.errAmount");
  return (err && err.message) || t("error.generic");
}

function wireForms() {
  $("transferForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("transferMsg");
    msg.className = "form-msg";
    const from = $("tf-from").value;
    const to = $("tf-to").value.trim();
    const amount = parseFloat($("tf-amount").value);
    const desc = $("tf-desc").value.trim();
    if (!from) { showFormMsg(msg, t("transfer.errNotFound")); return; }
    if (!to) { showFormMsg(msg, t("transfer.errToRequired")); return; }
    if (!amount || amount <= 0) { showFormMsg(msg, t("transfer.errAmount")); return; }

    const btn = $("transferBtn");
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = t("transfer.sending");
    try {
      const { data, error } = await supabase.rpc("transfer_funds", {
        p_from_account: from,
        p_to_account_number: to,
        p_amount: amount,
        p_description: desc || null,
      });
      if (error) throw error;
      toast(data && data.internal ? t("transfer.successInternal") : t("transfer.success"), "success");
      $("transferForm").reset();
      await loadAll();
      showPanel("overview");
    } catch (err) {
      showFormMsg(msg, mapTransferError(err));
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  $("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("settingsMsg");
    msg.className = "form-msg";
    const full_name = $("st-name").value.trim();
    const phone = $("st-phone").value.trim();
    const preferred_language = $("st-lang").value;
    const btn = $("settingsBtn");
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = t("settings.saving");
    try {
      const { error } = await supabase.from("profiles").update({ full_name, phone, preferred_language }).eq("id", user.id);
      if (error) throw error;
      profile = { ...profile, full_name, phone, preferred_language };
      applyLang(preferred_language);
      showFormMsg(msg, t("settings.saved"), "success");
      toast(t("settings.saved"), "success");
    } catch (err) {
      showFormMsg(msg, (err && err.message) || t("error.generic"));
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });
}
