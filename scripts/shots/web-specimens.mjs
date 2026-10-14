/* ЦЕХ · Метаплатформа — scripts/shots/web-specimens.mjs
   Образцы дизайна веб-студии: один архетип = одно референсное направление из архива.
   Каждый образец — самодостаточная HTML-страница (без внешних файлов и шрифтов),
   которую студия открывает в браузере и снимает в PNG (REF-xx.png).

   Правило архива: образец обязан показывать приёмы из meta.yaml (сетку, типографику,
   движение), а не «красивую картинку вообще». Палитра берётся из meta.palette.

   Архетипы (по стилям референсов):
     editorial-index · poster-type · poster-statement · archive-ledger · brutalist-frames
     dark-hero · minimal-air · catalog-grid · saas-landing · fullpage-sections
     sticky-scene · scroll-cinema · components-sheet · type-specimen · case-story
     concept-grid · premium-refined · heuristics-core · form-states · industrial-passport
     canvas-play
*/

import { FONTS, STAMP_CSS, alpha, esc, mix, page, roles, seeded, stamp, times } from "./kit.mjs";

/** Служебные классы, общие для образцов (сетка, кикеры, линейки, подписи). */
const BASE_CSS = `
${STAMP_CSS}
.wrap{width:min(1440px,100% - 96px);margin:0 auto}
.kicker{font-family:${FONTS.mono};font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--mid)}
.rule{height:1px;background:var(--ink-12);border:0;margin:0}
.meta{font-family:${FONTS.mono};font-size:12px;color:var(--ink-60);letter-spacing:.04em}
.dot{width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.5;mix-blend-mode:multiply;
  background-image:radial-gradient(${alpha("#000000", 0.16)} .5px, transparent .6px);background-size:3px 3px}
.sec-fill{min-height:calc(100vh - 44px);display:flex;flex-direction:column}
`;

/* ─────────────────────────── архетипы ─────────────────────────── */

const T = {};

/* REF-02 · редакционный индекс: проект — строка, а не карточка */
T["editorial-index"] = (p) => `
<header class="ei-head wrap">
  <div class="kicker">Studio Index · 2019—2026</div>
  <h1>Плотный <em>индекс</em> вместо сетки карточек</h1>
  <div class="meta">Работ 148 · Клиентов 63 · Стран 12</div>
</header>
<section class="ei-list">
  ${times(7, (i) => {
    const rows = [
      ["01", "Северный Металл", "Промышленность", "2026"],
      ["02", "Яркая Соль", "Пищевое производство", "2025"],
      ["03", "Ночная Смена", "Логистика", "2025"],
      ["04", "Дом на Складе", "Недвижимость", "2024"],
      ["05", "Тихий Цех", "Мебель", "2024"],
      ["06", "Печь №4", "Металлургия", "2023"],
      ["07", "Сухой Порт", "Транспорт", "2023"],
    ];
    const [num, name, kind, year] = rows[i];
    return `<a class="ei-row${i === 1 ? " is-active" : ""}">
      <span class="ei-num">${esc(num)}</span>
      <span class="ei-name">${esc(name)}</span>
      <span class="ei-kind">${esc(kind)}</span>
      <span class="ei-year">${esc(year)}</span>
      <span class="ei-swatch" style="background:${p.palette[(i % Math.max(1, p.palette.length))] ?? p.accent}"></span>
    </a>`;
  })}
</section>
<footer class="ei-foot wrap">
  <span class="meta">Превью разворачивается на всю ширину при наведении</span>
  <span class="meta">Чёрный / белый + один акцент</span>
</footer>`;

T["editorial-index"].css = `
body{display:flex;flex-direction:column;justify-content:center;min-height:100vh}
.ei-head{padding:54px 0 26px;display:grid;grid-template-columns:1fr auto;align-items:end;gap:24px}
.ei-head h1{margin:14px 0 0;font-family:${FONTS.serif};font-weight:400;font-size:58px;line-height:1.02;letter-spacing:-.02em;grid-column:1}
.ei-head h1 em{font-style:italic;color:var(--accent)}
.ei-head .meta{grid-column:2;text-align:right;align-self:end}
.ei-list{border-top:1px solid var(--ink-12)}
.ei-row{display:grid;grid-template-columns:74px 1fr 260px 90px 46px;align-items:center;gap:22px;
  padding:17px 48px;border-bottom:1px solid var(--ink-12);text-decoration:none;color:inherit;position:relative;transition:background .18s}
.ei-row:hover,.ei-row.is-active{background:var(--ink-06)}
.ei-row.is-active::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent)}
.ei-num{font-family:${FONTS.mono};font-size:13px;color:var(--ink-38)}
.ei-name{font-family:${FONTS.serif};font-size:40px;line-height:1;letter-spacing:-.01em}
.ei-kind{font-size:14px;color:var(--ink-60)}
.ei-year{font-family:${FONTS.mono};font-size:13px;color:var(--ink-60);text-align:right}
.ei-swatch{width:46px;height:30px}
.ei-foot{display:flex;justify-content:space-between;padding:18px 0 60px}
`;

/* REF-05/13 · плакатная типографика: заголовок работает как изображение */
T["poster-type"] = (p) => `
<div class="pt-wrap">
  <div class="pt-side kicker">Плакат · набор в две строки<br>Кегль до 10vw · перенос по смыслу</div>
  <h1 class="pt-h1"><span>ТИХАЯ</span><span class="pt-row2">МЕТАЛЛУРГИЯ</span></h1>
  <div class="pt-grid">
    <p class="pt-lead">Мы строим сайты, где текст несёт форму: кегль, вес и паузы заменяют любые картинки.</p>
    <ul class="pt-list">
      <li><span>01</span> Размер до 10vw</li>
      <li><span>02</span> Перенос по смыслу</li>
      <li><span>03</span> Один акцент на плакат</li>
    </ul>
    <div class="pt-mark">ЦЕХ<span>®</span></div>
  </div>
</div>`;

T["poster-type"].css = `
body{overflow:hidden}
.pt-wrap{height:calc(100vh - 44px);padding:52px 64px;display:grid;grid-template-rows:auto 1fr auto;position:relative}
.pt-side{text-align:right;line-height:1.7}
.pt-h1{margin:auto 0;font-family:${FONTS.condensed};font-weight:700;font-size:12.2vw;line-height:.86;
  letter-spacing:-.035em;text-transform:uppercase;display:flex;flex-direction:column}
.pt-h1 span{display:block}
.pt-row2{color:transparent;-webkit-text-stroke:2px var(--ink);margin-left:4vw}
.pt-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;align-items:end;gap:48px;border-top:1px solid var(--ink-12);padding-top:24px}
.pt-lead{margin:0;font-size:19px;line-height:1.45;max-width:44ch;color:var(--ink-87)}
.pt-list{list-style:none;margin:0;padding:0;font-family:${FONTS.mono};font-size:13px;color:var(--ink-60)}
.pt-list li{display:flex;gap:12px;padding:5px 0;border-bottom:1px solid var(--ink-06)}
.pt-list span{color:var(--accent)}
.pt-mark{font-family:${FONTS.condensed};font-weight:700;font-size:52px;text-align:right;letter-spacing:-.03em}
.pt-mark span{color:var(--accent);font-size:18px;vertical-align:super}
`;

/* REF-03 · один тезис — один экран; иллюстрация продолжает фразу */
T["poster-statement"] = (p) => `
<div class="ps-screen">
  <div class="ps-ill" aria-hidden="true">
    ${times(9, (i) => `<span style="--i:${i}"></span>`)}
  </div>
  <div class="ps-copy">
    <div class="kicker">Тезис 03 / 08</div>
    <h1>Сроки сорвались<br>не у подрядчика,<br><em>а у брифа.</em></h1>
    <p>Один экран — один смысл. Иллюстрация продолжает фразу: девять слоёв графика, как девять недель проекта.</p>
    <div class="ps-nav"><span class="dot"></span><span class="meta">Скролл · следующий тезис</span></div>
  </div>
</div>`;

