# PrepareCalculationData

## Overview

The `PrepareCalculationData` module has been introduced to simplify the calculation process, make it more scalable and reduce costs.

It's responsible for shipping catalogue data from MongoDB to BigQuery, joining sales data with catalogue metadata, and preparing data chunks for distributed processing.

## Purpose

This module serves as the data preparation layer in the sales calculation pipeline, ensuring that:
- Catalogue data (tracks, releases, works) is properly formatted and shipped to BigQuery
- Sales data is enriched with catalogue metadata and contract rights information
- Data is split into manageable chunks for parallel processing
- Mechanical amounts are calculated and included in the data pipeline

The benefit to this approach is:
- We're no longer holding the catalogue in memory
- Individual batches don't interact with the database (whether it's BQ or MongoDB) as all the data is prepared before the start of the calculation.
- Every batch can process up to 3,000,000. Making this highly scalable as the required resources to process a batch are constant and predictable.

## Architecture

The module operates in two main phases:
1. **Catalogue Shipping**: Transforms and ships catalogue data from MongoDB to BigQuery
2. **Data Joining**: Joins sales data with catalogue data and splits into processing chunks

## Dependencies

### External Libraries
- `level`: Lightweight file-based key-value database for storing the catalogue metadata before it's shipped to BigQuery.

## Main Functions

### 1. shipCatalogue

**Purpose**: 
- Ship catalogue data from MongoDB to BigQuery tables for processing.
- Ship rights data to a separate table, this is rights from the sales, release specific and channels specfic rights
- Calculate mechanical amounts and save them on BQ alongisde the catalogue metadata.

**Parameters**:
- `periodId` (string): The accounting period identifier
- `clientId` (string): The client identifier
- `BQDataset` (string): BigQuery dataset to save the metadata to.

**Process Flow**:

1. **Setup Phase**:
   - Creates a local LevelDB instance for mechanical amount caching
   - Establishes MongoDB connection
   - Initializes BigQuery instances for catalogue and catalogue rights tables
   - Defines schemas for both tables

2. **Track Processing**:
   - Iterates through all tracks for the client
   - Stores tracks in local LevelDB for mechanical calculations
   - Ships track data to BigQuery catalogue table
   - Processes sales returns rights and release-specific rights
   - Calculates and includes mechanical amounts

3. **Release Processing**:
   - Processes releases in batches (1000 concurrent operations)
   - Calculates release mechanical amounts using LevelDB track data
   - Ships release data to BigQuery
   - Processes release sales returns rights

4. **Work Processing**:
   - Processes works with territory group mappings
   - Handles channel-specific sales returns rights
   - Expands territory groups and continents to individual territories
   - Ships work data to BigQuery

5. **Cleanup Phase**:
   - Creates BigQuery tables with 3-day expiration
   - Writes data to BigQuery
   - Closes MongoDB connection
   - Cleans up local LevelDB

**Returns**: Object containing `catalogueTable` and `catalogueRightsTable` names

### 2. joinSalesDataToCatalogueData

**Purpose**: Joins sales data with catalogue data and splits into chunks to be picked up by fargate instances.

**Parameters**:
- `periodId` (string): The accounting period identifier
- `clientId` (string): The client identifier
- `query` (object): BigQuery filter query (comes from the processor from the period controller)
- `contractIds` (array): Array of contract IDs to process (can be an array of IDs when calculating a period, or a single ID when calculating a statement)
- `catalogueTable` (string): Name of the temporary table the catalogue is stored.
- `catalogueRightsTable` (string): Name of the temporary table the catalogue righs are stored
- `BQDataset` (string): BigQuery dataset name where the temporary tables are stored
- `bucketName` (string): Google Cloud Storage bucket name where to export the calculation data to be picked up by the batches
- `folderName` (string): Folder name on GCS
- `isMCPS` (boolean): Whether this is an MCPS calculation. Doesn't do match now, until we refactor the MCPS process.

**Process Flow**:

1. **Data Joining**:
   - Generates complex BigQuery join queries based on client type (Label vs Publisher)
   - Joins sales data with catalogue metadata
   - Applies rights matching logic for different catalogue types
   - Handles contract-specific sales lines

2. **Data Splitting**:
   - Splits combined data into chunks of 3,000,000 lines per contract.
   - Creates chunk identifiers for parallel processing
   - Exports each chunk to Google Cloud Storage as JSON files

3. **File Management**:
   - Tracks chunk files with contract mappings
   - Implements retry logic for failed exports
   - Returns file metadata for batch processing

**Returns**: Object containing `chunkFiles` array with file metadata

### Label Clients Join Query

This query handles the joining of catalogue and rights data to the input sales lines


#### 1. Add previously reported status to the input sales lines

It does this by calling the function `getInputSalesReportedStatusJoinQuery` which returns a join query between the input and output tables.

The purpose of this is to see which lines that are part of this calculation are already present in the output table and to which contracts they've been previously reported. Any lines previously reported to a contract shouldn't be reported to the same contract in future period if the salesFile the line is from keeps being added to multiple periods.

#### 2. Join input sales lines to the catalogue Metadata

