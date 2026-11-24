require('dotenv').config();
require('../../models/db');
const Ack = require('../../models/cwrAcknowledgement');
const Work = require('../../models/work');

const ACK_ID = '649351f6d3bac1f49f06d9e5';

// 644c222f48d640c29c0f2582 MEU PARAISO SOU EU
// 644c222f48d640c29c0f257c OLHO NO GATO
// 644c222f48d640c29c0f257e TUDO SEU

async function main() {
  const { workIds } = await Ack.findById(ACK_ID);

  for (const id of workIds) {
    const work = await Work.findById(id);
    if (!work.iswc) continue;
    try {
      console.log('Triggering update on work', work.id, work.title);
      await work.save();
    } catch (err) {
      console.log('Error attempting to save work', work.id, work.title);
      console.log(err);
    }
  }

  process.exit(0);
}

main();
