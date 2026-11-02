# FRAME — géométrie de référence des poches (v0.56)

Toutes les coordonnées sont en mètres. Les poches de coin utilisent les axes locaux `u=sx*(x-p.x)`, `v=sz*(z-p.z)` ; les valeurs positives pointent vers l'extérieur de la table. La même construction est réfléchie aux quatre coins.

## 1. Une ouverture ronde indépendante de la menuiserie

L'ancienne version v0.47 reliait un arc avant et un arc arrière avec deux segments droits. Ces segments formaient deux triangles noirs derrière les mâchoires, exactement là où le tapis devait continuer. L'apparence n'était donc **pas circulaire**.

Le modèle distingue désormais trois géométries :

1. **Mâchoires physiques** inchangées : `A=(-a,0)`, `B=(0,-a)`, avec `a=80,8 mm`, soit `114,27 mm` entre les deux nez. Les angles des bandes et les profondeurs de tablette ne sont pas modifiés.
2. **Retour du cadre supérieur** redessiné : une courbe symétrique passe toujours par les raccords de bande à `(-a+19 mm,49 mm)` et `(49 mm,-a+19 mm)`, mais s'écarte d'au moins 12 mm du bord de la vraie poche. L'ancien cercle décoratif croisait le trou noir au fond ; il était impossible d'y poser une plaque continue sans intersection.
3. **Ouverture noire unique** : cercle complet de centre `(cₒ,cₒ)` et de rayon `Rₒ`. La bordure du tapis, la découpe de l'ardoise, le panier 3D et le test d'empochage découlent de cette même ouverture.

La norme WPA définit notamment la largeur des poches entre les mâchoires, mais ne prescrit pas un centre et un rayon uniques pour le trou visible. La reconstruction ci-dessous reste donc une **hypothèse visuelle explicite**.

## 2. Détermination analytique du cercle de poche

Le cercle du retour arrière conserve son centre local `(cᵣ,cᵣ)`, son rayon `Rᵣ` et sa flèche `sᵣ`. Le point le plus avancé vers le tapis, sur la bissectrice du coin, est conservé de la v0.47. Le point arrière garde l'étendue précédente du raccord de meuble.

En coordonnées locales, pour chacune des coordonnées identiques de la bissectrice :

```
avant   = -a/2 + sᵣ/√2
arrière = cᵣ + Rᵣ/√2
cₒ      = (avant + arrière)/2
Rₒ      = (arrière - avant)/√2
```

Cette construction donne un cercle d'environ **108 mm de diamètre**, légèrement plus étroit que l'écartement des mâchoires. Le centre n'est pas confondu avec le sommet géométrique de la table ni avec le centre du cercle décoratif.

Le trou rond coupe les deux droites bordant le tapis, `u=0` et `v=0`, à la distance

`d = √(Rₒ²-cₒ²) - cₒ` du coin. La v0.48 arrêtait l'arc circulaire à ces deux intersections et le reliait aux extrémités de bande par des segments droits bien visibles. C'est la cassure signalée sur la capture suivante.

La v0.49 prolonge **le même arc de cercle** de part et d'autre de ces deux intersections. Ses extrémités sont les projections radiales sur le cercle des raccords de bande `C` et `D`. La v0.54 conserve ces deux extrémités, mais relie directement le tapis aux vrais épaulements du caoutchouc :

1. Mâchoire `A=(-a,0)`, épaulement du caoutchouc à 10 mm de la face du coussin, extrémité de la face physique, puis court raccord vers la projection `C′` du raccord supérieur sur le cercle.
2. **Un arc de cercle ininterrompu `C′→D′`**, passant par les deux intersections avec le rectangle de jeu. La courbure est constante et le rayon est exactement celui de la poche physique.
3. Court raccord de `D′` vers l'épaulement de l'autre face de coussin, puis mâchoire `B=(0,-a)`.

Le tapis bleu reste présent devant les mâchoires ; le graphite remplit uniquement les raccords arrière des bandes, comme validé par le choix « A ». **La séparation exposée entre tapis et poche est une portion d'un seul cercle**. Le trou demeure un disque complet pour le rendu du puits et la physique.

## 3. Source unique et consommateurs

`cornerPocketOpeningCircleReference()` dans `dist/table-pocket-geometry.js` construit `(cₒ,Rₒ)` ; `pocketReferenceGeometry()` publie `openingCircle`, `nearLip`, `rim` et `collectorCenter`.

| Élément | Source |
| --- | --- |
| Tapis | Épaulements des deux caoutchoucs à 10 mm et arc prolongé `C′→D′` du cercle ; marge de finition cachée de 1,2 mm |
| Ardoise graphique | Même construction avec dégagement de 3,5 mm |
| Habillage sombre de la lèvre | Deux arcs concentriques très rapprochés |
| Panier 3D | **Cercle complet** `rim` autour du centre `openingCircle` |
| Détection de chute | Distance exacte `Rₒ - hypot(x-cₓ, z-c_z)` ; signe positif dans le trou |
| Retour de cadre | Courbe symétrique extérieure à l'ouverture de 12 mm au minimum, extrémités de rail inchangées |

Le modèle de capture passe à l'état *empoché* dès que le **centre** de bille traverse ce cercle. Ce choix volontairement simplifié est conservé ; il empêche qu'une bille reste suspendue au-dessus d'une zone graphiquement ouverte. Le rayon de bille ne sert pas à rétrécir artificiellement l'ouverture.

