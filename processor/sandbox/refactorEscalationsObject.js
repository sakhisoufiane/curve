/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
require('../models/db');
const { eachLimit, eachOfLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const Client = require('../models/client');
const Contract = require('../models/contract');
const Period = require('../models/period');
const Escalation = require('../models/escalation');

const clientId = null;

// Script to refactor the escalations object against the period into the new Escalation collection format

const processClientEscalations = async ({ client }) => {
  logger.debug(`Processing client ${client.name}`);
  // 1. Store original escalations against the contracts
  const contracts = await Contract.find({ clientId: client._id.toString() });
  let contractsWithEscalations = 0;
  await eachLimit(contracts, 10, async (contract) => {
    if (contract.escalationTracking && Object.keys(contract.escalationTracking).length) {
      contractsWithEscalations += 1;
      for (const tracker in contract.escalationTracking) {
        contract.escalationTracking[tracker].startingUnits = contract.escalationTracking[tracker].units || 0;
        contract.escalationTracking[tracker].startingGross = contract.escalationTracking[tracker].gross || 0;
        contract.escalationTracking[tracker].startingNet = contract.escalationTracking[tracker].net || 0;
        contract.escalationTracking[tracker].originalUnits = contract.escalationTracking[tracker].units || 0;
        contract.escalationTracking[tracker].originalGross = contract.escalationTracking[tracker].gross || 0;
        contract.escalationTracking[tracker].originalNet = contract.escalationTracking[tracker].net || 0;
      }
      await Contract.findByIdAndUpdate(contract._id, { $set: { escalationTracking: contract.escalationTracking } });
    }
  });
  logger.debug(`Client has ${contractsWithEscalations} contracts with escalations`);

  if (contractsWithEscalations) {
    // 2. Process periods by accounting period type
    const accountingPeriodTypes = ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'];
    for (const accountingPeriodType of accountingPeriodTypes) { await refactorPeriods({ clientId: client._id.toString(), accountingPeriodType, contracts }); }

    // 3. Check client's contracts to make sure the pre and post refactoring escalations match
    await checkEscalationsMatch({ clientId: client._id.toString() });

    logger.debug(`Done processing client ${client.name}`);

    fs.appendFileSync('processed_clients', `${client._id.toString()}\n`);
  }
};

const refactorPeriods = async ({ clientId, accountingPeriodType, contracts }) => {
  logger.debug(`${clientId} Getting periods for accounting period: ${accountingPeriodType}`);
  // Get periods matching the accounting period type
  const periods = await Period.find({ clientId, accountingPeriodType, contractType: { $ne: 'Mechanical' } }).select('name escalationStartingFigures clientId startDate endDate').sort({ startDate: 1 });
  logger.debug(`${clientId} Periods found: ${periods.length}`);

  if (!periods.length) return;

  const contractsStartingEscalations = {};
  // For each period, get how many escalations have been added by comparing starting figures of period n to period n+1
  for (let i = 0; i < periods.length; i += 1) {
    const period = periods[i];
    // The first time a contract appears on a period would have had the escalation tracker's initial figures included in the period's escalations
    // we need to keep this and save against the contract later
    for (const escalationStartingFigure of period.escalationStartingFigures) {
      if (escalationStartingFigure.escalationTracking && Object.keys(escalationStartingFigure.escalationTracking).length) {
        if (!contractsStartingEscalations[escalationStartingFigure.contractId]) {
          contractsStartingEscalations[escalationStartingFigure.contractId] = escalationStartingFigure.escalationTracking;
        } else {
          // Check if any new trackers have been added to the period and add them to the starting escalations if they're not there
          for (const tracker in escalationStartingFigure.escalationTracking) {
            if (!contractsStartingEscalations[escalationStartingFigure.contractId][tracker]) {
              contractsStartingEscalations[escalationStartingFigure.contractId][tracker] = escalationStartingFigure.escalationTracking[tracker];
            }
          }
        }
      }
    }

    // If the period isn't the most recent one, get the total escalations added by this period by comparing its starting figures to the next one
    if (periods[i + 1]) {
      const escalations = [];
      for (const escalationStartingFigures of period.escalationStartingFigures) {
        const { contractId } = escalationStartingFigures;
        const contractEscalations = {
          clientId: period.clientId,
          periodId: period._id,
          contractId,
          startDate: period.startDate,
          endDate: period.endDate,
          trackers: {},
        };
        const nextContractEscalations = periods[i + 1].escalationStartingFigures.find((nextEscalationStartingFigures) => nextEscalationStartingFigures.contractId === contractId);

        for (const tracker in escalationStartingFigures.escalationTracking) {
          if (nextContractEscalations?.escalationTracking?.[tracker] && trackerExistsOnContract({ contracts, contractId, tracker })) {
            const escalation = {
              units: (nextContractEscalations.escalationTracking[tracker].units || 0) - (escalationStartingFigures.escalationTracking[tracker].units || 0),
              gross: (nextContractEscalations.escalationTracking[tracker].gross || 0) - (escalationStartingFigures.escalationTracking[tracker].gross || 0),
              net: (nextContractEscalations.escalationTracking[tracker].net || 0) - (escalationStartingFigures.escalationTracking[tracker].net || 0),
            };
            contractEscalations.trackers[tracker] = escalation;
          }
        }
        if (Object.keys(contractEscalations.trackers).length) { escalations.push(contractEscalations); }
      }
      logger.debug('-'.repeat(process.stdout.columns - 20));
      logger.debug(period.name);
      logger.debug(escalations);
      // Save escalations.
      for (const escalation of escalations) {
        await new Escalation(escalation).save();
      }
    } else {
      // If it's the most recent period, get the escalations added by comparing the starting figures to what's saved against the contract
      const escalations = [];
      await eachLimit(period.escalationStartingFigures, 20, async (escalationStartingFigures) => {
        const { contractId } = escalationStartingFigures;
        const contractEscalations = {
          clientId: period.clientId,
          periodId: period._id,
          contractId,
          startDate: period.startDate,
          endDate: period.endDate,
          trackers: {},
        };
        const contract = contracts.find((contract) => contract._id.toString() === contractId);
        for (const tracker in escalationStartingFigures.escalationTracking) {
          if (contract?.escalationTracking?.[tracker] && trackerExistsOnContract({ contracts, contractId, tracker })) {
            const escalation = {
              units: (contract.escalationTracking[tracker].units || 0) - (escalationStartingFigures.escalationTracking[tracker].units || 0),
              gross: (contract.escalationTracking[tracker].gross || 0) - (escalationStartingFigures.escalationTracking[tracker].gross || 0),
              net: (contract.escalationTracking[tracker].net || 0) - (escalationStartingFigures.escalationTracking[tracker].net || 0),
            };
            contractEscalations.trackers[tracker] = escalation;
          }
        }
        if (Object.keys(contractEscalations.trackers).length) {
          escalations.push(contractEscalations);
        }
      });

      logger.debug('-'.repeat(process.stdout.columns - 20));
      logger.debug(period.name);
      logger.debug(escalations);

      // Save escalations.
      for (const escalation of escalations) {
        await new Escalation(escalation).save();
      }
    }
  }

  // Loop through the contracts in contractsStartingEscalations and save the starting figures against the contract
  logger.debug('Setting contract starting figures');
  logger.debug('-'.repeat(process.stdout.columns - 20));
  await eachOfLimit(contractsStartingEscalations, 20, async (trackers, contractId) => {
    const contract = contracts.find((contract) => contract._id.toString() === contractId);
    if (contract) {
      for (const tracker in contractsStartingEscalations[contractId]) {
        contractsStartingEscalations[contractId][tracker].startingUnits = contractsStartingEscalations[contractId][tracker].units || 0;
        contractsStartingEscalations[contractId][tracker].startingGross = contractsStartingEscalations[contractId][tracker].gross || 0;
        contractsStartingEscalations[contractId][tracker].startingNet = contractsStartingEscalations[contractId][tracker].net || 0;
        contractsStartingEscalations[contractId][tracker].originalUnits = contract.escalationTracking?.[tracker]?.originalUnits || 0;
        contractsStartingEscalations[contractId][tracker].originalGross = contract.escalationTracking?.[tracker]?.originalGross || 0;
        contractsStartingEscalations[contractId][tracker].originalNet = contract.escalationTracking?.[tracker]?.originalNet || 0;
      }

      // Save starting figures against the contract
      if (contractsStartingEscalations[contractId] && Object.keys(contractsStartingEscalations[contractId]).length) {
        logger.debug(`Contract ID: ${contractId}`);
        // Clean contractsStartingEscalations up to only restore escalations that were originally on the contracts and not the ones found in the periods
        const escalationTracking = {};
        for (const tracker in contractsStartingEscalations[contractId]) {
          if (trackerExistsOnContract({ contracts, contractId, tracker })) {
            escalationTracking[tracker] = contractsStartingEscalations[contractId][tracker];
          }
        }
        logger.debug(contractsStartingEscalations[contractId]);
        await Contract.findByIdAndUpdate(contractId, { $set: { escalationTracking } });
      }
    }
  });
  logger.debug('Done setting contract starting figures');
};

const trackerExistsOnContract = ({ contracts, contractId, tracker }) => {
  const contract = contracts.find((contract) => contract._id.toString() === contractId);
  return !!contract?.escalationTracking?.[tracker];
};

const checkEscalationsMatch = async ({ clientId }) => {
  const contractsNotMatching = [];
  const contracts = await Contract.find({ clientId }).select('escalationTracking');
  await eachLimit(contracts, 20, async (contract) => {
    if (!contract.escalationTracking) return contract;

    const escalations = await Escalation.find({ clientId, contractId: contract._id });
    // For each escalation tracker, get the total figures from the escalations
    for (const tracker in contract.escalationTracking) {
      if (contract.escalationTracking[tracker]) {
        const contractTracker = {
          contractId: contract._id,
          tracker,
          units: contract.escalationTracking[tracker].startingUnits,
          gross: contract.escalationTracking[tracker].startingGross,
          net: contract.escalationTracking[tracker].startingNet,
          originalUnits: contract.escalationTracking[tracker].originalUnits,
          originalGross: contract.escalationTracking[tracker].originalGross,
          originalNet: contract.escalationTracking[tracker].originalNet,
        };
        for (const escalation of escalations) {
          if (escalation.trackers[tracker]) {
            contractTracker.units += escalation.trackers[tracker].units || 0;
            contractTracker.gross += escalation.trackers[tracker].gross || 0;
            contractTracker.net += escalation.trackers[tracker].net || 0;
          }
        }

        try {
          if (contractTracker.units?.toFixed(2) !== contractTracker.originalUnits?.toFixed(2) || contractTracker.gross?.toFixed(2) !== contractTracker.originalGross?.toFixed(2) || contractTracker.net?.toFixed(2) !== contractTracker.originalNet?.toFixed(2)) {
            contractsNotMatching.push(contractTracker);
          }
        } catch (e) {
          logger.error(e);
        }
      }
    }
  });

  if (contractsNotMatching.length) {
    logger.error(contractsNotMatching);
    fs.writeFileSync(`${clientId}_contracts_failing.json`, JSON.stringify(contractsNotMatching));
    logger.error(`Client ${clientId} - ${contractsNotMatching.length} Contract escalations don't match post refactoring`);
  }
};

(async () => {
  const clientsFilter = clientId ? { _id: clientId } : {};
  if (fs.existsSync('processed_clients') && !clientId) {
    const alreadyProcessedClients = fs.readFileSync('processed_clients', 'utf8');
    const skipClients = alreadyProcessedClients.split('\n');
    logger.debug(`Skipping ${skipClients.length} clients already processed`);
    clientsFilter._id = { $nin: skipClients };
  }

  const clients = await Client.find(clientsFilter).select('name');
  await eachLimit(clients, 1, async (client) => { await processClientEscalations({ client }); });
  logger.debug('Done processing all clients.');
  process.exit(0);
})();
