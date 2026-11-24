require('dotenv').config();
require('../models/db');
const Import = require('../models/import');

Import.findById('61ba145943ca070697205ca0', (err, foundImport) => {
  console.log(foundImport);
  const curveUser = {
    id: '5fb3bed970b0a9b72be02326',
    clientId: foundImport.clientId,
  };
  foundImport.pullPublishingValues((err) => {
    logger.debug('DONE');
  });
  // if (foundImport.transferringSystem === 'Counterpoint Recordings') {
  //   foundImport.runImport(curveUser);
  // } else if (foundImport.transferringSystem === 'Counterpoint Publishing' || foundImport.transferringSystem === 'Linked Publishing') {
  //   foundImport.runPublishingImport(curveUser);
  // } else if (foundImport.transferringSystem === 'SR1 Publishing') {
  //   foundImport.runSr1PublishingImport(curveUser);
  // } else if (foundImport.transferringSystem === 'CWR') {
  //   foundImport.runCwrImport(curveUser);
  // } else if (foundImport.transferringSystem === 'Catalogue Shipment') {
  //   foundImport.runCatalogueShipmentImport(curveUser);
  // }
});
