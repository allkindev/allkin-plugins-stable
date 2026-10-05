# Explorateur de fichiers

Parcourir et gérer les fichiers des agents depuis Allkin.

## Onglet « Fichiers » d'un agent

Le bouton dossier sur la ligne d'un agent ouvre son espace `data/` :

- navigation par dossiers (une ligne « Dossier parent » pour remonter) ; tri par nom, taille ou
  date (en-têtes de colonnes ; sur téléphone, un bouton « Trier ») ;
- **tout se fait depuis l'en-tête de la page**, en boutons icône : rechercher (le filtre par nom
  ne prend une ligne que quand on l'ouvre), déposer des fichiers, nouveau dossier, nouveau fichier,
  sélection — le menu ⋮ d'Allkin n'a rien à proposer ici ;
- une **icône par type** : dossier, image, PDF, archive, script, code, données, texte… la
  corbeille et le dossier `Upload` ont la leur ;
- un fichier créé s'ouvre aussitôt ;
- **dépôt** de fichiers et de dossiers entiers par glisser-déposer, avec progression — ou par le
  sélecteur du système (bouton « Déposer » de l'en-tête), la seule façon sur téléphone ;
- **menu contextuel** (clic droit, appui long, ou le bouton ⋯ de chaque ligne) : ouvrir,
  télécharger, sélectionner, copier, couper, coller, renommer, archiver, extraire, nouveau
  fichier, nouveau dossier, déposer, supprimer ;
- **sélection multiple** : bouton « Sélection » de l'en-tête, ou « Sélectionner » sur un
  élément. Une barre apparaît alors avec Tout / Télécharger / Déplacer / Supprimer / Terminé — au
  pied de l'écran sur téléphone ;
- **corbeille** : « Vider la corbeille » dans le menu contextuel, quand on est dedans ;
- toutes les confirmations et saisies passent par les fenêtres d'Allkin, et chaque action
  répond par une bulle ;
- **archives** zip/tar, et téléchargement d'un dossier en zip ;
- **exécution de scripts** `.sh`, après lecture de leur contenu, avec la sortie en direct ;
- **corbeille** : ce qui est supprimé part dans `Trash/`, vidable à part.

Avec le plugin *Éditeur d'images*, le menu contextuel d'une image propose **Modifier l'image**.

Un clic sur un fichier l'ouvre dans le plugin *Éditeur de texte* s'il est installé, et le
télécharge sinon.

## Dossier partagé

Dans la liste Plugins du menu Allkin, **Dossier partagé** ouvre `~/.allkin/share`, commun à tous
les agents et à tous les plugins : chacun y lit, écrit, ajoute et supprime. Même page que les
fichiers d'un agent, sans exécution de scripts. Un dossier qui porte le nom d'un plugin installé
est le sien : son contenu se modifie, le dossier lui-même reste. Copier ou couper dans les fichiers
d'un agent puis coller dans le dossier partagé (ou l'inverse) passe d'un espace à l'autre.

## Explorateur de `~/.allkin`

Depuis l'accueil, un parcours **en lecture seule** du dossier d'installation d'Allkin : agents,
sessions, sauvegardes. Les secrets n'y sont pas lisibles. Un fichier s'ouvre dans un onglet
**visualiseur**, sur fond bleu : texte brut sans coloration ni mise en forme, image, PDF, ou le
contenu d'une archive (zip, tar) sans l'extraire ; les autres types se téléchargent.

Clic droit sur un élément : Ouvrir, Télécharger, Copier le chemin.

## Sans ce plugin

Plus d'onglet Fichiers ni d'explorateur : le bouton dossier des agents et le bouton « Explorateur »
de l'accueil disparaissent. Les agents, eux, gardent l'accès à leurs fichiers selon leurs droits.

## Droit demandé

- **Interface d'Allkin** — le plugin s'exécute dans la page d'Allkin, avec ta session.
