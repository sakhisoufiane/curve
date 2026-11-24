# works

Handles importing and exporting of Work catalogue data. This library is the `catalogue-io` equivalent of the import/export statics that previously lived in `api/models/work/work.js`.

## Modules

### `export.ts`

| Function | Description |
|---|---|
| `sendExport(filter, curveUser)` | Triggers a CSV export and emails the result to the user. |
| `createExportCsv(filter, count, clientId)` | Builds a ZIP of CSV files (works + participators, alternate titles, society identifiers, IP chains). Returns the local file path. |

### `import.ts`

| Function | Description |
|---|---|
| `importFromExcel(file, curveUser, overwriteBlanks)` | Parses an uploaded Excel file and imports all work rows. |
| `importWork(data, ...options)` | Upserts a single work record, resolving composers/publishers and validating territories. |
| `importWorks(works, ...options)` | Batch-imports an array of works, writing results to a local JSON file. |
| `importAliases(data, curveUser)` | Imports alternate title rows, matched to existing works by identifier. |
| `importSocietyIdentifiers(data, curveUser)` | Imports society identifier rows, matched to existing works by identifier. |

## Usage

```ts
import { sendExport, importFromExcel } from '@curveroyaltysystems/catalogue-io';

// Export
await sendExport({ clientId: '...' }, curveUser);

// Import
const result = await importFromExcel(uploadedFile, curveUser, false);
console.log(`Imported ${result.count} works with ${result.errors.length} errors`);
```

## Migration status

All functions are currently stubbed (`throw new Error('Not implemented')`). Logic is being migrated from `api/models/work/work.js`.
