require('dotenv').config();
require('../../models/db');
const async = require('async');
const Statement = require('../../models/statement');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');


// The periodIds to run are in this order: 
// 1) Q1 & Q2 2022 6318df03e5b7bf30b12e7f55 --- This has had no issues completing
// 2) Q3 2022 6397b446c748d56185c86883 -- Completed Run at 16:46 23/09/2025
// 3) Q3 2023 Artist and Producer 65653eb2d131a0af1d371495 ---  Completed Run at 17:00 23/09/2025
// 4) Q4 2023 Artist & Producer 65bd839e34f2a560c46f401f --- Completed Run at 20:59 23/09/2025
// 5) Q3 2024 Artist and Producer 6760eca1d804ae842f36dcfd -- Completed Run at 00:34 24/09/2025

const run = async function ({id, clientId}) {
    console.log(`set Statement to complete from errored for period ${id}`)
    const statements = await Statement.find({  periodId:id , status: 'Errored', clientId });
    logger.info(`Found ${statements.length} Statements`)

    for (const statement of statements) {
        logger.info(`Set ${statement.name} to pending`)
        await Statement.findByIdAndUpdate(statement._id, { $set: { status: 'Pending' } });
    if (statement) {
    logger.info(`Reprocessing Statement ${statement._id}`) 
    await new Promise((resolve, reject) => {
        statement.calculate((err) => {
            if (err) {
                logger.error('Error:', err);
                reject(err);
            } else {
                logger.info('Success!');
                resolve();
            }
        });
    });

    }
    }
    logger.info('finished for ', id)
    process.exit();
}

const statements = [
  "67da38984b3ca29c9f53cd79",
  "67da388f8a9fe81a54f3e23e",
  "67da38a2f5726ea39c5f6278",
  "665a01dfaa8865756bb415ae",
  "665a019e32eaf6bdf3015e97",
  "665a01d57768cc5d872b89b0",
  "665a01a7aa8865756bb40e24",
  "665a02f6a35b7b5b9e79921d",
  "665a0074a35b7b5b9e794c0b",
  "665a00124849fccd032482c7",
  "6659ff73a35b7b5b9e7939af",
  "665a001a581cbbd967d44dd9",
  "6659ffc032eaf6bdf30148a0",
  "665a0023a35b7b5b9e7945b6",
  "6659ff60aa8865756bb3efab",
  "665a0096581cbbd967d4525f",
  "665a0088a35b7b5b9e794d9d",
  "665a0066aa8865756bb3fee5",
  "665a003632eaf6bdf3014caa",
  "665a002a7768cc5d872b769c",
  "665a004832eaf6bdf3014e09",
  "665a02e532eaf6bdf301734a",
  "6659ff9ca35b7b5b9e793beb",
  "6659ff577768cc5d872b6e36",
  "6659ffb87768cc5d872b7125",
  "6659ffec7768cc5d872b73cf",
  "665a007daa8865756bb40019",
  "6659ff48a35b7b5b9e793625",
  "6659ffdf32eaf6bdf301497e",
  "6659ff4f32eaf6bdf3014497",
  "665a01217768cc5d872b7e13",
  "6659fef1d7b2e6a01916aff7",
  "665a00cda35b7b5b9e795690",
  "665a025532eaf6bdf3016af1",
  "665a014afae9736c3682a47d",
  "665a0157aa8865756bb409a5",
  "665a012f581cbbd967d45822",
  "665a013832eaf6bdf301597c",
  "6659ff15aa8865756bb3ec5b",
  "6659ff0fd7b2e6a01916b135",
  "6659fef8d7b2e6a01916b05a",
  "6659fe1a7768cc5d872b3a70",
  "6659fe29d7b2e6a01916a87c",
  "6659fe5a32eaf6bdf3013bd3",
  "6659fe52aa8865756bb3e074",
  "6659fe21d7b2e6a01916a7eb",
  "6659fd9a7768cc5d872a8cc1",
  "6411dd0e3d5afa7b00775c40",
  "6411dce112e58e127eb361ec",
  "6411dd153d5afa7b00775cc7",
  "665a00ec32eaf6bdf3015443",
  "665a024132eaf6bdf301690a",
  "665a0174aa8865756bb40c0b"
];

const resetStatementsToErrored = async function ({ statements, clientId }) {
    console.log(`Set Statement to Errored from Complete`);

    for (const statement of statements) {
        try {
            console.log(statement);
            const statementFound = await Statement.findOne({ _id: new ObjectId(statement), clientId });

            if (!statementFound) {
                logger.warn(`Statement with ID ${statement} not found.`);
                continue;
            }

            logger.info(`Found ${statementFound.name} - Statement`);
            logger.info(`Set ${statementFound.name} to errored`);

            // Uncomment to perform the update
            await Statement.findByIdAndUpdate(statementFound._id, { $set: { status: 'Errored' } });

        } catch (err) {
            logger.error(`Error processing statement ${statement}: ${err.message}`);
        }
    }

    process.exit();
};

   run({ id:'6760eca1d804ae842f36dcfd', clientId: '5dd41401956f537fd8a0e91c'})
//  resetStatementsToErrored({ statements,  clientId: '5dd41401956f537fd8a0e91c'})

