# Interface épurée — version 0.83

Échap ouvre uniquement Menu principal, Recommencer et Options. Une seconde
pression reprend la partie ; depuis Options, Échap revient au menu de pause.
La simulation reste suspendue pendant le passage entre les deux pages.

Le panneau jauge est fixe à droite, sans menu dépliable. Il disparaît en mode
geste souris. Les annonces, le placement et les actions d’entraînement restent
accessibles dans des commandes contextuelles distinctes. Les joueurs occupent
un bandeau réduit ; le tour est indiqué par le contour du joueur actif.

Les compteurs de coups/empochages, messages de statut, marque/version, vue active
et boutons plein écran/options sont masqués dans la vue de jeu. La rangée centrale
contient uniquement les billes encore actives du jeu de la 9. Les sons, règles et
paramètres physiques sont conservés.

## Point de reprise

Première intégration sauvegardée. Seize tests ciblés menu/UI/plein écran passent.
À vérifier avant main : navigateur, pause/options/reprise, affichage selon les
modes, commandes jauge directes et responsive ; suite complète. Les agents ont
atteint leur limite ; la validation finale est reprise par le coordinateur.
