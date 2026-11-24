/**
 * Sheer Works Ingestion Script
 * 
 * This script processes CSV files to import works data into the database.
 * 
 * FOLDER STRUCTURE:
 * The script supports two ways of organizing CSV files:
 * 
 * 1. ORGANIZED FOLDER STRUCTURE (Recommended):
 *    /path/to/csv/base/
 *    ├── alternate_titles/
 *    │   ├── file1.csv
 *    │   └── file2.csv
 *    ├── participators/
 *    │   ├── file1.csv
 *    │   └── file2.csv
 *    ├── society_identifiers/
 *    │   ├── file1.csv
 *    │   └── file2.csv
 *    ├── works/
 *    │   ├── data_0_0_0.csv
 *    │   └── data_0_1_0.csv
 *    └── ip_chains/
 *        ├── ip_chain.csv
 *        └── additional_chains.csv
 * 
 * 2. FLAT STRUCTURE (Fallback):
 *    If the organized folders don't exist, the script will look for files
 *    in the base directory with matching patterns:
 *    - alternate_titles: files containing "alternate" or "title"
 *    - participators: files containing "participator"
 *    - society_identifiers: files containing "society" or "identifier"
 *    - works: files containing "works"
 *    - ip_chains: files containing "ip_chain" or "chain"
 * 
 * CONFIGURATION:
 * - Update CSV_BASE_PATH to point to your CSV data directory
 * - Set CLEAR_WORKS_COLLECTION to true/false as needed
 * - Adjust BATCH_SIZE and LOG_INTERVAL for performance tuning
 */

require('dotenv').config();
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const {  TerritoryHelper } = require('@curveroyaltysystems/curve-shared-logic');
require('../../models/db');
const { Level } = require('level')
const moment = require('moment');
const { MongoClient } = require('mongodb');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const IpChainUtils = require('../../libs/ipChain');
const WorkValidation = require('../../libs/work/validation');

// ============================================================================
// CONFIGURATION
// ============================================================================

const clientId = '';
// Set to true to clear works collection before ingestion
const CLEAR_WORKS_COLLECTION = false;

const BATCH_SIZE = 1000; // Process works in batches
const LOG_INTERVAL = 100_000; // Log progress every 100 items

// Base folder path containing all CSV data
const CSV_BASE_PATH = '/Users/mbs/Downloads/Work Template Export - 2025-07-03';

// Folder structure for different CSV types
// If these folders don't exist, the script will fall back to looking for files
// in the base directory with matching patterns
const CSV_FOLDERS = {
    alternateTitles: `${CSV_BASE_PATH}/alternate_titles`,
    participators: `${CSV_BASE_PATH}/participators`, 
    societyIdentifiers: `${CSV_BASE_PATH}/society_identifiers`,
    works: `${CSV_BASE_PATH}/works`,
    ipChains: `${CSV_BASE_PATH}/ip_chains`
};

// Fallback patterns for finding files in base directory if folders don't exist
const FALLBACK_PATTERNS = {
    alternateTitles: ['alternate', 'title'],
    participators: ['participator'],
    societyIdentifiers: ['society', 'identifier'],
    works: ['works'],
    ipChains: ['ip_chain', 'chain']
};

// Helper function to get all CSV files from a folder
const getCsvFilesFromFolder = (folderPath, fallbackPatterns = []) => {
    try {
        if (!fs.existsSync(folderPath)) {
            logger.warn(`Folder does not exist: ${folderPath}`);
            
            // Fallback: look for files in base directory with specific patterns
            if (fallbackPatterns.length > 0) {
                const baseDir = path.dirname(folderPath);
                if (fs.existsSync(baseDir)) {
                    const files = fs.readdirSync(baseDir)
                        .filter(file => {
                            const lowerFile = file.toLowerCase();
                            return lowerFile.endsWith('.csv') && 
                                   fallbackPatterns.some(pattern => lowerFile.includes(pattern));
                        })
                        .map(file => path.join(baseDir, file))
                        .sort();
                    
                    logger.info(`Found ${files.length} CSV files in base directory matching patterns: ${fallbackPatterns.join(', ')}`);
                    return files;
                }
            }
            
            return [];
        }
        
        const files = fs.readdirSync(folderPath)
            .filter(file => file.toLowerCase().endsWith('.csv'))
            .map(file => path.join(folderPath, file))
            .sort(); // Sort for consistent processing order
        
        logger.info(`Found ${files.length} CSV files in ${folderPath}`);
        return files;
    } catch (error) {
        logger.error(`Error reading folder ${folderPath}:`, error.message);
        return [];
    }
};

// Get CSV file paths from folders with fallback patterns for current structure
const ALTERNATE_TITLES_CSV_PATHS = getCsvFilesFromFolder(CSV_FOLDERS.alternateTitles, FALLBACK_PATTERNS.alternateTitles);
const PARTICIPATORS_CSV_PATHS = getCsvFilesFromFolder(CSV_FOLDERS.participators, FALLBACK_PATTERNS.participators);
const SOCIETY_IDENTIFIERS_CSV_PATHS = getCsvFilesFromFolder(CSV_FOLDERS.societyIdentifiers, FALLBACK_PATTERNS.societyIdentifiers);
const WORKS_CSV_PATHS = getCsvFilesFromFolder(CSV_FOLDERS.works, FALLBACK_PATTERNS.works);
const IP_CHAIN_CSV_PATHS = getCsvFilesFromFolder(CSV_FOLDERS.ipChains, FALLBACK_PATTERNS.ipChains);

// Log discovered files
logger.info('Discovered CSV files:');
logger.info(`  Alternate Titles: ${ALTERNATE_TITLES_CSV_PATHS.length} files`);
logger.info(`  Participators: ${PARTICIPATORS_CSV_PATHS.length} files`);
logger.info(`  Society Identifiers: ${SOCIETY_IDENTIFIERS_CSV_PATHS.length} files`);
logger.info(`  Works: ${WORKS_CSV_PATHS.length} files`);
logger.info(`  IP Chains: ${IP_CHAIN_CSV_PATHS.length} files`);

// Validate that we have at least some files to process
const totalFiles = ALTERNATE_TITLES_CSV_PATHS.length + PARTICIPATORS_CSV_PATHS.length + 
                   SOCIETY_IDENTIFIERS_CSV_PATHS.length + WORKS_CSV_PATHS.length + IP_CHAIN_CSV_PATHS.length;

if (totalFiles === 0) {
    logger.error('No CSV files found in any of the specified folders or base directory');
    logger.error('Please ensure CSV files exist in one of the following locations:');
    Object.entries(CSV_FOLDERS).forEach(([type, folderPath]) => {
        logger.error(`  ${type}: ${folderPath}`);
    });
    logger.error(`  Or in base directory: ${CSV_BASE_PATH}`);
    process.exit(1);
}

// Error log file path
const ERROR_LOG_PATH = `${appRootDir}/tmp/${clientId}_skipped_lines_${moment().format('x')}.log`;

// Helper function to format numbers with commas
const formatNumber = (num) => num.toLocaleString();

// Helper function to write skipped lines to error log file
const writeSkippedLine = (message) => {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(ERROR_LOG_PATH, logEntry);
};

const contractsDatabasePath = `${appRootDir}/tmp/${clientId}_contracts_mapping_${moment().format('x')}`;
const contractsLevelDB = new Level(contractsDatabasePath, { valueEncoding: 'json' })

const tracksDatabasePath = `${appRootDir}/tmp/${clientId}_tracks_mapping_${moment().format('x')}`;
const tracksLevelDB = new Level(tracksDatabasePath, { valueEncoding: 'json' })

const alternateTitlesDatabasePath = `${appRootDir}/tmp/${clientId}_alternate_titles_mapping_${moment().format('x')}`;
const alternateTitlesLevelDB = new Level(alternateTitlesDatabasePath, { valueEncoding: 'json' })

const societyIdentifiersDatabasePath = `${appRootDir}/tmp/${clientId}_society_identifiers_mapping_${moment().format('x')}`;
const societyIdentifiersLevelDB = new Level(societyIdentifiersDatabasePath, { valueEncoding: 'json' })

const participatorsDatabasePath = `${appRootDir}/tmp/${clientId}_participators_mapping_${moment().format('x')}`;
const participatorsLevelDB = new Level(participatorsDatabasePath, { valueEncoding: 'json' })

const ipChainDatabasePath = `${appRootDir}/tmp/${clientId}_ip_chain_mapping_${moment().format('x')}`;
const ipChainLevelDB = new Level(ipChainDatabasePath, { valueEncoding: 'json' })

const publishersDatabasePath = `${appRootDir}/tmp/${clientId}_publishers_mapping_${moment().format('x')}`;
const publishersLevelDB = new Level(publishersDatabasePath, { valueEncoding: 'json' })

const composersDatabasePath = `${appRootDir}/tmp/${clientId}_composers_mapping_${moment().format('x')}`;
const composersLevelDB = new Level(composersDatabasePath, { valueEncoding: 'json' })