T["poster-statement"].css = `
.ps-screen{height:calc(100vh - 44px);display:grid;grid-template-columns:1fr 1.05fr}
.ps-ill{position:relative;background:var(--deep);overflow:hidden}
.ps-ill span{position:absolute;left:50%;top:50%;border:1px solid ${alpha("#ffffff", 0.18)};border-radius:50%;
  width:calc(120px + var(--i) * 92px);height:calc(120px + var(--i) * 92px);transform:translate(-50%,-50%);
  background:radial-gradient(circle at 50% 50%, ${alpha("#ffffff", 0.04)}, transparent 62%)}
.ps-ill span:nth-child(3),.ps-ill span:nth-child(7){border-color:var(--accent);border-width:2px}
.ps-copy{padding:76px 72px;display:flex;flex-direction:column;justify-content:center;gap:26px}
.ps-copy h1{margin:0;font-size:62px;line-height:1.04;letter-spacing:-.025em;font-weight:600}
.ps-copy h1 em{font-style:normal;color:var(--accent)}
.ps-copy p{margin:0;max-width:46ch;font-size:18px;line-height:1.6;color:var(--ink-60)}
.ps-nav{display:flex;align-items:center;gap:12px;margin-top:12px}
`;

/* REF-06 · архив-реестр: живёт плотностью записей */
T["archive-ledger"] = (p) => `
<header class="al-head">
  <div>
    <div class="kicker">Реестр наборов</div>
    <h1>АРХИВ ШРИФТОВ</h1>
  </div>
  <div class="al-filters">
    <span class="is-on">Все</span><span>Гротеск</span><span>Антиква</span><span>Моно</span><span>Акцидентный</span>
  </div>
</header>
<div class="al-table">
  <div class="al-tr al-th">
    <span>№</span><span>Гарнитура</span><span>Образец</span><span>Начертаний</span><span>Год</span><span>Автор</span>
  </div>
  ${times(10, (i) => {
    const rows = [
      ["0142", "Плакат Грот", "Аа Бб Вв 0123", "6", "2024", "Литейная №4"],
      ["0141", "Тяжёлый Шрифт", "Аа Бб Вв 0123", "3", "2024", "Цех"],
      ["0139", "Сухая Антиква", "Аа Бб Вв 0123", "9", "2023", "Д. Лукин"],
      ["0138", "Ночной Моно", "Аа Бб Вв 0123", "2", "2023", "Типография С"],
      ["0136", "Промышленный", "Аа Бб Вв 0123", "5", "2022", "Литейная №4"],
      ["0135", "Широкий Курсив", "Аа Бб Вв 0123", "4", "2022", "А. Решет"],
      ["0133", "Северный", "Аа Бб Вв 0123", "7", "2021", "Цех"],
      ["0132", "Мелкий Текст", "Аа Бб Вв 0123", "3", "2021", "М. Сто"],
      ["0130", "Карточный", "Аа Бб Вв 0123", "4", "2020", "Литейная №1"],
      ["0129", "Табличный", "Аа Бб Вв 0123", "2", "2020", "Цех"],
    ];
    const [id, name, sample, weights, year, author] = rows[i];
    return `<div class="al-tr">
      <span class="al-id">${esc(id)}</span>
      <span class="al-name">${esc(name)}</span>
      <span class="al-sample" style="font-${i % 3 === 0 ? "family:" + FONTS.serif + ";font-style:italic" : i % 3 === 1 ? "weight:700" : "family:" + FONTS.mono}">${esc(sample)}</span>
      <span class="meta">${esc(weights)}</span>
      <span class="meta">${esc(year)}</span>
      <span class="meta">${esc(author)}</span>
    </div>`;
  })}
</div>`;

T["archive-ledger"].css = `
body{font-family:${FONTS.mono}}
.al-head{display:flex;justify-content:space-between;align-items:flex-end;padding:40px 48px 20px;gap:24px}
.al-head h1{margin:10px 0 0;font-family:${FONTS.system};font-size:44px;letter-spacing:-.02em}
.al-filters{display:flex;gap:8px;font-size:12px}
.al-filters span{padding:6px 12px;border:1px solid var(--ink-12)}
.al-filters .is-on{background:var(--deep);color:var(--light);border-color:var(--deep)}
.al-table{border-top:1px solid var(--ink);font-size:13px}
.al-tr{display:grid;grid-template-columns:90px 240px 1fr 130px 90px 190px;gap:20px;align-items:center;
  padding:11px 48px;border-bottom:1px solid var(--ink-12)}
.al-tr:nth-child(even){background:var(--ink-06)}
.al-th{background:var(--deep)!important;color:var(--light);font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:9px 48px}
.al-id{color:var(--accent);font-weight:700}
.al-name{font-family:${FONTS.system};font-size:19px}
.al-sample{font-size:20px}
`;

/* REF-09 · брутализм: честная конструкция сильнее украшения */
T["brutalist-frames"] = (p) => `
<div class="bf-frame">
  <div class="bf-row bf-top">
    <span class="bf-tag">BRUTALIST / RAW</span>
    <span class="bf-tag">FRAMES · SLABS · SYSTEM FONT</span>
    <span class="bf-tag bf-accent">SIGNAL</span>
  </div>
  <div class="bf-main">
    <h1>ЧЕСТНАЯ<br>КОНСТРУКЦИЯ</h1>
    <div class="bf-side">
      <div class="bf-slab"><b>01</b> Рамки вместо теней: граница честно показывает, где кончается блок.</div>
      <div class="bf-slab"><b>02</b> Плашки-подложки держат контраст без скруглений и градиентов.</div>
      <div class="bf-slab bf-slab--accent"><b>03</b> Цвет — одна сигнальная деталь, всё остальное ч/б.</div>
    </div>
  </div>
  <div class="bf-strip">
    ${times(12, (i) => `<span${i === 4 ? ' class="is-accent"' : ""}>${String(1000 + i * 7)}</span>`)}
  </div>
</div>`;

T["brutalist-frames"].css = `
body{font-family:${FONTS.mono};padding:24px}
.bf-frame{border:3px solid var(--ink);height:calc(100vh - 92px);display:grid;grid-template-rows:auto 1fr auto}
.bf-row{display:flex;border-bottom:3px solid var(--ink)}
.bf-tag{flex:1;padding:10px 14px;font-size:11px;letter-spacing:.14em;border-right:3px solid var(--ink)}
.bf-tag:last-child{border-right:0}
.bf-accent{background:var(--accent);color:var(--bg)}
.bf-main{display:grid;grid-template-columns:1.25fr 1fr}
.bf-main h1{margin:0;font-family:${FONTS.system};font-weight:800;font-size:clamp(48px,7vw,104px);line-height:.9;
  letter-spacing:-.04em;padding:40px 32px;border-right:3px solid var(--ink);display:flex;align-items:flex-end}
.bf-side{display:grid;grid-template-rows:repeat(3,1fr)}
.bf-slab{padding:22px 24px;font-size:14px;line-height:1.5;border-bottom:3px solid var(--ink);display:flex;gap:16px;align-items:flex-start}
.bf-slab:last-child{border-bottom:0}
.bf-slab b{font-family:${FONTS.system};font-size:26px;color:var(--accent)}
.bf-slab--accent{border-left:10px solid var(--accent);background:var(--ink-06)}
.bf-slab--accent b{color:var(--accent)}
.bf-strip{display:flex;border-top:3px solid var(--ink);font-family:${FONTS.system};font-weight:700;font-size:26px}
.bf-strip span{flex:1;padding:8px 0;text-align:center;border-right:2px solid var(--ink)}
.bf-strip span:last-child{border-right:0}
.bf-strip .is-accent{background:var(--accent);color:var(--bg)}
`;

