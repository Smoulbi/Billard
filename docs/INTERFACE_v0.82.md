# Interface immersive — version 0.82

La table occupe la fenêtre dès l’accueil. Lancer une partie demande aussi le
plein écran natif dans le geste utilisateur ; en cas de refus, la vue conserve
les dimensions de la fenêtre. Échap peut quitter le plein écran natif selon le
navigateur ; ce changement ouvre également les options sans réduire la table.

Le bandeau supérieur affiche les deux joueurs, le joueur actif, les groupes de
la 8 et les billes restantes/empochées. La 8 apparaît comme objectif après avoir
terminé son groupe. Le jeu de la 9 conserve sa cible et son compteur de fautes.

Le menu Options est un dialogue modal à l’intérieur de la scène : mode de tir,
volume mémorisé, mute, assistance, modèle de bande, trajectoires et calibration.
Il met la simulation en pause et libère la souris ; la reprise ne rattrape pas
le temps passé dans le menu. Le geste souris n’affiche pas de panneaux de
puissance/effet ; le mode jauge les affiche latéralement. Les annonces et le
placement restent accessibles pendant la partie.

L’accueil propose 8, 9 et entraînement, avec accès aux options. Menu principal
abandonne la partie en cours. Recommencer relance le même mode, l’annonce et le
joueur de casse choisis au lancement.

Le son des bandes remonte de 2 dB : facteur total `10 ** (-6 / 20)` par rapport
au WAV utilisateur. Le volume général multiplie le bus audio existant, sans
démuter un son coupé. Le WAV et les autres gains par famille sont conservés.

## Validation et limites

Suite complète : **283 tests réussis, 0 échec, 0 ignoré**. Les tests ajoutés
couvrent la pause/reprise du dialogue, les groupes du HUD, le plein écran de
repli et le volume partagé, y compris mute et valeurs invalides. Les autres
moteurs, règles et paramètres n’ont pas été modifiés.

Essais navigateur exécutés : accueil/options, pause pendant un tir (positions
et temps simulé figés), reprise par Échap, redémarrage avec les mêmes réglages,
retour à l’accueil pendant un tir, 8/9/entraînement, visée souris accessible
sans ouvrir le dock, capture réelle du pointeur et options par Échap, volume
et mode conservés après rechargement. Les groupes pleines/rayées et les billes
empochées ont été contrôlés avec une position de test du HUD.

Les 57 lignes de calibration sont produites depuis les options et l’export est
activé. Le scénario de laboratoire « Bande + effet » charge une table prête et
ferme les options pour jouer. Aucun événement error/unhandledrejection observé
dans les essais instrumentés. Relectures indépendantes HTML/CSS, intégration,
menus et audio terminées, y compris corrections vérifiées avant livraison.

Les options tiennent dans des fenêtres 390×844 et 844×390 sans débordement
horizontal ; caméra, placement et options restent cliquables à côté du panneau
jauge. Sur téléphone, le panneau latéral reste repliable pour dégager la table.
Les captures bureau proviennent du jeu de production avec WebGL 2. Pour les
contrôles détaillés, un harnais temporaire expose les états sans modifier les
sources suivies, arrête le rendu logiciel et avance le moteur par ses pas fixes.
Les captures mobiles vérifient la disposition avec ce harnais. Aucune mesure
de performance sur GPU ni écoute subjective n’est revendiquée.

L’entrée effective en plein écran natif n’a pas été établie dans Chromium sans
interface ; les tests vérifient la demande sur lancement/reprise, le repli sur
la fenêtre et le menu Échap. Le navigateur garde le contrôle de sa permission.

Les rendus Web Audio natifs confirment la hausse de 2 dB des bandes à huit
niveaux, des pics isolés queue/bille identiques et huit rafales sans saturation
dans les cas testés. Méthode hors ligne et limites : `SONS_v0.76.md`.

Preuves : `data/interface-v082-validation.json` et
`data/impact-audio-v082-validation.json`.

## Captures

- [Accueil](data/interface-v082-home.png)
- [Jauge latérale et HUD](data/interface-v082-gauge.png)
- [Options](data/interface-v082-options.png)
- [Options sur téléphone](data/interface-v082-options-mobile.png)
