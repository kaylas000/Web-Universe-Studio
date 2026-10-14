/* Эвакуатор · VK Mini App + Telegram WebApp.
   Платформенный адаптер: VK — через vk-bridge, Telegram — через WebApp SDK, иначе веб. */
const tg = window.Telegram ? window.Telegram.WebApp : null;
const vk = window.vkBridge ? window.vkBridge : null;
const platform = vk ? "vk" : tg ? "telegram" : "web";

const DOCS_URL = vk
  ? "https://dev.vk.com/ru/mini-apps/overview"
  : "https://core.telegram.org/bots/webapps";
const PHONE_URL = "tel:+79771742050";

const root = document.documentElement;
const status = document.querySelector("#status");
const note = document.querySelector("#note");
const address = document.querySelector("#address");
const tech = document.querySelector("#tech");
const phone = document.querySelector("#phone");
const submitBtn = document.querySelector("#submit");

const TECH_LABEL = {
  light: "сдвижная платформа, лебёдка, до 3,5 т",
  commercial: "сдвижная платформа, лебёдка, до 10 т",
  special: "усиленная платформа с лебёдкой, до 10 т",
};

/* Состояния экрана: loading / empty / error / success. */
const setState = (name, message) => {
  document.body.dataset.state = name;
  if (note) note.textContent = message;
};

const bridgeSend = (method, params) => {
  if (vk) return vk.send(method, params || {});
  return Promise.resolve({});
};

const haptic = () => {
  if (tg) tg.HapticFeedback.impactOccurred("light");
  if (vk) bridgeSend("VKWebAppTapticImpactOccurred", { style: "light" });
};

const openUrl = (url) => {
  if (vk) bridgeSend("VKWebAppOpenLink", { link: url });
  else if (tg) tg.openLink(url);
  else window.open(url, "noopener");
};

const persist = () => {
  if (tg) {
    tg.CloudStorage.setItem("address", String(address.value));
    tg.CloudStorage.setItem("tech", String(tech.value));
    tg.sendData(JSON.stringify({ address: address.value, tech: tech.value, phone: phone.value }));
  }
  if (vk) {
    bridgeSend("VKWebAppStorageSet", { key: "address", value: String(address.value) });
    bridgeSend("VKWebAppStorageSet", { key: "tech", value: String(tech.value) });
  }
};

const restore = () => {
  setState("loading", "Загружаем последний выбор…");
  if (tg && tg.CloudStorage) {
    tg.CloudStorage.getItem("address", (err, raw) => {
      if (err) {
        setState("error", "Не удалось загрузить выбор. Проверьте соединение и попробуйте снова.");
        return;
      }
      if (raw) {
        address.value = raw;
        setState("success", "Последний адрес восстановлен.");
      } else {
        setState("empty", "Сохранённого адреса нет. Введите адрес подачи.");
      }
    });
    return;
  }
  if (vk) {
    bridgeSend("VKWebAppStorageGet", { keys: ["address"] })
      .then((data) => {
        const raw = data && data.keys && data.keys[0] ? data.keys[0].value : "";
        if (raw) {
          address.value = raw;
          setState("success", "Последний адрес восстановлен.");
        } else {
          setState("empty", "Сохранённого адреса нет. Введите адрес подачи.");
        }
      })
      .catch(() => {
        setState("error", "Не удалось загрузить выбор. Проверьте соединение и попробуйте снова.");
      });
    return;
  }
  setState("empty", "Сохранённого адреса нет. Введите адрес подачи.");
};

const submit = () => {
  if (!address.value.trim()) {
    haptic();
    setState("error", "Укажите адрес подачи — улица, дом, ориентир.");
    address.focus();
    return;
  }
  const digits = phone.value.replace(/\D/g, "");
  if (digits.length < 10) {
    haptic();
    setState("error", "Введите телефон полностью — +7 и 10 цифр.");
    phone.focus();
    return;
  }
  haptic();
  setState("loading", "Отправляем заявку…");
  persist();
  submitBtn.disabled = true;
  setTimeout(() => {
    setState("success", "Заявка принята. Диспетчер перезвонит в течение 2 минут.");
    submitBtn.disabled = false;
  }, 800);
};

const onTech = () => {
  if (!tech.value) {
    setState("empty", "Тип машины не выбран. Выберите вариант, и покажем платформу.");
    return;
  }
  setState("success", "Подходящая платформа: " + TECH_LABEL[tech.value] + ".");
};

if (tg) {
  tg.ready();
  tg.expand();
  tg.MainButton.setText("Заказать");
  tg.MainButton.onClick(submit);
  tg.BackButton.show();
  tg.BackButton.onClick(() => tg.close());
  tg.onEvent("viewportChanged", (event) => {
    root.style.setProperty("--vh", event.height + "px");
  });
}

if (vk) {
  bridgeSend("VKWebAppInit");
  root.style.setProperty("--vh", window.innerHeight + "px");
  window.addEventListener("resize", () => {
    root.style.setProperty("--vh", window.innerHeight + "px");
  });
}

window.addEventListener("message", (event) => {
  if (event.data === "web_app_data") persist();
});

const onSubmit = () => submit();
const onCall = () => {
  haptic();
  openUrl(PHONE_URL);
};
const onHelp = () => {
  haptic();
  openUrl(DOCS_URL);
};

submitBtn.addEventListener("click", onSubmit);
document.querySelector("#call").addEventListener("click", onCall);
document.querySelector("#help").addEventListener("click", onHelp);
tech.addEventListener("change", onTech);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

const onHide = () => {
  submitBtn.removeEventListener("click", onSubmit);
};
window.addEventListener("pagehide", onHide);

/* platform доступен для отладки в консоли платформы. */
void platform;

restore();