/* REF-10 · тёмная тема: фон не «звенит», иерархия прозрачностью */
T["dark-hero"] = (p) => `
<div class="dh">
  <header class="dh-nav">
    <span class="dh-logo">НОЧНАЯ СМЕНА</span>
    <nav>${["Продукт", "Метод", "Кейсы", "Тарифы"].map((x) => `<a>${x}</a>`).join("")}</nav>
    <span class="dh-cta">Запросить доступ</span>
  </header>
  <section class="dh-hero">
    <div>
      <div class="kicker">Логистика 24/7</div>
      <h1>Склад, который<br>не спит</h1>
      <p>Ночная смена видит остатки, маршруты и потери в одном контуре. Данные обновляются каждые 30 секунд.</p>
      <div class="dh-actions"><span class="dh-btn">Начать пилот</span><span class="dh-ghost">Смотреть 2 мин</span></div>
    </div>
    <div class="dh-panel">
      <div class="dh-panel__row"><span class="meta">Остатки</span><b>18 402</b></div>
      <div class="dh-bars">${times(14, (i) => `<i style="--h:${26 + ((i * 37) % 64)}%"></i>`)}</div>
      <div class="dh-panel__foot"><span class="meta">Потери за смену</span><b class="dh-good">−12,4%</b></div>
    </div>
  </section>
</div>`;

T["dark-hero"].css = `
.dh{height:calc(100vh - 44px);display:flex;flex-direction:column}
.dh-nav{display:flex;align-items:center;justify-content:space-between;padding:22px 48px;border-bottom:1px solid var(--ink-12)}
.dh-logo{font-weight:700;letter-spacing:.08em;font-size:13px}
.dh-nav nav{display:flex;gap:26px;font-size:14px;color:var(--ink-60)}
.dh-cta{padding:9px 16px;background:var(--accent);color:var(--bg);font-size:13px;font-weight:600}
.dh-hero{flex:1;display:grid;grid-template-columns:1.15fr .85fr;gap:60px;align-items:center;padding:0 48px}
.dh-hero h1{margin:16px 0 18px;font-size:76px;line-height:1.03;letter-spacing:-.03em;font-weight:600}
.dh-hero p{margin:0 0 30px;max-width:42ch;font-size:17px;line-height:1.65;color:var(--ink-60)}
.dh-actions{display:flex;gap:14px;align-items:center}
.dh-btn{padding:13px 24px;background:var(--ink);color:var(--bg);font-weight:600;font-size:15px}
.dh-ghost{padding:13px 22px;border:1px solid var(--ink-12);font-size:15px;color:var(--ink-87)}
.dh-panel{border:1px solid var(--ink-12);background:var(--ink-06);padding:26px}
.dh-panel__row,.dh-panel__foot{display:flex;justify-content:space-between;align-items:baseline}
.dh-panel__row b{font-size:38px;font-weight:600;letter-spacing:-.02em}
.dh-panel__foot{border-top:1px solid var(--ink-12);padding-top:14px;margin-top:18px}
.dh-panel__foot b{font-size:22px}
.dh-good{color:var(--accent)}
.dh-bars{display:flex;align-items:flex-end;gap:6px;height:200px;margin:22px 0;position:relative;
  border-bottom:1px solid var(--ink-12);border-top:1px solid var(--ink-12);padding-top:6px}
.dh-bars i{flex:1;height:var(--h);background:${alpha("#ffffff", 0.16)};border-radius:2px 2px 0 0}
.dh-bars i:nth-child(3n){background:var(--accent);opacity:.9}
`;

/* REF-08 · минимализм: один акцент на пустом фоне */
T["minimal-air"] = (p) => `
<div class="ma">
  <div class="ma-top kicker">Мастерская · СПб</div>
  <h1>Делаем<br><em>одну</em> вещь<br>хорошо</h1>
  <div class="ma-bottom">
    <p>Столярная мастерская с 2011 года. Серии по 12 предметов, каждая — из одного массива.</p>
    <div class="ma-mark"><span class="dot"></span><span class="meta">Каталог · Проекты · Контакты</span></div>
  </div>
</div>`;

T["minimal-air"].css = `
.ma{height:calc(100vh - 44px);padding:64px 96px;display:grid;grid-template-rows:auto 1fr auto}
.ma-top{text-align:right}
.ma h1{margin:auto 0;font-family:${FONTS.serif};font-weight:400;font-size:clamp(64px,8vw,124px);line-height:1.02;letter-spacing:-.02em}
.ma h1 em{font-style:italic;color:var(--accent)}
.ma-bottom{display:flex;justify-content:space-between;align-items:flex-end;gap:60px}
.ma-bottom p{margin:0;max-width:38ch;font-size:17px;line-height:1.7;color:var(--ink-60)}
.ma-mark{display:flex;align-items:center;gap:12px}
`;

/* REF-11 · каталог: плотность карточек и корзина на виду */
T["catalog-grid"] = (p) => `
<header class="cg-head">
  <span class="cg-logo">СУХОЙ СКЛАД</span>
  <div class="cg-filters">${["Все", "Котлы", "Насосы", "Автоматика", "Фитинги"].map((x, i) => `<span${i === 2 ? ' class="is-on"' : ""}>${x}</span>`).join("")}</div>
  <span class="cg-cart">Корзина · 3<span class="meta">18 400 ₽</span></span>
</header>
<section class="cg-grid" style="flex:1">
  ${times(8, (i) => {
    const items = [
      ["Котёл КВ-240", "240 кВт · газ", "184 000"],
      ["Насос ЦН-90", "90 м³/ч · чугун", "42 400"],
      ["Щит АВР-4", "4 линии · IP54", "31 900"],
      ["Клапан ДН-50", "сталь · фланец", "8 700"],
      ["Горелка Г-7", "7 МВт · модуляция", "96 000"],
      ["Термометр Т-4", "0—150 °C", "2 300"],
      ["Бак Р-2000", "2 м³ · эмаль", "54 000"],
      ["Датчик Д-2", "давление · 4—20 мА", "6 100"],
    ];
    const [name, spec, price] = items[i];
    return `<article class="cg-card">
      <div class="cg-photo" style="--tone:${p.palette[i % p.palette.length]}">
        <div class="grain"></div>
        <span class="cg-badge">в наличии</span>
      </div>
      <h3>${esc(name)}</h3>
      <span class="meta">${esc(spec)}</span>
      <div class="cg-buy"><b>${esc(price)} ₽</b><span class="cg-add">В корзину</span></div>
    </article>`;
  })}
</section>`;

T["catalog-grid"].css = `
body{display:flex;flex-direction:column;height:100vh}
.cg-head{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:1px solid var(--ink-12);gap:30px}
.cg-logo{font-weight:800;letter-spacing:.06em}
.cg-filters{display:flex;gap:6px;font-size:13px;color:var(--ink-60)}
.cg-filters span{padding:6px 12px;border:1px solid var(--ink-12)}
.cg-filters .is-on{background:var(--deep);color:var(--light);border-color:var(--deep)}
.cg-cart{display:flex;align-items:baseline;gap:10px;font-size:14px;font-weight:600}
.cg-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;gap:1px;background:var(--ink-12);margin-top:1px}
.cg-card{background:var(--bg);padding:18px;display:flex;flex-direction:column;gap:8px}
.cg-photo{position:relative;flex:1;min-height:118px;background:var(--tone);overflow:hidden}
.cg-photo::after{content:"";position:absolute;inset:16px;border:1px solid ${alpha("#000000", 0.14)}}
.cg-badge{position:absolute;left:10px;bottom:10px;background:var(--bg);font-family:${FONTS.mono};font-size:10px;
  letter-spacing:.1em;text-transform:uppercase;padding:4px 8px;color:var(--ink)}
.cg-card h3{margin:6px 0 0;font-size:17px;font-weight:600}
.cg-buy{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;border-top:1px solid var(--ink-06)}
.cg-buy b{font-size:19px}
.cg-add{font-size:12px;padding:7px 12px;background:var(--accent);color:var(--bg);font-weight:600}
`;

