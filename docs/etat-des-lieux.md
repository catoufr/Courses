# Appli Courses — État des lieux

Mis à jour : 26/11/2026 — appli en v3.5

## Terminé
- **v3.5** : sur chaque article de la liste, boutons − / + pour la quantité (jamais sous 1), 🗑 pour retirer (avec « Annuler » pendant 5 s) ; à l'import, boutons Valider / Annuler aussi en haut de l'écran de vérification. Import de 9 tickets Intermarché testé par l'utilisateur : ok.
- **v3.4 — par enseigne** :
  - suggestions calculées avec les achats du magasin choisi dans la liste (sans magasin : tous les achats) ; bloc « Suggestions » replié au chargement, regroupé par catégorie repliable, avec « Tout développer »
  - saisie d'un article : la proposition du catalogue est filtrée par ce que tu tapes (liste du navigateur) et par le magasin choisi (produits achetés dans ce magasin + produits jamais achetés avec un magasin connu) ; sans magasin, tout le catalogue
  - catalogue : filtre « enseigne » (toutes / une enseigne) ; avec une enseigne : produits achetés là et dernier prix dans cette enseigne
- **v3.2 — contrôles de lecture** (après un test réel : 3 tickets U d'un coup, le 3e avait des noms et prix décalés d'une ligne à partir de « KNACK.ORIG.PRC CSN HER.X4 140G », lu comme 2 produits : 22 lignes au lieu de 21)
  - la consigne demande en plus `montant_ligne` (montant imprimé à droite) et `nb_lignes` (« Nombre de lignes d'article »), précise qu'un libellé peut avoir plusieurs morceaux, et impose un auto-contrôle avant réponse (nombre de lignes, quantité × prix = montant, somme = total)
  - l'écran de vérification signale : « ⚠ montant » sur une ligne dont quantité × prix ≠ montant du ticket (se met à jour quand on corrige), et un message si l'IA renvoie plus de lignes que le ticket n'en indique
- **v3.1** :
  - catalogue et liste : catégories repliables (nombre d'articles affiché), tout replié au chargement, bouton « Tout développer / Tout réduire » au-dessus ; l'état est gardé jusqu'au rechargement de l'appli ; la recherche du catalogue déplie les résultats ; ajouter un article ouvre sa catégorie dans la liste
  - import de plusieurs tickets à la fois : plusieurs photos ou PDF (dates et enseignes différentes), une seule consigne et un seul envoi à l'IA, qui renvoie `{ "tickets": [...] }` ; vérification puis validation ticket par ticket (« Ticket 2 / 3 », bouton « Ignorer », « Tout annuler ») ; les produits créés au ticket 1 sont reconnus au ticket 2
- **v3.0 — catégories communes** : fin des catégories par magasin. 19 catégories thématiques communes à tous les magasins (Fruits et légumes, Charcuterie / traiteur, Crèmerie / frais, Alcools, Bricolage / outillage…), modifiables dans Réglages (renommer, réordonner, supprimer, fusion automatique si le nom existe déjà).
  - import : un seul champ « catégorie » par ligne, pré-rempli par l'IA (les titres du ticket ne servent que d'indice) ; un produit déjà classé garde sa catégorie, un produit resté dans « Autre » est reclassé par l'import ; badge « à classer »
  - liste : choix du magasin conservé, articles rangés par catégorie (l'ordre par rayon viendra avec le plan)
  - magasins : nom + « noms reconnus » (ville, société imprimés sur le ticket) gérés dans Réglages
  - migration automatique des données v2 (anciennes catégories renommées, produits « Autre » reclassés d'après leurs anciennes catégories de magasin)
  - le champ « rayon » (emplacement physique par magasin) reste dans les données, sans écran pour l'instant
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
- Tester la v3.1 (plusieurs tickets) avec Gemini sur les vrais tickets et ajuster la consigne selon ce que l'IA renvoie ; tester Leclerc et Carrefour.
- V1 (suite) : partage en temps réel (Firebase) — créer le projet gratuit, brancher la synchronisation dans save().
- Mettre en ligne sur GitHub Pages et tester l'installation sur le téléphone.
- V2 : mode « En courses » dédié.
- V3 (reste) : conservation de l'image du ticket (garantie), historique des prix, comparaison entre magasins, tendances, familles de produits similaires.
- V4 : plan du magasin.

## Limites connues
- La lecture dépend de l'IA : plusieurs tickets denses d'un coup augmentent le risque de décalage (préférer 1 à 2 tickets U, mode Pro/Réflexion de Gemini). Un décalage où prix et montant sont décalés ensemble n'est détecté que par l'écart de total ou le nombre de lignes.
- La classification dépend de l'IA : en cas de doute elle choisit « Autre » (à corriger dans la table de vérification).
- Les données sont dans le navigateur de chaque téléphone : sans la synchronisation, les listes ne sont pas partagées.
- Les images de tickets ne sont pas conservées : la photo sert seulement à l'envoi à l'IA (archivage prévu ensuite).
- Le format JSON des consignes est à valider avec une vraie photo de ticket.
- Pas encore testée sur un vrai téléphone : seule la logique a été vérifiée.
