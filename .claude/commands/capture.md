---
description: Ouvrir un écran dans le simulateur iOS, le capturer et l'analyser (compare à la maquette)
argument-hint: [route, ex /parcours ou /explorer]
---
1. Si une route est donnée, ouvre-la : `xcrun simctl openurl booted "exp://127.0.0.1:8081/--$ARGUMENTS"` puis `sleep 3`.
2. Capture : `mkdir -p .captures && xcrun simctl io booted screenshot .captures/ecran.png`
3. Lis .captures/ecran.png, compare avec la maquette (docs/maquettes/ ou le lien Figma donné), liste les écarts de design et d'animation.
4. Corrige le code, attends le rechargement (`sleep 4`), recapture, et recommence jusqu'à ce que ce soit fidèle.
Pour vérifier une animation, prends 3 captures espacées de 300 ms (`sleep 0.3` entre chaque).
