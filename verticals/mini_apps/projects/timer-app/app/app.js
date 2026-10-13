/* Помодоро на Telegram WebApp: нативные кнопки, тема, haptic, состояние. */
const tg = window.Telegram ? window.Telegram.WebApp : null;

const TOTAL = 25 * 60;
const root = document.documentElement;
const value = document.querySelector("#value");
const note = document.querySelector("#note");
let left = TOTAL;
let tick = null;

/* V-19: экран живёт четырьмя состояниями (loading/empty/error/success). */
const setState = (name, message) => {
  document.body.dataset.state = name;
  if (note) note.textContent = message;
};

const render = () => {
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  value.textContent = m + ":" + s;
};

const stop = () => {
  if (tick !== null) {
    clearInterval(tick);
    tick = null;
  }
};

const toggle = () => {
  if (tick === null) {
    tick = setInterval(() => {
      left -= 1;
      render();
      if (left <= 0) {
        stop();
        left = TOTAL;
        render();
        setState("success", "Сессия завершена — начните новую");
      }
    }, 1000);
  } else {
    stop();
  }
};

const persist = () => {
  if (!tg) return;
  tg.CloudStorage.setItem("left", String(left));
  tg.sendData(JSON.stringify({ left: left }));
};

const restore = () => {
  if (!tg) return;
  setState("loading", "Загружаем сессию…");
  tg.CloudStorage.getItem("left", (err, raw) => {
    if (err) {
      setState("error", "Не удалось загрузить сессию — попробуйте ещё раз");
      return;
    }
    const saved = Number(raw);
    if (!raw || !Number.isFinite(saved)) {
      setState("empty", "Новой сессии нет — нажмите «Старт»");
      return;
    }
    left = Math.max(0, Math.min(TOTAL, Math.round(saved)));
    render();
    setState("success", "Сессия восстановлена — нажмите «Старт»");
  });
};

if (tg) {
  tg.ready();
  tg.expand();
  tg.MainButton.setText("Старт");
  tg.MainButton.onClick(toggle);
  tg.BackButton.show();
  tg.BackButton.onClick(() => tg.close());
  tg.HapticFeedback.impactOccurred("light");
  tg.onEvent("viewportChanged", (e) => root.style.setProperty("--vh", e.height + "px"));
  tg.onEvent("mainButtonClicked", persist);
  restore();
}

window.addEventListener("message", (e) => {
  if (e.data === "web_app_data") persist();
});

/* Ссылки открываем только через SDK, без target=_blank. */
const open = (url) => {
  if (tg) tg.openLink(url);
  else window.open(url, "_blank", "noopener");
};

const pay = () => {
  if (tg) tg.openInvoice("https://t.me/invoice/demo");
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");

document.querySelector("#start").addEventListener("click", toggle);
document.querySelector("#reset").addEventListener("click", () => {
  stop();
  left = TOTAL;
  render();
});
render();
