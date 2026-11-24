---
name: mocha-to-jest
description: >
  Migrates a single test file from Mocha/Chai to Jest. Auto-invoke when
  the user says "migrate this test", "convert this file to jest", or
  references a specific test file and mentions jest or mocha.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Mocha → Jest Migration Skill (Single File)

You are an expert at migrating JavaScript/TypeScript test files from
Mocha (with Chai/Sinon) to Jest.

The file to migrate is provided as: $ARGUMENTS

If no file is provided, immediately stop and ask the user to specify a
file path. Do not attempt to search for or guess which file to migrate.

## Phase 1: Read and Analyse

Read the file at $ARGUMENTS. Do not modify it — you will never touch the
original file.

Identify and report:
- Mocha hooks in use (before, after, beforeEach, afterEach)
- Assertion library (chai expect/assert/should, or native assert)
- Stub/spy/mock library (sinon, proxyquire, rewire)
- Any `done` callback patterns
- Any `this.timeout` usage
- Any `.only` or `.skip` markers
- Whether the file is TypeScript or JavaScript

Then present a short summary of what will change and ask the user to
confirm before proceeding.

## Phase 2: Determine Output Path

The mocha tests live under a `test/` directory hierarchy. The new Jest
file must live **next to the source file** it tests, not in any `test/`
directory.

### Step 1: Derive base path and test type

1. Identify the test type from the input path: `unit` if the path contains
   `test/unit/`, `integration` if it contains `test/integration/`, otherwise omit.
2. Strip the leading `test/unit/`, `test/integration/`, or `test/` segment
   (whichever applies) to get the base path.

### Step 2: Insert test type into filename

Ensure the output filename contains the test type before `.test.js` / `.test.ts`.

- If the filename already contains `unit` or `integration` (e.g. `cwr.unit.test.js`),
  leave the filename as-is.
- Otherwise insert the test type: `sftp.test.js` → `sftp.unit.test.js`

### Step 3: Check whether source file is in a standalone folder

Check whether the source file (same name without `.test`) lives directly in the
parent directory (i.e. not already inside a folder named after itself).

- If the source file **is** already in its own folder (e.g. `libs/sftp/sftp.js`),
  place the test file alongside it: `libs/sftp/sftp.unit.test.js`
- If the source file is **not** in its own folder (e.g. `libs/sftp.js`), create
  one. The new structure becomes:
  - `libs/sftp/sftp.js`           ← move the source file here (use `mv` via Bash)
  - `libs/sftp/sftp.unit.test.js` ← write the test file here
  - `libs/sftp/index.js`          ← create inside the new folder;
    content: `module.exports = require('./sftp');`
    (or the TypeScript equivalent). This ensures existing imports of `libs/sftp`
    or `libs/sftp.js` continue to resolve correctly.
    IMPORTANT: Do NOT include the `.js` extension in the require path — use `require('./sftp')` not `require('./sftp.js')`.

  After moving the source file, scan it for any relative imports that are now
  broken due to the extra folder level (e.g. `require('../models/foo')` may need
  to become `require('../../models/foo')`). This includes `require` calls inside
  functions, not just top-level requires — some files use inline requires for
  legacy reasons, and these break just as easily when the folder depth changes.
  Fix all of them before running tests.

  Tell the user what files were moved or created.

### Examples

- `test/unit/libs/sftp.test.js`         → source `libs/sftp.js` not in own folder
  → move to `libs/sftp/sftp.js`, write `libs/sftp/sftp.unit.test.js`,
    create `libs/sftp/index.js` re-exporting `./sftp`
- `test/unit/libs/cwr.unit.test.js`     → source `libs/cwr.js` not in own folder
  → move to `libs/cwr/cwr.js`, write `libs/cwr/cwr.unit.test.js`,
    create `libs/cwr/index.js` re-exporting `./cwr`
- `test/unit/libs/cwr/cwr.unit.test.js` → source already in own folder
  → write `libs/cwr/cwr.unit.test.js` (no move)

