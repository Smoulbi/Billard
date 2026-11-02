# FRAME v0.24 — géométrie de la table de tournoi

**Date :** 1er novembre 2026. **Périmètre :** rendu uniquement, moteur de physique v0.22/v0.21 préservé.

## Corrections visuelles

- Rétablissement de la palette d'origine : drap bleu/turquoise, structure graphite foncé, bandes assorties et garnitures métalliques argentées. Aucun nouvel effet de couleur imposé par la géométrie.
- Reconstruction d'un bâti de table avec couches de drap, d'ardoise et de sous-plateau réellement échancrées aux six poches ; suppression du disque noir plein au niveau de l'aire de jeu.
- Représentation tridimensionnelle des rails : coiffe supérieure, noyau structurel, jupe latérale descendante et garniture basse. La coiffe et la jupe se rejoignent à `y = 0,024 m` sans interstice. Les flancs ne sont plus représentés par des blocs totalement enfouis sous la table.
- Section de caoutchouc en coin, distincte du bois : arête de contact au niveau régulier de `63,5 %` du diamètre de bille, épaulement pratiquement affleurant à la coiffe (`0,060 m` contre `0,063 m`). Cette différence de hauteur de **3 mm** est volontaire et uniquement graphique.
- Embouchures des poches raccordées aux rails par une garniture annulaire **creuse** et des pièces d'angles ; ajout de doublures profondes, de bourrelets et d'un filet suspendu avec un fond situé sous le plateau.
- Caméra légèrement abaissée pour montrer les véritables côtés et l'épaisseur de la table dès l'ouverture.
- Rendu de secours Canvas2D remis aux teintes de la version précédente et avec des puits de poche ombrés.

## Préservation du modèle mécanique

Les coussins visuels et la géométrie des poches restent distincts des surfaces de collision. Les constantes, scripts, données expérimentales, calculs de trajectoire et modèles de bande n'ont pas été modifiés. Le profil choisi par défaut reste la référence empirique américaine v0.17 ; les modèles jouables et recherches v0.22 demeurent accessibles comme auparavant.

## Vérification

- `node --check dist/game.js` : syntaxe valide.
- `npm test` : **112 tests réussis**, aucune régression dans les calculs physiques.
- Contrôle des modifications : seules les ressources visuelles et la documentation/version affichée évoluent ; `dist/physics.js` et les tests de mécanique conservent leur contenu.

Le rendu final dépend des fonctions WebGL disponibles dans le navigateur ; l'interface conserve son mode 2D de secours.
