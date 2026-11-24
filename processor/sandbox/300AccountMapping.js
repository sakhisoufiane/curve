require('../models/db');
const Client = require('../models/client');
const ObjectId = require('mongodb').ObjectId;

Client.findById("5d9b4089eb5f3f79c6ffaf69", (err, client) => {
  const mappings = client.accountingPeriodMappings.accounts;
  const catalogueData = { accounts: {} };
  client.accountingPeriodMappings.accounts.forEach((item) => {
    catalogueData.accounts[item.source] = catalogueData.accounts[item.source] || [];
    // Update territory group to array if ID
    if (ObjectId.isValid(item.territory)) {
      item.territory = territoryGroupMappings[item.territory];
    }
    // Add score for ordering
    item.score = 0;
    ['source', 'territory', 'distributionChannel'].forEach((key) => {
      if (item[key] && item[key] !== '') { item.score += 1; }
    });
    catalogueData.accounts[item.source].push(item);
    // Sort items
    catalogueData.accounts[item.source].sort((a, b) => a.score - b.score);
  });

  console.log(catalogueData);

  const salesLine = {
    distributionChannel: "Physical",
    territory: "US",
    source: "70 Warner Music",
    subSource: "70 Warner Music"
  };
  console.log(mapAccount(salesLine, catalogueData.accounts));
});

function mapAccount(salesLine, mappings) {
  if (salesLine && mappings) {
    // Check source mapping exists
    if (mappings[salesLine.subSource]) {
      console.log(mappings[salesLine.subSource]);
      let output;
      mappings[salesLine.subSource].forEach((item) => {
        if (!item.territory && !item.channel) {
          output = item.to;
        } else {
          const territoryMatches = !!(item.territory == salesLine.territory || (Array.isArray(item.territory) && item.territory.includes(salesLine.territory)) || !item.territory);
          const channelMatches = !!(item.channel == salesLine.distributionChannel || !item.channel);
          if (territoryMatches && channelMatches) {
            output = item.to;
          }
        }
      });
      return output;
    }
    return null;
  }
}