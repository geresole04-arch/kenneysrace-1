// Renders a track's ranking into an <ol>: every player's best time. About 10
// rows are visible; the rest scroll (finger, wheel, or mouse drag).
// Names always go through textContent.
import { fetchRanking } from './ranking.js';
import { formatFinal } from './hud.js';

const VISIBLE_ROWS = 10;

export async function renderRanking(list, collection, highlightName = null) {
  enableDragScroll(list);
  const hint = hintFor(list);
  hint.hidden = true;
  list.classList.remove('scrollable');
  list.replaceChildren(emptyRow('Cargando…'));
  try {
    const rows = await fetchRanking(collection);
    list.replaceChildren(
      ...(rows.length ? rows.map((r) => row(r, highlightName)) : [emptyRow('Todavía no hay tiempos. ¡Sé el primero!')]),
    );
    list.scrollTop = 0;
    if (rows.length > VISIBLE_ROWS) {
      hint.textContent = `▼ Desliza para ver los ${rows.length} tiempos`;
      hint.hidden = false;
      list.classList.add('scrollable');
    }
    // Bring the player's own row into view
    list.querySelector('.me')?.scrollIntoView({ block: 'nearest' });
  } catch (err) {
    console.error(err);
    list.replaceChildren(emptyRow('No se ha podido cargar el ranking'));
  }
}

function row(entry, highlightName) {
  const li = document.createElement('li');
  const name = document.createElement('span');
  name.className = 'rank-name';
  name.textContent = entry.name;
  const t = document.createElement('span');
  t.className = 'rank-time';
  t.textContent = formatFinal(entry.time);
  li.append(name, t);
  if (highlightName && entry.name.toLowerCase() === highlightName.toLowerCase()) li.classList.add('me');
  return li;
}

function emptyRow(text) {
  const li = document.createElement('li');
  li.className = 'rank-empty';
  li.textContent = text;
  return li;
}

// "▼ Desliza…" line under the list, created once.
function hintFor(list) {
  let hint = list.nextElementSibling;
  if (!hint?.classList.contains('rank-hint')) {
    hint = document.createElement('div');
    hint.className = 'rank-hint';
    list.after(hint);
  }
  return hint;
}

// Touch scrolls natively; this adds click-and-drag scrolling for the mouse.
function enableDragScroll(list) {
  if (list.dataset.drag) return;
  list.dataset.drag = '1';
  let startY = 0;
  let startTop = 0;
  let dragging = false;
  list.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    startY = e.clientY;
    startTop = list.scrollTop;
    list.setPointerCapture(e.pointerId);
    list.classList.add('dragging');
  });
  list.addEventListener('pointermove', (e) => {
    if (dragging) list.scrollTop = startTop - (e.clientY - startY);
  });
  const stop = () => {
    dragging = false;
    list.classList.remove('dragging');
  };
  list.addEventListener('pointerup', stop);
  list.addEventListener('pointercancel', stop);
}
