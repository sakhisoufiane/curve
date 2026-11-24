/*
Description: Creates a new report entry for clients with a non-empty fugaSplitType and updates their salesReportTemplate.
Time to run: Staging: 5s
Ticket No: CURV-3420
Category: Fuga Reports Update
Author: Omar Abbas
*/
require("dotenv").config();
require("../../models/db");
const { logger } = require("@curveroyaltysystems/platform-shared-utils");
const Client = require("../../models/client");
const Report = require("../../models/report");

const run = async () => {
    logger.info("Script createAndAssignReportTemplates started");

    try {

        const query = {
            fugaSplitType: {
                $exists: true,
                $type: "string",
                $regex: /\S/
            }
        };
        const clients = await Client.find(query, "_id name fugaSplitType salesReportTemplate");

        if (clients.length === 0) {
            logger.info("No clients found with a non-empty fugaSplitType.");
            process.exit(0);
        }

        logger.info(`Found ${clients.length} clients with a non-empty fugaSplitType.`);
        logger.info(`Clients found: ${JSON.stringify(clients, null, 2)}`);

        // For each client with a fugasplittype that has a string set, create the report and attach as statement
        // design one by one, ensuring it is done in one pass and logged if errored.
        for (const client of clients) {
            try {
                const newReport = await Report.create({
                    clientId: client._id,
                    format: 'US/UK Decimal Point',
                    table: "Sales Output",
                    name: "Statements Sales CSV Output",
                    createdBy: '66b0c444d9d9cd36656428d7',
                    lastModifiedBy: '66b0c444d9d9cd36656428d7',
                    fields: [
                        { "field": "contractName", "header": "Contract Name", "type": "Selector" },
                        { "field": "saleDate", "header": "Sale Date", "type": "Selector" },
                        { "field": "territory", "header": "Territory", "type": "Selector" },
                        { "field": "source", "header": "Source", "type": "Selector" },
                        { "field": "catType", "header": "Catalogue Type", "type": "Selector" },
                        { "field": "catalogueCatNo", "header": "Cat No", "type": "Selector" },
                        { "field": "catalogueBarcode", "header": "Barcode", "type": "Selector" },
                        { "field": "catalogueReleaseTitle", "header": "Release Title", "type": "Selector" },
                        { "field": "catalogueReleaseVersion", "header": "Release Version", "type": "Selector" },
                        { "field": "catalogueReleaseArtist", "header": "Release Artist", "type": "Selector" },
                        { "field": "catalogueReleaseLabel", "header": "Release Label", "type": "Selector" },
                        { "field": "catalogueIsrc", "header": "ISRC", "type": "Selector" },
                        { "field": "catalogueTrackTitle", "header": "Track Title", "type": "Selector" },
                        { "field": "catalogueTrackVersion", "header": "Track Version", "type": "Selector" },
                        { "field": "catalogueTrackArtist", "header": "Track Artist", "type": "Selector" },
                        { "field": "catalogueTrackLabel", "header": "Track Label", "type": "Selector" },
                        { "field": "distributionChannel", "header": "Distribution Channel", "type": "Selector" },
                        { "field": "configuration", "header": "Configuration", "type": "Selector" },
                        { "field": "units", "header": "Units", "type": "Calculator" },
                        { "field": "netAmount", "header": "Net Amount in Currency", "type": "Calculator" },
                        { "field": "originalCurrency", "header": "Original Currency", "type": "Selector" },
                        { "field": "exchangeRate", "header": "Exchange Rate", "type": "Selector" },
                        { "field": "calculationInput", "header": "Net Amount", "type": "Calculator" },
                        { "field": "objectPercentage", "header": "Participation Rate", "type": "Selector" },
                        { "field": "proRataAmount", "header": "Pro Rata", "type": "Calculator" },
                        { "field": "royaltyRate", "header": "Royalty Rate", "type": "Selector" },
                        { "field": "contractCurrencyCalculationOutput", "header": "Payable Amount", "type": "Calculator" },
                        { "field": "contractCurrency", "header": "Payable Currency", "type": "Selector" },
                        { "field": "calculationType", "header": "Calculation Type", "type": "Selector" }
                    ]
                });

                await Client.updateOne(
                    { _id: client._id },
                    { $set: { salesReportTemplate: newReport._id } }
                );

                logger.info(`Client ${client._id} updated with report ID ${newReport._id}`);
            } catch (clientError) {
                logger.error(`Failed to process client ${client._id}: ${clientError.message}`);
            }
        }

        logger.info("All clients processed successfully.");
        process.exit(0);

    } catch (error) {
        logger.error(`Error in script createAndAssignReportTemplates: ${error.message}`);
        process.exit(-1);
    }
};

run();
