# Kenney Solé's Race

Minijoc de curses per al navegador (PC i mòbil). El cotxe accelera sol; tu només gires.

- Teclat: `←`/`A` i `→`/`D`
- Mòbil: mantén premuda la meitat esquerra o dreta de la pantalla
- Mantén el gir als revolts per derrapar: en deixar-lo anar, turbo
- Quatre circuits: Bosque (fàcil), Cielo (mitjà), Volcán (difícil) i Mónaco (expert, 1 volta), cadascun amb el seu rànquing

Executar en local: `npx http-server .` i obrir `http://localhost:8080`.

Gràfics: [Kenney Racing Kit](https://kenney.nl) (CC0). Motor 3D: [three.js](https://threejs.org) (MIT).

## Rànquing online (Firebase)

1. A <https://console.firebase.google.com> crea un projecte (sense Analytics).
2. **Build → Firestore Database → Create database** (mode producció, qualsevol ubicació europea).
3. A la pestanya **Rules**, enganxa el contingut de `firebase/firestore.rules` i prem **Publish**.
4. **Project settings → General**: afegeix una app web (`</>`) i copia `projectId` i `apiKey`
   a `src/config.js`.

Sense configurar, el rànquing es desa només al navegador del jugador.
