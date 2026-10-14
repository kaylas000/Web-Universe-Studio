/* ЦЕХ · Метаплатформа — scripts/shots/app-specimens.mjs
   Образцы дизайна для студии мини-приложений и студии мобильных приложений.
   Референсы этих студий — приёмы (thumb-zone, invoice-initdata, platform-nav…),
   поэтому образец здесь собран из блоков мобильного интерфейса и платформенной
   палитры: Telegram (TMA), iOS (HIG) и Android (Material 3).

   Режимы сцены:
     screen — один экран 390×844 на служебном фоне;
     duo    — два экрана рядом с подписями (сравнения «вот так / не так»).
*/

import { FONTS, STAMP_CSS, alpha, esc, mix, page, stamp } from "./kit.mjs";

const TG = { bg: "#ffffff", surface: "#f4f4f5", ink: "#0f0f0f", mid: "#707579", accent: "#3390ec", line: "#e6e7e9" };
const IOS = { bg: "#f2f2f7", surface: "#ffffff", ink: "#000000", mid: "#6c6c70", accent: "#007aff", line: "#dedee3" };
const ANDROID = { bg: "#fbf8fd", surface: "#f3edf7", ink: "#1c1b1f", mid: "#49454f", accent: "#6750a4", line: "#e2dbe9" };
const DARK = { bg: "#17212b", surface: "#232e3c", ink: "#f5f5f5", mid: "#8b98a5", accent: "#5eb5f7", line: "#2c3a48" };

const STAGE_CSS = `
${STAMP_CSS}
.shot-stage{min-height:calc(100vh - 44px);display:flex;align-items:center;justify-content:center;gap:44px;
  padding:30px 40px;background:var(--stage,#e9eaec)}
.phone{width:390px;height:664px;background:var(--phone-bg);color:var(--phone-ink);border-radius:38px;overflow:hidden;
  position:relative;box-shadow:0 26px 60px ${alpha("#000000", 0.24)};display:flex;flex-direction:column;
  font-family:${FONTS.system}}
.phone *{box-sizing:border-box}
.p-cap{display:flex;flex-direction:column;gap:8px;align-items:center}
.p-cap .cap-title{font-family:${FONTS.mono};font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#3b3f45}
.p-cap .cap-note{font-size:13px;color:#5c6168;max-width:390px;text-align:center;line-height:1.5}
.col{display:flex;flex-direction:column;gap:18px;align-items:center}
.status{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;font-size:12px;
  color:var(--phone-mid);font-family:${FONTS.mono};flex:none}
.nav{height:52px;display:flex;align-items:center;gap:14px;padding:0 16px;border-bottom:1px solid var(--phone-line);flex:none}
.nav b{font-size:16px}
.nav .back{width:22px;height:22px;border-left:2px solid var(--phone-accent);border-bottom:2px solid var(--phone-accent);
  transform:rotate(45deg);border-radius:1px}
.nav .menu{margin-left:auto;display:flex;flex-direction:column;gap:4px}
.nav .menu i{width:18px;height:2px;background:var(--phone-mid)}
.body{flex:1;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:12px;
  justify-content:safe center} /* safe center: короткий экран центрируется, длинный прижимается к верху */
.card{background:var(--phone-surface);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.card.plain{background:transparent;border:1px solid var(--phone-line)}
.row{display:flex;align-items:center;gap:12px}
.row.between{justify-content:space-between}
.h1{font-size:26px;line-height:1.15;font-weight:700;letter-spacing:-.02em;margin:0}
.h2{font-size:17px;font-weight:600;margin:0}
.muted{color:var(--phone-mid);font-size:13px;line-height:1.5}
.tiny{font-family:${FONTS.mono};font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--phone-mid)}
.chip{font-family:${FONTS.mono};font-size:11px;padding:4px 9px;border-radius:999px;background:var(--phone-surface);
  border:1px solid var(--phone-line);color:var(--phone-mid)}
.chip.on{background:var(--phone-accent);border-color:var(--phone-accent);color:#fff}
.btn{border-radius:12px;padding:14px 16px;text-align:center;font-weight:600;font-size:15px}
.btn.primary{background:var(--phone-accent);color:#fff}
.btn.ghost{border:1px solid var(--phone-line);color:var(--phone-ink)}
.main-btn{margin:0 16px 18px;background:var(--phone-accent);color:#fff;border-radius:14px;padding:16px;
  text-align:center;font-weight:600;flex:none}
.tabbar{display:flex;justify-content:space-around;padding:12px 0 18px;border-top:1px solid var(--phone-line);flex:none}
.tabbar span{font-size:11px;color:var(--phone-mid);display:flex;flex-direction:column;gap:6px;align-items:center}
.tabbar span::before{content:"";width:20px;height:20px;border-radius:6px;background:var(--phone-surface);border:1px solid var(--phone-line)}
.tabbar span.on{color:var(--phone-accent)}
.tabbar span.on::before{background:var(--phone-accent);border-color:var(--phone-accent)}
.avatar{width:40px;height:40px;border-radius:50%;background:var(--phone-surface);border:1px solid var(--phone-line);flex:none}
.bar{height:8px;border-radius:999px;background:var(--phone-surface);overflow:hidden}
.bar i{display:block;height:100%;background:var(--phone-accent);width:var(--w,60%)}
.list{display:flex;flex-direction:column;gap:1px;background:var(--phone-line);border-radius:14px;overflow:hidden}
.list .item{background:var(--phone-bg);padding:14px 16px;display:flex;align-items:center;gap:12px;justify-content:space-between}
.thumb{width:56px;height:56px;border-radius:12px;background:var(--phone-surface);border:1px solid var(--phone-line);flex:none}
.kv{display:flex;flex-direction:column;gap:2px}
.kv b{font-size:15px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sheet{position:absolute;left:0;right:0;bottom:0;background:var(--phone-bg);border-top-left-radius:22px;border-top-right-radius:22px;
  padding:10px 16px 22px;box-shadow:0 -14px 34px ${alpha("#000000", 0.18)}}
.sheet .grab{width:44px;height:5px;border-radius:999px;background:var(--phone-line);margin:2px auto 14px}
.safe{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:130px;height:5px;border-radius:999px;background:${alpha("#000000", 0.35)}}
.safe-fill{position:absolute;left:0;right:0;bottom:0;height:34px;background:repeating-linear-gradient(45deg,${alpha("#000000", 0.07)} 0 6px,transparent 6px 12px);
  pointer-events:none}
.focus-ring{outline:3px solid var(--phone-accent);outline-offset:2px}
.ripple{position:relative;overflow:hidden}
.ripple::after{content:"";position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;
  background:${alpha("#ffffff", 0.35)}}
.badge{position:absolute;top:14px;right:14px;background:#e8a33d;color:#1b1400;font-family:${FONTS.mono};font-size:11px;
  padding:5px 9px;border-radius:999px}
.tlag{position:absolute;top:14px;left:14px;background:var(--phone-accent);color:#fff;font-family:${FONTS.mono};font-size:11px;padding:5px 9px;border-radius:999px}
.skeleton{height:12px;border-radius:6px;background:var(--phone-surface);border:1px solid var(--phone-line)}
.toast{position:absolute;left:16px;right:16px;top:64px;background:var(--phone-ink);color:var(--phone-bg);border-radius:12px;
  padding:12px 14px;font-size:13px;display:flex;align-items:center;gap:10px}
`;

