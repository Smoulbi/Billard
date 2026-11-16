# Retours des jump shots — 0.92

Après une frappe acceptée, la queue est préparée à 0° pour le tir suivant.
La simulation, les métadonnées du replay et le coup de laboratoire gardent
l’angle de frappe initial. Une tentative refusée ne réinitialise pas l’angle.

Chaque réception utilise le WAV des bandes, avec le même réglage de volume
(-6 dB). La vitesse fournie au moteur audio est la vitesse verticale entrante
au contact du tapis, sans coefficient artificiel ni seuil de silence à 0,35 m/s.
La courbe existante de gain relève les petits impacts et les rend progressivement
plus faibles avec les rebonds ; la vitesse horizontale ne détermine pas ce bruit.

L’angle est affiché en degrés pendant S + molette. Après validation par S,
il reste visible sur la table s’il est non nul ; l’indicateur disparaît lors
de la frappe ou du retour à une queue à plat. Le curseur des options continue
aussi d’afficher son angle en degrés.

Validation : 309 tests réussis sans échec, dont trois nouvelles vérifications
exécutant les fonctions réelles de frappe, de réception et d’affichage.
Le contrôle Chromium confirme l’indicateur à 46°, la remise à 0° à la frappe,
le replay conservé à 46° et deux réceptions aux sons décroissants, à 1,2085
puis 0,3012 m/s (la cible est touchée entre les deux réceptions).
Aucune erreur JavaScript relevée pendant l’essai. Les contrôles audio mesurent
les appels et les gains ; ils ne constituent pas une écoute subjective.

[Mesures](data/jump-feedback-v092-validation.json) · [Capture](data/jump-feedback-v092-angle.png)
