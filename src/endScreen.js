// End-of-race panel: final time, name entry (max 15 chars), top-10 ranking
// and "play again". Texts in Spanish to match the in-game HUD.
import { NAME_MAX, isOnline, cleanName, roundTime, submitScore, fetchRanking, loadName } from './ranking.js';
import { formatFinal } from './hud.js';

export function createEndScreen(root, { onRestart }) {
  root.innerHTML = `
    <div class="end-panel">
      <div class="end-title">¡META!</div>
      <div class="end-time"></div>
      <form class="end-form">
        <input class="end-name" type="text" maxlength="${NAME_MAX}" placeholder="Tu nombre"
          autocomplete="nickname" enterkeyhint="send" spellcheck="false" aria-label="Nombre">
        <button class="end-save" type="submit">Guardar</button>
      </form>
      <div class="end-msg" role="status"></div>
      <div class="end-ranking-title">Ranking${isOnline ? '' : ' <small>(solo este dispositivo)</small>'}</div>
      <ol class="end-ranking"></ol>
      <button class="end-restart" type="button">Jugar otra vez</button>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const form = $('.end-form');
  const input = $('.end-name');
  const save = $('.end-save');
  const msg = $('.end-msg');
  const list = $('.end-ranking');
  let time = 0;
  let saved = null;

  input.addEventListener('input', () => {
    // Enforce 15 characters even for emoji / composed input
    const chars = Array.from(input.value);
    if (chars.length > NAME_MAX) input.value = chars.slice(0, NAME_MAX).join('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = cleanName(input.value);
    if (!name) {
      msg.textContent = 'Escribe un nombre (máx. 15 caracteres)';
      return;
    }
    save.disabled = input.disabled = true;
    msg.textContent = 'Guardando…';
    try {
      saved = await submitScore(name, time);
      msg.textContent = '¡Tiempo guardado!';
      form.hidden = true;
      await refresh();
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se ha podido guardar. Inténtalo otra vez.';
      save.disabled = input.disabled = false;
    }
  });

  $('.end-restart').addEventListener('click', () => {
    hide();
    onRestart();
  });

  async function refresh() {
    list.innerHTML = '<li class="end-empty">Cargando…</li>';
    try {
      const rows = await fetchRanking();
      list.replaceChildren(
        ...(rows.length ? rows.map(row) : [emptyRow('Todavía no hay tiempos. ¡Sé el primero!')]),
      );
    } catch (err) {
      console.error(err);
      list.replaceChildren(emptyRow('No se ha podido cargar el ranking'));
    }
  }

  function row(entry) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'end-row-name';
    name.textContent = entry.name;
    const t = document.createElement('span');
    t.className = 'end-row-time';
    t.textContent = formatFinal(entry.time);
    li.append(name, t);
    if (saved && entry.name.toLowerCase() === saved.name.toLowerCase()) li.classList.add('me');
    return li;
  }

  function emptyRow(text) {
    const li = document.createElement('li');
    li.className = 'end-empty';
    li.textContent = text;
    return li;
  }

  function hide() {
    root.hidden = true;
  }

  return {
    show(raceTime) {
      time = roundTime(raceTime);
      saved = null;
      $('.end-time').textContent = formatFinal(time);
      form.hidden = false;
      save.disabled = input.disabled = false;
      input.value = loadName();
      msg.textContent = '';
      root.hidden = false;
      refresh();
      // Don't pop the mobile keyboard automatically; focus only with a real keyboard
      if (matchMedia('(pointer: fine)').matches) input.focus();
    },
    hide,
  };
}
