require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const ImportXlsx = require('../libs/importXlsx');
const Work = require('../models/work');

// Add import details here:
const filePath = '/Users/kacper/Desktop/Barometer Fund Work Export 20231013193201774.xlsx';

/*
The script is intended to remove publishers from ip chains and preserve composers,
even when those composers are children of publishers, those aremoved to first level array. 
The script checks first level of children type, on the second level it assumes there are only composers.
*/

const importWorksTemplate = [{ "key": "ID" }, { "key": "Title" }, { "key": "Composers" }, { "key": "Foreign ID" }, { "key": "Project ID" }, { "key": "Party No" }, { "key": "Main Identifier" }, { "key": "ISWC" }, { "key": "Tunecode" }, { "key": "Copyright Date" }, { "key": "Label Copy" }, { "key": "Priority Work" }, { "key": "Production Library Work" }, { "key": "Category" }, { "key": "Language" }, { "key": "Composite Type" }, { "key": "No. of Composite Works" }, { "key": "Work Version" }, { "key": "Arrangement Type" }, { "key": "Lyric Adaption" }, { "key": "Performers" }, { "key": "Track ISRCs" }, { "key": "Territories" }, { "key": "Catalogue Groups" }, { "key": "Aliases" }, { "key": "Notes" }];

const removePublishersFromWorks = (file) => {
    let count = 0;
    const date = new Date()
    logger.info(`Attempting to get data from file: ${file}`)
    async.waterfall([
        function (cb) {
            // read from 1st line in xlsx file
            const startLine = 2;
            ImportXlsx.getDataByTemplate(file, importWorksTemplate, 0, startLine, date, (err, works) => {
                if (err) { return cb(err) }
                logger.info(`Imported ${works.length} catNos from file from file.`)
                cb(null, works)
            })
        },
        async function (works) {
            const worksData = await Work.find({ _id: { $in: works.map(i => i.ID) } });
            
            for (let w = 0; w < worksData.length; w += 1) {
                console.log('Processing work : ' + worksData[w]._id + ' ' + (w + 1) + '/' + worksData.length);

                const newChildren = [];
                for (let c = 0; c < worksData[w].rightsChain?.[0]?.children?.length; c += 1) {
                    if (worksData[w].rightsChain?.[0]?.children?.[c]?.type === 'Publisher') {
                        newChildren.push(
                            ...worksData[w].rightsChain[0].children[c].children
                        );
                        worksData[w].rightsChain[0].children[c] = null;
                    }
                }
                
                if (worksData[w].rightsChain[0]?.children) {
                    worksData[w].rightsChain[0].children.push(...newChildren);
                    worksData[w].rightsChain[0].children = worksData[w].rightsChain[0]?.children.filter(item => !!item);
                }

                const { rightsChain } = worksData[w];
                await Work.updateOne({ _id: worksData[w]._id }, { $set: { rightsChain, valid: false, approvalStatus: 'Invalid' } }, { timestamps: false });
            }

            return;
        },
    ], (err) => {
        if (err) {
            logger.error(err);
        }
        process.exit(-1);

    })
}

// Invoke function
removePublishersFromWorks(filePath);
