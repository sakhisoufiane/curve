# CWR

This directory contains all CWR (Common Works Registration) modules used by the processor.

## Contents
- `export/` - Export orchestration and helpers (generation, upload, notifications)
  - `export` - the main export process
  - `builder` - low-level CWR file generation helpers
- `import/` - Import orchestration and helpers (file reader, DB inserts, notifications)
- `tests/` - Regression tests and test fixtures

## Testing
As well as standard unit & integration tests, the CWR module includes a regression test suite. Various CWR Deliveries from a test Client are exported, and compared with the last-known valid export (i.e. a production export).

### Updating Fixtures

The regression tests depend on the latest test client data being exported from production, such as Deliveries, Works, Composers etc. 

The `tests` directory contains a utility that exports the regression test fixtures and expected CWR output files. This is useful when you need to regenerate the test fixtures after a legitimate change to the CWR generation logic.

### Requirements
⚠️ The Test Client must be copied to the development database (or your local version). This is a required manual step. Use the copy client tool, or ask someone with permission to do this for you.

> Make sure to update the following information if the test Client is changed:

**Client ID**: `6748b3c59ecebfdd9e2f52c6`

**Client Name**: `Regression - CWR Export - DO NOT EDIT`

### Script

From the `processor` root directory, run:

```bash
node libs/cwr/tests/utils/exportTestSuiteData.js
```

The script will do the following:
- Fetches the regression test Client (`6748b3c59ecebfdd9e2f52c6`) and related data:
  - Works
  - Publishers & Composers
  - Territory Groups
  - Delivery Partners
  - Deliveries
- Writes a single fixtures file: `libs/cwr/tests/fixtures/regression-client-data.json`
- Runs the CWR builder and writes expected CWR files for the configured deliveries into `libs/cwr/tests/fixtures/` (named by delivery id, e.g. `6790f629354ae1559af84487.V22`)
- Writes a `README.md` timestamp into the fixtures folder (useful for checking when the test suite was last updated)

### Notes
- Only deliveries specified in the `DELIVERIES_TO_TEST` array will be exported. Make sure to adjust this if adding or removing any deliveries that should be tested in this suite.
- The generator expects the regression client to exist in your database. If it's missing you will see an error.
- Regenerating fixtures will overwrite existing fixtures — commit and review diffs carefully when doing so.
- The generator mocks the timestamp (`moment.now`) to ensure generated CWR headers are stable for exact comparison in tests.

### Running Regression Tests

After generating fixtures (or using existing fixtures), run all tests in the CWR directory:

```bash
npm run test:jest cwr
```

If you want to run only the regression tests for quick debugging, use:
```bash
npm run test:jest cwr-regression.integration
```
