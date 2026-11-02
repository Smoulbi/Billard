# FRAME v0.15 — calibration pool américain

## Lancer la version locale

Dans le dossier contenant `dist`, exécuter :

```sh
python3 -m http.server 8000 --directory dist
```

Ouvrir `http://localhost:8000/` dans le navigateur.

## Profils physiques

- **Pool américain (actif)** : billes de 57,15 mm, table 9 pieds, frottement roulant 0,010 (valeur typique d'Alciatore, TP B.6), frottement glissant 0,20. La restitution effective des bandes est réglée à 0,54 dans **ce moteur**, pour obtenir près de 50 % de la vitesse incidente après rebond puis glissement dans les essais perpendiculaires en roulement sans effet latéral. Ce 0,54 n'est **pas** le coefficient intrinsèque de restitution du caoutchouc, qu'Alciatore estime plutôt à environ 0,70 dans un modèle simplifié.
- **Snooker (conservé dans le code)** : ancienne régression Mathavan et al. (2009) des rebonds immédiats et frottement roulant 0,0128 ; appel possible avec `simulatePhysics(balls, dt, {cushionProfile:'snooker'})`. Cette archive physique fonctionne encore avec la **géométrie américaine** : un futur snooker complet nécessitera ses propres billes, poches, table et validation.

Les deux profils passent par le même moteur : intégration, détection continue des contacts, collisions et prévision des trajectoires. Le profil pool est sélectionné par défaut.

## Validation

- 32 scénarios de calibration, comprenant 3 vitesses de rebond « pool » évaluées **après glissement** et 4 cas de la régression snooker évalués **immédiatement après impact** ; les deux observables ne sont pas interchangeables.
- Les 50 % ne représentent **pas** trois mesures directes à 0,5 / 1,2 / 2,3 m/s, mais un ordre de grandeur pour des rebonds perpendiculaires sur table américaine. Les angles obliques, états de rotation, caoutchoucs et tapis nécessitent des données expérimentales supplémentaires.
- Les comparaisons Mathavan de vitesse bille-bille concernent le snooker et ne doivent pas être présentées comme des validations indépendantes de billard américain.
- Les tests automatisés couvrent les deux profils, la casse, l'absence de gain d'énergie, la cohérence entre visée et simulation, et les exports.

## Références de calibration

- D. G. Alciatore, [HSV B.15 — vidéos rapides de rebond](https://drdavepoolinfo.com/high-speed-video/hsv-b-15/).
- D. G. Alciatore, [TP B.6 — pertes de vitesse après rebond et frottement](https://drdavepoolinfo.com/technical_proofs/new/TP_B-6.pdf).
- Mathavan, Jackson & Parkin (2009), [High-speed video analysis of snooker balls and their collisions](https://drdavepoolinfo.com/physics_articles/ajp_09_hsv_article.pdf) (courbe snooker archivée).

## Distribution

Cette archive est une version locale v0.15. Elle n'implique pas que le site en ligne ait été mis à jour.
