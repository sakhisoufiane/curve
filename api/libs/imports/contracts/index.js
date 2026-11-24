/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-nested-ternary */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { eachLimit } = require('async');
const moment = require('moment');
const Notification = require('../../../models/notification');
const Client = require('../../../models/client');
const Payee = require('../../../models/payee');
const Company = require('../../../models/company');
const Statement = require('../../../models/statement');
const Contract = require('../../../models/contract');
const importXlsx = require('../../importXlsx');
const config = require('../../../config.json');
const overwriteBlanksWithDefault = require('../../overwriteBlanks');
const ContractController = require('../../../controllers/contracts/contract');
const ContractTermGroup = require('../../../models/contractTermGroup');
const TerritoryGroup = require('../../../models/territoryGroup');

const ContractsImporter = this;

ContractsImporter.import = async ({ file, contractTemplateType, curveUser, overwriteBlanks }) => {
  logger.debug('Importing releases');
  logger.debug({ file }, { curveUser });
  try {
    const client = await Client.findById(curveUser.clientId);
    if (!client) throw Error('Couldn\'t find a client matching the ID ', curveUser.clientId);
    // Read the data from the excel file
    const { contracts, payees, sales, deductions, mechanicals, mechanicalTerms, withholdingTax, costs, reserves, crossContracts, autoPaymentConditions, escalationTrackers, escalationEquivalents } = await getDataFromExcel({ file, client, contractTemplateType });

    // Ingest the data
    const { errors, count, importedContracts } = await ingestData({ contracts, payees, sales, deductions, mechanicals, mechanicalTerms, withholdingTax, costs, reserves, crossContracts, autoPaymentConditions, escalationTrackers, escalationEquivalents, client, contractTemplateType, overwriteBlanks, file, curveUser });
    // Save releases
    if (errors?.length) {
      logger.error(errors);
      // Send errors email
      await generateErrorNotification({ error: errors, file, curveUser });
    } else if (importedContracts?.length) {
      await saveContracts({ importedContracts, count, curveUser, client, file });
    }
    // Delete import files
    if (file?.path && fs.existsSync(file.path)) { fs.unlinkSync(file.path); }
  } catch (error) {
    logger.error(error);
    await generateErrorNotification({ error: error.message, file, curveUser });
  }
};

const ingestData = async ({ contracts, payees, sales, deductions, mechanicals, mechanicalTerms, withholdingTax, costs, reserves, crossContracts, autoPaymentConditions, escalationTrackers, escalationEquivalents, client, contractTemplateType, overwriteBlanks }) => {
  if (Object.prototype.toString.call(contracts) !== '[object Array]') { throw Error('Release : Data must be an Array'); }
  // Validate step to be added here
  let errors = [];
  let count = 0;
  // Validate data before importing
  const validationErrors = await validateImportData({ contracts, escalationTrackers, escalationEquivalents, sales, costs, configurations: client.configurations, clientId: client._id.toString() });
  // If errors, stop the import process and return the errors to the user
  if (validationErrors?.length) { return { errors: validationErrors }; }

  const importedContracts = [];
  for (const contract of contracts) {
    const { errors: singleContractErrors, contract: importedContract } = await ingestSingleContract({ data: contract, importedPayees: payees, sales, deductions, mechanicals, mechanicalTerms, withholdingTax, costs, reserves, crossContracts, autoPaymentConditions, escalationTrackers, escalationEquivalents, client, contractTemplateType, overwriteBlanks });

    if (singleContractErrors?.length) { errors = [...errors, ...singleContractErrors]; }

    if (importedContract) {
      count += 1;
      importedContracts.push(importedContract);
    }
  }

  errors = errors.filter((value, index, self) => self.indexOf(value) === index).filter(Boolean);

  return { errors, count, importedContracts };
};

