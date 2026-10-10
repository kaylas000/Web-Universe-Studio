/* Логика помодоро-таймера: без var, без alert, обработчики через addEventListener. */
const TOTAL = 25 * 60;
const value = document.querySelector("#value");
const start = document.querySelector("#start");
const reset = document.querySelector("#reset");

let left = TOTAL;
let tick = null;

const render = () => {
  const minutes = String(Math.floor(left / 60)).padStart(2, "0");
  const seconds = String(left % 60).padStart(2, "0");
  value.textContent = `${minutes}:${seconds}`;
};

const stop = () => {
  if (tick !== null) {
    clearInterval(tick);
    tick = null;
  }
  start.textContent = "Старт";
};

const run = () => {
  stop();
  tick = setInterval(() => {
    left -= 1;
    render();
    if (left <= 0) {
      stop();
      left = TOTAL;
      render();
    }
  }, 1000);
  start.textContent = "Пауза";
};

start.addEventListener("click", () => {
  if (tick === null) run();
  else stop();
});

reset.addEventListener("click", () => {
  stop();
  left = TOTAL;
  render();
});

render();
