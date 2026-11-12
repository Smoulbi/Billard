# FRAME v0.71 — audit numérique des bandes avec effet

12 novembre 2026.

## Résultat et portée

Cette livraison ajoute un instrument de diagnostic, sans modifier les équations,
les coefficients ni le choix actif **`reference-v069`**. Les visuels restent
inchangés, à l'exception du numéro de version affiché.

Les 36 conditions passent les contrôles sur 180 simulations : aucun état non
fini, contact multiple, événement saturé, capture en poche, pénétration détectée
ou gain d'énergie totale aux instants observés. Cela établit uniquement la
cohérence numérique sur cette matrice. Aucune nouvelle mesure indépendante de
pool avec effet n'a été acquise et aucun gain de réalisme n'est revendiqué.

## Organisation et revue

Un agent chercheur a classé les sources et documenté les accès refusés ; un agent
développeur a écrit le collecteur et les tests ; un agent vérificateur a examiné
indépendamment les conventions, les observations et les critères. L'intégration
et la synchronisation de version ont été réalisées séparément.

La revue a notamment détecté l'emploi de la normale de sortie pour nommer un
angle incident. Le protocole corrigé distingue explicitement ces angles et
vérifie toutes les composantes de l'état incident. L'accord entre les agents
n'est ni une mesure physique ni une preuve de réalisme.

## Protocole limité

- Une bille américaine de diamètre 57,15 mm et de masse 170,097 g, profil `pool`,
  hauteur de nez 36,29025 mm ; paramètres complets conservés dans le JSON.
- Roulement naturel prescrit au contact géométrique d'une bande droite, sans
  rétro/coulé additionnel. Les callbacks vérifient l'état effectivement reçu.
- Vitesses 0,5 / 1,2 / 2,3 m/s ; incidences 0 / 30 / 60 / 75° depuis la normale
  entrante ; effet vertical adimensionné `s = R*omega_y/v = -1 / 0 / +1`.
- Chaque condition est exécutée sur une bande longue, sur sa symétrique, sur une
  bande courte avec rotation de 90° du repère local, puis à deux pas plus fins.
  Il s'agit d'une transformation locale, pas d'une rotation de toute la table
  rectangulaire. Les impacts sont éloignés des poches et des raccords.
- Pas principal 0,0001 s, puis 0,000025 s et 0,0000125 s pour les 36 conditions,
  y compris celles qui ne paraissent pas sensibles au premier raffinement.

Le collecteur conserve les positions, vitesses signées, trois rotations,
l'énergie et les temps : état initial, incident observé, immédiatement après
l'impulsion et premier échantillon intégré en roulement véritable. Le roulement
exige l'état moteur `rolling` et un glissement inférieur à `1e-8 m/s` ; l'ancien
critère de glissement résiduel `0,002 m/s` n'est pas utilisé. Le temps de retour
au roulement reste échantillonné, avec une résolution bornée par le pas ; ce
n'est pas une mesure exacte de l'instant analytique de transition.

Les callbacks d'impact ont un temps local au pas : le collecteur y ajoute le
temps déjà écoulé. Le tableau de billes est conservé entre les pas. Les sorties
immédiates et au roulement sont comparées séparément pour les symétries et la
convergence. Les cas sans roulement à deux secondes, avec contacts multiples,
poche ou saturation restent enregistrés et font échouer l'audit ; aucun n'est
écarté pour améliorer un score.

## Critères et interprétation

Les seuils sont des **tolérances d'ingénierie**, pas des incertitudes déduites
d'une vraie table : gain relatif d'énergie totale `1e-6`, pénétration `1e-7 m`,
convergence de position `0,001 m`, vitesse `0,001 m/s`, rotation `0,05 rad/s`,
temps `0,0002 s`.
Les seuils exacts des symétries figurent dans le script et le JSON.
L'énergie considérée additionne translation et rotation de la sphère homogène :
un transfert du spin vers la translation peut accroître la vitesse du centre
sans création d'énergie totale. Le contrôle porte sur les callbacks et les
échantillons observés, pas sur une preuve continue de tous les sous-instants.

Sur cette grille, le plus grand écart de position entre résolutions est
`0,151 mm`. Le plus grand écart de vitesse entre résolutions est
`0,00000736 m/s`, celui de rotation `0,00100 rad/s` et celui de temps `0,075 ms`.
Les écarts de vitesse, rotation et temps des symétries sont nuls aux valeurs
numériques conservées ; aucun gain relatif d’énergie ni pénétration n’est détecté.

Le premier roulement survient entre environ 11,7 et 180,7 ms sur la grille :
observer systématiquement la bille à 80 ms ne représente donc pas le même
événement pour toutes les conditions. Les composantes tangentielles restent
signées ; au choc normal, la composante incidente tangentielle est nulle et un
rapport de rétention tangentielle n'aurait pas de sens. Aucun tel ratio n'est
utilisé pour fabriquer un score.

## Preuves disponibles et prochaine décision

La [sélection v0.69](SELECTION_MODELE_POOL_v0.69.md) compare des prédictions à
une régression TUM déjà utilisée dans la construction du modèle. Les grilles
d'interpolation de cette formule ne sont pas un jeu expérimental indépendant.
Cet audit ne classe aucun candidat sur la fidélité réelle des effets et
n'ajuste aucun coefficient.

Voir [l'examen des sources](SOURCES_BANDES_EFFET_v0.71.md) : les originaux TUM,
CSU et Alciatore ont été refusés par le proxy (`CONNECT 403`). Une source
secondaire de théorie Kiefl a été relue ; elle n'apporte pas de nouvelles
mesures américaines avec effet.

La prochaine décision physique nécessite soit un défaut mécanique précis
reproductible, soit des données expérimentales indépendantes avec vitesses,
rotations, instants observés et incertitudes. Le protocole documentaire propose
un pilote de 60 tirs avec une partie réservée avant tout ajustement. Les
améliorations visuelles restent un chantier séparé.

## Reproduction

Depuis la racine du dépôt, avec Node.js 24, sans installation npm :

```bash
node scripts/audit-pool-spin.js
npm test
```

Le script écrit [le rapport complet](data/pool-spin-audit-v071.json) et conserve
un code de sortie non nul en cas d'échec. L'import de ses fonctions n'exécute
pas le CLI. Le rapport contient la provenance de génération et les paramètres ;
un commit de génération antérieur au commit de livraison est attendu puisque
les résultats sont ensuite intégrés à la livraison. Relancer le script peut
modifier ces métadonnées même lorsque les résultats numériques sont identiques.

## Vérification de livraison

- Avant modification : 245 tests réussis. Après intégration : **252 tests
  réussis**, aucun échec, ignoré ou annulé, dont sept tests propres à l'audit.
- Les 12 témoins sans effet retrouvent le mesureur qualifié v0.69 pour la
  sortie immédiate, le premier roulement et son temps échantillonné. Cette
  concordance est une non-régression logicielle, pas une validation physique.
- Chromium avec WebGL 2 logiciel : chargement sans erreur JavaScript, lancement
  de l'entraînement, tir en mode jauge et compteur à `01`. Le modèle sélectionné
  reste `reference-v069`.
- Comparaison Git : moteur, profils, mesureur historique et logique du jeu
  inchangés ; seuls les numéros de version changent dans le HTML.
