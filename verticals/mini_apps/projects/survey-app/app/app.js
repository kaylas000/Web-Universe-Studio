/* Опросник на Telegram WebApp: нативные кнопки, тема, haptic, черновик и отправка. */
const tg = window.Telegram ? window.Telegram.WebApp : null;

const form = document.querySelector("#form");
const note = document.querySelector("#note");
const root = document.documentElement;

const pick = (name) => form.querySelector("#" + name);

const answers = () => ({
  freq: pick("q1").value,
  priority: pick("q2").value.trim(),
  nps: pick("q3").value,
});

const report = (text) => {
  note.textContent = text;
};

const restore = () => {
  if (!tg) return;
  tg.CloudStorage.getItem("survey-draft", (err, raw) => {
    if (err || !raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved.freq) pick("q1").value = saved.freq;
      if (saved.priority) pick("q2").value = saved.priority;
      if (saved.nps) pick("q3").value = saved.nps;
    } catch {
      report("Черновик повреждён — начните заново");
    }
  });
};

/* V-13: состояние сохраняется при изменении (mainButtonClicked → sendData тоже). */
let saveTimer = null;
const scheduleSave = () => {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (tg) tg.CloudStorage.setItem("survey-draft", JSON.stringify(answers()));
  }, 400);
};

/* V-07: данные ответов уходят через sendData, оплата отчёта — openInvoice. */
const submit = () => {
  if (!tg) return;
  const data = answers();
  if (tg.CloudStorage) tg.CloudStorage.setItem("survey-draft", JSON.stringify(data));
  tg.sendData(JSON.stringify(data));
  tg.HapticFeedback.notificationOccurred("success");
  report("Ответы отправлены");
};

const buyReport = () => {
  if (!tg) return;
  tg.openInvoice("https://t.me/invoice/survey-report");
};

const openDocs = () => {
  if (tg) tg.openLink("https://telegram.org/blog/telegram-apps");
};

/* V-18: перед закрытием снимаем таймер и слушатель. */
const cleanup = () => {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  window.removeEventListener("message", onMessage);
};

const onMessage = (event) => {
  if (event.data === "web_app_data") submit();
};

if (tg) {
  tg.ready();
  tg.expand();
  tg.MainButton.setText("Отправить");
  tg.MainButton.show();
  tg.MainButton.onClick(submit);
  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    cleanup();
    tg.close();
  });
  tg.HapticFeedback.impactOccurred("light");
  tg.onEvent("viewportChanged", (e) => root.style.setProperty("--vh", e.height + "px"));
  tg.onEvent("mainButtonClicked", submit);
  restore();
}

window.addEventListener("message", onMessage);
form.addEventListener("input", scheduleSave);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");

report("Выберите ответы — черновик сохраняется");