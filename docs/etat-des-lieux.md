# Appli Courses — État des lieux

Mis à jour : 15/11/2026

## Terminé
- Cahier des charges v0.1 rédigé.
- Décision : synchronisation en temps réel entre les membres du foyer.
- V1 locale construite et testée (logique) :
  - listes multiples (créer, renommer, vider, supprimer)
  - ajout rapide avec autocomplétion et catalogue qui se remplit tout seul
  - états : à prendre / dans le caddie / indisponible, quantité, note
  - tri par rayon, rayons personnalisables (ordre, renommer, supprimer)
  - catalogue de produits (recherche, édition, ajout à la liste)
  - « Terminer les courses » : archive les articles pris dans l'historique
  - suggestions : produits achetés au moins 2 fois, pas encore sur la liste
  - export / import JSON, mode hors ligne, installable (PWA)

## En cours
- Test de l'appli sur le téléphone (mise en ligne GitHub Pages à faire).

## À faire
- V1 (suite) : partage en temps réel (Firebase) — créer le projet gratuit, brancher la synchronisation dans save().
- Mettre en ligne sur GitHub Pages et tester l'installation sur le téléphone.
- V2 : mode « En courses » dédié.
- V3 : tickets, import JSON, historique et comparaison des prix.
- V4 : plan du magasin.
- Tester une vraie photo de ticket avec Gemini et Claude pour fixer le format JSON.

## Limites connues de la V1
- Les données sont dans le navigateur de chaque téléphone : sans la synchronisation, les listes ne sont pas partagées.
- L'historique ne garde pas encore le supermarché ni les prix (arrivent avec la V3).
- Pas encore testée sur un vrai téléphone : seule la logique a été vérifiée.
