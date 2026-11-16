# Niveau des bandes — version 0.79

À la demande de l’utilisateur, seul le son des bandes est légèrement atténué :
**−1 dB**, soit un facteur d’amplitude `10 ** (-1 / 20)` ≈ 0,89125.
Ce facteur constant conserve la progression du volume avec la vitesse.

Le WAV fourni reste identique ; les sons de queue, de bille/bille et de poche,
le gain général, le compresseur, le mute, le replay et la physique sont conservés.

## Validation

Onze tests audio ciblés réussis, dont l’isolation du réglage bandes à cinq
vitesses et le maintien du niveau de poche. Douze comparaisons de signaux
et huit rafales rendues par le lecteur et les nœuds natifs Web Audio passent.
Comparaison avec les mesures 0.78 : pics de bandes atténués de 1 dB aux huit
niveaux testés ; pics isolés de queue et bille/bille identiques. Le budget de
douze voix et l’absence d’écrêtage sont confirmés dans les rafales testées.
Résultats : `data/impact-audio-v079-validation.json`. Méthode et limites du rendu
hors ligne : `SONS_v0.76.md`.

Suite complète et relecture à terminer avant livraison.
Aucune écoute subjective sur le poste utilisateur n’est revendiquée.
