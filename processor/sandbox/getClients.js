require('../models/db');
const { ObjectId } = require('mongodb');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

const ids = ['5c1b7ebf4717931442c9daa0', '5be992234bbb96239b5ddc55', '5ab39683fdf03c7ee5d7996e', '5deedb1074b985509bb666ca', '5deedb1074b985509bb666ca', '5d07759340fd0951e9f622bf', '5e1663ad28ef751d6967dcc3', '5ad4b75de94e863f20c366a5', '5e561ca620fd56026e0eaad2', '5e27480670a5032aa17d8d42', '5e561ca620fd56026e0eaad2', '5ca47723cea27217c48e104f', '5e561ca620fd56026e0eaad2', '5ca47723cea27217c48e104f', '5e561ca620fd56026e0eaad2', '5c61eeb19528a86b05acb02c', '5ad4cdffe94e863f20c366b3', '5d0915054df38d63acc32ea7', '5d09152812f143697cc04bc7', '5d0915473fa1cd66bb4e5bae', '5d0915473fa1cd66bb4e5bae', '5d1f1288b340025a9b556ece', '5c6d209b7ed7f47f8e0d4f26', '5d00bf7f37ff9c112529055e', '5d0915818333d8593c93f99d', '5d0915fa4df38d63acc32eaf', '5d0916163fa1cd66bb4e5bb8', '5d0916163fa1cd66bb4e5bb8', '5d09162c3fa1cd66bb4e5bbb', '5d0916444df38d63acc32eb0', '5dfb6d6d9b8d682ab02b37fc', '5d0916444df38d63acc32eb0', '5d0916883fa1cd66bb4e5bbc', '5dfb6d6d9b8d682ab02b37fc', '5d0916883fa1cd66bb4e5bbc', '5d0916a98333d8593c93f9a4', '5d0916a98333d8593c93f9a4', '5d0916da8333d8593c93f9a5', '5de50b0cd203190b68831c86', '5d0917248333d8593c93f9a6', '5be310bb1ed33758ad4faa12', '5b8d5f1aebe3190f018da121', '5d0916724df38d63acc32eb1', '5d0916c23fa1cd66bb4e5bdd', '5d0916c23fa1cd66bb4e5bdd', '5df769a0fefa5055060e0f69', '5c8111983390913542831692', '5e14ae220bd36838e0ec0fa4', '5daed100d5ddcc29154e1fa2', '5be310bb1ed33758ad4faa12', '5ced40e29ed7de75f623857f', '5d00bf7f37ff9c112529055e', '5e14ae220bd36838e0ec0fa4', '5dfb6dcac62cac46a9a2273d', '5e14ae220bd36838e0ec0fa4', '5df769a0fefa5055060e0f69', '5ae84c67f029594c82f242a4', '5daed100d5ddcc29154e1fa2', '5ae84c67f029594c82f242a4', '5bc89d1283c7161f955c5a2e'];

Client.find({ _id: { $in: ids.map((id) => ObjectId(id)) } }, { name: 1, clientType: 1 }, (err, clients) => {
  clients.forEach((client) => {
    console.log(client.name, '-', client.clientType);
  });
});