/* REF-12 · SaaS-лендинг: одно обещание и доказательство цифрами */
T["saas-landing"] = (p) => `
<section class="sl-hero">
  <div class="kicker">Платформа ремонтов</div>
  <h1>Простой заканчивается<br>за 40 минут</h1>
  <p>Диспетчер видит заявки, бригады и склад в одном окне. Средний отклик по парку — 38 минут.</p>
  <div class="sl-form"><span class="sl-input">Рабочая почта</span><span class="sl-submit">Показать демо</span></div>
  <div class="sl-stats">
    ${[["38 мин", "средний отклик"], ["−27%", "простоев"], ["1 240", "заявок в сутки"], ["98,2%", "в срок"]]
      .map(([v, k]) => `<div class="sl-stat"><b>${v}</b><span class="meta">${k}</span></div>`)
      .join("")}
  </div>
</section>
<section class="sl-features" style="flex:1">
  ${[["Заявка", "Приём из телефонии, почты и Telegram — одна очередь"],
    ["Бригада", "Маршрут на день с учётом пробок и допусков"],
    ["Склад", "Списание по факту, а не по ведомости"]]
    .map(([t, d], i) => `<div class="sl-feature"><span class="sl-num">0${i + 1}</span><h3>${t}</h3><p>${d}</p></div>`)
    .join("")}
</section>`;

T["saas-landing"].css = `
body{display:flex;flex-direction:column;height:100vh}
.sl-hero{padding:64px 96px 40px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
.sl-hero h1{margin:6px 0 0;font-size:70px;line-height:1.02;letter-spacing:-.035em;font-weight:600}
.sl-hero p{margin:0;max-width:56ch;font-size:18px;line-height:1.6;color:var(--ink-60)}
.sl-form{display:flex;gap:8px;margin-top:10px}
.sl-input{padding:14px 18px;min-width:280px;border:1px solid var(--ink-12);color:var(--ink-38);text-align:left;font-size:15px}
.sl-submit{padding:14px 24px;background:var(--ink);color:var(--bg);font-weight:600;font-size:15px}
.sl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--ink-12);margin-top:34px;width:100%;border:1px solid var(--ink-12)}
.sl-stat{background:var(--bg);padding:20px 24px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.sl-stat b{font-size:34px;letter-spacing:-.02em}
.sl-features{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--ink-12);border-top:1px solid var(--ink-12)}
.sl-feature{background:var(--bg);padding:30px 34px;display:flex;flex-direction:column;gap:10px;justify-content:center}
.sl-num{font-family:${FONTS.mono};font-size:12px;color:var(--accent)}
.sl-feature h3{margin:0;font-size:21px}
.sl-feature p{margin:0;color:var(--ink-60);line-height:1.6;font-size:15px}
`;

/* REF-16 · одностраничник из полноэкранных секций с якорями */
T["fullpage-sections"] = (p) => `
<nav class="fp-nav">
  <span class="fp-brand">ПЕЧЬ №4</span>
  <span class="fp-links">${["Цех", "Технология", "Объекты", "Контакты"].map((x, i) => `<a${i === 0 ? ' class="is-on"' : ""}>${x}</a>`).join("")}</span>
  <span class="meta">RU / EN</span>
</nav>
<section class="fp-sec fp-a">
  <div class="fp-inner">
    <span class="kicker">Секция 01 · Цех</span>
    <h2>Металл помнит<br>каждую смену</h2>
    <span class="fp-hint">↓ якорь «Технология»</span>
  </div>
  <div class="fp-ill"><div class="grain"></div>${times(5, (i) => `<i style="--i:${i}"></i>`)}</div>
</section>
<section class="fp-sec fp-b">
  <div class="fp-inner"><span class="kicker">Секция 02 · Технология</span><h2>Плавка, прокат,<br>контроль</h2></div>
  <div class="fp-rows">${["Плавка · 1 480 °C", "Прокат · 12 клетей", "Контроль · 100% партии", "Отгрузка · 24 часа"].map((x) => `<span>${x}</span>`).join("")}</div>
</section>`;

T["fullpage-sections"].css = `
.fp-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 42px;border-bottom:1px solid var(--ink-12)}
.fp-brand{font-weight:800;letter-spacing:.1em}
.fp-links{display:flex;gap:22px;font-size:14px;color:var(--ink-60)}
.fp-links .is-on{color:var(--ink);border-bottom:2px solid var(--accent);padding-bottom:4px}
.fp-sec{height:calc(50vh - 44px);min-height:300px;display:grid;grid-template-columns:1.1fr .9fr;border-bottom:1px solid var(--ink-12)}
.fp-inner{padding:34px 48px;display:flex;flex-direction:column;justify-content:center;gap:14px}
.fp-inner h2{margin:0;font-size:50px;line-height:1.04;letter-spacing:-.03em}
.fp-hint{align-self:flex-start;font-family:${FONTS.mono};font-size:11px;color:var(--accent);letter-spacing:.08em}
.fp-ill{position:relative;background:var(--deep);overflow:hidden}
.fp-ill i{position:absolute;left:calc(8% + var(--i) * 17%);bottom:0;width:34px;height:calc(30% + var(--i) * 14%);
  background:${alpha("#ffffff", 0.12)}}
.fp-ill i:last-child{background:var(--accent)}
.fp-b{grid-template-columns:1fr 1fr;align-items:stretch}
.fp-rows{display:grid;grid-template-rows:repeat(4,1fr);border-left:1px solid var(--ink-12)}
.fp-rows span{display:flex;align-items:center;padding:0 34px;border-bottom:1px solid var(--ink-12);font-family:${FONTS.mono};font-size:14px;color:var(--ink-87)}
.fp-rows span:last-child{border-bottom:0;color:var(--accent)}
`;

/* REF-01/14 · сцена закреплена, состояние меняется по шагам текста */
T["sticky-scene"] = (p) => `
<div class="ss">
  <div class="ss-stage">
    <div class="ss-frame">
      <div class="ss-layers">
        ${times(4, (i) => `<div class="ss-layer" style="--i:${i};--tone:${p.palette[i % p.palette.length]}"><span>${["заготовка", "нагрев", "прокат", "контроль"][i]}</span></div>`)}
      </div>
      <div class="ss-caption"><span class="meta">Кадр 3 из 8 · 00:12</span></div>
    </div>
    <div class="ss-rail"><i></i>${times(7, () => "<i></i>")}</div>
  </div>
  <ol class="ss-steps">
    ${[["01", "Гудок", "Смена начинается в 06:40 — фиксируем плавку"],
      ["02", "Прокат", "Клеть №7 даёт допуск 0,08 мм"],
      ["03", "Контроль", "Ультразвук находит дефект до отгрузки"],
      ["04", "Смена сдана", "Наряд закрыт, метрика в отчёте"]]
      .map(([n, t, d], i) => `<li${i === 2 ? ' class="is-on"' : ""}><span class="ss-num">${n}</span><div><h3>${t}</h3><p>${d}</p></div></li>`)
      .join("")}
  </ol>
</div>`;

T["sticky-scene"].css = `
.ss{height:calc(100vh - 44px);display:grid;grid-template-columns:1.08fr .92fr}
.ss-stage{position:relative;background:var(--deep);display:flex;flex-direction:column;justify-content:center;padding:44px}
.ss-frame{position:relative;aspect-ratio:16/10;background:${alpha("#ffffff", 0.04)};border:1px solid ${alpha("#ffffff", 0.18)};overflow:hidden}
.ss-layers{position:absolute;inset:0;display:flex;align-items:flex-end;gap:12px;padding:22px}
.ss-layer{flex:1;height:calc(24% + var(--i) * 19%);background:var(--tone);position:relative}
.ss-layer span{position:absolute;left:6px;bottom:6px;font-family:${FONTS.mono};font-size:10px;color:${alpha("#000000", 0.55)}}
.ss-caption{position:absolute;right:12px;top:12px}
.ss-rail{display:flex;gap:6px;margin-top:18px}
.ss-rail i{flex:1;height:3px;background:${alpha("#ffffff", 0.18)}}
.ss-rail i:first-child,.ss-rail i:nth-child(2),.ss-rail i:nth-child(3){background:var(--accent)}
.ss-steps{list-style:none;margin:0;padding:58px 60px;display:flex;flex-direction:column;justify-content:center;gap:8px}
.ss-steps li{display:flex;gap:20px;padding:20px 0;border-bottom:1px solid var(--ink-12);opacity:.42;transition:opacity .2s}
.ss-steps li.is-on{opacity:1}
.ss-num{font-family:${FONTS.mono};font-size:12px;color:var(--accent);padding-top:6px}
.ss-steps h3{margin:0 0 6px;font-size:26px;letter-spacing:-.01em}
.ss-steps p{margin:0;font-size:15px;line-height:1.6;color:var(--ink-60)}
.ss-steps li.is-on p{color:var(--ink-87)}
`;

