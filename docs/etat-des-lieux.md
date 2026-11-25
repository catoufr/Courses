# Appli Courses — État des lieux

Mis à jour : 25/11/2026 — appli en v2.1

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
- v2.1 — Consigne et import ajustés sur de vrais tickets (U et Intermarché) :
  - l'enseigne est lue sur le logo ; le nom imprimé (« SELONGEY », « SAS SOFRALDI ») est mémorisé comme alias, donc reconnu automatiquement ensuite
  - date de l'achat cherchée en bas du ticket (promotions « Du … au … » ignorées) ; à défaut, date lue dans le nom du fichier
  - produits répétés sur plusieurs lignes regroupés (quantités et remises additionnées)
  - remises imprimées à part (« 2EME A -50% ») rattachées au produit
  - total = total du ticket, pas le montant payé avec un seul moyen de paiement
  - ticket sans catégories imprimées (Intermarché) : l'IA propose un rayon parmi les rayons génériques, signalé « catégorie proposée » à la vérification et modifiable
  - vérifié sur les deux tickets : les totaux tombent au centime (93,13 € et 287,83 €)
- v2.0 — Magasins et catégories par magasin :
  - l'IA recopie la catégorie imprimée sur le ticket pour chaque ligne ; l'appli crée le magasin et ses catégories toute seule
  - chaque magasin (U, Leclerc, Intermarché, Carrefour…) a ses propres catégories, que l'on peut renommer, réordonner, fusionner ou supprimer (Réglages → Magasins)
  - un même produit peut avoir une catégorie différente selon le magasin
  - dans une liste, choix du magasin : les articles se rangent selon les catégories de ce magasin (« Sans catégorie » pour les autres) ; sans magasin, rayons génériques comme avant
  - le catalogue peut aussi être classé par magasin
  - distinction préparée entre « catégorie du ticket » et « rayon réel » : le champ rayon existe pour chaque produit et magasin, mais n'est pas encore affiché (sera rempli avec le plan du magasin, V4)
  - les données de la v1.x sont migrées automatiquement (les magasins des tickets déjà importés sont créés)
- Import des tickets de caisse (partie de la V3 livrée en avance), onglet « Tickets » :
  - accepte les photos, les images et les PDF (eTickets téléchargés depuis l'appli du magasin, ex. Magasins U)
  - même parcours que l'appli véhicule : photo réduite, bouton « Analyser avec Claude ou Gemini » (copie la consigne et partage la photo), boutons « Ouvrir Claude » / « Ouvrir Gemini », « Coller la réponse »
  - au retour dans l'appli, le formulaire se remplit tout seul si la réponse de l'IA est dans le presse-papiers ; saisie à la main possible
  - table de vérification (nom, rayon, quantité, prix, remise) avec contrôle de la somme par rapport au total du ticket
  - création automatique des produits du catalogue, rayon proposé par l'IA
  - mémorisation « libellé du ticket → produit » par magasin
  - prix et magasin enregistrés (dernier prix affiché dans le catalogue), achats ajoutés à l'historique donc aux suggestions
  - liste des tickets importés, suppression possible

## En cours
- Test de l'appli sur le téléphone (mise en ligne GitHub Pages à faire).

## À faire
- Tester la v2.1 avec Gemini sur les vrais tickets et ajuster la consigne selon ce que l'IA renvoie ; tester Leclerc et Carrefour.
- V1 (suite) : partage en temps réel (Firebase) — créer le projet gratuit, brancher la synchronisation dans save().
- Mettre en ligne sur GitHub Pages et tester l'installation sur le téléphone.
- V2 : mode « En courses » dédié.
- V3 (reste) : conservation de l'image du ticket (garantie), historique des prix, comparaison entre magasins, tendances, familles de produits similaires.
- V4 : plan du magasin.

## Limites connues
- Les catégories sont recopiées telles qu'imprimées (un même titre écrit différemment sur deux tickets crée deux catégories : utiliser « fusionner »).
- Les données sont dans le navigateur de chaque téléphone : sans la synchronisation, les listes ne sont pas partagées.
- Les images de tickets ne sont pas conservées : la photo sert seulement à l'envoi à l'IA (archivage prévu ensuite).
- Le format JSON des consignes est à valider avec une vraie photo de ticket.
- Pas encore testée sur un vrai téléphone : seule la logique a été vérifiée.
