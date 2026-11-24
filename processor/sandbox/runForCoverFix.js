require('../models/db');
const { ObjectId } = require('mongodb');
const Cost = require('../models/cost');

const ids = ['5f6522caa482a7004bfbe736', '5f6522caa482a7004bfbe737', '5f6522caa482a7004bfbe738', '5f6522caa482a7004bfbe739', '5f6522caa482a7004bfbe73a', '5f6522caa482a7004bfbe73b', '5f6522caa482a7004bfbe73c', '5f6522caa482a7004bfbe73d', '5f6522caa482a7004bfbe73e', '5f6522caa482a7004bfbe73f', '5f6522c8a482a7004bfbe4f8', '5f6522c8a482a7004bfbe4f9', '5f6522c8a482a7004bfbe4fa', '5f6522caa482a7004bfbe724', '5f6522caa482a7004bfbe725', '5f6522caa482a7004bfbe727', '5f6522caa482a7004bfbe729', '5f6522cca482a7004bfbe949'];

Cost.updateMany({ _id: { $in: ids.map((id) => ObjectId(id)) } }, { $pull: { calculationContractIds: '5e729cd7900e1b3ee1f62c08' } }, (err, res) => {
  console.log(res);
});
