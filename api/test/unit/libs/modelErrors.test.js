process.env.NODE_ENV = 'test';
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const chai = require('chai');

const { expect } = chai;
const sinon = require('sinon');
const ModelErrors = require('../../../libs/modelErrors');

describe('ModelErrors', function () {
  logger.info('>>>file>>>> unit/libs/modelErrors .....................');

  before(function (done) {
    // Clean up
    sinon.stub();
    done();
  });

  after(function (done) {
    // Clean up
    sinon.stub();
    done();
  });

  describe('#map', function () {
    describe('when passed a string', function () {
      let mapValueStub;
      const stubResult = 'Stub Result';
      const value = 'Path `name` is required, Path `another` is required';
      // let splitValueSpy;
      beforeEach(function (done) {
        mapValueStub = sinon.stub(ModelErrors, 'mapValue');
        mapValueStub.returns(stubResult);
        // splitValueSpy = sinon.spy(value, "split");

        done();
      });

      afterEach(function (done) {
        mapValueStub.restore();
        // splitValueSpy.restore();

        done();
      });

      describe('when passed a delimiter', function () {
        // TODO these are failing, need to find out how to spy on string object
        it.skip('should call split on the string with the passed delimiter', function (done) {
          const delimiter = ';';
          ModelErrors.map(value, delimiter);
          // expect(splitValueSpy.calledWith(delimiter)).to.be.true;

          done();
        });
      });

      describe('when not passed a delimiter', function () {
        it.skip('should call split on the string with a comma', function (done) {
          ModelErrors.map(value);
          // expect(splitValueSpy.calledWith(',')).to.be.true;

          done();
        });
      });

      it('should return a value for each value passed separated by a comma', function (done) {
        expect(ModelErrors.map(value).length).to.eq(value.split(',').length);

        done();
      });

      it('should call mapValue for each value passed separated by a comma', function (done) {
        mapValueStub.reset();
        ModelErrors.map(value);
        expect(mapValueStub.callCount).to.eq(value.split(',').length);

        done();
      });

      it.skip('should return the value from mapValue for each value', function (done) {
        expect(ModelErrors.map(value)).to.deep.eq([stubResult, stubResult]);

        done();
      });
    });

    describe('when not passed a string', function () {
      it('should raise an error stating string should be passed', function (done) {
        try {
          ModelErrors.map(null);
        } catch (err) {
          expect(err.message).to.eq('A String is required');
          done();
        }
      });
    });
  });

  describe('#mapValue', function () {
    it("when string includes 'Path `name` is required' it should return the mapped value", function (done) {
      const value = 'Path `name` is required';
      expect(ModelErrors.mapValue(value)).to.eq('A Name is required');

      done();
    });

    it('when string is not one of mappings, it should return the original value', function (done) {
      const value = 'Anything else';
      expect(ModelErrors.mapValue(value)).to.eq(value);

      done();
    });
  });
});
