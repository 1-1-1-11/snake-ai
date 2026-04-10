import test from "node:test";
import assert from "node:assert/strict";

import { createInitialRuntime, enqueueDirection, placeFood, stepRuntime } from "../../js/runtime.mjs";

test("enqueueDirection rejects opposite movement", () => {
  const runtime = createInitialRuntime("fairytale", 1);
  const queue = enqueueDirection([], runtime.direction, "ArrowLeft");

  assert.equal(queue.length, 0);
});

test("stepRuntime eats food and increases score", () => {
  const runtime = createInitialRuntime("fairytale", 1);
  runtime.food = { x: 7, y: 8, word: "鹿" };

  const stepped = stepRuntime(runtime);

  assert.equal(stepped.result, "ate");
  assert.equal(stepped.runtime.score, 1);
  assert.equal(stepped.consumedWord.word, "鹿");
});

test("placeFood returns win when board is full", () => {
  const runtime = createInitialRuntime("fairytale", 1);
  runtime.snake = [];

  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      runtime.snake.push({ x, y });
    }
  }

  const placed = placeFood(runtime);

  assert.equal(placed.won, true);
  assert.equal(placed.food, null);
});
