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
  - **Derrapatge**: en girar, el cotxe llisca (la direcció de moviment va per darrere de
    l'orientació del cotxe).
  - Xocar amb les tanques/parets frena el cotxe (penalització de temps).
- **Objectiu**: fer **2 voltes** el més ràpid possible.
- **Dificultat**: constant (no augmenta).
- **Puntuació**: temps total (format `MM:SS`, a dalt al centre, com a les captures).
- **HUD**: cronòmetre gran a dalt + text `Vuelta X/2` a sota.
- **Final de partida**: en completar la 2a volta → panell amb el temps, nom (màx. 15 caràcters),
  rànquing top 10 (millor temps per nom) i botó "Jugar otra vez". Textos del joc en castellà.
- **Pista**: forma de L segons el dibuix de l'usuari (corbes de 90° arrodonides), es recorre en
  sentit horari vist des de dalt. Meta a la recta inferior (`FINISH_X`).
- **Xoc**: si toca la tanca, el cotxe frena (perd velocitat) i rebota una mica.
- **Càmera**: orientació fixa (no gira amb el cotxe), alta i inclinada, segueix la posició.
- **Durada de referència**: 17–20 s per a les 2 voltes jugant bé (≈8–10 s per volta).
  Ajustar mida de pista i velocitat màxima perquè quadri.

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
  Regles de seguretat a `firebase/firestore.rules` (només crear; nom 1–15; temps 14–600 s).

## Estructura de carpetes

```
/
├── index.html          # punt d'entrada, canvas + HUD + import map
├── style.css           # estils (pantalla completa, HUD, responsive)
├── src/
│   ├── main.js         # bootstrap: escena, renderer, llums, bucle principal
│   ├── trackPath.js    # traçat pur (sense Three): línia central, amplades, punt més proper
│   ├── track.js        # malles de la pista (asfalt, vorals, tanques, línia de meta)
│   ├── decor.js        # decoració: models Kenney + avets
│   ├── car.js          # física pura del cotxe (acceleració, gir, derrapatge, xoc amb tanques)
│   ├── carModel.js     # model 3D del SUV turquesa
│   ├── input.js        # teclat + tàctil -> valor de gir [-1, 1]
│   ├── camera.js       # càmera elevada d'orientació fixa que segueix el cotxe
│   ├── race.js         # estat de cursa pur: cronòmetre i voltes (progrés desenrotllat)
│   ├── hud.js          # `00:00` i `Vuelta X/2` (temps final amb centèsimes)
│   ├── endScreen.js    # panell final: temps, nom, rànquing, tornar a jugar
│   ├── ranking.js      # desar/llegir temps (Firestore REST o localStorage)
│   └── config.js       # credencials públiques de Firebase
├── firebase/firestore.rules  # regles a enganxar a la consola de Firebase
├── tools/sim.mjs       # bot sense gràfics per ajustar temps de volta: `node tools/sim.mjs`
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
- `trackPath.js` i `car.js` no importen Three.js perquè `tools/sim.mjs` funcioni amb Node.
  Després de tocar constants de física o pista, executar el sim (objectiu: bot ≈ 20–21 s / 2 voltes).
- Rutes relatives (`./assets/...`) perquè funcioni a la subruta de GitHub Pages.
- Controls:
  - Teclat: `←`/`A` esquerra, `→`/`D` dreta.
  - Tàctil: tocar/mantenir la meitat esquerra o dreta de la pantalla.
- Orientació vertical (mòbil) prioritària; ha de funcionar també en horitzontal/PC.
- No afegir menús ni sons fins que es demani explícitament (desenvolupament per passos).
  El cronòmetre, el comptador de voltes i el rànquing SÍ formen part del joc.
- Noms de jugador: sempre amb `textContent` (mai `innerHTML`) i passats per `cleanName`.
- Desplegament: GitHub Pages des de la branca `main`, arrel `/`.

## Estat / fases

1. [x] Prototip mínim: pista + cotxe movent-se amb els controls correctes.
2. [x] Voltes, cronòmetre i HUD (`00:00`, `Vuelta X/2`). La cursa comença quan acaba de carregar
   el decorat; en acabar la 2a volta el temps es congela (groc, amb centèsimes) i el cotxe s'atura.
3. [x] Pantalla de final de partida, rànquing (online/local) i reinici.
4. [ ] (Pendent de definir) menús, sons, polit.
