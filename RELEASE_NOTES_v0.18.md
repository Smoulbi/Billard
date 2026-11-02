# FRAME v0.18 — prototype de contact déformable des bandes américaines

31 octobre 2026. **Pool empirique v0.17 par défaut ; pool déformable v0.18 en option ; snooker inchangé.**

## Travaux analysés

1. **Nierhoff, Heunisch, Hirche**, [*Strategic play for a pool-playing robot*](https://mediatum.ub.tum.de/doc/1155344/988748.pdf) (TU München, 2012) : régressions de direction et de vitesse tirées de **1 217 rebonds sur une table de pool**. Source de la calibration américaine v0.17 et de la restitution normale cible de v0.18. Les 1 217 trajectoires brutes et rotations post-impact ne sont pas accessibles dans les données employées ici.
2. **W. J. Stronge**, [*Impact Mechanics*, « Tangential Compliance in Planar Impact of Rough Bodies »](https://www.cambridge.org/core/books/abs/impact-mechanics/tangential-compliance-in-planar-impact-of-rough-bodies/7F648E2F331B395BF60EC6B9FC561013) (2018) : contact élastique tangent, périodes adhérence/glissement et restitution dissipative. Référence de structure, **sans calibration K55/K66**.
3. **Rod Cross**, [*Impact of a ball on a surface with tangential compliance*](https://doi.org/10.1119/1.3313455), *American Journal of Physics* (2010) : mécanismes de conformité tangentielle et inversion de glissement. Pas de coefficients exhaustifs de bandes américaines.
4. **Pooltool**, [documentation du solveur `STRONGE_COMPLIANT_3D`](https://pooltool.readthedocs.io/en/latest/autoapi/pooltool/physics/index.html) et [journal des versions](https://github.com/ekiefl/pooltool/blob/main/CHANGELOG.md) : implémentation de référence à deux ressorts pour des bandes de billard, avec ratio de pulsations réglable. Notre solveur est indépendant et simplifié, **non un port de Pooltool**.
5. **Gismeros Moreno et al.**, [*Modelling multiple-simultaneous impact problems with a nonlinear smooth approach: pool/billiard application*](https://doi.org/10.1007/s11071-021-07117-4), *Nonlinear Dynamics* (2022) : autre approche à contacts régularisés pour le pool, avec observations vidéo. Certains coefficients illustratifs proviennent d'études de **snooker**, et ne sont pas des mesures de gomme de pool US.
6. **Mathavan, Jackson, Parkin**, [*A theoretical analysis of billiard ball-cushion dynamics under cushion impacts*](https://drdavepoolinfo.com/physics_articles/Mathavan_IMechE_2010.pdf) (2010) : formulation mécanique complémentaire, à ne pas confondre avec une calibration de notre bande américaine. Le snooker historique repose notamment sur [Mathavan et al. (2009)](https://drdavepoolinfo.com/physics_articles/ajp_09_hsv_article.pdf).

## Modifications du moteur

- `dist/compliant-cushion.js` introduit une collision avec ressort normal en compression et décharge, plus ressort tangentiel, amortissement et limite Coulomb statique/cinétique.
- Pendant le contact normal, la décharge emploie une raideur `e_n² k_n`, de manière à obtenir la restitution normale énergétique choisie. L'impulsion normale résultante est appliquée **analytiquement** ; les contraintes tangentielles sont intégrées par 320 sous-pas locaux sur la durée de l'impact.
- La restitution normale `e_n(v,θ)` continue à provenir de la loi empirique pool de v0.17. Elle **n'est pas** une mesure matérielle directe de la gomme.
- Le solveur met à jour la translation horizontale et **trois composantes de vitesse angulaire**. La force tangentielle est bornée par le seuil statique `μ_s F_n` ou cinétique `μ_d F_n`. L'impulsion finale est restreinte à l'intervalle garantissant **l'absence de gain d'énergie cinétique**.
- `simulatePhysics` accepte `cushionModel: 'empirical' | 'compliant'`. Cette sélection est propagée au jeu, à la prévision de trajectoire et au banc de 57 scénarios. Le menu est verrouillé pendant un tir et réactivé dès l'arrêt.
- Le profil pool v0.17 reste **sélectionné par défaut** et n'a pas été retouché par cette branche. Le snooker et les faces des poches continuent d'utiliser leur ancien solveur.
- L'intégration est **locale à l'événement** : les quelques millisecondes du contact ne font pas avancer le temps mondial du jeu. Ce n'est ni un maillage de gomme ni un modèle d'éléments finis, et le mouvement vertical / saut de bille n'est pas résolu.

### Valeurs du solveur pool v0.18

| Paramètre | Valeur | Statut |
|---|---:|---|
| Bille US : masse, rayon | `0,170097 kg` ; `28,575 mm` | Valeurs de la table actuelle ; rayon nominal US |
| Hauteur du nez | `36,29025 mm`, soit `0,635 × diamètre` | Géométrie nominale, non relevée sur une table réelle |
| Pulsation normale `ω_n` | `2 200 rad/s` | **Hypothèse non mesurée** de durée de contact |
| Raideur équivalente `k_n` | `≈ 6,96 × 10⁵ N/m` | **Dérivée** de `ω_n² / (1/m+h²/I)`, pas mesurée |
| Ratio `ω_t/ω_n` | `1,8` | Illustratif de l'approche Pooltool, non validé sur notre bande |
| Frottement statique `μ_s` | `0,24` | **Hypothèse** |
| Frottement cinétique `μ_d` | `0,20` | **Hypothèse**, différente du `μ_effectif` ajusté de v0.17 |
| Amortissement tangent réduit `ζ_t` | `0,06` | **Hypothèse** |
| Sous-pas de contact | `320` | Paramètre numérique (convergence comparée à `640`) |
| Restitution normale `e_n` | `e_n(v,θ)` du pool v0.17 | **Identifiée sur la régression TUM**, non indépendante |

La durée de contact équivalente dépend de `e_n` : `T = π/(2ω_n) (1 + 1/e_n)`. Ni cette durée, ni les raideurs, ni les frottements **ne sont des observations expérimentales de K55/K66**.

## Comparaison de rebonds sans effet latéral

Le tableau compare les **valeurs issues des régressions publiées TUM**, pas des essais individuels exactement à chaque angle. La v0.17 a été calibrée sur ces mêmes équations : sa concordance n'est donc **pas une validation indépendante**.

| Vitesse / angle depuis la normale | Composante tangentielle TUM après glissement | v0.17 empirique | v0.18 déformable |
|---|---:|---:|---:|
| `2,3 m/s` / `30°` | `66,40 %` | `66,39 %` | `67,59 %` |
| `2,3 m/s` / `45°` | `68,73 %` | `68,73 %` | `67,08 %` |
| `2,3 m/s` / `60°` | `70,10 %` | `70,08 %` | `81,62 %` |
| `2,3 m/s` / `75°` | `71,85 %` | `71,84 %` | `91,79 %` |

**Moyenne des erreurs absolues** sur 24 composantes normales/tangentielles, à `0,5 / 1,2 / 2,3 m/s` et `30 / 45 / 60 / 75°` : **v0.17 : `0,051 point` ; v0.18 : `4,584 points`** par rapport à la régression TUM. La restitution des rebonds perpendiculaires reste proche de la cible pool dans les deux modes.

Le nouveau modèle introduit une physique de contact avec potentiel de retour élastique et inversion du glissement. **Il n'est pas encore meilleur que l'ancien modèle pour la précision des rebonds rasants.** L'effet latéral est présent mais non validé par des mesures de rotation sur des bandes américaines.

## Paramètres restant à affiner

| Priorité | Valeur / famille | Données requises |
|---|---|---|
| **Critique** | `ω_n=2200 rad/s`, `k_n≈6,96×10⁵ N/m`, décharge `e_n²k_n` | Durée réelle du contact, force–déformation, hystérésis et effet de température sur bande K55/K66 |
| **Critique** | `ω_t/ω_n=1,8`, `ζ_t=0,06` | Raideur et amortissement de cisaillement, cycles adhérence/glissement sous effort mesuré |
| **Critique** | v0.18 `μ_s=0,24`, `μ_d=0,20` ; v0.17 `μ_effectif` peut atteindre `0,90` | Mesures **indépendantes** de friction résine–gomme, sans confondre friction physique et fit effectif |
| **Critique** | Déviation à `75°` de `≈19,94 points` en vitesse tangentielle | Identification paramétrique sur une partie des tirs et validation **hors échantillon**, surtout aux grands angles |
| **Critique** | Rotation `ω_x,ω_y,ω_z` modélisée sans données pool de référence | Films rapides avec billes marquées, mesure des vitesses/rotations avant/après, running et reverse english |
| Haute | `e_n(v,θ)` héritée de v0.17 | Restitution **au contact** sur plusieurs types de bandes US, séparée du glissement post-rebond |
| Haute | Tapis : `μ_slide=0,20`, `μ_roll=0,010`, `μ_spin=0,015` | Décélérations de billes sur vrai tapis pool par vitesse/humidité, usure et rotation |
| Haute | Extrapolation fit TUM plafonnée à `3 m/s` et plafond `0,90` du frottement effectif v0.17 | Domaine de validité réel des 1 217 impacts, forte puissance et angles encore plus rasants |
| Moyenne | Faces de poches : `e_facing=0,78`, `μ_facing=0,20` | Rejets de poche (*rattle*) et frappes sur facings US |
| Moyenne | Bille–bille : `e_bb=0,94`, `μ_bb(s)=0,009951+0,108 exp(−1,088|s|)` | Épreuves de throw et transferts de spin de billes phénoliques de 57,15 mm |
| Moyenne | Queue : masse effective `0,55 kg`, procédé `0,018 kg`, fausse queue à `0,50R` | Squirt, swerve, inclinaison et contact procédé/bille mesurés |
| Moyenne | Casse : `K=3,8×10⁸ N/m^(3/2)`, `1 µs`, fenêtre `2,5 ms` | Essais de casse avec collisions multiples filmées rapidement |
| Moyenne | Plateau `2,54×1,27 m`, nez à `0,635` diamètre, géométrie de poches nominale | Profil exact K55/K66, angles de poches, shelf et hauteur de bande de la table cible |
| Séparée | Snooker conservé avec géométrie pool | Dimensions de table snooker et billes `52,4 mm`, bandes et tapis propres au snooker |

La gravité `9,81 m/s²` et l'inertie d'une bille pleine homogène `I=2mR²/5` ne sont pas des paramètres libres de calibration.

## Tests

**73 tests passés.** Nouveaux tests : restitution normale isolée ; stabilité de l'énergie sur 240 combinaisons vitesse/angle/spin/roulement ; phases d'adhérence et de glissement ; convergence de 320 à 640 sous-pas ; asymétrie des effets latéraux ; absence totale de modification snooker ; identité entre prévision et simulation en mode déformable. **57 scénarios** du banc restent disponibles et exportables séparément par mode.