// Helper function to read and parse entire CSV file using csv-parser
const readCSVFile = async (filePath, headers = null) => {
    return new Promise((resolve, reject) => {
        const results = [];
        let lineCount = 0;
        let isFirstRow = true;
        
        // Configure csv-parser to skip headers if headers are provided
        const csvOptions = headers ? { headers, skipEmptyLines: true } : { skipEmptyLines: true };
        
        fs.createReadStream(filePath)
            .pipe(csv(csvOptions))
            .on('data', (data) => {
                // Skip the first row (header) if headers are provided
                if (isFirstRow && headers) {
                    isFirstRow = false;
                    logger.info(`Skipping header row from ${filePath}`);
                    return;
                }
                
                lineCount++;
                
                // Debug: Log the first few rows to see what we're getting
                if (lineCount <= 3) {
                    logger.info(`Row ${lineCount} from ${filePath}:`, JSON.stringify(data, null, 2));
                }
                
                results.push({
                    ...data,
                    lineNumber: lineCount + 1 // +1 because we manually skipped header
                });
                
                if (lineCount % LOG_INTERVAL === 0) {
                    logger.info(`Reading CSV file ${filePath} - Read ${formatNumber(lineCount)} data rows`);
                }
            })
            .on('end', () => {
                logger.info(`Successfully read ${results.length} data rows from ${filePath}`);
                resolve(results);
            })
            .on('error', (error) => {
                logger.error(`Error reading CSV file ${filePath}: ${error.message}`);
                logger.error(`Full stack trace:`, error.stack);
                reject(error);
            });
    });
};

// Helper function to batch MongoDB operations
const batchInsert = async (collection, documents, batchSize = BATCH_SIZE, currentBatchNumber = null) => {
    if (currentBatchNumber !== null) {
        // Single batch insert with batch number
        await collection.insertMany(documents);
        logger.info(`Inserted batch ${currentBatchNumber} (${formatNumber(documents.length)} documents)`);
    } else {
        // Multiple batch insert (legacy support)
        const batches = [];
        for (let i = 0; i < documents.length; i += batchSize) {
            batches.push(documents.slice(i, i + batchSize));
        }
        
        for (let i = 0; i < batches.length; i++) {
            await collection.insertMany(batches[i]);
            logger.info(`Inserted batch ${i + 1}/${batches.length} (${formatNumber(batches[i].length)} documents)`);
        }
    }
};

