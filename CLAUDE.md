# CLAUDE.md — Kenney's Race

> Llegeix aquest fitxer a l'inici de cada sessió abans de tocar codi.

## Descripció del joc

Minijoc de curses per al navegador (PC i mòbil), recreació d'un joc existent.

- **Vista**: 3D, càmera elevada en diagonal (≈45°) que segueix el cotxe des de darrere/a dalt.
  Estil low-poly: gespa verda, asfalt fosc, vorals vermell/blanc, línia groga, tanques
  lilaroses arrodonides, arbres (avets), arc d'inici/meta vermell i blanc.
- **Controls**: el cotxe **accelera sol**. El jugador només gira **esquerra / dreta**
  (direcció lliure, no hi ha carrils).
- **Física**:
  - Acceleració progressiva: arrenca lent i arriba a una **velocitat màxima** que ja no augmenta.
  - **Derrapatge**: en girar, el cotxe llisca (la direcció de moviment va per darrere de
    l'orientació del cotxe).
  - Xocar amb les tanques/parets frena el cotxe (penalització de temps).
- **Objectiu**: fer **2 voltes** el més ràpid possible.
- **Dificultat**: constant (no augmenta).
- **Puntuació**: temps total (format `MM:SS`, a dalt al centre, com a les captures).
- **HUD**: cronòmetre gran a dalt + text `Vuelta X/2` a sota.
- **Final de partida**: en completar la 2a volta.
- **Durada de referència**: 17–20 s per a les 2 voltes jugant bé (≈8–10 s per volta).
  Ajustar mida de pista i velocitat màxima perquè quadri.

## Stack

- HTML + CSS + JavaScript (ES modules) **sense build step**. Es serveix tal qual a GitHub Pages.
- **Three.js** carregat per CDN amb versió fixada (import map) + `GLTFLoader` per als models Kenney.
- Sense frameworks ni dependències npm en producció.
- Gràfics: carpeta `/assets` (Kenney, llicència CC0).

## Estructura de carpetes

```
/
├── index.html          # punt d'entrada, canvas + HUD + import map
├── style.css           # estils (pantalla completa, HUD, responsive)
├── src/
│   ├── main.js         # bootstrap: escena, renderer, bucle principal
│   ├── track.js        # definició i construcció de la pista (traçat, tanques, decorat)
│   ├── car.js          # model del cotxe + física (acceleració, gir, derrapatge)
│   ├── input.js        # teclat + tàctil -> valor de gir [-1, 1]
│   ├── camera.js       # càmera de seguiment
│   ├── collision.js    # col·lisió cotxe ↔ tanques
│   ├── race.js         # voltes, checkpoints, cronòmetre  (fase posterior)
│   └── hud.js          # cronòmetre i comptador de voltes (fase posterior)
├── assets/             # models/textures Kenney (CC0), sense modificar
├── CLAUDE.md
└── README.md
```

## Convencions

- Codi i noms de variables en **anglès**; comentaris i docs breus (català o anglès).
- Un mòdul = una responsabilitat. Exportacions amb nom, sense `default`.
- Constants d'ajust de jugabilitat (velocitat màxima, acceleració, grip, etc.) agrupades
  a dalt de cada mòdul en `UPPER_SNAKE_CASE` per poder afinar fàcilment.
- Física amb `dt` (segons) limitat (p. ex. màx. 1/30) per evitar salts en pestanyes inactives.
- Rutes relatives (`./assets/...`) perquè funcioni a la subruta de GitHub Pages.
- Controls:
  - Teclat: `←`/`A` esquerra, `→`/`D` dreta.
  - Tàctil: tocar/mantenir la meitat esquerra o dreta de la pantalla.
- Orientació vertical (mòbil) prioritària; ha de funcionar també en horitzontal/PC.
- No afegir menús, sons ni puntuació fins que es demani explícitament (desenvolupament per passos).
- Desplegament: GitHub Pages des de la branca `main`, arrel `/`.

## Estat / fases

1. [ ] Prototip mínim: pista + cotxe movent-se amb els controls correctes.
2. [ ] Voltes, cronòmetre i HUD (`00:00`, `Vuelta X/2`).
3. [ ] Final de partida i reinici.
4. [ ] (Pendent de definir) menús, sons, polit.
