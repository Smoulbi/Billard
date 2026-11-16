# Aperçu caméra — version 0.89

Les réglages caméra sont ancrés en haut à droite dans un panneau compact.
Le fond du dialogue est transparent : aucune couche sombre ni flou ne recouvre
la table. Les contrôles restent isolés pendant le réglage pour éviter un tir
accidentel ; la simulation demeure suspendue.

Une modification de caméra marque le rendu à rafraîchir. La prochaine image
affiche le nouveau point de vue, champ de vision ou position sans attendre la
fermeture du panneau. Les images inchangées ne sont pas redessinées pendant
la pause. Le même mécanisme couvre les redimensionnements et le rendu de secours.

## Validation terminée

- Suite complète : 296 tests réussis, aucun échec ni test ignoré.
- Le test de non-régression vérifie le redraw 3D/2D pendant la pause sans avance physique.
- Sur la page réelle, le passage de 60° à 75° change immédiatement l’image avec le panneau ouvert. Les appels de dessin augmentent au réglage et restent stables ensuite.
- Fond transparent et aucun flou confirmés dans Chromium. La comparaison de la table avant/après ouverture ne diffère au maximum que d’un niveau par canal (arrondi de rendu/ombre locale), sans assombrissement global.
- Panneau contenu dans les fenêtres 1200 × 800, 390 × 844 et 844 × 390 ; aucun débordement horizontal. Aucune erreur JavaScript relevée pendant les manipulations.

Les mesures utilisent Chromium headless avec SwiftShader et un DPR de 0,6 ; la capture finale utilise un DPR de 1. Le comptage WebGL est injecté uniquement dans le navigateur de test.

[Mesures](data/interface-v089-validation.json) · [Capture](data/interface-v089-camera.png)
