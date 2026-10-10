/* Эвакуатор Москва и Химки · главная
   Движение по реестру motion/recipes (К-05): mask-reveal, cart-assembly, counter-tick.
   Все кривые сверены с motion/easing-curves.json. */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  /* Разбор кривой: точки совпадают с ceh-drag из easing-curves.json. */
  function bezier(p1x, p1y, p2x, p2y) {
    function A(a, b) { return 1 - 3 * b + 3 * a; }
    function B(a, b) { return 3 * b - 6 * a; }
    function C(a) { return 3 * a; }
    function calc(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
    function slope(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
    return function (x) {
      var t = x, i, s, e;
      for (i = 0; i < 8; i += 1) {
        s = slope(t, p1x, p2x);
        if (s === 0) break;
        e = calc(t, p1x, p2x) - x;
        t -= e / s;
      }
      return calc(clamp(t, 0, 1), p1y, p2y);
    };
  }
  var curveDrag = bezier(0.65, 0, 0.15, 1);

  /* --------------------------------------------------- 01 наряд: время и номер */
  var clock = document.querySelector("[data-clock]");
  if (clock) {
    var tick = function () {
      var d = new Date();
      var p = function (n) { return n < 10 ? "0" + n : "" + n; };
      clock.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
    };
    tick();
    window.setInterval(tick, 1000);
  }

  var order = document.querySelector("[data-order]");
  if (order) {
    var now = new Date();
    var pp = function (n) { return n < 10 ? "0" + n : "" + n; };
    order.textContent = "№ " + pp(now.getDate()) + pp(now.getMonth() + 1) + " · 24/7";
  }

  /* --------------------------------------------------- mask-reveal (рецепт 2) */
  var masks = document.querySelectorAll("[data-mask]");
  if (masks.length) {
    if (reduce.matches || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(masks, function (el) { el.classList.add("is-in"); });
    } else {
      var mo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            mo.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -18% 0px", threshold: 0.1 });
      Array.prototype.forEach.call(masks, function (el) { mo.observe(el); });
    }
  }

  /* --------------------------------------------------- cart-assembly (рецепт 1) */
  var lane = document.querySelector("[data-lane]");
  if (lane) {
    var steps = lane.querySelectorAll("[data-step]");
    var marks = [0.1, 0.3, 0.5, 0.7, 0.9];
    var raf = null;

    var paint = function () {
      raf = null;
      var narrow = window.matchMedia("(max-width: 1180px)").matches;
      var p;
      if (reduce.matches || narrow) {
        p = 1;
      } else {
        var box = lane.getBoundingClientRect();
        var span = lane.offsetHeight - window.innerHeight;
        p = span > 0 ? clamp(-box.top / span, 0, 1) : 0;
      }
      lane.style.setProperty("--p", p.toFixed(4));
      Array.prototype.forEach.call(steps, function (li, i) {
        li.classList.toggle("is-hit", p >= marks[i] - 0.001);
      });
    };

    var ask = function () {
      if (raf === null) raf = window.requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    if (reduce.addEventListener) reduce.addEventListener("change", paint);
  }

  /* --------------------------------------------------- индекс-реестр: активный пункт */
  var idxLinks = document.querySelectorAll(".plate__idx a");
  if (idxLinks.length && "IntersectionObserver" in window) {
    var map = {};
    Array.prototype.forEach.call(idxLinks, function (a) {
      var t = document.querySelector(a.getAttribute("href"));
      if (t) map[t.id] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Array.prototype.forEach.call(idxLinks, function (a) { a.removeAttribute("aria-current"); });
        var a = map[entry.target.id];
        if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* --------------------------------------------------- counter-tick (рецепт 3) */
  function counterTick(el, to, ms) {
    if (reduce.matches) {
      el.textContent = to.toLocaleString("ru-RU");
      return;
    }
    var start = null;
    var step = function (ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / ms, 0, 1);
      el.textContent = Math.round(curveDrag(t) * to).toLocaleString("ru-RU");
      if (t < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  /* --------------------------------------------------- диспетчерский подбор выезда */
  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var res = calc.querySelector("[data-res]");
    var msg = calc.querySelector("[data-res-msg]");
    var body = calc.querySelector("[data-res-body]");
    var groups = calc.querySelectorAll("[data-group]");
    var goBtn = calc.querySelector("[data-calc-go]");
    var resetBtn = calc.querySelector("[data-calc-reset]");
    var fleet = calc.querySelector("[data-fleet]");
    var answer = { zone: "", tech: "", cse: "" };
    var busy = null;

    var ZONE = {
      khimki: { name: "Химки", time: "подача от 31 мин", note: "База в мкр-н Клязьма-Старбеево" },
      moscow: { name: "Москва", time: "подача по адресу", note: "Выезд по городу, время зависит от района" },
      obl: { name: "Московская область", time: "подача по договорённости", note: "Выезд по области, возможен междугородний" }
    };
    var TECH = {
      light: { name: "Легковое до 3,5 т", rig: "Сдвижная платформа с лебёдкой" },
      comm: { name: "Коммерческое до 10 т", rig: "Платформа под нагрузку до 10 т" },
      special: { name: "Спецтехника", rig: "Лебёдка и сдвижная платформа" }
    };
    var CASE = {
      break: { name: "Поломка", how: "Закатываем на платформу, колёса фиксируем ремнями" },
      crash: { name: "ДТП", how: "Снимаем с проезжей части и везём на осмотр" },
      relay: { name: "Перегон", how: "Подача ко времени по графику" }
    };

    function setState(state, text, html) {
      res.setAttribute("data-state", state);
      msg.textContent = text;
      if (html === undefined) {
        body.hidden = true;
        body.innerHTML = "";
      } else {
        body.hidden = false;
        body.innerHTML = html;
      }
    }

    function answered() {
      var n = 0;
      if (answer.zone) n += 1;
      if (answer.tech) n += 1;
      if (answer.cse) n += 1;
      return n;
    }

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }

    function row(k, v) {
      return '<span class="res__row"><span>' + esc(k) + "</span><b>" + esc(v) + "</b></span>";
    }

    function renderIdeal() {
      var z = ZONE[answer.zone];
      var t = TECH[answer.tech];
      var c = CASE[answer.cse];
      var html = "";
      html += row("Зона", z.name);
      html += row("Подача", z.time);
      html += row("Техника", t.rig);
      html += row("Ситуация", c.how);
      html += row("Прайс", "подача ко времени 0 ₽");
      html += '<p class="res__price">Срочная подача <span data-tick="5000">0</span> ₽</p>';
      html += '<p class="res__sub">' + esc(z.note) + ". Итог называет диспетчер до выезда.</p>";
      html += '<a class="btn btn--fill btn--block" href="tel:+79771742050" data-analytics-event="evak_podbor_call">Назвать адрес диспетчеру</a>';
      setState("ideal", "Ваш выезд готов:", html);
      var tickEl = body.querySelector("[data-tick]");
      if (tickEl) counterTick(tickEl, 5000, 1200);
    }

    function renderPartial(n) {
      var parts = [];
      if (answer.zone) parts.push(ZONE[answer.zone].name);
      else parts.push("зона не выбрана");
      if (answer.tech) parts.push(TECH[answer.tech].name);
      else parts.push("техника не выбрана");
      if (answer.cse) parts.push(CASE[answer.cse].name);
      else parts.push("ситуация не выбрана");
      var html = row("Зона", answer.zone ? ZONE[answer.zone].name : "нужно выбрать");
      html += row("Техника", answer.tech ? TECH[answer.tech].rig : "нужно выбрать");
      html += row("Ситуация", answer.cse ? CASE[answer.cse].name : "нужно выбрать");
      setState("partial", "Выбрано из трёх: " + n + ". Остальное диспетчер уточнит по телефону.", html);
    }

    function run() {
      var n = answered();
      if (busy) { window.clearTimeout(busy); busy = null; }

      if (n === 0) {
        setState("error", "Данных не хватает: отметьте зону, технику и ситуацию — или позвоните, диспетчер спросит сам.");
        return;
      }

      setState("loading", "Готовим выезд…");

      busy = window.setTimeout(function () {
        busy = null;
        if (n === 3) renderIdeal();
        else renderPartial(n);
      }, reduce.matches ? 0 : 420);
    }

    Array.prototype.forEach.call(groups, function (g) {
      var key = g.getAttribute("data-group") === "case" ? "cse" : g.getAttribute("data-group");
      var btns = g.querySelectorAll(".seg__b");
      Array.prototype.forEach.call(btns, function (b) {
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(btns, function (o) { o.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          answer[key] = b.getAttribute("data-val");
          if (fleet && key === "tech") fleet.setAttribute("data-active", b.getAttribute("data-val"));
          if (res.getAttribute("data-state") !== "empty") {
            setState("empty", "Ответьте на три вопроса — покажем, какой эвакуатор приедет.");
          }
        });
      });
    });

    if (goBtn) goBtn.addEventListener("click", run);
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (busy) { window.clearTimeout(busy); busy = null; }
        answer = { zone: "", tech: "", cse: "" };
        if (fleet) fleet.setAttribute("data-active", "");
        Array.prototype.forEach.call(calc.querySelectorAll(".seg__b"), function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        setState("empty", "Ответьте на три вопроса — покажем, какой эвакуатор приедет.");
      });
    }
  }

  /* --------------------------------------------------- форма обратного звонка */
  var form = document.querySelector("[data-form]");
  if (form) {
    var state = form.querySelector("[data-form-state]");
    var tel = form.querySelector('input[name="tel"]');

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var digits = (tel.value || "").replace(/\D/g, "");
      if (digits.length < 10) {
        tel.setAttribute("aria-invalid", "true");
        state.setAttribute("data-kind", "error");
        state.textContent = "Проверьте номер: нужно не меньше 10 цифр, например +7 977 174-20-50.";
        tel.focus();
        return;
      }
      tel.removeAttribute("aria-invalid");
      state.setAttribute("data-kind", "loading");
      state.textContent = "Отправляем запрос диспетчеру…";

      window.setTimeout(function () {
        state.setAttribute("data-kind", "success");
        state.textContent = "Готово. Диспетчер перезвонит на " + tel.value.trim() + " в течение 2 минут.";
      }, reduce.matches ? 0 : 600);
    });

    tel.addEventListener("input", function () {
      if (tel.getAttribute("aria-invalid") === "true") {
        tel.removeAttribute("aria-invalid");
        state.textContent = "";
        state.removeAttribute("data-kind");
      }
    });
  }

  /* --------------------------------------------------- мобильное меню (гамбургер) */
  var mburger = document.querySelector("[data-menu]");
  var masthead = document.querySelector(".masthead");
  if (mburger && masthead) {
    function menuOpen(open, focusLink) {
      masthead.classList.toggle("is-open", open);
      mburger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && focusLink) {
        var firstLink = masthead.querySelector(".nav a");
        if (firstLink) firstLink.focus({ preventScroll: true });
      }
    }
    mburger.addEventListener("click", function () {
      var open = masthead.classList.contains("is-open");
      menuOpen(!open, !open);
    });
    Array.prototype.forEach.call(masthead.querySelectorAll(".nav a"), function (a) {
      a.addEventListener("click", function () { menuOpen(false, false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") menuOpen(false, false);
    });
    document.addEventListener("click", function (e) {
      if (masthead.classList.contains("is-open") && !masthead.contains(e.target)) menuOpen(false, false);
    });
    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 861px)").matches) menuOpen(false, false);
    });
  }

  /* --------------------------------------------------- кнопка «наверх» после hero */
  var hero = document.querySelector(".act--hero");
  var toTop = document.querySelector("[data-to-top]");
  if (hero && toTop) {
    var setPast = function (past) {
      toTop.classList.toggle("is-on", past);
      if (past) toTop.removeAttribute("aria-hidden");
      else toTop.setAttribute("aria-hidden", "true");
    };
    var pastHero = function () { return hero.getBoundingClientRect().bottom <= 0; };

    setPast(pastHero());
    if ("IntersectionObserver" in window) {
      var heroObs = new IntersectionObserver(function (entries) {
        var e = entries[0];
        setPast(!e.isIntersecting && e.boundingClientRect.bottom <= 0);
      }, { threshold: 0 });
      heroObs.observe(hero);
    } else {
      var heroAsk = function () { setPast(pastHero()); };
      window.addEventListener("scroll", heroAsk, { passive: true });
      window.addEventListener("resize", heroAsk);
    }

    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
      var target = document.getElementById("main");
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
  }
})();
