# Niveau des bandes — version 0.81

Baisse supplémentaire de **5 dB** par rapport à la 0.80, soit **−8 dB au total**
par rapport au WAV fourni. Gain des bandes : `10 ** (-8 / 20)` ≈ 0,39811.
Les autres sons, la courbe de vitesse, le WAV, le mute, le replay et la physique
sont conservés.

## Validation

Onze tests audio ciblés passent. Douze comparaisons de signaux et huit rafales
rendus par les nœuds natifs Web Audio passent. Les pics des bandes diminuent
de 5 dB supplémentaires aux huit niveaux testés par rapport aux mesures 0.80 ;
les pics isolés queue/bille-bille sont identiques. Les WAV restent inchangés.
Résultats : `data/impact-audio-v081-validation.json`. Méthode et limites :
`SONS_v0.76.md` (adaptateur d’état hors ligne, aucune écoute subjective revendiquée).

Suite complète et relecture à terminer avant livraison.
