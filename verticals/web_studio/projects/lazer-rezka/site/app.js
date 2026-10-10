/* PRJ-03 · Цех лазерной резки · app.js
   Три рецепта: sticky-scene (02), scramble-decode (05), counter-tick (04).
   Кривые движения берутся из motion/easing-curves.json через CSS-переменные.
   Ноль зависимостей. prefers-reduced-motion гасит кинематику (К-19). */
(() => {
  "use strict";

  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------------------------------------------
     Цены. Ключ — материал, внутри толщина → три объёмные корзины
     [до 100, 100…500, 500…1000 пог.м]. Источник: прайс-лист заказчика
     https://ceh-lazer-rezka.ru/materials/
  ---------------------------------------------------------------- */
  const RATES = {
    st: {
      label: "Сталь Ст3",
      th: [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10],
      r: {
        1: [56, 34, 30], 1.5: [59, 50, 41], 2: [61, 47, 42], 2.5: [69, 59, 52],
        3: [82, 68, 61], 4: [95, 77, 69], 5: [115, 90, 82], 6: [147, 104, 95],
        8: [206, 134, 121], 10: [270, 225, 169]
      }
    },
    a304: {
      label: "Нержавейка AISI 304",
      th: [1, 1.5, 2, 3, 4, 5, 6, 8, 10],
      r: {
        1: [73, 56, 47], 1.5: [120, 88, 56], 2: [154, 108, 89], 3: [205, 166, 153],
        4: [270, 205, 153], 5: [387, 270, 192], 6: [517, 387, 290],
        8: [777, 582, 452], 10: [972, 777, 582]
      }
    },
    al: {
      label: "Алюминий АД31",
      th: [1, 1.5, 2, 3, 4, 5],
      r: {
        1: [70, 57, 45], 1.5: [115, 79, 61], 2: [148, 105, 86],
        3: [199, 161, 109], 4: [263, 199, 148], 5: [376, 263, 188]
      }
    }
  };

  const TIERS = ["до 100 пог.м", "100…500 пог.м", "500…1000 пог.м"];
  const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

  const tierOf = (len) => {
    if (len <= 0) return -1;
    if (len < 100) return 0;
    if (len < 500) return 1;
    if (len <= 1000) return 2;
    return 3;
  };

  /* ---------------------------------------------------------------
     1 · sticky-scene — паспорт детали.
     Плита закреплена, на каждый шаг меняется ровно одно значение.
  ---------------------------------------------------------------- */
  const initTolerance = () => {
    const steps = $$(".tol__step");
    const value = $("#tolValue");
    const unit = $("#tolUnit");
    const caption = $("#tolCaption");
    const bars = $$("#tolScale i");
    if (!steps.length || !value) return;

    const apply = (i) => {
      const src = steps[i];
      steps.forEach((s, k) => s.setAttribute("data-active", k === i ? "1" : "0"));
      value.textContent = src.dataset.value;
      unit.textContent = src.dataset.unit;
      caption.textContent = src.dataset.caption;
      bars.forEach((b, k) => {
        if (k <= i) b.setAttribute("data-on", "1");
        else b.removeAttribute("data-on");
      });
    };

    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          apply(steps.indexOf(e.target));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    steps.forEach((s) => io.observe(s));
  };

  /* ---------------------------------------------------------------
     Рейка — активный раздел. Тот же наблюдатель, отдельная зона.
  ---------------------------------------------------------------- */
  const initRail = () => {
    const links = $$(".rail__idx a");
    const acts = $$(".act");
    if (!links.length || !acts.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.id;
          links.forEach((a) => {
            if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    acts.forEach((a) => io.observe(a));
  };

  /* ---------------------------------------------------------------
     2 · scramble-decode — коды шагов собираются как табло ЧПУ.
  ---------------------------------------------------------------- */
  const GLYPHS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789·/-";

  const initCodes = () => {
    const nodes = $$(".flow__code");
    if (!nodes.length) return;

    const decode = (node) => {
      const final = node.dataset.code || node.textContent;
      if (calm.matches) { node.textContent = final; return; }

      let frame = 0;
      const total = 26;
      const tick = () => {
        frame += 1;
        const locked = Math.floor((frame / total) * final.length);
        let out = "";
        for (let i = 0; i < final.length; i += 1) {
          const ch = final[i];
          if (ch === " " || i < locked) out += ch;
          else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        node.textContent = out;
        if (frame < total) requestAnimationFrame(tick);
        else node.textContent = final;
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) { nodes.forEach(decode); return; }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = nodes.indexOf(e.target);
          window.setTimeout(() => decode(e.target), i * 140);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );
    nodes.forEach((n) => io.observe(n));
  };

  /* ---------------------------------------------------------------
     3 · Материалы — переключатель прайс-сетки (SK-08, SK-07).
  ---------------------------------------------------------------- */
  const initMaterials = () => {
    const tabs = $$(".mat__btn");
    if (!tabs.length) return;

    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    };

    tabs.forEach((t) => t.addEventListener("click", () => select(t)));
    tabs.forEach((t, i) =>
      t.addEventListener("keydown", (ev) => {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        ev.preventDefault();
        const step = ev.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        next.focus();
        select(next);
      })
    );
  };

  /* ---------------------------------------------------------------
     4 · counter-tick — цена докручивается барабаном одометра.
     Число всегда имеет источник: ставка из прайса × длина реза.
  ---------------------------------------------------------------- */
  const easeTo = (node, from, to, dur) => {
    if (calm.matches || from === to) { node.textContent = nf.format(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = nf.format(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const initCalc = () => {
    const form = $("#calcForm");
    if (!form) return;

    const matSel = $("#cMat");
    const thSel = $("#cTh");
    const lenIn = $("#cLen");
    const lenOut = $("#cLenOut");
    const out = $("#calcOut");
    const stateEl = $("#calcState");
    const sumEl = $("#calcSum");

    let shown = 0;

    const fillThickness = (key) => {
      const pack = RATES[key];
      const keep = thSel.value;
      thSel.innerHTML = "";
      pack.th.forEach((t) => {
        const o = document.createElement("option");
        o.value = String(t);
        o.textContent = String(t).replace(".", ",") + " мм";
        thSel.appendChild(o);
      });
      thSel.value = pack.th.includes(Number(keep)) ? keep : String(pack.th[2] ?? pack.th[0]);
    };

    const setState = (name, text) => {
      out.setAttribute("data-state", name);
      stateEl.setAttribute("data-state", name);
      stateEl.textContent = text;
    };

    const render = () => {
      const key = matSel.value;
      const pack = RATES[key];
      const th = Number(thSel.value);
      const len = Number(lenIn.value);
      const tier = tierOf(len);

      lenOut.textContent = String(len);
      $("#oMat").textContent = pack.label;
      $("#oTh").textContent = th ? String(th).replace(".", ",") + " мм" : "не выбрана";

      /* Partial: толщина не выбрана или объём свыше 1000 пог.м */
      if (!th || Number.isNaN(th)) {
        $("#oRate").textContent = "—";
        $("#oLen").textContent = nf1.format(len) + " пог.м";
        $("#oTier").textContent = "—";
        easeTo(sumEl, shown, 0, 260);
        shown = 0;
        setState("partial", "Выберите толщину, чтобы подставить ставку из прайса.");
        return;
      }

      const rate = pack.r[th];
      if (tier === -1) {
        $("#oRate").textContent = rate[0] + " ₽";
        $("#oLen").textContent = "0 пог.м";
        $("#oTier").textContent = "—";
        easeTo(sumEl, shown, 0, 260);
        shown = 0;
        setState("empty", "Укажите длину реза — от неё зависит объёмная корзина.");
        return;
      }

      if (tier === 3) {
        $("#oRate").textContent = rate[2] + " ₽";
        $("#oLen").textContent = nf1.format(len) + " пог.м";
        $("#oTier").textContent = "свыше 1000";
        easeTo(sumEl, shown, Math.round(rate[2] * len), 320);
        shown = Math.round(rate[2] * len);
        setState("partial", "Свыше 1000 пог.м считаем индивидуально. Итог ниже по базовой ставке.");
        return;
      }

      const sum = Math.round(rate[tier] * len);
      $("#oRate").textContent = rate[tier] + " ₽";
      $("#oLen").textContent = nf1.format(len) + " пог.м";
      $("#oTier").textContent = TIERS[tier];
      easeTo(sumEl, shown, sum, 450);
      shown = sum;

      if (sum < 3000) {
        setState("ideal", "Минимальная стоимость заказа — 3000 ₽. Добавьте длины реза.");
      } else {
        setState("ideal", "Ставка и объёмная корзина подставлены из прайса.");
      }
    };

    matSel.addEventListener("change", () => { fillThickness(matSel.value); render(); });
    thSel.addEventListener("change", render);
    lenIn.addEventListener("input", render);

    fillThickness(matSel.value);
    thSel.value = "3";

    /* Состояния отправки: Error → Loading → Ideal */
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const phone = $("#cPhone");
      if (!phone.value.trim()) {
        setState("error", "Оставьте телефон: без него смету не зафиксируем. Введённые значения сохранены.");
        phone.focus();
        return;
      }
      out.setAttribute("data-loading", "1");
      setState("loading", "Готовим PDF со сметой…");
      window.setTimeout(() => {
        out.removeAttribute("data-loading");
        setState("ideal", "Смета зафиксирована. Пришлём на указанный номер в течение 1 часа.");
      }, 900);
    });

    render();
  };

  /* ---------------------------------------------------------------
     5 · Форма заявки — пять состояний (SK-07, Q-13).
  ---------------------------------------------------------------- */
  const initLead = () => {
    const form = $("#leadForm");
    if (!form) return;
    const msg = $("#leadMsg");
    const phone = $("#fPhone");

    const say = (state, text) => {
      msg.setAttribute("data-state", state);
      msg.textContent = text;
    };

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!phone.value.trim()) {
        say("error", "Укажите телефон — иначе не сможем вернуть расчёт в течение 1 часа.");
        phone.focus();
        return;
      }
      say("loading", "Отправляем заявку…");
      window.setTimeout(() => {
        say("ok", "Заявка принята. Перезвоним в рабочее время: Пн–Пт 09:00–18:00.");
        form.reset();
      }, 800);
    });
  };

  const boot = () => {
    initTolerance();
    initRail();
    initCodes();
    initMaterials();
    initCalc();
    initLead();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