const run = async () => {
    logger.info('sheerWorksIngestion.js: Started');
    logger.info(`Skipped lines will be logged to: ${ERROR_LOG_PATH}`);

    let mongoClient;
    try {
        mongoClient = await MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts());
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        logger.error(`Full stack trace:`, error.stack);
        process.exit(1);
    }
    
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    
    try {
        // Clear works collection if enabled
        if (CLEAR_WORKS_COLLECTION) {
            const existingWorksCount = await db.collection('works').countDocuments({ clientId });
            logger.info(`Clearing works collection for client ${clientId} (${formatNumber(existingWorksCount)} existing works)`);
            await db.collection('works').deleteMany({ clientId });
            logger.info('Works collection cleared successfully');
        }
        
        // 1. Process composers
        const totalComposers = await db.collection('composers').countDocuments({ clientId });
        logger.info(`${clientId} - Mapping (${formatNumber(totalComposers)} composers)`);
        let processedComposers = 0;
        const composersCursor = db.collection('composers').find({ clientId }, {
            batchSize: 1000,
            projection: { _id: 1, name: 1 },
        });

        for await (const composer of composersCursor) {
            await composersLevelDB.put(composer.name?.trim(), composer);
            processedComposers++;
            if (processedComposers % LOG_INTERVAL === 0) {
                logger.info(`${clientId} - Processed ${formatNumber(processedComposers)} of ${formatNumber(totalComposers)} composers`);
            }
        }
        
        // 1. Process publishers
        const totalPublishers = await db.collection('publishers').countDocuments({ clientId });
        logger.info(`${clientId} - Mapping (${formatNumber(totalPublishers)} publishers)`);
        let processedPublishers = 0;
        const publishersCursor = db.collection('publishers').find({ clientId }, {
            batchSize: 1000,
            projection: { _id: 1, name: 1 },
        });

        for await (const publisher of publishersCursor) {
            await publishersLevelDB.put(publisher.name?.trim(), publisher);
            processedPublishers++;
            if (processedPublishers % LOG_INTERVAL === 0) {
                logger.info(`${clientId} - Processed ${formatNumber(processedPublishers)} of ${formatNumber(totalPublishers)} publishers`);
            }
        }

        // 2. Process ip chains from multiple files
        logger.info(`Processing ip chains from ${IP_CHAIN_CSV_PATHS.length} file(s)...`);
        for (let fileIndex = 0; fileIndex < IP_CHAIN_CSV_PATHS.length; fileIndex++) {
            const ipChainCsvPath = IP_CHAIN_CSV_PATHS[fileIndex];
            logger.info(`Processing IP chain file ${fileIndex + 1}/${IP_CHAIN_CSV_PATHS.length}: ${ipChainCsvPath}`);
            
            try {
                const csvData = await readCSVFile(ipChainCsvPath, [
                    '_id', 'title', 'workMainIdentifier', 'tunecode', 'territory', 'participant1Type', 'participant1Name', 'participant1FirstName', 'participant1MiddleName', 'participant1Surname', 'participant1CaeNumber', 'participant1Controlled', 'participant1MechanicalOwned', 'participant1MechanicalCollected', 'participant1PerformanceOwned', 'participant1PerformanceCollected', 'participant1Capacity', 'participant2Type', 'participant2Name', 'participant2FirstName', 'participant2MiddleName', 'participant2Surname', 'participant2CaeNumber', 'participant2Controlled', 'participant2MechanicalOwned', 'participant2MechanicalCollected', 'participant2PerformanceOwned', 'participant2PerformanceCollected', 'participant2Capacity', 'participant3Type', 'participant3Name', 'participant3FirstName', 'participant3MiddleName', 'participant3Surname', 'participant3CaeNumber', 'participant3Controlled', 'participant3MechanicalOwned', 'participant3MechanicalCollected', 'participant3PerformanceOwned', 'participant3PerformanceCollected', 'participant3Capacity', 'participant4Type', 'participant4Name', 'participant4FirstName', 'participant4MiddleName', 'participant4Surname', 'participant4CaeNumber', 'participant4Controlled', 'participant4MechanicalOwned', 'participant4MechanicalCollected', 'participant4PerformanceOwned', 'participant4PerformanceCollected', 'participant4Capacity', 'participant5Type', 'participant5Name', 'participant5FirstName', 'participant5MiddleName', 'participant5Surname', 'participant5CaeNumber', 'participant5Controlled', 'participant5MechanicalOwned', 'participant5MechanicalCollected', 'participant5PerformanceOwned', 'participant5PerformanceCollected', 'participant5Capacity', 'participant6Type', 'participant6Name', 'participant6FirstName', 'participant6MiddleName', 'participant6Surname', 'participant6CaeNumber', 'participant6Controlled', 'participant6MechanicalOwned', 'participant6MechanicalCollected', 'participant6PerformanceOwned', 'participant6PerformanceCollected', 'participant6Capacity', 'participant7Type', 'participant7Name', 'participant7FirstName', 'participant7MiddleName', 'participant7Surname', 'participant7CaeNumber', 'participant7Controlled', 'participant7MechanicalOwned', 'participant7MechanicalCollected', 'participant7PerformanceOwned', 'participant7PerformanceCollected', 'participant7Capacity', 'participant8Type', 'participant8Name', 'participant8FirstName', 'participant8MiddleName', 'participant8Surname', 'participant8CaeNumber', 'participant8Controlled', 'participant8MechanicalOwned', 'participant8MechanicalCollected', 'participant8PerformanceOwned', 'participant8PerformanceCollected', 'participant8Capacity', 'participant9Type', 'participant9Name', 'participant9FirstName', 'participant9MiddleName', 'participant9Surname', 'participant9CaeNumber', 'participant9Controlled', 'participant9MechanicalOwned', 'participant9MechanicalCollected', 'participant9PerformanceOwned', 'participant9PerformanceCollected', 'participant9Capacity', 'participant10Type', 'participant10Name', 'participant10FirstName', 'participant10MiddleName', 'participant10Surname', 'participant10CaeNumber', 'participant10Controlled', 'participant10MechanicalOwned', 'participant10MechanicalCollected', 'participant10PerformanceOwned', 'participant10PerformanceCollected', 'participant10Capacity', 'participant11Type', 'participant11Name', 'participant11FirstName', 'participant11MiddleName', 'participant11Surname', 'participant11CaeNumber', 'participant11Controlled', 'participant11MechanicalOwned', 'participant11MechanicalCollected', 'participant11PerformanceOwned', 'participant11PerformanceCollected', 'participant11Capacity', 'participant12Type', 'participant12Name', 'participant12FirstName', 'participant12MiddleName', 'participant12Surname', 'participant12CaeNumber', 'participant12Controlled', 'participant12MechanicalOwned', 'participant12MechanicalCollected', 'participant12PerformanceOwned', 'participant12PerformanceCollected', 'participant12Capacity'
                ]);
                
                let processedIpChains = 0;
                for (const row of csvData) {
                    const { _id, title, workMainIdentifier, tunecode, territory, participant1Type, participant1Name, participant1FirstName, participant1MiddleName, participant1Surname, participant1CaeNumber, participant1Controlled, participant1MechanicalOwned, participant1MechanicalCollected, participant1PerformanceOwned, participant1PerformanceCollected, participant1Capacity, participant2Type, participant2Name, participant2FirstName, participant2MiddleName, participant2Surname, participant2CaeNumber, participant2Controlled, participant2MechanicalOwned, participant2MechanicalCollected, participant2PerformanceOwned, participant2PerformanceCollected, participant2Capacity, participant3Type, participant3Name, participant3FirstName, participant3MiddleName, participant3Surname, participant3CaeNumber, participant3Controlled, participant3MechanicalOwned, participant3MechanicalCollected, participant3PerformanceOwned, participant3PerformanceCollected, participant3Capacity, participant4Type, participant4Name, participant4FirstName, participant4MiddleName, participant4Surname, participant4CaeNumber, participant4Controlled, participant4MechanicalOwned, participant4MechanicalCollected, participant4PerformanceOwned, participant4PerformanceCollected, participant4Capacity, participant5Type, participant5Name, participant5FirstName, participant5MiddleName, participant5Surname, participant5CaeNumber, participant5Controlled, participant5MechanicalOwned, participant5MechanicalCollected, participant5PerformanceOwned, participant5PerformanceCollected, participant5Capacity, participant6Type, participant6Name, participant6FirstName, participant6MiddleName, participant6Surname, participant6CaeNumber, participant6Controlled, participant6MechanicalOwned, participant6MechanicalCollected, participant6PerformanceOwned, participant6PerformanceCollected, participant6Capacity, participant7Type, participant7Name, participant7FirstName, participant7MiddleName, participant7Surname, participant7CaeNumber, participant7Controlled, participant7MechanicalOwned, participant7MechanicalCollected, participant7PerformanceOwned, participant7PerformanceCollected, participant7Capacity, participant8Type, participant8Name, participant8FirstName, participant8MiddleName, participant8Surname, participant8CaeNumber, participant8Controlled, participant8MechanicalOwned, participant8MechanicalCollected, participant8PerformanceOwned, participant8PerformanceCollected, participant8Capacity, participant9Type, participant9Name, participant9FirstName, participant9MiddleName, participant9Surname, participant9CaeNumber, participant9Controlled, participant9MechanicalOwned, participant9MechanicalCollected, participant9PerformanceOwned, participant9PerformanceCollected, participant9Capacity, participant10Type, participant10Name, participant10FirstName, participant10MiddleName, participant10Surname, participant10CaeNumber, participant10Controlled, participant10MechanicalOwned, participant10MechanicalCollected, participant10PerformanceOwned, participant10PerformanceCollected, participant10Capacity, participant11Type, participant11Name, participant11FirstName, participant11MiddleName, participant11Surname, participant11CaeNumber, participant11Controlled, participant11MechanicalOwned, participant11MechanicalCollected, participant11PerformanceOwned, participant11PerformanceCollected, participant11Capacity, participant12Type, participant12Name, participant12FirstName, participant12MiddleName, participant12Surname, participant12CaeNumber, participant12Controlled, participant12MechanicalOwned, participant12MechanicalCollected, participant12PerformanceOwned, participant12PerformanceCollected, participant12Capacity, lineNumber } = row;
                    
                    const ipChain = {
                        line: lineNumber,
                        _id,
                        title,
                        identifier: workMainIdentifier,
                        tunecode,
                        participant1Type,
                        participant1Name,
                        participant1FirstName,
                        participant1MiddleName,
                        participant1Surname,
                        participant1CaeNumber,
                        participant1Controlled: participant1Controlled === 'TRUE',
                        participant1MechanicalOwned,
                        participant1MechanicalCollected,
                        participant1PerformanceOwned,
                        participant1PerformanceCollected,
                        participant1Capacity,
                        participant2Type,
                        participant2Name,
                        participant2FirstName,
                        participant2MiddleName,
                        participant2Surname,
                        participant2CaeNumber,
                        participant2Controlled: participant2Controlled === 'TRUE',
                        participant2MechanicalOwned,
                        participant2MechanicalCollected,
                        participant2PerformanceOwned,
                        participant2PerformanceCollected,
                        participant2Capacity,
                        participant3Type,
                        participant3Name,
                        participant3FirstName,
                        participant3MiddleName,
                        participant3Surname,
                        participant3CaeNumber,
                        participant3Controlled: participant3Controlled === 'TRUE',
                        participant3MechanicalOwned,
                        participant3MechanicalCollected,
                        participant3PerformanceOwned,
                        participant3PerformanceCollected,
                        participant3Capacity,
                        participant4Type,
                        participant4Name,
                        participant4FirstName,
                        participant4MiddleName,
                        participant4Surname,
                        participant4CaeNumber,
                        participant4Controlled: participant4Controlled === 'TRUE',
                        participant4MechanicalOwned,
                        participant4MechanicalCollected,
                        participant4PerformanceOwned,
                        participant4PerformanceCollected,
                        participant4Capacity,
                        participant5Type,
                        participant5Name,
                        participant5FirstName,
                        participant5MiddleName,
                        participant5Surname,
                        participant5CaeNumber,
                        participant5Controlled: participant5Controlled === 'TRUE',
                        participant5MechanicalOwned,
                        participant5MechanicalCollected,
                        participant5PerformanceOwned,
                        participant5PerformanceCollected,
                        participant5Capacity,
                        participant6Type,
                        participant6Name,
                        participant6FirstName,
                        participant6MiddleName,
                        participant6Surname,
                        participant6CaeNumber,
                        participant6Controlled: participant6Controlled === 'TRUE',
                        participant6MechanicalOwned,
                        participant6MechanicalCollected,
                        participant6PerformanceOwned,
                        participant6PerformanceCollected,
                        participant6Capacity,
                        participant7Type,
                        participant7Name,
                        participant7FirstName,
                        participant7MiddleName,
                        participant7Surname,
                        participant7CaeNumber,
                        participant7Controlled: participant7Controlled === 'TRUE',
                        participant7MechanicalOwned,
                        participant7MechanicalCollected,
                        participant7PerformanceOwned,
                        participant7PerformanceCollected,
                        participant7Capacity,
                        participant8Type,
                        participant8Name,
                        participant8FirstName,
                        participant8MiddleName,
                        participant8Surname,
                        participant8CaeNumber,
                        participant8Controlled: participant8Controlled === 'TRUE',
                        participant8MechanicalOwned,
                        participant8MechanicalCollected,
                        participant8PerformanceOwned,
                        participant8PerformanceCollected,
                        participant8Capacity,
                        participant9Type,
                        participant9Name,
                        participant9FirstName,
                        participant9MiddleName,
                        participant9Surname,
                        participant9CaeNumber,
                        participant9Controlled: participant9Controlled === 'TRUE',
                        participant9MechanicalOwned,
                        participant9MechanicalCollected,
                        participant9PerformanceOwned,
                        participant9PerformanceCollected,
                        participant9Capacity,
                        participant10Type,
                        participant10Name,
                        participant10FirstName,
                        participant10MiddleName,
                        participant10Surname,
                        participant10CaeNumber,
                        participant10Controlled: participant10Controlled === 'TRUE',
                        participant10MechanicalOwned,
                        participant10MechanicalCollected,
                        participant10PerformanceOwned,
                        participant10PerformanceCollected,
                        participant10Capacity,
                        participant11Type,
                        participant11Name,
                        participant11FirstName,
                        participant11MiddleName,
                        participant11Surname,
                        participant11CaeNumber,
                        participant11Controlled: participant11Controlled === 'TRUE',
                        participant11MechanicalOwned,
                        participant11MechanicalCollected,
                        participant11PerformanceOwned,
                        participant11PerformanceCollected,
                        participant11Capacity,
                        participant12Type,
                        participant12Name,
                        participant12FirstName,
                        participant12MiddleName,
                        participant12Surname,
                        participant12CaeNumber,
                        participant12Controlled: participant12Controlled === 'TRUE',
                        participant12MechanicalOwned,
                        participant12MechanicalCollected,
                        participant12PerformanceOwned,
                        participant12PerformanceCollected,
                        participant12Capacity
                    };
                    
                    if (territory !== 'WW' && territory.toLowerCase() !== 'world') {
                        ipChain.territory = 'specific';
                        ipChain.territoryCodes = {
                            name: territory?.split(';').join(','),
                            codes: territory?.split(';') || [],
                        }
                    } else {
                        ipChain.territory = 'WW';
                    }
                    
                    // Skip if workMainIdentifier is missing or empty
                    if (!workMainIdentifier || workMainIdentifier.trim() === '') {
                        writeSkippedLine(`Skipping ip chain line ${lineNumber} from file ${ipChainCsvPath}: missing workMainIdentifier`);
                        continue;
                    }
                    
                    // Get existing ip chains or create new array
                    let ipChains = [];
                    try {
                        ipChains = await ipChainLevelDB.get(workMainIdentifier?.trim()) || [];
                    } catch (error) {
                        // Key doesn't exist yet, start with empty array
                    }
                    
                    // Add new ip chain
                    ipChains.push(ipChain);
                    // Write back to LevelDB
                    await ipChainLevelDB.put(workMainIdentifier?.trim(), ipChains);
                    
                    processedIpChains++;
                    
                    // Log processing progress
                    if (processedIpChains % LOG_INTERVAL === 0) {
                        logger.info(`Processing IP chains from ${ipChainCsvPath} - Processed ${formatNumber(processedIpChains)} IP chains`);
                    }
                }
                
                logger.info(`Completed processing IP chain file ${fileIndex + 1}/${IP_CHAIN_CSV_PATHS.length}: Processed ${formatNumber(processedIpChains)} IP chains from ${csvData.length} rows`);
            } catch (error) {
                logger.error(`Error processing IP chain file ${ipChainCsvPath}: ${error.message}`);
                logger.error(`Full stack trace:`, error.stack);
            }
        }


        // 3. Process contracts
        const totalContracts = await db.collection('contracts').countDocuments({ clientId });
        logger.info(`${clientId} - Mapping (${formatNumber(totalContracts)} contracts)`);
        let processedContracts = 0;
        const contractsCursor = db.collection('contracts').find({ clientId }, {
            batchSize: 1000,
            projection: { _id: 1, name: 1 },
        });
      
        for await (const contract of contractsCursor) {
            await contractsLevelDB.put(contract.name, contract);
            processedContracts++;
            if (processedContracts % LOG_INTERVAL === 0) {
                logger.info(`${clientId} - Processed ${formatNumber(processedContracts)} of ${formatNumber(totalContracts)} contracts`);
            }
        }
        
        // 4. Process tracks
        const totalTracks = await db.collection('tracks').countDocuments({ clientId });
        logger.info(`${clientId} - Mapping (${formatNumber(totalTracks)} tracks)`);
        let processedTracks = 0;
        const tracksCursor = db.collection('tracks').find({ clientId }, {
            batchSize: 1000,
            projection: { _id: 1, isrc: 1, title: 1 },
        });
      
        for await (const track of tracksCursor) {
            if (track.isrc) {
                await tracksLevelDB.put(track.isrc, track);
                processedTracks++;
            }
            if (processedTracks % LOG_INTERVAL === 0) {
                logger.info(`${clientId} - Processed ${formatNumber(processedTracks)} of ${formatNumber(totalTracks)} tracks`);
            }
        }

        // 5. Process alternate titles from multiple files
        logger.info(`Processing alternate titles from ${ALTERNATE_TITLES_CSV_PATHS.length} file(s)...`);
        for (let fileIndex = 0; fileIndex < ALTERNATE_TITLES_CSV_PATHS.length; fileIndex++) {
            const alternateTitlesCsvPath = ALTERNATE_TITLES_CSV_PATHS[fileIndex];
            logger.info(`Processing alternate titles file ${fileIndex + 1}/${ALTERNATE_TITLES_CSV_PATHS.length}: ${alternateTitlesCsvPath}`);
            
            try {
                const csvData = await readCSVFile(alternateTitlesCsvPath, [
                    'workId', 'workTitle', 'workMainIdentifier', 'workTunecode', 'alternateTitle', 'language'
                ]);
                
                let processedAlternateTitles = 0;
                for (const row of csvData) {
                    const { workId, workTitle, workMainIdentifier, workTunecode, alternateTitle, language, lineNumber } = row;
                    
                    // Skip if workMainIdentifier is missing or empty
                    if (!workMainIdentifier || workMainIdentifier.trim() === '') {
                        writeSkippedLine(`Skipping alternate title line ${lineNumber} from file ${alternateTitlesCsvPath}: missing workMainIdentifier`);
                        continue;
                    }
                    
                    // Get existing titles or create new array
                    let titles = [];
                    try {
                        titles = await alternateTitlesLevelDB.get(workMainIdentifier?.trim()) || [];
                    } catch (error) {
                        // Key doesn't exist yet, start with empty array
                    }
                    
                    // Add new title
                    titles.push({ title: alternateTitle, language });
                    // Write back to LevelDB
                    await alternateTitlesLevelDB.put(workMainIdentifier?.trim(), titles);
                    
                    processedAlternateTitles++;
                    
                    // Log processing progress
                    if (processedAlternateTitles % LOG_INTERVAL === 0) {
                        logger.info(`Processing alternate titles from ${alternateTitlesCsvPath} - Processed ${formatNumber(processedAlternateTitles)} alternate titles`);
                    }
                }
                
                logger.info(`Completed processing alternate titles file ${fileIndex + 1}/${ALTERNATE_TITLES_CSV_PATHS.length}: Processed ${formatNumber(processedAlternateTitles)} alternate titles from ${csvData.length} rows`);
            } catch (error) {
                logger.error(`Error processing alternate titles file ${alternateTitlesCsvPath}: ${error.message}`);
                logger.error(`Full stack trace:`, error.stack);
            }
        }
        
        // 6. Process participators from multiple files
        logger.info(`Processing participators from ${PARTICIPATORS_CSV_PATHS.length} file(s)...`);
        for (let fileIndex = 0; fileIndex < PARTICIPATORS_CSV_PATHS.length; fileIndex++) {
            const participatorsCsvPath = PARTICIPATORS_CSV_PATHS[fileIndex];
            logger.info(`Processing participators file ${fileIndex + 1}/${PARTICIPATORS_CSV_PATHS.length}: ${participatorsCsvPath}`);
            
            try {
                const csvData = await readCSVFile(participatorsCsvPath, [
                    'workId', 'workTitle', 'workMainIdentifier', 'workTunecode', 'contract', 'rate'
                ]);
                
                let processedParticipators = 0;
                for (const row of csvData) {
                    const { workId, workTitle, workMainIdentifier, workTunecode, contract, rate, lineNumber } = row;
                    
                    // Skip if workMainIdentifier is missing or empty
                    if (!workMainIdentifier || workMainIdentifier.trim() === '') {
                        writeSkippedLine(`Skipping participator line ${lineNumber} from file ${participatorsCsvPath}: missing workMainIdentifier`);
                        continue;
                    }
                    
                    // Get existing participators or create new array
                    let participators = [];
                    try {
                        participators = await participatorsLevelDB.get(workMainIdentifier?.trim()) || [];
                    } catch (error) {
                        // Key doesn't exist yet, start with empty array
                    }
                    
                    // Add new participator
                    participators.push({ contract, rate });
                    
                    // Write back to LevelDB
                    await participatorsLevelDB.put(workMainIdentifier?.trim(), participators);
                    
                    processedParticipators++;
                    
                    // Log processing progress
                    if (processedParticipators % LOG_INTERVAL === 0) {
                        logger.info(`Processing participators from ${participatorsCsvPath} - Processed ${formatNumber(processedParticipators)} participators`);
                    }
                }
                
                logger.info(`Completed processing participators file ${fileIndex + 1}/${PARTICIPATORS_CSV_PATHS.length}: Processed ${formatNumber(processedParticipators)} participators from ${csvData.length} rows`);
            } catch (error) {
                logger.error(`Error processing participators file ${participatorsCsvPath}: ${error.message}`);
                logger.error(`Full stack trace:`, error.stack);
            }
        }
        
        // 7. Process society identifiers from multiple files
        logger.info(`Processing society identifiers from ${SOCIETY_IDENTIFIERS_CSV_PATHS.length} file(s)...`);
        for (let fileIndex = 0; fileIndex < SOCIETY_IDENTIFIERS_CSV_PATHS.length; fileIndex++) {
            const societyIdentifiersCsvPath = SOCIETY_IDENTIFIERS_CSV_PATHS[fileIndex];
            logger.info(`Processing society identifiers file ${fileIndex + 1}/${SOCIETY_IDENTIFIERS_CSV_PATHS.length}: ${societyIdentifiersCsvPath}`);
            
            try {
                const csvData = await readCSVFile(societyIdentifiersCsvPath, [
                    'workId', 'workTitle', 'workMainIdentifier', 'workTunecode', 'society', 'identifier'
                ]);
                
                let processedSocietyIdentifiers = 0;
                for (const row of csvData) {
                    const { workId, workTitle, workMainIdentifier, workTunecode, society, identifier, lineNumber } = row;
                    
                    // Skip if workMainIdentifier is missing or empty
                    if (!workMainIdentifier || workMainIdentifier.trim() === '') {
                        writeSkippedLine(`Skipping society identifier line ${lineNumber} from file ${societyIdentifiersCsvPath}: missing workMainIdentifier`);
                        continue;
                    }
                    
                    // Get existing identifiers or create new array
                    let identifiers = [];
                    try {
                        identifiers = await societyIdentifiersLevelDB.get(workMainIdentifier?.trim()) || [];
                    } catch (error) {
                        // Key doesn't exist yet, start with empty array
                    }
                    
                    // Add new identifier
                    identifiers.push({ society, identifier });
                    
                    // Write back to LevelDB
                    await societyIdentifiersLevelDB.put(workMainIdentifier?.trim(), identifiers);
                    
                    processedSocietyIdentifiers++;
                    
                    // Log processing progress
                    if (processedSocietyIdentifiers % LOG_INTERVAL === 0) {
                        logger.info(`Processing society identifiers from ${societyIdentifiersCsvPath} - Processed ${formatNumber(processedSocietyIdentifiers)} society identifiers`);
                    }
                }
                
                logger.info(`Completed processing society identifiers file ${fileIndex + 1}/${SOCIETY_IDENTIFIERS_CSV_PATHS.length}: Processed ${formatNumber(processedSocietyIdentifiers)} society identifiers from ${csvData.length} rows`);
            } catch (error) {
                logger.error(`Error processing society identifiers file ${societyIdentifiersCsvPath}: ${error.message}`);
                logger.error(`Full stack trace:`, error.stack);
            }
        }
        
        // 8. Process works with batching from multiple files
        logger.info(`Processing works from ${WORKS_CSV_PATHS.length} file(s)...`);
        const worksToInsert = [];
        let validWorks = 0;
        let worksLineCount = 0;
        let batchNumber = 0;
        
        for (let fileIndex = 0; fileIndex < WORKS_CSV_PATHS.length; fileIndex++) {
            const worksCsvPath = WORKS_CSV_PATHS[fileIndex];
            logger.info(`Processing works file ${fileIndex + 1}/${WORKS_CSV_PATHS.length}: ${worksCsvPath}`);
            
            try {
                const csvData = await readCSVFile(worksCsvPath, [
                    'id', 'title', 'composers', 'foreignId', 'projectId', 'partyNo', 'mainIdentifier', 'iswc', 'tunecode', 'copyrightDate', 'labelCopy', 'priorityWork', 'productionLibraryWork', 'category', 'language', 'compositeType', 'noOfCompositeWorks', 'workVersion', 'arrangementType', 'lyricAdaption', 'performers', 'trackIsrcs', 'territories', 'catalogueGroups', 'aliases', 'notes'
                ]);
                
                for (const row of csvData) {
                    worksLineCount++;
                    const { id, title, composers, foreignId, projectId, partyNo, mainIdentifier, iswc, tunecode, copyrightDate, labelCopy, priorityWork, productionLibraryWork, category, language, compositeType, noOfCompositeWorks, workVersion, arrangementType, lyricAdaption, performers, trackIsrcs, territories, catalogueGroups, aliases, notes, lineNumber } = row;

                    // Skip if both title and mainIdentifier are missing
                    if ((!title || title.trim() === '') && (!mainIdentifier || mainIdentifier.trim() === '')) {
                        writeSkippedLine(`Skipping work line ${lineNumber} from file ${worksCsvPath}: missing both title and mainIdentifier`);
                        continue;
                    }
                    
                    validWorks++;
                    const work = await processWork({ db, id, title, composers, foreignId, projectId, partyNo, mainIdentifier, iswc, tunecode, copyrightDate, labelCopy, priorityWork, productionLibraryWork, category, language, compositeType, noOfCompositeWorks, workVersion, arrangementType, lyricAdaption, performers, trackIsrcs, territories, catalogueGroups, aliases, notes });
                    worksToInsert.push(work);
                    
                    // Log processing progress
                    if (validWorks % LOG_INTERVAL === 0) {
                        logger.info(`Processing works from ${worksCsvPath} - Processed ${formatNumber(validWorks)} works`);
                    }
                    
                    // Insert in batches
                    if (worksToInsert.length >= BATCH_SIZE) {
                        batchNumber++;
                        await batchInsert(db.collection('works'), worksToInsert, BATCH_SIZE, batchNumber);
                        worksToInsert.length = 0; // Clear array
                    }
                }
                
                logger.info(`Completed processing works file ${fileIndex + 1}/${WORKS_CSV_PATHS.length}: ${csvData.length} rows`);
            } catch (error) {
                logger.error(`Error processing works file ${worksCsvPath}: ${error.message}`);
                logger.error(`Full stack trace:`, error.stack);
            }
        }
        
        // Insert remaining works
        if (worksToInsert.length > 0) {
            batchNumber++;
            await batchInsert(db.collection('works'), worksToInsert, BATCH_SIZE, batchNumber);
        }
        
        logger.info(`${clientId} - Successfully processed ${formatNumber(validWorks)} works from ${formatNumber(worksLineCount)} total rows across ${WORKS_CSV_PATHS.length} file(s)`);
        logger.info('Finished importing works');
        
    } catch (error) {
        logger.error(`Error in main processing: ${error.message}`);
        logger.error(`Full stack trace:`, error.stack);
        throw error; // Re-throw to ensure proper cleanup
    } finally {
        // Clean up LevelDB instances
        try {
            await contractsLevelDB.close();
            await tracksLevelDB.close();
            await alternateTitlesLevelDB.close();
            await societyIdentifiersLevelDB.close();
            await participatorsLevelDB.close();
            await ipChainLevelDB.close();
            await publishersLevelDB.close();
            await composersLevelDB.close();
        } catch (error) {
            logger.warn('Error closing LevelDB instances:', error.message);
        }
        
        // Delete LevelDB data directories
        try {
            fs.rmSync(contractsDatabasePath, { recursive: true, force: true });
            fs.rmSync(tracksDatabasePath, { recursive: true, force: true });
            fs.rmSync(alternateTitlesDatabasePath, { recursive: true, force: true });
            fs.rmSync(societyIdentifiersDatabasePath, { recursive: true, force: true });
            fs.rmSync(participatorsDatabasePath, { recursive: true, force: true });
            fs.rmSync(ipChainDatabasePath, { recursive: true, force: true });
            fs.rmSync(publishersDatabasePath, { recursive: true, force: true });
            fs.rmSync(composersDatabasePath, { recursive: true, force: true });
            logger.info('LevelDB data directories cleaned up successfully');
        } catch (error) {
            logger.warn('Failed to clean up some LevelDB directories:', error.message);
        }
        
        try {
            await mongoClient.close();
        } catch (error) {
            logger.warn('Error closing MongoDB connection:', error.message);
        }
    }
}

