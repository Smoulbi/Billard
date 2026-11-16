# Interface épurée — version 0.83

Échap ouvre uniquement Menu principal, Recommencer et Options. Une seconde
pression reprend la partie ; depuis Options, Échap revient au menu de pause.
La simulation reste suspendue pendant le passage entre les deux pages.

Le panneau jauge est fixe à droite, sans menu dépliable. Il disparaît en mode
geste souris. Les annonces, le placement et les actions d’entraînement restent
accessibles dans des commandes contextuelles distinctes. Les joueurs occupent
un bandeau réduit ; le tour est indiqué par le contour du joueur actif.

Les compteurs de coups/empochages, messages de statut, marque/version, vue active
et boutons plein écran/options sont masqués dans la vue de jeu. La rangée centrale
contient uniquement les billes encore actives du jeu de la 9. Les sons, règles et
paramètres physiques sont conservés.

## Validation

- Suite complète : **288 tests réussis, 0 échec, 0 ignoré**.
- Le contrôleur de menu teste notamment les transitions pause → options → pause,
  les événements de fermeture asynchrones, l’ouverture des options depuis
  l’accueil et les échecs d’ouverture sans laisser le jeu bloqué en pause.
- Dans Chromium, Échap affiche exactement les trois boutons demandés ; Options
  ouvre une page distincte et le retour mène à la pause. La simulation conserve
  les positions et le temps du tir pendant toute cette navigation ; Échap sur
  la pause reprend et le tir peut se terminer.
- La vue souris n’affiche aucun panneau de jauge. La jauge et l’effet sont
  directement visibles dans un `aside` fixe, sans résumé ni menu à déplier.
  Sur bureau, le canevas réserve la place du panneau pour dégager les poches.
- Les éléments retirés restent invisibles en 8, 9 et entraînement. Le jeu de la 9
  affiche initialement les neuf billes au centre ; le rendu exclut les billes
  inactives. Le jeu de la 8 et l’entraînement masquent toute cette rangée.
- Vérifications 390×844 et 844×390 : pas de débordement horizontal, jauge et effet
  accessibles, boutons de vue et replay non recouverts. Les outils d’entraînement
  occupent l’espace à gauche du panneau jauge sur téléphone.

Les captures bureau proviennent du jeu de production en WebGL. Les contrôles
fins et mobiles utilisent un harnais temporaire d’inspection, sans modifier
les sources suivies : rendu arrêté et avance physique par ses pas fixes pour
terminer les tirs. Aucun événement error/unhandledrejection observé durant les
essais instrumentés ; aucune mesure de performance GPU n’est revendiquée.
Les sons, les règles et les paramètres physiques sont inchangés.

Preuves : `data/interface-v083-validation.json`.

## Captures

- [Geste souris](data/interface-v083-mouse.png)
- [Jauge fixe](data/interface-v083-gauge.png)
- [Menu Échap](data/interface-v083-pause.png)
