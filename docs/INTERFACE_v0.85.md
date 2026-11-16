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

## Point de reprise

Implémentation sauvegardée avant les contrôles visuels et la suite complète.
Douze tests ciblés UI/menu passent. Restent à vérifier : aspect bureau/mobile,
groupes de pleines/rayées, numéros, billes empochées et rangée de la 9.