/** Оболочка телефона: палитра платформы + статус-бар. */
function phone(pal, inner, { label = "", badge = "", className = "" } = {}) {
  return `<div class="phone ${className}" style="--phone-bg:${pal.bg};--phone-surface:${pal.surface};--phone-ink:${pal.ink};--phone-mid:${pal.mid};--phone-accent:${pal.accent};--phone-line:${pal.line}">
    <div class="status"><span>${label || "9:41"}</span><span>◍ ᯤ ▮</span></div>
    ${badge ? `<span class="badge">${esc(badge)}</span>` : ""}
    ${inner}
    <div class="safe"></div>
  </div>`;
}

function caption(title, note) {
  return `<div class="p-cap"><span class="cap-title">${esc(title)}</span><span class="cap-note">${esc(note)}</span></div>`;
}

/* ─────────────── TMA (Telegram Mini Apps) ─────────────── */

const A = {};

A["tma-one-screen"] = () => ({
  cols: [
    {
      title: "Один экран — одна задача",
      note: "Бронирование и два поля. Каталог, история и настройки — в меню, а не рядом с главным действием.",
      html: phone(
        TG,
        `<div class="nav"><b>Бронь переговорной</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <p class="h1">Переговорная «Печь»<br>на 14:00</p>
          <div class="card"><div class="row between"><span class="muted">Когда</span><b>Сегодня · 14:00—15:30</b></div>
            <div class="row between"><span class="muted">Участники</span><b>6 человек</b></div>
            <div class="row between"><span class="muted">Оборудование</span><b>Экран + микрофоны</b></div></div>
          <div class="grid2"><span class="chip">С 12:00</span><span class="chip">15:30</span><span class="chip on">14:00</span><span class="chip">16:00</span></div>
          <span class="tiny">Свободных слотов сегодня · 4</span>
        </div>
        <div class="main-btn">Забронировать на 14:00</div>`,
        { label: "Меню · Каталог · История" },
      ),
    },
  ],
});

A["tma-instant-feedback"] = () => ({
  cols: [
    {
      title: "Отклик за 96 мс",
      note: "Каждое нажатие отвечает сменой состояния и ripple, а не спиннером во весь экран.",
      html: phone(
        TG,
        `<div class="nav"><b>Заявка № 1183</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="toast"><span>✓</span><span>Статус обновлён · 96 мс</span></div>
          <div class="card plain"><span class="tiny">Что произошло</span>
            <span class="muted">Кнопка нажата → смена состояния мгновенно, запрос уходит в фоне. Пользователь видит результат, даже если сеть медленная.</span></div>
          <div class="row" style="gap:10px"><span class="btn primary ripple" style="flex:1">Принять</span><span class="btn ghost" style="flex:1">Отложить</span></div>
          <div class="card"><div class="row between"><span class="muted">Латентность</span><b>96 мс</b></div>
            <div class="bar"><i style="--w:18%"></i></div>
            <span class="tiny">Бюджет отклика интерфейса · 100 мс</span></div>
          <div class="list">
            <div class="item"><span>Хаптик на приём</span><span class="chip on">вкл</span></div>
            <div class="item"><span>Скелетон вместо спиннера</span><span class="chip on">вкл</span></div>
          </div>
        </div>
        <div class="main-btn">Принято · следующая</div>`,
      ),
    },
  ],
});

A["tma-focus-visible"] = () => ({
  cols: [
    {
      title: "Фокус виден на каждом элементе",
      note: "Порядок обхода совпадает с визуальным: сверху вниз, слева направо. Обводка — 3 px акцентом, не серым.",
      html: phone(
        TG,
        `<div class="nav"><b>Настройки уведомлений</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <span class="tiny">Tab · фокус-обводка</span>
          <div class="list">
            <div class="item focus-ring"><span>Отчёт в 09:00</span><span class="chip on">вкл</span></div>
            <div class="item"><span>Сводка за неделю</span><span class="chip">выкл</span></div>
            <div class="item"><span>Напоминание о смене</span><span class="chip on">вкл</span></div>
          </div>
          <div class="card plain"><span class="tiny">Скринридер</span><span class="muted">role="status" объявляет смену состояния: «Отчёт в 09:00 — включено».</span></div>
          <span class="btn ghost">Проверить порядок обхода</span>
        </div>
        <div class="main-btn">Сохранить настройки</div>`,
      ),
    },
  ],
});

A["tma-invoice"] = () => ({
  cols: [
    {
      title: "Оплата только через Telegram",
      note: "openInvoice вместо внешних ссылок; бэкенд проверяет подпись initData через HMAC-SHA256 до обработки платежа.",
      html: phone(
        TG,
        `<div class="nav"><b>Оплата заказа</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card"><div class="row between"><span class="muted">Заказ</span><b>№ 8812 · 2 позиции</b></div>
            <div class="row between"><span class="muted">Сумма</span><b>1 480 ₽</b></div></div>
          <div class="card plain"><span class="tiny">Схема</span>
            <div class="kv"><span class="muted">1 · tg.openInvoice(link)</span><span class="muted">2 · платёж в Telegram</span>
            <span class="muted">3 · webhook → HMAC initData</span><span class="muted">4 · статус в заказе</span></div></div>
        </div>
        <div class="main-btn">Оплатить 1 480 ₽</div>`,
      ),
    },
    {
      title: "Так не делаем",
      note: "Внешняя ссылка на оплату разрывает сессию: пользователь уходит из мини-приложения и не возвращается к заказу.",
      html: phone(
        TG,
        `<div class="nav"><b>Оплата заказа</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card" style="border:1px solid #d9534f"><span class="tiny" style="color:#d9534f">Внешняя ссылка</span>
            <span class="muted">Открываем браузер… сессия Telegram теряется, статус платежа не возвращается.</span></div>
          <div class="list"><div class="item"><span>target="_blank" в WebView</span><span class="chip">есть</span></div>
          <div class="item"><span>HMAC-проверка initData</span><span class="chip">нет</span></div>
          <div class="item"><span>Возврат в заказ</span><span class="chip">нет</span></div></div>
        </div>
        <div class="main-btn" style="background:#d9534f">Перейти на сайт ↗</div>`,
        { badge: "анти-пример" },
      ),
    },
  ],
});

