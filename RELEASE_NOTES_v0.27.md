# FRAME v0.27 — géométrie 3D inspirée de la table photographiée

**1er novembre 2026**

## Référence visuelle

La référence de la v0.27 est la photographie fournie par l'utilisateur, représentant une table de style Diamond en perspective. Elle remplace la Brunswick Gold Crown VI comme cible pour **l'aspect visuel uniquement**. L'identité FRAME et la géométrie physique du simulateur sont préservées.

## Reconstruction graphique

- Quatre pieds massifs, presque verticaux, légèrement fuselés, solidaires du caisson, avec appuis sombres au sol. Suppression du piètement antérieur à deux supports inclinés et traverses apparentes.
- Deux panneaux longitudinaux et deux traverses de ceinture sous le plateau, raccordés aux pièces porteuses. Structure basse foncée et sans garnitures argentées.
- Six rails et six raccords externes de poche dans un graphite à veinage de bois longitudinal. Le matériau a une finition satinée peu métallique, et non un aspect plastique brillant.
- Arrondi géométrique du coin extérieur des raccords de rail. La lèvre intérieure conserve la position des ouvertures et de leurs mâchoires.
- Six poches visibles comme des ouvertures encastrées avec doublures noires et parois internes descendantes. Aucune couronne circulaire ajoutée sur le drap.
- Dix-huit repères de visée avec alvéoles et incrustations affleurantes. Le logo propre « FRAME » se situe sur les deux panneaux courts.
- Couleurs conservées : drap bleu, nez de bandes turquoise, boiseries graphite.

## Physique et versions

`dist/physics.js`, les modules de contact, les dimensions physiques, les données expérimentales et les règles de jeu ne sont pas modifiés. La génération visuelle réutilise les coordonnées physiques existantes. La v0.26 et les versions précédentes restent présentes dans l'historique du site.

## Contrôles

- Export des maillages réels de Three.js : `node scripts/export-table-geometry.mjs`.
- Vérifications de non-recouvrement du drap, des six raccords, de symétrie, de 18 incrustations au niveau des rails, des quatre pieds et de la chaîne porteuse : `node --test tests/table-geometry.test.js`.
- Rendus diagnostiques hors navigateur : `python scripts/render-table-geometry.py`, cinq angles dont plan, profil et détail des poches.
- Régression du moteur du jeu : `npm test`.

**Limite :** le moteur de rendu logiciel examine la géométrie, mais ne remplace pas une capture dans un navigateur équipé d'un contexte WebGL matériel ; l'éclairage et le veinage final n'y sont pas fidèlement rendus. La mesure de fréquence d'images en navigateur reste à faire.
