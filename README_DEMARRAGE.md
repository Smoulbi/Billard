# FRAME v0.58 — archive complète

Code source récupéré le 2 novembre 2026.
Commit : d49dfc952e4a396ac49b69b5bef8dc2efff443d4.
La version affichée dans le jeu est 0.58. Le compteur de versions de l’hébergement est distinct.

## Lancer localement

Prérequis : Python 3 et un navigateur récent avec WebGL 2 et accélération graphique.
Depuis le dossier contenant ce README :

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Ouvrir http://127.0.0.1:8000/ dans Firefox ou Chrome.
Arrêter le serveur avec Ctrl+C. Ne pas ouvrir index.html directement en file:// : les modules JavaScript nécessitent HTTP.
Sous Windows, utiliser `py -3` à la place de `python3` si nécessaire.

## Code, ressources et dépendances

- dist/ : sources HTML, CSS, JavaScript du jeu ; ce projet ne nécessite aucune compilation.
- dist/vendor/ : Three.js et sa licence, déjà inclus ; aucune installation npm nécessaire pour jouer.
- tests/ : tests automatisés ; scripts/ : outils de diagnostic ; docs/ et fichiers Markdown : documentation et recherches conservées.
- package.json : commande de tests. Node.js 24 permet de lancer `npm test`, sans npm install (aucune dépendance npm déclarée).
- Google Fonts est le seul chargement externe de présentation dans index.html ; hors ligne, les polices de remplacement CSS prennent le relais. Les polices Google ne sont pas intégrées à cette archive.
- Les liens vers les publications scientifiques sont des références documentaires et ne sont pas nécessaires au jeu.

Le fichier LISEZ-MOI.md et les notes de version anciennes sont conservés tels quels et décrivent des étapes historiques. Ce README contient la commande de lancement de cette archive.
Les données enregistrées dans le navigateur ne font pas partie du code source et ne sont pas exportées.
L’archive conserve tous les fichiers suivis par Git, sans le répertoire .git ni identifiants d’accès.

## Tester la version publiée sur GitHub Pages

Dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source →
GitHub Actions**. Puis ouvrir **Actions → Publier le billard sur GitHub Pages →
Run workflow → main → Run workflow** pour lancer la première publication si
elle n’a pas déjà démarré. Attendre que l’exécution soit verte puis ouvrir le
lien du déploiement `github-pages`.

L’adresse prévue avec les paramètres GitHub Pages par défaut est
https://smoulbi.github.io/Billard/ . Les mises à jour de `main` relancent
automatiquement les tests et la publication. Seul le contenu de `dist/` est
publié ; aucun serveur ni installation de dépendances n’est nécessaire.

## Commandes dans la vue de jeu

Le panneau « COMMANDES DE JEU » regroupe la puissance, le point d’impact
(rétro, coulé, effet latéral), l’élévation de la queue, les annonces et le tir.
Il reste accessible en plein écran, avec les joueurs et les décisions de l’arbitre.
Utiliser le bouton « PLEIN ÉCRAN » ou la touche F depuis la table.
Cliquer sur l’en-tête du panneau pour le replier ou le rouvrir.
Sur petit écran, les réglages se trouvent sous la table et défilent ;
le bouton Tirer reste visible. Le point d’impact se règle aussi avec les
flèches du clavier après sélection de la bille de réglage ; Origine le centre.

## Vue à la première personne (PC)

Le bouton CHANGER DE VUE ou la touche V depuis la table alterne désormais
Perspective → Dessus → Première personne → Perspective.
Dans la nouvelle vue, la caméra se place automatiquement derrière la blanche,
penchée dans l’axe du coup. Déplacer la souris horizontalement pour orienter le tir.
Un clic droit active/désactive la visée fine (sensibilité divisée par dix) ;
un clic gauche verrouille/déverrouille la direction. Le statut est affiché en haut
à gauche. Les réglages de puissance et d’effet et le bouton Tirer / Espace
restent identiques. La molette ne déplace pas cette caméra.

Pendant le tir, la caméra reste au point de départ, même si la blanche est
empochée. Une fois les billes arrêtées, elle se replace derrière la blanche ;
la visée est déverrouillée et revient en sensibilité normale. Les autres vues
restent accessibles pendant le mouvement. Pour déplacer la blanche, utiliser
PLACER LA BLANCHE (ou les positions rapides à la casse) ; la vue de dessus
reste disponible pour faciliter ce placement. La vue à la première personne
nécessite le rendu 3D et n’est pas proposée dans le mode 2D de secours.

Dans la vue joueur, le réglage « ZOOM · VUE JOUEUR » modifie le champ de vision
en direct de 35° (rapproché) à 85° (large), y compris en plein écran et pendant
un tir. Le réglage initial est désormais de 60°, plus large que l’ancienne vue
à 40°. Il est conservé entre les coups et les changements de caméra durant
la session ; le bouton Réinitialiser le ramène à 60°.

Le placement de la blanche impose désormais la vue de dessus (placement
obligatoire après faute, bouton de placement, glisser et positions de casse
rapides). Pendant le placement actif, changer de caméra conserve la vue de
dessus. Une fois le placement terminé, les trois vues redeviennent disponibles.
L’effet choisi est automatiquement centré à la fin de chaque coup et au
démarrage d’une nouvelle partie ; l’effet du tir en cours reste appliqué.

La vue joueur propose aussi « HAUTEUR DES YEUX » (12–50 cm au-dessus du tapis)
et « RECUL DERRIÈRE LA BLANCHE » (30–110 cm), réglables en direct dans le panneau.
Le bouton Réinitialiser la position restaure 23 cm de hauteur et 52 cm de recul.
Les valeurs restent sélectionnées entre les coups et changements de vue durant
la session. Pendant un tir, les ajustements se font autour du point de tir initial,
sans suivre la blanche. Le zoom conserve son réglage indépendant.

En vue joueur, déplacer la souris verticalement règle aussi la hauteur des yeux :
vers le haut pour les relever, vers le bas pour les abaisser (limites 12–50 cm).
Le curseur et sa valeur restent synchronisés. Le clic droit réduit aussi la
sensibilité verticale ; le clic gauche verrouille la direction et la hauteur.
Pendant le mouvement des billes, la souris ne déplace pas la caméra.

## Jeu de la 9

Choisir « JEU DE LA 9 » dans Nouvelle partie. Neuf billes sont disposées en
losange, la 1 en tête et la 9 au centre. Il faut toucher la plus petite bille
présente en premier ; toute bille légalement empochée permet de continuer.
La 9 empochée légalement gagne immédiatement, y compris par combinaison
ou sur une casse régulière. Aucune annonce de bille/poche n’est requise.

Une casse sans bille empochée exige quatre billes distinctes aux bandes.
Une faute donne la blanche en main partout sur la table à l’adversaire ;
la 9 empochée sur faute est replacée. Trois fautes consécutives du même
joueur font perdre la partie, avec avertissement affiché après la deuxième.
Un coup régulier remet à zéro le compteur de fautes du joueur.

Juste après une casse régulière, le joueur à la table peut annoncer un
push-out dans les commandes de jeu. Le premier contact et la bande ne sont
alors pas obligatoires, mais empocher la blanche reste une faute. Une 9
empochée sur push-out est replacée. L’adversaire choisit de jouer la position
ou de rendre la main. Le push-out n’est disponible que pour ce premier coup.

Le jeu de la 8 reste disponible. Au chargement, le modèle de bande par défaut
est désormais Pool v0.21 et l’assistance de trajectoire est désactivée.
Ces deux réglages restent modifiables.