/* REF-14 · анимация по скроллу: на шаг текста — одно движение */
T["scroll-cinema"] = (p) => `
<div class="sc">
  <header class="sc-head">
    <span class="kicker">Кинозаставка</span>
    <h1>Тайтл, который<br>раскрывается по скроллу</h1>
  </header>
  <div class="sc-track">
    ${times(3, (i) => `<figure class="sc-shot" style="--i:${i}">
      <div class="sc-img" style="--tone:${p.palette[(i + 1) % p.palette.length]}"><div class="grain"></div></div>
      <figcaption><b>0${i + 1}</b><span class="meta">${["Появление", "Сборка", "Финал"][i]} · одно движение за шаг</span></figcaption>
    </figure>`)}
  </div>
  <footer class="sc-foot">
    <div class="meta">Таймлайн: 8 шагов · scrub по скроллу</div>
    <div class="sc-tl">${times(8, (i) => `<i${i < 3 ? ' class="is-on"' : ""}></i>`)}</div>
  </footer>
</div>`;

T["scroll-cinema"].css = `
body{background:var(--bg)}
.sc{height:calc(100vh - 44px);padding:40px 56px;display:flex;flex-direction:column;gap:26px}
.sc-head h1{margin:12px 0 0;font-size:38px;line-height:1.06;letter-spacing:-.03em;font-weight:600}
.sc-track{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.sc-shot{margin:0;display:flex;flex-direction:column;gap:12px}
.sc-img{flex:1;background:var(--tone);position:relative;overflow:hidden;border:1px solid var(--ink-12)}
.sc-img::after{content:"";position:absolute;inset:auto 12% 12% auto;width:38%;height:38%;background:var(--ink);opacity:.14}
.sc-shot:first-child .sc-img{transform:translateY(0)}
.sc-shot:nth-child(2) .sc-img{margin-top:16px}
.sc-shot:nth-child(3) .sc-img{margin-top:32px}
.sc-shot figcaption{display:flex;align-items:baseline;gap:10px}
.sc-shot b{font-family:${FONTS.mono};color:var(--accent)}
.sc-foot{display:flex;justify-content:space-between;align-items:center;gap:30px}
.sc-tl{display:flex;gap:6px;flex:1;max-width:520px}
.sc-tl i{flex:1;height:4px;background:var(--ink-12)}
.sc-tl i.is-on{background:var(--accent)}
`;

/* REF-15 · UI-кит: компонент ясен без подписи, состояния видны */
T["components-sheet"] = (p) => `
<div class="cs">
  <header class="cs-head">
    <div><div class="kicker">UI-кит</div><h1>Компоненты и состояния</h1></div>
    <div class="meta">Токены · 12 цветов · 4 радиуса · 3 тени</div>
  </header>
  <div class="cs-grid">
    <div class="cs-cell">
      <span class="cs-label">Кнопки</span>
      <div class="cs-row"><span class="b b--primary">Сохранить</span><span class="b b--ghost">Отмена</span><span class="b b--danger">Удалить</span><span class="b b--disabled">Недоступно</span></div>
      <div class="cs-row"><span class="b b--primary is-focus">Фокус</span><span class="b b--primary is-loading">Загрузка…</span><span class="b b--ghost is-hover">Наведение</span></div>
    </div>
    <div class="cs-cell">
      <span class="cs-label">Поля</span>
      <div class="cs-row cs-col"><label class="f"><span>Почта</span><i class="f__box">ivan@zavod.ru</i></label>
      <label class="f f--error"><span>Телефон</span><i class="f__box">+7 ___ ___-__-__</i><em>Не хватает двух цифр</em></label></div>
    </div>
    <div class="cs-cell">
      <span class="cs-label">Состояния экрана</span>
      <div class="cs-states">
        <div class="st st--empty"><b>Пусто</b><span>Заявок пока нет</span><span class="b b--ghost">Создать заявку</span></div>
        <div class="st st--loading"><b>Загрузка</b><i></i><i></i><i></i></div>
      </div>
    </div>
    <div class="cs-cell">
      <span class="cs-label">Отклик</span>
      <div class="cs-toggle"><span class="is-on">Смена</span><span>Неделя</span><span>Месяц</span></div>
      <div class="cs-progress"><i style="--w:68%"></i></div>
      <span class="meta">68% плана · обновлено 2 с назад</span>
    </div>
  </div>
</div>`;

T["components-sheet"].css = `
.cs{padding:38px 48px;display:flex;flex-direction:column;gap:24px;height:calc(100vh - 44px)}
.cs-head{display:flex;justify-content:space-between;align-items:flex-end}
.cs-head h1{margin:10px 0 0;font-size:36px;letter-spacing:-.02em}
.cs-grid{flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1px;background:var(--ink-12);border:1px solid var(--ink-12)}
.cs-cell{background:var(--bg);padding:22px 24px;display:flex;flex-direction:column;gap:14px}
.cs-label{font-family:${FONTS.mono};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-38)}
.cs-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.cs-col{flex-direction:column;align-items:stretch}
.b{padding:9px 15px;font-size:14px;font-weight:600;border:1px solid transparent}
.b--primary{background:var(--deep);color:var(--light)}
.b--ghost{border-color:var(--ink-12);color:var(--ink-87)}
.b--danger{background:var(--accent);color:var(--bg)}
.b--disabled{background:var(--ink-06);color:var(--ink-38)}
.b--primary.is-focus{outline:3px solid var(--accent);outline-offset:2px}
.b--primary.is-loading{opacity:.72}
.b--ghost.is-hover{background:var(--ink-06)}
.f{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--ink-60)}
.f__box{border:1px solid var(--ink-12);padding:10px 13px;font-style:normal;color:var(--ink);background:var(--bg)}
.f--error .f__box{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.f--error em{color:var(--accent);font-style:normal}
.cs-states{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.st{border:1px dashed var(--ink-12);padding:16px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;font-size:13px;color:var(--ink-60)}
.st b{color:var(--ink);font-size:15px}
.st--loading i{width:100%;height:8px;background:var(--ink-06)}
.st--loading i:nth-child(2){width:78%}
.st--loading i:nth-child(3){width:52%}
.cs-toggle{display:inline-flex;border:1px solid var(--ink-12);font-size:13px;align-self:flex-start}
.cs-toggle span{padding:8px 14px;color:var(--ink-60)}
.cs-toggle .is-on{background:var(--ink);color:var(--bg)}
.cs-progress{height:10px;background:var(--ink-06);position:relative}
.cs-progress i{position:absolute;inset:0 auto 0 0;width:var(--w);background:var(--accent)}
`;

/* REF-13 · типографический образец: игра весов вместо картинок */
T["type-specimen"] = (p) => `
<div class="ts">
  <div class="ts-col ts-left">
    <div class="kicker">Гарнитура · Цех Грот</div>
    <div class="ts-weights">
      ${["Thin 100", "Regular 400", "Medium 500", "Bold 700", "Black 900"].map((w, i) => `<span style="font-weight:${[100, 400, 500, 700, 900][i]}">Aa</span><span class="meta">${w}</span>`).join("")}
    </div>
  </div>
  <div class="ts-col ts-main">
    <h1>Aa</h1>
    <div class="ts-alphabet">АБВГДЕЖЗИКЛМНОПРСТУФ<br>абвгдежзиклмнопрстуф<br>0123456789 — « » № % ₽</div>
  </div>
  <div class="ts-col ts-right">
    <div class="ts-spec"><span class="meta">Кегль</span><b>10vw</b><span class="meta">Интерлиньяж</span><b>0.94</b>
      <span class="meta">Трекинг</span><b>−3,5%</b><span class="meta">Перенос</span><b>по смыслу</b></div>
    <div class="ts-quote">«Типографика — это дизайн. Размер и вес заменяют любые картинки.»</div>
  </div>
</div>`;

