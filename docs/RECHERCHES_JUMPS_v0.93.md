# Recherche pour les prochaines améliorations des jumps

16 novembre 2026. La version 0.93 applique uniquement le nouveau contact
bille–tapis. Les travaux ci-dessous sont des recherches et des propositions,
pas des fonctionnalités déjà implémentées. Aucun réglage d’environnement n’a
été réappliqué pendant cette étude.

## 1. Collisions de billes en vol : intégrer le frottement 3D

**Source principale :** Charles S. Peskin, *Collision of Billiard Balls in 3D
with Spin and Friction*, 25 septembre 2020 [S1]. Cette note théorique traite
de sphères identiques en 3D et explicite la conservation des moments, les
impulsions et la dissipation. **Limite importante :** sa solution en glissement
n’est applicable que tant que la vitesse de glissement ne change pas de signe ;
la page 10 indique que l’adhérence exige un traitement supplémentaire. Ce n’est
pas un ensemble de mesures de billard.

**Complément :** Hyeong-Chan Kim, *Collision of two spinning billiard balls and
the role of table*, prépublication 2024 [S2]. Le cas étudié commence avec une
bille incidente en rotation et une cible immobile sur un plan. Il montre pourquoi
la réaction de la table ne peut pas toujours être négligée. Il ne suffit pas à
valider tous les contacts possibles entre billes déjà en vol.

**Ce qui manque dans notre jeu :** les contacts en vol ont une impulsion normale
3D, mais n’échangent pas les rotations par frottement tangent au contact. Le
maintien d’une bille sur le tapis est encore traité par une approximation locale.

**Modification proposée ensuite :**

- Calculer la vitesse relative des deux surfaces au point de contact, rotations
  incluses ; projeter son glissement dans le plan tangent à la normale 3D.
- Appliquer une impulsion tangentielle plafonnée à la fois par Coulomb et par
  l’annulation du glissement. Modifier les trois composantes de rotation.
- Séparer les deux billes libres du cas où le tapis fournit aussi une impulsion.
  Ne pas forcer la composante verticale à zéro pour résoudre ce dernier cas.
- Conserver comme hypothèse de départ le coefficient bille–bille du jeu (0,94).
  La plage pratique 0,92–0,98 [S6] ne constitue pas une calibration des impacts
  aériens. La loi de frottement issue de TP A-14 peut fournir une première
  hypothèse, dont l’extension aux impacts aériens reste à vérifier.

**Validation requise :** symétrie et invariance par rotation du repère, énergie
non croissante, conservation des moments pour deux sphères libres, non-inversion
du glissement, contacts hauts/bas et rasants. Avec une réaction du tapis, il faut
comptabiliser cette impulsion extérieure avant d’affirmer la conservation du
moment vertical du système des deux billes. Des vidéos à deux vues avec repères
sur les billes serviront à mesurer vitesses et rotations avant/après le choc.

## 2. Bandes en 3D : normale réelle et matériaux distincts

**Source expérimentale et théorique :** Mathavan, Jackson et Parkin,
*A theoretical analysis of billiard ball dynamics under cushion impacts*, 2010,
DOI 10.1243/09544062JMES1964 [S3]. Les sections 2 et 3.5 sont déterminantes :

- Le modèle suppose une déformation de bande insignifiante et traite le contact
  avec la bande conjointement au contact avec la table. Il contraint le mouvement
  vertical ; ce n’est pas un solveur général de bille aérienne contre une bande.
- L’identification utilise une table de **snooker Riley Renaissance**, en roulement
  naturel incident, sans effet latéral. Les paramètres internes ajustés sont
  `e_e = 0,98` et `μ_w = 0,14`. Le réglage est identifié sur des vitesses incidentes
  inférieures à 1,5 m/s ; la divergence avec les mesures devient importante au-delà
  d’environ 2,5 m/s de vitesse **normale** incidente.
- Ces constantes ne sont donc ni des mesures de notre bande américaine ni un
  coefficient global permettant de multiplier simplement la vitesse de la bille.

