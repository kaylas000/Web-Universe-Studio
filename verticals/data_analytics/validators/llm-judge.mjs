/* validators/llm-judge.mjs — опциональный LLM-критик. Никогда не единственный гейт (§5.2 ТЗ).
   По умолчанию выключен: возвращает «не запускался», чтобы приёмка оставалась детерминированной. */

/** @returns {{ ran: boolean, score: null, reason: string }} */
export async function judge() {
  return { ran: false, score: null, reason: "llm_judge выключен: детерминированные гейты первичны" };
}

export default { judge };
