require('../models/db');
const Period = require('../models/period');
const Cost = require('../models/cost');

// Period.findById("5f5fd541955ed10303489524", function(err, period) {
// Cost.find({ _id: { $in: period.costIds } }, function(err, costs) {
// let periodIds = [];
// costs.forEach(function(cost) {
// cost.periodIds.forEach(function(id) {
// if(!periodIds.includes(id)) {
// periodIds.push(id);
// }
// });
// });
// console.log("Period Ids:", periodIds);
// });
//
// });

Cost.find({ periodIds: '5f5fd541955ed10303489524' }, (err, costs) => {
  let amount = 0;
  costs.forEach((cost) => {
    amount += cost.amount;
  });
  console.log(amount);
});
