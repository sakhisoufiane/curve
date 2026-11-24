/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-constant-condition */
/* eslint-disable no-loop-func */
/* eslint-disable no-promise-executor-return */
/* eslint-disable @typescript-eslint/no-var-requires */

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit, eachSeries } = require('async');
const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const { ObjectId } = require('mongodb');
const Contract = require('./models/contract');
const Period = require('./models/period');
const Statement = require('./models/statement');
const BatchTask = require('./models/batchTask');
const ContractTerms = require('./libs/contractTerms');
const GoogleStorage = require('./libs/googleStorage');
const PrepareCalculationData = require('./libs/prepareCalculationData');
const currenciesToPrefix = require('./libs/currenciesToPrefix');

const bucketName = process.env.GCS_JOINED_PERIOD_EXPORT ?? 'period_joined_input_data';

const contractWithTermsMappings = {};
const ssmVariables = {};

const SalesCalculator = {
  calculate: async ({ period, client, object, query, contractId, runLocally = false }) => {
    // Load period to make sure we're getting the latest version
    period = await Period.findById(period._id);

    const folderName = `client_${client._id}_period_${period._id}_${moment().format('x')}`;

    // Start by getting the contract IDs part of the period
    logger.info(`${period._id} Starting Refactored Sales Calculation`);
    const contractIds = await getCalculationContractIds({ period, object, contractId });
    // If no contracts match the filter, exit the calculation.
    if (!contractIds.length) return;
  
    // Ship the client's catalogue to BQ.
    logger.info(`${period._id} Shipping Catalogue to BQ`);
    const { catalogueTable, catalogueRightsTable } = await PrepareCalculationData.shipCatalogue({ periodId: period._id.toString(), clientId: period.clientId, BQDataset: client.bigQueryDataset });
  
    // Join sales data to catalogue data
    logger.info(`${period._id} Joining Sales Data to Catalogue Data`);
    const { chunkFiles } = await PrepareCalculationData.joinSalesDataToCatalogueData({ 
      periodId: period._id.toString(),
      clientId: period.clientId,
      query, contractIds,
      catalogueTable,
      catalogueRightsTable,
      BQDataset: client.bigQueryDataset,
      bucketName,
      folderName
    });
  
    // Create batch tasks for each chunk file
    logger.info(`${period._id} Creating Batch Tasks`);
    const batchTaskIds = await createBatchTasks({ period, object, chunkFiles, client, bucketName, folderName, contractId });
  
    // Update period recalculation object
    logger.info(`${period._id} Updating Period Recalculation Object`);
    await updatePeriodRecalculationObject({ period, batchTaskIds });
  
    // Run each batch task individually
    logger.info(`${period._id} Running Batch Tasks`);
    await calculateBatchTasks({ period, client, bucketName, runLocally, runCounter: 0, contractId });
  
    logger.info(`${period._id} Refactored Sales Calculation Completed`);
  }
};


