// On-screen timer ("00:09") and lap counter ("Vuelta 1/2"), like the original.
import { TOTAL_LAPS } from './race.js';

export function createHud(root) {
  root.innerHTML = '<div class="hud-time">00:00</div><div class="hud-lap"></div>';
  const timeEl = root.querySelector('.hud-time');
  const lapEl = root.querySelector('.hud-lap');
  let lastTime = '';
  let lastLap = '';

  return {
    update(race) {
      const t = race.state === 'finished' ? formatFinal(race.time) : formatTime(race.time);
      const l = `Vuelta ${race.lap}/${TOTAL_LAPS}`;
      if (t !== lastTime) timeEl.textContent = lastTime = t;
      if (l !== lastLap) lapEl.textContent = lastLap = l;
      root.classList.toggle('finished', race.state === 'finished');
    },
  };
}

function formatTime(t) {
  const s = Math.floor(t);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

// Final time keeps hundredths so close runs can be compared.
export function formatFinal(t) {
  const cs = Math.round(t * 100); // integer hundredths avoid float rounding (19.53 -> "52")
  return `${formatTime(Math.floor(cs / 100))}.${pad(cs % 100)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}
