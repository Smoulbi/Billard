# FRAME v0.29 — ouvertures visuelles de poches raccourcies

**1er novembre 2026**

## Cause de l'écart

La découpe du drap utilisait la totalité du rayon de poche pour dessiner des arcs noirs à l'intérieur du terrain : 64,8 mm sur les poches latérales et 80,8 mm aux angles. Or les segments de collision définissent la bouche par les **extrémités des deux mâchoires** et la capture de bille ne se produit qu'une fois franchie une profondeur de poche vers l'extérieur. Les demi-cercles visuels exagéraient donc l'empiètement sur le drap.

## Géométrie corrigée

- Les deux poches latérales ont une découpe peu profonde, de **12 mm** au centre au lieu de 64,8 mm ; leur largeur est identique à l'écartement des mâchoires physiques, soit `2 × SIDE_CUT`.
- Les quatre poches d'angle passent d'un arc de quart de cercle à une bouche proche d'une diagonale avec seulement **4 mm** de retrait supplémentaire par axe à mi-largeur. Les deux extrémités conservent les coordonnées exactes des mâchoires.
- Les lèvres noires suivent ces nouveaux tracés et restent sous le drap.
- Le conduit intérieur part du nouveau contour visuel et descend à l'extérieur de l'ardoise et du support avant de se raccorder au panier inférieur, sans large couronne posée sur le tissu.
- Les maillages du drap, de l'ardoise et du support possèdent les mêmes découpes.
- Tous les raccords rails/angles et les matériaux de la v0.28 sont conservés.

## Contrôles

`tests/table-pocket-geometry.test.js` vérifie indépendamment la profondeur maximale des lèvres, leur non-recouvrement du tissu et la correspondance de leurs extrémités avec les mâchoires physiques. `tests/table-geometry.test.js` analyse les triangles extrudés. Les autres tests vérifient l'intégrité du moteur de jeu. Des vues hors navigateur sont générées pour inspecter la table en perspective, plan, profil et détail des poches.

**Physique inchangée :** aucune équation, constante, donnée expérimentale, longueur de bande de collision, rayon de capture ni condition `inPocket()` n'a été touchée.

**Limite :** le rendu diagnostique logiciel ne restitue pas les matériaux et l'éclairage WebGL avec exactitude. L'aspect final en navigateur authentifié ne peut pas être déclaré vérifié à partir de ces vues seules.
