# Catalogue Inheritance

When a client is configured to inherit a catalogue from another client, changes to the parent
client's works, publishers, and composers are automatically propagated to the child client.
This keeps child catalogues in sync without manual duplication.

---

## Work propagation

**Entry point:** `propagateWork` — called from the work post-save hook after every save.

### 1. Find eligible child clients

1. Look up the parent client from `work.clientId`.
2. Find all clients whose `inheritCatalogueFrom` array contains the parent client's ID.
3. Filter down to clients where the matching inheritance entry has `transferWorks: true`.
4. If the entry also has a non-empty `catalogueGroup`, the work must belong to that group
   (checked against `work.catalogueGroups`). Entries without a `catalogueGroup` match all works.

### 2. Propagate to each matching child (`propagateWorkToClient`)

For each eligible child client:

1. **Find or create the child work** — query for an existing work with
   `{ clientId: child._id, duplicatedFrom: work._id }`. If none exists, create a new document.
2. **Copy scalar fields** — title, alternate titles, composer string, identifier, ISWC, tunecode,
   copyright date, label copy, flags (grand rights, priority, production library), language,
   description category, composite type/count, version type, arrangement type, lyric adaption type,
   original work fields, performers, territories, project ID, and `duplicatedFrom`.
3. **Merge aliases** — append any aliases from the source that are not already on the child.
4. **Merge society identifiers** — append any society identifiers from the source that are not
   already on the child.
5. **Copy tracks** (`copyTracks`) — see below.
6. **Copy IP chain** (`copyIpChain`) — see below.
7. **Save the child work.** If the save fails, the error message is appended to
   `work.validationErrors` and persisted back to the parent work via `Work.updateOne`.
   The error from `updateOne` itself is swallowed to mirror the original behaviour — the
   parent work has already been saved successfully at this point.

### 3. Track copying (`copyTracks`)

For each track referenced in `sourceWork.trackIds`:

- Look for an existing track in the child client matching either the same ISRC or
  `duplicatedFrom` the source track ID.
- If found and not already linked, add its ID to `childWork.trackIds`.
- If not found, create a new track via the track model's `copyValues` callback, save it,
  and add the new ID to `childWork.trackIds`.
- Save errors on individual tracks are swallowed so one bad track does not block the rest.

### 4. IP chain copying (`copyIpChain` / `copyIpChainLayer`)

The source work's `rightsChain` is deep-cloned before processing so mutations to IDs do not
affect the parent. For each rights chain entry:

- Recurse through all `children` in the chain tree.
- **Publisher nodes** (`type: 'Publisher'`) — resolve or create the publisher in the child
  client via `copyPublisherToClient` and update `child.publisherId`.
- **Composer nodes** (`type: 'Composer'`) — resolve or create the composer in the child
  client via `copyComposerToClient` and update `child.composerId`.
- **Territory** — after the chain tree is processed, resolve the territory via
  `copyChainTerritory` (see below).

### 5. Publisher resolution (`copyPublisherToClient`)

1. Check for an existing publisher in the child client with `duplicatedFrom` the source ID — return it if found.
2. Load the original publisher by ID.
3. Check for an existing publisher in the child client with the same name — return it if found.
4. Create a new publisher in the child client, copying all PRO fields, identifiers, controlled
   flag, notes, and setting `duplicatedFrom` to the original ID.

### 6. Composer resolution (`copyComposerToClient`)

1. Check for an existing composer in the child client with `duplicatedFrom` the source ID — return it if found.
2. Load the original composer by ID.
3. If the composer has a valid CAE, search the child client for a composer matching the CAE
   (with or without leading zeros, or via `caeWithoutLeadingZeros`).
4. If there is no valid CAE, fall back to matching by name among composers with a blank/null/zero CAE.
5. If a match is found either way, return its ID.
6. Otherwise create a new composer in the child client, copying all PRO fields, identifiers,
   controlled flag, notes, and setting `duplicatedFrom` to the original ID.

### 7. Territory resolution (`copyChainTerritory`)

- If the territory value is not a 24-character ObjectId, it is a standard territory code and
  is returned as-is.
- Otherwise it refers to a Territory Group. Look up the group by ID, then find or create an
  equivalent group in the child client (matched by name), copying `name` and `territories`.

---

## Publisher propagation

**Entry point:** `propagatePublisher` — called from the publisher post-save hook after every save.

### 1. Find eligible child clients

1. Look up the parent client from `publisher.clientId`.
2. Find all clients whose `inheritCatalogueFrom` array contains the parent client's ID.
3. Filter down to clients where the matching inheritance entry has `transferPublishers: true`.
4. If the entry also has a non-empty `catalogueGroup`, the publisher must belong to that group
   (checked against `publisher.catalogueGroups`). Entries without a `catalogueGroup` match all publishers.

### 2. Propagate to each matching child (`propagatePublisherToClient`)

For each eligible child client:

1. **Find or create the child publisher** — query for an existing publisher with
   `{ clientId: child._id, duplicatedFrom: publisher._id }`. If none exists, create a new document.
2. **Copy all fields** — name, CAE (padded to 11 digits), all PRO fields and identifiers,
   controlled flag, notes, and `duplicatedFrom`.
3. **Save the child publisher.**

---

## Composer propagation

**Entry point:** `propagateComposer` — called from the composer post-save hook after every save.

### 1. Find eligible child clients

1. Look up the parent client from `composer.clientId`.
2. Find all clients whose `inheritCatalogueFrom` array contains the parent client's ID.
3. Filter down to clients where the matching inheritance entry has `transferComposers: true`.
4. If the entry also has a non-empty `catalogueGroup`, the composer must belong to that group
   (checked against `composer.catalogueGroups`). Entries without a `catalogueGroup` match all composers.

### 2. Propagate to each matching child (`propagateComposerToClient`)

For each eligible child client:

1. **Find or create the child composer** — query for an existing composer with
   `{ clientId: child._id, duplicatedFrom: composer._id }`. If none exists, create a new document.
2. **Copy all fields** — name, CAE (copied as-is; the child's pre-save hook handles
   normalisation), all PRO fields and identifiers, controlled flag, notes,
   firstName, middleNames, surname, and `duplicatedFrom`.
3. **Save the child composer.**