const getCalculationContractIds = async ({ period, object, contractId }) => {
  // When calculating a single statement, we should use the statement contractId in the filter

  let contractFilter = {};

  if (contractId) {
    contractFilter = {clientId: period.clientId, _id: contractId};
  } else {
    // If no contractId is provided, we assume it's a period calculation and we need to get the contractIds from the period recalculation object
    const recalculation = period.recalculation || {};
    // Find contracts for period
    contractFilter = { clientId: period.clientId, active: true, accountingPeriod: period.accountingPeriodType };
    if (period.contractType === 'Mechanical') {
      contractFilter.contractType = 'Mechanical';
      contractFilter.mechanicalContractTerms = { $ne: [] };
    } else {
      contractFilter.contractType = { $ne: 'Mechanical' };
    }
  
    if (object.runType === 'main') {
      // check period recalculation to determine if we are running a partial
      if (recalculation.contractIds) {
        logger.debug('runContractSalesCalculators:', recalculation.contractIds);
        contractFilter._id = { $in: recalculation.contractIds };
      }
    } else if (object.runType === 'modifiedSales' && recalculation.salesFiles?.contractIds?.length > 0) {
      // have contractFilter._id = { $in: period.recalculation.salesFiles.contractIds };
      logger.debug('runModifiedSalesCalculators:', recalculation.salesFiles.contractIds);
      let modifiedSalesContractIds = recalculation.salesFiles.contractIds;
  
      // Need to pull recalculation.contractIds from recalculation.salesFiles.contractIds first as these have aleady been recalculated
      if (recalculation.contractIds) {
        modifiedSalesContractIds = modifiedSalesContractIds.filter((value) => !recalculation.contractIds.includes(value)).filter(Boolean);
      }
  
      logger.debug(`modifiedSalesContractIds: ${modifiedSalesContractIds}`);
      contractFilter._id = { $in: modifiedSalesContractIds };
    } else {
      const contractsError = 'ModifiedSales type sales Calculation requires contracts parameter';
      logger.error(`${period._id} ${contractsError}`);
      throw new Error(contractsError);
    }

  }

  logger.debug(contractFilter);

  const contracts = await Contract.find(contractFilter).lean();

  logger.info(`${period._id} - Getting Contract Terms for ${contracts.length} contracts`);
  let processedContracts = 0;

  await eachLimit(contracts, 100, async (contract) => {
    const contractIdStr = contract._id.toString();
    contractWithTermsMappings[contractIdStr] = await ContractTerms.forCalcualtion(contract);
    contractWithTermsMappings[contractIdStr].partitionNo = await generateContractPartitionNo(period._id.toString(), contractIdStr);
    contractWithTermsMappings[contractIdStr].escalationEquivalents = contract.escalationEquivalents || [];
    processedContracts+= 1;
    if (processedContracts % 100 === 0) {
      logger.info(`${period._id} - Processed ${((processedContracts/contracts.length)*100).toFixed(2)}% - (${processedContracts}/${contracts.length}) contracts`);
    }
  });

  const contractIds = contracts.map((contract) => contract._id.toString());

  return contractIds;
};

const updatePeriodRecalculationObject = async ({ period, batchTaskIds }) => {
  // Instead of using contractIds, we use batchTaskIds to update the period recalculation object
  // This is more accurate as we can show a percentage of the calculation that has been completed based on  the batch tasks still running.
  if (batchTaskIds.length && (period.recalculation?.contractIds || period.recalculation?.salesFiles)) { period.recalculation.totalContractsForCalculation = batchTaskIds.length; }
  await Period.findByIdAndUpdate(period._id, { $set: { totalContractsForCalculation: batchTaskIds.length, recalculation: period.recalculation } }).exec();
};

const createBatchTasks = async ({ period, object, chunkFiles, client, bucketName, folderName, contractId }) => {
  if (contractId) {
    // When running a single statement, we should only delete the batch task for that contract
    await BatchTask.deleteMany({ 
      periodId: period._id,
      name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation',
      'value.contractId': contractId.toString()
    });
  } else {
    // Clear any existing batch tasks for the period when it's a period calculation and not a single statement calculation
    await BatchTask.deleteMany({
      periodId: period._id,
      name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation'
    });
  }

  // Create batch tasks for each chunk
  const batchTaskIds = [];

  await eachLimit(chunkFiles, 20, async (file) => {
    if (file.contractId && contractWithTermsMappings[file.contractId]) {
      // Upload calculation params to a file
      const calculationParams = {
        contract: contractWithTermsMappings[file.contractId],
        client: client.toObject(),
        period: period.toObject(),
        salesDataFile: file.name,
        salesDataBucket: file.bucket,
        clientCurrencies: currenciesToPrefix(client),
      };
  
      // Check if contract is using escalations
      // TODO: Add extra logic to check if a contract has already met its thresholds and run in parallel when so
      let hasEscalations = false;
      calculationParams.contract.terms.sales.forEach((salesTerm) => {
        if (salesTerm.escalations) {
          salesTerm.escalations.forEach((escalations) => {
            if (escalations.conditions.length > 0) {
              hasEscalations = true;
            }
          });
        }
      });
  
      // Upload calculation params to Google Storage
      const fileName = `calculation_params_${moment().format('x')}-${generateRandomNumber()}`;
      const googleStoragePath = `gs://${bucketName}/${folderName}/${fileName}`;
      const googleStorage = new GoogleStorage(bucketName);
      fs.writeFileSync(`${appRootDir}/tmp/${fileName}`, JSON.stringify(calculationParams));

      let fileRetryCount = 0;
      while (fileRetryCount < 5) {
        try {
          await googleStorage.uploadFile({ source: `${appRootDir}/tmp/${fileName}`, destination: googleStoragePath });
          break;
        } catch (error) {
          fileRetryCount+= 1;
          logger.error(`${period._id} - Error uploading calculation params to Google Storage: ${error.message}`);
          await new Promise(r => setTimeout(r, 10000));
          if (fileRetryCount === 5) {
            logger.error(`${period._id} - Error uploading calculation params to Google Storage: ${error.message} - Retried 5 times`);
            throw error;
          }
        }
      }
  
      // Create batch task
      const batchTask = new BatchTask({
        clientId: period.clientId,
        periodId: period._id.toString(),
        name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation',
        status: 'Pending',
        value: {
          contractId: contractWithTermsMappings[file.contractId].contractId,
          file: file.name,
          calculationParams: googleStoragePath,
          runInSeries: hasEscalations, // If contract has escalations, we need to run the batch tasks for the contract in series, should impact performance as the dataset is limited in size
        },
        runType: object.runType,
      });
  
  
      await batchTask.save();
  
      batchTaskIds.push(batchTask._id.toString());
    } else {
      logger.error(`${period._id} - Contract ${file.contractId} not found in contractWithTermsMappings`);
    }
  });

  return batchTaskIds;
};

