# FRAME v0.26 — reconstruction visuelle de la table

**1er novembre 2026 — état historique : version publiée, ensuite remplacée par la v0.27.**

## Références

- [Brunswick Gold Crown VI Tournament](https://www.brunswickbilliards.com/products/gold-crown-vi-tournament-9-foot-pool-table) : silhouette de la cuve, rail en bois sombre, raccords métalliques autour des poches, embase inclinée et traverses de piètement.
- [World Pool-Billiard Association (WPA), spécifications des tables](https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf) : répartition des six poches, hauteur du nez de bande, repères affleurants et proportions d'une table américaine 9 pieds. Les dimensions du simulateur sont **conservées**, et non recalculées d'après les photographies.

## Modifications 3D

- Six assemblages de rails profilés avec biseaux de faible rayon. Le volume de capotage se raccorde directement à l'épaule de la bande, sans dessiner une tranche de caoutchouc flottante.
- Dix-huit alvéoles découpées dans les profils de rails, et dix-huit repères en nacre à la même cote supérieure. Une garniture foncée entoure chaque incrustation.
- Six poches réellement dégagées dans le drap, l'ardoise et la sous-couche. Leur paroi interne est formée par une gorge incurvée et une doublure conique sous le plateau ; les filets sont sous la surface de jeu.
- Quatre pièces de jonction d'angle et deux raccords de poche latérale à l'extérieur du drap. Surface métallique satinée et joints sombres, sans anneaux circulaires au-dessus du tissu.
- Châssis central, six longerons interrompus devant les poches, panneaux de longueurs et de traverses, angles, traverses de soutien et pieds de tournoi inclinés, avec raccordement aux appuis et patins placés au niveau du sol.
- Bois graphite texturé, drap bleu légèrement mat, caoutchouc turquoise mat, métal nickel brossé ; palette d'origine respectée.

## Contrôles effectués

- Génération des **173 maillages / 12 352 triangles** du constructeur réel Three.js via `scripts/v026-export-table.mjs`.
- Inspection logicielle à profondeur par pixel de cinq vues : générale en perspective, dessus, profil, angle, poche latérale (`scripts/v026-render-table.py`). Cette vérification porte sur la géométrie exacte, mais utilise une approximation des matériaux et non le moteur WebGL du site.
- Tests sur les triangles des six poches et des raccords des rails : aucune intrusion échantillonnée sur la surface jouable, y compris les biseaux.
- Contrôle du nombre de rails, des 18 repères affleurants, des six poches, du contact des quatre patins avec le sol, de la continuité des appuis du châssis et de la symétrie selon les deux axes.
- Aucun changement dans `dist/physics.js`, dans les équations, paramètres, données expérimentales, dimensions de collision ou interfaces de choix des modèles.

## Contrôle encore nécessaire avant diffusion

- Rendu réel dans le navigateur de production à vérifier avec les textures et ombres Three.js, notamment les arêtes aux mâchoires et les incrustations. Le rendu logiciel n'autorise pas à conclure que les matériaux, le cadrage et la fluidité WebGL sont validés.
- Les modèles 3D restent procéduraux et inspirés de la Gold Crown VI, sans prétendre être une CAO fabricant à l'échelle des assemblages ou des poches.
