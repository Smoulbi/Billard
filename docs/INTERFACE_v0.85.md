# Billes du bandeau — version 0.85

Les deux phrases décoratives de l’accueil sont supprimées, ainsi que les mentions
redondantes de session et le texte de présentation en bas des options. L’accueil
conserve le nom du jeu et les choix fonctionnels, sans slogan de remplacement.

Les billes du HUD utilisent la même palette `BALL_COLORS` que les billes 3D.
Le numéro noir est placé dans un disque ivoire `#faf8ed`, comme la texture de la
table. Les rayées ont un corps ivoire et une bande de couleur au milieu ; les
reflets et ombres donnent du volume à la résine. Le numéro reste lisible sur les
pleines, la noire et les rayées. Les billes empochées sont atténuées ; la 8 finale
conserve son repère. Le même composant est utilisé dans la rangée du jeu de la 9.

Le bandeau de la 8 est rapproché pour accueillir les billes sans agrandir les
cartes inutilement. Les règles, billes 3D, sons et contrôles ne sont pas modifiés.

## Validation

- **289 tests réussis, 0 échec, 0 ignoré** ; douze contrôles ciblés UI/menu passent.
- Accueil de production inspecté : les deux slogans sont absents du DOM, aucun
  slogan de remplacement n’a été ajouté ; les mentions de session et la phrase
  de présentation des options ont également été retirées.
- Groupes pleines/rayées contrôlés en navigateur avec une position de test :
  couleurs identiques à `BALL_COLORS`, disques des numéros visibles et centrés,
  numéros 10 à 15 lisibles. La bille 2 empochée conserve son numéro mais devient
  atténuée (opacité 0,26).
- La rangée de la 9 réutilise le même composant : 1 à 9 présents, 8 pleine/noire,
  9 rayée. La logique des groupes et d’empochage n’est pas modifiée.
- Fenêtres 390×844 et 844×390 : les quatorze billes des joueurs restent dans leur
  rangée, les pastilles sont rondes, aucun débordement horizontal. Bandeau de
  60/63 px sur ces écrans, 74 px sur bureau.

Les groupes et le statut empoché sont des données de test injectées par un
harnais temporaire non livré. Le rendu est celui de l’interface réelle, avec
une table WebGL à résolution réduite et boucle de rendu arrêtée pour les
contrôles détaillés. Aucune mesure de performance GPU n’est revendiquée.
Preuves : `data/interface-v085-validation.json`.

## Captures

- [Accueil sans slogans](data/interface-v085-home.png)
- [Billes sous les joueurs](data/interface-v085-balls.png)
- [Bandeau sur téléphone](data/interface-v085-mobile.png)
- [Billes restantes de la 9](data/interface-v085-nine.png)