A["tma-viewport-safe"] = () => ({
  cols: [
    {
      title: "320 · 375 · 420",
      note: "Адаптация проверяется в трёх ширинах; низ экрана держит env(safe-area-inset-bottom), высота слушает viewportChanged.",
      html: phone(
        TG,
        `<div class="nav"><b>Каталог · 375 px</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="grid2">
            <div class="card"><div class="thumb" style="width:100%;height:88px"></div><span class="tiny">Котёл КВ-240</span><b>184 000 ₽</b></div>
            <div class="card"><div class="thumb" style="width:100%;height:88px"></div><span class="tiny">Насос ЦН-90</span><b>42 400 ₽</b></div>
            <div class="card"><div class="thumb" style="width:100%;height:88px"></div><span class="tiny">Щит АВР-4</span><b>31 900 ₽</b></div>
            <div class="card"><div class="thumb" style="width:100%;height:88px"></div><span class="tiny">Горелка Г-7</span><b>96 000 ₽</b></div>
          </div>
          <div class="bar"><i style="--w:100%"></i></div>
          <span class="tiny">Ниже — зона клавиатуры</span>
        </div>
        <div class="safe-fill"></div>
        <div class="main-btn">Добавить в заявку</div>`,
      ),
    },
  ],
});

A["tma-offline-sw"] = () => ({
  cols: [
    {
      title: "Offline без пустого экрана",
      note: "Кэш оболочки в Service Worker: install → addAll, fetch → cache-first; состояние переживает закрытие через CloudStorage.",
      html: phone(
        TG,
        `<div class="nav"><b>Смены</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="toast" style="background:#8a6d1f"><span>⛔</span><span>Сеть недоступна · данные из кэша 14:20</span></div>
          <div class="list">
            <div class="item"><span>Смена 2 · печь №4</span><span class="chip on">в работе</span></div>
            <div class="item"><span>Смена 1 · закрыта</span><span class="chip">сдана</span></div>
            <div class="item"><span>Заявка на ремонт</span><span class="chip">в очереди 1</span></div>
          </div>
          <div class="card plain"><span class="tiny">Очередь отправки</span>
            <div class="kv"><span class="muted">1 запрос ждёт сеть</span><span class="muted">уйдёт автоматически при восстановлении</span></div></div>
        </div>
        <div class="main-btn">Открыть смену</div>`,
        { badge: "offline" },
      ),
    },
  ],
});

A["tma-storefront"] = () => ({
  cols: [
    {
      title: "Витрина TMA",
      note: "Категория, описание и живая кнопка: понятно за секунду, зачем открывать.",
      html: phone(
        TG,
        `<div class="nav"><b>Кафе «Смена»</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <span class="chip on">Категория · Еда и доставка</span>
          <p class="h1">Кофе и завтраки<br>к 08:00</p>
          <span class="muted">Заказ на завтра, оплата в один тап. Готовим к началу смены, курьер — к 07:45.</span>
          <div class="grid3"><span class="chip">4,8 ★</span><span class="chip">до 20 мин</span><span class="chip">ИП Соколов</span></div>
          <div class="card"><div class="row between"><span class="muted">Ближайшее окно</span><b>07:45—08:00</b></div></div>
        </div>
        <div class="main-btn">Заказать на утро</div>`,
      ),
    },
  ],
});

A["tma-review"] = () => ({
  cols: [
    {
      title: "Обзор начинается с назначения",
      note: "Кому и зачем — до списка функций. Список фич читают только те, кто уже решил открыть.",
      html: phone(
        TG,
        `<div class="nav"><b>Обзор · пекарни</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <p class="h2">Для пекарен до 3 точек: план смен и списания</p>
          <span class="muted">Аудитория: технолог и управляющий. Задача — закрыть смену за 5 минут, не заводя таблиц.</span>
          <div class="card plain"><span class="tiny">Что закрывает</span>
            <div class="kv"><span class="muted">· план смены и факт выпечки</span><span class="muted">· списание и остатки</span>
            <span class="muted">· отчёт для бухгалтерии</span></div></div>
          <div class="grid2"><span class="chip on">3 пекарни</span><span class="chip">5 мин на смену</span></div>
        </div>
        <div class="main-btn">Открыть обзор</div>`,
      ),
    },
  ],
});

A["tma-charts"] = () => ({
  cols: [
    {
      title: "Ниша проверяется статистикой",
      note: "Топ-чарты RU-сегмента: видно, где реально есть спрос и сколько конкурентов.",
      html: phone(
        TG,
        `<div class="nav"><b>Статистика ниши</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <span class="tiny">Запуски по категориям · март</span>
          <div class="card">
            <div class="kv"><b>Еда и доставка</b><div class="bar"><i style="--w:86%"></i></div><span class="muted">18 400 запусков</span></div>
            <div class="kv"><b>Запись и услуги</b><div class="bar"><i style="--w:64%"></i></div><span class="muted">13 700 запусков</span></div>
            <div class="kv"><b>Сервисы для ЖКХ</b><div class="bar"><i style="--w:31%"></i></div><span class="muted">6 200 запусков</span></div>
            <div class="kv"><b>Мини-игры</b><div class="bar"><i style="--w:22%"></i></div><span class="muted">4 100 запусков</span></div>
          </div>
          <span class="muted">Конкурентов в нише «запись» — 41, из них 12 не работают с оплатой.</span>
        </div>
        <div class="main-btn">Смотреть чарты недели</div>`,
      ),
    },
  ],
});

