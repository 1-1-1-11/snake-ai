import { GRID_SIZE, moods, SOURCE_LABELS, themes } from "./constants.mjs";

export function createRenderer() {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const tileSize = canvas.width / GRID_SIZE;

  const elements = {
    root: document.documentElement,
    boardShell: document.getElementById("boardShell"),
    overlay: document.getElementById("overlay"),
    overlayTag: document.getElementById("overlayTag"),
    overlayTitle: document.getElementById("overlayTitle"),
    overlayText: document.getElementById("overlayText"),
    aiStatus: document.getElementById("aiStatus"),
    themeLabel: document.getElementById("themeLabel"),
    score: document.getElementById("score"),
    statusText: document.getElementById("statusText"),
    moodText: document.getElementById("moodText"),
    targetWord: document.getElementById("targetWord"),
    liveLine: document.getElementById("liveLine"),
    startButton: document.getElementById("startButton"),
    copyButton: document.getElementById("copyButton"),
    saveButton: document.getElementById("saveButton"),
    currentCard: document.getElementById("currentCard"),
    currentImage: document.getElementById("currentImage"),
    currentArtPlaceholder: document.getElementById("currentArtPlaceholder"),
    placeholderWord: document.getElementById("placeholderWord"),
    artFrame: document.getElementById("artFrame"),
    fragmentMeta: document.getElementById("fragmentMeta"),
    fragmentWord: document.getElementById("fragmentWord"),
    fragmentLine: document.getElementById("fragmentLine"),
    poemList: document.getElementById("poemList"),
    galleryGrid: document.getElementById("galleryGrid"),
  };

  function applyMood(moodKey) {
    const palette = moods[moodKey];

    elements.root.style.setProperty("--bg-top", palette.bgTop);
    elements.root.style.setProperty("--bg-bottom", palette.bgBottom);
    elements.root.style.setProperty("--text", palette.text);
    elements.root.style.setProperty("--muted", palette.muted);
    elements.root.style.setProperty("--accent", palette.accent);
    elements.root.style.setProperty("--accent-soft", palette.accentSoft);
    elements.root.style.setProperty("--accent-warm", palette.accentWarm);
    elements.root.style.setProperty("--snake", palette.snake);
    elements.root.style.setProperty("--snake-head", palette.snakeHead);
    elements.root.style.setProperty("--board-top", palette.boardTop);
    elements.root.style.setProperty("--board-bottom", palette.boardBottom);
    elements.root.style.setProperty("--grid", palette.grid);
    elements.root.style.setProperty("--glow", palette.glow);
    elements.moodText.textContent = palette.label;
  }

  function renderHUD(runtime, aiConfig, uiState) {
    elements.aiStatus.textContent = aiConfig.label;
    elements.aiStatus.title = aiConfig.note || "";
    elements.themeLabel.textContent = themes[runtime.themeKey].label;
    elements.score.textContent = runtime.score;
    elements.statusText.textContent = uiState.statusText;
    elements.targetWord.textContent = runtime.food?.word || "词";
    elements.liveLine.textContent = uiState.liveLine;
    elements.startButton.disabled = runtime.gameState === "running" || runtime.gameState === "booting" || !runtime.food;
    elements.copyButton.disabled = runtime.fragments.length === 0;
    elements.saveButton.disabled = runtime.fragments.length === 0;
  }

  function renderOverlay({ tag, title, text, visible }) {
    elements.overlayTag.textContent = tag;
    elements.overlayTitle.textContent = title;
    elements.overlayText.textContent = text;
    elements.overlay.classList.toggle("hidden", !visible);
  }

  function renderThemeButtons(themeKey) {
    Array.from(document.querySelectorAll("[data-theme]")).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.theme === themeKey);
    });
  }

  function renderCurrentFragment(runtime) {
    const fragment = runtime.fragments[0];

    if (!fragment) {
      elements.currentCard.dataset.state = "empty";
      elements.fragmentMeta.textContent = "等待第一个词";
      elements.fragmentWord.textContent = "还没落笔";
      elements.fragmentLine.textContent = "先吃掉一个词，右侧只显示当前最新的 AI 结果，避免注意力被历史内容拉走。";
      elements.artFrame.classList.remove("is-loading");
      elements.currentImage.hidden = true;
      elements.currentArtPlaceholder.hidden = false;
      elements.placeholderWord.textContent = "词";
      return;
    }

    elements.currentCard.dataset.state = fragment.status;
    elements.fragmentMeta.textContent = fragment.status === "pending"
      ? "AI 正在生成"
      : fragment.error
        ? "已回退到本地兜底"
        : `${SOURCE_LABELS[fragment.textSource] || "AI"} 片段`;
    elements.fragmentWord.textContent = fragment.word;
    elements.fragmentLine.textContent = fragment.line;
    elements.placeholderWord.textContent = fragment.word;
    elements.artFrame.classList.toggle("is-loading", fragment.status === "pending");

    if (fragment.imageDataUrl) {
      elements.currentImage.src = fragment.imageDataUrl;
      elements.currentImage.hidden = false;
      elements.currentArtPlaceholder.hidden = true;
    } else {
      elements.currentImage.hidden = true;
      elements.currentArtPlaceholder.hidden = false;
    }
  }

  function renderPoemList(runtime) {
    elements.poemList.innerHTML = "";

    if (runtime.fragments.length === 0) {
      elements.poemList.innerHTML = '<li class="placeholder">本局的诗句会按时间顺序收在这里。</li>';
      return;
    }

    runtime.fragments.forEach((fragment) => {
      const item = document.createElement("li");
      item.className = "poem-item";
      item.innerHTML = `
        <span class="poem-word">${fragment.word}</span>
        <p>${fragment.status === "pending" ? "AI 正在围绕这个词落笔。" : fragment.line}</p>
      `;
      elements.poemList.appendChild(item);
    });
  }

  function renderGallery(runtime) {
    elements.galleryGrid.innerHTML = "";

    if (runtime.fragments.length === 0) {
      elements.galleryGrid.innerHTML = '<div class="gallery-empty">AI 生成的图像会逐步出现在这里。</div>';
      return;
    }

    runtime.fragments.forEach((fragment) => {
      const card = document.createElement("article");
      card.className = "gallery-card";

      if (fragment.imageDataUrl) {
        card.innerHTML = `
          <img src="${fragment.imageDataUrl}" alt="${fragment.word} 的生成图像">
          <footer>
            <strong>${fragment.word}</strong>
            <span>${SOURCE_LABELS[fragment.imageSource] || "图像已生成"}</span>
          </footer>
        `;
      } else {
        card.innerHTML = `
          <div class="gallery-fallback">${fragment.word}</div>
          <footer>
            <strong>${fragment.word}</strong>
            <span>${fragment.status === "pending" ? "正在作画" : "暂时没有图像"}</span>
          </footer>
        `;
      }

      elements.galleryGrid.appendChild(card);
    });
  }

  function triggerImpact() {
    elements.boardShell.classList.remove("is-impact");
    void elements.boardShell.offsetWidth;
    elements.boardShell.classList.add("is-impact");
  }

  function triggerWordChip() {
    elements.targetWord.classList.remove("is-pop");
    void elements.targetWord.offsetWidth;
    elements.targetWord.classList.add("is-pop");
  }

  function drawScene(runtime, now) {
    drawBoard(ctx, canvas, runtime.moodKey, tileSize, now);
    drawFood(ctx, runtime.food, runtime.moodKey, tileSize, now);
    drawSnake(ctx, runtime.snake, runtime.direction, runtime.moodKey, tileSize);
    drawEffects(ctx, runtime.effects, now);
  }

  return {
    applyMood,
    drawScene,
    renderCurrentFragment,
    renderGallery,
    renderHUD,
    renderOverlay,
    renderPoemList,
    renderThemeButtons,
    triggerImpact,
    triggerWordChip,
  };
}

