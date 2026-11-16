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

## Validation et limites

- Suite complète : **295 tests réussis, 0 échec, 0 ignoré**. Trente et un contrôles
  ciblés UI/menus/plein écran/caméra/bandes repassés après les derniers ajustements.
- Tests plein écran : capture d’Échap acceptée, refusée ou absente ; F pendant
  une demande encore en cours ; absence de sortie d’un autre élément ; repli
  immersif réversible. Les sorties de sécurité du navigateur ne sont pas bloquées.
- Dans Chromium sans interface, Échap ouvre la pause et conserve une scène
  immersive 1440×857. F, même depuis le menu, crée une vue fenêtrée avec marges
  de 16 px ; Reprendre conserve ce choix, et F restaure l’immersion. L’entrée
  native n’a pas été établie dans cet environnement : les chemins Keyboard Lock
  sont vérifiés avec des doublures de test. Un navigateur sans autorisation
  de capture d’Échap utilise la vue immersive dans sa fenêtre.
- C ouvre et ferme la caméra, y compris avec le sélecteur focalisé. La sélection
  première personne et les réglages FOV, hauteur et recul sont effectifs. Depuis
  Options, le retour caméra conserve la page Options et la pause ; Échap depuis
  un accès direct caméra ouvre le menu pause.
- Une casse d’entraînement complète a été exécutée. Ensuite, un état de test place
  la blanche à une bande, conserve une ancienne origine et désactive les plans :
  dès la première image, les plans sont réactivés et le point derrière la blanche
  appartient bien à la zone découpée. Les tests couvrent aussi les quatre bandes,
  les angles, le tapis préservé et le désengagement vers le dessus.
- Fenêtres 390×844 et 844×390 : réglages caméra dans l’écran, sans débordement
  horizontal ; défilement disponible dans l’orientation courte. Aucun événement
  error/unhandledrejection observé pendant les essais instrumentés.

Le contrôle de découpe est une reproduction d’état, pas un enregistrement du
bug original de l’utilisateur. Il vérifie la mise à jour qui manquait aux images
sans interaction caméra. Les contrôles détaillés utilisent un harnais temporaire
non livré, avec rendu réduit/arrêté entre les pas. Aucune mesure de performance GPU
n’est revendiquée. Les règles, sons et paramètres physiques sont inchangés.

Preuves : `data/interface-v088-validation.json`.

## Captures

- [Caméra](data/interface-v088-camera.png)
- [Caméra sur téléphone](data/interface-v088-camera-mobile.png)
