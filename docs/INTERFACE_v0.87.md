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

## Point de reprise

Implémentation sauvegardée ; dix-sept tests ciblés UI/menu/plein écran passent.
Restent la suite complète et les contrôles navigateur : ancienne préférence,
bouton Reprendre, ordre des actions, transparence et alignement du menu.
