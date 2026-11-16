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

## Point de reprise

Les quatre tests de navigation et de restauration passent, ainsi que les tests
existants ciblés. Restent : suite complète, vérification réelle des gestes dans
le navigateur, validation visuelle et recherche approfondie sur le frottement
des billes en vol.
