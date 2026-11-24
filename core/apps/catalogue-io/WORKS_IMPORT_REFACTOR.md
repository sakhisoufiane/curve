# Works Import — Phase 6: Performance Refactor

Phases 1–5 are complete (types, imports, async/await). This document tracks the
performance work scoped in Phase 6 to handle imports of millions of works.

## QA command

```
cd core/apps/catalogue-io && npm run qa:runWorksImport
```

---

## Bottleneck inventory

### 1. O(n) database queries — the biggest killer

Every single work triggers multiple individual DB lookups.

**`importWork` — `Client.findById` per work** ([import.ts:489](src/libs/works/import/import.ts#L489)):
```ts
const client = await Client.findById(clientId)  // called for EVERY work that has catalogueGroups
```

**`addParticipators` — `Contract.findOne` per participator** ([import.ts:603](src/libs/works/import/import.ts#L603)):
```ts
const contract = await Contract.findOne({ clientId, name: participator.contractName })
```

**`addSpecificRights` — three separate queries per right** ([import.ts:674](src/libs/works/import/import.ts#L674), [685](src/libs/works/import/import.ts#L685), [699](src/libs/works/import/import.ts#L699)):
```ts
const contract       = await Contract.findOne(...)
const territoryGroup = await TerritoryGroup.findOne(...)
const client         = await Client.findById(...)   // called again, per right with a distributionChannel
```

At 1M works with an average of 2 participators and 1 specific right each, this is
**~4M+ individual DB round-trips** for reference data that doesn't change between works.

**Fix:** pre-load `Client`, all `Contract` documents, and all `TerritoryGroup` documents
into Maps once before the import loop, then pass those Maps into each `importWork` call.

```ts
// Before the loop
const client          = await Client.findById(clientId)
const contracts       = await Contract.find({ clientId }).lean()
const contractByName  = new Map(contracts.map(c => [c.name, c._id]))

const territoryGroups  = await TerritoryGroup.find({ clientId }).lean()
const territoryByName  = new Map(territoryGroups.map(g => [g.name, g._id]))
```

`Contract.findOne({ name })` becomes `contractByName.get(name)` — zero DB cost.

**Status:** Complete

---

### 2. Serial one-by-one saves

The final save loop ([import.ts:202–235](src/libs/works/import/import.ts#L202)) saves each work
individually with no concurrency:

```ts
for await (const batch of saveRl) {
  for (const importedWork of parsedBatch) {
    await WorkPreSave.preSave(...)
    await work.save()   // ← one DB write per work, sequentially
  }
}
```

At 1M works and ~10ms per save, the save phase alone takes ~2.8 hours.

#### Analysis: what preSave does that blocks parallelism

After reading `curve-shared-logic/dist/libs/work/preSave.js`, most preSave steps are
read-only per-work-isolated lookups (`buildComposersString`, `setDeliveries`,
`checkPartnerChainsForSignificantUpdates`, `checkOtherClientCatalogue`,
`checksRightChainValidity`, `autoApproveWork`) — safe to run in parallel.

Two steps have sequential read-then-write race conditions:

**`issueIdentifier`** — reads the current max `identifierNo`, increments, writes to the
work. Two concurrent preSaves both read `max = 100`, both set `identifierNo = 101`.

**`issuePartyNo`** — identical race. Reads max `partyNo`, increments, writes to the work.

**`checkCatalogueIDsAreUnique`** — checks `identifier`, `tunecode`, and `iswc` against the
DB. Under sequential saves this catches intra-import duplicates because each save is visible
to the next preSave call. Under parallel saves, two works sharing a tunecode or iswc would
both pass the check before either is written to DB.

#### Pre-requisite: explicit intra-import duplicate detection

The tunecode/iswc gap above is actually a pre-existing correctness issue regardless of
parallelism — it only works today by accident of sequential ordering. The fix is to extend
`identifiersTracker` in `importWorks` (which already catches duplicate `identifier` values
within the import) to also cover `tunecode` and `iswc`:

```ts
// current — only tracks identifier
if (work.identifier) { identifiersTracker[work.identifier] = ... }

// extended — namespace the key to avoid cross-field collisions
for (const [field, value] of [
  ['identifier', work.identifier],
  ['tunecode',   work.tunecode],
  ['iswc',       work.iswc],
] as const) {
  if (value) {
    const key = `${field}:${value}`;
    if (!identifiersTracker[key]) identifiersTracker[key] = { count: 0, lines: [], field, value };
    identifiersTracker[key]!.count += 1;
    identifiersTracker[key]!.lines.push(work.line ?? 0);
  }
}
```

Error reporting at the bottom of `importWorks` already iterates `identifiersTracker` —
just needs the message updated to use the stored `field` name.

This must land before the parallel save work so that `checkCatalogueIDsAreUnique` in the
save phase is no longer relied on as the sole intra-import guard.

#### Fix: pre-assign sequential counters, then save in parallel with bulkWrite

With both counters pre-assigned before preSave runs, `issueIdentifier` and `issuePartyNo`
both exit early (value already set), removing the two race conditions:

```ts
// 1. One query each to get current maximums for the batch
const [lastIdentifierWork, lastPartyNoWork] = await Promise.all([
  Work.findOne({ clientId }, { identifierNo: 1 }).sort({ identifierNo: -1 }).lean(),
  Work.findOne({ clientId }, { partyNo: 1 }).sort({ partyNo: -1 }).lean(),
])
let nextIdentifierNo = lastIdentifierWork?.identifierNo ?? 0
let nextPartyNo      = lastPartyNoWork?.partyNo ?? 0

for (const work of batch) {
  if (!work.identifier || work._creationType === 'unmapped') {
    nextIdentifierNo++
    work.identifierNo = nextIdentifierNo
    work.identifier   = client.identifierPrefix
      ? `${client.identifierPrefix}${nextIdentifierNo}`
      : String(nextIdentifierNo)
  }
  if (!work.partyNo) {
    nextPartyNo++
    work.partyNo = nextPartyNo
  }
}

// 2. preSave is now safe to run in parallel — issueIdentifier and issuePartyNo exit early
// Uses an inline worker-pool helper (async package was removed in Phase 5)
async function withConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (queue.length > 0) await fn(queue.shift()!);
    }),
  );
}

await withConcurrency(batch, 20, async (work) => {
  await WorkPreSave.preSave({ work, Work, Client, DeliveredWork, Composer, Publisher, TerritoryGroup });
});

// 3. One bulk write for the entire batch instead of N individual saves
await Work.bulkWrite(
  batch.map(w => ({
    updateOne: { filter: { _id: w._id }, update: { $set: w.toObject() }, upsert: true },
  })),
  { ordered: false },
)
```

**Implementation order:**
1. Extend `identifiersTracker` for tunecode/iswc (pre-requisite, own commit)
2. Pre-assign `identifierNo`/`partyNo` per batch
3. Parallelise preSave with `pLimit`
4. Replace `work.save()` loop with `Work.bulkWrite`

**Status:** Complete

---

### 3. All auxiliary data held in memory simultaneously

[import.ts:63–141](src/libs/works/import/import.ts#L63) loads all auxiliary sheets into
memory at once as `IndexedObject` dictionaries before a single work is processed:

- `workData.alternateTitles`
- `workData.participators`
- `workData.specificRights`
- `workData.societyIdentifiers`
- `workData.ipChain`
- `workData.partnerRightsChains`

At 1M works with 2 alt titles each, `alternateTitles` alone holds 2M rows. Combined with
the other sheets this can exhaust the Node.js heap well before processing starts.

**Fix — tiered by actual sheet sizes:**
- **If auxiliary sheets stay small** (< ~500k rows total): the current approach is fine
  once the DB-query fix (#1) is in place. Profile first.
- **If auxiliary sheets are large**: write them to disk the same way works are already
  written (via `writeArrayToFile`) and stream them during the save phase, or bulk-insert
  them into a temporary MongoDB collection keyed by identifier and query in batches.

**Implementation:**
- Each auxiliary `IndexedObject` is written to its own `.jsonl` temp file immediately after
  parsing (via `writeIndexedObjectToFile`), then released from memory.
- During `importWorks`, for each 5000-work batch, all 6 auxiliary files are streamed in
  parallel (`readIndexedObjectForBatch`) and only the entries matching the current batch's
  work identifiers are loaded into memory — bounding memory to O(batch_size × rows_per_work).
- All 6 auxiliary temp files are deleted in every exit path (success, validation error, load error).

**Status:** Complete

---

### 4. Race condition in `writeArrayToFile`

[import-utils.ts:11–31](src/libs/works/import/import-utils.ts#L11): `resolve(outputLocation)`
is called synchronously before `file.end()` fires the `finish` event. The readline stream
in `importWorks` can start reading before the OS has flushed all bytes to disk.

```ts
// Current — resolves before flush
file.end()
resolve(outputLocation)

// Fix — resolve inside the finish callback
file.end(() => resolve(outputLocation))
```

**Status:** Not started

---

### 5. `removeUnpopulatedObjects` silently drops rows

[import-utils.ts:132–139](src/libs/works/import/import-utils.ts#L132): calling `splice`
inside `Array.map` shifts indices after each removal, causing every other removed element
to be skipped. For large imports this silently discards valid rows.

```ts
// Current — buggy
array.map((object, index) => {
  if (!isObjectPopulated(object)) {
    array.splice(index, 1)
  }
})

// Fix
return array.filter(obj => isObjectPopulated(obj))
```

**Status:** Not started

---

### 6. Checkpointing for resumable imports

At millions of works, a failure at work 900,000 means restarting from scratch. The
two-phase design (validate all → save all) makes this worse: a transient DB error during
the save phase discards hours of already-validated work.

**Fix:** write a checkpoint file recording the last successfully saved batch index.
On restart, skip batches up to the checkpoint before resuming saves.

```ts
// After each batch saves successfully
fs.writeFileSync(checkpointPath, JSON.stringify({ lastBatch: batchIndex }))

// On start, read checkpoint if it exists
const checkpoint = fs.existsSync(checkpointPath)
  ? JSON.parse(fs.readFileSync(checkpointPath, 'utf8'))
  : { lastBatch: -1 }
```

**Status:** Not started

---

## Priority order

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Pre-load Client / Contract / TerritoryGroup into Maps | Low | Eliminates millions of DB queries |
| 2 | `bulkWrite` + `pLimit` concurrency in save phase | Medium | 10–50× faster saves |
| 3 | Fix `writeArrayToFile` race condition | Trivial | Prevents data corruption on large files |
| 4 | Fix `removeUnpopulatedObjects` splice-in-map bug | Trivial | Prevents silent row drops |
| 5 | Stream / offload auxiliary data for large sheets | High | Required only if aux sheets reach millions of rows |
| 6 | Checkpointing | Medium | Essential for production reliability at scale |

Items 3 and 4 are pure bug fixes — do them first, separately, in their own commits.
Items 1 and 2 are the primary performance work. Items 5 and 6 depend on observed behaviour
at production scale.

---

## Decisions log

| Date | Decision |
|---|---|
| 2026-06-10 | Agreed on 6-phase incremental approach |
| 2026-06-10 | Callbacks fully eliminated — async/await only |
| 2026-06-10 | `async` library removed as a dependency |
| 2026-06-10 | `lineReader` replaced with Node `readline` |
| 2026-06-10 | Performance work deferred to Phase 6 |
| 2026-06-15 | Phase 6 scoped: 6 bottlenecks identified, prioritised above |
