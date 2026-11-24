require('dotenv').config();
require('../../models/db');
const fs = require('fs');

const Statement = require('../../models/statement');
const Client = require('../../models/client');

// CONFIGURATION
const FIX_MODE = process.argv.includes('--fix'); // Pass --fix flag to update invalid dates
const FIX_WITHHOLDING = process.argv.includes('--fix-withholding'); // Fix withholdingTax for specific statements

const fixStatementStringDates = async () => {
  const startTime = Date.now();
  console.log(`Starting at: ${new Date().toISOString()}`);

  // Fix withholding tax for specific statements (separate operation)
  if (FIX_WITHHOLDING) {
    console.log('=== FIXING WITHHOLDING TAX ===');
    const statementsToFix = [
      { contractId: '5e21fd1f5e6ffa04cc82d1d3', name: { $regex: '2025 - H1' } },
      { contractId: '62cd39f847b44b0023e0d283', name: { $regex: '2025 - H1' } },
    ];
    for (const { contractId, name } of statementsToFix) {
      const stmt = await Statement.findOne({ contractId, name }, { _id: 1, name: 1, withholdingTax: 1 }).lean();
      if (!stmt) {
        console.log(`NOT FOUND: Contract ${contractId} - Statement matching ${JSON.stringify(name)}`);
        continue;
      }
      console.log(`Contract ${contractId} - Statement "${stmt.name}": withholdingTax ${stmt.withholdingTax} -> 0`);
      await Statement.updateOne({ _id: stmt._id }, { $set: { withholdingTax: 0 } });
      console.log('  Updated.');
    }
    console.log(`\nFinished at: ${new Date().toISOString()}`);
    process.exit(0);
  }

  console.log(`Mode: ${FIX_MODE ? 'FIX MODE (will update database)' : 'DRY RUN (no changes will be made)'}`);

  const batchSize = 2000;
  let totalStatementsProcessed = 0;
  let statementsWithStringDates = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  const failures = [];
  const problems = []; // Only populated in DRY RUN mode
  const stats = { dateIsString: 0, createdAtIsString: 0, updatedAtIsString: 0 };

  // Get total count for progress estimation
  const totalCount = await Statement.estimatedDocumentCount();
  console.log(`Total statements: ${totalCount.toLocaleString()}`);
  console.log('Scanning ALL statements...');

  let lastId = null;
  let batchNumber = 0;
  let lastProgressLog = 0;
  const PROGRESS_INTERVAL = 100000; // Log progress every 100,000 statements

  while (true) {
    batchNumber++;

    // Build query - NO $type filter, just _id pagination
    const query = lastId ? { _id: { $gt: lastId } } : {};

    // Fetch batch
    const statements = await Statement.find(query, { _id: 1, name: 1, clientId: 1, date: 1, createdAt: 1, updatedAt: 1 })
      .sort({ _id: 1 })
      .limit(batchSize)
      .lean();

    if (statements.length === 0) {
      console.log('\nNo more statements found.');
      break;
    }

    // Collect bulk operations for this batch
    const bulkOps = [];

    // Process batch
    for (const statement of statements) {
      totalStatementsProcessed++;

      // Check if any date field is a string (check in JS, not MongoDB)
      const hasStringDate = typeof statement.date === 'string';
      const hasStringCreatedAt = typeof statement.createdAt === 'string';
      const hasStringUpdatedAt = typeof statement.updatedAt === 'string';

      // Skip if no string dates
      if (!hasStringDate && !hasStringCreatedAt && !hasStringUpdatedAt) {
        continue;
      }

      // Count this statement as having string dates
      statementsWithStringDates++;

      // Track which fields are strings and prepare updates
      const updates = {};
      if (hasStringDate) {
        stats.dateIsString++;
        updates.date = new Date(statement.date);
      }
      if (hasStringCreatedAt) {
        stats.createdAtIsString++;
        updates.createdAt = new Date(statement.createdAt);
      }
      if (hasStringUpdatedAt) {
        stats.updatedAtIsString++;
        updates.updatedAt = new Date(statement.updatedAt);
      }

      if (!FIX_MODE) {
        // DRY RUN - Build problems array
        problems.push({
          statementId: statement._id.toString(),
          statementName: statement.name || null,
          clientId: statement.clientId ? statement.clientId.toString() : null,
          date: statement.date,
          createdAt: statement.createdAt,
          updatedAt: statement.updatedAt,
          wouldUpdate: Object.keys(updates)
        });
      } else if (Object.keys(updates).length > 0) {
        // FIX MODE - Prepare bulk operations
        try {
          // Validate dates before adding to bulk operations
          for (const [field, dateValue] of Object.entries(updates)) {
            if (isNaN(dateValue.getTime())) {
              throw new Error(`Invalid date for field '${field}': ${statement[field]}`);
            }
          }

          // Add to bulk operations
          bulkOps.push({ updateOne: { filter: { _id: statement._id }, update: { $set: updates } } });
        } catch (error) {
          totalFailed++;
          failures.push({ statementId: statement._id.toString(), error: error.message });
        }
      }
    }

    // Execute bulk operations for this batch
    if (FIX_MODE && bulkOps.length > 0) {
      try {
        console.log(`  Executing bulk update for ${bulkOps.length} statements...`);
        const result = await Statement.collection.bulkWrite(bulkOps, { ordered: false });
        totalUpdated += result.modifiedCount;
        console.log(`  Updated ${result.modifiedCount} statements in this batch`);
      } catch (error) {
        console.error(`  Bulk update error: ${error.message}`);
        totalFailed += bulkOps.length;
      }
    }

    lastId = statements[statements.length - 1]._id;

    if (totalStatementsProcessed - lastProgressLog >= PROGRESS_INTERVAL) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = Math.round(totalStatementsProcessed / elapsed);
      const pct = ((totalStatementsProcessed / totalCount) * 100).toFixed(1);
      console.log(`${totalStatementsProcessed.toLocaleString()} scanned (${pct}%) | ${rate}/sec | ${statementsWithStringDates} with string dates`);
      lastProgressLog = totalStatementsProcessed;
    }
  }

  // Get client names (DRY RUN only)
  if (!FIX_MODE && problems.length > 0) {
    console.log('\nLooking up client names...');
    const uniqueClientIds = [...new Set(problems.map(p => p.clientId).filter(id => id !== null))];
    const clients = await Client.find({ _id: { $in: uniqueClientIds } }, { _id: 1, name: 1 }).lean();
    const clientMap = clients.reduce((map, client) => {
      map[client._id.toString()] = client.name;
      return map;
    }, {});

    problems.forEach(problem => {
      problem.clientName = problem.clientId ? (clientMap[problem.clientId] || 'Unknown Client') : null;
    });
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = ((duration % 60000) / 1000).toFixed(2);

  console.log('\n=== RESULTS ===');
  console.log('Total statements scanned:', totalStatementsProcessed);
  console.log('Statements with string dates found:', statementsWithStringDates);

  if (statementsWithStringDates === 0) {
    console.log('No statements found with string date fields.');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log(`Total execution time: ${minutes}m ${seconds}s`);
    process.exit(0);
  }

  console.log('\nBreakdown:');
  console.log('  - date as string:', stats.dateIsString);
  console.log('  - createdAt as string:', stats.createdAtIsString);
  console.log('  - updatedAt as string:', stats.updatedAtIsString);

  if (FIX_MODE) {
    console.log('\n=== UPDATE SUMMARY ===');
    console.log('Successfully updated:', totalUpdated);
    console.log('Failed updates:', totalFailed);

    if (failures.length > 0) {
      const failuresFile = 'statement-update-failures.json';
      fs.writeFileSync(failuresFile, JSON.stringify(failures, null, 2));
      console.log(`Failures written to: ${failuresFile}`);
    }
  } else {
    console.log('\n=== DRY RUN - NO CHANGES MADE ===');
    console.log('Records that would be updated:', problems.length);

    const outputFile = 'statement.json';
    fs.writeFileSync(outputFile, JSON.stringify(problems, null, 2));
    console.log(`Details written to: ${outputFile}`);
  }

  console.log(`\nFinished at: ${new Date().toISOString()}`);
  console.log(`Total execution time: ${minutes}m ${seconds}s`);

  process.exit(0);
};

fixStatementStringDates().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