A["tma-concept"] = () => ({
  cols: [
    {
      title: "Платформенная сетка + одна деталь",
      note: "Концепт TMA не перерисовывает платформу целиком: сетка и элементы Telegram, а яркая деталь — одна.",
      html: phone(
        TG,
        `<div class="nav"><b>Путевой лист</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card" style="background:linear-gradient(135deg,#3390ec,#6f4bd8);color:#fff">
            <span class="tiny" style="color:#dbe9ff">деталь концепта</span>
            <b style="font-size:22px">Маршрут дня</b>
            <span style="opacity:.85;font-size:13px">8 точек · 96 км · 2 выгрузки</span>
            <div class="bar" style="background:rgba(255,255,255,.3)"><i style="--w:46%;background:#fff"></i></div>
          </div>
          <div class="list"><div class="item"><span>Склад север</span><span class="chip on">07:20</span></div>
            <div class="item"><span>Печь №4</span><span class="chip">08:40</span></div>
            <div class="item"><span>Порт</span><span class="chip">10:05</span></div></div>
          <span class="muted">Остальное — типовые элементы: навбар, список, чипы, кнопка.</span>
        </div>
        <div class="main-btn">Начать маршрут</div>`,
      ),
    },
  ],
});

A["tma-case"] = () => ({
  cols: [
    {
      title: "Кейс считается метриками",
      note: "Установки, удержание и цена лида — вместо галереи скриншотов.",
      html: phone(
        TG,
        `<div class="nav"><b>Кейс · доставка обедов</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <p class="h2">Мини-приложение заменило телефонные заказы</p>
          <div class="grid2">
            <div class="card"><span class="tiny">Установки</span><b style="font-size:22px">9 240</b></div>
            <div class="card"><span class="tiny">Удержание 7д</span><b style="font-size:22px">38%</b></div>
            <div class="card"><span class="tiny">Средний чек</span><b style="font-size:22px">610 ₽</b></div>
            <div class="card"><span class="tiny">Цена лида</span><b style="font-size:22px">−41%</b></div>
          </div>
          <span class="muted">Замер до/после на одном канале трафика, 6 недель.</span>
        </div>
        <div class="main-btn">Повторить сценарий</div>`,
      ),
    },
  ],
});

A["tma-contrast"] = () => ({
  cols: [
    {
      title: "Контраст считается, а не «на глаз»",
      note: "Пары темы вынесены в токены и проверяются расчётом: ниже 4,5:1 не принимается.",
      html: phone(
        TG,
        `<div class="nav"><b>Токены темы</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <span class="tiny">Светлая тема · Telegram</span>
          <div class="card plain" style="gap:10px">
            <div class="row between"><span style="color:#0f0f0f;background:#ffffff;padding:6px 10px;border-radius:8px">Текст 15px</span><span class="chip on">14,7:1</span></div>
            <div class="row between"><span style="color:#707579;background:#ffffff;padding:6px 10px;border-radius:8px">Вторичный</span><span class="chip on">4,8:1</span></div>
            <div class="row between"><span style="color:#a9adb1;background:#ffffff;padding:6px 10px;border-radius:8px">Хинт</span><span class="chip">3,1:1</span></div>
          </div>
          <span class="tiny">Тёмная тема · #17212b</span>
          <div class="card plain" style="gap:10px">
            <div class="row between"><span style="color:#f5f5f5;background:#17212b;padding:6px 10px;border-radius:8px">Текст 15px</span><span class="chip on">12,9:1</span></div>
            <div class="row between"><span style="color:#8b98a5;background:#17212b;padding:6px 10px;border-radius:8px">Вторичный</span><span class="chip on">4,6:1</span></div>
          </div>
        </div>
        <div class="main-btn">Применить токены</div>`,
      ),
    },
  ],
});

A["tma-heuristics"] = () => ({
  cols: [
    {
      title: "Десять эвристик — проверяемое ядро",
      note: "Каждая эвристика закреплена за деталью интерфейса, а не за абзацем документации.",
      html: phone(
        TG,
        `<div class="nav"><b>Эвристики NN/g</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body" style="gap:8px">
          ${[
            ["Видимость статуса", "role=\"status\" + тост", true],
            ["Язык пользователя", "«смена сдана», не «коммит»", true],
            ["Свобода и контроль", "BackButton на шаге", true],
            ["Консистентность", "токены темы", true],
            ["Предотвращение ошибок", "подтверждение списания", true],
            ["Распознавание", "подписи <label>", true],
            ["Гибкость", "быстрые действия", false],
            ["Эстетика", "одно действие на экран", true],
            ["Помощь в ошибке", "«проверьте номер»", true],
            ["Справка", "openLink в доки", true],
          ]
            .map(
              ([t, d, ok]) => `<div class="row between" style="border-bottom:1px solid var(--phone-line);padding:6px 0">
                <span class="kv"><b style="font-size:14px">${esc(t)}</b><span class="muted" style="font-size:12px">${esc(d)}</span></span>
                <span class="chip${ok ? " on" : ""}">${ok ? "OK" : "GAP"}</span></div>`,
            )
            .join("")}
        </div>
        <div class="main-btn">Закрыть пробел · Гибкость</div>`,
      ),
    },
  ],
});

A["tma-cta"] = () => ({
  cols: [
    {
      title: "Одна цель на экране",
      note: "Единственная MainButton, CTA-глагол и конкретное число вместо «много/быстро».",
      html: phone(
        TG,
        `<div class="nav"><b>Монтаж кухни</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <p class="h1">Монтаж за 3 дня<br>с фиксированной ценой</p>
          <div class="grid3"><span class="chip on">3 дня</span><span class="chip">148 000 ₽</span><span class="chip">гарантия 3 года</span></div>
          <div class="card"><div class="row between"><span class="muted">Замер</span><b>бесплатно, 40 мин</b></div>
            <div class="row between"><span class="muted">Свободные монтажники</span><b>2 бригады</b></div></div>
          <span class="muted">Вторичные действия — в меню, а не рядом с главной кнопкой.</span>
        </div>
        <div class="main-btn">Записаться на замер</div>`,
      ),
    },
  ],
});

