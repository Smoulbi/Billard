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

## Validation terminée

- Suite complète : **317 tests réussis**, aucun échec ni test ignoré.
- 58 tests ciblés couvrent notamment restitution, impulsion tangentielle,
  énergie, non-inversion du glissement, continuité autour de 20°, temps restant
  après rebond et absence de rebond sur une ouverture de poche.
- Sur la page réelle dans Chromium/SwiftShader : angle 45°, vitesse de référence
  4 m/s, vitesse horizontale de départ 2,0203 m/s et verticale 1,6971 m/s.
  La blanche franchit l’obstacle immobile ; la hauteur du maillage suit celle
  du corps physique. À 15°, le départ vertical est 0,6212 m/s, sans seuil à 20°.
- Le réglage revient à 0° et le replay conserve 45° ou 15°. Aucune erreur JS
  dans l’essai de ces deux angles.

Le navigateur de contrôle utilise un serveur temporaire ajoutant des accès QA
à la copie servie du module ; aucun accès QA n’est présent dans les fichiers
livrés. Les tests numériques ne constituent pas une calibration expérimentale.

[Mesures](data/table-contact-v093-validation.json) · [Capture](data/table-contact-v093-jump.png)
