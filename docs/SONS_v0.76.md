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

## Vérifications exécutées

- Les originaux correspondent aux trois SHA-256 fournis. Une relecture indépendante
  a comparé chaque échantillon PCM16 adapté au décodage FFmpeg normalisé ; fréquences,
  canaux et nombres de trames sont conservés. Les gains sont consignés dans la provenance.
- `npm test` final : **275 réussites, 0 échec, 0 ignoré**.
  Les 265 tests existants et dix tests audio couvrent linéarité,
  invalides, cache, absence de lecture tardive, plafond et éviction des voix,
  nettoyage, mute, échec isolé, refus de reprise puis réessai, destruction pendant
  téléchargement **et décodage**, et son de poche.
- Rendu Web Audio natif dans Chromium 156 via le lecteur de production : douze
  comparaisons isolées (0,03→0,06 ; 0,75→1,5 ; 6→12 ; 12→24 m/s pour chaque famille).
  Amplitude exactement doublée, erreur maximale par échantillon : zéro.
- Rafales synchronisées à 24 m/s, douze puis cent demandes avec un budget demandé
  de cent : douze voix retenues, 88 évictions sur cent, aucun pic ≥ 1 dans ces cas.
  Pics queue 0,9000, billes 0,9298, bandes 0,8147, mélange 0,7591.
  Les détails sont dans `data/impact-audio-v076-validation.json`.
- Le jeu de production démarre dans Chromium avec WebGL 2 : écran de chargement
  masqué, caméra perspective, aucun remplacement par le mode 2D.
- Essais navigateur instrumentés : tir doux en jauge (5 %), tir fort (100 %),
  bandes avec blanche seule, casse du triangle (45 collisions bille/bille et
  28 contacts de bande dans cette casse aléatoire), effet latéral/coulé et
  élévation à 8°, SON OFF/ON, coupure immédiate pendant un tir, replay silencieux
  et parcours du curseur. Les bons buffers ont été observés au démarrage des voix,
  sans modification de playbackRate. Aucun événement error/unhandledrejection
  observé dans ces essais.
- Geste souris : capture réelle du pointeur, phase de recul puis frappe via des
  événements de souris simulés et horodatés ; tir déclenché, son de queue puis
  contact de bande. Le moteur termine ce tir sans erreur.
- Relecture croisée : lecteur/intégration/tests relus indépendamment de leurs
  auteurs ; sources et préparation PCM également vérifiées par un autre agent.

### Reproduction des mesures audio

Servir `dist/` en HTTP et ouvrir le jeu dans Chromium lancé avec
`--remote-debugging-port=9222`, puis exécuter depuis la racine du dépôt :

```sh
node scripts/validate-impact-audio.mjs http://127.0.0.1:9222 /tmp/impact-audio-validation.json
npm test
```

Le script utilise les nœuds natifs d’OfflineAudioContext ; un adaptateur d’état
permet uniquement de programmer les voix à zéro avant le rendu hors ligne.
Il ne remplace ni les nœuds de gain ni le compresseur du lecteur.

### Limites des contrôles

Les essais fonctionnels utilisent un harnais local non livré : inspection des
états et avance accélérée du moteur par `physicsStep(FIXED_STEP)`. Le rendu
logiciel SwiftShader étant très lent, sa résolution et ses ombres sont réduites ;
la boucle de rendu est arrêtée pour le contrôle du geste souris. Les événements
sont simulés, et ces essais ne mesurent pas la latence audio/visuelle d’une
machine avec GPU. Aucune écoute subjective n’est revendiquée. Les sons choisis
restent ceux déjà approuvés par l’utilisateur. L’absence de saturation concerne
les cas mesurés, sans garantie sur tout mélange arbitraire. Les modèles physiques,
règles et paramètres sont inchangés.
