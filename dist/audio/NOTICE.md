# Échantillons d’impact — sources et adaptations

Ces trois sons ont été choisis et approuvés par l’utilisateur. Ils sont fournis
localement, sans chargement depuis un service tiers pendant le jeu.

| Fichier joué | Original conservé | Attribution | Licence de la source |
| --- | --- | --- | --- |
| `cue.wav` | `source/Strike.wav` | henshmi, Classic-Pool-Game (`f60e9b824648faabe1d931e9116b20333559da2a`) | MIT, texte dans `licenses/Classic-Pool-Game-MIT.txt` |
| `ball.wav` | `source/ballcollision.ogg` | tailuge, billiards (`fc83068dd0be4ff603def94c90d3b043c8bc3143`) | GPLv3, texte dans `licenses/tailuge-billiards-GPL-3.0.txt` |
| `cushion.wav` | `source/cushion.ogg` | tailuge, billiards (même révision) | GPLv3, même texte |

Les mentions de droits et les conditions des auteurs sont conservées dans ces
textes de licence. Ces attributions concernent les échantillons et leurs
adaptations ; elles ne déclarent pas une nouvelle licence pour tout le projet.

Les URLs exactes, empreintes SHA-256 des originaux et adaptations, fréquences,
nombres de canaux et d’échantillons, pics décodés et gains sont consignés dans
`provenance.json`. Les trois empreintes originales ont été vérifiées avant
conversion.

Adaptation effectuée pour la version 0.76 : décodage FFmpeg en PCM flottant
32 bits, application d’un unique gain constant `0.5 / max(abs(pcm))`, puis
arrondi au PCM signé 16 bits (`round(pcm * gain * 32768)`). Aucun découpage,
filtrage, changement de fréquence, de hauteur ou synthèse. Les fréquences,
canaux et nombres d’échantillons décodés sont conservés. Le pic des trois
fichiers adaptés vaut exactement 0,5. FFmpeg et Python/NumPy ont servi à cette
préparation ponctuelle et ne sont nécessaires ni au jeu ni à `npm test`.

URLs des licences originales :

- https://raw.githubusercontent.com/henshmi/Classic-Pool-Game/f60e9b824648faabe1d931e9116b20333559da2a/LICENSE.txt
- https://raw.githubusercontent.com/tailuge/billiards/fc83068dd0be4ff603def94c90d3b043c8bc3143/LICENSE
