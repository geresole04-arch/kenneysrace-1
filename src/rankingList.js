// Renders a track's top-10 into an <ol>. Names always go through textContent.
import { fetchRanking } from './ranking.js';
import { formatFinal } from './hud.js';

export async function renderRanking(list, collection, highlightName = null) {
  list.replaceChildren(emptyRow('Cargando…'));
  try {
    const rows = await fetchRanking(collection);
    list.replaceChildren(
      ...(rows.length ? rows.map((r) => row(r, highlightName)) : [emptyRow('Todavía no hay tiempos. ¡Sé el primero!')]),
    );
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