// Global error handlers for better debugging
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error('Full stack trace:', reason?.stack);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error.message);
    logger.error('Full stack trace:', error.stack);
    process.exit(1);
});

run();

function parseDDMMYYYYToUTC(value) {
  if (typeof value !== 'string') return value;

  if (value instanceof Date) {
    return value;
  }

  const [day, month, year] = value.trim().split('/').map(Number);
  if (!day || !month || !year) return null;

  return new Date(Date.UTC(year, month - 1, day));
}
const processWork = async ({ db, id, title, composers, foreignId, projectId, partyNo, mainIdentifier, iswc, tunecode, copyrightDate, labelCopy, priorityWork, productionLibraryWork, category, language, compositeType, noOfCompositeWorks, workVersion, arrangementType, lyricAdaption, performers, trackIsrcs, territories, catalogueGroups, aliases, notes }) => {
    try {
    const work = {
        clientId,
        title,
        composer: composers?.split('/').join(', ') || '',
        foreignId,
        projectId,
        partyNo: partyNo ? parseInt(partyNo) : null,
        identifier: mainIdentifier,
        iswc,
        tunecode,
        copyrightDate: copyrightDate ? parseDDMMYYYYToUTC(copyrightDate) : null,
        labelCopy,
        priority: priorityWork === 'TRUE',
        productionLibrary: productionLibraryWork === 'TRUE',
        workDescriptionCategory: category,
        workLanguage: language,
        compositeType: compositeType,
        compositeCount: noOfCompositeWorks,
        versionType: workVersion,
        arrangementType,
        lyricAdaptionType: lyricAdaption,
        performers: performers?.split(';') || [],
        catalogueGroups: catalogueGroups?.split(';') || [],
        aliases: aliases?.split(';') || [],
        notes
    };
    
    // Map territories
    if (territories === 'WW' || territories?.toLowerCase() === 'world') {
        work.territories = TerritoryHelper.allTerritories;
    } else {
        work.territories = territories?.split(';') || [];
    }
    
    // Get tracks
    work.trackIds = [];
    for (const trackIsrc of trackIsrcs?.split(';') || []) {
        const track = await tracksLevelDB.get(trackIsrc);
        const trackId = track ? track._id : null;
        if (trackId) {
            work.trackIds.push(trackId);
        }

    }

    // Add alternate titles - now using array structure
    try {
        work.alternateTitles = await alternateTitlesLevelDB.get(mainIdentifier?.trim()) || [];
    } catch (error) {
        work.alternateTitles = [];
    }
    
    // Add society identifiers - now using array structure
    try {
        work.societyIdentifiers = await societyIdentifiersLevelDB.get(mainIdentifier?.trim()) || [];
    } catch (error) {
        work.societyIdentifiers = [];
    }
    
    // Add contracts to work.salesReturnsRights - optimized with Promise.all
    try {
        const participators = await participatorsLevelDB.get(mainIdentifier?.trim()) || [];
        work.salesReturnsRights = [];
        work.salesReturnsRightsDisplay= [];
        for (const participator of participators) {
            const contract = await contractsLevelDB.get(participator.contract);
            if (contract) {
                work.salesReturnsRights.push({ contractId: contract._id, percentage: participator.rate ? parseFloat(participator.rate) : 0 });
                work.salesReturnsRightsDisplay.push({ contractId: contract._id, percentage: participator.rate ? parseFloat(participator.rate) : 0 });
            }
        }
    } catch (error) {
        work.salesReturnsRights = [];
    }

    // Add IP chains
    await addIpChains(work);

    // Calculate total participation
    calculateTotalParticipation(work);

    // Calculate total collection
    calculateTotalCollection(work);

    // Check if work is valid
    checkValidationErrors(work);

    if (work.valid) {
        work.approvedDate = Date.now();
        work.approvalStatus = 'Approved';
    }
    return work;
    } catch (error) {
        logger.error(`Error processing work with identifier ${mainIdentifier}: ${error.message}`);
        logger.error(`Full stack trace:`, error.stack);
        throw error;
    }
}


