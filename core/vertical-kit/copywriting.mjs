/* ЦЕХ · Метаплатформа — core/vertical-kit/copywriting.mjs
   Общий движок «редактуры»: находит в тексте следы машинной генерации (копипаст из
   чат-ботов и «манеру» ИИ) и считает балл чистоты. Ноль зависимостей, только Node.

   Разделение по тяжести (§6, §15 ТЗ — гейт читает только строки-коды):
     • severity "error" — НЕвоспроизводимые машиной артефакты (oaicite, turn…search,
       utm_source=chatgpt.com, 【…†…】, пустые плейсхолдеры). Их человек не пишет
       руками никогда → это жёсткий гейт студии (код печатается как «файл:строка A-xx»).
     • severity "warn"  — стилистические маркеры ИИ и ритм (канцелярит, faux-insight,
       негативный параллелизм, длинное тире в прозе, монотонный ритм). Это НЕ запрет
       языка: длинное тире и «не только… но и» — нормальная русская речь. Поэтому warn
       идёт только в балл и в сводку «[lint-copy] …» (префикс, который ядро игнорирует),
       но НЕ блокирует приёмку. Так гейт остаётся честным: он ловит машину, а не стиль.

   Источники правил (все MIT, объединены и адаптированы под русский):
     • smixs/humanizer-ru         — 38 признаков, кластеры лексика/структура/коммуникация;
     • ilyautov/humanizer-ru      — 67 признаков, 21 хард-бан, балл 0-100;
     • hardikpandya/stop-slop     — фразы и структуры;
     • petergyang/no-ai-slop      — запрет канцелярита и «важности»;
     • blader/humanizer           — 26 паттернов по Wikipedia «Signs of AI writing».
   Атрибуция — docs/COPYWRITING.md.

   Публичный API:
     ARTIFACT_RULES               — жёсткие артефакты (error);
     STYLE_RULES                  — стилевые маркеры (warn);
     GENRES                       — пресеты жанров (что смягчать);
     analyzeText(text, {genre})   → { findings, errors, warnings, score, verdict, metrics };
*/

/* Блоки кода (```…``` / ~~~…~~~) и инлайн-код исключаются из проверки: там служебные
   строки вроде «utm_source=chatgpt.com» встречаются как документация, а не как след. */

