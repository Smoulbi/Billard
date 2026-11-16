# Caméra de replay — 0.94

Le replay ouvre une vue en perspective avec caméra libre. Le panneau de lecture
est non modal : les gestes sur le tapis atteignent le canvas. Clic droit pour
orbiter, bouton central pour déplacer et défilement pour zoomer. Le bouton de
vue et V alternent dessus/perspective. Une rotation depuis le dessus reprend la
vue libre. La navigation fonctionne pendant la lecture, en pause et à la fin.

L’état enregistré et les billes réelles restent séparés. Les commandes de partie
sont masquées ; clics et mouvements ne visent ni ne déplacent les billes du jeu.
La caméra, le mode et l’orbite sont sauvegardés et restaurés à la sortie ; une
capture de pointeur encore active est relâchée. Ouvrir le menu pause bloque
les commandes de caméra jusqu’à la reprise.

## Validation terminée

- Suite complète : **321 tests réussis**, zéro échec ni test ignoré.
- Les quatre nouveaux tests exécutent les gestionnaires réels de navigation,
  le blocage pendant le menu pause et la restauration d’orbite/capture.
- Chromium/SwiftShader, événements souris et clavier CDP : rotation, déplacement,
  zoom, V, sortie du dessus par rotation, navigation en pause et en fin de lecture.
  La lecture reprend aussi pendant que la caméra est libre.
- Images différentes avant/après navigation ; positions réelles, visée et
  enregistrement inchangés. Sortie avec bouton droit encore appuyé : caméra
  et orbite restaurées. Retour à la première personne également vérifié.
- Panneau contenu dans 390 × 844 et 844 × 390, canvas sur toute la largeur.
  Aucune erreur JavaScript pendant le parcours.

Le contrôle navigateur emploie uniquement des accès QA ajoutés par le serveur
temporaire pour créer un enregistrement déterministe. Aucun accès QA n’est
livré dans le jeu. DPR 0,6 pour les vérifications, capture finale DPR 1.

[Mesures](data/replay-camera-v094-validation.json) · [Capture](data/replay-camera-v094.png)
