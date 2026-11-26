# Appli Courses

Appli web installable (PWA), sans serveur, qui fonctionne hors ligne.

## Mise en ligne (GitHub Pages)
1. Crée un dépôt GitHub et envoie-y le contenu de ce dossier (à la racine).
2. Dépôt → Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Ouvre l'adresse indiquée sur le téléphone, puis menu du navigateur → « Installer l'application » / « Ajouter à l'écran d'accueil ».

## Test local
Ouvrir `index.html` dans un navigateur suffit (le mode hors ligne et l'installation demandent https ou localhost).

## Importer un ticket de caisse
Onglet « Tickets » : photo(s) ou fichier(s) — plusieurs tickets possibles à la fois — (image, PDF d'eTicket), « Analyser avec Claude ou Gemini » (consigne copiée, photo partagée), copie de la réponse puis retour dans l'appli : le formulaire se remplit tout seul. Vérification, puis validation pour créer les produits du catalogue.

## Magasins et catégories
Les catégories (thèmes comme Charcuterie, Alcools, Bricolage…) sont communes à tous les magasins : Réglages → Catégories. L'IA classe les produits à l'import des tickets. Les magasins et les noms imprimés sur leurs tickets se gèrent dans Réglages → Magasins. Les rayons propres à chaque magasin viendront plus tard.

## Fichiers
- `index.html`, `style.css`, `app.js` : l'appli
- `sw.js` : cache hors ligne
- `manifest.webmanifest`, `icon*` : installation sur l'écran d'accueil
