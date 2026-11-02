# FRAME v0.23 — refonte graphique de la table

Date : 1er novembre 2026.

## Périmètre

La v0.23 ne modifie **aucun fichier du moteur physique**. Son objectif est de reproduire visuellement une table de pool américain de neuf pieds sans introduire de paramètres de physique supplémentaires.

### Modifications visuelles

- Drap bleu de tournoi avec trame et microrelief déterministes, générés localement en textures de couleur et de relief.
- Rails et tabliers en noyer avec veinage non répétitif à courte échelle, vernis discret, biseaux et filet métallique.
- Piètement de table avec quatre jambes, traverses, socles de réglage et renforts sous l'ardoise.
- Garnitures de poches en cuir noir, puits foncés, lèvres arrondies et petits rivets. Les positions et ouvertures restent celles de la géométrie physique.
- Repères de visée en losange, aspect nacré, encastrés dans les rails.
- Billes à finition vernie, géométrie sphérique affinée, numéros courbés sur leur surface et bandes de couleur des billes rayées.
- Éclairage plus doux, reflets et ombres ajustés ; rendu 2D de secours recoloré.

Les textures de drap et de bois sont procédurales et reproductibles, sans accès au réseau. Elles représentent des matériaux **visuellement plausibles**, pas des mesures de propriétés réelles des matériaux.

## Intégrité physique

- `dist/physics.js`, les variantes de contact et les scripts d'audit ne sont pas modifiés par cette version.
- Les coordonnées des centres de poche et les segments de bande restent récupérés du moteur existant.
- La détection des collisions et les prédictions de trajectoire n'utilisent pas les nouveaux maillages visuels.
- Le modèle empirique v0.17 reste celui sélectionné par défaut ; les modèles mécaniques ultérieurs sont conservés comme options de recherche.

## Validation

- Exécuter `npm test` depuis le dossier du projet ; tous les tests de régression doivent rester verts.
- Vérifier la version affichée : `VERSION 0.23`.
- Vérifier les six ouvertures de poche, les repères et les numéros lors de rotations de bille, et comparer un rebond avant/après avec les mêmes conditions initiales.

## Limites

La v0.23 améliore le rendu mais n'est pas un relevé photogrammétrique d'un modèle commercial précis de table. Une visualisation 3D WebGL est nécessaire pour les matériaux et l'éclairage ; le rendu Canvas2D de secours reste schématique.