function drawBoard(ctx, canvas, moodKey, tileSize, now) {
  const palette = moods[moodKey];
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, palette.boardTop);
  gradient.addColorStop(1, palette.boardBottom);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glowX = canvas.width * (0.5 + Math.sin(now / 1700) * 0.18);
  const glowY = canvas.height * (0.3 + Math.cos(now / 2100) * 0.12);
  const glow = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, 170);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;

  for (let line = 0; line <= GRID_SIZE; line += 1) {
    const offset = line * tileSize;

    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(canvas.width, offset);
    ctx.stroke();
  }
}

function drawSnake(ctx, snake, direction, moodKey, tileSize) {
  const palette = moods[moodKey];

  snake.forEach((segment, index) => {
    const x = segment.x * tileSize + 3;
    const y = segment.y * tileSize + 3;
    const size = tileSize - 6;

    ctx.fillStyle = index === 0 ? palette.snakeHead : palette.snake;
    roundRect(ctx, x, y, size, size, index === 0 ? 10 : 8);
    ctx.fill();

    if (index === 0) {
      drawSnakeFace(ctx, direction, x, y, size, palette.text);
    }
  });
}

function drawSnakeFace(ctx, direction, x, y, size, eyeColor) {
  ctx.fillStyle = eyeColor;

  const front = size * 0.24;
  const side = size * 0.28;
  const eyeSize = 3.5;
  let eyes;

  if (direction.x === 1) {
    eyes = [
      { x: x + size - front, y: y + side },
      { x: x + size - front, y: y + size - side },
    ];
  } else if (direction.x === -1) {
    eyes = [
      { x: x + front, y: y + side },
      { x: x + front, y: y + size - side },
    ];
  } else if (direction.y === -1) {
    eyes = [
      { x: x + side, y: y + front },
      { x: x + size - side, y: y + front },
    ];
  } else {
    eyes = [
      { x: x + side, y: y + size - front },
      { x: x + size - side, y: y + size - front },
    ];
  }

  ctx.beginPath();
  ctx.arc(eyes[0].x, eyes[0].y, eyeSize, 0, Math.PI * 2);
  ctx.arc(eyes[1].x, eyes[1].y, eyeSize, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood(ctx, food, moodKey, tileSize, now) {
  if (!food) {
    return;
  }

  const palette = moods[moodKey];
  const centerX = food.x * tileSize + tileSize / 2;
  const centerY = food.y * tileSize + tileSize / 2;
  const scale = 1 + Math.sin(now / 220) * 0.06;
  const size = tileSize - 10;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = food.magic ? 24 : 16;
  ctx.fillStyle = food.magic ? palette.accentWarm : "rgba(255, 255, 255, 0.92)";
  roundRect(ctx, centerX - size / 2, centerY - size / 2, size, size, 10);
  ctx.fill();

  if (food.magic) {
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    roundRect(ctx, centerX - size / 2, centerY - size / 2, size, size, 10);
    ctx.stroke();
  }

  ctx.fillStyle = "#101010";
  ctx.font = `700 ${food.word.length > 1 ? 13 : 16}px "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(food.word, centerX, centerY + 0.5);
  ctx.restore();
}

function drawEffects(ctx, effects, now) {
  effects.forEach((effect) => {
    const progress = (now - effect.start) / 720;

    if (progress < 0 || progress > 1) {
      return;
    }

    const alpha = 1 - progress;
    const radius = 14 + 44 * progress;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = '700 18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(effect.word, effect.x, effect.y - progress * 40);
    ctx.restore();
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
