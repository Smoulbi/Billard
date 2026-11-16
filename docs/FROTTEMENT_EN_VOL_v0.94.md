# Frottement entre billes en vol — recherche approfondie

16 novembre 2026. **Aucune modification du frottement du jeu dans cette version** :
la fonctionnalité livrée en 0.94 est la caméra de replay. La présente étude
spécifie un modèle à tester pour une prochaine modification.

## Sources effectivement vérifiées

- **Peskin, 2020**, *Collision of Billiard Balls in 3D with Spin and Friction* :
  note théorique, géométrie et vitesses de surface p. 1–4, impulsions et bilans
  p. 6–10. La page 10 limite explicitement la solution au cas où le glissement
  ne s’annule pas pendant le choc. Le modèle d’adhérence doit donc être ajouté ;
  recopier seulement la branche Coulomb glissante serait incomplet.
- **Alciatore, TP A-14**, *The effects of cut angle, speed, and spin on object
  ball throw* : équations 3–5, vitesse tangentielle avec deux composantes, dont
  une verticale ; équations 7–15, limites dues au frottement et à l’annulation
  du glissement. La page 4 ajuste une loi sur trois valeurs issues de Marlow
  (1995, tableau 10, p. 245). Le livre original de Marlow n’a pas été consulté.
- **Kim, 2024**, *Collision of two spinning billiard balls and the role of table* :
  prépublication théorique. Introduction et §2 : la réaction de la table et le
  frottement associés peuvent participer à l’impulsion lorsque les billes sont
  initialement sur le tapis. Le cas de départ est une cible immobile sur un plan,
  pas deux sphères déjà libres en vol.
- **Mathavan et al., 2014**, DOI 10.1007/s12283-014-0158-y : titre et métadonnées
  vérifiés via OpenAlex. Le texte intégral n’a pas été obtenu. Une URL PDF
  supposée sur le site de Dr Dave renvoie une page HTML ; aucun résultat
  numérique n’en a été extrait. Cette piste reste bibliographique.

Les liens et empreintes SHA-256 sont dans
[le manifeste des sources](data/airborne-friction-v094-sources.json).

## 1. Vitesse pertinente : les surfaces au contact

Pour deux sphères identiques A et B, masse `m`, rayon `R`, inertie
`I = 2mR²/5`, on définit `n` de A vers B au contact. Les points matériels en
contact sont à `+Rn` par rapport à A et `-Rn` par rapport à B.

La vitesse de la surface de B relativement à celle de A est :

```
u = (vB - vA) - R (ωA + ωB) × n
un = u · n
ut = u - un n
```

C’est `|ut|`, et non la seule vitesse de déplacement de la blanche, qui entre
dans le frottement. Un choc vertical peut donc transférer de la rotation et du
mouvement horizontal. Inversement, deux rotations opposées peuvent s’annuler
au point de contact malgré des vitesses angulaires individuelles élevées.

Dans le jeu, le solveur aérien applique actuellement une impulsion normale 3D.
Il manque cet échange tangent complet des vitesses et des trois rotations.

## 2. Proposition pour deux sphères entièrement libres

Ce qui suit est **notre dérivation d’une fermeture rigide instantanée** :
restitution normale de Newton + frottement de Coulomb plafonné. Ce n’est pas une
retranscription du solveur énergétique complet de Peskin, ni une loi calibrée
sur des collisions aériennes réelles.

Pour un choc approchant (`un < 0`) et un coefficient normal `e` :

```
Jn = -(1 + e) (m/2) un
Kt = 2/m + 2R²/I = 7/m
Jt = -min(μ Jn, |ut|/Kt) ut/|ut|     (si |ut| > 0 ; sinon Jt = 0)
J  = Jn n + Jt

vA' = vA - J/m
vB' = vB + J/m
ωA' = ωA - (R/I) n × Jt
ωB' = ωB - (R/I) n × Jt
```

Les deux variations de rotation ont le même signe vectoriel : les bras de
levier et les forces changent tous deux de signe. La conservation à vérifier
porte sur **rotation propre + moment orbital**, pas sur la somme des seules
rotations. Le plafond `|ut|/Kt` arrête le glissement sans le retourner.

Sous ces hypothèses, les variations d’énergie sont :

```
ΔEn = -(m/4) (1 - e²) un²
ΔEt = Jt · ut + (Kt/2) |Jt|²
```

Pour `0 ≤ e ≤ 1` et le plafond ci-dessus, ces variations sont non positives.
L’élasticité tangentielle peut produire d’autres comportements dans un contact
compliant ; cette approximation rigide ne prétend pas les reproduire.

## 3. Quel coefficient de frottement ?

La loi déjà utilisée pour les contacts plans dans le jeu est :

```
μ(s) = 0,009951 + 0,108 exp(-1,088 s),   s en m/s
```

Elle provient de l’ajustement de TP A-14 aux données de Marlow, dont les vitesses
sont multipliées par `sin(45°)` pour représenter le glissement tangentiel :

