import { moods, themes, SOURCE_LABELS } from "./constants.mjs";

export function composeCreationText({ runtime, seed }) {
  const title = `${themes[runtime.themeKey].label}路${runtime.fragments
    .slice()
    .reverse()
    .slice(-3)
    .map((fragment) => fragment.word)
    .join("") || "未命名长卷"}`;
  const body = runtime.fragments
    .slice()
    .reverse()
    .map((fragment) => fragment.line)
    .join("\n");

  return `《${title}》\n主题：${themes[runtime.themeKey].label}\n情绪：${moods[runtime.moodKey].label}\n分数：${runtime.score}\n\n${body || "这一局还没有生成诗句。"}\n\n开场灵感：${seed || "未填写"}`;
}

export async function savePoster({ runtime, aiConfig, seed }) {
  const poster = document.createElement("canvas");
  const posterCtx = poster.getContext("2d");
  const width = 1200;
  const poemLines = runtime.fragments.slice().reverse().map((fragment) => fragment.line);
  const wrappedLines = poemLines.flatMap((line) => wrapTextByCount(line, 20));
  const artworkFragments = runtime.fragments.slice(0, 4);
  const height = Math.max(1500, 900 + wrappedLines.length * 42);
  const palette = moods[runtime.moodKey];
  const loadedImages = await Promise.all(
    artworkFragments.map(async (fragment) => ({
      fragment,
      image: fragment.imageDataUrl ? await loadImage(fragment.imageDataUrl).catch(() => null) : null,
    })),
  );

  poster.width = width;
  poster.height = height;

  const background = posterCtx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, palette.bgTop);
  background.addColorStop(1, palette.bgBottom);
  posterCtx.fillStyle = background;
  posterCtx.fillRect(0, 0, width, height);

  posterCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
  drawRoundRect(posterCtx, 64, 64, width - 128, height - 128, 32);
  posterCtx.fill();

  posterCtx.fillStyle = palette.text;
  posterCtx.font = '700 64px "Georgia", "SimSun", serif';
  posterCtx.fillText(themes[runtime.themeKey].label, 110, 160);

  posterCtx.font = '500 28px "Segoe UI", "Microsoft YaHei", sans-serif';
  posterCtx.fillStyle = palette.muted;
  posterCtx.fillText(`分数：${runtime.score}    情绪：${palette.label}    AI：${SOURCE_LABELS[aiConfig.provider] || "本地"}`, 110, 214);
  posterCtx.fillText(`开场灵感：${seed || "未填写"}`, 110, 258);

  loadedImages.forEach(({ fragment, image }, index) => {
    const x = 110 + (index % 2) * 430;
    const y = 320 + Math.floor(index / 2) * 250;

    drawRoundRect(posterCtx, x, y, 380, 220, 28);
    posterCtx.save();
    posterCtx.clip();

    if (image) {
      posterCtx.drawImage(image, x, y, 380, 220);
    } else {
      const fallback = posterCtx.createLinearGradient(x, y, x + 380, y + 220);
      fallback.addColorStop(0, palette.accentSoft);
      fallback.addColorStop(1, "rgba(255, 255, 255, 0.12)");
      posterCtx.fillStyle = fallback;
      posterCtx.fillRect(x, y, 380, 220);
      posterCtx.fillStyle = palette.text;
      posterCtx.font = '700 42px "Segoe UI", "Microsoft YaHei", sans-serif';
      posterCtx.fillText(fragment.word, x + 160, y + 125);
    }

    posterCtx.restore();
    posterCtx.fillStyle = palette.text;
    posterCtx.font = '700 26px "Segoe UI", "Microsoft YaHei", sans-serif';
    posterCtx.fillText(fragment.word, x + 18, y + 208);
  });

  const poemStartY = 860;
  posterCtx.fillStyle = palette.text;
  posterCtx.font = '600 34px "Segoe UI", "Microsoft YaHei", sans-serif';
  posterCtx.fillText("本局生成的诗", 110, poemStartY);

  posterCtx.font = '500 28px "Segoe UI", "Microsoft YaHei", sans-serif';
  let cursorY = poemStartY + 56;

  wrappedLines.forEach((line) => {
    posterCtx.fillText(line, 110, cursorY);
    cursorY += 40;
  });

  const link = document.createElement("a");
  link.href = poster.toDataURL("image/png");
  link.download = `ai-poetry-snake-${Date.now()}.png`;
  link.click();
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (/^https?:\/\//.test(source)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function wrapTextByCount(text, maxLength) {
  const lines = [];
  let current = "";

  for (const char of text) {
    current += char;

    if (current.length >= maxLength) {
      lines.push(current);
      current = "";
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawRoundRect(context, x, y, width, height, radius) {
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