const validateImportData = async ({ contracts, escalationTrackers, escalationEquivalents, sales, costs, configurations, clientId }) => {
  const errors = [];
  // Validate Escalation Trackers
  // We need to validate that the contract exists in the database and that the tracker has a name
  const dbContracts = {};
  await eachLimit(escalationTrackers, 50, async (tracker) => {
    if (tracker?.contractName) {
      if (!dbContracts[tracker.contractName]) {
        const existingContract = await Contract.findOne({ clientId, name: tracker.contractName });
        if (!existingContract) {
          const newContract = contracts.find((contract) => contract.name === tracker.contractName);
          if (!newContract) {
            errors.push(`Line ${tracker.line_index + 3}: Escalation Trackers: Could not find contract with the name ${tracker.contractName}`);
          }
        } else {
          dbContracts[tracker.contractName] = existingContract;
        }
      }

      // Make sure we're not updating a tracker that's been part of a calculation
      if (dbContracts[tracker.contractName]) {
        await ContractController.getEscalations({ contract: dbContracts[tracker.contractName] });
        if (dbContracts[tracker.contractName]?.escalationTracking?.[tracker]?.escalationsAddedByPeriods) {
          errors.push(`Line ${tracker.line_index + 3}: Escalation Trackers: The escalation tracker ${tracker.name} has been part of a period and cannot be updated`);
        }
      }
    } else {
      errors.push(`Line ${tracker.line_index + 3}: Escalation Trackers: Contract name is required`);
    }

    if (!tracker.name) {
      errors.push(`Line ${tracker.line_index + 3}: Escalation Trackers: Tracker name is required`);
    }
  });

  // Validate escalation equivalents
  await eachLimit(escalationEquivalents, 50, async (equivalent) => {
    if (equivalent?.contractName) {
      if (!dbContracts[equivalent.contractName]) {
        const existingContract = await Contract.findOne({ clientId, name: equivalent.contractName });
        if (!existingContract) {
          const newContract = contracts.find((contract) => contract.name === equivalent.contractName);
          if (!newContract) {
            errors.push(`Line ${equivalent.line_index + 3}: Escalation Equivalents: Could not find contract with the name ${equivalent.contractName}`);
          }
        } else {
          dbContracts[equivalent.contractName] = existingContract;
        }
      }
    } else {
      errors.push(`Line ${equivalent.line_index + 3}: Escalation Equivalents: Contract name is required`);
    }

    if (!equivalent.configuration) {
      errors.push(`Line ${equivalent.line_index + 3}: Escalation Equivalents: Configuration is required`);
    }

    if (!equivalent.amount && equivalent.amount !== 0) {
      errors.push(`Line ${equivalent.line_index + 3}: Escalation Equivalents: Amount is required`);
    }

    if (!configurations.includes(equivalent.configuration) && equivalent.configuration !== 'All') {
      errors.push(`Line ${equivalent.line_index + 3}: Escalation Equivalents: Configuration doesn't match list`);
    }
  });

  await eachLimit(sales, 50, async (sale) => {
    if (sale?.contractName) {
      if (!dbContracts[sale.contractName]) {
        const existingContract = await Contract.findOne({ clientId, name: sale.contractName });
        if (!existingContract) {
          const newContract = contracts.find((contract) => contract.name === sale.contractName);
          if (!newContract) {
            errors.push(`Line ${sale.line_index + 3}: Sales Terms: Could not find contract with the name ${sale.contractName}`);
          }
        } else {
          dbContracts[sale.contractName] = existingContract;
        }
      }
    } else {
      errors.push(`Line ${sale.line_index + 3}: Sales Terms: Contract name is required`);
    }

    for (const escalation of sale.escalations) {
      for (const condition of escalation.conditions) {
        if (!condition.escalationTracker) {
          errors.push(`Line ${sale.line_index + 3}: Sales Terms: Escalation Tracker is required`);
        }

        if (condition.escalationTracker && !['Sale Date', 'Reporting Date'].includes(condition.escalationTracker)) {
          let trackerExists = false;
          escalationTrackers.forEach((tracker) => {
            if (tracker.contractName === sale.contractName && tracker.name === condition.escalationTracker) {
              trackerExists = true;
            }
          });

          if (!trackerExists) {
            errors.push(`Line ${sale.line_index + 3}: Sales Terms: Escalation Trackers doesn't match list of trackers on the contract`);
          }
        }

        if (condition.escalationTracker && ['Sale Date', 'Reporting Date'].includes(condition.escalationTracker) && condition.thresholdType) {
          errors.push(`Line ${sale.line_index + 3}: Sales Terms: Escalation Threshold Type can only be used with custom escalation trackers`);
        }

        if (condition.when && !['Greater Than', 'Less Than'].includes(condition.when)) {
          errors.push(`Line ${sale.line_index + 3}: Sales Terms: 'When' can only be 'Greater Than' or 'Less Than'`);
        }
      }
    }
  });

  await eachLimit(costs, 50, async (cost) => {
    if (cost?.contractName) {
      if (!dbContracts[cost.contractName]) {
        const existingContract = await Contract.findOne({ clientId, name: cost.contractName });
        if (!existingContract) {
          const newContract = contracts.find((contract) => contract.name === cost.contractName);
          if (!newContract) {
            errors.push(`Line ${cost.line_index + 3}: Costs Terms: Could not find contract with the name ${cost.contractName}`);
          }
        } else {
          dbContracts[cost.contractName] = existingContract;
        }
      }
    } else {
      errors.push(`Line ${cost.line_index + 3}: Costs Terms: Contract name is required`);
    }

    for (const escalation of cost.escalations) {
      for (const condition of escalation.conditions) {
        if (!condition.escalationTracker) {
          errors.push(`Line ${cost.line_index + 3}: Costs Terms: Escalation Tracker is required`);
        }

        if (condition.escalationTracker && !['Cost Date', 'Reporting Date'].includes(condition.escalationTracker)) {
          let trackerExists = false;
          escalationTrackers.forEach((tracker) => {
            if (tracker.contractName === cost.contractName && tracker.name === condition.escalationTracker) {
              trackerExists = true;
            }
          });

          if (!trackerExists) {
            errors.push(`Line ${cost.line_index + 3}: Costs Terms: Escalation Trackers doesn't match list of trackers on the contract`);
          }
        }

        if (condition.thresholdType && ['Cost Date', 'Reporting Date'].includes(condition.escalationTracker) && condition.thresholdType) {
          errors.push(`Line ${cost.line_index + 3}: Costs Terms: Escalation Threshold Type can only be used with custom escalation trackers`);
        }

        if (condition.when && !['Greater Than', 'Less Than'].includes(condition.when)) {
          errors.push(`Line ${cost.line_index + 3}: Costs Terms: 'When' can only be 'Greater Than' or 'Less Than'`);
        }
      }
    }
  });

  return errors;
};

