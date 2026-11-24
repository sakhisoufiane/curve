require('dotenv').config();
require('../models/db');
const fs = require('fs');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');
const async = require('async');
const chains = [{
    "territory": "WW",
    "children": [{
        "type": "Publisher",
        "mechanicalCollection": 100,
        "performanceCollection": 50,
        "children": [{
            "type": "Publisher",
            "children": [{
                "type": "Publisher",
                "children": [{
                    "type": "Composer",
                    "children": [],
                    "composerId": "611ba39b8542287182af9a57",
                    "controlled": true,
                    "mechanicalOwnership": 50,
                    "performanceOwnership": 60,
                    "mechanicalCollection": 70,
                    "performanceCollection": 80
                }, {
                    "type": "Composer",
                    "children": [],
                    "composerId": "611ba39e8542287182af9a7a",
                    "controlled": true,
                    "mechanicalOwnership": 10,
                    "performanceOwnership": 20,
                    "mechanicalCollection": 30,
                    "performanceCollection": 40
                }],
                "publisherId": "611ba3998542287182af9a50",
                "controlled": true,
                "contractType": "Admin",
                "mechanicalOwnership": 10,
                "performanceOwnership": 20,
                "mechanicalCollection": 30,
                "performanceCollection": 40
            }, {
                "type": "Publisher",
                "children": [],
                "publisherId": "611ba39f8542287182af9a85",
                "controlled": true,
                "contractType": "Sub Publisher",
                "mechanicalOwnership": 20,
                "performanceOwnership": 30,
                "mechanicalCollection": 40,
                "performanceCollection": 50
            }],
            "publisherId": "611ba3988542287182af9a49",
            "controlled": true,
            "contractType": "Original Publisher",
            "mechanicalOwnership": 100,
            "performanceOwnership": 50,
            "mechanicalCollection": 34,
            "performanceCollection": 40
        }],
        "publisherId": "611ba3988542287182af9a42",
        "controlled": true,
        "contractType": "Admin",
        "mechanicalOwnership": 10,
        "performanceOwnership": 20
    }, {
        "type": "Publisher",
        "mechanicalCollection": 100,
        "performanceCollection": 50,
        "children": [],
        "publisherId": "611ba3998542287182af9a50",
        "controlled": true,
        "contractType": "Sub Publisher",
        "mechanicalOwnership": 80,
        "performanceOwnership": 90
    }],
    "totalMechanicalOwnership": 280,
    "totalPerformanceOwnership": 290,
    "totalMechanicalCollection": 404,
    "totalPerformanceCollection": 350
}]
const work = {
    _id : '611cc8de1c486e85f0694dac',
    title: 'Imported Contract',
    identifier: 'WORKID',
    tunecode: 'WORKTUNE'
}
let deconstructedChains = [];
let exportData = [];
async.eachSeries(chains, (chain, callback) => {
    async.series([
        (scb) => {
            // Deconstruct the chain
            deconstructedChains = deconstructIpChain(1, {}, chain);
            scb();
        }, 
        (scb) => {
            // Combine rows that have the same parents and end with a composer
            deconstructedChains = combineComposerChains(deconstructedChains);
            scb();
        },
        (scb) => {
            // Populate Composers/Publishers
            populateComposersPublishers(deconstructedChains, scb);
        },
        (scb) => {
            // Get export data
            exportData = getIpChainsExportData(work, deconstructedChains);
            scb();
        },
    ], callback);
}, () => {
    console.log(exportData.length)
    let data = JSON.stringify(exportData);
    fs.writeFileSync('chains.json', data);
})

function getIpChainsExportData(work, chains) {
    let data = [];
    chains.map((chain) => {
        let row = [];
        row.push(...[work._id, work.title, work.identifier, work.tunecode]);
        for (let index = 1; index < chain.totalLevels + 1; index++) {
            row.push(
            ...[
                chain[index].type,
                chain[index].name,
                chain[index].firstName,
                chain[index].middleNames,
                chain[index].surname,
                chain[index].cae,
                chain[index].controlled,
                chain[index].mechanicalOwnership,
                chain[index].mechanicalCollection,
                chain[index].mechanicalCollection,
                chain[index].performanceOwnership,
                chain[index].performanceCollection,
                chain[index].contractType,
            ])
        }
        data.push(row);
    });
    
    return data;
}
function populateComposersPublishers(chains, callback){
    async.each(chains, (chain, cb) => {
        let totalLevels = [];
        for (let index = 1; index < chain.totalLevels + 1; index++) {
            totalLevels.push(index);
        }

        async.each(totalLevels, (level, ecb) => {
            if (chain[level].type === 'Publisher') {
                Publisher.findById(chain[level].publisherId, (err, publisher) => {
                    if (publisher) {
                        chain[level].name = publisher.name;
                        chain[level].cae = publisher.cae;
                    }
                    ecb();
                })
            } else if (chain[level].type === 'Composer') {
                Composer.findById(chain[level].composerId, (err, composer) => {
                    if (composer) {
                        chain[level].name = composer.name;
                        chain[level].firstName = composer.firstName;
                        chain[level].middleNames = composer.middleNames;
                        chain[level].surname = composer.surname;
                        chain[level].cae = composer.cae;
                    }
                    ecb();
                })
            } else {
                ecb();
            }
        }, cb);
    }, callback);
}

function combineComposerChains(chains) {
    chains.map((chainA) => {
        chains.map((chainB, index) => {
           if (chainA !== chainB && chainA.tree === chainB.tree) {
               chainA[chainA.totalLevels + 1] = chainB[chainA.totalLevels];
               chainA.totalLevels += 1;
               chains.splice(index, 1);
           }
        });
    });

    return chains;
}

function deconstructIpChain(level, row, chain) {
    let result = [];
    
    chain.children.map((child) => {
        // Create a new copy of the row on each child
        const rowCopy = JSON.parse(JSON.stringify(row));
        if (level == 1 ) { 
            rowCopy.territory = chain.territory; 
            rowCopy.tree = chain.territory
        }

        // Track tree (for combining composer chains) and total levels
        if(child.type === 'Publisher'){
            rowCopy.tree += '/Publisher_' + child.publisherId;
        }else if (child.type === 'Composer'){
            rowCopy.tree += '/Composer';
        }
        rowCopy.totalLevels = level;


        rowCopy[level] = {
            type: child.type,
            mechanicalOwnership: child.mechanicalOwnership,
            performanceOwnership: child.performanceOwnership,
            mechanicalCollection: child.mechanicalCollection,
            performanceCollection: child.performanceCollection,
            controlled: child.controlled,
            contractType: child.contractType,
            publisherId: child.publisherId,
            composerId: child.composerId,
        }

        result = result.concat(deconstructIpChain(level + 1, rowCopy, child));
        
        if(child.children.length === 0) {
            result.push(rowCopy);
        }
    });

    return result;
}