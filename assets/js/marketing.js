// HB Bank — marketing homepage interactions.
import { initLang, toggleLang } from "./i18n.js";

initLang();

// Language toggle
document.getElementById("langToggle")?.addEventListener("click", toggleLang);

// Mobile nav
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");
navToggle?.addEventListener("click", () => navMenu.classList.toggle("open"));
navMenu?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navMenu.classList.remove("open"))
);

// Hero slider
const slides = Array.from(document.querySelectorAll(".hero .slide"));
const dots = Array.from(document.querySelectorAll("#heroDots button"));
let idx = 0;
let timer;

function show(i) {
  idx = (i + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle("active", n === idx));
  dots.forEach((d, n) => d.classList.toggle("active", n === idx));
}
function start() {
  stop();
  timer = setInterval(() => show(idx + 1), 6000);
}
function stop() {
  if (timer) clearInterval(timer);
}

dots.forEach((d, n) =>
  d.addEventListener("click", () => {
    show(n);
    start();
  })
);
if (slides.length > 1) start();
