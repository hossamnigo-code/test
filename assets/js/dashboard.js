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
let cards = [];
let goals = [];
let beneficiaries = [];

// ── Static reference data ──
// Billers offered on the Pay Bills screen (label resolved via i18n at render).
const BILLERS = ["electricity", "water", "gas", "internet", "mobile", "tv"];

// Indicative mid exchange rates: EGP per 1 unit of currency. Mirrors the
// marketing site's rates so the converter stays consistent. EGP is the base.
const FX_RATES = { EGP: 1, USD: 48.13, EUR: 52.23, GBP: 61.55, SAR: 12.84, AED: 13.12 };
const FX_ORDER = ["EGP", "USD", "EUR", "GBP", "SAR", "AED"];

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
  wireFeatures();
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

  const [{ data: cardRows }, { data: goalRows }, { data: benRows }] = await Promise.all([
    supabase.from("cards").select("*, accounts(account_number, account_type)").order("created_at", { ascending: true }),
    supabase.from("goals").select("*").order("created_at", { ascending: true }),
    supabase.from("beneficiaries").select("*").order("created_at", { ascending: true }),
  ]);
  cards = cardRows || [];
  goals = goalRows || [];
  beneficiaries = benRows || [];

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
  renderBeneficiaries();
  renderTransferBeneficiaries();
  renderBills();
  renderCards();
  renderGoals();
  renderInsights();
  renderRequestAccounts();
  renderConverter();
  computeLoan();
}

