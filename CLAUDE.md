# CLAUDE.md — Kenney Solé's Race

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
- **Objectiu**: fer les voltes del circuit (2 per defecte; `laps` a `tracks.js`, Mònaco 1) el
  més ràpid possible.
- **Dificultat**: constant (no augmenta).
- **Puntuació**: temps total (format `MM:SS`, a dalt al centre, com a les captures).
- **HUD**: cronòmetre gran a dalt + text `Vuelta X/2` a sota.
- **Flux**: menú principal (triar circuit, rànquing de cada circuit, millor temps personal) →
  2 s d'indicació de les zones tàctils/tecles (`intro.js`) → cursa → panell final amb temps,
  nom (màx. 15), rànquing top 10 del circuit, "Jugar otra vez" i "Menú". Botó ✕ per sortir.
  Textos del joc en castellà.
- **Títol** al menú: "KENNEY SOLÉ'S RACE".
- **Circuits** (`tracks.js`, en ordre de dificultat): `bosque` (fàcil, forma de L de l'usuari,
  tema bosc), `cielo` (mitjana: revolts tancats sobre un mar de núvols, arcs de Sant Martí —un
  fa de porta sobre la pista— i globus) i `volcan` (difícil: carretera estreta, xicana i
  forquilla; lava, roques i volcans) i `monaco` ("Mónaco", expert, **1 volta**, ~800 m: traçat
  de la imatge de l'usuari simplificat —recta llarga, pujada del Casino, forquilla, revolt del
  túnel, xicana del port, piscina i Rascasse—; tema `city`: port amb iots, edificis pastel amb
  teulades de teula, palmeres i grades) i `nurburgring` ("Nürburgring", llegenda, **1 volta**,
  ~2,9 km: el Nordschleife del mapa de l'usuari sense la part GP, amb els revolts emblemàtics
  tancats perquè derrapar compensi; tema `eifel`: "Infern Verd" amb ~2000 avets al llarg de la
  pista, castell de Nürburg al mig, turons i grades a la Döttinger Höhe).
- **Rànquing**: es mostren TOTS els jugadors (millor temps de cadascun); ~10 files visibles i la
  resta es desplaça amb el dit, la roda o arrossegant amb el ratolí (`rankingList.js`).
- **Cotxe encallat**: si està gairebé aturat 2 s (`STUCK_TIME`), fa marxa enrere sol ~0,9 s
  encarant el morro cap a la pista.
- **Pista**: polilínia tancada amb cantonades arrodonides (radi per cantonada, o `maxRadius`
  perquè es calculin sols segons l'espai), sentit horari vist des de dalt. Meta definida per un
  punt (`finish`); el cotxe surt 8 m abans. `track.nearest()` busca primer a prop de l'última
  resposta (finestra) i, si no, fa una passada grollera + refinament (circuits llargs).
- **Xoc**: si toca la tanca, el cotxe frena (perd velocitat) i rebota una mica.
- **Càmera**: orientació fixa (no gira amb el cotxe), alta i inclinada, segueix la posició.
- **Durada de referència** (bot drift): bosc ≈ 20 s, cel ≈ 25 s, volcà ≈ 30 s, Mònaco ≈ 30 s
  (persona: 31–35 s), Nürburgring ≈ 1:29 (el més ràpid possible ~1:30).

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
  Una col·lecció per circuit (`scores`, `scores_cielo`, `scores_volcan`, `scores_monaco`,
  `scores_nurburgring`) i **un document per
  jugador** (`p_<nom en minúscules>`) amb el seu millor temps: llegir el rànquing costa una
  lectura per jugador (quota gratuïta: 50.000 lectures/dia). Regles a `firebase/firestore.rules`
  (crear vàlid; actualitzar només amb un temps millor; nom 1–15; temps 14–600 s). **Cal tornar-les
  a publicar a la consola cada cop que s'afegeix un circuit.**

## Estructura de carpetes

```
/
├── index.html          # punt d'entrada: canvas, HUD, intro, menú, panell final, import map
├── style.css           # estils (pantalla completa, HUD, panells, responsive)
├── src/
│   ├── main.js         # escena, llums, canvi de circuit, flux menú→intro→cursa→final, bucle
│   ├── tracks.js       # catàleg de circuits (dades pures: cantonades, radis, amplada, meta)
│   ├── themes.js       # colors per tema (bosc, cel, ciutat/Mònaco, Eifel/Nürburgring, volcà)
│   ├── trackPath.js    # geometria pura (sense Three): línia central, punt més proper, sortida
│   ├── track.js        # malles de la pista (asfalt, vorals, tanques, línia de meta)
│   ├── decor.js        # decoració per tema: Kenney + avets / núvols, arcs iris, globus /
│   │                   #   port, iots, edificis, palmeres / Infern Verd, castell / lava, roques
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
│   ├── rankingList.js  # pinta el rànquing complet amb desplaçament (dit, roda, ratolí)
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
5. [x] Circuit Cel, títol "Kenney Solé's", rànquing complet desplaçable, marxa enrere automàtica.
6. [x] Circuit Mónaco (1 volta) i suport de voltes per circuit.
7. [x] Circuit Nürburgring (1 volta, ~1:30), radis automàtics i cerca ràpida del punt més proper.
8. [ ] (Pendent de definir) sons, polit.