A["tma-motion"] = () => ({
  cols: [
    {
      title: "Движение уважает систему",
      note: "Лёгкий CSS-отклик, поддержка prefers-reduced-motion и никаких блокирующих задержек в JS.",
      html: phone(
        TG,
        `<div class="nav"><b>Оформление заказа</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card"><span class="tiny">Обычный режим · 180 мс</span>
            <div class="row between"><span class="muted">Переход между шагами</span><b>translateY 8px</b></div>
            <div class="bar"><i style="--w:44%"></i></div></div>
          <div class="card plain"><span class="tiny">prefers-reduced-motion: reduce</span>
            <div class="row between"><span class="muted">Переход</span><b>мгновенно, без сдвига</b></div>
            <div class="row between"><span class="muted">Хаптик</span><b>остаётся</b></div></div>
          <span class="muted">Ни один setTimeout не блокирует интерфейс дольше 200 мс.</span>
        </div>
        <div class="main-btn">Продолжить</div>`,
      ),
    },
  ],
});

A["tma-voice"] = () => ({
  cols: [
    {
      title: "Экспертный текст, не следы ИИ",
      note: "Факты и числа вместо клише; глагол вместо «представляет собой». Проверяет детерминированный lint-copy.",
      html: phone(
        TG,
        `<div class="nav"><b>О продукте</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card" style="border-left:3px solid #2f9e44">
            <span class="tiny" style="color:#2f9e44">так пишем</span>
            <span class="muted">«Закрываем смену за 5 минут: пекарь вносит факт выпечки, система списывает остатки и готовит отчёт для бухгалтерии.»</span></div>
          <div class="card" style="border-left:3px solid #d9534f">
            <span class="tiny" style="color:#d9534f">так не пишем</span>
            <span class="muted">«Наше решение представляет собой инновационный инструмент, обеспечивающий оптимизацию процессов.»</span></div>
          <span class="tiny">Балл стиля · 94/100 · A-xx: 0</span>
        </div>
        <div class="main-btn">Открыть демо</div>`,
      ),
    },
  ],
});

/* ─────────────── Мобильные приложения ─────────────── */

A["mob-thumb-zone"] = () => ({
  cols: [
    {
      title: "Главные действия — в нижней трети",
      note: "Зона большого пальца: 40% высоты экрана снизу. Всё частое — здесь.",
      html: phone(
        IOS,
        `<div class="nav"><b>Сегодня</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body" style="position:relative">
          <div class="card"><div class="row between"><span class="muted">Шаги</span><b>8 214</b></div><div class="bar"><i style="--w:82%"></i></div></div>
          <div class="card"><div class="row between"><span class="muted">Сон</span><b>7 ч 20 мин</b></div><div class="bar"><i style="--w:64%"></i></div></div>
          <div style="position:absolute;left:0;right:0;bottom:0;height:40%;background:${alpha(IOS.accent, 0.08)};
            border-top:1px dashed ${alpha(IOS.accent, 0.5)};display:flex;align-items:flex-start;justify-content:center;padding-top:8px">
            <span class="tiny" style="color:${IOS.accent}">зона большого пальца</span></div>
        </div>
        <div class="main-btn" style="margin:0 16px 78px">Начать тренировку</div>
        <div class="tabbar"><span class="on">Сегодня</span><span>План</span><span>Замеры</span><span>Профиль</span></div>`,
        { label: "iOS · HIG" },
      ),
    },
  ],
});

A["mob-platform-nav"] = () => ({
  cols: [
    {
      title: "iOS · таб-бар снизу",
      note: "Навигация следует платформе: таб-бар внизу, заголовок по центру, кнопки — текстом.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Notes</b></div>
        <div class="body"><div class="list">
          <div class="item"><span class="kv"><b>Список покупок</b><span class="muted">8 заметок · вчера</span></span></div>
          <div class="item"><span class="kv"><b>Идеи</b><span class="muted">3 заметки · 12 окт</span></span></div>
          <div class="item"><span class="kv"><b>Работа</b><span class="muted">14 заметок · 09 окт</span></span></div>
        </div></div>
        <div class="tabbar"><span class="on">Заметки</span><span>Папки</span><span>Теги</span></div>`,
        { label: "iOS · HIG" },
      ),
    },
    {
      title: "Android · системная навигация",
      note: "Material 3: заголовок слева, FAB для главного действия, системная панель — вне контента.",
      html: phone(
        ANDROID,
        `<div class="nav"><span class="back" style="border-color:${ANDROID.accent}"></span><b>Заметки</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body"><div class="list">
          <div class="item"><span class="kv"><b>Список покупок</b><span class="muted">8 заметок · вчера</span></span></div>
          <div class="item"><span class="kv"><b>Идеи</b><span class="muted">3 заметки · 12 окт</span></span></div>
          <div class="item"><span class="kv"><b>Работа</b><span class="muted">14 заметок · 09 окт</span></span></div>
        </div></div>
        <div style="margin:0 16px 20px;display:flex;justify-content:flex-end">
          <span style="background:${ANDROID.accent};color:#fff;border-radius:16px;padding:14px 20px;font-weight:600">+ Новая</span></div>
        <div class="tabbar" style="padding-bottom:12px"><span class="on">Заметки</span><span>Папки</span><span>Настройки</span></div>`,
        { label: "Android · Material 3" },
      ),
    },
  ],
});

A["mob-touch-target"] = () => ({
  cols: [
    {
      title: "Цель ≥ 44×44 px с видимым зазором",
      note: "Проверяется измерителем, а не глазом: минимальная цель, отступ между целями, hitSlop там, где дизайн требует меньше.",
      html: phone(
        IOS,
        `<div class="nav"><b>Замеры</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card plain"><span class="tiny">Измерение целей</span>
            <div class="row between"><span class="muted">Минимальная цель</span><b>48×48</b></div>
            <div class="row between"><span class="muted">Зазор</span><b>12 px</b></div>
            <div class="row between"><span class="muted">hitSlop у иконок</span><b>10 px</b></div></div>
          <div class="grid3">
            <div class="card" style="align-items:center;height:64px;justify-content:center"><span style="font-size:20px">＋</span><span class="tiny">48 px</span></div>
            <div class="card" style="align-items:center;height:64px;justify-content:center"><span style="font-size:20px">↻</span><span class="tiny">48 px</span></div>
            <div class="card" style="align-items:center;height:64px;justify-content:center"><span style="font-size:20px">✕</span><span class="tiny">48 px</span></div>
          </div>
          <span class="muted">Соседние цели не соприкасаются: промах по одной не срабатывает по другой.</span>
        </div>
        <div class="tabbar"><span class="on">Цели</span><span>Токены</span><span>Проверка</span></div>`,
      ),
    },
  ],
});

A["mob-offline-queue"] = () => ({
  cols: [
    {
      title: "Кэш + очередь мутаций",
      note: "Сеть пропала — экран живёт кэшем, изменения встают в очередь и уходят при восстановлении.",
      html: phone(
        DARK,
        `<div class="nav" style="border-color:${DARK.line}"><b>Смены</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="toast" style="background:#8a6d1f;color:#fff"><span>⛔</span><span>Offline · кэш 14:20</span></div>
          <div class="list" style="background:${DARK.line}">
            <div class="item" style="background:${DARK.surface}"><span>Смена 2 · печь №4</span><span class="chip">в работе</span></div>
            <div class="item" style="background:${DARK.surface}"><span>Списание · 12 кг</span><span class="chip on">в очереди</span></div>
            <div class="item" style="background:${DARK.surface}"><span>Фото наряда</span><span class="chip on">в очереди</span></div>
          </div>
          <div class="card"><span class="tiny">Очередь</span><div class="row between"><span class="muted">2 операции ждут сеть</span><b>авто</b></div>
            <div class="bar"><i style="--w:30%"></i></div></div>
        </div>
        <div class="main-btn" style="background:${DARK.accent}">Сдать смену</div>`,
        { label: "Android · offline", badge: "offline" },
      ),
    },
  ],
});

A["mob-store-assets"] = () => ({
  cols: [
    {
      title: "Стор принимает по трём артефактам",
      note: "Иконка 1024×1024 без прозрачности, скриншоты 6.5″ и 5.5″, описание ценности.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Ассеты для стора</b></div>
        <div class="body">
          <div class="card" style="align-items:center;gap:12px">
            <div style="width:120px;height:120px;border-radius:26px;background:linear-gradient(140deg,#007aff,#5e5ce6);
              display:flex;align-items:center;justify-content:center;color:#fff;font-size:44px;font-weight:700">З</div>
            <span class="tiny">icon-1024.png · без альфы</span></div>
          <div class="grid2">
            <div class="card" style="padding:8px"><div class="thumb" style="width:100%;height:130px"></div><span class="tiny">6.5″ · 1242×2688</span></div>
            <div class="card" style="padding:8px"><div class="thumb" style="width:100%;height:130px"></div><span class="tiny">5.5″ · 1242×2208</span></div>
          </div>
          <span class="muted">Подпись на первом скриншоте отвечает на вопрос «что я получу», а не «что внутри».</span>
        </div>
        <div class="main-btn">Выгрузить в App Store Connect</div>`,
      ),
    },
  ],
});