T["type-specimen"].css = `
body{display:flex}
.ts{flex:1;height:calc(100vh - 44px);display:grid;grid-template-columns:260px 1fr 320px}
.ts-col{padding:36px 32px;border-right:1px solid var(--ink-12)}
.ts-right{border-right:0;border-left:1px solid var(--ink-12);display:flex;flex-direction:column;justify-content:space-between}
.ts-weights{display:grid;grid-template-columns:1fr 1fr;gap:18px 10px;margin-top:24px;align-items:baseline}
.ts-weights span:first-child{font-size:44px;line-height:1}
.ts-weights span:first-child:nth-of-type(odd){color:var(--accent)}
.ts-main{display:flex;flex-direction:column;justify-content:center;gap:18px}
.ts-main h1{margin:0;font-size:min(38vh,340px);line-height:.8;letter-spacing:-.06em;font-weight:800}
.ts-alphabet{font-family:${FONTS.mono};font-size:14px;line-height:2;color:var(--ink-60)}
.ts-spec{display:grid;grid-template-columns:1fr auto;gap:10px 16px;align-items:baseline}
.ts-spec b{font-size:22px;letter-spacing:-.01em;text-align:right}
.ts-quote{border-top:1px solid var(--ink-12);padding-top:18px;font-family:${FONTS.serif};font-size:19px;line-height:1.5;font-style:italic}
`;

/* REF-18 · кейс: задача → решение → метрика */
T["case-story"] = (p) => `
<div class="cst">
  <header class="cst-head">
    <div class="kicker">Кейс · Логистика</div>
    <h1>Сократили простой транспорта<br><em>с 19% до 4%</em> за две смены</h1>
  </header>
  <div class="cst-cols">
    <div class="cst-col"><span class="cst-tag">Задача</span>
      <p>Парк 84 машины, диспетчер вёл график в таблице. Машина ждала погрузку, потому что заявку подтверждали по телефону.</p></div>
    <div class="cst-col"><span class="cst-tag">Решение</span>
      <p>Единая очередь заявок и автоматическое назначение: ближайшая свободная единица техники получает задание в приложении.</p></div>
    <div class="cst-col"><span class="cst-tag">Результат</span>
      <p>Простой 4%, 74 рейса в сутки, окупаемость системы — 4,5 месяца по данным бухгалтерии.</p></div>
  </div>
  <div class="cst-metrics">
    ${[["19%", "простой до", false], ["4%", "простой после", true], ["74", "рейса в сутки", false], ["4,5 мес", "окупаемость", false]]
      .map(([v, k, hot]) => `<div class="cst-metric${hot ? " is-hot" : ""}"><b>${v}</b><span class="meta">${k}</span></div>`).join("")}
  </div>
</div>`;

T["case-story"].css = `
.cst{height:calc(100vh - 44px);padding:44px 56px;display:flex;flex-direction:column;gap:22px}
.cst-head h1{margin:14px 0 0;font-size:48px;line-height:1.08;letter-spacing:-.03em;font-weight:600;max-width:24ch}
.cst-head h1 em{font-style:normal;color:var(--accent);border-bottom:4px solid var(--accent)}
.cst-cols{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:26px;border-top:1px solid var(--ink-12);padding-top:22px}
.cst-tag{display:inline-block;font-family:${FONTS.mono};font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--light);background:var(--deep);padding:4px 9px}
.cst-col p{margin:14px 0 0;font-size:16px;line-height:1.65;color:var(--ink-87)}
.cst-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--ink-12);border:1px solid var(--ink-12)}
.cst-metric{background:var(--bg);padding:18px 22px;display:flex;flex-direction:column;gap:4px}
.cst-metric b{font-size:34px;letter-spacing:-.02em}
.cst-metric.is-hot{background:var(--accent);color:var(--bg)}
.cst-metric.is-hot .meta{color:${alpha("#ffffff", 0.82)}}
`;

/* REF-17 · концепт: привычная сетка + одна необычная деталь */
T["concept-grid"] = (p) => `
<div class="cn">
  <div class="cn-cell cn-cell--title">
    <span class="kicker">Концепт 07</span>
    <h1>Один<br>неожиданный<br><em>элемент</em></h1>
  </div>
  ${times(5, (i) => `<div class="cn-cell cn-cell--ph" style="--tone:${p.palette[i % p.palette.length]}">
      <span class="cn-index">${String(i + 1).padStart(2, "0")}</span><div class="grain"></div></div>`)}
  <div class="cn-cell cn-cell--note">
    <p>Остальное — по правилам: 12-колоночная сетка, две гарнитуры, одна сигнальная деталь на экран.</p>
    <span class="cn-cta">Смотреть концепт</span>
  </div>
</div>`;

T["concept-grid"].css = `
.cn{height:calc(100vh - 44px);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:1px;background:var(--ink-12)}
.cn-cell{background:var(--bg);position:relative;overflow:hidden;padding:26px 28px;display:flex;flex-direction:column}
.cn-cell--title{grid-column:span 1;justify-content:space-between}
.cn-cell--title h1{margin:auto 0 0;font-size:clamp(36px,3.4vw,54px);line-height:1.04;letter-spacing:-.03em;font-weight:600}
.cn-cell--title em{font-style:italic;color:var(--accent)}
.cn-cell--ph{background:var(--tone);justify-content:space-between}
.cn-index{font-family:${FONTS.mono};font-size:12px;color:${alpha("#000000", 0.45)}}
.cn-cell--ph::after{content:"";position:absolute;inset:auto 24px 24px auto;width:64px;height:64px;border-radius:50%;
  border:2px solid ${alpha("#000000", 0.25)}}
.cn-cell--note{grid-column:span 2;flex-direction:row;align-items:flex-end;justify-content:space-between;gap:30px}
.cn-cell--note p{margin:0;max-width:52ch;font-size:17px;line-height:1.6;color:var(--ink-87)}
.cn-cta{padding:12px 20px;background:var(--accent);color:var(--bg);font-weight:600;white-space:nowrap}
.cn-cta:hover{filter:brightness(1.1)}
`;

/* REF-19 · премиум: целостность, ритм и паузы */
T["premium-refined"] = (p) => `
<div class="pr">
  <header class="pr-nav">
    <span class="pr-brand">СЕВЕРНЫЙ ДОМ</span>
    <span class="pr-links">Архитектура · Интерьеры · Ландшафт</span>
    <span class="meta">Портфолио 2026</span>
  </header>
  <section class="pr-hero">
    <div class="pr-shot"><i></i><b>Проект 41 · скальный берег</b><div class="grain"></div></div>
    <div class="pr-copy">
      <span class="kicker">Проект 41</span>
      <h1>Дом, который<br>держит тишину</h1>
      <p>1 240 м² на скальном берегу. Пауза между комнатами — часть плана: 4,2 метра тишины перед каждой спальней.</p>
      <div class="pr-spec">
        ${[["Площадь", "1 240 м²"], ["Срок", "22 месяца"], ["Материал", "Клинкер · дуб"], ["Команд", "1 подрядчик"]]
          .map(([k, v]) => `<div><span class="meta">${k}</span><b>${v}</b></div>`).join("")}
      </div>
    </div>
  </section>
</div>`;

