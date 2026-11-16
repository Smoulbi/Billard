# Échap, caméra et bandes — version 0.88

Échap conserve la vue immersive et ouvre la pause. F bascule cette vue, y
compris depuis un menu. La reprise ne force plus une nouvelle entrée en plein
écran si F l’a quitté. Le plein écran natif n’est demandé que lorsque le navigateur
propose Keyboard Lock ; si la capture d’Échap échoue, retour à l’immersion dans
la fenêtre. Les sorties de sécurité du navigateur lui restent réservées.

C ouvre les réglages Caméra : sélection de la vue, champ de vision, hauteur et
recul en première personne. La simulation est suspendue. C ou Fermer revient au
jeu, Échap mène à la pause ; depuis Options, le retour reste dans Options.
La caméra de dessus garde sa priorité pendant un placement obligatoire.

La découpe de bande est désormais dérivée de la vue et de la position courantes
à chaque image. L’origine figée du tir n’est utilisée que pendant ce tir ; elle
ne peut plus prendre le pas sur la blanche de la première préparation suivante.
La transition vers le dessus désactive la découpe ; les autres vues restent
intactes. Aucun paramètre physique n’est modifié.

## Point de reprise

Gestion plein écran sauvegardée puis intégration caméra/découpe réalisée.
Trente et un contrôles ciblés passent. Restent : suite complète, navigateur,
Échap/F dans les menus, C et réglages, première préparation près d’une bande
après casse ; captures et bilan final avant main.
