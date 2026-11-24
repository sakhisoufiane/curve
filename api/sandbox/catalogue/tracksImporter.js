require('dotenv').config();
require('../../models/db');

const TracksImporter = require("../../libs/imports/tracks");

const importTemplateVersion = 'v1';
const file = {
    fieldname: 'file',
    originalname: 'Armada 25 - Combined.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    destination: '/Users/mbs/Developer/Curve/api/tmp/',
    filename: '1722342302732-Armada 25 - Combined.xlsx',
    path: '/Users/mbs/Developer/Curve/api/tmp/1722342302732-Armada 25 - Combined.xlsx',
    size: 17833
  }
const curveUser = {
    id: '600ff2f8d497a0001b460d6d',
    type: 'client',
    internal: true,
    superInternal: true,
    clientId: '64d4b1346b0b7fb1ffda1714',
    rights: { '64d4b1346b0b7fb1ffda1714': [Object] },
    lockedForNonPayment: false,
    adminType: 'Standard',
    iat: 1722341048,
    exp: 1722427448
  }
const overwriteBlanks = false;

TracksImporter.import({importTemplateVersion, file, curveUser, overwriteBlanks}).then((console.log('done')));