T["premium-refined"].css = `
.pr{height:calc(100vh - 44px);display:flex;flex-direction:column}
.pr-nav{display:flex;justify-content:space-between;align-items:center;padding:20px 46px;border-bottom:1px solid var(--ink-12)}
.pr-brand{letter-spacing:.24em;font-size:12px;font-weight:600}
.pr-links{font-family:${FONTS.serif};font-size:15px;color:var(--ink-60);letter-spacing:.02em}
.pr-hero{flex:1;display:grid;grid-template-columns:1.12fr .88fr}
.pr-shot{background:var(--deep);position:relative;overflow:hidden;padding:44px}
.pr-shot b{position:absolute;left:56px;bottom:52px;font-family:${FONTS.serif};font-size:30px;color:${alpha("#ffffff", 0.92)};font-weight:400}
.pr-shot i{position:absolute;right:56px;top:56px;width:34%;height:52%;border:1px solid ${alpha("#ffffff", 0.22)};background:${alpha("#ffffff", 0.05)}
.pr-shot::before{content:"";position:absolute;inset:8% 12%;border:1px solid ${alpha("#ffffff", 0.16)}}
.pr-shot::after{content:"";position:absolute;left:12%;right:12%;bottom:8%;height:34%;
  background:linear-gradient(180deg, transparent, ${alpha("#ffffff", 0.08)})}
.pr-copy{padding:56px 56px 40px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.pr-copy h1{margin:0;font-family:${FONTS.serif};font-weight:400;font-size:60px;line-height:1.04;letter-spacing:-.02em}
.pr-copy p{margin:0;font-size:16px;line-height:1.7;color:var(--ink-60);max-width:42ch}
.pr-spec{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;border-top:1px solid var(--ink-12);padding-top:22px;margin-top:10px}
.pr-spec div{display:flex;flex-direction:column;gap:4px}
.pr-spec b{font-size:17px;font-weight:500}
`;

/* REF-20 · эвристики: проверяемое ядро юзабилити */
T["heuristics-core"] = (p) => `
<div class="hc">
  <header class="hc-head">
    <div><div class="kicker">Ядро эвристик NN/g</div><h1>10 эвристик,<br>которые видит валидатор</h1></div>
    <div class="hc-score"><b>9,2</b><span class="meta">из 10 выполнено</span></div>
  </header>
  <ol class="hc-list">
    ${[["Видимость статуса", "role=\"status\" + индикатор обновления", true],
      ["Язык пользователя", "без внутренних терминов", true],
      ["Свобода и контроль", "возврат и отмена на каждом шаге", true],
      ["Консистентность", "токены дизайн-системы", true],
      ["Предотвращение ошибок", "подтверждение необратимого", true],
      ["Распознавание вместо припоминания", "подписи и alt", true],
      ["Гибкость", "быстрые действия для опытных", false],
      ["Эстетика и минимализм", "одно действие на экран", true],
      ["Помощь в ошибке", "текст ошибки с решением", true],
      ["Справка", "канал связи на виду", true]]
      .map(([t, d, ok], i) => `<li${ok ? "" : ' class="is-gap"'}>
        <span class="hc-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="hc-title">${t}</span>
        <span class="hc-detail meta">${d}</span>
        <span class="hc-flag${ok ? " is-ok" : ""}">${ok ? "OK" : "GAP"}</span></li>`).join("")}
  </ol>
</div>`;

T["heuristics-core"].css = `
.hc{height:calc(100vh - 44px);display:flex;flex-direction:column}
.hc-head{display:flex;justify-content:space-between;align-items:flex-end;padding:34px 48px 22px}
.hc-head h1{margin:12px 0 0;font-size:42px;line-height:1.06;letter-spacing:-.025em}
.hc-score{text-align:right;display:flex;flex-direction:column;gap:4px}
.hc-score b{font-size:44px;color:var(--accent);letter-spacing:-.02em}
.hc-list{list-style:none;margin:0;padding:0;flex:1;border-top:1px solid var(--ink-12)}
.hc-list li{display:grid;grid-template-columns:56px 1.1fr 1.4fr 60px;align-items:center;gap:18px;
  padding:0 48px;border-bottom:1px solid var(--ink-12);height:calc((100vh - 44px - 190px)/10)}
.hc-list li.is-gap{background:${alpha("#000000", 0.05)}}
.hc-num{font-family:${FONTS.mono};font-size:12px;color:var(--ink-38)}
.hc-title{font-size:18px;font-weight:600}
.hc-flag{font-family:${FONTS.mono};font-size:11px;letter-spacing:.1em;text-align:center;padding:4px 0;
  border:1px solid var(--ink-12);color:var(--ink-60)}
.hc-flag.is-ok{background:var(--deep);color:var(--light);border-color:var(--deep)}
`;

/* REF-21 · форма: чек-лист состояний */
T["form-states"] = (p) => `
<div class="fs">
  <div class="fs-left">
    <div class="kicker">Заявка на замер</div>
    <h1>Три поля —<br>и мы звоним<br>в течение часа</h1>
    <ul class="fs-notes">
      <li>Каждое поле с name — иначе оно не отправляется</li>
      <li>data-analytics-event на кнопке submit</li>
      <li>role="status" + data-state: Error → Loading → Success</li>
    </ul>
  </div>
  <form class="fs-form" id="measure" data-form>
    <label class="fs-field" data-state="ready"><span>Телефон <i>*</i></span>
      <input name="phone" value="+7 921 400-11-24"><em class="fs-hint">Позвоним, если сорвётся связь в чате</em></label>
    <label class="fs-field" data-state="error"><span>Адрес объекта <i>*</i></span>
      <input name="address" value="наб. Обводного, 108"><em class="fs-hint">Не нашли дом — уточните корпус</em></label>
    <label class="fs-field" data-state="ready"><span>Метраж, м²</span>
      <input name="area" value="148"></label>
    <button type="submit" class="fs-submit" data-analytics-event="lead_submit">Записаться на замер</button>
    <div class="fs-status" role="status" aria-live="polite" data-state="loading">
      <span class="fs-spin"></span> Проверяем адрес…
    </div>
  </form>
</div>`;

T["form-states"].css = `
.fs{height:calc(100vh - 44px);display:grid;grid-template-columns:1fr 1fr}
.fs-left{padding:64px 56px;display:flex;flex-direction:column;gap:20px;justify-content:center;border-right:1px solid var(--ink-12)}
.fs-left h1{margin:0;font-size:48px;line-height:1.06;letter-spacing:-.03em;font-weight:600}
.fs-notes{list-style:none;margin:12px 0 0;padding:0;font-size:14px;line-height:1.9;color:var(--ink-60);font-family:${FONTS.mono}}
.fs-notes li{padding-left:18px;position:relative}
.fs-notes li::before{content:"";position:absolute;left:0;top:11px;width:7px;height:7px;background:var(--accent)}
.fs-form{padding:64px 56px;display:flex;flex-direction:column;gap:16px;justify-content:center}
.fs-field{display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--ink-60)}
.fs-field span i{color:var(--accent);font-style:normal}
.fs-field input{font:inherit;font-size:16px;padding:13px 14px;border:1px solid var(--ink-12);background:var(--bg);color:var(--ink)}
.fs-field[data-state="error"] input{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.fs-field[data-state="error"] .fs-hint{color:var(--accent)}
.fs-submit{padding:16px;background:var(--deep);color:var(--light);font:inherit;font-weight:600;font-size:16px;border:0}
.fs-status{display:flex;align-items:center;gap:10px;font-family:${FONTS.mono};font-size:12px;color:var(--ink-60);
  border:1px solid var(--ink-12);padding:11px 14px;background:var(--ink-06)}
.fs-spin{width:12px;height:12px;border:2px solid var(--ink-12);border-top-color:var(--accent);border-radius:50%}
`;

