# Sales calculator

## Running royalty calculation locally

Refactored sales calculation is split into two phases. Understanding that split is why local setup looks the way it does.

### Why two steps?

1. **Orchestrator** (`SalesCalculator.calculate` — sandbox: `runSalesCalculation.js`) loads the period and contracts from Mongo, builds **slim contract terms**, copies **`escalationEquivalents`** from each lean contract into the payload, joins catalogue/sales data, creates **`BatchTask`** rows, and uploads a **calculation params JSON** file to GCS (plus, today, still **starts ECS/Fargate** tasks that run the same worker the cloud uses).

2. **Worker** (`runTask.js` — sandbox: `runTaskLocally.js`) loads **one** `BatchTask` by id, **downloads that JSON from GCS**, and runs **`RoyaltyCalculator`** with the same object Fargate would get. Your breakpoints and logs live here.

Production always runs the worker on Fargate with `batchTaskId` in the container environment. Locally you mimic that by passing a real **`batchTaskId`** after an orchestrator run has created the task and uploaded the file.

`runLocally: true` in the orchestrator **does not** skip ECS today; it only affects log text. To execute royalty purely on your machine, use **`runTaskLocally`** (or call `runTask` with `batchTaskId` set).

### Prerequisites

- **`core/apps/sales-calculator/.env`** (or cwd when you run Node) with Mongo, GCS, and BigQuery settings consistent with the environment where the period lives. The worker must be able to **download** the same `gs://…` path stored on the batch task.
- For the **orchestrator**, AWS credentials/SSM are also used if ECS tasks are started.

### 1. Orchestrator — create batch tasks and params

1. Edit [`src/sandbox/runSalesCalculation.js`](src/sandbox/runSalesCalculation.js): set **`periodId`** to your period’s Mongo `_id`.
2. **Single contract / statement:** set **`SINGLE_CONTRACT_ID`** in `.env` to that contract’s Mongo `_id`. For a **full period** run, leave it unset.
3. From the package root:

```bash
cd core/apps/sales-calculator
npm run qa:calculation
```

4. Note the **`BatchTask`** document id(s) for this period (and contract, if scoped) in Mongo — e.g. filter by `periodId` and name `Refactored Sales Calculation` / `Refactored Mechanical Sales Calculation`.

### 2. Worker — run `RoyaltyCalculator` on your machine

Set the batch task id, then:

```bash
cd core/apps/sales-calculator
BATCH_TASK_ID=<batchTask _id> npm run qa:runTaskLocally
```

Or put `BATCH_TASK_ID=…` in `.env`.

### Repeat runs and side effects

The worker updates the batch task and increments period progress when it finishes successfully. Running it again (or running while Fargate runs the same task) can **duplicate side effects** (counts, BQ writes, etc.). Prefer a throwaway period or reset awareness when experimenting.

### npm scripts

| Script | Purpose |
|--------|---------|
| `npm run qa:calculation` | Run [`src/sandbox/runSalesCalculation.js`](src/sandbox/runSalesCalculation.js) |
| `npm run qa:runTaskLocally` | Run [`src/sandbox/runTaskLocally.js`](src/sandbox/runTaskLocally.js) (requires `BATCH_TASK_ID`) |

### Build / package entry

Library consumers use **`dist/`** (`npm run build` runs `tsc`). Sandbox scripts use **`src/`** directly.
