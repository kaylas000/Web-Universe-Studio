/* registry.mjs — мост между ядром и студией «Юридическая студия».
   Экспортирует IVertical-объект: метаданные + сборку конфига цикла для проекта.
   Ядро (core/gate.mjs) знает только этот контракт, а не детали студии. */

export const vertical = {
  name: "legal_docs",
  title: "Юридическая студия",
  deliverable: "docs",
  checks: ["validate","lint-slop"],
  validator: "vertical_project",

  /** @param {string} projectName @returns {Record<string, any>} */
  buildConfig(projectName) {
    return {
      project_name: projectName,
      task: "составить договор поставки оборудования для ООО «Речной порт»",
      loop: { max_iterations: 1 },
      generator: { type: "mock" },
      context_builder: { type: "studio_default" },
      validator: { type: "vertical_project", checks: this.checks },
    };
  },
};

export default vertical;
