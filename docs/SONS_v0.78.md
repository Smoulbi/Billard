# Son des bandes — version 0.78

Le WAV `cushion fx.wav` envoyé et approuvé par l’utilisateur remplace
`dist/audio/cushion.wav`. Il est copié octet pour octet, sans normalisation,
filtrage, rééchantillonnage ni autre retouche supplémentaire.

- PCM16 stéréo, 44 100 Hz, 7 284 trames, environ 0,16517 s.
- Pic décodé : 0,3286437988, niveau fourni conservé.
- SHA-256 : `81ca76b62fcbfcc439c7c6af13bcda9f4bffebca80cdcb6ca8f2f0e788e17c04`.
- Copie de l’envoi conservée dans `dist/audio/source/cushion-fx.wav`.

L’attribution et la licence de la source amont restent dans `dist/audio/` ;
la provenance distingue le fichier retouché et les paramètres historiques.
Le paramètre de cache `cushion.wav?v=0.78` renouvelle le fichier dans le navigateur.
Les sons de queue/billes, la courbe des petits impacts, le mute, le replay,
le moteur et les règles sont conservés.

## Validation

Dix tests audio ciblés réussis. Identité vérifiée entre le WAV reçu, les copies
Git et le fichier effectivement servi en HTTP avec son paramètre de cache.
Douze comparaisons de signaux et huit rafales ont été rendues par le lecteur de
production et les nœuds natifs Web Audio : courbe de volume conforme, douze voix
au plus et aucun écrêtage dans les cas mesurés. Pic des rafales de bandes :
0,75825 au plus ; pic maximal tous cas : 0,92983. Résultats dans
`data/impact-audio-v078-validation.json` ; méthode et adaptateur d’état hors ligne
inchangés, décrits dans `SONS_v0.76.md`.

Suite complète : **275 tests réussis, 0 échec, 0 ignoré**. Relecture indépendante
terminée sans défaut bloquant. Aucune nouvelle écoute subjective
n’est revendiquée : le choix sonore est celui de l’utilisateur.