Tell the user the full output path (and any file moves) before writing.

## Phase 3: Write the New Jest File

Create a **new file** at the derived output path. Apply every applicable
transformation below. Never edit or delete $ARGUMENTS.

### When in doubt, look at an existing Jest test

If you're unsure how to convert something — whether that's a Jest API, a
route/supertest pattern, or any other test idiom — find an existing Jest test
in the codebase and use it as a reference. Jest tests live **outside** the
`test/` directory and are named `*.unit.test.js` or `*.integration.test.js`.
Prefer tests in the same directory or a sibling directory to the output file.

To find one:

```bash
find . -path ./test -prune -o \( -name "*.unit.test.js" -o -name "*.integration.test.js" \) -print | head -20
```

Read a relevant example, understand the pattern it uses, and follow the same
style. This is always more reliable than guessing.

API REPLACEMENTS:
- require('chai') / import from 'chai'  → remove entirely
- require('sinon') / import from 'sinon' → remove entirely
- before(fn)                    → beforeAll(fn)
- after(fn)                     → afterAll(fn)
- beforeEach(fn)                → beforeEach(fn)  [no change]
- afterEach(fn)                 → afterEach(fn)   [no change]
- this.timeout(n)               → jest.setTimeout(n) inside beforeAll
- done callbacks                → async/await (see pattern below)
- expect(x).to.equal(y)        → expect(x).toBe(y)
- expect(x).to.deep.equal(y)   → expect(x).toEqual(y)
- expect(x).to.include(y)      → expect(x).toContain(y)
- expect(x).to.be.true          → expect(x).toBe(true)
- expect(x).to.be.false         → expect(x).toBe(false)
- expect(x).to.be.null          → expect(x).toBeNull()
- expect(x).to.be.undefined     → expect(x).toBeUndefined()
- expect(x).to.be.NaN           → expect(x).toBeNaN()
- expect(x).to.throw(err)      → expect(() => x).toThrow(err)
- expect(x).to.have.lengthOf(n) → expect(x).toHaveLength(n)
- expect(x).to.have.property(k) → expect(x).toHaveProperty(k)
- expect(x).to.match(/re/)     → expect(x).toMatch(/re/)
- expect(x).to.be.instanceOf(C) → expect(x).toBeInstanceOf(C)
- expect(x).to.be.greaterThan(n)→ expect(x).toBeGreaterThan(n)
- expect(x).to.be.lessThan(n)  → expect(x).toBeLessThan(n)
- sinon.stub(obj, 'method')     → jest.spyOn(obj, 'method')
- stub.returns(val)             → mockFn.mockReturnValue(val)
- stub.resolves(val)            → mockFn.mockResolvedValue(val)
- stub.rejects(err)             → mockFn.mockRejectedValue(err)
- stub.calledOnce               → expect(mock).toHaveBeenCalledTimes(1)
- stub.calledWith(args)         → expect(mock).toHaveBeenCalledWith(args)
- stub.firstCall.args           → mock.mock.calls[0]
- sinon.useFakeTimers()         → jest.useFakeTimers()
- clock.tick(n)                 → jest.advanceTimersByTime(n)

LINES TO REMOVE ENTIRELY (do not migrate, just drop):
- `process.env.NODE_ENV = 'test'` — not needed with Jest
- Any `require(...)` of `models/db` (e.g. `require('../../models/db')`) — legacy requirement, drop it entirely
- Any logger call used purely as a test banner/marker, e.g.:
    logger.info('>>>file>>>> unit/libs/modelErrors ...');
  These are noise and should be removed. Real logger assertions inside
  `it` blocks that test behaviour must be kept.
- `afterEach(() => { sinon.restore(); })` — Jest auto-restores mocks
  between suites; do not migrate this hook at all.

