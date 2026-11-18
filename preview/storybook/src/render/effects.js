import { canvasInput } from '../ui/inputMap.js?v=0019904d88fd';
import { drawEmoji, drawText, fillEllipse } from './draw.js?v=0019904d88fd';
import { toScreen } from './farmView.js?v=0019904d88fd';

export function createEffects() {
  const effects = [];
  return {
    add(type, plot, crop) { effects.push({ type, x: plot.cx, y: plot.cy, crop, start: performance.now() }); },
    draw(ctx, layout, time, canvas, target) {
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i], t = (time - e.start) / (e.type === 'plant' ? 650 : 1100);
        if (t >= 1) { effects.splice(i, 1); continue; }
        const from = toScreen(e.x, e.y - 20, layout);
        ctx.save();
        if (e.type === 'plant') {
          ctx.globalAlpha = 1 - t;
          for (let j = 0; j < 8; j++) {
            const a = j * 2.4;
            fillEllipse(ctx, from.x + Math.cos(a) * 35 * Math.sin(t * Math.PI), from.y - 55 * (1 - t) + Math.sin(a) * 12 * t, 3, 5, '#ffe9a5');
          }
        } else {
          const r = target.getBoundingClientRect();
          const end = canvasInput(canvas, r.left + r.width / 2, r.top + r.height / 2);
          const u = Math.max(0, (t - .2) / .8), ease = u * u;
          drawEmoji(ctx, e.crop.emoji, from.x + (end.x - from.x) * ease, from.y + (end.y - from.y) * ease - Math.sin(t * Math.PI) * 85, 42 * (1 - .55 * ease));
          ctx.globalAlpha = 1 - t;
          drawText(ctx, `+1${e.crop.name}  +${e.crop.xp}经验`, from.x, from.y - 28 - t * 45, { size: 14, color: '#fff4b5', shadow: true });
        }
        ctx.restore();
      }
    },
  };
}
