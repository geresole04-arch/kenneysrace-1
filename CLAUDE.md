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
  - Acceleració progressiva (corba en S, `throttleAccel`): arrenca suau, empeny més a mitja
    velocitat i s'estabilitza a la **velocitat màxima** (36 m/s), que ja no augmenta. ~5 s fins al màxim.
  - **Derrapatge** (mecànica clau): tocs curts = gir amb adherència que frena una mica
    (`STEER_SCRUB`). **Mantenir** el gir ≥ `DRIFT_ENTER` (0,16 s) entra en derrapatge: gira més
    tancat, llisca de costat sense perdre velocitat i, en deixar-lo anar, dona **turbo**
    (fins a +7 m/s) proporcional a la durada. Derrapar ha de sortir a compte: el sim ho comprova
    (bot "drift" ≪ bot "tap"). Efectes: marques de pneumàtic i flama al tub d'escapament.
  - Xocar amb les tanques/parets frena el cotxe (penalització de temps).
- **Objectiu**: fer **2 voltes** el més ràpid possible.
- **Dificultat**: constant (no augmenta).
- **Puntuació**: temps total (format `MM:SS`, a dalt al centre, com a les captures).
- **HUD**: cronòmetre gran a dalt + text `Vuelta X/2` a sota.
- **Flux**: menú principal (triar circuit, rànquing de cada circuit, millor temps personal) →
  2 s d'indicació de les zones tàctils/tecles (`intro.js`) → cursa → panell final amb temps,
  nom (màx. 15), rànquing top 10 del circuit, "Jugar otra vez" i "Menú". Botó ✕ per sortir.
  Textos del joc en castellà.