DONE CALLBACK PATTERN — convert to async/await:

  // BEFORE
  it('fetches data', function(done) {
    fetchData((err, data) => {
      expect(err).to.be.null;
      done();
    });
  });

  // AFTER
  it('fetches data', async () => {
    const data = await fetchData();
    expect(data).toBeDefined();
  });

SINON STUBS — convert, but do NOT add afterEach cleanup (Jest handles it):

  // BEFORE
  const stub = sinon.stub(userService, 'find').resolves({ id: 1 });

  // AFTER
  const mockFind = jest.spyOn(userService, 'find')
    .mockResolvedValue({ id: 1 });

RISKY PATTERNS — do not auto-convert, add a comment and move on:
- proxyquire → // TODO(jest-migration): was using proxyquire — consider jest.mock()
- rewire     → // TODO(jest-migration): was using rewire — consider jest.mock()

MONGOOSE / CLEANUP PATTERNS — apply these rules carefully:

1. cleanUp / testUtils.cleanUp → convert to `cleanUpAsync`. It must always
   receive a `clientId` (or `client._id.toString()`). Example:
     // BEFORE
     after(() => cleanUp());
     // AFTER
     afterAll(() => cleanUpAsync(client._id.toString()));

2. Mongoose model instantiation (e.g. `new Work({ ... })`) → must always
   include a `clientId` field. If no `client` or `clientId` exists in the
   test file, do NOT invent one — instead add:
     // TODO(jest-migration): clientId missing — must be added before this test is valid

3. Mongoose queries (find, countDocuments, etc.) → must include a `clientId`
   filter to prevent cross-test data leakage. If the query uses another id
   field (e.g. `_id`, `userId`) that is already unique, no change is needed.
   If it queries by something non-unique without a clientId, add one.
   If you cannot determine the correct clientId to use, add:
     // TODO(jest-migration): query should filter by clientId to avoid data leakage

4. Manual collection cleanup (e.g. `collection.deleteMany({})`, `Model.deleteMany({})`)
   → flag these and add a comment. They must also scope by clientId to avoid
   wiping data from other parallel tests:
     // TODO(jest-migration): deleteMany must scope by clientId — fix before enabling in CI

## Phase 4: Validate — No Tests Removed

After writing the new file, perform a mandatory completeness check.

1. Parse $ARGUMENTS and collect every `describe` and `it` block label
   (the string passed as the first argument).
2. Parse the new Jest file and collect the same.
3. For each label found in the original, confirm a matching label exists
   in the new file.
4. Report any missing labels as ERRORS.

This check is critical. A migration that drops tests is a failure.

## Phase 5: Run the New File

Run the migrated file in isolation:

  npx jest <OUTPUT_PATH> --no-coverage

Capture the output. If tests fail, attempt to fix them in the new file.
If you cannot fix a failure, leave a // TODO(jest-migration): <reason>
comment at the relevant line and report it to the user.

## Phase 6: Summary

Report back:
- Output file path created
- Which patterns were converted (list)
- Completeness check result: all describe/it labels accounted for, or
  list any that are missing
- Whether tests are passing
- Any TODOs left behind that need manual attention

## Phase 6.5: Skip the Original Mocha File

After tests are confirmed passing, mark the original Mocha file as skipped so it
no longer runs under the old test runner. Wrap the outermost `describe` call with
`.skip`:

  // BEFORE
  describe('sendEmail', () => { ... });

  // AFTER
  // This test has been migrated to Jest and is being kept here for reference.
  // It will be deleted at a later point.
  describe.skip('sendEmail', () => { ... });

This is the **only** edit you are allowed to make to $ARGUMENTS.

## Rules

- The ONLY permitted edit to $ARGUMENTS is adding `.skip` to the outermost `describe` (Phase 6.5).
- Never remove test logic from the original, only add `.skip`.
- Never remove test logic from the migrated file, only translate syntax.
- If a pattern is ambiguous, add a TODO comment and continue.
- Prefer async/await over Promise chains.
- Do not auto-apply jest.mock() for module-level mocking — flag it instead.