A["mob-i18n-keys"] = () => ({
  cols: [
    {
      title: "Локализация живёт ключами",
      note: "en.json и ru.json — единственный источник текста; в коде только ключи, без хардкода строк.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Локали</b></div>
        <div class="body">
          <div class="card plain"><span class="tiny">ru.json</span>
            <div class="kv"><span class="muted">"workout.start": "Начать тренировку"</span>
            <span class="muted">"workout.empty": "Тренировок пока нет"</span></div></div>
          <div class="card plain"><span class="tiny">en.json</span>
            <div class="kv"><span class="muted">"workout.start": "Start workout"</span>
            <span class="muted">"workout.empty": "No workouts yet"</span></div></div>
          <div class="card" style="border-left:3px solid #2f9e44"><span class="tiny" style="color:#2f9e44">в коде</span>
            <span class="muted">t("workout.start") — ни одной строки на языке интерфейса</span></div>
          <span class="muted">Плюрализация и порядок слов — в файле локали, а не в шаблоне экрана.</span>
        </div>
        <div class="tabbar"><span class="on">Ключи</span><span>ru</span><span>en</span></div>`,
      ),
    },
  ],
});

A["mob-flows"] = () => ({
  cols: [
    {
      title: "Флоу по реальным приложениям",
      note: "Онбординг → чекаут → настройки: экраны рисуются по проверенным флоу, а не из головы.",
      html: phone(
        IOS,
        `<div class="nav"><span class="back" style="border-color:${IOS.accent}"></span><b>Чекаут</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <span class="tiny">Шаг 2 из 3</span>
          <div class="bar"><i style="--w:66%"></i></div>
          <div class="card"><div class="row between"><span class="muted">Доставка</span><b>Завтра, 10:00</b></div>
            <div class="row between"><span class="muted">Оплата</span><b>Карта ·• 4417</b></div>
            <div class="row between"><span class="muted">Адрес</span><b>Невский, 14</b></div></div>
          <div class="list"><div class="item"><span>Промокод</span><span class="chip">добавить</span></div>
            <div class="item"><span>Комментарий курьеру</span><span class="chip">есть</span></div></div>
          <span class="muted">Назад — системный жест и кнопка; данные шага сохраняются.</span>
        </div>
        <div class="main-btn">Оплатить 3 480 ₽</div>`,
      ),
    },
  ],
});

A["mob-pattern-library"] = () => ({
  cols: [
    {
      title: "Пустые состояния из библиотеки",
      note: "Пусто, ошибка, загрузка и успех берутся из библиотеки паттернов, а не придумываются заново.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Состояния</b></div>
        <div class="body">
          <div class="card" style="align-items:center;gap:10px;padding:26px 16px">
            <div style="width:56px;height:56px;border-radius:16px;background:${alpha(IOS.accent, 0.12)}"></div>
            <b>Тренировок пока нет</b><span class="muted" style="text-align:center">Первая тренировка займёт 12 минут. Начнём с разминки?</span>
            <span class="btn primary" style="align-self:stretch">Собрать первую тренировку</span></div>
          <div class="grid2"><div class="card"><span class="tiny">Загрузка</span><div class="skeleton"></div><div class="skeleton" style="width:70%"></div></div>
            <div class="card"><span class="tiny">Ошибка</span><span class="muted">Не сохранилось. Повторите — данные остались на экране.</span></div></div>
        </div>
        <div class="tabbar"><span class="on">Паттерны</span><span>Правила</span><span>Токены</span></div>`,
      ),
    },
  ],
});

