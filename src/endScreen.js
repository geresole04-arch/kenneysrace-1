// End-of-race panel: final time, name entry (max 15 chars), the track's
// top-10 ranking, "play again" and "menu". Texts in Spanish like the HUD.
import { NAME_MAX, isOnline, cleanName, roundTime, submitScore, loadName, saveBest } from './ranking.js';
import { renderRanking } from './rankingList.js';
import { formatFinal } from './hud.js';

export function createEndScreen(root, { onRestart, onMenu }) {
  root.innerHTML = `
    <div class="panel">
      <div class="end-title">¡META!</div>
      <div class="end-track"></div>
      <div class="end-time"></div>
      <div class="end-record" hidden>¡Nuevo récord personal!</div>
      <form class="end-form">
        <input class="end-name" type="text" maxlength="${NAME_MAX}" placeholder="Tu nombre"
          autocomplete="nickname" enterkeyhint="send" spellcheck="false" aria-label="Nombre">
        <button class="btn" type="submit">Guardar</button>
      </form>
      <div class="end-msg" role="status"></div>
      <div class="rank-title">Ranking${isOnline ? '' : ' <small>(solo este dispositivo)</small>'}</div>
      <ol class="rank-list"></ol>
      <div class="btn-row">
        <button class="btn btn-ghost end-menu" type="button">Menú</button>
        <button class="btn btn-red end-restart" type="button">Jugar otra vez</button>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const form = $('.end-form');
  const input = $('.end-name');
  const save = form.querySelector('button');
  const msg = $('.end-msg');
  const list = $('.rank-list');
  let time = 0;
  let track = null;

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
      const saved = await submitScore(track.collection, name, time);
      msg.textContent = saved.improved
        ? '¡Tiempo guardado!'
        : `Tu mejor tiempo (${formatFinal(saved.best)}) sigue en el ranking`;
      form.hidden = true;
      await renderRanking(list, track.collection, saved.name);
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se ha podido guardar. Inténtalo otra vez.';
      save.disabled = input.disabled = false;
    }
  });

  const hide = () => (root.hidden = true);
  $('.end-restart').addEventListener('click', () => {
    hide();
    onRestart();
  });
  $('.end-menu').addEventListener('click', () => {
    hide();
    onMenu();
  });

  return {
    show(raceTime, trackDef) {
      time = roundTime(raceTime);
      track = trackDef;
      $('.end-track').textContent = `${trackDef.name} · ${trackDef.subtitle}`;
      $('.end-time').textContent = formatFinal(time);
      $('.end-record').hidden = !saveBest(trackDef.id, time);
      form.hidden = false;
      save.disabled = input.disabled = false;
      input.value = loadName();
      msg.textContent = '';
      root.hidden = false;
      renderRanking(list, track.collection);
      // Don't pop the mobile keyboard automatically; focus only with a real keyboard
      if (matchMedia('(pointer: fine)').matches) input.focus();
    },
    hide,
  };
}