- **Circuits** (`tracks.js`): `bosque` (fàcil, forma de L de l'usuari, tema bosc) i `volcan`
  (difícil: carretera més estreta, xicana i forquilla; tema volcànic amb lava, roques i volcans).
- **Pista**: polilínia tancada amb cantonades arrodonides (radi per cantonada), sentit horari
  vist des de dalt. Meta definida per un punt (`finish`); el cotxe surt 8 m abans.
- **Xoc**: si toca la tanca, el cotxe frena (perd velocitat) i rebota una mica.
- **Càmera**: orientació fixa (no gira amb el cotxe), alta i inclinada, segueix la posició.
- **Durada de referència**: bosc ≈ 20 s per a 2 voltes jugant bé; volcà ≈ 30 s.

## Stack

- HTML + CSS + JavaScript (ES modules) **sense build step**. Es serveix tal qual a GitHub Pages.
- **Three.js r169** copiat a `lib/three/` (sense CDN, import map a `index.html`) + `GLTFLoader` per als models Kenney.
- Sense frameworks ni dependències npm en producció.
- Gràfics: Kenney **Racing Kit 2.0** (CC0), models `.glb` a `assets/models/`.
- La pista (asfalt, vorals, tanques en tub) es genera per codi seguint el traçat; els models
  Kenney s'usen per a la decoració (arc de meta, grades, carpes, fanals, banderes).
- Arbres: avets low-poly per codi (cons apilats, instanciats), 8–12 m d'alt, per quadrar
  en forma i escala amb el cotxe com a l'original (els del kit són massa diferents).
- El cotxe és un SUV low-poly estil **VW T-Cross turquesa** (4,1 × 1,78 m), fet amb primitives
  (el kit no en té). La carrosseria s'estira en alçada (`BODY_HEIGHT_SCALE`) perquè es vegi alt
  des de la càmera; les rodes (r = 0,42 m) queden fora de l'escalat.
- Font del HUD: Fredoka (Google Fonts), amb alternativa del sistema.
- **Rànquing online**: Firebase Cloud Firestore via API REST (sense SDK). Configuració a
  `src/config.js` (`projectId`, `apiKey`); si és buida, rànquing local (localStorage).
  Una col·lecció per circuit (`scores`, `scores_volcan`). Regles a `firebase/firestore.rules`
  (només crear; nom 1–15; temps 14–600 s) — cal tornar-les a publicar si s'afegeix un circuit.

## Estructura de carpetes

```
/
├── index.html          # punt d'entrada: canvas, HUD, intro, menú, panell final, import map
├── style.css           # estils (pantalla completa, HUD, panells, responsive)
├── src/
│   ├── main.js         # escena, llums, canvi de circuit, flux menú→intro→cursa→final, bucle
│   ├── tracks.js       # catàleg de circuits (dades pures: cantonades, radis, amplada, meta)
│   ├── themes.js       # colors per tema (bosc, volcà)
│   ├── trackPath.js    # geometria pura (sense Three): línia central, punt més proper, sortida
│   ├── track.js        # malles de la pista (asfalt, vorals, tanques, línia de meta)
│   ├── decor.js        # decoració per tema: models Kenney, avets / lava, roques, volcans
│   ├── car.js          # física pura del cotxe (acceleració, derrapatge, turbo, xocs)
│   ├── carModel.js     # model 3D del SUV turquesa
│   ├── effects.js      # marques de derrapatge i flama de turbo
│   ├── input.js        # teclat + tàctil -> valor de gir [-1, 1]
│   ├── camera.js       # càmera elevada d'orientació fixa que segueix el cotxe
│   ├── race.js         # estat de cursa pur: cronòmetre i voltes (progrés desenrotllat)
│   ├── hud.js          # `00:00` i `Vuelta X/2` (temps final amb centèsimes)
│   ├── intro.js        # 2 s mostrant les zones de control abans de la sortida
│   ├── menu.js         # menú principal i rànquing per circuit
│   ├── endScreen.js    # panell final: temps, nom, rànquing, tornar a jugar / menú
│   ├── rankingList.js  # pinta un top 10
│   ├── ranking.js      # desar/llegir temps (Firestore REST o localStorage), millor personal
│   └── config.js       # credencials públiques de Firebase
├── firebase/firestore.rules  # regles a enganxar a la consola de Firebase
├── tools/sim.mjs       # bots sense gràfics (drift vs tap) a tots els circuits
├── tools/checktrack.mjs # valida els traçats (arcs que hi caben, sense solapaments)
├── tools/release.mjs   # puja la versió anti-memòria cau d'index.html
├── lib/three/          # Three.js copiat (MIT)
├── assets/models/      # models .glb Kenney (CC0), sense modificar
├── CLAUDE.md
└── README.md
```

## Convencions

- Codi i noms de variables en **anglès**; comentaris i docs breus (català o anglès).
- Un mòdul = una responsabilitat. Exportacions amb nom, sense `default`.
- Constants d'ajust de jugabilitat (velocitat màxima, acceleració, grip, etc.) agrupades
  a dalt de cada mòdul en `UPPER_SNAKE_CASE` per poder afinar fàcilment.
- Física amb pas fix (1/120 s) i `dt` de frame limitat (màx. 1/30).
- `tracks.js`, `trackPath.js`, `car.js` i `race.js` no importen Three.js perquè les eines de
  `tools/` funcionin amb Node. Després de tocar física o circuits: `node tools/checktrack.mjs`
  i `node tools/sim.mjs` (bosc ≈ 20 s, volcà ≈ 30 s, i el bot "drift" molt més ràpid que "tap").
- Rutes relatives (`./assets/...`) perquè funcioni a la subruta de GitHub Pages.
- Controls:
  - Teclat: `←`/`A` esquerra, `→`/`D` dreta.
  - Tàctil: tocar/mantenir la meitat esquerra o dreta de la pantalla.
- Orientació vertical (mòbil) prioritària; ha de funcionar també en horitzontal/PC.
- No afegir sons fins que es demani explícitament (desenvolupament per passos).
- Noms de jugador: sempre amb `textContent` (mai `innerHTML`) i passats per `cleanName`.
- Desplegament: GitHub Pages des de la branca `main`, arrel `/`.
- **Abans de cada commit que canviï el joc: `node tools/release.mjs`.** Puja `VERSION` a
  `index.html` i refà la llista de mòduls de l'import map (tots amb `?v=VERSION`), perquè el
  navegador no barregi mòduls vells i nous (GitHub Pages deixa en memòria cau 10 min).
  Per això `index.html` no té `<script type="module">` ni `<link>` d'estils fixos.

## Estat / fases

1. [x] Prototip mínim: pista + cotxe movent-se amb els controls correctes.
2. [x] Voltes, cronòmetre i HUD (`00:00`, `Vuelta X/2`). La cursa comença quan acaba de carregar
   el decorat; en acabar la 2a volta el temps es congela (groc, amb centèsimes) i el cotxe s'atura.
3. [x] Pantalla de final de partida, rànquing (online/local) i reinici.
4. [x] Derrapatge amb turbo, indicació de controls, menú principal, circuit Volcà + rànquing.
5. [ ] (Pendent de definir) sons, polit.
