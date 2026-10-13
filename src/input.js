// Keyboard + touch -> steering value in [-1, 1] (-1 left, +1 right).

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);

export function createInput(target) {
  const keys = { left: false, right: false };
  const pointers = new Map(); // pointerId -> -1 | 1

  const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if (LEFT_KEYS.has(e.code)) keys.left = true;
    else if (RIGHT_KEYS.has(e.code)) keys.right = true;
    else return;
    e.preventDefault();
  });
  addEventListener('keyup', (e) => {
    if (LEFT_KEYS.has(e.code)) keys.left = false;
    if (RIGHT_KEYS.has(e.code)) keys.right = false;
  });
  addEventListener('blur', () => {
    keys.left = keys.right = false;
    pointers.clear();
  });

  // Touch / mouse: hold the left or right half of the screen
  const sideOf = (e) => (e.clientX < innerWidth / 2 ? -1 : 1);
  target.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointers.set(e.pointerId, sideOf(e));
    target.setPointerCapture?.(e.pointerId);
  });
  target.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, sideOf(e));
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    target.addEventListener(type, (e) => pointers.delete(e.pointerId));
  }
  target.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    reset() {
      keys.left = keys.right = false;
      pointers.clear();
    },
    steer() {
      let s = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      for (const v of pointers.values()) s += v;
      return Math.max(-1, Math.min(1, s));
    },
  };
}
