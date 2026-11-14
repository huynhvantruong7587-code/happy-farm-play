/** The root has origin 0 0 and only a clockwise quarter-turn in portrait.
 * Inverse of viewport = (viewportWidth - localY, localX).
 * All canvas gestures share this mapping; DOM buttons use browser hit testing.
 */
const root = document.getElementById('app');
export const isPortraitRotated = () => root.dataset.rotated === 'true';
export function mapInput(clientX, clientY) {
  const rect = root.getBoundingClientRect();
  return isPortraitRotated()
    ? { x: clientY - rect.top, y: rect.right - clientX }
    : { x: clientX - rect.left, y: clientY - rect.top };
}
export function canvasInput(canvas, clientX, clientY) {
  const p = mapInput(clientX, clientY);
  // offsetParent coordinates are untransformed CSS pixels.
  let element = canvas;
  while (element && element !== root) {
    p.x -= element.offsetLeft;
    p.y -= element.offsetTop;
    element = element.offsetParent;
  }
  return p;
}
export function bindLandscape(onResize) {
  const update = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const rotated = height > width;
    root.dataset.rotated = String(rotated);
    root.style.width = `${rotated ? height : width}px`;
    root.style.height = `${rotated ? width : height}px`;
    root.style.left = `${(viewport?.offsetLeft || 0) + (rotated ? width : 0)}px`;
    root.style.top = `${viewport?.offsetTop || 0}px`;
    onResize();
  };
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  update();
}
