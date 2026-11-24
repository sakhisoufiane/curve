# Publisher pre-save steps

Every time a publisher is saved, the following steps run automatically in order.

---

## 1. Count potential duplicates

The number of entries in `potentialDuplicates` is counted and stored in `potentialDuplicatesCount`. This keeps the duplicate count in sync without requiring a separate query.

## 2. Normalise CAE/IPI number

The publisher's CAE number is standardised:

- If a CAE is present and not `"0"`, all non-alphanumeric characters are stripped (e.g. `01-234567890` becomes `01234567890`), and a version without leading zeros is stored in `caeWithoutLeadingZeros`.
- If the CAE is absent or `"0"`, it is set to the placeholder `"00000000000"` and `caeWithoutLeadingZeros` is cleared.

## 3. Filter publisher agreements

`publisherAgreements` is an array of objects (e.g. `{ publisherId, composerId, contractId }`). Any field within each agreement object that is an empty string is nullified in-place. Items are not removed from the array.

## 4. Validate uniqueness

Two checks run before the save can proceed:

- **Name is required** — if `name` is blank, the save is rejected immediately.
- **CAE uniqueness** — the CAE (and its leading-zero-stripped variant) must be unique per client. Another publisher with the same CAE on the same client will cause the save to be rejected.
  - If the publisher has no meaningful CAE (all zeros), the name must also be unique per client. If the name is not unique in this case, the save is rejected with a message indicating the CAE cannot be empty when the name is not unique.
  - IDs listed in `_excludeIdsForValidation` are excluded from the duplicate check (used when merging or bulk-processing publishers).

## 5. Set lower-case name

The publisher's `lowerCaseName` field is set to the lowercase version of `name`. This is used for case-insensitive uniqueness checks and searching.

## 6. Issue a party number

Every publisher needs a unique sequential `partyNo` within its client. The system:

- Checks whether the current `partyNo` is already in use by another publisher on the same client.
- If the number is taken, or if no number has been assigned yet, a new one is issued by finding the highest existing `partyNo` for the client and incrementing by 1.
- If no publishers exist for the client yet, `partyNo` starts at 1.

## 7. Issue an interested party ID

If the publisher does not already have an `interestedPartyId`, one is generated from the `partyNo`:

- The party number is zero-padded to 8 digits and prefixed with `"P"` (e.g. party number `42` → `P00000042`).
- If the generated ID already exists on another publisher for the same client, the save is rejected with an error.

## 8. Validate the interested party ID

A final uniqueness check confirms that the publisher's `interestedPartyId` does not conflict with any other publisher on the same client. If a conflict is found, the save is rejected.
