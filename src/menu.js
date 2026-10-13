// Main menu: pick a track, see your best time and each track's ranking.
import { TRACKS } from './tracks.js';
import { isOnline, loadBest } from './ranking.js';
import { renderRanking } from './rankingList.js';
import { formatFinal } from './hud.js';

export function createMenu(root, { onPlay, onPreview }) {
  root.innerHTML = `
    <div class="panel menu-panel">
      <div class="menu-title">KENNEY'S<br>RACE</div>
      <div class="menu-tracks"></div>
      <div class="menu-help">Mantén pulsado para derrapar: ¡al soltar ganas turbo!</div>
    </div>
    <div class="panel rank-panel" hidden>
      <div class="rank-title"></div>
      <ol class="rank-list"></ol>
      <button class="btn btn-ghost rank-back" type="button">Volver</button>
    </div>`;
  const menuPanel = root.querySelector('.menu-panel');
  const rankPanel = root.querySelector('.rank-panel');
  const cards = root.querySelector('.menu-tracks');

  for (const t of TRACKS) {
    const card = document.createElement('div');
    card.className = `track-card theme-${t.theme}`;
    card.innerHTML = `
      <div class="track-info">
        <div class="track-name"></div>
        <div class="track-sub"></div>
        <div class="track-best"></div>
      </div>
      <div class="track-buttons">
        <button class="btn track-play" type="button">Jugar</button>
        <button class="btn btn-ghost track-rank" type="button">Ranking</button>
      </div>`;
    card.querySelector('.track-name').textContent = t.name;
    card.querySelector('.track-sub').textContent = t.subtitle;
    card.dataset.id = t.id;
    card.querySelector('.track-play').addEventListener('click', () => onPlay(t.id));
    card.querySelector('.track-rank').addEventListener('click', () => showRanking(t));
    card.addEventListener('pointerenter', () => onPreview?.(t.id));
    cards.append(card);
  }

  function showRanking(t) {
    menuPanel.hidden = true;
    rankPanel.hidden = false;
    rankPanel.querySelector('.rank-title').innerHTML = `Ranking · ${t.name}${isOnline ? '' : ' <small>(solo este dispositivo)</small>'}`;
    renderRanking(rankPanel.querySelector('.rank-list'), t.collection);
  }

  root.querySelector('.rank-back').addEventListener('click', () => {
    rankPanel.hidden = true;
    menuPanel.hidden = false;
  });

  return {
    show() {
      for (const card of cards.children) {
        const best = loadBest(card.dataset.id);
        card.querySelector('.track-best').textContent = best ? `Tu mejor: ${formatFinal(best)}` : 'Sin tiempo';
      }
      rankPanel.hidden = true;
      menuPanel.hidden = false;
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