This join the sales input lines to the catalogue tables. The output is sales lines that have the metadata of Tracks, Releases and Works they're linked to.

```sql
    SELECT sales.*, ${formatSelectFields(metadataTablesSelectFields)}
    FROM period_sales sales
    LEFT JOIN \`${BQDataset}.${catalogueTable}\` release_catalogue
    ON sales.releaseId = release_catalogue.releaseId
    LEFT JOIN \`${BQDataset}.${catalogueTable}\` track_catalogue
    ON sales.trackId = track_catalogue.trackId
    LEFT JOIN \`${BQDataset}.${catalogueTable}\` work_catalogue
    ON sales.workId = work_catalogue.workId
    WHERE sales.catType IN ('Release', 'Track', 'Work')
```

#### 3. Add contract rights to Release sales

This query joins the sales lines of CatType Release to the contract rights tables.

The output is sales lines that have the contractId they should report to and the percentage they should be reported at.

```sql
release_sales_with_rights AS (
    SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
    FROM populated_catalogue_sales sales
    JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
    ON sales.releaseId = rights.releaseId AND rights.catalogueType = 'release' AND sales.catType = 'Release'
),
```

#### 4 Add rights to Track sales

This need to be done in two stages as Tracks in addition to having regular sales rights, also have release specific rights.

If a line matches the specific term conditions, we need to map it to the specific term and only fallback to the general terms if no specific terms found.

This is achieved by this two stage query:

- The first query matches to specific rights first

```sql
SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
FROM populated_catalogue_sales sales
JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
ON sales.trackId = rights.trackId AND sales.releaseId = rights.releaseId AND rights.rightType = 'release_specific' AND rights.catalogueType = 'track' AND sales.catType = 'Track'
```

- The second query falls back to genric terms when no specific terms are found by excluding the result of the first query from the second.

```sql
SELECT sales.*, ${formatSelectFields(populatedRightsSelectFields)}
FROM populated_catalogue_sales sales
JOIN \`${BQDataset}.${catalogueRightsTable}\` rights
ON sales.trackId = rights.trackId AND rights.rightType = 'sales' AND rights.catalogueType = 'track' AND sales.catType = 'Track'
WHERE
    -- Fallback only if no release specific match exists for this sales line
    NOT EXISTS (
        SELECT 1
        FROM \`${BQDataset}.${catalogueRightsTable}\` sub_rights
        WHERE sub_rights.trackId = sales.trackId
        AND sub_rights.releaseId = sales.releaseId
        AND sub_rights.rightType = 'release_specific'
        AND sub_rights.catalogueType = 'track'
        AND sales.catType = 'Track'
    )
```

It's important the `NOT EXISTS` query conditions match the specific terms query

#### 5. Populate lines linked directly to a contractId instead of a releaseId or trackId

```sql
SELECT sales.*, ${formatSelectFields(populatedContractSelectFields)}
FROM period_sales sales
LEFT JOIN \`${BQDataset}.${catalogueTable}\` release_catalogue
ON sales.releaseId = release_catalogue.releaseId
LEFT JOIN \`${BQDataset}.${catalogueTable}\` track_catalogue
ON sales.trackId = track_catalogue.trackId
LEFT JOIN \`${BQDataset}.${catalogueTable}\` work_catalogue
ON sales.workId = work_catalogue.workId
WHERE sales.contractId IS NOT NULL AND sales.contractId IN UNNEST(@contractIds)
```

We need to make sure we're only matching to contractIds part of this period, hence the `sales.contractId IN UNNEST(@contractIds)`

### 5. Final stage, combine the output of the above steps using a UNION

```sql
SELECT * FROM release_sales_with_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
UNION ALL
SELECT * FROM track_sales_with_release_specific_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
UNION ALL
SELECT * FROM track_sales_with_sales_rights WHERE shipped_rights_contractId IN UNNEST(@contractIds) AND (contractId IS NULL OR (contractId IS NOT NULL AND shipped_rights_contractId != contractId))
UNION ALL
SELECT * FROM contract_sales WHERE shipped_rights_contractId IN UNNEST(@contractIds)
```

Something important here is to make sure is make sure the `shipped_rights_contractId != contractId` on the lines.

This is to make sure we handle this scenario:

- Line is of CatType Track.
- Line is linked to a Track (trackId on the line)
- Track has Contract A in the sales rights
- Line is also linked to Contract A (contractId on the line)

The example line is going to be double reported to Contract A:

- When populating shipped_rights_contractId in the join query
- When getting sales with a contractId

If a line is linked directly to a contractId, we want to skip the sales rights on the track and report based on the contract terms instead. 

This is what `shipped_rights_contractId != contractId` does. If a line is reported twice to the same contract, we want to use the percentage from the contract terms instead of the one coming from the join query.

### Publisher Clients Join Query

This is similar the Label query, except it only looks at works and contract sales.

An added complexity when joining on channel specific rights is, unlike release specific rights, a line could match multiple channel specific rights.

Example, a Tack has two channel specific right:

1. Source `Amazon`
2. Territory `FR` and Source `Amazon`

If a line is both from `FR` and `Amazon` we want it to match the most specific term (number 2), instead of reporting to both and ending with double accounting.