const addIpChains = async (work) => {
    try {
        if (!work.identifier) { return; }

        work.rightsChain = []
        const workIpChains = await ipChainLevelDB.get(work.identifier?.trim()) || [];
        
        if (!workIpChains?.length) { return; }
    
    for (const chain of workIpChains) {
        // If territory is WW map to all territories
        if (chain.territory === 'WW' || chain.territory?.toLowerCase() === 'world') {
            chain.territory = TerritoryHelper.allTerritories;
        }

        let formattedChainTerritoryIndex = 0;
        let formattedChainTerritoryChildIndex = 0;
       
        let isTerritoryAlreadyAdded = false;
        work.rightsChain.map((formattedChain, index) => {
            if ((formattedChain.territory !== 'specific' && formattedChain.territory === chain.territory) || (formattedChain.territory === 'specific' && formattedChain?.territoryCodes?.name === chain.territoryCodes?.name)) {
            // Territory already added to the list, add chain to it where the same
            formattedChain.children.push({
                type: chain.participant1Type,
                name: chain.participant1Name,
                firstName: chain.participant1FirstName,
                middleName: chain.participant1MiddleName,
                surname: chain.participant1Surname,
                caeNumber: chain.participant1CaeNumber,
                controlled: chain.participant1Controlled,
                mechanicalOwnership: chain.participant1MechanicalOwned,
                mechanicalCollection: chain.participant1MechanicalCollected,
                performanceOwnership: chain.participant1PerformanceOwned,
                performanceCollection: chain.participant1PerformanceCollected,
                contractType: chain.participant1Capacity,
                children: [],
                index: chain.index,
            });

            isTerritoryAlreadyAdded = true;
            formattedChainTerritoryIndex = index;
            formattedChainTerritoryChildIndex = formattedChain.children.length - 1;
            }
        });

        if (!isTerritoryAlreadyAdded) {
            // Territory not added, add new one and add the chain to it.
            work.rightsChain.push({
            territory: chain.territory,
            territoryCodes: chain.territoryCodes,
            children: [{
                type: chain.participant1Type,
                name: chain.participant1Name,
                firstName: chain.participant1FirstName,
                middleName: chain.participant1MiddleName,
                surname: chain.participant1Surname,
                caeNumber: chain.participant1CaeNumber,
                controlled: chain.participant1Controlled,
                mechanicalOwnership: chain.participant1MechanicalOwned,
                mechanicalCollection: chain.participant1MechanicalCollected,
                performanceOwnership: chain.participant1PerformanceOwned,
                performanceCollection: chain.participant1PerformanceCollected,
                contractType: chain.participant1Capacity,
                children: [],
                index: chain.index,
            }],
            });
            formattedChainTerritoryIndex = work.rightsChain.length - 1;
            formattedChainTerritoryChildIndex = 0;
        }

        // Reunite children with their parents
        work.rightsChain[formattedChainTerritoryIndex].children[formattedChainTerritoryChildIndex].children = getParentsChildren(2, chain);
        // Set template line number against parent
        work.rightsChain[formattedChainTerritoryIndex].line = chain.line;

    }

    if (work.rightsChain && work.rightsChain.length > 0) {
        // Loop through territories and combine parents
        work.rightsChain.map((chain) => {
        chain.children = chain?.children?.length > 0 ? IpChainUtils.combineDuplicatePublishers(chain.children) : chain.children;
        });
        
        work.rightsChain.map((chain) => {
        combineChildComposers(chain, chain.line);
        });
        
        // Clear line number from previous function
        work.rightsChain.forEach((chain) => {
        if (chain.line || chain.line === 0) { delete chain.line; }
        });

        for await (const chain of work.rightsChain) {
            await mapToPublisherOrComposer(chain, clientId);
        }

        work.rightsChain.forEach((chain) => {
        roundIpChainShares(chain);
        });
        
    }
    } catch (error) {
        logger.error(`Error adding IP chains for work ${work.identifier}: ${error.message}`);
        logger.error(`Full stack trace:`, error.stack);
        throw error;
    }
}

