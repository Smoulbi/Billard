# Étude v0.71 — sources et acquisition pour les bandes avec effet

12 novembre 2026. Recherche documentaire, sans modification du modèle physique.

## Question limitée

L'enveloppe tangentielle de `reference-v069` est identifiée sur une régression
de rebonds américains en roulement naturel **sans effet latéral**. Son usage
avec effet est une extrapolation, déjà signalée dans les notes v0.17.
La première étude doit déterminer comment tester cette extrapolation sur une
bande droite, loin des poches et des jonctions. Le modèle actuel reste la
référence ; une nouvelle équation ne devient pas plus réaliste par sa seule
complexité ni par l'accord de plusieurs agents.

## Sources effectivement consultées pendant cette étude

Les documents du dépôt `SELECTION_MODELE_POOL_v0.69.md`,
`COMPARAISON_PHYSIQUE_v0.68.md`, `../RELEASE_NOTES_v0.17.md`,
`../ETUDE_MATERIAUX_v0.22.md` et `../VALIDATION_PROTOCOL_v0.22.md` ont été lus.
Ils distinguent déjà les scores sur la régression TUM des observations
expérimentales indépendantes.

Une source externe de méthode a été relue :

- Evan Kiefl, *Pooltool theory*, section III « ball-cushion interactions »,
  [source Markdown](https://raw.githubusercontent.com/ekiefl/ekiefl.github.io/main/_posts/pooltool/2020-04-24-pooltool-theory.md),
  récupérée le 12 novembre 2026. SHA-256 du document consulté :
  `eb4da948bfec9ab30c22fa4aefefe5864fea95f4e1343890ee8771fbfb07dda4`.
  Cette section expose l'état incident et sortant avec translation et rotation,
  la dépendance à la hauteur du nez de bande, les hypothèses de contact
  instantané de Han et les difficultés de déformation/contact avec le tapis.
  Elle signale également deux corrections d'équations de Han. Cela justifie
  des vérifications de conventions et d'hypothèses ; ce texte secondaire
  n'apporte pas ici de mesures brutes américaines avec effet. Les vidéos et
  articles qu'il cite n'ont pas été visionnés ou relus dans cette étude.

Ce document vivant est identifié par l'empreinte de la copie consultée ;
l'URL `main` peut évoluer. Aucun coefficient n'en a été importé.

## Originaux demandés mais non revérifiés

Les trois requêtes ci-dessous ont reçu un refus `CONNECT tunnel failed,
response 403` du proxy le 12 novembre 2026. Aucun contenu d'article n'a été
reçu. Ce refus ne démontre pas que les publications sont indisponibles en
général ; il empêche leur relecture dans le réseau actuel. La vérification
TLS est restée active et aucune configuration réseau n'a été modifiée.

| Destination tentée | Document ou page | Statut de lecture |
|---|---|---|
| `mediatum.ub.tum.de` | [Nierhoff, Heunisch et Hirche, *Strategic play for a pool-playing robot*](https://mediatum.ub.tum.de/doc/1155344/988748.pdf) | PDF original non reçu |
| `billiards.colostate.edu` | [Page sur les effets de bande](https://billiards.colostate.edu/faq/sidespin/rail-effects/) | Page non reçue ; son contenu et la validité du chemin n'ont pas pu être établis |
| `drdavepoolinfo.com` | [Alciatore TP B.6](https://drdavepoolinfo.com/technical_proofs/new/TP_B-6.pdf) | PDF non reçu |

Mathavan 2009/2010, Cross 2010 et Gismeros Moreno 2022 n'ont pas été
revérifiés dans leurs originaux ici. Les qualifications suivantes reprennent
l'audit du dépôt et doivent conserver ce statut.

## Nature des preuves disponibles

| Référence ou contrôle | Nature et emploi permis | Limite pour les bandes avec effet US |
|---|---|---|
| Nierhoff–Heunisch–Hirche, TUM, 1 217 impacts rapportés | Régression expérimentale de pool déjà utilisée pour identifier le modèle ; contrôle de reproduction numérique sans effet latéral | Les grilles v0.69 sont calculées avec cette même équation. Ni les points d'interpolation ni la grille supplémentaire ne deviennent un jeu de validation indépendant. Pas de mesures brutes avec rotations disponibles dans le dépôt. |
| Alciatore HSV B.15 / TP B.6 | Repère qualitatif/indicatif de pool, selon la documentation existante | « Environ 50 % » ne définit pas une cible exacte à une vitesse et sur une table déterminées. Aucun corpus avec effet et incertitudes n'a été acquis ici. |
| Mathavan 2009 et 2010 | Méthode d'imagerie et modèles de choc ; comparaison historique snooker | Les constantes snooker ne caractérisent pas une gomme K55/K66 américaine. |
| Cross 2010 | Hypothèses de compliance tangentielle, collage et glissement | Ne fournit pas ici les coefficients de notre table ; exemple de surface différent. |
| Han/Tailuge et Kiefl/Pooltool | Équations, architecture, signes, tests analytiques | Les méthodes et comparaisons entre simulateurs ne sont pas des observations indépendantes de pool américain. |
| Gismeros Moreno 2022 | Contacts multiples et hypothèses matérielles | Les modules représentatifs et constantes reprises ne sont pas une identification indépendante de notre bande. |
| Énergie, symétrie, convergence, non-pénétration | Cohérence mécanique et numérique sur les états testés | Leur succès ne mesure pas l'erreur sur une vraie table. |

**Aucune nouvelle mesure brute indépendante de rebond américain avec effet
n'a été obtenue pour cette étude.** La plus petite RMSE contre la loi de
calibration ne démontre donc pas la meilleure restitution réelle des effets.

## Acquisition minimale proposée, à valider par un pilote

Un premier lot limité peut prendre **2 vitesses × 2 incidences × 3 effets
latéraux = 12 conditions**, avec cinq répétitions par condition, soit 60 tirs.
Par exemple 0,8 et 1,6 m/s, 30° et 60° par rapport à la normale, puis effet
nul et deux effets de signes opposés de grandeur modérée. Ce sont des choix
de protocole, pas des limites physiques établies. Un pilote doit montrer
que la précision et la répétabilité permettent de distinguer les prédictions.
Les états réellement obtenus au contact, et non les réglages de queue,
constituent les entrées de simulation. La grandeur de l'effet doit être
mesurée et conservée en rad/s ; le rapport adimensionné `R*omega_vertical/v`
peut compléter la description sans remplacer les données physiques.

- Une seule table et une seule bande droite ; billes américaines mesurées,
  bande et tapis identifiés, hauteur du nez, état de propreté, température et
  humidité consignés. Impacts éloignés des poches et des raccords.
- Roulement naturel incident pour les composantes horizontales de rotation,
  avec ajout de rotation verticale ; pas de rétro/coulé supplémentaire dans
  ce premier lot. Vérifier ces conditions par les marques de la bille.
- Caméra supérieure rapide, référence métrique et correction de perspective ;
  commencer à 500 images/s ou davantage comme le propose le protocole v0.22,
  puis établir l'incertitude par le pilote. Une seconde vue latérale contrôle
  un éventuel décollage. Une cadence suffisante pour suivre le centre ne
  garantit pas de résoudre la durée du contact ni les trois rotations.
- Conserver vidéos originales, horodatages, calibration, méthode de suivi,
  résidus et incertitudes. Définir le repère local normal/tangent/vertical et
  ses signes avant extraction, puis documenter la conversion vers le moteur.
- Mesurer les vitesses et les trois composantes de rotation juste avant
  contact, à la première séparation effectivement résolue et au premier
  roulement vérifié. Conserver les horodatages et incertitudes : une image
  arbitraire après le rebond ne constitue pas l'état immédiatement sortant.
  Un état non résolu reste manquant, jamais remplacé par une prédiction.
- Si un envol est observé, conserver le tir et signaler la limite du modèle
  à hauteur contrainte ; ne pas le faire disparaître par une exclusion a
  posteriori. Les règles de qualité/exclusion doivent être préétablies.

Réserver deux répétitions par condition à une validation finale, distincte
des trois répétitions d'identification, avant tout ajustement. Rapporter
biais, MAE, RMSE et pire écart séparément par vitesse, incidence, signe
d'effet et observable, avec dispersion et incertitude. La taille de ce lot
ne permet pas de généraliser à toutes les bandes, tapis ou tables.

Comparer d'abord `v_normal`, `v_tangent` en m/s et les rotations en rad/s,
avec signes, à chaque instant défini. Les angles et rapports sont des
observables supplémentaires ; éviter un ratio tangentiel près d'une
composante incidente nulle. Ne pas additionner arbitrairement des erreurs
de vitesses, angles et rotations en un score unique.

Le JSON d'import historique du protocole v0.22 ne contient ni rotations ni
les deux instants de sortie : il ne suffit pas tel quel pour cette étude.
Une acquisition future devra conserver ces champs et leur provenance.
L'étude proposée n'invente pas de valeurs pour remplir ce schéma.

## Décision à ce stade

Conserver `reference-v069` sans retouche de paramètres. Les travaux possibles
immédiatement sont la cartographie numérique et l'examen des hypothèses de
frottement ; leur résultat reste un diagnostic. Une promotion physique exige
ensuite une amélioration mesurable sur les tirs indépendants, compatible avec
leurs incertitudes et avec les contrôles mécaniques et de non-régression.
Les améliorations de rendu ne font pas partie de cette étude.
