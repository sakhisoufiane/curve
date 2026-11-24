require('dotenv').config();
require('../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../../models/statement');


async function changeStatementNameAndYear({periodId}) {


    try {
    const statements = await Statement.find({periodId}).select('_id name year').sort({ _id: 1 });
    logger.info(`Found ${statements.length} statements for period ${periodId}`);
    logger.info(`Updating statements' name and year for period ${periodId}`);

    for (const statement of statements) {
        const updatedName = statement.name.replace('23', '24');
        await Statement.updateOne(
        { _id: statement._id },
        { $set: { name: updatedName, year: 2024 } }
        );

        }
        logger.info('Statements updated successfully');

    } catch (error) {
        logger.error('Error updating statements');
        console.log(error);
    }
}

changeStatementNameAndYear({periodId: '66178f27f90e5847918309cc'}).then(() => {
    logger.info('Complete');
    process.exit(0);
}).catch((err) => {
    logger.error(err);
    process.exit(1);
});