// Fills any <select> of the caller's accounts, preserving the current choice.
function fillAccountSelect(sel) {
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = accounts.map((a) =>
    `<option value="${a.id}">${accountTypeLabel(a.account_type)} · ${a.account_number} (${formatCurrency(a.balance, a.currency)})</option>`
  ).join("");
  if (prev) sel.value = prev;
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

// ── Small helpers for the new features ──
const revealedCards = new Set();
const BILLER_EN = {
  electricity: "Electricity", water: "Water", gas: "Natural Gas",
  internet: "Internet", mobile: "Mobile recharge", tv: "TV subscription",
};
function initialsOf(name) {
  return (String(name || "").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("") || "?").toUpperCase();
}
function groupCard(num) { return String(num).replace(/(.{4})/g, "$1 ").trim(); }
function maskCard(num) { return "•••• •••• •••• " + String(num).slice(-4); }

// ── Beneficiaries / saved payees ──
function renderBeneficiaries() {
  const list = $("benList");
  if (!list) return;
  if (!beneficiaries.length) { list.innerHTML = `<p class="muted">${t("ben.empty")}</p>`; return; }
  list.innerHTML = beneficiaries.map((b) => `
    <div class="payee">
      <div class="payee-info">
        <div class="payee-avatar">${escapeHtml(initialsOf(b.name))}</div>
        <div>
          <div class="payee-name">${escapeHtml(b.name)}</div>
          <div class="payee-acct">${escapeHtml(b.account_number)}</div>
        </div>
      </div>
      <div class="payee-actions">
        <button class="btn btn-ghost" data-ben-send="${b.id}">${t("ben.send")}</button>
        <button class="icon-btn" data-ben-del="${b.id}" aria-label="${t("ben.delete")}" title="${t("ben.delete")}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6"/></svg>
        </button>
      </div>
    </div>`).join("");
}
function renderTransferBeneficiaries() {
  const wrap = $("tf-ben-wrap"), sel = $("tf-ben");
  if (!wrap || !sel) return;
  if (!beneficiaries.length) { wrap.classList.add("hide"); sel.innerHTML = ""; return; }
  wrap.classList.remove("hide");
  sel.innerHTML = `<option value="">—</option>` +
    beneficiaries.map((b) => `<option value="${escapeHtml(b.account_number)}">${escapeHtml(b.name)} · ${escapeHtml(b.account_number)}</option>`).join("");
}

// ── Pay bills ──
function renderBills() {
  const biller = $("bill-biller");
  if (biller) {
    const prev = biller.value;
    biller.innerHTML = BILLERS.map((b) => `<option value="${b}">${t("bills." + b)}</option>`).join("");
    if (prev) biller.value = prev;
  }
  fillAccountSelect($("bill-from"));
}

// ── Cards ──
function renderCards() {
  const grid = $("cardsGrid");
  if (!grid) return;
  if (!cards.length) { grid.innerHTML = `<p class="muted">${t("cards.empty")}</p>`; return; }
  const holder = (profile && profile.full_name) || (user && user.email) || "HB Customer";
  grid.innerHTML = cards.map((c) => {
    const frozen = c.status === "frozen";
    const revealed = revealedCards.has(c.id);
    const num = revealed ? groupCard(c.card_number) : maskCard(c.card_number);
    const exp = String(c.expiry_month).padStart(2, "0") + "/" + String(c.expiry_year).slice(-2);
    const acct = c.accounts ? c.accounts.account_number : "";
    return `<div class="vcard-wrap">
      <div class="vcard ${c.card_network} ${frozen ? "frozen" : ""}">
        <div class="vcard-row1"><span class="vcard-brand">${escapeHtml(c.card_brand)}</span><span class="vcard-net">${c.card_network === "mastercard" ? "Mastercard" : "VISA"}</span></div>
        <div class="vcard-chip"></div>
        <div class="vcard-num">${num}</div>
        <div class="vcard-row2">
          <div><div class="vcard-cap">${t("cards.holder")}</div><div class="vcard-val">${escapeHtml(holder)}</div></div>
          <div><div class="vcard-cap">${t("cards.expires")}</div><div class="vcard-val">${exp}</div></div>
        </div>
        ${frozen ? `<div class="vcard-frozen-badge">${t("cards.statusFrozen")}</div>` : ""}
      </div>
      <div class="vcard-meta">${t("cards.linkedTo")}: ${escapeHtml(acct)}</div>
      <div class="vcard-actions">
        <button class="btn btn-outline" data-card-reveal="${c.id}">${revealed ? t("cards.hide") : t("cards.reveal")}</button>
        <button class="btn ${frozen ? "btn-primary" : "btn-outline"}" data-card-toggle="${c.id}">${frozen ? t("cards.unfreeze") : t("cards.freeze")}</button>
      </div>
    </div>`;
  }).join("");
}

// ── Savings goals ──
function renderGoals() {
  const list = $("goalsList");
  if (!list) return;
  if (!goals.length) { list.innerHTML = `<div class="panel"><p class="muted">${t("goals.empty")}</p></div>`; return; }
  const acctOpts = accounts.map((a) => `<option value="${a.id}">${accountTypeLabel(a.account_type)} · ${a.account_number}</option>`).join("");
  list.innerHTML = goals.map((g) => {
    const saved = Number(g.saved_amount), target = Number(g.target_amount);
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    const done = saved >= target;
    return `<div class="goal-card">
      <div class="goal-head">
        <span class="goal-name">${escapeHtml(g.name)}</span>
        <button class="icon-btn" data-goal-del="${g.id}" aria-label="${t("goals.delete")}" title="${t("goals.delete")}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6"/></svg>
        </button>
      </div>
      <div class="goal-amounts"><strong>${formatCurrency(saved)}</strong> <span class="muted">${t("goals.of")} ${formatCurrency(target)}</span></div>
      <div class="goal-bar"><div class="goal-bar-fill ${done ? "done" : ""}" style="width:${pct}%"></div></div>
      <div class="goal-pct">${pct}%${done ? ` · ${t("goals.complete")}` : ""}</div>
      <form class="goal-add" data-goal-add="${g.id}">
        <select aria-label="${t("goals.from")}">${acctOpts}</select>
        <input type="number" min="0.01" step="0.01" placeholder="${t("goals.amount")}" aria-label="${t("goals.amount")}">
        <button type="submit" class="btn btn-primary">${t("goals.contribute")}</button>
      </form>
    </div>`;
  }).join("");
}

// ── Spending insights ──
function renderInsights() {
  const stats = $("insightStats");
  if (!stats) return;
  const credits = transactions.filter((x) => x.type === "credit");
  const debits = transactions.filter((x) => x.type === "debit");
  const sumIn = credits.reduce((s, x) => s + Number(x.amount), 0);
  const sumOut = debits.reduce((s, x) => s + Number(x.amount), 0);
  const net = sumIn - sumOut;
  stats.innerHTML = `
    <div class="stat-card in"><div class="stat-card-label">${t("insights.moneyIn")}</div><div class="stat-card-val">${formatCurrency(sumIn)}</div></div>
    <div class="stat-card out"><div class="stat-card-label">${t("insights.moneyOut")}</div><div class="stat-card-val">${formatCurrency(sumOut)}</div></div>
    <div class="stat-card net"><div class="stat-card-label">${t("insights.net")}</div><div class="stat-card-val">${(net >= 0 ? "+" : "−") + formatCurrency(Math.abs(net))}</div></div>`;

  const flow = $("insightFlow"), top = $("insightTop");
  if (!transactions.length) {
    flow.innerHTML = top.innerHTML = `<p class="muted">${t("insights.noData")}</p>`;
    return;
  }
  const fmax = Math.max(sumIn, sumOut, 1);
  flow.innerHTML = `
    <div class="bar-row"><span class="bar-label">${t("insights.moneyIn")}</span><div class="bar-track"><div class="bar-fill credit" style="width:${(sumIn / fmax) * 100}%"></div></div><span class="bar-amt">${formatCurrency(sumIn)}</span></div>
    <div class="bar-row"><span class="bar-label">${t("insights.moneyOut")}</span><div class="bar-track"><div class="bar-fill debit" style="width:${(sumOut / fmax) * 100}%"></div></div><span class="bar-amt">${formatCurrency(sumOut)}</span></div>`;

  const map = {};
  debits.forEach((x) => { const k = x.counterparty || x.description || "—"; map[k] = (map[k] || 0) + Number(x.amount); });
  const ranked = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const tmax = ranked.length ? ranked[0][1] : 1;
  top.innerHTML = ranked.length
    ? ranked.map(([k, v]) => `<div class="bar-row"><span class="bar-label">${escapeHtml(k)}</span><div class="bar-track"><div class="bar-fill debit" style="width:${(v / tmax) * 100}%"></div></div><span class="bar-amt">${formatCurrency(v)}</span></div>`).join("")
    : `<p class="muted">${t("insights.noData")}</p>`;
}

// ── Request money ──
function renderRequestAccounts() { fillAccountSelect($("req-account")); }
function renderRequest(acct, amount, note) {
  const box = $("reqResult");
  box.classList.remove("hide");
  const holder = (profile && profile.full_name) || (user && user.email) || "";
  const lines = [
    `${t("request.payTo")}: ${holder}`,
    `${t("ben.account")}: ${acct.account_number}`,
    `${t("request.amount")}: ${formatCurrency(amount)}`,
  ];
  if (note) lines.push(`${t("request.note")}: ${note}`);
  const payload = `HBPAY|acct=${acct.account_number}|amt=${amount}|cur=EGP${note ? `|note=${note}` : ""}`;
  const qrEl = $("reqQr");
  qrEl.innerHTML = "";
  try {
    if (window.qrcode) {
      const qr = window.qrcode(0, "M");
      qr.addData(payload);
      qr.make();
      qrEl.innerHTML = `<div class="qr-cap">${t("request.scan")}</div>` + qr.createSvgTag({ cellSize: 4, margin: 2 });
    }
  } catch { /* QR optional */ }
  $("reqDetails").innerHTML = lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("");
  $("reqCopyBtn").setAttribute("data-copy", lines.join("\n"));
}

// ── Tools: currency converter + loan calculator ──
function currencyOptions(selected) {
  return FX_ORDER.map((c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${c} — ${t("currency." + c)}</option>`).join("");
}
function renderConverter() {
  const from = $("conv-from"), to = $("conv-to");
  if (!from || !to) return;
  from.innerHTML = currencyOptions(from.value || "EGP");
  to.innerHTML = currencyOptions(to.value || "USD");
  computeConvert();
}
function computeConvert() {
  if (!$("convResult")) return;
  const amt = parseFloat($("conv-amount").value) || 0;
  const egp = amt * (FX_RATES[$("conv-from").value] || 1);
  const out = egp / (FX_RATES[$("conv-to").value] || 1);
  $("convResult").textContent = formatCurrency(out, $("conv-to").value);
}
function computeLoan() {
  if (!$("loanMonthly")) return;
  const P = parseFloat($("loan-amount").value) || 0;
  const annual = parseFloat($("loan-rate").value) || 0;
  const years = parseFloat($("loan-years").value) || 0;
  const n = Math.round(years * 12);
  const r = annual / 100 / 12;
  let monthly = 0;
  if (n > 0) monthly = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
  const total = monthly * n;
  const interest = total - P;
  $("loanMonthly").textContent = formatCurrency(monthly);
  $("loanExtra").innerHTML = `
    <div class="result-row"><span>${t("loan.total")}</span><strong>${formatCurrency(total > 0 ? total : 0)}</strong></div>
    <div class="result-row"><span>${t("loan.interest")}</span><strong>${formatCurrency(interest > 0 ? interest : 0)}</strong></div>`;
}

// ── CSV statement export ──
function csvCell(v) { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function exportCsv() {
  const filter = $("txFilter").value || "all";
  const rows = transactions.filter((tx) => filter === "all" || tx.account_id === filter);
  const header = ["Date", "Account", "Description", "Counterparty", "Type", "Amount", "Balance"];
  const lines = [header.join(",")];
  rows.forEach((tx) => {
    const acctNo = tx.accounts ? tx.accounts.account_number : "";
    lines.push([new Date(tx.created_at).toISOString(), acctNo, tx.description || "", tx.counterparty || "", tx.type, tx.amount, tx.balance_after].map(csvCell).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hb-bank-statement.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

// ── Wiring for the additional features ──
function wireFeatures() {
  // Transfer: pick a saved payee to fill the destination field
  $("tf-ben")?.addEventListener("change", (e) => { if (e.target.value) $("tf-to").value = e.target.value; });

  // Beneficiaries: add
  $("benForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("benMsg"); msg.className = "form-msg";
    const name = $("ben-name").value.trim();
    const account_number = $("ben-acct").value.trim();
    if (!name || !account_number) { showFormMsg(msg, t("ben.errFields")); return; }
    const btn = $("benBtn"); const label = btn.textContent; btn.disabled = true; btn.textContent = t("ben.saving");
    try {
      const { error } = await supabase.from("beneficiaries").insert({ user_id: user.id, name, account_number });
      if (error) throw error;
      $("benForm").reset();
      await loadAll();
      toast(t("ben.saved"), "success");
    } catch (err) { showFormMsg(msg, (err && err.message) || t("error.generic")); }
    finally { btn.disabled = false; btn.textContent = label; }
  });

  // Beneficiaries: delete / send (delegated)
  $("benList")?.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-ben-del]");
    const send = e.target.closest("[data-ben-send]");
    if (del) {
      try {
        const { error } = await supabase.from("beneficiaries").delete().eq("id", del.getAttribute("data-ben-del"));
        if (error) throw error;
        await loadAll();
        toast(t("ben.deleted"), "success");
      } catch (err) { toast((err && err.message) || t("error.generic"), "error"); }
    } else if (send) {
      const b = beneficiaries.find((x) => x.id === send.getAttribute("data-ben-send"));
      if (b) { showPanel("transfer"); $("tf-to").value = b.account_number; $("tf-amount").focus(); }
    }
  });

  // Pay bill
  $("billForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("billMsg"); msg.className = "form-msg";
    const from = $("bill-from").value;
    const biller = BILLER_EN[$("bill-biller").value] || $("bill-biller").value;
    const ref = $("bill-ref").value.trim();
    const amount = parseFloat($("bill-amount").value);
    if (!from) { showFormMsg(msg, t("transfer.errNotFound")); return; }
    if (!ref) { showFormMsg(msg, t("bills.errRef")); return; }
    if (!amount || amount <= 0) { showFormMsg(msg, t("transfer.errAmount")); return; }
    const btn = $("billBtn"); const label = btn.textContent; btn.disabled = true; btn.textContent = t("bills.paying");
    try {
      const { error } = await supabase.rpc("pay_bill", { p_from_account: from, p_biller: biller, p_reference: ref, p_amount: amount });
      if (error) throw error;
      $("billForm").reset();
      await loadAll();
      toast(t("bills.success"), "success");
      showPanel("overview");
    } catch (err) { showFormMsg(msg, mapTransferError(err)); }
    finally { btn.disabled = false; btn.textContent = label; }
  });

  // Cards: reveal number / freeze-unfreeze (delegated)
  $("cardsGrid")?.addEventListener("click", async (e) => {
    const rev = e.target.closest("[data-card-reveal]");
    const tog = e.target.closest("[data-card-toggle]");
    if (rev) {
      const id = rev.getAttribute("data-card-reveal");
      if (revealedCards.has(id)) revealedCards.delete(id); else revealedCards.add(id);
      renderCards();
    } else if (tog) {
      const id = tog.getAttribute("data-card-toggle");
      const card = cards.find((c) => c.id === id); if (!card) return;
      const next = card.status === "frozen" ? "active" : "frozen";
      tog.disabled = true;
      try {
        const { error } = await supabase.rpc("set_card_status", { p_card: id, p_status: next });
        if (error) throw error;
        await loadAll();
        toast(next === "frozen" ? t("cards.frozen") : t("cards.activated"), "success");
      } catch (err) { toast((err && err.message) || t("error.generic"), "error"); tog.disabled = false; }
    }
  });

  // Goals: create
  $("goalForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("goalMsg"); msg.className = "form-msg";
    const name = $("goal-name").value.trim();
    const target = parseFloat($("goal-target").value);
    if (!name || !target || target <= 0) { showFormMsg(msg, t("goals.errFields")); return; }
    const btn = $("goalBtn"); const label = btn.textContent; btn.disabled = true; btn.textContent = t("goals.creating");
    try {
      const { error } = await supabase.from("goals").insert({ user_id: user.id, name, target_amount: target });
      if (error) throw error;
      $("goalForm").reset();
      await loadAll();
      toast(t("goals.created"), "success");
    } catch (err) { showFormMsg(msg, (err && err.message) || t("error.generic")); }
    finally { btn.disabled = false; btn.textContent = label; }
  });

  // Goals: contribute (submit) + delete (click), both delegated
  $("goalsList")?.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-goal-add]");
    if (!form) return;
    e.preventDefault();
    const id = form.getAttribute("data-goal-add");
    const from = form.querySelector("select").value;
    const amount = parseFloat(form.querySelector("input").value);
    if (!from || !amount || amount <= 0) { toast(t("transfer.errAmount"), "error"); return; }
    const btn = form.querySelector("button"); btn.disabled = true;
    try {
      const { error } = await supabase.rpc("contribute_to_goal", { p_goal: id, p_from_account: from, p_amount: amount });
      if (error) throw error;
      await loadAll();
      toast(t("goals.contributed"), "success");
    } catch (err) { toast(mapTransferError(err), "error"); btn.disabled = false; }
  });
  $("goalsList")?.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-goal-del]");
    if (!del) return;
    try {
      const { error } = await supabase.from("goals").delete().eq("id", del.getAttribute("data-goal-del"));
      if (error) throw error;
      await loadAll();
      toast(t("goals.deleted"), "success");
    } catch (err) { toast((err && err.message) || t("error.generic"), "error"); }
  });

  // Request money
  $("requestForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const acct = accounts.find((a) => a.id === $("req-account").value);
    const amount = parseFloat($("req-amount").value);
    const note = $("req-note").value.trim();
    if (!acct) { toast(t("transfer.errNotFound"), "error"); return; }
    if (!amount || amount <= 0) { toast(t("transfer.errAmount"), "error"); return; }
    renderRequest(acct, amount, note);
  });
  $("reqCopyBtn")?.addEventListener("click", async () => {
    const text = $("reqCopyBtn").getAttribute("data-copy") || "";
    try { await navigator.clipboard.writeText(text); toast(t("request.copied"), "success"); }
    catch { toast(text, ""); }
  });

  // Statement export
  $("exportBtn")?.addEventListener("click", exportCsv);

  // Tools: live recompute
  ["conv-amount", "conv-from", "conv-to"].forEach((id) => $(id)?.addEventListener("input", computeConvert));
  ["conv-from", "conv-to"].forEach((id) => $(id)?.addEventListener("change", computeConvert));
  ["loan-amount", "loan-rate", "loan-years"].forEach((id) => $(id)?.addEventListener("input", computeLoan));

  // Security: change password
  $("securityForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("securityMsg"); msg.className = "form-msg";
    const p1 = $("sec-pass").value, p2 = $("sec-pass2").value;
    if (p1.length < 6) { showFormMsg(msg, t("sec.errLength")); return; }
    if (p1 !== p2) { showFormMsg(msg, t("sec.errMatch")); return; }
    const btn = $("securityBtn"); const label = btn.textContent; btn.disabled = true; btn.textContent = t("sec.updating");
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;
      $("securityForm").reset();
      showFormMsg(msg, t("sec.updated"), "success");
      toast(t("sec.updated"), "success");
    } catch (err) { showFormMsg(msg, (err && err.message) || t("error.generic")); }
    finally { btn.disabled = false; btn.textContent = label; }
  });
}