const getParentsChildren = (startIndex, chain) => {
    if (chain[`participant${startIndex}Type`]
        || chain[`participant${startIndex}Name`]
        || chain[`participant${startIndex}FirstName`]
        || chain[`participant${startIndex}MiddleName`]
        || chain[`participant${startIndex}Surname`]
        || chain[`participant${startIndex}CaeNumber`]
        || chain[`participant${startIndex}Controlled`]
        || chain[`participant${startIndex}MechanicalOwned`]
        || chain[`participant${startIndex}MechanicalCollected`]
        || chain[`participant${startIndex}PerformanceOwned`]
        || chain[`participant${startIndex}PerformanceCollected`]
        || chain[`participant${startIndex}Capacity`]) {
        return [{
        type: chain[`participant${startIndex}Type`],
        name: chain[`participant${startIndex}Name`],
        firstName: chain[`participant${startIndex}FirstName`],
        middleName: chain[`participant${startIndex}MiddleName`],
        surname: chain[`participant${startIndex}Surname`],
        caeNumber: chain[`participant${startIndex}CaeNumber`],
        controlled: chain[`participant${startIndex}Controlled`],
        mechanicalOwnership: chain[`participant${startIndex}MechanicalOwned`],
        mechanicalCollection: chain[`participant${startIndex}MechanicalCollected`],
        performanceOwnership: chain[`participant${startIndex}PerformanceOwned`],
        performanceCollection: chain[`participant${startIndex}PerformanceCollected`],
        contractType: chain[`participant${startIndex}Capacity`],
        children: getParentsChildren(startIndex + 1, chain),
        index: chain.index,
        }];
    }
    return [];
}

const combineChildComposers = (chain, lineNumber) => {
    chain.children.map((child) => {
      if (child.type === 'Composer' && child.children.length > 0) {
        child.children.map((subchild) => {
          if (subchild.type === 'Publisher') {
            writeSkippedLine(`IP Chains Line ${lineNumber}: Publishers should not follow Composers in the chain`);
          }
        });
        combineChildComposers(child, lineNumber);
        chain.children = chain.children.concat(child.children);
        child.children = [];
      }
    });
  
    chain.children.map((child) => {
      combineChildComposers(child, lineNumber);
    });
  }

  const mapToPublisherOrComposer = async (chain, clientId) => {
    if (chain.children) {
        for await (const child of chain.children) {
            if (child.type === 'Publisher' && child.name) {
                const publisher = await publishersLevelDB.get(child.name?.trim());
                if (publisher) {
                    child.publisherId = publisher._id.toString();
                } else {
                    writeSkippedLine(`Could not find a publisher with name ${child.name} in the database`);
                }
            } else if (child.type === 'Composer' && child.name) {
                const composer = await composersLevelDB.get(child.name?.trim());
                if (composer) {
                    child.composerId = composer._id.toString();
                } else {
                    writeSkippedLine(`Could not find a composer with name ${child.name} in the database`);
                }
            }
      
            if (child.children) {
              await mapToPublisherOrComposer(child, clientId);
            }
            
        }
    }
  }

  const roundIpChainShares = (chain) => {
    if (chain.children) {
      chain.children.forEach((child) => {
        child.mechanicalOwnership = roundSingleIpChainShare(child.mechanicalOwnership);
        child.mechanicalCollection = roundSingleIpChainShare(child.mechanicalCollection);
        child.performanceOwnership = roundSingleIpChainShare(child.performanceOwnership);
        child.performanceCollection = roundSingleIpChainShare(child.performanceCollection);
  
        // Do the same for the children's children
        roundIpChainShares(child);
      });
    }
  }



const roundSingleIpChainShare = (share) => {
    if (!share) { return share; }
    const roundedShare = Math.round(share * 100) / 100;
    return roundedShare;
}


const calculateTotalCollection = (work) => {
    let collectionCalculated = false;
  
    work.totalCollection = { totalOwnedMechanical: 0, totalOwnedPerformance: 0 };
    work.rightsChain.forEach((chain) => {
      if (isAnyOfTheChildrenCollected(chain) && !collectionCalculated) {
        work.totalCollection.totalOwnedMechanical = Math.round(sumValueInIpChainChildren(chain, 'mechanicalCollection', 0) * 100) / 100;
        work.totalCollection.totalOwnedPerformance = Math.round(sumValueInIpChainChildren(chain, 'performanceCollection', 0) * 100) / 100;
        collectionCalculated = true;
      }
    });
  };

  
const calculateTotalParticipation = (work) => {
    // Reset participation to 0
    work.totalParticipation = 0;
    if (work.salesReturnsRights) {
      // Loop through rights
      work.salesReturnsRights.forEach((line) => {
        let percentage = 0;
        if (line.percentage) {
          // Round to 4 decimal places
          percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
        }
        work.totalParticipation += percentage;
      });
    }
    // Round final number to 4 decimal places
    work.totalParticipation = Math.round((work.totalParticipation + Number.EPSILON) * 10000) / 10000;
  };


