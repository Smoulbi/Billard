# Aperçu caméra — version 0.89

Les réglages caméra sont ancrés en haut à droite dans un panneau compact.
Le fond du dialogue est transparent : aucune couche sombre ni flou ne recouvre
la table. Les contrôles restent isolés pendant le réglage pour éviter un tir
accidentel ; la simulation demeure suspendue.

Une modification de caméra marque le rendu à rafraîchir. La prochaine image
affiche le nouveau point de vue, champ de vision ou position sans attendre la
fermeture du panneau. Les images inchangées ne sont pas redessinées pendant
la pause. Le même mécanisme couvre les redimensionnements et le rendu de secours.

## Point de reprise

Dix-neuf tests ciblés passent, dont un test de non-régression qui vérifie le
redessin pendant la pause et l’absence d’avance physique. Restent : suite
complète et contrôle visuel de la table avant/après ouverture et réglage.
