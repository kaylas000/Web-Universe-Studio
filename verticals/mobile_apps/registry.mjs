/* registry.mjs — мост между ядром и студией «Студия мобильных приложений».
   Экспортирует IVertical-объект: метаданные + сборку конфига цикла для проекта.
   Ядро (core/gate.mjs) знает только этот контракт, а не детали студии. */

export const vertical = {
  name: "mobile_apps",
  title: "Студия мобильных приложений",
  deliverable: "app",
  checks: ["validate","lint-slop"],
  validator: "vertical_project",

  /** @param {string} projectName @returns {Record<string, any>} */
  buildConfig(projectName) {
    return {
      project_name: projectName,
      task: "собрать экран заметок с состоянием и доступными подписями",
      loop: { max_iterations: 1 },
      generator: { type: "mock" },
      context_builder: { type: "studio_default" },
      validator: { type: "vertical_project", checks: this.checks },
    };
  },
};

export default vertical;