const ingestSingleContract = async ({ data, importedPayees, sales, deductions, mechanicals, mechanicalTerms, withholdingTax, costs, reserves, crossContracts, autoPaymentConditions, escalationTrackers, escalationEquivalents, client, contractTemplateType, overwriteBlanks }) => {
  const clientId = client._id.toString();
  const index = data.line_index;
  const { features, clientType } = client;
  const contractTermMappings = {};
  if (!isObjectPopulated(data) || (!data?.name && !data?.type && !data?.foreignId)) return {};
  let query = null;

  if (ObjectId.isValid(data._id)) {
    query = { _id: new ObjectId(data._id), clientId };
  } else if (data.name) {
    query = { clientId, name: data.name, contractType: contractTemplateType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' } };
  } else {
    return { error: 'Name must be passed' };
  }

  let errors = [];

  const foundContract = await Contract.findOne(query);
  const contract = foundContract || new Contract();
  contract.clientId = clientId;
  contract.contractType = (contractTemplateType === 'Mechanical') ? 'Mechanical' : 'Artist';
  contract.name = data.name;

  contract.foreignId = overwriteBlanksWithDefault(contract.foreignId, data.foreignId, overwriteBlanks, null);
  contract.projectId = overwriteBlanksWithDefault(contract.projectId, data.projectId, overwriteBlanks, null);
  contract.active = overwriteBlanksWithDefault(contract.active, data.active, overwriteBlanks, false, 'boolean');
  contract.startDate = overwriteBlanksWithDefault(contract.startDate, data.startDate, overwriteBlanks, null);
  contract.endDate = overwriteBlanksWithDefault(contract.endDate, data.endDate, overwriteBlanks, null);
  contract.minPayout = overwriteBlanksWithDefault(contract.minPayout, data.minPayout, overwriteBlanks, 0, 'number');
  contract.autoPayment = overwriteBlanksWithDefault(contract.autoPayment, data.autoPayment, overwriteBlanks, false, 'boolean');
  contract.selfBilling = overwriteBlanksWithDefault(contract.selfBilling, data.selfBilling, overwriteBlanks, false, 'boolean');
  contract.deductWithholding = overwriteBlanksWithDefault(contract.deductWithholding, data.deductWithholding, overwriteBlanks, false, 'boolean');
  contract.summaryContractTotals = overwriteBlanksWithDefault(contract.summaryContractTotals, data.summaryContractTotals, overwriteBlanks, false, 'boolean');
  contract.notes = overwriteBlanksWithDefault(contract.notes, data.notes, overwriteBlanks, null);
  contract.retentionPeriodEndDate = overwriteBlanksWithDefault(contract.retentionPeriodEndDate, data.retentionPeriodEndDate, overwriteBlanks, null);
  contract.collectionEndDate = overwriteBlanksWithDefault(contract.collectionEndDate, data.collectionEndDate, overwriteBlanks, null);

  if (data.accountingPeriod || overwriteBlanks) {
    if (client.accountingPeriodTypes.includes(data.accountingPeriod) || ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].includes(data.accountingPeriod) || data.accountingPeriod === '' || !data.accountingPeriod) {
      contract.accountingPeriod = data.accountingPeriod;
    } else {
      errors.push(`Overview Line ${index + 3}: Accounting Period doesn't match list`);
    }
  }
  if (data.currency || overwriteBlanks) {
    if (overwriteBlanks && (!data.currency || data.currency === '')) {
      contract.currency = 'Home Currency';
    } else if (['Home Currency', client.currency2, client.currency3, client.currency4].filter(Boolean).includes(data.currency)) {
      contract.currency = data.currency;
    } else {
      errors.push(`Overview Line ${index + 3}: Currency doesn't match Home Currency or one of your selected multicurrencies`);
    }
  }
  // variations depending on template type
  if (contractTemplateType === 'Standard' || contractTemplateType === 'Publisher') {
    if ((data.aliases && data.aliases.length > 0) || overwriteBlanks) { contract.aliases = data.aliases; }
    contract.profitSharePercentage = overwriteBlanksWithDefault(contract.profitSharePercentage, data.profitSharePercentage, overwriteBlanks, 0, 'number');
    contract.feesInvoice = overwriteBlanksWithDefault(contract.feesInvoice, data.feesInvoice, overwriteBlanks, false, 'boolean');
  }
  if (contractTemplateType === 'Standard') {
    // type only applies to Standard contracts
    if (data.type || overwriteBlanks) {
      if (['Profit Share - Classic', 'Royalty', 'Profit Share - Flexible'].includes(data.type) || data.type === '' || !data.type) {
        contract.type = data.type;
        if (contract.type === 'Profit Share - Classic') { contract.type = 'Profit Share'; }
      } else {
        errors.push(`Overview Line ${index + 3}: Type doesn't match list`);
      }
    }
  }
  if (contractTemplateType === 'Standard' || contractTemplateType === 'Mechanical') {
    if (Array.isArray(data.labels) && data.labels.length !== 0) {
      contract.labels = data.labels.filter((value, index, self) => self.indexOf(value) === index);
    } else if (overwriteBlanks) {
      contract.labels = data.labels;
    }
    if (data.reserveBasis || overwriteBlanks) {
      if (['Pre-Calculation', 'Post-Calculation'].includes(data.reserveBasis) || data.reserveBasis === '' || !data.reserveBasis) {
        contract.reserveBasis = data.reserveBasis;
      } else {
        errors.push(`Overview Line ${index + 3}: Reserve Basis doesn't match list`);
      }
    }
  }

  if (contractTemplateType === 'Mechanical') {
    contract.currency = overwriteBlanksWithDefault(contract.currency, data.currency, overwriteBlanks, null);
    contract.licenseNo = overwriteBlanksWithDefault(contract.licenseNo, data.licenseNo, overwriteBlanks, null);
  }

  const statementCount = await Statement.countDocuments({ clientId, contractId: contract._id.toString() });

  if (foundContract && (data.openingBalance || data.openingBalance === 0) && (contract.openingBalance || contract.openingBalance === 0) && (data.openingBalance !== contract.openingBalance) && statementCount > 0) {
    errors.push(`Overview Line ${index + 3}: Opening balance cannot be updated via import as this contract is associated with a statement. You can only do this manually via the Contract Edit screen`);
  } else {
    contract.openingBalance = overwriteBlanksWithDefault(contract.openingBalance, data.openingBalance, overwriteBlanks, contract.openingBalance || 0, 'number');
  }

  processCategories({ data, contract, client, index, overwriteBlanks, errors });

  if (features.payeeBalances) {
    if (['Never', 'Always', 'When Positive'].includes(data.payeeBalanceCondition)) { contract.payeeBalanceCondition = data.payeeBalanceCondition; }

    const { payeeErrors, payees } = await ContractController.processPayeeBalances({ contract, importedPayees, overwriteBlanks, client, index });
    if (payeeErrors?.length) {
      errors = errors.concat(payeeErrors);
    } else {
      contract.payees = payees;
    }
  } else {
    await processPayee({ data, contract, client, index, overwriteBlanks, errors });
  }

  await processCompany({ data, contract, client, index, overwriteBlanks, errors });

  await processContractTermGroups({ contractTermMappings, clientId });

  // Import escalation trackers:
  // We shouldn't just clear the existing escalations and replace them with the ones in the part, we risk removing trackers used by periods
  // Instead we should loop through the escalations and add them individually to the existing ones, adding new ones and updating existing ones.
  const countractHasTrackers = escalationTrackers.find((tracker) => tracker.contractName === contract.name);
  if (countractHasTrackers || overwriteBlanks) {
    contract.escalationTracking = {};
    if (countractHasTrackers) {
      for (const tracker of escalationTrackers) {
        if (contract.name === tracker.contractName) {
          if (!contract.escalationTracking) contract.escalationTracking = {};
          contract.escalationTracking[tracker.name] = {
            startingUnits: tracker.units,
            startingGross: tracker.gross,
            startingNet: tracker.net,
          };
        }
      }
    }
  }

  // Import escalation equivalents:
  const countractHasEquivalents = escalationEquivalents.find((equivalent) => equivalent.contractName === contract.name);
  if (countractHasEquivalents || overwriteBlanks) {
    contract.escalationEquivalents = [];
    if (countractHasEquivalents) {
      for (const equivalent of escalationEquivalents) {
        if (equivalent.contractName === contract.name) {
          contract.escalationEquivalents.push({ configuration: equivalent.configuration, amount: equivalent.amount });
        }
      }
    }
  }

  if (contractTemplateType === 'Standard') {
    await processTerms({ contract, client, tabData: sales, tabName: 'Sales Terms', fieldName: 'salesTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
    await processTerms({ contract, client, tabData: deductions, tabName: 'Deductions', fieldName: 'deductionsTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
    await processTerms({ contract, client, tabData: mechanicals, tabName: 'Mechanicals', fieldName: 'mechanicalTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
    await processTerms({ contract, client, tabData: withholdingTax, tabName: 'Withholding Tax', fieldName: 'withholdingTaxTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
    await processTerms({ contract, client, tabData: costs, tabName: 'Costs', fieldName: 'costsTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
  } else if (contractTemplateType === 'Publisher') {
    await processTerms({ contract, client, tabData: sales, tabName: 'Income', fieldName: 'salesTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
    await processTerms({ contract, client, tabData: deductions, tabName: 'Deductions', fieldName: 'deductionsTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
    await processTerms({ contract, client, tabData: withholdingTax, tabName: 'Withholding Tax', fieldName: 'withholdingTaxTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
  } else if (contractTemplateType === 'Mechanical') {
    await processTerms({ contract, client, tabData: mechanicalTerms, tabName: 'Terms', fieldName: 'mechanicalContractTerms', overwriteBlanks, contractTermMappings, contractTemplateType, errors });
  }

  await processCrossContracts({ contract, crossContracts, overwriteBlanks, errors, features, clientType });
  await processAutoPaymentConditions({ contract, autoPaymentConditions, overwriteBlanks, errors });
  processReserves({ contract, reserves, overwriteBlanks });

  let validationError;
  await contract.validate().catch((error) => { validationError = error; });
  if (validationError) {
    errors.push(`Overview Line ${index + 3}: ${validationError.message}`);
  }

  return { contract, errors };
};

const saveContracts = async ({ importedContracts, count, curveUser, client, file }) => {
  const partialImportErrors = [];
  for (const contract of importedContracts) {
    await contract.save().catch((err) => { partialImportErrors.push(`Contract ${contract.name} did not save - ${err.message || err}`); });
  }

  // Notify user
  if (partialImportErrors.length > 0) {
    const generateOptions = { identifier: 'partialImportError', curveUser, client, subject: 'Your Contract Import Was Partially Successful', file: file.originalname, error: partialImportErrors };
    Notification.generate('Your Contract Import Was Partially Successful', `${partialImportErrors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions);
  } else {
    const generateOptions = { identifier: 'importComplete', curveUser, client, subject: 'Your Contract Import Has Completed', file: file.originalname, count };
    Notification.generate('Your Contract Import Has Completed', `${count} Contracts imported in file ${file.originalname}`, null, curveUser, generateOptions);
  }
};

const getDataFromExcel = async ({ file, client, contractTemplateType }) => {
  // get date format from client settings
  const dateFormat = `${client.dateFormat.toUpperCase()}`;
  const { paymentTier, features } = client;

  let contracts = []; let payees = []; let sales = []; let deductions = []; let mechanicals = []; let mechanicalTerms = []; let withholdingTax = []; let costs = []; let reserves = []; let crossContracts = []; let autoPaymentConditions = [];
  let escalationTrackers = []; let escalationEquivalents = [];
  // Get data for standard imports
  if (contractTemplateType === 'Standard') {
    contracts = await getDataByTemplate({ path: file.path, columns: paymentTier === 'Lite' ? config.importTemplates.liteContract : config.importTemplates.contract, tab: 0, startingLine: 2, dateFormat });
    sales = await getDataByTemplate({ path: file.path, columns: paymentTier === 'Lite' ? config.importTemplates.liteSale : config.importTemplates.sale, tab: features.payeeBalances ? 2 : 1, startingLine: 2, dateFormat });
    costs = await getDataByTemplate({ path: file.path, columns: paymentTier === 'Lite' ? config.importTemplates.liteContractCost : config.importTemplates.contractCost, tab: paymentTier === 'Lite' ? (features.payeeBalances ? 3 : 2) : (features.payeeBalances ? 6 : 5), startingLine: 2, dateFormat });
    reserves = await getDataByTemplate({ path: file.path, columns: config.importTemplates.reserve, tab: paymentTier === 'Lite' ? (features.payeeBalances ? 4 : 3) : (features.payeeBalances ? 7 : 6), startingLine: 2, dateFormat });

    sales = cleanUpNumbersInArray(sales, ['rate', 'unitRate', 'multiplier', 'reductionRate', 'reserve']);
    costs = cleanUpNumbersInArray(costs, ['rate']);
    reserves = cleanUpNumbersInArray(reserves, ['rate']);

    if (features.payeeBalances) {
      payees = await getDataByTemplate({ path: file.path, columns: config.importTemplates.contractPayees, tab: 1, startingLine: 2, dateFormat });
    }

    if (paymentTier !== 'Lite') {
      deductions = await getDataByTemplate({ path: file.path, columns: config.importTemplates.deduction, tab: features.payeeBalances ? 3 : 2, startingLine: 2, dateFormat });
      mechanicals = await getDataByTemplate({ path: file.path, columns: config.importTemplates.mechanicalDeduction, tab: features.payeeBalances ? 4 : 3, startingLine: 2, dateFormat });
      withholdingTax = await getDataByTemplate({ path: file.path, columns: config.importTemplates.withholdingTaxDeduction, tab: features.payeeBalances ? 5 : 4, startingLine: 2, dateFormat });
      crossContracts = await getDataByTemplate({ path: file.path, columns: config.importTemplates.crossContracts, tab: features.payeeBalances ? 8 : 7, startingLine: 2, dateFormat });
      autoPaymentConditions = await getDataByTemplate({ path: file.path, columns: config.importTemplates.autoPaymentConditions, tab: features.payeeBalances ? 9 : 8, startingLine: 2, dateFormat });
      escalationTrackers = await getDataByTemplate({ path: file.path, columns: config.importTemplates.escalationTrackers, tab: features.payeeBalances ? 10 : 9, startingLine: 2, dateFormat });
      escalationEquivalents = await getDataByTemplate({ path: file.path, columns: config.importTemplates.escalationEquivalents, tab: features.payeeBalances ? 11 : 10, startingLine: 2, dateFormat });

      deductions = cleanUpNumbersInArray(deductions, ['rate', 'unitRate']);
      mechanicals = cleanUpNumbersInArray(mechanicals, ['rate', 'unitRate', 'reserve']);
      withholdingTax = cleanUpNumbersInArray(withholdingTax, ['rate', 'unitRate']);
      crossContracts = cleanUpNumbersInArray(crossContracts, ['percentage']);
      escalationTrackers = cleanUpNumbersInArray(escalationTrackers, ['units', 'gross', 'net']);
      escalationEquivalents = cleanUpNumbersInArray(escalationEquivalents, ['amount']);
    }
  } else if (contractTemplateType === 'Publisher') {
    contracts = await getDataByTemplate({ path: file.path, columns: paymentTier === 'Lite' ? config.importTemplates.litePublisherContract : config.importTemplates.publisherContract, tab: 0, startingLine: 2, dateFormat });
    sales = await getDataByTemplate({ path: file.path, columns: paymentTier === 'Lite' ? config.importTemplates.litePublisherSales : config.importTemplates.publisherSales, tab: features.payeeBalances ? 2 : 1, startingLine: 2, dateFormat });
    sales = cleanUpNumbersInArray(sales, ['rate', 'unitRate', 'multiplier', 'reductionRate', 'reserve']);

    if (features.payeeBalances) {
      payees = await getDataByTemplate({ path: file.path, columns: config.importTemplates.contractPayees, tab: 1, startingLine: 2, dateFormat });
    }
    if (paymentTier !== 'Lite') {
      deductions = await getDataByTemplate({ path: file.path, columns: config.importTemplates.publisherDeduction, tab: features.payeeBalances ? 3 : 2, startingLine: 2, dateFormat });
      withholdingTax = await getDataByTemplate({ path: file.path, columns: config.importTemplates.withholdingTaxDeduction, tab: features.payeeBalances ? 4 : 3, startingLine: 2, dateFormat });
      crossContracts = await getDataByTemplate({ path: file.path, columns: config.importTemplates.crossContracts, tab: features.payeeBalances ? 5 : 4, startingLine: 2, dateFormat });
      autoPaymentConditions = await getDataByTemplate({ path: file.path, columns: config.importTemplates.autoPaymentConditions, tab: features.payeeBalances ? 6 : 5, startingLine: 2, dateFormat });
      escalationTrackers = await getDataByTemplate({ path: file.path, columns: config.importTemplates.escalationTrackers, tab: features.payeeBalances ? 7 : 6, startingLine: 2, dateFormat });
      escalationEquivalents = await getDataByTemplate({ path: file.path, columns: config.importTemplates.escalationEquivalents, tab: features.payeeBalances ? 8 : 7, startingLine: 2, dateFormat });

      deductions = cleanUpNumbersInArray(deductions, ['rate', 'unitRate']);
      withholdingTax = cleanUpNumbersInArray(withholdingTax, ['rate', 'unitRate']);
      crossContracts = cleanUpNumbersInArray(crossContracts, ['percentage']);
      escalationTrackers = cleanUpNumbersInArray(escalationTrackers, ['units', 'gross', 'net']);
      escalationEquivalents = cleanUpNumbersInArray(escalationEquivalents, ['amount']);
    }
  } else if (contractTemplateType === 'Mechanical') {
    contracts = await getDataByTemplate({ path: file.path, columns: config.importTemplates.mechanicalContract, tab: 0, startingLine: 2, dateFormat });

    if (features.payeeBalances) {
      payees = await getDataByTemplate({ path: file.path, columns: config.importTemplates.contractPayees, tab: 1, startingLine: 2, dateFormat });
    }

    mechanicalTerms = await getDataByTemplate({ path: file.path, columns: config.importTemplates.mechanicalTerms, tab: features.payeeBalances ? 2 : 1, startingLine: 2, dateFormat });
    reserves = await getDataByTemplate({ path: file.path, columns: config.importTemplates.reserve, tab: features.payeeBalances ? 3 : 2, startingLine: 2, dateFormat });
    crossContracts = await getDataByTemplate({ path: file.path, columns: config.importTemplates.crossContracts, tab: features.payeeBalances ? 4 : 3, startingLine: 2, dateFormat });

    mechanicalTerms = cleanUpNumbersInArray(mechanicalTerms, ['rate', 'unitRate', 'reserve']);
    reserves = cleanUpNumbersInArray(reserves, ['rate']);
    crossContracts = cleanUpNumbersInArray(crossContracts, ['percentage']);
  }

  // Format sales escalation conditions into an array
  sales.forEach((sale) => {
    const escalationIndexes = [1, 2, 3, 4, 5];
    sale.escalations = [];
    for (const escalationIndex of escalationIndexes) {
      if (sale[`escalationTracker${escalationIndex}Name`] || sale[`escalationTracker${escalationIndex}ThresholdType`] || sale[`escalationTracker${escalationIndex}When`] || sale[`escalationTracker${escalationIndex}Threshold`] || sale[`escalationTracker${escalationIndex}DealType`] || sale[`escalationTracker${escalationIndex}UnitRate`] || sale[`escalationTracker${escalationIndex}RatePercentage`] || sale[`escalationTracker${escalationIndex}Multiplier`] || sale[`escalationTracker${escalationIndex}ReductionPercentage`] || sale[`escalationTracker${escalationIndex}ReductionReserve`]) {
        sale.escalations.push({
          rate: sale[`escalationTracker${escalationIndex}RatePercentage`],
          type: sale[`escalationTracker${escalationIndex}DealType`],
          unitRate: sale[`escalationTracker${escalationIndex}UnitRate`],
          multiplier: sale[`escalationTracker${escalationIndex}Multiplier`],
          reductionRate: sale[`escalationTracker${escalationIndex}ReductionPercentage`],
          reserve: sale[`escalationTracker${escalationIndex}ReductionReserve`],
          conditions: [{
            escalationTracker: sale[`escalationTracker${escalationIndex}Name`],
            thresholdType: sale[`escalationTracker${escalationIndex}ThresholdType`],
            when: sale[`escalationTracker${escalationIndex}When`],
            threshold: ['Sale Date', 'Reporting Date'].includes(sale[`escalationTracker${escalationIndex}Name`]) ? moment.utc(sale[`escalationTracker${escalationIndex}Threshold`], client.dateFormat.toUpperCase()).format() : sale[`escalationTracker${escalationIndex}Threshold`],
          }],
        });
      }
    }
  });

  // Format sales escalation conditions into an array
  costs.forEach((cost) => {
    const escalationIndexes = [1, 2, 3, 4, 5];
    cost.escalations = [];
    for (const escalationIndex of escalationIndexes) {
      if (cost[`escalationTracker${escalationIndex}Name`] || cost[`escalationTracker${escalationIndex}ThresholdType`] || cost[`escalationTracker${escalationIndex}When`] || cost[`escalationTracker${escalationIndex}Threshold`] || cost[`escalationTracker${escalationIndex}Rate`]) {
        cost.escalations.push({
          rate: cost[`escalationTracker${escalationIndex}Rate`],
          conditions: [{
            escalationTracker: cost[`escalationTracker${escalationIndex}Name`],
            thresholdType: cost[`escalationTracker${escalationIndex}ThresholdType`],
            when: cost[`escalationTracker${escalationIndex}When`],
            threshold: ['Cost Date', 'Reporting Date'].includes(cost[`escalationTracker${escalationIndex}Name`]) ? moment(cost[`escalationTracker${escalationIndex}Threshold`], client.dateFormat.toUpperCase()).format(client.dateFormat) : cost[`escalationTracker${escalationIndex}Threshold`],
          }],
        });
      }
    }
  });

  // Save the line index against the arrays
  contracts.forEach((row, index) => { row.line_index = index; });
  payees.forEach((row, index) => { row.line_index = index; });
  sales.forEach((row, index) => { row.line_index = index; });
  deductions.forEach((row, index) => { row.line_index = index; });
  mechanicals.forEach((row, index) => { row.line_index = index; });
  mechanicalTerms.forEach((row, index) => { row.line_index = index; });
  withholdingTax.forEach((row, index) => { row.line_index = index; });
  costs.forEach((row, index) => { row.line_index = index; });
  reserves.forEach((row, index) => { row.line_index = index; });
  crossContracts.forEach((row, index) => { row.line_index = index; });
  autoPaymentConditions.forEach((row, index) => { row.line_index = index; });
  escalationTrackers.forEach((row, index) => { row.line_index = index; });
  escalationEquivalents.forEach((row, index) => { row.line_index = index; });

  return { contracts, payees, sales, deductions, mechanicals, mechanicalTerms, withholdingTax, costs, reserves, crossContracts, autoPaymentConditions, escalationTrackers, escalationEquivalents };
};

const getDataByTemplate = async ({ path, columns, tab, startingLine, dateFormat }) => new Promise((resolve, reject) => {
  try {
    importXlsx.getDataByTemplate(path, columns, tab, startingLine, dateFormat, (err, data) => {
      if (err) {
        logger.error(err);
        if (err === 'Template does not match') { reject(Error('It appears the template does not match.')); } else { reject(Error('Only Excel files (.xlsx, .xls) are accepted. Please upload a valid Excel file and try again.')); }
      } else {
        resolve(data);
      }
    });
  } catch (error) {
    logger.error(error);
    throw Error('Only Excel files (.xlsx, .xls) are accepted. Please upload a valid Excel file and try again.');
  }
});

const generateErrorNotification = async ({ error, file, curveUser }) => {
  const client = await Client.findById(curveUser.clientId);
  const generateOptions = {
    identifier: 'importError',
    curveUser,
    client,
    subject: 'Your Contract Import Has Errored',
    file: file.originalname,
    error: Array.isArray(error) ? error : [error],
  };
  Notification.generate('Your Contract Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions);
};

const isObjectPopulated = (obj) => {
  let objectPopulated = false;
  for (const key in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '') objectPopulated = true;
    }
  }

  return objectPopulated;
};

const cleanUpNumbersInArray = (terms, items) => {
  if (terms && Array.isArray(terms) && Array.isArray(items)) {
    terms.forEach((term) => {
      items.forEach((item) => {
        term[item] = cleanUpNumber(term[item]);
      });
    });
  }
  return terms;
};

const cleanUpNumber = (numStr) => {
  if (numStr && typeof numStr === 'string') {
    numStr = numStr.replace(/\%/g, '');
    if (numStr.indexOf(',') !== -1 && numStr.indexOf('.') !== -1) {
      if (numStr.indexOf(',') > numStr.indexOf('.')) {
        numStr = numStr.replace(/\./g, '').replace(/,/g, '.');
      } else {
        numStr = numStr.replace(/,/g, '');
      }
    } else if (numStr.indexOf(',') !== -1) {
      numStr = numStr.replace(/,/g, '.');
    }
  }
  return numStr;
};

const processCategories = ({ data, contract, client, index, overwriteBlanks, errors }) => {
  if ((data.contractCategories && data.contractCategories.length !== 0) || overwriteBlanks) {
    // Ensure categories match setup categories in client
    contract.contractCategories = [];
    for (const category of data.contractCategories) {
      if (category && category !== '') {
        if (!client.contractCategories.includes(category)) {
          // Category doesn't match list
          errors.push(`Overview Line ${index + 3}: Category doesn't match list`);
        } else {
          // Add category to the array
          contract.contractCategories.push(category);
        }
      }
    }
  }
};

const processPayee = async ({ data, contract, client, index, overwriteBlanks, errors }) => {
  if (data.payeeId && data.payeeId !== '') {
    // Find Payee by ID
    const payee = await Payee.findById(data.payeeId).catch(() => {});
    if (!payee) {
      // Find Payee by name if not found by ID
      const payee = await Payee.findOne({ clientId: client._id.toString(), name: data.payeeId });
      if (payee) {
        contract.payees = [{ payeeId: payee._id.toString(), percentage: 100 }];
      } else {
        errors.push(`Overview Line ${index + 3}: Payee doesn't exist`);
      }
    } else if (payee.clientId === client._id.toString()) {
      // Ensure Payee is from same client
      contract.payees = [{ payeeId: payee._id.toString(), percentage: 100 }];
    }
  } else if (overwriteBlanks || !contract.payees?.length) {
    // Setting to null instead of empty string to still be able to populate this field when getting contracts.
    contract.payees = [];
  }
};

const processCompany = async ({ data, contract, client, index, overwriteBlanks, errors }) => {
  if (data.companyId && data.companyId !== '') {
    // Find Company by ID
    const company = await Company.findById(data.companyId).catch(() => {});
    if (!company) {
      // Find Company by name if not found by ID
      const company = await Company.findOne({ clientId: client._id.toString(), name: data.companyId });
      if (company) {
        contract.companyId = company._id.toString();
      } else {
        errors.push(`Overview Line ${index + 3}: Company doesn't exist`);
      }
    } else if (company.clientId === client._id.toString()) {
      // Ensure Company is from same client
      contract.companyId = company._id.toString();
    }
  } else if (overwriteBlanks) {
    contract.companyId = '';
  }
};

const processContractTermGroups = async ({ contractTermMappings, clientId }) => {
  // Load Contract Term Groups
  const contractTermGroups = await ContractTermGroup.find({ clientId }, { name: 1, type: 1 });
  if (contractTermGroups?.length) {
    contractTermGroups.forEach((contractTermGroup) => {
      contractTermMappings[contractTermGroup.type] = contractTermMappings[contractTermGroup.type] || {};
      contractTermMappings[contractTermGroup.type][contractTermGroup.name] = contractTermGroup._id.toString();
    });
  }
};

const processTerms = async ({ contract, client, tabData, tabName, fieldName, overwriteBlanks, contractTermMappings, contractTemplateType, errors }) => {
  if (tabData) {
    // If it finds at least one instance of a contract term, it should remove any that are currently set
    let resetTermsData = false;
    // Reset if overwrite blanks is true
    if (overwriteBlanks) {
      contract[fieldName] = [];
      resetTermsData = true;
    }

    for (const item of tabData) {
      const index = item.line_index;
      if (item.contractName === contract.name) {
        if (!resetTermsData) {
          contract[fieldName] = [];
          resetTermsData = true;
        }
        const lineErrors = [];
        // Territory
        // Map world to WW
        if (['World', 'world'].includes(item.territory)) { item.territory = 'WW'; }
        // Check if territory group
        const territoryGroup = await TerritoryGroup.findOne({ name: item.territory, clientId: client._id.toString() });
        if (territoryGroup) {
          item.territory = territoryGroup._id.toString();
        } else {
          const territories = ['WW', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'DZ', 'CW', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
          if (!territories.includes(item.territory)) { lineErrors.push(`${tabName} - Line ${index + 3}: Territory is incorrect`); }
        }
        if (fieldName === 'costsTerms') {
          // Cost Type
          if (!client.costTypes.includes(item.type) && item.type !== 'All') {
            // Try and match to Contract Term Group
            if (!ObjectId.isValid(item.type) && contractTermMappings['Cost Type'] && contractTermMappings['Cost Type'][item.type]) {
              item.type = contractTermMappings['Cost Type'][item.type];
            } else if (!ObjectId.isValid(item.type)) {
              lineErrors.push(`${tabName} - Line ${index + 3}: Type doesn't match list`);
            }
          }
        } else {
          // Catalogue Group
          item.catalogueGroup = String(item.catalogueGroup);
          if (!client.catalogueGroups.includes(item.catalogueGroup) && item.catalogueGroup !== 'All') {
            lineErrors.push(`${tabName} - Line ${index + 3}: Catalogue Group doesn't match list`);
          }
          // Distribution Channel
          if (!client.distributionChannels.includes(item.channel) && item.channel !== 'All') {
            // Try and match to Contract Term Group
            if (contractTermMappings['Distribution Channel'] && contractTermMappings['Distribution Channel'][item.channel]) {
              item.channel = contractTermMappings['Distribution Channel'][item.channel];
            } else {
              lineErrors.push(`${tabName} - Line ${index + 3}: Channel doesn't match list`);
            }
          }
          // Configuration
          if (!client.configurations.includes(item.configuration) && item.configuration !== 'All') {
            // Try and match to Contract Term Group
            if (contractTermMappings.Configuration && contractTermMappings.Configuration[item.configuration]) {
              item.configuration = contractTermMappings.Configuration[item.configuration];
            } else {
              lineErrors.push(`${tabName} - Line ${index + 3}: Configuration doesn't match list`);
            }
          }
          if (contractTemplateType !== 'Publisher') {
            // Price Category
            if (!client.priceCategories.includes(item.priceCategory) && item.priceCategory && item.priceCategory !== 'All') {
              // Try and match to Contract Term Group
              if (contractTermMappings['Price Category'] && contractTermMappings['Price Category'][item.priceCategory]) {
                item.priceCategory = contractTermMappings['Price Category'][item.priceCategory];
              } else {
                lineErrors.push(`${tabName} - Line ${index + 3}: Price Category doesn't match list`);
              }
            }
          }
          // Source
          if (!client.sources.includes(item.source) && item.source && item.source !== 'All') {
            // Try and match to Contract Term Group
            if (contractTermMappings.Source && contractTermMappings.Source[item.source]) {
              item.source = contractTermMappings.Source[item.source];
            } else {
              lineErrors.push(`${tabName} - Line ${index + 3}: Source doesn't match list`);
            }
          }
        }
        if (fieldName === 'salesTerms' && contractTemplateType === 'Standard') {
          if (!['PPD', 'Gross Receipts', 'Net Receipts', 'Unit Price', 'Retail Price', 'Sale Price', 'Unit Rate', 'Fixed Unit Rate'].includes(item.type)) {
            lineErrors.push(`${tabName} - Line ${index + 3}: Type is incorrect`);
          }
        }
        if (['salesTerms', 'deductionsTerms'].includes(fieldName) && contractTemplateType === 'Publisher') {
          // Cat Type - Publisher
          if (!['Work', 'Contract', 'All'].includes(item.catType) || !item.catType) {
            lineErrors.push(`${tabName} - Line ${index + 3}: Cat Type can only be Work, Contract or All`);
          }
        } else if (['salesTerms', 'deductionsTerms'].includes(fieldName) && contractTemplateType !== 'Publisher') {
          // Cat Type - Other Contract types
          if (!['Release', 'Track', 'Contract', 'All'].includes(item.catType) || !item.catType) {
            lineErrors.push(`${tabName} - Line ${index + 3}: Cat Type can only be Release, Track, Contract or All`);
          }
        }
        if (fieldName === 'deductionsTerms' || fieldName === 'withholdingTaxTerms') {
          // Basis
          let deductionBasisFields = ['Percentage', 'Unit Rate'];
          if (fieldName === 'deductionsTerms') {
            deductionBasisFields = contractTemplateType === 'Standard' ? ['Sales Input', 'Gross Receipts', 'Net Receipts', 'PPD', 'Unit Price', 'Retail Price', 'Sale Price', 'Unit Rate', 'Fixed Unit Rate'] : ['Sales Input', 'Gross Receipts', 'Net Receipts', 'Unit Rate', 'Fixed Unit Rate'];
          }
          if (!deductionBasisFields.includes(item.deductionBasis)) { lineErrors.push(`${tabName} - Line ${index + 3}: Basis is incorrect`); }
          // Calculation Type
          if (!['Pre-Calculation', 'Post-Calculation'].includes(item.type)) { lineErrors.push(`${tabName} - Line ${index + 3}: Type is incorrect`); }
        }
        if (fieldName === 'mechanicalTerms') {
          // Deal Type
          if (!['Statutory Rate', 'Min Statutory Rate', 'Unit Rate', 'PPD', 'Fixed Unit Rate', 'Net Receipts'].includes(item.type)) { lineErrors.push(`${tabName} - Line ${index + 3}: Basis is incorrect`); }
          // Rate Basis
          if (item.rateBasis && item.rateBasis !== '' && !['US', 'CA'].includes(item.rateBasis)) { lineErrors.push(`${tabName} - Line ${index + 3}: Rate Basis is incorrect`); }
          // Deduction Type
          if (!['Pre-Calculation', 'Post-Calculation'].includes(item.deductionType)) { lineErrors.push(`${tabName} - Line ${index + 3}: Deduction Type is incorrect`); }
        }
        if (fieldName === 'mechanicalContractTerms') {
          // Deal Type
          if (!['Statutory Rate', 'Min Statutory Rate', 'Unit Rate', 'PPD', 'Net Receipts', 'Fixed Unit Rate'].includes(item.type)) { lineErrors.push(`${tabName} - Line ${index + 3}: Type is incorrect`); }
          // Rate Basis
          if (item.rateBasis && item.rateBasis !== '' && !['US', 'CA'].includes(item.rateBasis)) { lineErrors.push(`${tabName} - Line ${index + 3}: Rate Basis is incorrect`); }
        }
        if (fieldName === 'salesTerms' && contractTemplateType === 'Publisher') {
          if (!['Gross Receipts', 'Net Receipts'].includes(item.type)) { lineErrors.push(`${tabName} - Line ${index + 3}: Type is incorrect`); }
        }
        // Escalation Trackers
        if (fieldName === 'salesTerms' || fieldName === 'deductionsTerms' || fieldName === 'withholdingTaxTerms' || fieldName === 'costsTerms') {
          if (item.escalationTrackers && item.escalationTrackers.length !== 0) {
            if (contract.escalationTracking) {
              // if trackers have been defined in contract, check the supplied trackers match the list
              const escalationTrackers = [];
              for (const escalationTracker of item.escalationTrackers) {
                if (escalationTracker && escalationTracker !== '') {
                  if (!Object.prototype.hasOwnProperty.call(contract.escalationTracking, escalationTracker)) {
                    // Escalation tracker doesn't match list
                    lineErrors.push(`${tabName} - Line ${index + 3}: Escalation trackers do not match list`);
                  } else {
                    // Add escalation tracker to the array
                    escalationTrackers.push(escalationTracker);
                  }
                }
              }
            } else {
              // if no escalation trackers have been defined, none can be supplied
              lineErrors.push(`${tabName} - Line ${index + 3}: Escalation trackers do not match list`);
            }
          }
        }

        if (lineErrors.length === 0) {
          contract[fieldName].push(item);
        } else {
          lineErrors.forEach((error) => errors.push(error));
        }
      }
    }
  }
};

const processCrossContracts = async ({ contract, crossContracts, overwriteBlanks, errors, features, clientType }) => {
  // Reset values if overwriteBlanks is true, regardless of any data or not
  let resetCrossData = false;
  if (overwriteBlanks) {
    contract.crossContracts = [];
    resetCrossData = true;
  }
  if (crossContracts?.length) {
    for (const item of crossContracts) {
      const index = item.line_index;
      if (item.contractName && item.linkToContract && item.contractName === item.linkToContract) {
        errors.push(`Cross Contracts - Line ${index + 3}: Contract cannot be linked to itself`);
      } else {
        const originalContract = { ...contract.toObject() };
        if (item.contractName === contract.name) {
          if (!resetCrossData) {
            contract.crossContracts = [];
            resetCrossData = true;
          }
          const lineErrors = [];
          // When value
          // complexCrossContracts enabled in features?
          const whenAllowedValues = ['Always transfer Income', 'Balance is Positive', 'Balance is Greater Than Minimum Payout', 'Always transfer Balance'];
          // if not a Publisher add 'Always transfer Income and Costs' and 'Always transfer Income, Costs and Reserves' to allowed values
          if (clientType !== 'Publisher') {
            whenAllowedValues.push('Always transfer Income and Costs', 'Always transfer Income, Costs and Reserves');
          }
          // Include complex cross contract options when feature enabled
          if (features?.complexCrossContracts) {
            whenAllowedValues.push(
              'Income is Positive',
              'Income is Negative',
              'Income and Costs are Positive',
              'Income and Costs are Negative',
              'Income, Costs and Reserves are Positive',
              'Income, Costs and Reserves are Negative',
              'Balance is Negative',
              'Balance Minus Opening is Positive',
              'Balance Minus Opening is Negative',
              'Always transfer Balance Minus Opening',
            );
            if (clientType === 'Publisher') {
              whenAllowedValues.push('Always transfer Income and Costs');
            }
          }
          if (!whenAllowedValues.includes(item.condition)) {
            lineErrors.push(`Cross Contracts - Line ${index + 3}: When value is incorrect`);
          }
          // exclude these options
          if (item.condition === 'Always transfer Balance' && item.process === 'Subtract From') {
            lineErrors.push(`Cross Contracts - Line ${index + 3}: You should not cross contract when '${item.condition}' with '${item.process}' `);
          }
          // exclude these options if profit share classic
          if (item.condition === 'Always transfer Balance' && contract.type === 'Profit Share') {
            lineErrors.push(`Cross Contracts - Line ${index + 3}: You should not cross contract '${item.condition}' from a 'Profit Share Classic' contract `);
          }
          // Map values
          item.condition = Contract.mapCrossContractCondition(item.condition);
          // Process
          if (!['Add To', 'Subtract From'].includes(item.process)) { lineErrors.push(`Cross Contracts - Line ${index + 3}: Process value is incorrect`); }
          // Percentage
          if (Number.isNaN(parseFloat(item.percentage))) {
            lineErrors.push(`Cross Contracts - Line ${index + 3}: Percentage should just be a number`);
          }
          // Link to Contract
          const linkToContract = await Contract.findOne({ clientId: contract.clientId, name: item.linkToContract, contractType: contract.contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' } });
          if (linkToContract) {
            item.contractId = linkToContract._id.toString();
            // whenAutoPaymentTriggered is null on import, we set the previous data to this field.
            if (item?.whenAutoPaymentTriggered === null) {
              const crossContractIndex = originalContract?.crossContracts?.findIndex((crossContract) => crossContract.contractId === item.contractId);
              item.whenAutoPaymentTriggered = originalContract?.crossContracts?.[crossContractIndex]?.whenAutoPaymentTriggered;
            }
          } else {
            lineErrors.push(`Cross Contracts - Line ${index + 3}: Link To Contract wasn't found`);
          }
          // Add to contract if no errors
          if (lineErrors.length === 0) {
            contract.crossContracts.push(item);
          } else {
            // Add errors to array
            lineErrors.forEach((error) => errors.push(error));
          }
        }
      }
    }
  }
};

const processAutoPaymentConditions = async ({ contract, autoPaymentConditions, overwriteBlanks, errors }) => {
  // Reset values if overwriteBlanks is true, regardless of any data or not
  let resetAutoPaymentData = false;
  if (overwriteBlanks) {
    contract.autoPaymentConditions = [];
    resetAutoPaymentData = true;
  }
  if (autoPaymentConditions?.length) {
    for (const item of autoPaymentConditions) {
      const index = item.line_index;
      if (contract.name === item.contractName) {
        if (!resetAutoPaymentData) {
          contract.autoPaymentConditions = [];
          resetAutoPaymentData = true;
        }
        const lineErrors = [];
        // When value
        const whenAllowedValues = ['Balance is Positive', 'Balance is Positive, Ignoring Advance'];
        if (!whenAllowedValues.includes(item.condition)) {
          lineErrors.push(`Auto Payment Conditions - Line ${index + 3}: When value is incorrect`);
        }
        // Link to Contract
        const foundContract = await Contract.findOne({ clientId: contract.clientId, name: item.linkToContract, contractType: contract.contractType });
        if (foundContract) {
          item.contractId = foundContract._id.toString();
        } else {
          lineErrors.push(`Auto Payment Conditions - Line ${index + 3}: Contract wasn't found`);
        }
        // Add to contract if no errors
        if (lineErrors.length === 0) {
          contract.autoPaymentConditions.push(item);
        } else {
          // Add errors to array
          lineErrors.forEach((error) => errors.push(error));
        }
      }
    }
  }
};

const processReserves = ({ contract, reserves, overwriteBlanks }) => {
  // Reset values if overwriteBlanks is true, regardless of any data or not
  let resetReservesData = false;
  if (overwriteBlanks) {
    contract.reserves = [];
    resetReservesData = true;
  }
  if (reserves?.length) {
    for (const item of reserves) {
      if (item.contractName === contract.name) {
        if (!resetReservesData) {
          contract.reserves = [];
          resetReservesData = true;
        }
        contract.reserves.push(item);
      }
    }
  }
};

module.exports = ContractsImporter;
