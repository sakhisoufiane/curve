# Work pre-save steps

Every time a work is saved, the following steps run automatically in order.

---

## 1. Clean up duplicates

- **Society identifiers** — if the same society + identifier pair appears more than once, duplicates are removed, keeping only one copy.
- **Aliases** — duplicate alias strings are removed.

## 2. Format and calculate

- **Identifier** — any spaces, hyphens, or special characters are stripped. Only letters and numbers are kept (e.g. `WRK-001` becomes `WRK001`).
- **Total participation** — the sum of all participation percentages across Sales Returns Rights lines is recalculated and stored on the work.
- **Blank fields** — empty strings in rights and participation arrays are cleared out.

## 3. Uniqueness checks

The system checks that certain fields are not already in use by another work belonging to the same client. If a duplicate is found, the save is rejected with an error:

- **Identifier** — must be unique per client. Skipped if the work was created via an unmapped import.
- **Tunecode** — must be unique per client.
- **ISWC** — must be unique per client.
- **Society identifiers** — only checked when the field has changed. If any society + identifier combination already exists on another work for the same client, the save is rejected.

## 4. Detect significant updates

The current state of the work is compared against the previously saved version. If the rights chain has changed in a meaningful way (publishers or composers added, removed, or reordered), a `significantUpdateDate` timestamp is recorded. The same check runs for each delivery partner's chain separately, updating that partner's entry.

## 5. Merge duplicate publishers

Within each IP chain, if the same publisher appears more than once at the same level (e.g. split across two identical entries), they are merged into a single entry with their percentages combined. This applies to both the main rights chain and all partner chains.

## 6. Refresh delivery information

The work's `deliveredTo` list is rebuilt from scratch based on current delivery records. This reflects exactly which delivery partners the work has been sent to and when.

## 7. Build the composers string

A human-readable list of composer names is assembled from all Composer nodes in the IP chain and stored in the `composer` field. Duplicate names (the same composer appearing in multiple chains) are listed only once.

## 8. Backfill chain data

Composer entries in the IP chain are updated with the latest `name` and CAE/IPI number pulled from the Composer record in the database, ensuring the chain always reflects current data.

## 9. Validate participation rights

- **Sales Returns Rights** — every line must have both a contract and a percentage. A percentage of 0 is valid; a missing percentage is not.
- **Costs Rights / Channel-Specific Rights** — same rules apply.
- **Duplicate contracts** — a contract can only appear once across Sales Returns Rights and once across Costs Rights. If the same contract appears twice, the save is rejected.

## 10. Issue a party number

Every work needs a unique sequential `partyNo` within its client. The system:

- Assigns the next available number if the work doesn't have one yet.
- Re-issues the number if it conflicts with another work and the work has never been delivered.
- Keeps the existing number if it conflicts but the work has already been delivered (to avoid breaking delivery records).

## 11. Normalise the controlled flag

The `controlled` field on every node in every IP chain is coerced to a proper boolean (`true` or `false`). String values like `"true"` or `"1"` are treated as `true`; anything else is treated as `false`.

## 12. Rebuild used IDs

The `usedComposerIds` and `usedPublisherIds` fields are rebuilt by scanning every node in the main chain and all partner chains. These lists are used for cross-client validation and filtering.

## 13. Cross-client catalogue check

Every publisher, composer, and territory group referenced in the work's chains is checked to confirm it belongs to the same client as the work. If any entity belongs to a different client, the save is rejected.

## 14. Validate the IP chain

The full IP chain is run through the rights chain validator. This checks for things like:

- Every chain has a territory assigned
- At least one chain is controlled
- Mechanical and performance ownership add up to 100%
- Each controlled chain has a composer
- Contract types are specified throughout

The result is stored as `valid` (true/false) and a list of `validationErrors`.

If the work was previously approved and these changes would make it invalid, the save is rejected with an error explaining what went wrong.

If a chain is entirely empty, the save is also rejected.

## 15. Auto-approve

If the client has the **Auto Approve Works** setting enabled and the work is currently valid, it is automatically approved — `approvedDate` is set to now and `approvalStatus` is set to `Approved`.

## 16. Set approval status

Based on the current state:

- **Invalid** — work has validation errors.
- **Ready for Approval** — work is valid but has not been approved yet.
- **Approved** — set by the auto-approve step above (not changed here).

## 17. Calculate total collection

The `totalOwnedMechanical` and `totalOwnedPerformance` values are calculated by summing the mechanical and performance collection percentages across all controlled children in the first qualifying IP chain. Both values are rounded to 2 decimal places.

## 18. Issue a catalogue identifier

If the client has **Issue Identifier** enabled and the work does not already have an identifier (or was created via an unmapped import), the system generates the next sequential identifier:

- It finds the highest existing `identifierNo` for the client and increments by 1.
- If the client has an `identifierStartFrom` value set and it is higher than the calculated number, that value is used instead.
- If the client has an `identifierPrefix` set, it is prepended to the number (e.g. prefix `WRK-` + number `42` = `WRK-42`).
- If the generated identifier is already taken (collision), the system retries with the next number.

## 19. Round percentages

All percentage fields throughout the IP chain (`mechanicalOwnership`, `mechanicalCollection`, `performanceOwnership`, `performanceCollection`) are rounded to 2 decimal places. This applies recursively to every node in every chain, including partner chains.

## 20. Set ISWC eligibility

Two eligibility flags are calculated and stored on the work:

- **IRS eligible** — true if all composers in the chain have a CAE/IPI number and the work meets the criteria for ISWC request via IRS.
- **IAS eligible** — true if the work has an identifier, no existing ISWC, and all composers have valid CAE numbers.