| Vitesse tangentielle utilisée dans l’ajustement | Coefficient source |
|---|---:|
| `0,1 sin(45°) ≈ 0,0707 m/s` | 0,11 |
| `1 sin(45°) ≈ 0,7071 m/s` | 0,06 |
| `10 sin(45°) ≈ 7,071 m/s` | 0,01 |

C’est un point de départ pour une hypothèse isotrope en 3D. **Cela ne démontre
pas que ce même ajustement est calibré pour tous les impacts aériens**, toutes
les billes, ou les contacts sales/crayeux. Les décimales de l’ajustement ne sont
pas une précision expérimentale connue. Le coefficient normal 0,94 actuellement
utilisé resterait une hypothèse distincte, sans être confondu avec la restitution
bille–tapis de 0,6.

La sensibilité peut être importante : pour deux billes sans rotation, avec
2 m/s de vitesse relative normale et 1 m/s tangentielle, `e = 0,94`, la limite
entre glissement résiduel et glissement annulé est proche de `μ = 0,0736`.
Une variation de μ peut donc changer le régime, pas seulement l’angle de sortie.

## 4. Cas à ne pas mélanger : une bille encore sur le tapis

Les formules précédentes supposent deux sphères libres pendant l’impulsion.
Si une bille est poussée vers le tapis, celui-ci fournit une impulsion extérieure.
La masse effective devient couplée aux contacts actifs : appliquer la formule
libre, puis effacer une vitesse verticale négative, n’est pas une résolution
complète de ce contact multiple.

Il faut donc deux parcours :

1. **Deux billes libres** : résolution vectorielle ci-dessus, sans projection
   sur le tapis. Conservation des quantités de mouvement linéaire et angulaire.
2. **Contact avec support actif** : traiter ensemble les contraintes bille–bille
   et bille–tapis, avec impulsion normale du tapis non négative, absence de
   pénétration et éventuelle séparation. Inclure l’impulsion de la table dans
   les bilans ; ne pas exiger la conservation du moment vertical des deux billes
   seules lorsqu’une force extérieure agit.

La note de Kim rend ce deuxième cas explicite. Elle ne supprime pas la nécessité
de valider numériquement un solveur multi-contact pour les cas de jump.

## 5. Vérification numérique hors du jeu

Le script autonome [study-airborne-friction-v094.mjs](../scripts/study-airborne-friction-v094.mjs)
n’est importé par aucun module du jeu. Il vérifie **500 états synthétiques** :
conservation linéaire/angulaire, bilan analytique d’énergie, absence d’inversion
du glissement et covariance après une rotation arbitraire du repère.

Les erreurs maximales sont de l’ordre de `2,2 × 10⁻¹⁶` pour le moment linéaire,
`7,2 × 10⁻¹⁸` pour le moment angulaire, `6,9 × 10⁻¹⁶` pour le bilan d’énergie
et `4,6 × 10⁻¹⁴` pour la comparaison après rotation (unités SI correspondantes).
Les écarts proches de l’arrondi machine vérifient l’algèbre de cette proposition ;
**ils ne mesurent pas son réalisme expérimental**.

Un exemple synthétique de choc avec normale verticale, les deux billes libres,
annule le glissement et modifie la rotation de chaque bille d’environ 7,83 rad/s.
Le cas sans glissement ne reçoit aucune impulsion tangentielle. Des valeurs
constantes de μ = 0,03 / 0,05 / 0,08 sont comparées pour illustrer la sensibilité.

[Cas et résultats synthétiques](data/airborne-friction-v094-cases.json).
Reproduction, sans écriture dans le dépôt par défaut :

```
node scripts/study-airborne-friction-v094.mjs
node scripts/study-airborne-friction-v094.mjs /tmp/airborne-friction.json
```

## 6. Ce qui reste avant une modification du moteur

- Identifier explicitement les billes libres et celles dont le support est actif.
- Intégrer le glissement et l’adhérence sans déplacer arbitrairement les centres
  d’une manière qui ajouterait de l’énergie potentielle.
- Vérifier les contacts rasants et leur instant exact. Sans résistance de l’air,
  deux billes libres ont la même accélération gravitationnelle : leur position
  relative est linéaire et le temps de contact se calcule par une équation
  quadratique. Une bille libre face à une bille soutenue peut exiger une équation
  quartique. Cela évite de confondre « en 3D » avec « toujours quartique ».
- Ajouter des contrôles indépendants du repère, des rotations hautes/basses et
  de l’énergie pour le solveur effectivement intégré, ainsi que l’accord du guide
  et du replay avec la simulation.
- Calibrer sur des vitesses et rotations mesurées avant/après des impacts libres,
  puis sur des impacts avec support. Conserver des essais indépendants hors
  ajustement. Les vidéos HSV B.46 et « Amazing BILLIARDS PHYSICS in Super Slow
  Motion » citées par Kim sont des pistes de comparaison ; aucune valeur de μ
  aérien n’en a été mesurée ici.

La prochaine modification peut donc commencer par les **deux sphères libres**,
mais elle doit garder explicite le domaine de validité et le cas soutenu. Les
résultats actuels n’autorisent pas à annoncer une calibration complète des jumps.