A["mob-platform-lang"] = () => ({
  cols: [
    {
      title: "iOS говорит по-своему",
      note: "HIG: крупный заголовок, тонкие разделители, спокойные акценты, действия текстом.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Настройки</b></div>
        <div class="body"><p class="h1">Здоровье</p><div class="list">
          <div class="item"><span>Health</span><span class="chip">данные есть</span></div>
          <div class="item"><span>Уведомления</span><span class="chip">вкл</span></div>
          <div class="item"><span>Язык</span><span class="chip">RU</span></div>
        </div></div>
        <div class="tabbar"><span class="on">Сегодня</span><span>Здоровье</span><span>Профиль</span></div>`,
        { label: "iOS · HIG" },
      ),
    },
    {
      title: "Android — иначе",
      note: "Material 3: акцентная палитра от одного цвета, карточки с тональной подложкой, FAB.",
      html: phone(
        ANDROID,
        `<div class="nav"><span class="back" style="border-color:${ANDROID.accent}"></span><b>Настройки</b></div>
        <div class="body"><p class="h1" style="color:${ANDROID.ink}">Здоровье</p><div class="list" style="background:${ANDROID.line}">
          <div class="item" style="background:${ANDROID.surface}"><span>Health Connect</span><span class="chip">данные есть</span></div>
          <div class="item" style="background:${ANDROID.surface}"><span>Уведомления</span><span class="chip on">вкл</span></div>
          <div class="item" style="background:${ANDROID.surface}"><span>Язык</span><span class="chip">RU</span></div>
        </div></div>
        <div class="main-btn" style="background:${ANDROID.accent}">Синхронизировать</div>`,
        { label: "Android · Material 3" },
      ),
    },
  ],
});

A["mob-store-preview"] = () => ({
  cols: [
    {
      title: "Превью продаёт, а не показывает",
      note: "Маркетинговые скриншоты 6.5″ и 5.5″ — история из трёх кадров с подписями-выгодами.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Превью в сторе</b></div>
        <div class="body" style="gap:10px">
          ${[["12 минут — и тренировка закрыта", "План на день"], ["Видно прогресс, а не только цифры", "Динамика"], ["Данные работают offline", "Оффлайн"]]
            .map(
              ([t, k], i) => `<div class="card" style="padding:0;overflow:hidden">
                <div style="height:120px;background:linear-gradient(${140 + i * 30}deg,${alpha(IOS.accent, 0.85)},#5e5ce6)"></div>
                <div style="padding:12px 14px"><b style="font-size:15px">${esc(t)}</b><span class="muted">${esc(k)} · кадр ${i + 1}/3</span></div></div>`,
            )
            .join("")}
        </div>
        <div class="main-btn">Выгрузить превью</div>`,
      ),
    },
  ],
});

A["mob-nav-patterns"] = () => ({
  cols: [
    {
      title: "Навигация из проверенных паттернов",
      note: "Tab Bar, стек, карточки: паттерн выбирается из библиотеки под задачу, а не изобретается.",
      html: phone(
        IOS,
        `<div class="nav"><span class="back" style="border-color:${IOS.accent}"></span><b>Папка «Работа»</b></div>
        <div class="body">
          <div class="grid2"><div class="card"><span class="tiny">Стек</span><b>Заметка → правка</b><span class="muted">возврат по свайпу и кнопке</span></div>
            <div class="card"><span class="tiny">Tab Bar</span><b>3 корня</b><span class="muted">состояние каждого сохраняется</span></div>
            <div class="card"><span class="tiny">Карточки</span><b>списки и сетка</b><span class="muted">плотность переключается</span></div>
            <div class="card"><span class="tiny">Модальное</span><b>создание</b><span class="muted">свайп вниз закрывает</span></div></div>
          <span class="muted">Глубина стека не больше трёх: дальше — хлебные крошки или возврат в корень.</span>
        </div>
        <div class="tabbar"><span class="on">Заметки</span><span>Папки</span><span>Поиск</span></div>`,
      ),
    },
  ],
});

A["mob-components"] = () => ({
  cols: [
    {
      title: "Компонент из реальных паттернов",
      note: "Фильтр, чипсы и сегменты взяты из библиотек паттернов — с состояниями нажатия и пустым результатом.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Каталог</b></div>
        <div class="body">
          <div class="row" style="gap:8px;overflow:hidden"><span class="chip on">Все</span><span class="chip">Бег</span><span class="chip">Плавание</span></div>
          <div class="card"><span class="tiny">Фильтр · «Бег»</span>
            <div class="list"><div class="item"><span>Интервалы 5×400 м</span><span class="chip">24 мин</span></div>
              <div class="item"><span>Длинная · 12 км</span><span class="chip">68 мин</span></div></div></div>
          <div class="card plain"><span class="tiny">Пустой результат фильтра</span>
            <span class="muted">«По фильтру “вода” тренировок нет. Показать все?» — с кнопкой сброса.</span></div>
        </div>
        <div class="tabbar"><span class="on">Каталог</span><span>План</span><span>Профиль</span></div>`,
      ),
    },
  ],
});

A["mob-contrast"] = () => ({
  cols: [
    {
      title: "Контраст считает валидатор",
      note: "Пары темы живут в app/theme.json и проходят расчёт WCAG: ниже 4,5:1 экран не принимается.",
      html: phone(
        DARK,
        `<div class="nav"><b>Токены темы</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card plain" style="gap:10px">
            ${[["#f5f5f5", "#17212b", "Основной текст", "12,9:1", true],
              ["#8b98a5", "#17212b", "Вторичный", "4,6:1", true],
              ["#5c6b7a", "#17212b", "Подпись", "3,2:1", false]]
              .map(([fg, bg, k, ratio, ok]) => `<div class="row between">
                <span style="color:${fg};background:${bg};padding:7px 11px;border-radius:8px;font-size:14px">${esc(k)}</span>
                <span class="chip${ok ? " on" : ""}">${esc(ratio)}</span></div>`).join("")}
          </div>
          <span class="muted">Токен с провалом не попадает в тему: либо темнее, либо крупнее 18 px.</span>
          <div class="card"><span class="tiny">app/theme.json</span>
            <div class="row between"><span class="muted">Проверено пар</span><b>14</b></div>
            <div class="row between"><span class="muted">Ниже нормы</span><b>1</b></div></div>
        </div>
        <div class="main-btn">Обновить токены</div>`,
        { label: "Android · тёмная тема" },
      ),
    },
  ],
});

A["mob-heuristics"] = () => ({
  cols: [
    {
      title: "Эвристики машинизированы",
      note: "Статус, стек, retry, подписи и справка проверяются сканом V-23, а не пересказываются в документе.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Проверка эвристик</b></div>
        <div class="body" style="gap:8px">
          ${[["Видимость статуса", "role=status + прогресс", true],
            ["Мир пользователя", "«тренировка», не «сессия»", true],
            ["Свобода и контроль", "отмена на 5 с", true],
            ["Консистентность", "токены и компоненты", true],
            ["Предотвращение ошибок", "подтверждение удаления", true],
            ["Распознавание", "подписи и иконки", true],
            ["Гибкость", "жест и кнопка", true],
            ["Эстетика", "одно действие на экран", true],
            ["Возврат после ошибки", "retry сохраняет ввод", false],
            ["Справка", "раздел в профиле", true]]
            .map(([t, d, ok]) => `<div class="row between" style="border-bottom:1px solid var(--phone-line);padding:6px 0">
              <span class="kv"><b style="font-size:14px">${esc(t)}</b><span class="muted" style="font-size:12px">${esc(d)}</span></span>
              <span class="chip${ok ? " on" : ""}">${ok ? "OK" : "GAP"}</span></div>`).join("")}
        </div>
        <div class="tabbar"><span class="on">Ядро</span><span>Полный список</span><span>Отчёт</span></div>`,
      ),
    },
  ],
});

