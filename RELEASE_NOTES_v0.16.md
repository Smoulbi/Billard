# FRAME v0.16 — bandes de pool calibrées sur 1 217 impacts

31 octobre 2026. Profil de jeu actif : **pool américain**. Le modèle de bandes **snooker v0.14/v0.15 est conservé sans modification**.

## Correction physique appliquée

La v0.15 utilisait une restitution effective `0.54` indépendante de la vitesse et de l'angle. La v0.16 s'appuie sur l'étude *Strategic play for a pool-playing robot* de Thomas Nierhoff, Kerstin Heunisch et Sandra Hirche (TU München), section IV, équations (19)–(20), issues de **1 217 contacts observés sur une vraie table de pool** :

- `e_bc = 0.9331 − 0.0278 v − 0.1051 θ`
- `δ_v = 0.7366 − 0.1094 v + 0.1698 θ`

`v` : vitesse entrante en m/s ; `θ` : angle d'arrivée **par rapport à la normale de la bande**, en radians. L'équation (14) de l'article stipule explicitement que `e_bc` règle l'**orientation** de la vitesse sortante, puis que le vecteur est **normalisé** et multiplié par `δ_v · v`. Le facteur `δ_v` correspond donc à la **vitesse totale**, et **non** à un multiplicateur de chaque composante avant normalisation. Les rapports de composantes visés sont :

```
q = sqrt((e_bc * cos θ)^2 + (sin θ)^2)
v_out_normale / v_in_normale = e_bc * δ_v / q
v_out_tangent / v_in_tangent = δ_v / q
|v_out| / |v_in| = δ_v
```

L'article utilise une bille en **roulement naturel** avec **zéro effet latéral** et un modèle de collision simplifié. FRAME conserve son modèle dynamique 3D d'impulsion avec rotation, contact au nez de bande et glissement sur tapis. Pour une bille en roulement, la restitution effective normale est obtenue en **inversant analytiquement** notre équation de vitesse au premier retour au roulement : on ne dissipe pas `δ_v` une deuxième fois. Une correction d'impulsion tangentielle vise le second rapport, sans dépasser le plafond de frottement Coulomb existant (`μ = 0.20`) ni augmenter l'énergie cinétique translation + rotation. Ce choix conserve les effets et l'évolution des rotations, mais ne peut pas suivre parfaitement la régression aux incidences rasantes.

La borne `v ≤ 3 m/s` appliquée à la régression est une protection numérique contre l'extrapolation aux casses extrêmes, **pas** une limite expérimentale affirmée par les auteurs. La valeur initiale de la bande `0.54` est maintenue dans le profil comme repère historique ; le coefficient réellement appliqué est désormais **dynamique**.

## Résultats de calibration

Pour des billes en roulement naturel, sans effet, vitesse contrôlée juste avant l'impact :

| Entrée | Mesure source : `δ_v` | FRAME v0.16 (vitesse après glissement) |
|---|---:|---:|
| 0,5 m/s, 0° | 68,19 % | 68,16 % |
| 1,2 m/s, 0° | 60,53 % | 60,53 % |
| 2,3 m/s, 0° | 48,50 % | 48,51 % |

Pour les bandes obliques, le banc compare la **composante normale** et la **composante tangentielle** aux deux rapports déduits de l'étude :

| Entrée | `v_t sortant/v_t entrant` source | FRAME v0.16 | Écart |
|---|---:|---:|---:|
| 0,5 m/s, 30° | 85,64 % | 85,57 % | −0,07 point |
| 1,2 m/s, 30° | 78,35 % | 78,33 % | −0,02 point |
| 2,3 m/s, 30° | 66,40 % | 66,39 % | −0,01 point |
| 2,3 m/s, 45° | 68,73 % | 69,18 % | +0,45 point |
| **2,3 m/s, 60°** | **70,10 %** | **82,30 %** | **+12,21 points** |

La régression n'est **pas un ensemble de mesures directes** aux vitesses et aux angles de notre grille. La précision d'ajustement sur les lignes où la même régression a servi à calibrer **n'est pas une validation indépendante**. Le résidu de 60° est conservé et visible : augmenter arbitrairement le frottement pour le supprimer sans mesure indépendante ferait dégrader la crédibilité physique du modèle.

Comparaison secondaire : Alciatore présente environ **50 % de vitesse conservée après rebond et glissement** pour une arrivée perpendiculaire typique, sans vitesse exacte spécifiée. À 1,6 m/s, la régression de cette table de la TU München donne **56,15 %** dans notre moteur : écart de **+6,15 points**, vraisemblablement lié aux conditions/table/échantillons distincts. Il ne s'agit pas d'une réfutation de l'une ou l'autre source.

## Ce qui a été conservé

- Sphère US : diamètre 57,15 mm et masse 170,097 g ; terrain de jeu 2,54 × 1,27 m ; nez de bande placé à 63,5 % du diamètre de bille ; poches et inclinaison des faces inchangées.
- Frottement de tapis : glissement `μ_s = 0.20`, roulement pool `μ_r = 0.010`, rotation verticale `μ_spin = 0.015`.
- Collision bille-bille : restitution `0.94` et frottement tangentiel variable `μ_bb(s) = 0.009951 + 0.108 exp(−1.088 |s|)`.
- Casse à contacts multiples, résolution continue des contacts, détection de poches et prévision de trajectoire.
- Profil `snooker` : frottement de bande `0.14`, restitution de base `0.76`, ancienne régression Mathavan des rebonds, résistance roulante `0.0128`. Sélection possible dans `simulatePhysics(balls, dt, {cushionProfile:'snooker'})`. Attention : le mode snooker utilise encore les **dimensions de pool**.

