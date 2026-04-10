import { DIRECTION_MAP } from "./constants.mjs";

export function bindInputController({
  onDirection,
  onThemeChange,
  onSeedChange,
  onStart,
  onRestart,
  onCopy,
  onSave,
}) {
  document.addEventListener("keydown", (event) => {
    if (!(event.key in DIRECTION_MAP)) {
      return;
    }

    event.preventDefault();
    onDirection(event.key);
  });

  Array.from(document.querySelectorAll("[data-theme]")).forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.theme) {
        onThemeChange(button.dataset.theme);
      }
    });
  });

  Array.from(document.querySelectorAll("[data-control-key]")).forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      if (button.dataset.controlKey) {
        onDirection(button.dataset.controlKey);
      }
    });
  });

  document.getElementById("seedInput").addEventListener("input", (event) => {
    onSeedChange(event.target.value);
  });

  document.getElementById("startButton").addEventListener("click", onStart);
  document.getElementById("restartButton").addEventListener("click", onRestart);
  document.getElementById("copyButton").addEventListener("click", onCopy);
  document.getElementById("saveButton").addEventListener("click", onSave);
}