**Géométrie :** la republication CueSight des spécifications WPA, §7 [S8], donne
un nez de bande à **63,5 % ±1 point du diamètre**. Pour nos billes de 57,15 mm,
le nominal est **36,29 mm**. Attention : l’article de Mathavan emploie `h = 7R/5`,
soit **70 % du diamètre**, dans sa géométrie. Ces deux valeurs ne sont pas
interchangeables ; il faut utiliser la géométrie effective de notre table.

**Modification proposée :** détecter les contacts contre le nez, les mâchoires,
les arêtes et le dessus de bande, avec une normale calculée au point de contact.
Une approximation initiale par cylindres/capsules et plans est possible, mais son
rayon de nez doit correspondre au profil visible ou à une mesure. Le dessus de
bande doit avoir son propre matériau : aucun motif ne justifie de lui appliquer
automatiquement le coefficient du caoutchouc ou celui du tapis.

Le contact de sphère avec un plan local muni de frottement donne une première
approximation à faible déformation. Les impacts rapides demanderont ensuite un
modèle compliant et une calibration indépendante. Biber et al. [S10] montrent
l’intérêt de la compliance tangentielle et ses limites par rapport aux modèles
rigides ; leurs expériences concernent **golf et gazon**, leurs coefficients ne
sont pas transposables au billard.

**Validation :** contacts par-dessus/par-dessous, mâchoires, impact rasant, bille
retombant sur le dessus puis revenant au jeu, absence de traversée et absence
d’injection d’énergie lors des corrections de position. Mesurer séparément
caoutchouc et dessus de bande, à plusieurs vitesses normales et avec rotation.

## 3. Queue de saut : masse, procédé et durée de contact

**Repères pratiques :** la table d’Alciatore [S6] donne une restitution
procédé–bille de **0,71–0,75 pour le cuir** et **0,81–0,87 pour le phénolique**.
Ces coefficients concernent le contact avec la queue, pas le rebond sur le tapis.
TP A-30 fourni par l’utilisateur décrit la dépendance à la masse et au décentrage,
ainsi que la différence entre restitution et rendement énergétique.

**Mesures de contact :** Rod Cross, *Cue and ball deflection (or “squirt”) in
billiards*, AJP 76(3), 205–212, 2008 [S4], mesure notamment un contact de
**2,1 ms** par accéléromètre piézoélectrique (p. 211, PDF p. 7). Le montage
utilise une bille suspendue de **120 g / 50,3 mm** et une queue de **186 g / 94 cm**,
avec des frappes horizontales typiquement autour de 0,7 m/s. Il met en évidence
le comportement élastique tangentiel du procédé et de l’extrémité de la queue.
Le coefficient normal d’environ 0,2 rapporté pour ce montage particulier ne doit
pas davantage être généralisé à toutes les queues que les valeurs typiques
ci-dessus. Ces essais ne sont pas des mesures de jump sur une table de pool.

**Mesures de jumps :** Lewandowski, Faustino et Cox, *Design, Fabrication, and
Implementation of Jump-Cue Testing Machine*, UNF, 2006 [S5]. La machine permet
une inclinaison de 15° à 90° ; les auteurs décrivent des essais à 30°, 45° et 60°.
18 queues sont comparées ; deux tableaux anonymisés X/Y sont publiés (p. imprimée
5, PDF p. 6), avec dix essais par tableau :

| Grandeur publiée | Queue X | Queue Y |
|---|---:|---:|
| Portée moyenne jusqu’à la réception | 38,80 pouces = 0,986 m | 64,28 pouces = 1,633 m |
| Écart-type de la portée | 1,89 pouce = 4,80 cm | 2,01 pouces = 5,11 cm |
| Distance centre-à-centre minimale de franchissement, moyenne | 5,96 pouces = 15,14 cm | 5,13 pouces = 13,03 cm |

La distance de franchissement sert de proxy de la facilité à lever la bille ;
**ce n’est pas une mesure de sa hauteur maximale**. Les tableaux ne donnent pas
les vitesses de queue et angles propres à ces essais : on ne peut pas en déduire
un coefficient de restitution unique ni les utiliser comme cible chiffrée de
notre tir « 33 % / 45° ».

