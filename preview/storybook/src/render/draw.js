/** Canvas 2D 绘制小工具（使用 CSS 像素坐标，调用方已按 DPR 缩放上下文） */

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRoundRect(ctx, x, y, w, h, r, fill) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

export function fillEllipse(ctx, cx, cy, rx, ry, fill) {
  ellipse(ctx, cx, cy, rx, ry);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawEmoji(ctx, emoji, x, y, size) {
  ctx.save();
  ctx.font = `${size}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Sans CJK SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
  ctx.restore();
}

export function drawText(ctx, text, x, y, { size = 14, color = '#2a2418', align = 'center', baseline = 'middle', weight = '600', shadow = false } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px "Noto Sans CJK SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
