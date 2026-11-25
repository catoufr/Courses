# Appli Courses

Appli web installable (PWA), sans serveur, qui fonctionne hors ligne.

## Mise en ligne (GitHub Pages)
1. Crée un dépôt GitHub et envoie-y le contenu de ce dossier (à la racine).
2. Dépôt → Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Ouvre l'adresse indiquée sur le téléphone, puis menu du navigateur → « Installer l'application » / « Ajouter à l'écran d'accueil ».

## Test local
Ouvrir `index.html` dans un navigateur suffit (le mode hors ligne et l'installation demandent https ou localhost).

## Importer un ticket de caisse
Onglet « Tickets » : photo du ticket ou fichier (image, PDF d'eTicket), « Analyser avec Claude ou Gemini » (consigne copiée, photo partagée), copie de la réponse puis retour dans l'appli : le formulaire se remplit tout seul. Vérification, puis validation pour créer les produits du catalogue.

## Fichiers
- `index.html`, `style.css`, `app.js` : l'appli
- `sw.js` : cache hors ligne
- `manifest.webmanifest`, `icon*` : installation sur l'écran d'accueil