const calculateBatchTasks = async ({ period, bucketName, runLocally, runCounter, contractId }) => {
  logger.info(`${period._id} - Calculating batch tasks - runCounter: ${runCounter}`);
  runCounter += 1;
  
  await runBatchTasks({ period, runLocally, contractId })

  let nonCompletedBatchTasks = [];
  if (contractId) {
    // When calculating a single statement, we should only check for the batch tasks for that contract
    nonCompletedBatchTasks = await BatchTask.find({periodId: period._id, status: {$ne: 'Complete'}, name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation', 'value.contractId': contractId.toString()});
  } else {
    // When calculating a period, we should check for all the batch tasks for the period
    nonCompletedBatchTasks = await BatchTask.find({periodId: period._id, status: {$ne: 'Complete'}, name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation'});
  }
  logger.debug(`${period._id} - Non completed batch tasks: ${nonCompletedBatchTasks.length}`);
   
  // Run up to 10 times if there are still batch tasks to run
  if (nonCompletedBatchTasks.length > 0 && runCounter <= 10) {
    logger.info(`${period._id} - ${nonCompletedBatchTasks.length} Batch tasks not complete, running again - runCounter: ${runCounter}`);
    return calculateBatchTasks({ period, bucketName, runLocally, runCounter, contractId });
  } 
  if (nonCompletedBatchTasks.length > 0 && runCounter > 10) {
  // If we've run 10 times and there are still batch tasks to run, throw an error
    logger.error(`${period._id} - Batch tasks not complete after ${runCounter} runs`);
    throw new Error('Batch tasks errored after 10 runs');
  } else {
    logger.info(`${period._id} - Batch tasks complete`);
  }
};

const runBatchTasks = async ({ period, runLocally, contractId }) => {
  // Get SSM variables and store them to be reused. Wait 1.5s between calls to not trigger rate limits
  await getSSMVariable('/sales-calculator/ecs-cluster-name');
  await new Promise(r => setTimeout(r, 1500));
  await getSSMVariable('/sales-calculator/task-definition-arn');
  await new Promise(r => setTimeout(r, 1500));
  await getSSMVariable('/sales-calculator/private-subnet-ids');
  await new Promise(r => setTimeout(r, 1500));
  await getSSMVariable('/sales-calculator/security-group-id');

  // When not running locally, trigger an ECS task to pick up the task.
  let batchTasks = [];
  if (contractId) {
    // When calculating a single statement, we should only run the batch task for that contract
    batchTasks = await BatchTask.find({periodId: period._id, status: {$ne: 'Complete'}, name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation', 'value.contractId': contractId.toString()}).lean();
  } else {
    // When calculating a period, we should run all the batch tasks for the period
    batchTasks = await BatchTask.find({periodId: period._id, status: {$ne: 'Complete'}, name: period.contractType === 'Mechanical' ? 'Refactored Mechanical Sales Calculation' : 'Refactored Sales Calculation'}).lean();
  }
  // We need split the tasks into ones running in series and ones running in parallel (this is for escalations)
  const tasksToRunInParallel = [];
  const tasksToRunInSeries = {};
  batchTasks.forEach((batchTask) => {
    const { runInSeries, contractId } = batchTask.value;
    if (runInSeries) {
      // For each contract, we need to run the batch tasks in series
      tasksToRunInSeries[contractId] = tasksToRunInSeries[contractId] || [];
      tasksToRunInSeries[contractId].push(batchTask);
    } else {
      tasksToRunInParallel.push(batchTask);
    }
  });


  let processedBatches = 0;
  
  // We're running 100 batch tasks at a time to avoid hitting concurrency limits
  const batchPromises = [
    eachLimit(tasksToRunInParallel, 100, async (batchTask) => {
      await runIndividualBatchTask({ batchTask, period, runLocally });
      // Increment the processed batches counter
      processedBatches+= 1;
      logger.debug(`${period._id} - Processed Batch ${batchTask._id.toString()} - ${processedBatches} of ${batchTasks.length}`);
    })
  ];

  const contractIds = Object.keys(tasksToRunInSeries).filter((id) => tasksToRunInSeries[id]);
  
  batchPromises.push(
    eachLimit(contractIds, 50, async (contractId) => {
      await eachSeries(tasksToRunInSeries[contractId], async (batchTask) => {
        await runIndividualBatchTask({ batchTask, period, runLocally });
        // Increment the processed batches counter
        processedBatches+= 1;
        logger.debug(`${period._id} - Processed Batch ${batchTask._id.toString()} - ${processedBatches} of ${batchTasks.length}`);
      });
    })
  );

  await Promise.all(batchPromises);
}

const runIndividualBatchTask = async ({ batchTask, period, runLocally }) => {
  // TODO: Instead of each lambda writing individually to BQ, we should send the files to GCS, group them and write them to BQ in a single file
  logger.info(`${period._id} - Running batch task ${batchTask._id.toString()} ${runLocally ? 'locally' : 'on Fargate'}`);
  const ecs = new ECSClient({ credentials: { accessKeyId: process.env.SALES_CALCULATOR_AWS_KEY, secretAccessKey: process.env.SALES_CALCULATOR_AWS_SECRET, }, region: process.env.SALES_CALCULATOR_AWS_REGION });
  
  const cluster = await getSSMVariable('/sales-calculator/ecs-cluster-name');
  const taskDefinition = await getSSMVariable('/sales-calculator/task-definition-arn');
  const privateSubnets = await getSSMVariable('/sales-calculator/private-subnet-ids');
  const securityGroup = await getSSMVariable('/sales-calculator/security-group-id');

  const command = new RunTaskCommand({
    cluster,
    taskDefinition,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: privateSubnets.split(','),
        assignPublicIp: 'DISABLED',
        securityGroups: [securityGroup]
      }
    },
    overrides: {
      containerOverrides: [
        {
          name: 'sales-calculator',
          environment: [
            { name: 'DB_PROTOCOL', value: process.env.DB_PROTOCOL },
            { name: 'DB_NAME', value: process.env.DB_NAME },
            { name: 'DB_OPTS', value: process.env.DB_OPTS },
            { name: 'DB_URL', value: process.env.DB_URL },
            { name: 'DB_USER', value: process.env.DB_USER },
            { name: 'DB_PASS', value: process.env.DB_PASS },
            { name: 'BQ_project_id', value: process.env.BQ_project_id },
            { name: 'BQ_client_email', value: process.env.BQ_client_email },
            { name: 'BQ_private_key', value: process.env.BQ_private_key },
            { name: 'GCS_JOINED_PERIOD_EXPORT', value: bucketName },
            { name: 'batchTaskId', value: batchTask._id.toString() }
          ]
        }
      ]
    }
  });

  let retryCount = 0;
  let response;
  while (retryCount < 3) {
    try {
      // This will trigger a rate limit if we're running multiple tasks at the same time. Adding a random sleep between 5 and 15 s
      await randomSleepDuration(5, 15);
      response = await ecs.send(command);
      break;
    } catch (error) {
      retryCount+= 1;
      logger.error(`${period._id} - Error running batch task ${batchTask._id.toString()}: ${error.message}`);
      await new Promise(r => setTimeout(r, 10000));
      if (retryCount === 3) {
        logger.error(`${period._id} - Error running batch task ${batchTask._id.toString()}: ${error.message} - Retried 3 times`);
        throw error;
      }
    }
  }

  logger.info(`${period._id} - Fargate task started for batch task ${batchTask._id.toString()}: ${response.tasks?.[0]?.taskArn}`);
  // Wait for the Fargate task to finish
  await waitForFargateToFinish({ecs, taskArn: response.tasks?.[0]?.taskArn});
    
}

const randomSleepDuration = (minSeconds, maxSeconds) => {
  const sleepDuration = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
  return new Promise(resolve => setTimeout(resolve, sleepDuration));
}


const generateContractPartitionNo = async (periodId, contractId) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';

  // Get the statement first, if a statement is found this means it's a statement recalculation and we should keep the same partitionNp
  const statement = contractId.length === 24 && ObjectId.isValid(contractId) ? await Statement.findOne({ periodId, contractId }, 'partitionNo') : null;

  if (statement?.partitionNo) {
    return statement.partitionNo;
  } 
  // In some cases (MCPS for example), the contractId (coming from RoyaltyCalculator.contract.contractId) is not a valid ID
  // For MCPS, RoyaltyCalculator.contract.contractId is equal to 'MCPS'.
  const contract = contractId.length === 24 && ObjectId.isValid(contractId) ? await Contract.findById(contractId, 'name') : { name: contractId };

  const period = await Period.findById(periodId, 'startDate');

  let partitionNo = 0;

  if (contract.name) {
    const firstLetter = contract.name.toLowerCase().charAt(0);
    const letterPosition = String(alphabet.indexOf(firstLetter) + 1).padStart(2, '0');
    let halfYearsSince2022 = Math.ceil(moment(period.startDate).diff(moment('01/01/2022', 'DD/MM/YYYY'), 'months') / 6);
    if (halfYearsSince2022 < 1) { halfYearsSince2022 = 1; }
    partitionNo = `${halfYearsSince2022}${letterPosition}`;
  }

    return partitionNo;
  
}

const generateRandomNumber = () => {
  const min = 10000000000000;
  const max = 99999999999999;
  const randomNumber = Math.random() * (max - min + 1) + min;
  return randomNumber;
}

const waitForFargateToFinish = async ({ecs, taskArn}) => {
  const cluster = await getSSMVariable('/sales-calculator/ecs-cluster-name');
  while (true) {
    await new Promise(r => setTimeout(r, 10000));
    const response = await ecs.send(
      new DescribeTasksCommand({ cluster, tasks: [taskArn] })
    ).catch((error) => {
      logger.error(`Error describing task ${taskArn}: ${error.message}`);
    });
    if (response?.tasks?.[0]?.lastStatus === 'STOPPED') break;
  }
}

const getSSMVariable = async (name) => {
  if (ssmVariables[name]) {
    return ssmVariables[name];
  }

  logger.debug(`SSM variable ${name} isn't cached, getting it from SSM..`);

  const ssm = new SSMClient({ credentials: { accessKeyId: process.env.SALES_CALCULATOR_AWS_KEY, secretAccessKey: process.env.SALES_CALCULATOR_AWS_SECRET, }, region: process.env.SALES_CALCULATOR_AWS_REGION });
  const command = new GetParameterCommand({ Name: name, WithDecryption: true });
  const response = await ssm.send(command);
  ssmVariables[name] = response.Parameter.Value;
  return ssmVariables[name];
};


module.exports = SalesCalculator;