const checkValidationErrors = (work) => {
    // Reset work validations errors array
    work.validationErrors = [];
    
    // Check Title
    if (!work.title) {
      work.validationErrors.push('Work title is required');
    }
    
    // check ISWC
    if (work.iswc) {
      const dashedFormat = /T-\d{9}-\d{1}$/;
      const compactFormat = /T\d{10}$/;
      if (!dashedFormat.test(work.iswc) && !compactFormat.test(work.iswc)) work.validationErrors.push('ISWC must be valid');
    }
    
    if (work.territories.length === 0) {
      work.validationErrors.push('At least one territory needs to be selected');
    }
    
    if (work?.rightsChain?.length > 0) {
      if (!IpChainUtils.checkChainsHaveTerritory(work.rightsChain)) {
        work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.ChainRequiresTerritory));
      }
    }
    
    if (work.versionType === 'Modification' && !work.arrangementType) {
      work.validationErrors.push('Arrangement Type is required');
    }

    // Recalculate IP Chains totals
    recalculateIpChainsTotals(work);
    
    // Check IP Chains totals
    const checkChain = (chain, isPartnerChain) => {
      if (chain) {
        if (chain.totalMechanicalOwnership < 99.94 || chain.totalMechanicalOwnership > 100.06) {
          work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MechanicalOwnershipNot100, isPartnerChain));
        }
        if (chain.totalPerformanceOwnership < 99.94 || chain.totalPerformanceOwnership > 100.06) {
          work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.PerformanceOwnershipNot100, isPartnerChain));
        }
        if (chain.totalMechanicalCollection < 99.94 || chain.totalMechanicalCollection > 100.06) {
          work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MechanicalCollectionNot100, isPartnerChain));
        }
        if (chain.totalPerformanceCollection < 99.94 || chain.totalPerformanceCollection > 100.06) {
          work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.PerformanceCollectionNot100, isPartnerChain));
        }
      }
    };

    work?.rightsChain?.forEach((chain) => checkChain(chain, false));


    // rights chains - Check each chain is complete and not empty
    if (WorkValidation.hasEmptyChains(work.rightsChain)) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.EmptyChain, false));
    }
    
    // Check controlled chains
    checkIpChainsAreControlled(work);
    
    // Default chain
    if (!work.hasAtLeastOneChainControlled) work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MissingControlledChain));
    if (!work.allControlledChainsHaveControlledChildren) work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.AllChildrenMustBeControlled));
    
    // Check ip chains capacity
    checkAllIPChainItemsHaveCapacity(work);
    
    if (!work.allItemsHaveCapacity) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MissingContractType));
    }
    
    // Check publishers end with composers
    checkAllIPChainPublishersEndWithAComposer(work);
    
    if (!work.allPublishersEndWithComposers) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MissingComposerInControlledChain));
    }
    
    // Check controlled composers have controlled publisher
    checkIpChainsComposersAreLinkedControlledPublishers(work);
    
    if (work.controlledComposersChainsWithoutControlledPublisher) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.ControlledComposerRequiresControlledPublisher));
    }

    // Check Owned Shares cannot be assigned to Admins, Sub-Publishers or Income Participants
    checkAllIPChainNonCopyrightHoldersOwnedShares(work);

    if (!work.allIPChainNonCopyrightHoldersOwnedSharesZero) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.NoOwnedSharesForPublisherTypes));
    }

    // Check perf. ownership shares
    checkAllIPChainPerformanceOwnershipShares(work);

    if (!work.allSharesBelow51) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.PerformanceOwnershipGreaterThan50));
    }

    // Check perf. ownership shares
    checkAllIPChainPerformanceCollectionShares(work);

    if (!work.allCollectionSharesBelow51) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.PerformanceCollectionGreaterThan50));
    }

    // Check publishers capacity order
    checkPublishersCapacityOrder(work);

    if (!work.allCapacitiesInOrder) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.CapacityNotInOrder));
    }

    // An Original Publisher or Income Participant needs to exist on a controlled chain
    for (const chain of work.rightsChain) {
      if (!IpChainUtils.controlledByPublisherOrIncomeParticipant(chain.children)) {
        work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.NoControlledPublisher));
        break;
      }
    }
    
    
    checkOriginalPublisherAcquirerOwnedShares(work);

    // Default chain
    if (!work.allOriginalPublisherAcquirerOwnedShares) work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.OriginalPublisherOrAcquirerRequiresOwnedShares));
    if (!work.allOriginalPublisherWithAcquirerOwnedSharesZero) work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.OriginalPublisherWithAcquirerMustBeZero));
    if (!work.acquirerLinkedToOriginalPublisher) work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.AcquirerRequiresOriginalPublisherLink));
    

    // Check no composers are missing
    checkNoMissingComposers(work);

    if (!work.allComposerFieldsContainComposer) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MissingComposerFields));
    }

    // Check no publishers are missing
    checkNoMissingPublishers(work);

    if (!work.allPublisherFieldsContainPublisher) {
      work.validationErrors.push(errorMessage(WorkValidation.ErrorMessages.MissingPublisherFields));
    }

    work.valid = work.validationErrors.length === 0;

  };

