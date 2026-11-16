# Petits impacts — version 0.77

À la demande de l’utilisateur, les impacts lents sont relevés : la loi strictement
proportionnelle de la 0.76 rendait ces sons trop faibles.

Pour une vitesse finie positive `v`, le gain par voix vaut désormais :

- `sqrt(v / 12)` sous 12 m/s ;
- `min(v, 24) / 12` à partir de 12 m/s ;
- zéro pour une vitesse nulle, négative ou invalide.

La courbe est continue et croissante, sans plancher artificiel. À 0,045 m/s,
le gain passe de 0,00375 à environ 0,06124 (×16,33, soit +24,26 dB).
À 0,12 m/s il passe de 0,01 à 0,1 (+20 dB). Les sons forts dès 12 m/s,
le plafond, les douze voix et le compresseur sont conservés. Sous 12 m/s,
doubler la vitesse multiplie désormais l’amplitude par √2, et non par deux.

Les trois échantillons approuvés, leurs licences, la physique, les seuils de
collision, les règles, le mute et le replay silencieux sont conservés.
L’audibilité dépend aussi du volume système et du matériel ; cette correction
relève le signal, sans prétendre résulter d’une écoute subjective sur le poste
utilisateur.

## Validation

Dix tests audio ciblés réussis. Mesures Web Audio et suite complète à terminer
avant livraison sur main. Le script `scripts/validate-impact-audio.mjs` vérifie
la nouvelle loi ; les résultats 0.76 restent archivés sans réécriture.