/** Жёсткие артефакты машинной генерации. Человек не набирает их руками. @type {Array<{code:string,pattern:RegExp,message:string}>} */
export const ARTIFACT_RULES = [
  { code: "A-01", pattern: /:contentReference\[oaicite:\d+\]|oai_citation:\d+‡|【oaicite:\d+】|\boaicite:\d+/iu, message: "артефакт копипаста из ChatGPT (oaicite)" },
  { code: "A-02", pattern: /\b(?:turn\d+(?:search|file|fetch|news|video|image|ref)\d*|citeturn\d+[a-z]*\d*)\b/iu, message: "маркер поиска чат-бота (turn…search / citeturn)" },
  { code: "A-03", pattern: /utm_source=(?:chatgpt|copilot|perplexity|openai)\.com|referrer=grok\.com/iu, message: "служебный реферер чат-бота (utm_source=…)" },
  { code: "A-04", pattern: /grok_card:\/\/|grok_render_citation_card_json|<grok-card\b/iu, message: "артефакт карточки Grok" },
  { code: "A-05", pattern: /vertexaisearch[^\s"')]*grounding-api-redirect|\[\s*cite_start\s*\]|\[\s*cite:\s*\d+\s*\]|\[span_\d+\]/iu, message: "артефакт цитирования Gemini/Vertex" },
  { code: "A-06", pattern: /【\d+†[^】]*】|sandbox:\/mnt\/data\//u, message: "инлайновая ссылка-артефакт 【…†…】" },
  { code: "A-07", pattern: /<\/?(?:think|analysis|reasoning)>/iu, message: "остаток рассуждений модели (тег think/analysis)" },
  { code: "A-08", pattern: /ppl-ai-file-upload/iu, message: "артефакт загрузки файла Perplexity" },
  { code: "A-09", pattern: /INSERT_SOURCE_URL|PASTE_[A-Z0-9_]*URL[A-Z0-9_]*|URL_HERE\b|\b20\d\d-XX-XX\b|\[INSERT[^\]]*\]/u, message: "незаполненный плейсхолдер-заглушка" },
];

/** Стилевые маркеры ИИ и ритм. Не блокируют приёмку — идут в балл и сводку.
 *  @type {Array<{code:string,pattern:RegExp,message:string,skipGenres?:string[]}>} */
export const STYLE_RULES = [
  // — канцелярит и штампы-связки —
  { code: "C-01", pattern: /(важно отметить|следует отметить|стоит отметить|стоит подчеркнуть|следует подчеркнуть|необходимо отметить|нельзя не отметить|нельзя не упомянуть|стоит обратить внимание|обратим внимание|в современном мире|в современном обществе|на сегодняшний день|в настоящее время|как известно|ни для кого не секрет|не секрет, что|каждый из нас)/iu, message: "канцелярит/штамп-связка", skipGenres: ["legal", "academic", "news"] },
  // — замена живого глагола связкой —
  { code: "C-02", pattern: /(представляет собой|выступает в роли|служит основой|знаменует собой|играет важную роль|играет ключевую роль|является основой)/iu, message: "канцелярская связка вместо глагола", skipGenres: ["legal", "academic"] },
  // — ИИ-лексика усиления —
  { code: "C-03", pattern: /(ключев(?:ой|ая|ое|ые|ым|ого|ому)|важнейш(?:ий|ая|ее|ие)|демонстриру(?:ет|ют)|способству(?:ет|ют)|подчёркива(?:ет|ют)|свидетельству(?:ет|ют)|неуклонно|поистине|в полной мере)/iu, message: "ИИ-лексика усиления" },
  // — faux-insight: «настоящая суть» —
  { code: "C-04", pattern: /(по сути,|если копнуть глубже|настоящ(?:ий|ая) (?:вопрос|проблема) (?:в том|в том, что)|в конечном счёте|большинство упуска(?:ет|ют)|никто не (?:говорит|расскажет)|главная ошибка большинства|чего вам не расскажут)/iu, message: "псевдо-инсайт (faux-insight)" },
  // — анонсы и приглашения —
  { code: "C-05", pattern: /(давайте разберёмся|давайте разберемся|погрузимся в|погрузимся в детали|вот что нужно знать|без лишних слов|начнём с того|начнем с того)/iu, message: "анонс-приглашение «давайте разберёмся»" },
  // — фальшивая близость —
  { code: "C-06", pattern: /(скажу прямо|говоря начистоту|давайте начистоту|вот в чём штука|вот в чем штука|если честно,|честно говоря,)/iu, message: "фальшивая близость (fake intimacy)" },
  // — псевдо-терапия —
  { code: "C-07", pattern: /(и это нормально|и это окей|вы не одиноки|вы не одни|давайте призна(?:ем|ём)|позвольте себе|это абсолютно нормально)/iu, message: "псевдо-терапевтический тон" },
  // — резюмирование —
  { code: "C-08", pattern: /(подводя итог|в заключение|резюмируя|в итоге можно сказать|таким образом, можно)/iu, message: "пустое резюмирование" },
  // — размытая атрибуция —
  { code: "C-09", pattern: /(по мнению экспертов|эксперты считают|аналитики отмечают|исследователи утверждают|многие считают|принято считать)/iu, message: "размытая атрибуция без источника" },
  // — позитивные концовки —
  { code: "C-10", pattern: /(будущее выглядит ярким|продолжает процветать|впереди захватывающ|открывает безграничн|и это только начало)/iu, message: "дежурный оптимистичный финал" },
  // — сервильность чат-бота —
  { code: "C-11", pattern: /(отличный вопрос|надеюсь, это поможет|надеюсь, было полезно|надеюсь, эта информация|дайте знать, если|буду рад помочь|чем ещё могу помочь)/iu, message: "сервильность чат-бота" },
  // — формула «вызовы/трудности» —
  { code: "C-12", pattern: /(сталкивается с (?:рядом )?вызов|несмотря на эти вызовы|несмотря на трудности,|как и всё, .* имеет свои)/iu, message: "формула «сталкивается с вызовами»" },
  // — длинное тире в прозе (человек пишет и так; не запрет, только сигнал) —
  { code: "C-13", pattern: /[—–]/u, message: "длинное тире в прозе (ИИ-тик; допустимо, но проверь ритм)", skipGenres: ["legal", "academic", "news"] },
  // — негативный параллелизм —
  { code: "N-01", pattern: /(не просто [^.!?]{1,60}, а |не только [^.!?]{1,60}, но и )/iu, message: "негативный параллелизм «не просто…, а…»", skipGenres: ["legal", "news"] },
  // — драматичное стаккато: несколько коротких «Без …»/«. Без …» подряд —
  { code: "N-02", pattern: /(?:\bБез\s+[^.!?]{1,40}[.!]+\s*){2,}/u, message: "драматичное стаккато (рубленые «Без …»)" },
];

/** Пресеты жанров: список skipGenres в правилах выше смягчается для этих жанров. */
export const GENRES = Object.freeze(["marketing", "expert", "product", "business", "academic", "legal", "news"]);

/** «Мягкие» маркеры: показываются как замечания, но НЕ понижают балл.
 *  C-13 (длинное тире) — по правилу «допустимо»; R-01/R-02 (ритм) — измеряются по
 *  смешанному тексту разметки, где границы предложений ненадёжны. */
export const SOFT_CODES = Object.freeze(["C-13", "R-01", "R-02"]);

/** Предложения из прозаического текста → длины в словах. */
function sentenceLengths(text) {
  return String(text)
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.split(/\s+/).filter(Boolean).length)
    .filter((n) => n > 0);
}

function stdDev(nums) {
  if (nums.length === 0) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

/**
 * Разбирает текст: находит артефакты (error) и стилевые маркеры/ритм (warn), считает балл.
 * @param {string} text
 * @param {{genre?: string, rhythm?: boolean}} [opts] rhythm=false отключает правила ритма
 *   (R-01/R-02): их нельзя считать по коду (.js/.css/.json), там нет прозы — только строки и комментарии.
 * @returns {{findings: Array<{code:string,severity:"error"|"warn",line:number,message:string,quote:string}>, errors:number, warnings:number, score:number, verdict:string, metrics:{sentences:number,avgWords:number,maxWords:number,words:number}, genre:string}}
 */
export function analyzeText(text, { genre = "business", rhythm = true } = {}) {
  const lines = String(text ?? "").split(/\r?\n/);
  const findings = [];
  const seen = new Set();
  const proseParts = [];
  let fenced = false;

  const push = (code, severity, line, message, quote = "") => {
    const key = `${line}:${code}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ code, severity, line, message, quote: String(quote).slice(0, 80) });
  };

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    if (/^\s*(?:```|~~~)/.test(raw)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    // инлайн-код и HTML-теги убираем: там живут служебные строки, а не проза
    const prose = raw.replace(/`[^`]*`/g, " ").replace(/<[^>]*>/g, " ");
    if (!prose.trim()) return;
    proseParts.push(prose);

    for (const rule of ARTIFACT_RULES) {
      const m = rule.pattern.exec(prose);
      if (m) push(rule.code, "error", lineNo, rule.message, m[0]);
    }
    for (const rule of STYLE_RULES) {
      if (rule.skipGenres?.includes(genre)) continue;
      const m = rule.pattern.exec(prose);
      if (m) push(rule.code, "warn", lineNo, rule.message, m[0]);
    }
  });

  // ритм считаем по прозе построчно: склейка строк разметки в одно «предложение» даёт ложные R-01
  const proseText = proseParts.join(" ");
  const lens = rhythm ? proseParts.flatMap((part) => sentenceLengths(part)) : [];
  const words = proseText.split(/\s+/).filter(Boolean).length;
  const avgWords = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const maxWords = lens.length ? Math.max(...lens) : 0;
  if (rhythm && lens.length >= 1 && (avgWords > 26 || maxWords > 45)) {
    push("R-01", "warn", 1, "слишком длинные предложения (среднее > 26 или максимум > 45 слов)", "");
  }
  if (rhythm && lens.length >= 6 && stdDev(lens) < 4) {
    push("R-02", "warn", 1, "монотонный ритм: длина предложений почти не меняется", "");
  }

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warn").length;
  const softNotes = findings.filter((f) => f.severity === "warn" && SOFT_CODES.includes(f.code)).length;
  const score = Math.max(0, Math.min(100, 100 - 12 * errors - 3 * (warnings - softNotes)));
  const verdict = errors > 0 ? "переписать" : score >= 80 ? "чисто" : score >= 55 ? "правка" : "переписать";

  return { findings, errors, warnings, softNotes, score, verdict, metrics: { sentences: lens.length, avgWords: Math.round(avgWords * 10) / 10, maxWords, words }, genre };
}

export default { ARTIFACT_RULES, STYLE_RULES, SOFT_CODES, GENRES, analyzeText };