This is accomplished by adding an extra condition to the query:

```sql
QUALIFY
ROW_NUMBER() OVER (
    PARTITION BY
    sales.id,
    sales.workId,
    sales.distributionChannel,
    sales.source,
    sales.territory,
    rights.contractId
    ORDER BY
    (IF(rights.distributionChannel IS NOT NULL, 1, 0) +
    IF(rights.source IS NOT NULL, 1, 0) +
    IF(rights.territory IS NOT NULL, 1, 0)) DESC,
    rights.contractId
) = 1
```

What `QUALIFY` does here is weigh the matched lines for a given sales line and work id by how many conditions it matches, each condition adds 1 to the weight and we only return one right, the one with the most matching conditions.

## Helper Functions

### formatSelectFields
Converts field objects to SQL SELECT clause format.

### continentToTerritories
Maps continent names to arrays of territory codes:
- Africa: 54 territory codes
- Americas: 50 territory codes  
- Asia: 49 territory codes
- Europe: 50 territory codes
- Oceania: 25 territory codes

### processRelease
Processes individual release data:
- Calculates mechanical amounts using LevelDB track data
- Ships release data to BigQuery
- Processes release sales returns rights

### deleteLevelDB
Cleans up local LevelDB instance and removes database files.

### getInputSalesReportedStatusJoinQuery
Generates BigQuery join queries for sales data with reported status. This query returns which contracts a line has previously been reported to, so we're not reporting the same lines to the same contract multiple times:
- Supports both MCPS and standard field sets
- Handles different column configurations
- Applies filtering and joins with output tables

### generateRandomString
Creates random strings for unique file naming.

### generateCatalogueToSalesJoinQuery
Generates the join BigQuery query based on client type:

**Label Client Query**:
- Handles Release, Track and Contract sales
- Implements release-specific track rights
- Falls back to general track rights when no release-specific rights exist

**Publisher Client Query**:
- Focuses on Work and Contract sales
- Implements channel-specific rights matching
- Uses QUALIFY clause for most specific right selection
- Handles territory, distribution channel, and source matching for specific channels rights

## Data Schemas

### Catalogue Table Schema
```sql
- title: STRING
- releaseId: STRING
- trackId: STRING
- workId: STRING
- dealerPrice: FLOAT
- priceCategoryDealerPrices: STRING
- mechanicalAmount: STRING
- type: STRING
- version: STRING
- artist: STRING
- label: STRING
- catNo: STRING
- foreignId: STRING
- barcode: STRING
- isrc: STRING
- defaultReleaseId: STRING
- releaseSpecificForeignIds: STRING
- composer: STRING
- identifier: STRING
- iswc: STRING
- tunecode: STRING
```

### Catalogue Rights Table Schema
```sql
- trackId: STRING
- releaseId: STRING
- workId: STRING
- contractId: STRING
- percentage: FLOAT
- distributionChannel: STRING
- source: STRING
- territory: STRING
- rightType: STRING
- catalogueType: STRING
```

## Performance Considerations

### Concurrency Management
- Release processing uses 1000 concurrent operations
- Chunk processing uses 50 concurrent operations
- Implements retry logic with exponential backoff

### Memory Management
- Uses streaming cursors for large datasets
- Implements batch processing for releases
- Local LevelDB for mechanical amount caching
- Automatic cleanup of temporary resources

### Data Volume Handling
- Splits data into 3M line chunks to stay within Fargate limits
- Uses BigQuery streaming for large data transfers
- Implements progress logging for long-running operations

## Error Handling

- Comprehensive error logging with period and operation context
- Retry mechanisms for BigQuery operations
- Graceful cleanup of resources on failure
- Validation of required parameters

## Usage Example

```javascript
const PrepareCalculationData = require('./libs/prepareCalculationData');

// Ship catalogue data
const { catalogueTable, catalogueRightsTable } = await PrepareCalculationData.shipCatalogue({
  periodId: 'period123',
  clientId: 'client456',
  BQDataset: 'my_dataset'
});

// Join sales data with catalogue
const { chunkFiles } = await PrepareCalculationData.joinSalesDataToCatalogueData({
  periodId: 'period123',
  clientId: 'client456',
  query: { /* filter object */ },
  contractIds: ['contract1', 'contract2'],
  catalogueTable,
  catalogueRightsTable,
  BQDataset: 'my_dataset',
  bucketName: 'my-bucket',
  folderName: 'chunks',
  isMCPS: false
});
```

## Integration Points

This module integrates with:
- **Sales Calculator Main**: Called from the main calculation pipeline
- **Royalty Calculator**: Provides prepared data for royalty calculations
- **Batch Task Manager**: Creates chunk files for distributed processing
- **BigQuery**: Primary data warehouse for processing
- **Google Cloud Storage**: File storage for data chunks
- **MongoDB**: Source of catalogue data

## Maintenance Notes

- Tables have 3-day expiration for automatic cleanup
- Local LevelDB instances are automatically cleaned up
- Progress logging helps monitor long-running operations
- Retry logic handles transient BigQuery failures
- Memory usage is optimized through streaming and batching
