# Jump shots — version 0.91

## Commandes

Inclinaison de queue de 0 à 75° dans Options → Caméra et queue → Élévation.
En geste souris : S pour régler l’effet, molette vers le haut pour lever la
queue (vers le bas pour l’abaisser), S pour valider, puis geste de tir habituel.
Un indicateur affiche l’angle pendant le réglage. La puissance détermine aussi
la hauteur et la portée. Exemple de test : bille centrée, 45°, puissance 33 %.

## Modèle

Les coups jusqu’à 15° conservent le solveur historique. À partir de 20°,
la composante descendante de la frappe rebondit sur le tapis (coefficient
approximatif 0,42). Une fausse queue ne déclenche pas de saut. Vol balistique
sous gravité, sans frottement du tapis en l’air ; restitution de réception
0,32 et arrêt des petits rebonds. Hauteur réelle dans le rendu 3D et le replay ;
le rendu 2D différencie la hauteur par la taille de la bille.

Les contacts avec les billes utilisent la distance 3D et une impulsion normale,
avec support du tapis pour éviter d’enfoncer une bille au sol. Sous le haut de
la bande, le rebond horizontal existant est réutilisé. Au-dessus, la bille peut
sortir ; cela constitue une faute, sans compter une poche ni une bande légale.
La 8 sortie fait perdre, la 9 sortie est replacée. Le guide de trajectoire prend
la hauteur en compte pour ignorer une bille franchie.

Ce premier modèle de vol n’est pas une calibration expérimentale : restitution
du tapis et contacts aériens restent approximatifs (pas de frottement tangentiel
3D aux impacts aériens ni de géométrie complète du dessus des bandes).

## Validation

306 tests réussis, zéro échec. Dix tests nouveaux : lancement, gravité, obstacle
franchi ou heurté selon la hauteur, réception et arrêt, sortie, replay, règles,
convergence avec pas divisé par deux et guide de trajectoire.

Contrôle Chromium/SwiftShader : S puis molette modifie 45° en 46° et affiche
l’indicateur. Sur le scénario déterministe à 45°, le centre de la blanche atteint
10,05 cm au-dessus du tapis en franchissant la 2, immobile. La blanche retombe
puis frappe la 1. Les hauteurs du maillage et du corps physique coïncident ;
le replay enregistre le vol. Aucune erreur JavaScript pendant l’essai.
Les accès de test sont ajoutés par un serveur temporaire, sans modifier le jeu livré.

[Mesures](data/jumps-v091-validation.json) · [Réglage](data/jumps-v091-controls.png) · [Vol](data/jumps-v091-flight.png)
