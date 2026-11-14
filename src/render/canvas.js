/** 高分屏适配的画布：内部按 devicePixelRatio 放大，绘制仍用 CSS 像素 */

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const size = { cssW: 0, cssH: 0, dpr: 1 };

  function resize() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h || size.dpr !== dpr) {
      canvas.width = w;
      canvas.height = h;
    }
    size.cssW = cssW;
    size.cssH = cssH;
    size.dpr = dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return size;
  }

  return { canvas, ctx, size, resize };
}
