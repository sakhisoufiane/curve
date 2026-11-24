require('dotenv').config();
require('../../models/db');
const { ObjectId } = require('mongodb');

const CwrDelivery = require('../../models/cwrDelivery');
const { createSampler } = require('../memProfiler');

const id = process.argv[2];

if (!id) {
  console.error('Usage: node runDeliveryFromIngestionBox.js <cwrDeliveryId>');
  console.error('  Tip: pipe output to a file: node runDeliveryFromIngestionBox.js <id> 2>&1 | tee delivery-profile.txt');
  process.exit(1);
}

const memSampler = createSampler();
const { elapsed, logMem } = memSampler;

function since(startMs) {
  return `${((Date.now() - startMs) / 1000).toFixed(2)}s`;
}

function logPhase(msg) {
  console.log(`[${elapsed()}] [PHASE] ${msg}`);
}

function logSummary(phases) {
  console.log('\nSUMMARY');
  phases.forEach(([label, ms]) => console.log(`  ${label}: ${(ms / 1000).toFixed(2)}s`));
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

memSampler.start();
logMem('startup');
logPhase(`Script started for delivery ID: ${id}`);
logPhase(`Node ${process.version} | PID ${process.pid}`);

(async () => {
  const loadStart = Date.now();
  const cwrDelivery = await CwrDelivery.findById(id);

  if (!cwrDelivery) {
    console.error(`[${elapsed()}] [ERROR] No cwrDelivery found for id: ${id}`);
    memSampler.stop();
    process.exit(1);
  }

  logPhase(
    `CwrDelivery loaded in ${since(loadStart)}` +
    ` | outputFormat=${cwrDelivery.outputFormat}` +
    ` | filterType=${cwrDelivery.filterType}` +
    ` | territory=${cwrDelivery.territory}` +
    ` | workIds.length=${cwrDelivery.workIds?.length ?? 0}` +
    ` | status=${cwrDelivery.status}`,
  );
  logMem('after-load');

  const curveUser = {
    // userId
    id: new ObjectId('67bed5493189bc9b3291db84'),
    clientId: cwrDelivery.clientId,
  };

  const phases = [];
  let deliveryError;

  const deliverStart = Date.now();
  logPhase('deliver() started');
  logMem('before-deliver');

  await new Promise((resolve) => {
    cwrDelivery.deliver(curveUser, (deliverErr) => {
      if (deliverErr) deliveryError = deliverErr;
      resolve();
    });
  });

  const deliverMs = Date.now() - deliverStart;
  phases.push(['Total deliver()', deliverMs]);

  logPhase(`deliver() finished in ${since(deliverStart)}`);
  logMem('after-deliver');

  memSampler.stop();

  if (deliveryError) {
    console.error(`\n[${elapsed()}] [ERROR] Delivery failed: ${deliveryError.message}`);
    console.error(deliveryError.stack);
    logSummary(phases);
    process.exit(1);
  }

  logSummary(phases);
  logPhase(`Delivery completed successfully for id: ${id}`);
  process.exit(0);
})();