## 4. Raccord de coin unifié (v0.54)

`cornerPocketAssemblyReference()` construit **un seul polygone simple en U** par coin. Son bord arrière utilise `cornerPocketDecorativeOuterArc()` : la distance à l'axe de la poche est au minimum `Rₒ + 12 mm`, avec des transitions douces vers les attaches fixes des deux rails. Le bord intérieur suit le même disque physique que le tapis et le panier. Deux branches latérales du même polygone rejoignent les épaulements de caoutchouc, sans ailes, triangles ou plaques indépendants.

Ce polygone est extrudé deux fois **sur la même emprise** : une base noire porte la plaque supérieure graphite de 4,5 mm, affleurante au cadre. Le contour du tapis reprend les mêmes points d'épaulement et les mêmes extrémités de l'arc ; il ne laisse pas de triangles noirs non habillés entre la bande et la poche. Une marge de 1,2 mm du tapis reste dissimulée sous les pièces voisines pour éviter les fentes de rendu.

`addCushionSweep()` fait de chaque rail principal et de ses **deux faces de poche** un seul volume fermé. Il interpole un profil à sept sommets pour chaque section de la bande, soude les deux points coïncidents aux mâchoires et écarte les triangles d'aire nulle. Les six bandes englobent ainsi les douze faces de poche, **y compris les quatre faces des poches centrales**, sans maillage de raccord supplémentaire. Les tests vérifient que chaque arête de chaque bande appartient à exactement deux triangles : aucune bordure ouverte ou pièce flottante n'est acceptée.

Le rayon, le centre du puits, les mâchoires physiques, les collisions et la capture sont inchangés. Le déplacement de la courbe arrière du cadre est une correction **décorative nécessaire** pour conserver partout une largeur de métal positive entre le bois et l'ouverture.

## 5. Poches latérales : tapis prolongé et arc commun (v0.56)

La v0.55 avait reculé de 20 mm le point médian de l'ouverture : **8 mm derrière les mâchoires** au lieu de 12 mm devant elles. Pourtant, l'arc circulaire était encore tracé **entre les deux mâchoires**, laissant deux grandes plages triangulaires noires de part et d'autre du trou. L'arc était si plat qu'il paraissait être une droite entre les bandes.

`sidePocketAssemblyReference()` reprend maintenant les **deux faces de coussin à 104°** : avancée latérale de 11 mm, profondeur de 44,1 mm et épaulement arrière de 10 mm. Le tapis suit chaque mâchoire, son épaulement puis l'extrémité arrière de sa face inclinée. `sidePocketFrontCircularArc()` découpe **un vrai arc à rayon constant entre ces deux épaulements**. Son point médian reste 8 mm derrière les mâchoires, mais ses deux bouts les dépassent de **51,2 mm vers l'extérieur** : les triangles autrefois noirs sont désormais bleus et raccordés aux bandes.

Le tapis, l'ardoise, le revêtement noir et la limite de capture utilisent les **mêmes points et le même arc**. Le retour de bois conserve sa forme arrière arrondie et ses raccords aux rails ; ses deux points intérieurs sont rapprochés de 1 à 2 mm des épaulements pour que l'arc avant et l'arc arrière du panier se rejoignent sans fente. Le fond de poche reste à 108 mm derrière les mâchoires ; sa forme est une paire d'arcs joints aux extrémités, et non un disque parfait. La corbeille est recentrée à partir de ce périmètre. Les mâchoires, les rebonds et le calibrage des bandes ne changent pas.

## 6. Contrôles

- Le tapis reste bleu entre le rectangle de jeu et les deux extrémités de la portion circulaire de chaque poche ; les espaces arrière sont occupés par l'insert graphite.
- Tous les points du puits de coin et tous les points de sa lèvre avant appartiennent à **un seul et même cercle**.
- L'arc de contact avec le tapis dépasse les deux droites du rectangle de jeu et rejoint radialement les raccords cachés sous les bandes ; aucun long segment droit ne traverse les épaulements visibles.
- L'empreinte du puits et du retour supérieur n'empiète pas sur le tapis jouable (triangles GPU et échantillonnage XY) ; seule sa marge de finition dissimulée peut recouper le graphite.
- Le cercle sert simultanément à la géométrie du panier et à la physique, sans décalage de centre ou de rayon.
- Les deux types de poches conservent leurs six mâchoires, les raccords de bandes, la symétrie et les collisions de coussin existantes.
- Les quatre plaques graphites forment chacune **un seul contour sans auto-intersection**, avec au moins 12 mm de retrait du retour bois derrière le cercle physique.
- Les six volumes bleus incluent les **douze faces de poche** ; chaque arête est partagée par deux triangles, sans maillage rapporté ni bord libre.
- Le point le plus avancé de chaque ouverture latérale est **8 mm derrière les mâchoires** ; la frontière tapis/poche rejoint les épaulements arrière à **51,2 mm** sur **un seul arc de cercle**.
- Les deux triangles à côté de chaque ouverture latérale appartiennent au tapis continu et ne déclenchent aucun empochage ; la capture physique suit l'arc visible de bout en bout.

Les dimensions de l'ouverture sont issues d'une reconstruction paramétrique, non d'une numérisation d'une poche de fabricant. Les contrôles géométriques et le rendu logiciel ne remplacent pas une mesure photogrammétrique cotée.
