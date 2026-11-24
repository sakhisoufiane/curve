require('dotenv').config();
require('../models/db');
const fs = require('fs')
const { each, eachLimit } = require('async');
const Client = require('../models/client');
const Release = require('../models/release');
const Track = require('../models/track');
const Contract = require('../models/contract');

async function run() {
  const parentId = '5a30fcc7e819142d310d79eb';
  const clients = await Client.find({ parentId }).sort({ _id: 1 });
  console.log(`Found ${clients.length} clients`);
  eachLimit(clients, 20, async (client) => {
    console.log(`${clients.indexOf(client) + 1}/${clients.length} Checking client: ${client.name.replace(',', '.')} ${client._id.toString()}`);
    
    // Check the client's releases
    const releases = await Release.find({ clientId: client._id.toString() }, 'salesReturnsRights costsRights mechanicalLicenses');
    console.log(`Found ${releases.length} releases`);
    console.log(`Checking releases..`);
    await eachLimit(releases, 300, async (release) => {
      await each(release.salesReturnsRights, async (right) => {
        if (right?.contractId?.length === 24) {
          const contract = await Contract.findById(right.contractId, 'name contractType');
          if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Release, ${release._id.toString()}, Sales Contract doesn't exist\n`); }
          else if (contract.contractType === 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Release, ${release._id.toString()}, Sales Contract ${contract.name} is of the wrong type\n`); }
        }
      })

      await each(release.costsRights, async (right) => {
        if (right?.contractId?.length === 24) {
          const contract = await Contract.findById(right.contractId, 'name contractType');
          if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Release, ${release._id.toString()}, Costs Contract doesn't exist\n`); }
          else if (contract.contractType === 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Release, ${release._id.toString()}, Costs Contract ${contract.name} is of the wrong type\n`); }
        }
      })

      for (const track in release.mechanicalLicenses) {
        await each(release.mechanicalLicenses[track].licenses, async (license) => {
          if (license?.contractId?.length === 24) {
            const contract = await Contract.findById(license.contractId, 'name contractType');
            if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Release, ${release._id.toString()}, Mechanical Contract doesn't exist\n`); }
            else if (contract.contractType !== 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Release, ${release._id.toString()}, Mechanical Contract ${contract.name} is of the wrong type\n`); }
          }
        })
      }
    })

    // Check the client's tracks
    const tracks = await Track.find({ clientId: client._id.toString() }, 'salesReturnsRights releaseSpecificSalesReturnsRights costsRights mechanicalLicenses');
    console.log(`Found ${tracks.length} tracks`);
    console.log(`Checking tracks..`);
    await eachLimit(tracks, 300, async (track) => {
      await each(track.salesReturnsRights, async (right) => {
        if (right?.contractId?.length === 24) {
          const contract = await Contract.findById(right.contractId, 'name contractType');
          if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Track, ${release._id.toString()}, Sales Contract doesn't exist\n`); }
          else if (contract.contractType === 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Track, ${track._id.toString()}, Sales Contract ${contract.name} is of the wrong type\n`); }
        }
      })
      
      await each(track.releaseSpecificSalesReturnsRights, async (right) => {
        if (right?.contractId?.length === 24) {
          const contract = await Contract.findById(right.contractId, 'name contractType');
          if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Track, ${release._id.toString()}, Release Specific Contract doesn't exist\n`); }
          else if (contract.contractType === 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Track, ${track._id.toString()}, Release Specific Sales Contract ${contract.name} is of the wrong type\n`); }
        }
      })
      
      await each(track.costsRights, async (right) => {
        if (right?.contractId?.length === 24) {
          const contract = await Contract.findById(right.contractId, 'name contractType');
          if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Track, ${release._id.toString()}, Costs Contract doesn't exist\n`); }
          else if (contract.contractType === 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Track, ${track._id.toString()}, Costs Contract ${contract.name} is of the wrong type\n`); }
        }
      })
      
      await each(track.mechanicalLicenses, async (license) => {
        if (license?.contractId?.length === 24) {
          const contract = await Contract.findById(license.contractId, 'name contractType');
          if (!contract) { writeToFile(`${client.name.replace(',', '.')}, Track, ${track._id.toString()}, Mechanical Contract doesn't exist\n`); }
            else if (contract.contractType !== 'Mechanical') { writeToFile(`${client.name.replace(',', '.')}, Track, ${track._id.toString()}, Mechanical Contract ${contract.name} is of the wrong type\n`); }
        }
      })

    })

    console.log(`${clients.indexOf(client) + 1}/${clients.length} Done Checking client: ${client.name.replace(',', '.')} ${client._id.toString()}`);
  });
}

run();

const writeToFile = (text) => {
  const filename = 'contractsCheck.csv';
  fs.writeFileSync(filename, text, { flag: "a+" });
}