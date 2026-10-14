/* ЦЕХ · Метаплатформа — scripts/shots/refspecs.mjs
   Соответствие «референс архива → архетип образца». Единственное место, где записано,
   какой архетип показывает приём конкретного референса, и какая платформа у его палитры.

   Правило: приёмы из meta.yaml остаются источником смысла; здесь — только раскладка по
   визуальным архетипам, чтобы один и тот же приём не рисовался двумя разными способами.
*/

/** Палитры платформ (meta.yaml мини-приложений и мобильных приложений несёт style, не палитру). */
export const PLATFORM_PALETTE = Object.freeze({
  tg: ["#ffffff", "#0f0f0f", "#3390ec"],
  ios: ["#f2f2f7", "#000000", "#007aff"],
  android: ["#fbf8fd", "#1c1b1f", "#6750a4"],
  dark: ["#17212b", "#f5f5f5", "#5eb5f7"],
});

/** Веб-студия: REF-xx → архетип (+палитра, если в meta.yaml она пуста). */
export const WEB_SPECS = Object.freeze({
  "REF-01": { archetype: "sticky-scene" },
  "REF-02": { archetype: "editorial-index" },
  "REF-03": { archetype: "poster-statement" },
  "REF-04": { archetype: "canvas-play" },
  "REF-05": { archetype: "poster-type" },
  "REF-06": { archetype: "archive-ledger" },
  "REF-07": { archetype: "industrial-passport" },
  "REF-08": { archetype: "minimal-air" },
  "REF-09": { archetype: "brutalist-frames" },
  "REF-10": { archetype: "dark-hero" },
  "REF-11": { archetype: "catalog-grid" },
  "REF-12": { archetype: "saas-landing" },
  "REF-13": { archetype: "type-specimen" },
  "REF-14": { archetype: "scroll-cinema" },
  "REF-15": { archetype: "components-sheet" },
  "REF-16": { archetype: "fullpage-sections" },
  "REF-17": { archetype: "concept-grid" },
  "REF-18": { archetype: "case-story" },
  "REF-19": { archetype: "premium-refined" },
  "REF-20": { archetype: "heuristics-core" },
  "REF-21": { archetype: "form-states", palette: ["#FFFFFF", "#111827", "#2563EB"] },
});

/** Студия мини-приложений: ref-xx → архетип + платформа. */
export const MINI_SPECS = Object.freeze({
  "ref-01": { archetype: "tma-one-screen", platform: "tg" },
  "ref-02": { archetype: "tma-instant-feedback", platform: "tg" },
  "ref-03": { archetype: "tma-focus-visible", platform: "tg" },
  "ref-04": { archetype: "tma-invoice", platform: "tg" },
  "ref-05": { archetype: "tma-viewport-safe", platform: "tg" },
  "ref-06": { archetype: "tma-offline-sw", platform: "tg" },
  "ref-07": { archetype: "tma-storefront", platform: "tg" },
  "ref-08": { archetype: "tma-review", platform: "tg" },
  "ref-09": { archetype: "tma-charts", platform: "tg" },
  "ref-10": { archetype: "tma-concept", platform: "tg" },
  "ref-11": { archetype: "tma-case", platform: "tg" },
  "ref-12": { archetype: "tma-contrast", platform: "tg" },
  "ref-13": { archetype: "tma-heuristics", platform: "tg" },
  "ref-14": { archetype: "tma-cta", platform: "tg" },
  "ref-15": { archetype: "tma-motion", platform: "tg" },
  "ref-16": { archetype: "tma-voice", platform: "tg" },
});

/** Студия мобильных приложений: ref-xx → архетип + платформа. */
export const MOBILE_SPECS = Object.freeze({
  "ref-01": { archetype: "mob-thumb-zone", platform: "ios" },
  "ref-02": { archetype: "mob-platform-nav", platform: "compare" },
  "ref-03": { archetype: "mob-touch-target", platform: "ios" },
  "ref-04": { archetype: "mob-offline-queue", platform: "dark" },
  "ref-05": { archetype: "mob-store-assets", platform: "ios" },
  "ref-06": { archetype: "mob-i18n-keys", platform: "ios" },
  "ref-07": { archetype: "mob-flows", platform: "ios" },
  "ref-08": { archetype: "mob-pattern-library", platform: "ios" },
  "ref-09": { archetype: "mob-platform-lang", platform: "compare" },
  "ref-10": { archetype: "mob-store-preview", platform: "ios" },
  "ref-11": { archetype: "mob-nav-patterns", platform: "ios" },
  "ref-12": { archetype: "mob-components", platform: "ios" },
  "ref-13": { archetype: "mob-contrast", platform: "dark" },
  "ref-14": { archetype: "mob-heuristics", platform: "ios" },
  "ref-15": { archetype: "mob-typography", platform: "ios" },
  "ref-16": { archetype: "mob-animation", platform: "android" },
  "ref-17": { archetype: "mob-voice", platform: "ios" },
});

/** Спецификация студии: где искать референсы и какие архетипы к ним применимы. */
export const STUDIO_SHOTS = Object.freeze({
  web_studio: {
    kind: "web",
    title: "Веб-студия ЦЕХ",
    layout: "meta-per-dir",
    specs: WEB_SPECS,
    viewport: { width: 1600, height: 1000 },
    cardWidth: 1600,
    cardHeight: 1000,
  },
  mini_apps: {
    kind: "app",
    title: "Студия мини-приложений",
    layout: "metadata-dir",
    specs: MINI_SPECS,
    viewport: { width: 1180, height: 1000, deviceScaleFactor: 1 },
    cardWidth: 1200,
    cardHeight: 1000,
  },
  mobile_apps: {
    kind: "app",
    title: "Студия мобильных приложений",
    layout: "metadata-dir",
    specs: MOBILE_SPECS,
    viewport: { width: 1180, height: 1000, deviceScaleFactor: 1 },
    cardWidth: 1200,
    cardHeight: 1000,
  },
});

export default { WEB_SPECS, MINI_SPECS, MOBILE_SPECS, STUDIO_SHOTS, PLATFORM_PALETTE };