/* REF-07 · производственный паспорт: наряд, палитра RAL, прайс-строки */
T["industrial-passport"] = (p) => `
<div class="ip">
  <header class="ip-head">
    <div><span class="kicker">Наряд-заказ № 4471 · смена 2</span>
      <h1>Порошковая окраска<br>по RAL за 24 часа</h1></div>
    <div class="ip-pass"><span class="meta">Толщина</span><b>90 мкм</b><span class="meta">Адгезия</span><b>1 балл</b><span class="meta">Печь</span><b>196 °C</b></div>
  </header>
  <div class="ip-body">
    <div class="ip-stations">
      ${[["01", "Дробеструй", "Sa 2½ · 12 мин"], ["02", "Хроматирование", "3 мин · ванна 2"], ["03", "Напыление", "трибо · 90 мкм"], ["04", "Полимеризация", "196 °C · 14 мин"]]
        .map(([n, t, d], i) => `<div class="ip-station${i === 3 ? " is-hot" : ""}"><b>${n}</b><div><h3>${t}</h3><span class="meta">${d}</span></div></div>`).join("")}
    </div>
    <div class="ip-ledger">
      <div class="ip-tr ip-th"><span>Позиция</span><span>Покрытие</span><span>м²</span><span>Цена/м²</span><span>Сумма</span></div>
      ${[["Рама Р-90", "RAL 7016 · мат", "42", "1 940", "81 480"],
        ["Кронштейн К-4", "RAL 9005 · глянец", "18", "1 780", "32 040"],
        ["Ограждение О-12", "RAL 3020 · мат", "96", "2 140", "205 440"],
        ["Площадка П-2", "RAL 7040 · текстура", "64", "2 260", "144 640"]]
        .map(([a, b, c, d, e]) => `<div class="ip-tr"><span>${a}</span><span>${b}</span><span class="meta">${c}</span><span class="meta">${d}</span><b>${e}</b></div>`).join("")}
      <div class="ip-tr ip-total"><span>Итого по наряду</span><b>463 600 ₽ · 220 м²</b></div>
    </div>
  </div>
  <div class="ip-ral">${["#17181C", "#FF6A2B", "#E7E7E2", "#FFB35C", "#5A5E66", "#8C1F28"].map((c, i) => `<span style="--c:${c}">RAL ${[7016, 2004, 9003, 1033, 7040, 3020][i]}</span>`).join("")}</div>
</div>`;

T["industrial-passport"].css = `
.ip{height:calc(100vh - 44px);display:flex;flex-direction:column;padding:30px 44px;gap:22px}
.ip-head{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;border-bottom:2px solid var(--ink);padding-bottom:18px}
.ip-head h1{margin:12px 0 0;font-size:44px;line-height:1.04;letter-spacing:-.03em;font-weight:700}
.ip-pass{display:grid;grid-template-columns:auto auto;gap:6px 18px;align-items:baseline}
.ip-pass b{font-size:20px;color:var(--accent)}
.ip-body{flex:1;display:grid;grid-template-columns:.9fr 1.1fr;gap:26px}
.ip-stations{display:grid;grid-template-rows:repeat(4,1fr);gap:8px}
.ip-station{display:flex;align-items:center;gap:18px;border:1px solid var(--ink-12);padding:0 18px;background:var(--bg)}
.ip-station b{font-family:${FONTS.mono};color:var(--accent);font-size:20px}
.ip-station h3{margin:0 0 3px;font-size:19px}
.ip-station.is-hot{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.ip-station.is-hot .meta{color:${alpha("#ffffff", 0.7)}}
.ip-ledger{display:flex;flex-direction:column;border:1px solid var(--ink-12)}
.ip-tr{display:grid;grid-template-columns:1.3fr 1.2fr .5fr .7fr .8fr;gap:14px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--ink-12);font-size:14px}
.ip-tr:nth-child(even){background:var(--ink-06)}
.ip-th{background:var(--deep);color:var(--light);font-family:${FONTS.mono};font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.ip-tr b{text-align:right;font-size:15px}
.ip-total{justify-content:space-between;grid-template-columns:1fr auto;border-bottom:0;border-top:2px solid var(--ink);margin-top:auto;
  background:var(--accent);color:var(--bg);font-weight:700}
.ip-total b{color:var(--bg)}
.ip-ral{display:flex;border:1px solid var(--ink-12)}
.ip-ral span{flex:1;background:var(--c);color:${alpha("#ffffff", 0.92)};font-family:${FONTS.mono};font-size:11px;
  padding:10px 12px;letter-spacing:.06em;text-shadow:0 1px 2px ${alpha("#000000", 0.35)}}
`;

/* REF-04 · интерактивная сцена: у курсора масса и инерция */
T["canvas-play"] = (p) => `
<div class="cp">
  <div class="cp-stage">
    <div class="cp-orb"></div>
    <div class="cp-rings">${times(3, (i) => `<i style="--i:${i}"></i>`)}</div>
    <div class="cp-floor"></div>
    <div class="cp-hint">масса 1,8 кг · инерция 0,42 · трение 0,86</div>
    <div class="cp-cursor"><span class="meta">перетащи</span></div>
  </div>
  <div class="cp-hud">
    <div class="kicker">Игровая навигация вместо меню</div>
    <h1>Управляй сценой,<br>а не списком пунктов</h1>
    <div class="cp-legend">
      ${[["Масса", "1,8 кг"], ["Инерция", "0,42"], ["Трение", "0,86"], ["Звук", "по действию"]]
        .map(([k, v]) => `<div><span class="meta">${k}</span><b>${v}</b></div>`).join("")}
    </div>
  </div>
</div>`;

T["canvas-play"].css = `
.cp{height:calc(100vh - 44px);display:grid;grid-template-columns:1.2fr .8fr;background:var(--deep);color:var(--light)}
.cp-stage{position:relative;overflow:hidden;border-right:1px solid ${alpha("#ffffff", 0.12)}}
.cp-floor{position:absolute;left:0;right:0;bottom:0;height:26%;background:linear-gradient(180deg,transparent,${alpha("#000000", 0.35)})}
.cp-hint{position:absolute;left:0;right:0;bottom:12%;text-align:center;font-family:${FONTS.mono};font-size:11px;letter-spacing:.12em;color:${alpha("#ffffff", 0.6)};text-transform:uppercase}
.cp-orb{position:absolute;left:34%;top:36%;width:200px;height:200px;border-radius:50%;
  background:radial-gradient(circle at 34% 30%, var(--accent), ${alpha("#000000", 0.6)} 74%);
  box-shadow:0 60px 120px ${alpha("#000000", 0.5)}}
.cp-rings i{position:absolute;left:34%;top:36%;width:calc(240px + var(--i) * 150px);height:calc(240px + var(--i) * 150px);
  margin:calc(-120px - var(--i) * 75px) 0 0 calc(-120px - var(--i) * 75px);border:1px dashed ${alpha("#ffffff", 0.16)};border-radius:50%}
.cp-cursor{position:absolute;right:24%;bottom:22%;display:flex;align-items:center;gap:10px}
.cp-cursor::before{content:"";width:14px;height:14px;background:var(--accent);border-radius:50%}
.cp-hud{padding:64px 52px;display:flex;flex-direction:column;justify-content:center;gap:22px}
.cp-hud h1{margin:0;font-size:52px;line-height:1.05;letter-spacing:-.03em;font-weight:600}
.cp-legend{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;border-top:1px solid ${alpha("#ffffff", 0.14)};padding-top:22px}
.cp-legend div{display:flex;flex-direction:column;gap:4px}
.cp-legend b{font-size:22px}
.cp-legend .meta{color:${alpha("#ffffff", 0.6)}}
`;

/* ─────────────────────────── сборка ─────────────────────────── */

/** Палитра/роли для архетипа: тёмные архетипы берут фоном самый тёмный цвет. */
const DARK_ARCHETYPES = new Set(["dark-hero", "canvas-play", "sticky-scene", "premium-refined"]);

/**
 * Рисует образец веб-референса.
 * @param {{id: string, style: string[], palette: string[], takeaway: string, archetype: string}} ref
 * @returns {{html: string, title: string}}
 */
export function renderWebSpecimen(ref) {
  const dark = DARK_ARCHETYPES.has(ref.archetype);
  const p = roles(ref.palette, { dark });
  const build = T[ref.archetype];
  if (!build) throw new Error(`неизвестный архетип веб-образца: ${ref.archetype}`);
  const body = `${build(p)}\n${stamp(ref.id, ref.takeaway, p)}`;
  const css = `${BASE_CSS}${build.css ?? ""}`;
  const title = `${ref.id} · ${(ref.style ?? []).join(", ")}`;
  return { html: page({ title, css, body, ...p }), title };
}

export const WEB_ARCHETYPES = Object.freeze(Object.keys(T));

export default renderWebSpecimen;
