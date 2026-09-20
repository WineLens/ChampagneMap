# WineLens — Champagne Map

Carte statique en français. Aucune compilation nécessaire.

## Vérifications

- Node.js 24 : `npm ci && npm test`.
- Tests réels de Leaflet, clavier, sélection, réinitialisation et mobile :
  `npx playwright install chromium && npm run test:browser`.
- Prévisualisation locale : `npm run serve`, puis http://localhost:4173.
- Chaque push et PR produit, après les tests, l’artefact téléchargeable
  **champagne-preview**. Le décompresser puis servir son répertoire avec
  `python3 -m http.server 4173`. Cet artefact ne publie pas la branche.

## Publication

Le workflow **Production from main** ne publie que `main`, après les tests.
Les autres branches ne possèdent aucun chemin de déploiement dans ce workflow.

**Réglage administrateur requis avant d’intégrer ces changements :**
dans Settings → Pages → Build and deployment, choisir **GitHub Actions** comme
source. Tant que l’ancien mode publie `redesign-v2`, pousser cette branche
continue à publier immédiatement, même si la PR n’est pas fusionnée.
Pour la transition, ne pas fusionner la PR automatiquement. Le site actuellement
publié reste en place jusqu’au prochain déploiement de production.

## Données

`data.js` sépare géométries, fiches communales indexées par code INSEE de la
source et régions. Les géométries de la version eca8fed sont conservées.
Ces codes reflètent le jeu de données historique ; ils ne prétendent pas
constituer un référentiel administratif à jour.

Les pourcentages hérités n’avaient ni source primaire ni année. Ils sont
conservés, marqués `unverified`, et consultables derrière une mention explicite.
Les valeurs invalides et les totaux en dehors de 98–102 % sont masqués.
Cette tolérance est une règle d’affichage pour les arrondis, pas une validation
des chiffres. Aucun total n’est normalisé ou complété artificiellement.
Les 28 répartitions identiques 13/59/28 restent non vérifiées, et ne sont pas
présentées comme des mesures communales documentées.
Les deux communes nommées Bligny sont distinguées par code et terroir.
Les chiffres attribués à Bligny dans la Marne via son homonyme de l’Aube sont
retirés de cette fiche. Un doublon géométrique strictement identique est supprimé
du jeu chargé (305 entrées historiques, 304 codes uniques).

`data/legacy-grapes.json` conserve toutes les entrées originales, y compris
les variantes contradictoires des noms. Pour valider une fiche : fournir une
source primaire, son URL, l’année des données et le périmètre exact ; vérifier
les cépages minoritaires avant de passer `status` à `verified`.

Les notes qualitatives régionales sont sourcées auprès du
[Comité Champagne](https://www.champagne.fr/fr/decouvrir-le-champagne/un-grand-vin-d-assemblage/les-cepages-en-champagne),
consulté le 19 septembre 2026. Cette source ne valide pas les pourcentages
communaux historiques.

Les descriptions existantes ont été conservées sauf les textes de remplissage
et la référence erronée au Clos Saint-Hilaire dans la fiche du Mesnil.
Une validation historique exhaustive des anecdotes reste distincte de la
correction fonctionnelle.
