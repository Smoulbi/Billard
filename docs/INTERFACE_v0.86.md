# Commandes et typographie — version 0.86

Les boutons Replay, Changer de vue et Placer la blanche sont ancrés en bas à
droite. La visée souris reste dans cette même barre. Le placement manuel de la
blanche est conservé ; les trois positions rapides et leurs événements sont
supprimés.

Les sous-titres des trois modes, la précision sous l’option d’annonce et le
paragraphe des décisions de casse sont retirés du menu principal.

Les cartes joueurs conservent leurs avatars, noms, groupes et billes, sans
contour ni halo rectangulaire. Le nom du joueur actif garde une couleur distincte.
La variable typographique auparavant monospace utilise désormais DM Sans,
avec Arial/sans-serif en repli. Toutes les parties de l’interface qui utilisaient
cette police sont concernées ; DM Mono n’est plus chargé. Les chiffres des billes
restent assortis à ceux de la table.

## Validation

- **289 tests réussis, 0 échec, 0 ignoré** ; quinze tests ciblés UI/menu/placement passent.
- Accueil de production : aucun sous-titre de mode, aucune précision sous
  l’annonce, aucun paragraphe après le bouton Options ; placements rapides absents.
- Les contrôles du jeu sont effectivement en bas à droite : bord droit à 20 px
  et bord inférieur à 18 px sur la fenêtre bureau 1440×857.
- Les cartes joueurs ont une bordure transparente et aucun halo ; leurs avatars,
  noms, groupes et billes sont conservés. Les groupes et les commandes utilisent
  DM Sans/Arial/sans-serif ; l’import DM Mono est retiré.
- Fenêtres 390×844 et 844×390 : pas de débordement horizontal, boutons Replay,
  Changer de vue et Placer la blanche visibles et non recouverts par la jauge.
  La barre reste près des bords droit et inférieur dans les deux orientations.
- Aucun événement error/unhandledrejection observé dans les essais instrumentés.

Les captures accueil/jeu proviennent de la version de production en WebGL. Les
contrôles fins et responsive utilisent un harnais temporaire d’inspection et de
position de test, sans modifier les sources suivies, avec rendu logiciel arrêté.
Aucune mesure de performance GPU n’est revendiquée. Les règles, la physique,
les sons et le rendu des billes de la table sont inchangés.

Preuves : `data/interface-v086-validation.json`.

## Captures

- [Menu](data/interface-v086-home.png)
- [Boutons en bas à droite](data/interface-v086-game.png)
- [Joueurs sans contour et nouvelle police](data/interface-v086-hud.png)
