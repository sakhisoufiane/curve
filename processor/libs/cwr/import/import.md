# CWR Import Process

## Overview

Entry point: `runCwrImport({ importId, email })` in `import.js`.

Fetches the `Import` document and its `Client` from the database, delegates to `ingestCwrFile`, then sends a notification email and saves the final import status.

## Pipeline

### 1. File download & parsing (`ingestCwrFile`)

- Downloads the CWR file from S3 using the key stored in `Import.counterpointFiles.publishingCatalogueExport`.
- Parses it with `CwrReader` (from `@curveroyaltysystems/curve-shared-logic`), producing an array of work objects and any parse-level errors.
- Passes both to `ingestData`.

### 2. Work loop (`ingestData`)

- Iterates over every parsed work object.
- Calls `ingestWork` for each; catches per-work errors and appends them to the `errors` array (import continues).
- Saves progress to the `Import` document every 100 works so that partial results are visible while a large file is processing.
- Returns `{ count, errors }`.

### 3. Work upsert (`ingestWork`)

**Territory pre-filter** — if `defaults.ingestionTerritory` is set, the work is skipped entirely if none of the publisher territory chains cover that territory.

**Find or create** — `findPreviousWork` looks up an existing `Work` by `clientId` + `importPartnerId` + `submitterWorkNo` (checked against both `identifier` and `foreignId`). A source entry recording the import ID, partner ID, action (`Created`/`Updated`), and date is pushed onto `work.source`.

**Set data** — calls `setWorkData`, then saves the work.

### 4. Work data (`setWorkData`)

Four sub-steps run in order:

| Step | Function | What it does |
|---|---|---|
| 1 | `setMainWorkParams` | Title, identifiers, ISWC, tunecode, grand rights, priority, work category, language, composite type/count/works, production library, version type, arrangement, lyric adaption, alternate titles, catalogue groups, performers. Resets `rightsChain` and sets `territories` from defaults. |
| 2 | `setIpChain` | Builds the publisher → composer rights chain tree (see below). |
| 3 | `setRights` | Applies contracts from `defaults.contracts` to `salesReturnsRights` and `salesReturnsRightsDisplay`, deduplicating by contract ID. |
| 4 | `setRecordings` | Finds or creates `Track` and `Release` documents for each recording. |

---

## IP Chain building (`setIpChain`)

This is the most complex step. It converts flat CWR publisher/territory rows into a nested rights-chain tree attached to the work.

### Steps

1. **`combinePublisherChains`** — when multiple publisher chains have identical members (same `publisherSequence`+`interestedPartyNo` sequence), they are merged into one chain and their PR/MR/SR ownership shares are summed. Territory collection shares for the merged chains are also combined via `mergePublisherTerritories`.

2. **`splitTerritoriesByLineNo`** — maps each territory record to the publisher it belongs to, using the CWR line numbers to correlate SPU/OPU rows with their following TER rows.

3. **`splitTerritoryGroups`** — groups publishers by the set of territories they cover (sorted ISO codes as a key). If `defaults.ingestionTerritory` is set, groups that don't include it are excluded.

4. **`CwrUtils.consolidateGroups`** — removes territories that are already covered by a broader group.

5. **`CwrUtils.consolidatePublisherTerritories`** — produces the final consolidated territory list per chain.

6. **Rights chain construction** — for each territory group, a root node is created (`territory: 'WW'` or `territory: 'specific'` with ISO codes). Publisher chains are reversed so the collecting party comes first. For each publisher, `createPublisher` is called and the result is added to the tree via `addPublisherToChain` (inserts at the deepest child of chain 0, or as a parallel child for chains > 0).

7. **`claimingParty` injection** — if `defaults.claimingParty` is set, a new publisher node representing the claiming party is inserted above each controlled chain child, with collection shares transferred from the original top-of-chain publisher.

8. **OWR composers** — writers with `lineType === 'OWR'` and no associated publisher are added directly to every rights chain's children via `createComposer`.

---

## Publisher resolution (`createPublisher`)

Lookup order:
1. By IPI/CAE (with and without leading zeros).
2. By lowercase name.
3. Create new if not found.

Collection shares (PR/MR) are resolved as follows:
- Non-SPU publishers use their ownership share as the collection share.
- SPU publishers use the territory-specific collection share if available, otherwise 0 (they don't collect outside their territories).
- If territory-specific `shares` exist and the publisher covers `commonTerritories`, those shares take precedence.

The last publisher in each chain has `getComposersForPublisher` called on it, which attaches linked composer nodes as children.

---

## Composer resolution (`createComposer`)

Lookup order:
1. By IPI name number / CAE (with and without leading zeros).
2. By lowercase name where CAE is null or `00000000000`.
3. If a name match is found but the CAE differs, a new composer record is created (same name, new CAE).
4. Create new if not found by either.

Shares are prorated by the number of publishers the composer is associated with. Territory-specific collection shares (SWT records) override the base shares when the territory matches `defaults.ingestionTerritory` and the main chain territories.

---

## Recordings (`setRecordings` / `setReleases`)

For each recording with an ISRC:
- Find existing `Track` by `isrc` + `clientId`, or create one.
- Link the track ID onto the work (deduplicated).
- If a catalogue number (`catNo`) is present, find or create a `Release` by `clientId` + `catNo` and link the track to it.

---

## Status & notifications

| Outcome | Import status | Notification |
|---|---|---|
| No errors | `Complete` | `genericComplete` — works imported count |
| Some per-work errors | `Complete` / `errorMessage: 'Partially Complete'` | `partialImportError` — error list + count |
| Fatal ingest error | `Errored` | `bulkImportError` — error message |

The `Import` document is always saved in the `finally` block regardless of outcome.

---

## Key defaults

| Default | Effect |
|---|---|
| `ingestionTerritory` | Skip works/chains that don't cover this territory |
| `setMainIdentifier` | Use `submitterWorkNo` as `work.identifier`; otherwise set as `foreignId` |
| `contracts` | Sales/returns rights applied to every ingested work |
| `territories` | Overrides `work.territories` |
| `catalogueGroups` | Added to every ingested work |
| `claimingParty` | Publisher inserted at the top of each controlled chain |
| `setPublisherInterestedParty` | Stores `interestedPartyNo` on newly created publishers |
| `setComposerInterestedParty` | Stores `interestedPartyNo` on newly created composers |