const recalculateIpChainsTotals = (work) => {
    const calculateChainTotals = (chain) => {
      chain.totalMechanicalOwnership = Math.round(sumValueInIpChainChildren(chain, 'mechanicalOwnership', 0) * 100) / 100;
      chain.totalPerformanceOwnership = Math.round(sumValueInIpChainChildren(chain, 'performanceOwnership', 0) * 100) / 100;
      chain.totalMechanicalCollection = Math.round(sumValueInIpChainChildren(chain, 'mechanicalCollection', 0) * 100) / 100;
      chain.totalPerformanceCollection = Math.round(sumValueInIpChainChildren(chain, 'performanceCollection', 0) * 100) / 100;
    };
    work.rightsChain.forEach((chain) => {
      if (chain) calculateChainTotals(chain);
    });
  };

  const sumValueInIpChainChildren = (item, field, total) => {
    if (item && item[field]) { total += parseFloat(item[field]); }
    if (item && item.children && item.children.length > 0) {
      item.children.forEach((child) => {
        total = sumValueInIpChainChildren(child, field, total);
      });
    }
    return total;
  }
  
  
  const checkIpChainsAreControlled = (work) => {
    const checkChains = (rightsChain) => {
      const checks = {
        hasAtLeastOneChainControlled: false,
        allControlledChainsHaveControlledChildren: true,
      };
      rightsChain?.forEach((chain) => {
        if (chain && chain.children && chain.children.length !== 0) {
          chain.children.forEach((child) => {
            if (child && child.controlled) {
              checks.hasAtLeastOneChainControlled = true;
            }
            if (child && child.controlled && child.children && child.children.length > 0) {
              if (!IpChainUtils.areAllChainChildrenControlled(child)) {
                checks.allControlledChainsHaveControlledChildren = false;
              }
            }
          });
        }
      });
      return checks;
    };
  
    const defaultChain = checkChains(work.rightsChain);
    work.hasAtLeastOneChainControlled = defaultChain.hasAtLeastOneChainControlled;
    work.allControlledChainsHaveControlledChildren = defaultChain.allControlledChainsHaveControlledChildren;
  
    work.hasAtLeastOnePartnerChainControlled = true;
    work.allControlledPartnerChainsHaveControlledChildren = true;
  };

  const checkAllIPChainItemsHaveCapacity = (work) => {
    work.allItemsHaveCapacity = true;
    work.allPartnerChainsHaveCapacity = true;
  
    const checkChain = (chain, isDefaultChain = true) => {
      if (chain && chain.children && chain.children.length !== 0) {
        chain.children.forEach((child) => {
          if (child && child.type && !child.contractType) {
            if (isDefaultChain) work.allItemsHaveCapacity = false;
            else work.allPartnerChainsHaveCapacity = false;
          }
          if (child && child.children && child.children.length > 0) {
            if (!doAllChainChildrenHaveCapacity(child)) {
              if (isDefaultChain) work.allItemsHaveCapacity = false;
              else work.allPartnerChainsHaveCapacity = false;
            }
          }
        });
      }
    };
  
    // Check the default chain
    work.rightsChain.forEach((chain) => checkChain(chain));
  };
  

  const checkAllIPChainPublishersEndWithAComposer = (work) => {
  
    const checkChains = (rightsChain) => {
      let trees = [];
      let allPublishersEndWithComposers = true;
      rightsChain?.forEach((chain) => {
        if (chain && chain.children && chain.children.length !== 0) {
          chain.children.forEach((child) => {
            if (child && child.controlled) {
              const baseTree = child.type;
              if (child.children && child.children.length > 0) {
                trees = trees.concat(WorkValidation.doAllChainPublishersChildrenEndWithAComposer(baseTree, child));
              } else {
                trees.push(baseTree);
              }
            }
          });
        }
      });
      for (let tree of trees) {
        if (tree) {
          tree = tree.split('/');
          if (tree[0] === 'Publisher' && tree[tree.length - 1] !== 'Composer') {
            allPublishersEndWithComposers = false;
            break;
          }
        }
      }
      return allPublishersEndWithComposers;
    };
  
    // Check default chain
    work.allPublishersEndWithComposers = checkChains(work.rightsChain);
  };


  const checkIpChainsComposersAreLinkedControlledPublishers = (work) => {
    work.controlledComposersChainsWithoutControlledPublisher = false;
    work.controlledPartnerChainsWithoutControlledPublisher = false;
  
    work.rightsChain.forEach((chain) => {
      if (!WorkValidation.areAllControlledComposersControlled(chain)) {
        work.controlledComposersChainsWithoutControlledPublisher = true;
      }
    });
  };


  const checkAllIPChainNonCopyrightHoldersOwnedShares = (work) => {
    work.allIPChainNonCopyrightHoldersOwnedSharesZero = true;
    work.allPartnerChainNonCopyrightHoldersOwnedSharesZero = true;
  
    for (const chain of work.rightsChain) {
      if (chain && chain.children && chain.children.length !== 0) {
        chain.children.forEach((child) => {
          if (child && child.type === 'Publisher' && (child.contractType === 'Admin' || child.contractType === 'Sub Publisher' || child.contractType === 'Income Participant')) {
            if (child?.mechanicalOwnership > 0 || child?.performanceOwnership > 0) {
              work.allIPChainNonCopyrightHoldersOwnedSharesZero = false;
            }
          }
          if (child && child.children && child.children.length > 0) {
            if (!WorkValidation.areAllIPChainAdminSubPubOwnedSharesZero(child)) {
              work.allIPChainNonCopyrightHoldersOwnedSharesZero = false;
            }
          }
        });
      }
    }
  };
  

  const checkAllIPChainPerformanceOwnershipShares = (work) => {
    work.allSharesBelow51 = true;
    work.allPartnerSharesBelow51 = true;
  
    work.rightsChain.forEach((chain) => {
      //* CWR Documentation Excerpt
      // 4. Total Ownership shares across all SPU and OPU records must be less than or equal to 05000 (50%) for PR
      // Shares and must be less than or equal to 10000 (100%) for MR Shares and SR Shares. Note that a
      // tolerance of plus or minus 00006 (.06%) is allowed. (TR)
      if (chain && (Math.round(WorkValidation.checkAllIPChildrenPublishersShares(chain, 0) * 100) / 100) > 50.06) {
        work.allSharesBelow51 = false;
      }
    });
    
  };

  const checkAllIPChainPerformanceCollectionShares = (work) => {
    work.allCollectionSharesBelow51 = true;
    work.allPartnerCollectionSharesBelow51 = true;
  
    work.rightsChain.forEach((chain) => {
      //* CWR Documentation Excerpt
      // 27. For performing rights: Within each chain of title, the sum of Collection Shares for any group of SPT records
      // within a territory must equal the total of Ownership shares on the preceding Original Publisher and
      // Acquirer SPU records provided:
      // The Shares Changed when sub-published is ‘N’
      // There is no interested party (SPU/POP/SWR/OWR) with a role code of ‘PA’ (income participant)
      // Note that a tolerance of plus or minus 00006 (.06%) is allowed. (TR)
      if (chain && (Math.round(WorkValidation.checkAllIPChildrenPublishersCollectionShares(chain, 0) * 100) / 100) > 50.06) {
        work.allCollectionSharesBelow51 = false;
      }
    });
  };

  const checkPublishersCapacityOrder = (work) => {
  
    const checkChains = (rightsChain) => {
      let allCapacitiesInOrder = true;
      let chainTrees = [];
      rightsChain?.forEach((chain) => {
        if (chain && chain.children && chain.children.length !== 0) {
          chain.children.forEach((child) => {
            if (child && child.contractType) {
              const baseTree = child.contractType;
              if (child.children && child.children.length > 0) {
                chainTrees = chainTrees.concat(WorkValidation.getChildPublishersCapacityTrees(baseTree, child));
              } else {
                chainTrees.push(baseTree);
              }
            }
          });
        }
      });
      for (let tree of chainTrees) {
        if (tree) {
          tree = tree.split('/');
          const adminIndex = tree.indexOf('Admin');
          const subPublisherIndex = tree.indexOf('Sub Publisher');
          const originalPublisherIndex = tree.indexOf('Original Publisher');
          const incomeParticipantIndex = tree.indexOf('Income Participant');
          if (
            originalPublisherIndex !== -1
            && (
              (adminIndex !== -1 && (adminIndex > originalPublisherIndex && adminIndex > incomeParticipantIndex))
              || (subPublisherIndex !== -1 && (subPublisherIndex > originalPublisherIndex && subPublisherIndex > incomeParticipantIndex))
            )
          ) {
            allCapacitiesInOrder = false;
            break;
          }
        }
      }
      return allCapacitiesInOrder;
    };
  
    work.allCapacitiesInOrder = checkChains(work.rightsChain);
  };
  
  const checkOriginalPublisherAcquirerOwnedShares = (work) => {
    work.allOriginalPublisherAcquirerOwnedShares = true;
    work.allOriginalPublisherWithAcquirerOwnedSharesZero = true;
    work.acquirerLinkedToOriginalPublisher = true;
  
    work.allPartnerOriginalPublisherAcquirerOwnedShares = true;
    work.allPartnerOriginalPublisherWithAcquirerOwnedSharesZero = true;
    work.partnerAcquirerLinkedToOriginalPublisher = true;
  
    const checkChains = (rightsChain) => {
      const checks = {
        allOriginalPublisherAcquirerOwnedShares: true,
        allOriginalPublisherWithAcquirerOwnedSharesZero: true,
        acquirerLinkedToOriginalPublisher: true,
      };
      rightsChain?.forEach((chain) => {
        if (chain && chain.children && chain.children.length !== 0) {
          chain.children.forEach((child) => {
            if (child && child.controlled && child.children && child.children.length) {
              if (IpChainUtils.areAllChainChildrenControlled(child) && child.contractType !== IpChainUtils.ContractType.IncomeParticipant) {
                const publisherMechOwned = Math.round(IpChainUtils.sumContractTypeValueInIpChainChildren(child, 'mechanicalOwnership', ['Original Publisher'], 0) * 100) / 100;
                const acquirerMechOwned = Math.round(IpChainUtils.sumContractTypeValueInIpChainChildren(child, 'mechanicalOwnership', ['Acquirer'], 0) * 100) / 100;
                const publisherPerfOwned = Math.round(IpChainUtils.sumContractTypeValueInIpChainChildren(child, 'performanceOwnership', ['Original Publisher'], 0) * 100) / 100;
                const acquirerPerfOwned = Math.round(IpChainUtils.sumContractTypeValueInIpChainChildren(child, 'performanceOwnership', ['Acquirer'], 0) * 100) / 100;
                const countOriginalPublishers = IpChainUtils.countContractTypeInIpChainChildren(child, 'Publisher', ['Original Publisher'], 0);
                const countAcquirer = IpChainUtils.countContractTypeInIpChainChildren(child, 'Publisher', ['Acquirer'], 0);
                if ((publisherMechOwned + acquirerMechOwned + publisherPerfOwned + acquirerPerfOwned) <= 0) { checks.allOriginalPublisherAcquirerOwnedShares = false; }
                if (countAcquirer > 0 && (publisherMechOwned + publisherPerfOwned) > 0) { checks.allOriginalPublisherWithAcquirerOwnedSharesZero = false; }
                if (countAcquirer > 0 && countOriginalPublishers === 0) { checks.acquirerLinkedToOriginalPublisher = false; }
              }
            }
          });
        }
      });
      return checks;
    };
  
    const defaultChain = checkChains(work.rightsChain);
    work.allOriginalPublisherAcquirerOwnedShares = defaultChain.allOriginalPublisherAcquirerOwnedShares;
    work.allOriginalPublisherWithAcquirerOwnedSharesZero = defaultChain.allOriginalPublisherWithAcquirerOwnedSharesZero;
    work.acquirerLinkedToOriginalPublisher = defaultChain.acquirerLinkedToOriginalPublisher;
  };
  

  const checkNoMissingComposers = (work) => {
  
    const checkChains = (rightsChain) => {
      let allComposerFieldsContainComposer = true;
      if (rightsChain && rightsChain.length) {
        for (const chain of rightsChain) {
          if (!WorkValidation.doAllComposerFieldsContainComposer(chain)) {
            allComposerFieldsContainComposer = false;
            break;
          }
        }
      }
      return allComposerFieldsContainComposer;
    };
  
    work.allComposerFieldsContainComposer = checkChains(work.rightsChain);
  };

  const checkNoMissingPublishers = (work) => {
  
    const checkChains = (rightsChain) => {
      let allPublisherFieldsContainPublisher = true;
      if (rightsChain && rightsChain.length) {
        for (const chain of rightsChain) {
          if (!WorkValidation.doAllPublisherFieldsContainPublisher(chain)) {
            allPublisherFieldsContainPublisher = false;
            break;
          }
        }
      }
      return allPublisherFieldsContainPublisher;
    };
  
    work.allPublisherFieldsContainPublisher = checkChains(work.rightsChain);
  };
  

  const errorMessage = (message, isPartnerChain = false) => (isPartnerChain ? `Partner Chain: ${message}` : `Default Chain: ${message}`);

  const doAllChainChildrenHaveCapacity = (chain) => {
    let allItemsHaveCapacity = true;
    if (chain?.type && !chain?.contractType) {
      allItemsHaveCapacity = false;
    } else if (chain && chain.children && chain.children.length > 0) {
      chain.children.forEach((child) => {
        if (!doAllChainChildrenHaveCapacity(child)) { allItemsHaveCapacity = false; }
      });
    }
    return allItemsHaveCapacity;
  }
  

const isAnyOfTheChildrenCollected = (chain) => {
  let isAnyOfTheChildrenCollected = false;
  if (chain && chain.children && chain.children.length !== 0) {
    chain.children.forEach((child) => {
      if (child && child.controlled) {
        isAnyOfTheChildrenCollected = true;
      }
    });
  }
  return isAnyOfTheChildrenCollected;
}
