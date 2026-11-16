# Sons d’impact — version 0.76

Trois échantillons validés par l’utilisateur sont joués localement : `cue.wav`
(Classic Pool Game, Strike.wav), `ball.wav` et `cushion.wav` (tailuge/billiards).
Les originaux, licences MIT et GPLv3, URLs figées, empreintes et gains constants
figurent dans `dist/audio/NOTICE.md` et `dist/audio/provenance.json`.
Ces notices ne déclarent pas une nouvelle licence pour l’ensemble du projet.

Chaque source est décodée en flottant et normalisée par le facteur constant
`0.5 / max(abs(pcm))`, puis écrite en PCM16 sans coupe, filtre ni rééchantillonnage.
Le lecteur ne modifie pas la vitesse de lecture.

L’amplitude par voix est `min(v,24)/12` pour une vitesse finie strictement positive,
zéro sinon. Doubler la vitesse double l’amplitude (+6 dB environ), sans prétendre
doubler le volume perçu. Aucun plancher ne relève les petits impacts.
La queue utilise `Math.hypot(impact.vx,impact.vz)` après `strikeBall` ; les billes
et bandes emploient directement `speed` des callbacks physiques. Leur seuil
physique existant est conservé. Le moteur et le modèle reference-v069 sont inchangés.

Les trois téléchargements et décodages sont partagés. Le contexte est activé
sur geste utilisateur ; aucun impact ancien n’est rejoué après chargement.
Le gain général est 0,24 ; le compresseur utilise threshold -12 dB, knee 0,
ratio 20, attack 0, release 0,05 s. Douze voix au maximum, la plus ancienne
étant interrompue et déconnectée à saturation. SON OFF arrête les voix immédiatement.
Un fichier indisponible reste isolé ; le jeu et les autres familles continuent.
Le son triangle de poche est conservé, dans ce même contexte. Le replay reste silencieux.

## État de validation

Reconstruction sauvegardée avant les validations longues. Tests unitaires,
rendu Web Audio réel et parcours navigateur à terminer avant livraison sur main.
Les mesures de l’ancienne implémentation ne sont pas revendiquées ici.
