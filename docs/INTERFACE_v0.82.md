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

## Point de reprise

Suite complète exécutée : **283 tests réussis, 0 échec, 0 ignoré**. Les essais
navigateur confirment pause/reprise, sortie de capture par Échap, volume et mode
mémorisés, redémarrage et retour à l’accueil. Le jeu de la 9 conserve sa cible
et le joueur de casse. Les options tiennent dans les fenêtres 390×844 et 844×390
sans débordement horizontal. Relectures audio, HTML/CSS et intégration exécutées.
Les résultats audio natifs sont dans `data/impact-audio-v082-validation.json`.

À terminer avant main : derniers contrôles visuels après ajustement des boutons
sur téléphone, sauvegarde des preuves et relecture finale du diff.