A["mob-typography"] = () => ({
  cols: [
    {
      title: "Кегли заданы явно",
      note: "База ≥ 16, контент ≥ 14, интерлиньяж ≥ 20: удушающее межстрочное — нарушение норм.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Типографика</b></div>
        <div class="body">
          <div class="card"><span class="tiny">Display · 34 / 41</span>
            <b style="font-size:30px;line-height:1.2">Тренировка дня</b></div>
          <div class="card"><span class="tiny">Title · 22 / 28</span>
            <b style="font-size:21px">Интервалы 5×400</b></div>
          <div class="card"><span class="tiny">Body · 17 / 24</span>
            <span style="font-size:17px;line-height:1.45">Разминка 8 минут, затем пять отрезков по 400 метров в темпе 4:10.</span></div>
          <div class="card"><span class="tiny">Caption · 13 / 18</span>
            <span class="muted" style="font-size:13px">Обновлено 12 минут назад</span></div>
        </div>
        <div class="tabbar"><span class="on">Шкала</span><span>Токены</span><span>Проверка</span></div>`,
      ),
    },
  ],
});

A["mob-animation"] = () => ({
  cols: [
    {
      title: "60 fps: драйвер и кадровая модель",
      note: "Animated.spring с useNativeDriver, никаких длинных setTimeout на главном потоке; отклик остаётся мгновенным.",
      html: phone(
        ANDROID,
        `<div class="nav"><b>Анимация</b><span class="menu"><i></i><i></i><i></i></span></div>
        <div class="body">
          <div class="card" style="background:${ANDROID.surface}">
            <span class="tiny">Профиль кадров</span>
            <div class="row" style="align-items:flex-end;gap:3px;height:70px">
              ${Array.from({ length: 24 }, (_v, i) => `<i style="flex:1;height:${i % 7 === 3 ? 52 : 66}px;background:${i % 7 === 3 ? "#d9534f" : ANDROID.accent};opacity:${i % 7 === 3 ? 1 : 0.55}"></i>`).join("")}
            </div>
            <div class="row between"><span class="muted">Кадры 16,7 мс</span><b>59,8 fps</b></div></div>
          <div class="card plain"><span class="tiny">Драйвер</span>
            <div class="row between"><span class="muted">Animated.spring</span><b>useNativeDriver: true</b></div>
            <div class="row between"><span class="muted">Долгих setTimeout</span><b>0</b></div></div>
        </div>
        <div class="main-btn" style="background:${ANDROID.accent}">Запустить анимацию</div>`,
      ),
    },
  ],
});

A["mob-voice"] = () => ({
  cols: [
    {
      title: "Текст интерфейса — часть дизайна",
      note: "CTA глаголом, ошибка с решением, пустое состояние с подсказкой. Тексты проверяются линтером.",
      html: phone(
        IOS,
        `<div class="nav" style="justify-content:center"><b>Микрокопия</b></div>
        <div class="body">
          <div class="card"><span class="tiny">CTA</span><span class="muted">«Начать тренировку» — глагол и результат, а не «Далее».</span></div>
          <div class="card"><span class="tiny">Ошибка</span><span class="muted">«Не сохранилось: проверьте интернет. Данные остались на экране — повторите.»</span></div>
          <div class="card"><span class="tiny">Пустое состояние</span><span class="muted">«Замеров пока нет. Первый замер — 5 минут.»</span></div>
          <span class="tiny">lint-copy · A-xx 0 · балл 96/100</span>
        </div>
        <div class="main-btn">Начать тренировку</div>`,
      ),
    },
  ],
});

/* ─────────────── сборка ─────────────── */

/** Плашка образца — служебная: длинный takeaway живёт в meta.yaml и GALLERY.md. */
function shortTakeaway(text, limit = 108) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).replace(/[\s,.;:—-]+$/, "")}…`;
}

const STAGE_BG = { tg: "#dfe3e8", ios: "#e6e7ea", android: "#ece7f2", dark: "#1c2530", compare: "#e9eaec" };

/**
 * Рисует образец референса мини-приложения или мобильного приложения.
 * @param {{id: string, style: string[], takeaway: string, archetype: string, platform?: string}} ref
 * @returns {{html: string, title: string}}
 */
export function renderAppSpecimen(ref) {
  const build = A[ref.archetype];
  if (!build) throw new Error(`неизвестный архетип мобильного образца: ${ref.archetype}`);
  const { cols } = build();
  const stage = STAGE_BG[ref.platform ?? "compare"] ?? STAGE_BG.compare;
  const body = `<div class="shot-stage">${cols.map((c) => `<div class="col">${c.html}${caption(c.title, c.note)}</div>`).join("")}</div>
${stamp(ref.id, shortTakeaway(ref.takeaway), { bg: "#111111", ink: "#f2f2f2", accent: "#8fd14f" })}`;
  const css = `${STAGE_CSS}`;
  const title = `${ref.id} · ${(ref.style ?? []).join(", ")}`;
  return { html: page({ title, css, body, bg: "#ffffff", ink: "#111111", accent: "#3390ec", mid: "#707579", faint: "#e6e7e9", lang: "ru" }), title };
}

export const APP_ARCHETYPES = Object.freeze(Object.keys(A));

export default renderAppSpecimen;
