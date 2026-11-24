require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Contract = require('../models/contract');

const clientId = '617ae53cd2a6310025da90bb'; // Production ClientID
const trackerRef = 'TMR422: Lillie Mae Escalations'

const removeEscalationTrackers = async (id, tracker) => {
    // Find relevan contracts
    const query = {
        'clientId': id,
        'salesTerms.escalationTrackers': tracker,
    };
    const contracts = await Contract.find(query)
    logger.info(`--------------- Found ${contracts.length} contracts in client: ${id} ---------------`)

    // Update sales terms
    logger.info(`Attempting to update ${contracts.length} contracts`)
    let count = 0;
    async.each(contracts, (contract, contractCb) => {        
        // Remove unwanted escalation tracker
        contract.salesTerms.forEach((term) => {
            if (term.escalationTrackers.includes(tracker) && !contract.escalationTracking[tracker]) {
                const index = term.escalationTrackers.indexOf(tracker)
                term.escalationTrackers.splice(index, 1);
                count += 1
            }
        })
        // Saving updated contract
        contract.save((err) => {
            if (err) {
                logger.error(`Could not update ${contract._id} ${contract.name}`)
            }
            contractCb()
        })
    }, () => {
        logger.info(`---------------------- ${count} contracts updated ----------------------`);
        process.exit(-1);
    })
};


// Call function
removeEscalationTrackers(clientId, trackerRef);