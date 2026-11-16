# Contact bille–tapis — 0.93

La frappe crée une vitesse descendante sans seuil d’angle. Le même solveur
sphère–plan est appliqué immédiatement au départ et à chaque réception.

Restitution normale nominale : 0,6, au milieu de la plage approximative 0,5–0,7
indiquée par [Dr Dave](https://drdavepoolinfo.com/faq/physics/physical-properties/).
Le frottement d’impact est un paramètre Coulomb séparé, fixé provisoirement à 0,2
(repère typique du glissement, sans mesure spécifique aux impacts). L’impulsion
tangentielle est plafonnée par celle qui annule le glissement au point de contact ;
elle change vitesse et rotation sans inverser le glissement. Le solveur ne crée
pas d’énergie. Les rebonds de hauteur prédite inférieure à 0,05 mm sont coupés
pour terminer la séquence : choix numérique, pas une propriété mesurée.

La réception consomme correctement le temps restant du pas après le rebond.
Une ouverture de poche ne fournit pas d’impulsion ni de bruit de réception.
Le guide, le rendu et la frappe utilisent le même état de départ après contact.
La remise de l’élévation à zéro et les métadonnées du replay sont conservées.
Les fausses queues restent des frappes affaiblies et peuvent physiquement faire
un petit saut ; aucun blocage arbitraire du mouvement vertical n’est ajouté.

Le contact simultané procédé–bille–tapis reste approximé par deux contacts
instantanés successifs. Compression du tapis, blocage par le procédé et
coefficients dépendant de la vitesse ne sont pas calibrés.

## Point de reprise

58 tests ciblés attendus : contact normal/tangentiel, dissipation, rotation,
absence d’inversion de glissement, continuité autour de 20°, franchissement,
réception, son, replay, guide et consommation du reste du pas.
Restent la suite complète, le contrôle navigateur et la recherche détaillée
sur les collisions en vol, les bandes 3D et les queues de saut.
