# Démarrage et menu pause — version 0.87

Le mode geste souris est choisi à chaque chargement de page, même si le
navigateur conserve une ancienne préférence de jauge. Le changement de mode
reste possible dans Options pendant la visite ; le volume reste mémorisé.
Le mode de secours 2D conserve la jauge nécessaire à son fonctionnement.

Le menu pause présente, dans cet ordre : Reprendre, Options, Recommencer,
Menu principal. Reprendre ferme le menu et relance le jeu. Le retour depuis
Options conserve la pause comme auparavant.

Arial/sans-serif est utilisé pour l’interface et aucun chargement de police
externe n’est nécessaire. Les fonds rectangulaires des cartes joueurs sont
transparents : avatars, noms, groupes et billes restent affichés. Le cercle du
joueur actif continue de passer en jaune.

Les titres des choix de mode sont centrés : Entraînement, Jouer au 8,
Jouer au 9. Les points radio sont invisibles mais les entrées gardent le clavier,
le focus visible et l’indication de sélection sur le bouton.

## Validation

- **289 tests réussis, 0 échec, 0 ignoré** ; dix-sept tests ciblés UI/menu/plein écran passent.
- Dans le navigateur de production, une préférence locale `gauge` a été créée
  avant rechargement : le mode effectif reste `mouse`. Le choix explicite de
  jauge pendant la visite fonctionne toujours.
- Le menu affiche exactement Reprendre, Options, Recommencer, Menu principal,
  dans cet ordre, avec le focus initial sur Reprendre. Le clic ferme le menu,
  rend le focus au canevas et remet un tir suspendu en mouvement ; le tir termine
  normalement dans le contrôle physique.
- Les deux cartes joueurs ont un fond transparent sans image de fond. Les
  informations et billes sont conservées. Arial est appliqué aux textes ; aucun
  lien de chargement de police externe ne subsiste.
- Les trois libellés sont centrés à moins d’un pixel, horizontalement et
  verticalement ; les radios sont invisibles. Ils restent dans le DOM pour
  préserver les interactions natives du clavier et leur indication de focus.
- Fenêtres 390×844 et 844×390 : pas de débordement horizontal, quatre actions
  de pause dans l’écran, ordre et Reprendre fonctionnels, labels de mode centrés.

Les captures accueil/jeu/pause proviennent du jeu de production. Les contrôles
physiques détaillés, groupes du HUD et dispositions mobiles utilisent un harnais
temporaire d’inspection, sans modifier les sources suivies, avec rendu logiciel
arrêté. Aucun événement error/unhandledrejection observé dans ces essais ; aucune
mesure de performance GPU n’est revendiquée. Les règles, sons et paramètres
physiques sont conservés.

Preuves : `data/interface-v087-validation.json`.

## Captures

- [Menu principal](data/interface-v087-home.png)
- [Menu pause](data/interface-v087-pause.png)
- [Vue de jeu](data/interface-v087-game.png)
- [Informations joueurs sans fond](data/interface-v087-hud.png)
