/*
Description:
 - Creates or updates Report to align with selected source client report,
 - Copies all sales templates from source to target clients,
 - Copies selected settings fields from source to target clients,
 - Configures FUGA integration settings,
 - Sets useAlternativeId flag to true,
 - Updates BigQuery schema,

Time to run: Staging: 20s
Ticket No: CUR-5040
Category: Report Template Copy, BigQuery Update, Client Settings Copy, Sales Templates Copy & FUGA Integration Setup
Author: [Piotr Tomasiewicz]
*/
require("dotenv").config();
require("../../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const { promisify } = require("node:util");
const { BigQuery } = require("@curveroyaltysystems/platform-shared-utils");
const SalesTemplate = require("../../models/salesTemplate");
const Client = require("../../models/client");
const Report = require("../../models/report");
const Contract = require("../../models/contract");
const User = require("../../models/user");

const LAST_MODIFIED_BY_USER_ID = "68aefdbd8b597628fa521d57"; // piotr.tomasiewicz@curveroyaltysystems.com

const SOURCE_CLIENT_ID = "691b3e2688972736981072db"; // Curve Splits Template
const SOURCE_REPORT_ID = "691f4efc24c768016186b3fc"; // Curve Splits Template sales report template
const SOURCE_REPORT_NAME = "Statements Sales CSV Output - DO NOT DELETE";

const EXISTING_TARGET_CLIENT_IDS = [
    "68b168d448ac3b4d33176635", // Curve Splits Blank Client 001
];


const SETTINGS_FIELDS_TO_COPY = [
    "distributionChannels",
    "configurations",
];

const ADMIN_USERS = ["fugaapi@curveapi.com", "jessica.lods@fuga.com", "austin.dest@fuga.com", "manesh.mistry@fuga.com", "mgarg@downtownmusic.com"];

const DEFAUTLS = {
    STATEMENT_OF_ACCOUNT_CUSTOM_TEXT: "Note: Actual payment remains subject to the contractual settlement cycle established with your Label or Distributor."
}

class FugaConfigCopier {
    sourceClient;
    sourceReport;
    sourceSalesTemplates;
    targetClientIds;

    async run(targetClientIds, sourceClient) {
        await this.initialize(targetClientIds, sourceClient);

        try {
            for (const targetClientId of this.targetClientIds) {
                try {
                    const targetClient = await Client.findById(targetClientId);

                    if (!targetClient) {
                        logger.error(`Target client ${targetClientId} not found. Skipping.`);
                        continue;
                    }

                    await this.updateReportAndSettings(targetClient);

                    await this.updateTemplates(targetClientId);

                    await this.updateBigQuerySchema(targetClient, targetClientId);

                    await this.updateContracts(targetClientId);

                } catch (error) {
                    logger.error(`Error when copying data for ${targetClientId}: ${error.message}.`);
                    continue;
                }
            }

            await this.addClientsToUser();

            logger.info("All clients processed successfully.");
            process.exit(0);
        } catch (error) {
            logger.error(`Error in script copyFugaClientConfigs: ${error.message}`);
            process.exit(-1);
        }
    }

    async initialize(targetClientIds, sourceClient) {
        this.sourceClient = sourceClient;
        this.targetClientIds = targetClientIds;

        if (this.targetClientIds.length === 0) {
            logger.info("No target client IDs provided.");
            process.exit(0);
        }

        try {
            this.sourceReport = await Report.findOne({ _id: SOURCE_REPORT_ID, clientId: SOURCE_CLIENT_ID });
            if (!this.sourceReport) {
                logger.error(`Source report ${SOURCE_REPORT_ID} for client ${SOURCE_CLIENT_ID} not found.`);
                process.exit(-1);
            }

            this.sourceSalesTemplates = await SalesTemplate.find({ clientId: SOURCE_CLIENT_ID, archived: { $ne: true } }).lean();

            logger.info(`Source data successfully loaded:`);
            logger.info(`Found source client: ${this.sourceClient.name} (${SOURCE_CLIENT_ID})`);
            logger.info(`Found source report: ${this.sourceReport.name} from client: ${SOURCE_CLIENT_ID}`);
            logger.info(`Found ${this.sourceSalesTemplates.length} sales template(s) from source client`);
            logger.info(`Will copy to ${this.targetClientIds.length} clients.`);
        } catch (error) {
            logger.error(`Initialization error: ${error.message}`);
            process.exit(-1);
        }
    }

    async updateReportAndSettings(targetClient) {
        const report = await this.upsertReport(targetClient);
        targetClient.salesReportTemplate = report._id.toString();

        SETTINGS_FIELDS_TO_COPY.forEach(field => {
            targetClient[field] = this.sourceClient[field];
        });

        targetClient.features.showFugaSyncExtras = this.sourceClient.features.showFugaSyncExtras;
        targetClient.features.useAlternativeId = this.sourceClient.features.useAlternativeId;

        if (!targetClient.fugaIntegration) {
            targetClient.fugaIntegration = {};
        }

        targetClient.fugaIntegration = {
            ...targetClient.fugaIntegration,
            fugaAutoSyncEnabled: this.sourceClient.fugaIntegration.fugaAutoSyncEnabled,
            fugaAutoIngestSales: this.sourceClient.fugaIntegration.fugaAutoIngestSales, // RASA Statements Pickup feature
            setDefaultReleaseIdOnImport: this.sourceClient.fugaIntegration.setDefaultReleaseIdOnImport,
            fugaClientType: this.sourceClient.fugaIntegration.fugaClientType,
            defaultDistributionChannel: this.sourceClient.fugaIntegration.defaultDistributionChannel,
            ingestForeignIdsFromDelivery: this.sourceClient.fugaIntegration.ingestForeignIdsFromDelivery,
            setCatNoFromBarcodeOnImport: this.sourceClient.fugaIntegration.setCatNoFromBarcodeOnImport
        }

        targetClient.statementOfAccountCustomText = this.sourceClient.statementOfAccountCustomText || DEFAUTLS.STATEMENT_OF_ACCOUNT_CUSTOM_TEXT;

        // ASSOCIATE ALL FUGA SPLITS CLIENTS WITH PARENT DEFINED ON SOURCE CLIENT
        targetClient.parentId = this.sourceClient.parentId;

        await targetClient.save();

        logger.info(`Updated settings for client ${targetClient.name} (${targetClient._id})`);
    }

    async upsertReport(targetClient) {
        const report = await Report.findOneAndUpdate(
            {
                clientId: targetClient._id,
                name: SOURCE_REPORT_NAME
            },
            {
                $set: {
                    format: this.sourceReport.format,
                    table: this.sourceReport.table,
                    fields: this.sourceReport.fields,
                    lastModifiedBy: LAST_MODIFIED_BY_USER_ID
                },
                $setOnInsert: {
                    createdBy: LAST_MODIFIED_BY_USER_ID
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        logger.info(`Upserted report: ${report.name} (${report._id})`);
        return report;
    }

    async updateTemplates(targetClientId) {
        for (const template of this.sourceSalesTemplates) {
            try {
                const { _id, __v, createdAt, updatedAt, createdBy, lastModifiedBy, clientId, ...copiableFields } = template;

                const salesTemplate = await SalesTemplate.findOneAndUpdate(
                    {
                        clientId: targetClientId,
                        name: template.name
                    },
                    {
                        $set: {
                            ...copiableFields,
                            clientId: targetClientId,
                            lastModifiedBy: LAST_MODIFIED_BY_USER_ID
                        },
                        $setOnInsert: {
                            createdBy: LAST_MODIFIED_BY_USER_ID
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );

                logger.info(`Upserted sales template: ${salesTemplate.name} (${salesTemplate._id})`);
            } catch (salesTemplateError) {
                logger.error(`Failed to copy sales template ${template.name}: ${salesTemplateError.message}`);
            }
        }
    }

    async updateBigQuerySchema(targetClient, targetClientId) {
        try {
            logger.info(`Updating BigQuery schema for client ${targetClientId} (${targetClient.name})`);

            const bigQuery = new BigQuery({ datasetName: targetClient.bigQueryDataset });
            const [datasetExists] = await bigQuery.client.dataset(bigQuery.datasetName).exists();

            if (datasetExists) {
                const updateSchema = promisify(bigQuery.updateSchema).bind(bigQuery);
                await updateSchema(targetClient.bigQuerySalesTable, bigQuery.inputSchema);

                logger.info(`BigQuery schema updated successfully for client ${targetClientId} (${targetClient.name})`);
            } else {
                logger.info(`BigQuery dataset doesn't exist for client ${targetClientId} (${targetClient.name}). Skipping schema update.`);
            }
        } catch (bigQueryError) {
            logger.error(`Failed to update BigQuery schema for client ${targetClientId}: ${bigQueryError.message}`);
            // Continue with other clients even if BigQuery update fails
        }
    }

    async addClientsToUser() {
        try {
            logger.info(`Adding ${this.targetClientIds.length} clients to ${ADMIN_USERS.length} user(s)`);

            for (const userEmail of ADMIN_USERS) {
                try {
                    const user = await User.findOne({ email: userEmail });

                    if (!user) {
                        logger.error(`User with email ${userEmail} not found. Skipping.`);
                        continue;
                    }

                    logger.info(`Processing user: ${userEmail} (${user._id})`);

                    user.rights = user.rights || {};


                    for (const clientId of this.targetClientIds) {
                        if (user.clientIds.includes(clientId) && user.adminClientIds.includes(clientId)) {
                            logger.info(`User ${userEmail} already has admin access to client ${clientId}. Skipping.`);
                            continue;
                        }

                        if (!user.clientIds.includes(clientId)) {
                            user.clientIds.push(clientId);
                        }

                        if (!user.adminClientIds.includes(clientId)) {
                            user.adminClientIds.push(clientId);
                        }

                        user.rights[clientId] = {
                            catalogue: "Edit",
                            contracts: "Edit",
                            sales: "Edit",
                            periods: "Edit",
                            admin: true
                        };

                        logger.info(`Added admin access for client ${clientId} to user ${userEmail}`);
                    }

                    await user.save();
                } catch (userError) {
                    logger.error(`Error processing user ${userEmail}: ${userError.message}`);
                    // Continue with next user
                }
            }

            logger.info(`All users processed successfully.`);
        } catch (error) {
            logger.error(`Failed to add clients to users: ${error.message}`);
            throw error;
        }
    }

    async updateContracts(targetClientId) {
        const { modifiedCount, matchedCount } = await Contract.updateMany(
            { clientId: targetClientId },
            { $set: { autoPayment: true } }
        );

        logger.info(`Updated ${modifiedCount} out of ${matchedCount} contract(s) for client ${targetClientId}`);
    }
}

const NEW_CLIENT_NAME_PREFIX = "Curve Splits Blank Client";
const NEW_CLIENT_NAMES = [
    `${NEW_CLIENT_NAME_PREFIX} 001`,
    `${NEW_CLIENT_NAME_PREFIX} 002`,
    `${NEW_CLIENT_NAME_PREFIX} 003`,
    `${NEW_CLIENT_NAME_PREFIX} 004`,
    `${NEW_CLIENT_NAME_PREFIX} 005`,
]

const createNewClients = async function(sourceClient) {
    try {
        const existingClients = await Client.find({
            name: new RegExp(`^${NEW_CLIENT_NAME_PREFIX} \\d{3}$`)
        }).select("name").lean();

        const clientsToCreate = NEW_CLIENT_NAMES.filter((name) =>
            !existingClients.some((client) => client.name === name)
        );

        if (clientsToCreate.length !== NEW_CLIENT_NAMES.length) {
            logger.info(`Some placeholder clients already exist, creating ${clientsToCreate.length} clients.`);
        }

        const createdClientsIds = [];

        for (const clientName of clientsToCreate) {
            logger.info(`Creating client: ${clientName}`);

            const newClient = new Client({
                name: clientName,
                clientType: sourceClient.clientType,
                homeCurrency: sourceClient.homeCurrency,
                createdBy: LAST_MODIFIED_BY_USER_ID,
                lastModifiedBy: LAST_MODIFIED_BY_USER_ID
            });

            await newClient.save();
            createdClientsIds.push(newClient._id.toString());

            logger.info(`Created client: ${clientName} (${newClient._id})`);
        }

        logger.info(`Successfully created ${createdClientsIds.length} new clients`);
        return createdClientsIds;
    } catch (error) {
        logger.error(`Error creating new clients: ${error.message}`);
        process.exit(-1);
    }
}

const MODE = {
    CREATE: "create",
    UPDATE: "update"
}

async function getTargetClients(mode, sourceClient) {
    if (mode === MODE.UPDATE) {
        return EXISTING_TARGET_CLIENT_IDS;
    } else {
        return createNewClients(sourceClient);
    }
}

(async function main(mode) {
    if (!mode) {
        throw new Error("Mode argument missing. Please provide either MODE.CREATE or MODE.UPDATE as the function argument.");
    }
    
    const sourceClient = await Client.findById(SOURCE_CLIENT_ID);
    if (!sourceClient) {
        logger.error(`Source client ${SOURCE_CLIENT_ID} not found.`);
        process.exit(0);
    }
    const TARGET_CLIENT_IDS = await getTargetClients(mode, sourceClient);

    const copier = new FugaConfigCopier();
    await copier.run(TARGET_CLIENT_IDS, sourceClient);
})(); // Provide MODE argument here (MODE.UPDATE or MODE.CREATE)
