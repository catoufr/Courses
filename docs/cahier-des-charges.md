# Appli Courses — Cahier des charges

Version 0.1 — 15/11/2026

## 1. Objectif

Application web (PWA installable sur téléphone, hébergée via GitHub) pour :
1. gérer les listes de courses, à plusieurs ;
2. garder l'historique des courses et des prix par supermarché ;
3. comparer les prix et dégager des tendances ;
4. archiver les tickets de caisse (garantie).

Usage personnel et familial, gratuit, sans compte obligatoire.

## 2. Contexte d'usage

- Courses faites à plusieurs : la liste doit pouvoir être partagée.
- 1 supermarché principal + 2 occasionnels. Drive quasi inexistant (pas de priorité).
- Utilisation principale sur téléphone, en magasin (une main, écran allumé, réseau parfois faible → fonctionnement hors ligne obligatoire).

## 3. Principes

- Deux modes distincts :
  - **Préparer** : créer et éditer la liste.
  - **En courses** : cocher rapidement, lecture facile.
- Le cochage reste possible depuis la liste (même état partagé).
- Données stockées localement (hors ligne), sauvegarde par export/import (JSON) comme les autres applis.
- Lecture des tickets par IA externe (Gemini ou Claude) via copier-coller, sans clé d'API ni coût.

## 4. Fonctionnalités par version

### V1 — Listes
- Catalogue de produits (nom, catégorie/rayon, unité, supermarché habituel facultatif).
- Plusieurs listes (ex. « Courses de la semaine », « Brico »).
- Ajout rapide avec autocomplétion sur le catalogue.
- États d'un article : à prendre / dans le caddie / indisponible (+ quantité, note).
- Tri par rayon.
- Liste suggérée : basée sur l'historique (produits achetés régulièrement) — proposée, jamais imposée.
- Export / import JSON complet.

### V1 (suite) — Partage à plusieurs (décidé : synchronisation en temps réel)
- Un « foyer » partagé : tous les membres voient la même liste, les cochages apparaissent en direct.
- Rejoindre le foyer par un code ou un lien, sans création de compte.
- Fonctionnement hors ligne : les modifications faites sans réseau se synchronisent au retour de la connexion.
- Export/import JSON conservé comme sauvegarde.

### V2 — Mode « En courses »
- Vue dédiée : gros boutons, groupée par rayon, articles pris repliés.
- Actions : pris / indisponible / annuler.
- Fin de courses : clôture de la liste → crée un historique d'achat (date, magasin).

### V3 — Tickets et prix
(Import du ticket vers le catalogue : livré en avance, voir l'état des lieux. Restent : conservation de l'image, historique des prix, comparaisons, tendances.)
- Photo ou import d'image du ticket, conservée dans l'appli.
- Bouton « Copier les consignes » + « Envoyer la photo » (Gemini / Claude) → l'IA renvoie un JSON.
- Bouton « Coller le JSON » → import dans une table de vérification : désignation, prix unitaire, quantité, total ligne, avantage carte / remise, rayon éventuel.
- Correction manuelle avant validation.
- **Rapprochement** libellé du ticket → produit du catalogue, mémorisé (l'appli apprend les correspondances par magasin).
- Données ticket : magasin, date, total, moyen de paiement (facultatif), flag « garantie » pour conserver l'image.
- Historique des prix par produit et par magasin, comparaison entre magasins, produits similaires (regroupement manuel par « famille »), courbes de tendance, inflation personnelle.
- Export des tickets (images + JSON) pour dépôt manuel sur le Drive.

### V4 — Plan du magasin
- Plan par magasin (éditeur simple : rayons / zones à placer, puis emplacement des produits).
- En courses : bulles/icônes par article sur le plan, clic → pris / indisponible.
- Détail de conception à définir plus tard (rendu soigné souhaité).

## 5. Contenu à fournir à l'IA pour les tickets (à préciser en V3)

Consignes à copier avec la photo, JSON attendu à définir : magasin, date, lignes [désignation, quantité, prix unitaire, prix ligne, remise carte], total.

## 6. Contraintes techniques (proposition)

- PWA : HTML/JS, fonctionnement hors ligne, hébergement GitHub Pages.
- Synchronisation : service gratuit tiers, proposition Firebase (Firestore, offre gratuite, cache hors ligne intégré). Alternative : Supabase.
- Appareil photo via le navigateur.
- Pas de serveur propre ; pas de coût dans l'usage prévu (quelques utilisateurs).
- Confidentialité : données du foyer protégées par règles d'accès ; les images de tickets restent en local et sont sauvegardées par export (pas de stockage cloud payant).

## 7. Points ouverts

1. ~~Partage à plusieurs~~ : tranché, synchronisation en temps réel. Reste à valider le choix Firebase vs Supabase et à créer le projet gratuit.
2. Structure des catégories/rayons (liste fixe ou libre ?).
3. Regroupement des produits « similaires » (manuel au début ?).
4. Format exact du JSON ticket (à tester avec une vraie photo de ticket du magasin principal).
5. Conception du plan magasin.
