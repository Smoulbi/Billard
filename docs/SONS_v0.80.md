# Niveau des bandes — version 0.80

Nouvelle baisse de **2 dB** sur les bandes par rapport à la 0.79, soit
**−3 dB au total** par rapport au WAV fourni : gain `10 ** (-3 / 20)`
≈ 0,70795. Les autres sons, la courbe de vitesse, le WAV, le mute,
le replay et la physique sont conservés.

## Validation

Onze tests audio ciblés passent. Douze comparaisons de signaux et huit rafales
rendus par les nœuds natifs Web Audio passent. Par comparaison avec les mesures
0.79, les pics des bandes diminuent de 2 dB aux huit niveaux testés, tandis que
les pics isolés queue/bille-bille sont identiques. Les WAV restent inchangés.
Résultats : `data/impact-audio-v080-validation.json`. Méthode et limites :
`SONS_v0.76.md` (adaptateur d’état pour le rendu hors ligne, aucune écoute
subjective revendiquée).

Suite complète et relecture à terminer avant livraison.
