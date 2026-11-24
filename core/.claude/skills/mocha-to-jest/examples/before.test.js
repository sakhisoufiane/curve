const { expect } = require('chai');
const sinon = require('sinon');
const userService = require('../src/userService');

describe('UserService', function () {
  let stub;

  before(function () {
    stub = sinon.stub(userService, 'find');
  });

  after(function () {
    sinon.restore();
  });

  it('returns a user', function (done) {
    stub.resolves({ id: 1, name: 'Alice' });
    userService.find(1).then((user) => {
      expect(user).to.deep.equal({ id: 1, name: 'Alice' });
      done();
    });
  });

  it('throws on missing user', function () {
    expect(() => userService.find(null)).to.throw('Invalid ID');
  });
});