require('dotenv').config();
require('../models/db');
const Work = require('../models/work');

const partyNos = [1424, 174, 4774, 5487, 720, 725];

Work.find({ clientId: '5b8d5f1aebe3190f018da121', partyNo: { $in: partyNos } }, (err, works) => {
  works.forEach((work) => {
    console.log(work.title, work.tunecode);
  });
});
