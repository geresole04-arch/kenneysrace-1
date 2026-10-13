// Pre-race hint: for INTRO_TIME seconds the two touch zones (left/right half
// of the screen) are highlighted, with the keyboard keys on desktop.
export const INTRO_TIME = 2;

export function createIntro(root) {
  const keys = matchMedia('(pointer: fine)').matches;
  root.innerHTML = `
    <div class="intro-zone intro-left">
      <div class="intro-arrow">◀</div>
      <div class="intro-label">IZQUIERDA</div>
      ${keys ? '<div class="intro-keys">← / A</div>' : ''}
    </div>
    <div class="intro-zone intro-right">
      <div class="intro-arrow">▶</div>
      <div class="intro-label">DERECHA</div>
      ${keys ? '<div class="intro-keys">→ / D</div>' : ''}
    </div>
    <div class="intro-tip">${keys ? 'Mantén la tecla' : 'Mantén pulsado'} para derrapar</div>`;
  let timer = 0;
  return {
    show() {
      root.hidden = false;
      root.classList.remove('fade');
      timer = INTRO_TIME;
    },
    hide() {
      root.hidden = true;
    },
    // Returns true when the intro has just finished.
    update(dt) {
      if (root.hidden) return false;
      timer -= dt;
      if (timer < 0.35) root.classList.add('fade');
      if (timer <= 0) {
        root.hidden = true;
        return true;
      }
      return false;
    },
  };
}