## Paramètres encore à affiner — priorité et preuve

| Priorité | Grandeur | Valeur v0.16 / situation | Donnée manquante pour une vraie calibration US |
|---|---|---|---|
| **Critique** | Frottement tangent bille–bande `μ_c` | **0.20**, provisoire ; plafond de l'impulsion tangentielle | Mesure séparée sur caoutchouc K66, plusieurs angles, vitesses et états de rotation. TUM ajuste la vitesse finale mais n'isole pas un `μ_c` matériel. |
| **Critique** | Déformation/hystérésis de la bande | Contact ponctuel à nez fixe, correction tangentielle empirique, pas de matériau viscoélastique explicite | Loi de force/déformation du caoutchouc, dépendance à la vitesse, pression de contact, temps de contact ; résidu **+12,21 pts** sur tangentielle à 60°/2,3 m/s. |
| **Haute** | Restitution normale dynamique | Fonction `e_eff(v,θ)` inversée des régressions TUM, bornée ; `0.54` seulement nominal/archivé | Mesures reproductibles sur plusieurs marques/états de bandes US ; incertitude et plage de validité de la régression ; ne pas assimiler `e_eff` à une propriété de matériau. |
| **Haute** | Frottement glissant du tapis | `0.20` constant | TUM mesure sur sa table `λ_sa=0.2014`/`0.2322` et `λ_sr=0.4763`/`0.0180` selon deux domaines de vitesse ; reproduire la méthode et vérifier la rupture de modèle avant tout transfert. |
| **Haute** | Frottement roulant du tapis | `0.010` constant (Alciatore) | TUM obtient pour une autre table environ `0.0075−0.0004v` au-dessus de 0,0473 m/s ; contrôler l'usure, la température et l'hygrométrie de notre table de référence. |
| **Haute** | Effet de la rotation entrante sur les bandes | Le modèle d'impulsion conserve le side spin, draw et follow ; la régression TUM ne couvre que le roulement sans effet | Mesurer `v`, `ω_y` et rotation top/bottom avant/après ; les résultats de forte rotation sont une extrapolation bornée par le budget énergétique. |
| **Moyenne** | Rebond des faces de poche / *jaw facings* | `e_facing=0.78`, `μ_facing=0.20` non mesurés | Impacts contre facings en caoutchouc, dépendance à vitesse/angle et retour de poche. |
| **Moyenne** | Restitution bille–bille | `e_bb=0.94` | Mesures sur billes de résine phénolique US selon vitesse, état des surfaces, nettoyage et température. |
| **Moyenne** | Frottement bille–bille | `0.009951 + 0.108 exp(−1.088 |s|)` | Comparaison des transferts de spin et *throw* à haute vitesse sur billes US ; modèle de source réutilisé mais non ajusté à notre jeu de billes. |
| **Moyenne** | Décélération du *side spin* | `μ_spin=0.015`, soit environ **12,87 rad/s²** | Vidéos avec repères de rotation sur billes US et tapis choisis. |
| **Moyenne** | Masse effective de la queue | `0.55 kg` ; masse effective de bout `0.018 kg` ; limite de fausse queue `0.50R` | Mesures de *squirt*, puissance délivrée, décentrage, élévation, procédé/craie. |
| **Moyenne** | Casse : raideur des contacts multiples | `K=3.8×10⁸ N/m^(3/2)` ; sous-pas `1 µs`, fenêtre `2.5 ms` | Impact instrumenté sur triangle de 15 billes, durée réelle de la vague de contact et restitution à forte vitesse. |
| **Moyenne** | Géométrie des poches et des bandes | Angles d'entrée 142°/104° ; découpes `80.8`/`64.8 mm` ; table WPA nominale | Dimensions d'une table 9 pieds précise (largeur de bouche, shelf, facings, rayon de nez et tolérances). |
| **Basse, hors calcul courant** | Mode snooker complet | Courbe et frottement des bandes préservés ; géométrie pool toujours active | Billes 52,4 mm, tapis, poches, bande et table snooker spécifiques, comparaisons expérimentales séparées. |

La gravité `9.81 m/s²`, la géométrie de sphère homogène (`I=2mR²/5`) et les unités SI sont des choix physiques, non des coefficients empiriques à ajuster librement.

## Vérifications

`npm test` : **64 tests réussis**, dont nouveaux essais comparatifs (angles 15°, 30°, 45°, vitesses 0,5/1,2/2,3 m/s), contrôle du comportement des effets latéraux, contrôle énergétique sur des impacts extrêmes, non-régression snooker, casses et trajectoires prédites. Le banc de calibration comprend désormais **51 scénarios** et conserve l'export CSV des écarts.

## Sources

1. T. Nierhoff, K. Heunisch, S. Hirche, [*Strategic play for a pool-playing robot* (TU München), PDF](https://mediatum.ub.tum.de/doc/1155344/988748.pdf), équations (12)–(14) et (19)–(20), 1 217 impacts de bandes US.
2. D. G. Alciatore, [TP B.6](https://drdavepoolinfo.com/technical_proofs/new/TP_B-6.pdf), référence de rebond et frottement en pool.
3. D. G. Alciatore, [Bank and Kick Physics Effects](https://drdavepoolinfo.com/faq/bank-kick/effects/), effets observés de vitesse et rotation, contexte qualitatif.
4. Mathavan, Jackson et Parkin (2009), [*Application of high-speed imaging to determine the dynamics of billiards*](https://drdavepoolinfo.com/physics_articles/ajp_09_hsv_article.pdf), données **snooker**, conservées à part.

La présente archive locale **n'implique aucune modification d'un site hébergé**.
