# Composer pre-save steps

Every time a composer is saved, the following steps run automatically in order.

---

## 1. Count potential duplicates

The number of entries in `potentialDuplicates` is counted and stored in `potentialDuplicatesCount`. This keeps the duplicate count in sync without requiring a separate query.

## 2. Normalise CAE/IPI number

The composer's CAE number is standardised:

- If a CAE is present and not `"0"`, all non-alphanumeric characters are stripped (e.g. `01-234567890` becomes `01234567890`), and a version without leading zeros is stored in `caeWithoutLeadingZeros`.
- If the CAE is absent or `"0"`, it is set to the placeholder `"00000000000"` and `caeWithoutLeadingZeros` is cleared.

## 3. Filter publisher agreements

`publisherAgreements` is an array of objects (e.g. `{ publisherId, composerId, contractId }`). Any field within each agreement object that is an empty string is nullified in-place. Items are not removed from the array.

## 4. Validate uniqueness

Two checks run before the save can proceed:

- **Name is required** — if `name` is blank, the save is rejected immediately.
- **CAE uniqueness** — the CAE (and its leading-zero-stripped variant) must be unique per client. Another composer with the same CAE on the same client will cause the save to be rejected.
  - If the composer has no meaningful CAE (all zeros), the name must also be unique per client. If the name is not unique in this case, the save is rejected with a message indicating the CAE cannot be empty when the name is not unique.
  - IDs listed in `_excludeIdsForValidation` are excluded from the duplicate check (used when merging or bulk-processing composers).

## 5. Set lower-case name

The composer's `lowerCaseName` field is set to the lowercase version of `name`. This is used for case-insensitive uniqueness checks and searching.

## 6. Issue a party number

Every composer needs a unique sequential `partyNo` within its client. The system:

- Checks whether the current `partyNo` is already in use by another composer on the same client.
- If the number is taken, or if no number has been assigned yet, a new one is issued by finding the highest existing `partyNo` for the client and incrementing by 1.
- If no composers exist for the client yet, `partyNo` starts at 1.

## 7. Issue an interested party ID

If the composer does not already have an `interestedPartyId`, one is generated from the `partyNo`:

- The party number is zero-padded to 8 digits and prefixed with `"C"` (e.g. party number `42` → `C00000042`).
- If the generated ID already exists on another composer for the same client, the save is rejected with an error.

## 8. Validate the interested party ID

A final uniqueness check confirms that the composer's `interestedPartyId` does not conflict with any other composer on the same client. If a conflict is found, the save is rejected.

## 9. Update composer works

After the composer's own fields are finalised, any works that reference this composer are updated to keep them in sync:

- All works for the client that include this composer in their `usedComposerIds` are fetched.
- Each work's `rightsChain` tree is traversed recursively to find nodes where `type === "Composer"` and `composerId` matches this composer.
- If a matching node has a stale `caeNumber` or `name`, those fields are updated in-place.
- Works that had at least one change are saved in batches of 10 (using `eachLimit`) to avoid overwhelming the database.
- If any batch update fails, an error is thrown and logged.
