require('dotenv').config();
require('../models/db');
const Import = require('../models/import');

Import.findById('63b6fbe7f5acf6b175b89e85', (err, foundImport) => {
  console.log(foundImport);
  const curveUser = {
    id: '62e792bf280d37784eb60bb4',
    clientId: foundImport.clientId,
  };
  foundImport.status = 'Importing';
  foundImport.save(() => {
    if (foundImport.transferringSystem === 'Counterpoint Recordings') {
      foundImport.runImport(curveUser);
    } else if (foundImport.transferringSystem === 'Counterpoint Publishing' || foundImport.transferringSystem === 'Linked Publishing') {
      foundImport.runPublishingImport(curveUser);
    } else if (foundImport.transferringSystem === 'SR1 Publishing') {
      foundImport.runSr1PublishingImport(curveUser);
    } else if (foundImport.transferringSystem === 'CWR') {
      foundImport.runCwrImport(curveUser);
    } else if (foundImport.transferringSystem === 'Maestro 400 Catalogue Shipment') {
      foundImport.runCsImport(curveUser);
    } else if (foundImport.transferringSystem === 'Catalogue Shipment') {
      foundImport.runCatalogueShipmentImport(curveUser);
    }
  });
});
