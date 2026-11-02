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

## Commandes dans la vue de jeu

Le panneau « COMMANDES DE JEU » regroupe la puissance, le point d’impact
(rétro, coulé, effet latéral), l’élévation de la queue, les annonces et le tir.
Il reste accessible en plein écran, avec les joueurs et les décisions de l’arbitre.
Utiliser le bouton « PLEIN ÉCRAN » ou la touche F depuis la table.
Cliquer sur l’en-tête du panneau pour le replier ou le rouvrir.
Sur petit écran, les réglages se trouvent sous la table et défilent ;
le bouton Tirer reste visible. Le point d’impact se règle aussi avec les
flèches du clavier après sélection de la bille de réglage ; Origine le centre.
