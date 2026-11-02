# FRAME v0.28 — correction des raccords de rails et des poches

**1er novembre 2026**

## Défauts observés en v0.27

1. Les couronnements s'arrêtaient 35 à 50 mm avant les raccords d'angle : la largeur laissée entre les maillages variait parce que leurs limites étaient calculées séparément.
2. Les poches latérales possédaient des blocs de bois pleins couvrant leur recul extérieur, sans véritable échancrure intégrée aux rails.
3. Le mince liseré noir des poches montait légèrement au-dessus du niveau du drap, accentuant l'apparence d'une couronne posée sur la table.

## Changements

- Coordonnées communes dans `dist/table-pocket-geometry.js` pour les extrémités des quatre demi-rails longs, des deux rails courts, des quatre angles et des deux raccords latéraux. Les surfaces sont jointives sur toute la hauteur des couronnements.
- Les âmes de rail, tabliers et filets de finition sont prolongés jusqu'aux mêmes jonctions ; les fentes verticales disparaissent aussi sous les couronnements.
- Les raccords latéraux sont redessinés en U, avec échancrure centrale tournée vers le trou réel ; les six poches restent dégagées.
- Les lèvres des poches sont descendues de `[-0,002 ; +0,0012] m` à `[-0,008 ; -0,005] m`, sous la surface du drap à `+0,001 m`.
- Conservation des pieds massifs, des rails et du cadre graphite, des bandes turquoise et du drap bleu de la v0.27.

## Vérifications

- Tests géométriques des six jonctions, de l'échancrure latérale, de la symétrie, des incrustations affleurantes, de l'absence de recouvrement du drap et de la profondeur des lèvres : `tests/table-pocket-geometry.test.js` et `tests/table-geometry.test.js`.
- Export des géométries effectives Three.js, vues hors navigateur en perspective, plan, profil, angle et poche latérale.
- Régression fonctionnelle : `npm test`.
- Les équations, paramètres, lois de contact, données expérimentales et dimensions de collision n'ont pas été modifiés.

**Limite :** les vues du moteur logiciel ne reproduisent pas fidèlement l'éclairage ni les textures WebGL. La validation visuelle du site dans un navigateur connecté reste distincte.