**Modification proposée :** définir des équipements caractérisés par leur masse,
leur procédé et leur comportement mécanique mesuré ; convertir la commande de
puissance en vitesse physique de queue avant d’appliquer le contact. Actuellement,
la vitesse de référence du jeu est normalisée sur la vitesse de bille centrée :
modifier seulement `cueEffectiveMass` ne suffirait pas à reproduire l’effet de
masse sur cette vitesse centrée.

Pour les jumps fortement inclinés, intégrer la durée et la déformation du contact
procédé–bille–tapis afin de traiter le blocage de la bille. Les pages d’Alciatore
sur la technique et les fortes inclinaisons [S7, S9] expliquent le rôle du tissu et
du dégagement du procédé. Elles ne fournissent pas une raideur ou un amortissement
numérique universel à importer. La masse totale de queue et la masse effective
latérale d’extrémité utilisée pour le squirt doivent rester des paramètres distincts.

## 4. Calibration : protocole proposé, pas données acquises

1. Identifier bille, tapis, bandes et queues. Relever géométrie, masses et état
   des surfaces ; filmer une échelle dans les plans mesurés.
2. Pour la réception normale : lâcher une bille sans rotation de trois hauteurs
   (par exemple 5, 10, 20 cm), cinq répétitions par hauteur. Mesurer les hauteurs
   **au-dessus de la position de repos du centre**, puis `e = sqrt(h_rebond/h_chute)`.
   Ce protocole proposé sert à identifier la dépendance à la vitesse ; ce n’est
   pas une preuve que notre nominal 0,6 représente déjà une vraie table.
3. Ajouter des réceptions obliques avec rotation mesurée pour identifier le
   frottement d’impact, indépendamment du coefficient de glissement sur le tapis.
4. Pour les queues : deux équipements × trois angles × trois vitesses physiques
   × cinq répétitions = **90 tirs proposés**, d’abord centrés. Mesurer la vitesse
   réelle, et non un pourcentage de jauge, ainsi que hauteur, portée et rotation.
5. Deux vues synchronisées permettent la reconstruction 3D. Viser initialement
   1000 images/s pour les trajectoires, puis vérifier l’incertitude sur un pilote.
   Cela ne résout pas finement un contact de 2 ms : pour les forces, déformations
   et durées de contact, employer une instrumentation adaptée ou une cadence
   nettement supérieure. Sans ces moyens, ne calibrer que l’impulsion nette.
6. Garder des conditions hors ajustement pour valider le modèle. Les bilans
   d’énergie et les 317 tests logiciels vérifient la cohérence, pas l’erreur sur
   une table réelle. Les vidéos HSV B.14/B.44/B.46 sont des références visuelles
   à examiner ; aucune mesure chiffrée n’en a été extraite dans cette étude.

## Sources et traçabilité

Les URL, empreintes SHA-256, dates de consultation et limites de lecture sont
conservées dans [le manifeste](data/jump-research-v093-sources.json).

- [S1 — Peskin, 2020](https://math.nyu.edu/~peskin/Collision_of_Billiard_Balls_in_3D_with_Spin_and_Friction.pdf)
- [S2 — Kim, 2024](https://arxiv.org/abs/2402.13258)
- [S3 — Mathavan et al., 2010](https://doi.org/10.1243/09544062JMES1964)
- [S4 — Cross, 2008](https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/39.%20squirt.pdf)
- [S5 — Machine UNF, 2006](https://digitalcommons.unf.edu/ojii_volumes/63)
- [S6 — Propriétés approximatives, Alciatore](https://drdavepoolinfo.com/faq/physics/physical-properties/)
- [S7 — Technique des jumps](https://drdavepoolinfo.com/faq/jump/technique/)
- [S8 — Spécifications WPA, republication CueSight](https://www.cuesight.com/wpa/tournament-table-equipment-specifications/)
- [S9 — Jumps très inclinés](https://drdavepoolinfo.com/faq/jump/highly-elevated/)
- [S10 — Biber et al., 2022, golf/gazon](https://arxiv.org/abs/2208.11685)

Yang et Chen, DOI 10.1109/RAMECH.2010.5513158 [S11 du manifeste], est une piste
bibliographique : métadonnées et résumé seulement, aucun texte intégral obtenu,
aucune donnée numérique utilisée. Une référence bibliographique, une note
théorique et une mesure expérimentale restent des niveaux de preuve distincts.
