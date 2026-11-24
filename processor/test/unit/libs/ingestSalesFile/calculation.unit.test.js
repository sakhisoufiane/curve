process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');

const async = require('async');
const moment = require('moment');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const salesIngestionUtils = require('../../../../libs/salesIngestion/salesIngestionUtils');

const calculation = require('../../../../libs/salesIngestion/calculation');

logger.debug('\n\n**** ./test/unit/libs/ingestSalesFile/calculation.unit.test.js');

describe('calculation Unit Tests', () => {
  let dirtyString = '';
  for (let i = 0; i < 65535; i += 1) {
    dirtyString += String.fromCharCode(i);
  }

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    // Set up stubs
    sinon.stub(logger);
    sinon.stub(salesIngestionUtils, 'fieldToFormat');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  // -- calculation.startCalculation --
  describe('calculation.startCalculation', () => {
    let rawLine; let mappedLine; let calculations; let template; let calculationTime;
    beforeEach((done) => {
      rawLine = testUtils.randomArray();
      mappedLine = {};
      template = testUtils.randomArray();
      calculationTime = 0; // force to not skip calculations. Set below where required for specific 1 or 2 tests
      sinon.stub(calculation, 'evaluateConditions').returns(true);
      sinon.stub(calculation, 'performCalculation');
      done();
    });
    it('should call calculation.evaluateConditions with the correct arguments', (done) => {
      calculations = [
        {
          outputField: testUtils.randomString(),
          calculation: {
            calculations: testUtils.randomArray(),
          },
        },
      ];
      // Act
      calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
        // Assert
        expect(calculation.evaluateConditions.called).to.be.true;
        expect(calculation.evaluateConditions.calledWith(rawLine, mappedLine, calculations[0])).to.be.true;
        done();
      });
    });
    describe('if calculation.evaluateConditions returns false', () => {
      it('should not call calculation.performCalculation', (done) => {
        calculation.evaluateConditions.returns(false);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.not.be.true;
          done();
        });
      });
    });
    describe('if calculation.evaluateConditions returns true', () => {
      it('should NOT call calculation.performCalculation on 2nd calculation if calculation.valueType is "Field" AND outputField is NOT "retailPrice" or "perUnitRate", outputCalcuation added', (done) => {
        // Arrange
        calculationTime = 2;
        calculations = [
          {
            outputField: testUtils.randomString(),
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.not.be.true;
          done();
        });
      });
      it('should NOT call calculation.performCalculation on 1st calculation if calculateAfterMapping is set', (done) => {
        // Arrange
        calculationTime = 1;
        calculations = [
          {
            outputField: testUtils.randomString(),
            calculation: {
              calculations: testUtils.randomArray(),
            },
            calculateAfterMapping: true,
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.not.be.true;
          done();
        });
      });
      it('should call calculation.performCalculation if there are no calculations involved, just assignment, even on 2nd calculation', (done) => {
        // Arrange
        calculationTime = 2;
        calculations = [
          {
            outputField: testUtils.randomString(),
            calculation: {
              calculations: undefined,
              valueType: 'Field',
            },
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.be.true;
          done();
        });
      });
      it('should call calculation.performCalculation on 2nd calculation if calculateAfterMapping is set', (done) => {
        // Arrange
        calculationTime = 2;
        calculations = [
          {
            outputField: testUtils.randomString(),
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
            calculateAfterMapping: true,
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.be.true;
          done();
        });
      });
      it('should call calculation.performCalculation on 2nd calculation if valueType is NOT "Field"', (done) => {
        // Arrange
        calculationTime = 2;
        calculations = [
          {
            outputField: testUtils.randomString(),
            calculation: {
              calculations: testUtils.randomArray(),
            },
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.be.true;
          done();
        });
      });
      it('should call calculation.performCalculation on 2nd calculation if outputField is "retailPrice"', (done) => {
        // Arrange
        calculationTime = 2;
        calculations = [
          {
            outputField: 'retailPrice',
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.be.true;
          done();
        });
      });
      it('should call calculation.performCalculation on 2nd calculation if outputField is "perUnitRate"', (done) => {
        // Arrange
        calculationTime = 2;
        calculations = [
          {
            outputField: 'perUnitRate',
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(calculation.performCalculation.called).to.be.true;
          done();
        });
      });

      describe('Perform subsequent calculations', () => {
        describe('if a calculation contains 1 further calculation', () => {
          it('should call calculation.performCalculation 2 times', (done) => {
            // Arrange
            const outputField = testUtils.randomString();
            calculations = [
              {
                outputField,
                calculation: {
                  calculations: testUtils.randomArray(1),
                },
              },
            ];
            // Act
            calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, () => {
              // Assert
              expect(calculation.performCalculation.calledTwice).to.be.true;
              done();
            });
          });
          it('should update baseValue on the 2nd call and return result from 2nd call', (done) => {
            // Arrange
            const outputField = testUtils.randomString();
            calculations = [
              {
                outputField,
                calculation: {
                  calculations: testUtils.randomArray(1),
                },
              },
            ];
            const value1 = testUtils.randomString();
            const value2 = testUtils.randomString();
            calculation.performCalculation.onCall(0).returns(value1);
            calculation.performCalculation.onCall(1).returns(value2);
            // Act
            calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
              // Assert
              expect(calculation.performCalculation.calledTwice).to.be.true;
              expect(calculation.performCalculation.firstCall.calledWith(rawLine, mappedLine, null, calculations[0].calculation, template)).to.be.true;
              expect(calculation.performCalculation.secondCall.calledWith(rawLine, mappedLine, value1, calculations[0].calculation.calculations[0], template)).to.be.true;
              const expectedOutput = { [outputField]: value2 };
              expect(mappedLineOut).to.deep.eq(expectedOutput);
              done();
            });
          });
        });
        describe('if a calculation contains 2 further calculation', () => {
          it('should call calculation.performCalculation 3 times', (done) => {
            // Arrange
            const outputField = testUtils.randomString();
            calculations = [
              {
                outputField,
                calculation: {
                  calculations: testUtils.randomArray(2),
                },
              },
            ];
            // Act
            calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, () => {
              // Assert
              expect(calculation.performCalculation.calledThrice).to.be.true;
              done();
            });
          });
          it('should update baseValue on the 2nd call, update baseValue again on the 3rd call and return result from 3nd call', (done) => {
            // Arrange
            const outputField = testUtils.randomString();
            calculations = [
              {
                outputField,
                calculation: {
                  calculations: testUtils.randomArray(2),
                },
              },
            ];
            const value1 = testUtils.randomString();
            const value2 = testUtils.randomString();
            const value3 = testUtils.randomString();
            calculation.performCalculation.onCall(0).returns(value1);
            calculation.performCalculation.onCall(1).returns(value2);
            calculation.performCalculation.onCall(2).returns(value3);
            // Act
            calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
              // Assert
              expect(calculation.performCalculation.calledThrice).to.be.true;
              expect(calculation.performCalculation.firstCall.calledWith(rawLine, mappedLine, null, calculations[0].calculation, template)).to.be.true;
              expect(calculation.performCalculation.secondCall.calledWith(rawLine, mappedLine, value1, calculations[0].calculation.calculations[0], template)).to.be.true;
              expect(calculation.performCalculation.thirdCall.calledWith(rawLine, mappedLine, value2, calculations[0].calculation.calculations[1], template)).to.be.true;
              const expectedOutput = { [outputField]: value3 };
              expect(mappedLineOut).to.deep.eq(expectedOutput);
              done();
            });
          });
        });
      });

      // Trim strings
      it('it should trim the string if baseValue is a string', (done) => {
        // Arrange
        const outputField = testUtils.randomString();
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
            },
          },
        ];
        const value = testUtils.randomString();
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const expectedOutput = { [outputField]: value };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // -- Convert numbers to strings and remove non-identifier characters from certain output fields --

      // isrc
      it('it should convert a number to a string if outputField is "isrc"', (done) => {
        // Arrange
        const outputField = 'isrc';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "isrc"', (done) => {
        // Arrange
        const outputField = 'isrc';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z(),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // catNo
      it('it should convert a number to a string if outputField is "catNo"', (done) => {
        // Arrange
        const outputField = 'catNo';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "catNo"', (done) => {
        // Arrange
        calculationTime = 1;
        const outputField = 'catNo';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // barcode
      it('it should convert a number to a string if outputField is "barcode"', (done) => {
        // Arrange
        const outputField = 'barcode';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "barcode"', (done) => {
        // Arrange
        const outputField = 'barcode';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // identifier
      it('it should convert a number to a string if outputField is "identifier"', (done) => {
        // Arrange
        const outputField = 'identifier';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "identifier"', (done) => {
        // Arrange
        const outputField = 'identifier';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // originalIdentifier
      it('it should convert a number to a string if outputField is "originalIdentifier"', (done) => {
        // Arrange
        const outputField = 'originalIdentifier';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "originalIdentifier"', (done) => {
        // Arrange
        const outputField = 'originalIdentifier';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // tunecode
      it('it should convert a number to a string if outputField is "tunecode"', (done) => {
        // Arrange
        const outputField = 'tunecode';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "tunecode"', (done) => {
        // Arrange
        const outputField = 'tunecode';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // iswc
      it('it should convert a number to a string if outputField is "iswc"', (done) => {
        // Arrange
        const outputField = 'iswc';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "iswc"', (done) => {
        // Arrange
        const outputField = 'iswc';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // contractIdentifier
      it('it should convert a number to a string if outputField is "contractIdentifier"', (done) => {
        // Arrange
        const outputField = 'contractIdentifier';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomInt();
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('string');
          expect(mappedLineOut[outputField]).to.eq(String(value));
          done();
        });
      });
      it('it should remove non-identifier characters from baseValue if outputField is "contractIdentifier"', (done) => {
        // Arrange
        const outputField = 'contractIdentifier';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = `  ${dirtyString}  `;
        calculation.performCalculation.returns(`   ${value}   `);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          const cleanString = dirtyString.replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
          const expectedOutput = { [outputField]: cleanString };
          expect(mappedLineOut).to.deep.eq(expectedOutput);
          done();
        });
      });

      // Format certain output fields as a number
      it('it should change number provided as string to a number if outputField is "units"', (done) => {
        // Arrange
        const outputField = 'units';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomFloat();
        calculation.performCalculation.returns(String(value));
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('number');
          expect(mappedLineOut[outputField]).to.eq(value);
          done();
        });
      });
      it('it should change number provided as string to a number if outputField is "netAmount"', (done) => {
        // Arrange
        const outputField = 'netAmount';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomFloat();
        calculation.performCalculation.returns(String(value));
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('number');
          expect(mappedLineOut[outputField]).to.eq(value);
          done();
        });
      });
      it('it should change number provided as string to a number if outputField is "grossAmount"', (done) => {
        // Arrange
        const outputField = 'grossAmount';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = testUtils.randomFloat();
        calculation.performCalculation.returns(String(value));
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(typeof mappedLineOut[outputField]).to.eq('number');
          expect(mappedLineOut[outputField]).to.eq(value);
          done();
        });
      });

      // Format certain output fields as a JS Date
      describe('saleDate', () => {
        it('it should change a date provided as string DD-MMM-YYYY to a JS Date if outputField is "saleDate" with dateFormat "Date: DD-MMM-YYYY"', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'saleDate';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat: 'Date: DD-MMM-YYYY',
            },
          ];
          const nowMoment = moment.utc().startOf('day');
          const dateString = nowMoment.format('DD-MMM-YYYY');
          const expectedDate = nowMoment.toDate();

          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string YYYY-MM-DD to a JS Date if outputField is "saleDate" with NO dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'saleDate';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('YYYY-MM-DD');
          const expectedDate = new Date(dateString);
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string DD/MM/YYYY to a JS Date if outputField is "saleDate" with NO dateFormat supplied', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'saleDate';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('DD/MM/YYYY');
          const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should call salesIngestionUtils.fieldToFormat if outputField is "saleDate" AND dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'saleDate';
          const dateFormat = testUtils.randomArray();
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat,
            },
          ];
          const value = testUtils.randomString();
          calculation.performCalculation.returns(value);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(salesIngestionUtils.fieldToFormat.calledOnce).to.be.true;
            expect(salesIngestionUtils.fieldToFormat.calledWith(value, outputField, dateFormat)).to.be.true;
            done();
          });
        });
      });

      describe('transactionDate', () => {
        it('it should change a date provided as string DD-MMM-YYYY to a JS Date if outputField is "transactionDate" with dateFormat "Date: DD-MMM-YYYY"', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'transactionDate';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat: 'Date: DD-MMM-YYYY',
            },
          ];
          const nowMoment = moment.utc().startOf('day');
          const dateString = nowMoment.format('DD-MMM-YYYY');
          const expectedDate = nowMoment.toDate();

          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string YYYY-MM-DD to a JS Date if outputField is "transactionDate" with NO dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'transactionDate';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('YYYY-MM-DD');
          const expectedDate = new Date(dateString);
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string DD/MM/YYYY to a JS Date if outputField is "transactionDate" with NO dateFormat supplied', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'transactionDate';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('DD/MM/YYYY');
          const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should call salesIngestionUtils.fieldToFormat if outputField is "transactionDate" AND dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'transactionDate';
          const dateFormat = testUtils.randomArray();
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat,
            },
          ];
          const value = testUtils.randomString();
          calculation.performCalculation.returns(value);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(salesIngestionUtils.fieldToFormat.calledOnce).to.be.true;
            expect(salesIngestionUtils.fieldToFormat.calledWith(value, outputField, dateFormat)).to.be.true;
            done();
          });
        });
      });

      describe('dateFrom', () => {
        it('it should change a date provided as string DD-MMM-YYYY to a JS Date if outputField is "dateFrom" with dateFormat "Date: DD-MMM-YYYY"', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'dateFrom';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat: 'Date: DD-MMM-YYYY',
            },
          ];
          const nowMoment = moment.utc().startOf('day');
          const dateString = nowMoment.format('DD-MMM-YYYY');
          const expectedDate = nowMoment.toDate();

          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string YYYY-MM-DD to a JS Date if outputField is "dateFrom" with NO dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'dateFrom';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('YYYY-MM-DD');
          const expectedDate = new Date(dateString);
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string DD/MM/YYYY to a JS Date if outputField is "dateFrom" with NO dateFormat supplied', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'dateFrom';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('DD/MM/YYYY');
          const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should call salesIngestionUtils.fieldToFormat if outputField is "dateFrom" AND dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'dateFrom';
          const dateFormat = testUtils.randomArray();
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat,
            },
          ];
          const value = testUtils.randomString();
          calculation.performCalculation.returns(value);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(salesIngestionUtils.fieldToFormat.calledOnce).to.be.true;
            expect(salesIngestionUtils.fieldToFormat.calledWith(value, outputField, dateFormat)).to.be.true;
            done();
          });
        });
      });

      describe('dateTo', () => {
        it('it should change a date provided as string DD-MMM-YYYY to a JS Date if outputField is "dateTo" with dateFormat "Date: DD-MMM-YYYY"', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'dateTo';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat: 'Date: DD-MMM-YYYY',
            },
          ];
          const nowMoment = moment.utc().startOf('day');
          const dateString = nowMoment.format('DD-MMM-YYYY');
          const expectedDate = nowMoment.toDate();

          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string YYYY-MM-DD to a JS Date if outputField is "dateTo" with NO dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'dateTo';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('YYYY-MM-DD');
          const expectedDate = new Date(dateString);
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should change a date provided as string DD/MM/YYYY to a JS Date if outputField is "dateTo" with NO dateFormat supplied', (done) => {
          // Arrange
          salesIngestionUtils.fieldToFormat.restore();
          const outputField = 'dateTo';
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
            },
          ];
          const dateString = moment(new Date()).format('DD/MM/YYYY');
          const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
          calculation.performCalculation.returns(dateString);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(typeof mappedLineOut[outputField]).to.eq('object');
            expect(mappedLineOut[outputField]).to.deep.eq(expectedDate);
            done();
          });
        });
        it('it should call salesIngestionUtils.fieldToFormat if outputField is "dateTo" AND dateFormat supplied', (done) => {
          // Arrange
          const outputField = 'dateTo';
          const dateFormat = testUtils.randomArray();
          calculations = [
            {
              outputField,
              calculation: {
                calculations: testUtils.randomArray(),
                valueType: 'Field',
              },
              dateFormat,
            },
          ];
          const value = testUtils.randomString();
          calculation.performCalculation.returns(value);
          // Act
          calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
            // Assert
            expect(salesIngestionUtils.fieldToFormat.calledOnce).to.be.true;
            expect(salesIngestionUtils.fieldToFormat.calledWith(value, outputField, dateFormat)).to.be.true;
            done();
          });
        });
      });

      // Skip Row
      it('should return mappedLine with property "skip" set to true when outputField is "Skip Row"', (done) => {
        // Arrange
        const outputField = 'Skip Row';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(mappedLineOut.skip).to.eq(true);
          done();
        });
      });

      it('should return value as null when calculation returns NaN', (done) => {
        // Arrange
        const outputField = testUtils.randomString();
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const value = parseFloat(testUtils.randomString());
        calculation.performCalculation.returns(value);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(mappedLineOut[outputField]).to.eq(null);
          done();
        });
      });
    });

    describe('if any part of this process throws an error', () => {
      it('should catch and log the error, then return an error to the callback', (done) => {
        // Arrange
        const outputField = 'Skip Row';
        mappedLine = undefined;
        // outputField of 'Skip Row' will set a mappedLine property and fail
        const thrownError = 'Cannot set properties of undefined (setting \'skip\')';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const expectedError = 'An error in the calculations. Check your calculations and your template mapping and try again.';
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(logger.error.called).to.be.true;
          expect(logger.error.firstCall.args[0].message).to.eq(thrownError);
          expect(mappedLineOut).to.not.exist;
          expect(err).to.exist;
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
    describe('When calculationTime is 2 and calculations include calculateAfterMapping', () => {
      it('it should set calculateAfterMapping to true', (done) => {
        // Arrange
        salesIngestionUtils.fieldToFormat.restore();
        const outputField = 'dateFrom';
        calculationTime = 2;
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
            calculateAfterMapping: true,
          },
        ];
        const dateString = moment(new Date()).format('DD/MM/YYYY');
        const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
        calculation.performCalculation.returns(dateString);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(mappedLineOut.calculateAfterMapping).to.eq(true);
          done();
        });
      });
    });
    describe('When calculationTime is 2 and calculations do NOT include calculateAfterMapping', () => {
      it('should not add calculateAfterMapping to mappedLine', (done) => {
        // Arrange
        salesIngestionUtils.fieldToFormat.restore();
        const outputField = 'dateFrom';
        calculationTime = 2;
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
          },
        ];
        const dateString = moment(new Date()).format('DD/MM/YYYY');
        const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
        calculation.performCalculation.returns(dateString);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(mappedLineOut.calculateAfterMapping).to.eq(undefined);
          done();
        });
      });
    });
    describe('When calculationTime is 1 and calculations include calculateAfterMapping', () => {
      it('should not add calculateAfterMapping to mappedLine', (done) => {
        // Arrange
        salesIngestionUtils.fieldToFormat.restore();
        const outputField = 'dateFrom';
        calculations = [
          {
            outputField,
            calculation: {
              calculations: testUtils.randomArray(),
              valueType: 'Field',
            },
            calculateAfterMapping: true,
          },
        ];
        const dateString = moment(new Date()).format('DD/MM/YYYY');
        const expectedDate = salesIngestionUtils.fieldToFormat(dateString, outputField, 'Date: DD/MM/YYYY'); // calculation defaults to 'Date: DD/MM/YYYY' if string contains any / and no dateFormat supplied
        calculation.performCalculation.returns(dateString);
        // Act
        calculation.startCalculation(rawLine, mappedLine, calculations, template, calculationTime, (err, mappedLineOut) => {
          // Assert
          expect(mappedLineOut.calculateAfterMapping).to.eq(undefined);
          done();
        });
      });
    });
  });

  describe('calculation.evaluateConditions', () => {
    let rawLine; let mappedLine; let calculationObj;
    beforeEach((done) => {
      sinon.stub(calculation, 'checkComparison');
      sinon.stub(calculation, 'checkForExcelBooleanFormat');
      done();
    });

    // inputType of "Column"
    describe('for a condition with inputType of "Column", and conditions.if a number', () => {
      it('should set the inputValue to the value of rawLine[x] where x = conditions.if - 1', (done) => {
        // Arrange
        const comparison = testUtils.randomString();
        calculationObj = {
          conditions: [
            {
              inputType: 'Column',
              if: 3,
              comparison,
            },
          ],
        };
        rawLine = testUtils.randomArray(10);
        const checkForExcelOut = testUtils.randomString();
        calculation.checkForExcelBooleanFormat.returns(checkForExcelOut);
        // Act
        calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
        // Assert
        const expectedInputValue = rawLine[calculationObj.conditions[0].if - 1];
        expect(calculation.checkComparison.calledOnce).to.be.true;
        expect(calculation.checkComparison.calledWith(expectedInputValue, checkForExcelOut, comparison)).to.be.true;
        done();
      });
    });
    describe('for a condition with inputType of "Column", and conditions.if a number as a string', () => {
      it('should set the inputValue to the value of rawLine[x] where x = conditions.if - 1', (done) => {
        // Arrange
        const comparison = testUtils.randomString();
        calculationObj = {
          conditions: [
            {
              inputType: 'Column',
              if: String(5),
              comparison,
            },
          ],
        };
        rawLine = testUtils.randomArray(10);
        const checkForExcelOut = testUtils.randomString();
        calculation.checkForExcelBooleanFormat.returns(checkForExcelOut);
        // Act
        calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
        // Assert
        const expectedInputValue = rawLine[parseInt(calculationObj.conditions[0].if) - 1];
        expect(calculation.checkComparison.calledOnce).to.be.true;
        expect(calculation.checkComparison.calledWith(expectedInputValue, checkForExcelOut, comparison)).to.be.true;
        done();
      });
    });

    // inputType of "Field"
    describe('for a condition with inputType of "Field"', () => {
      it('should set the inputValue to the value of property x of mappedLine where x = conditions.if', (done) => {
        // Arrange
        const property = testUtils.randomString();
        const value = testUtils.randomString();
        const comparison = testUtils.randomString();
        calculationObj = {
          conditions: [
            {
              inputType: 'Field',
              if: property,
              comparison,
            },
          ],
        };
        mappedLine = {
          [testUtils.randomString()]: testUtils.randomString(),
          [property]: value,
          [testUtils.randomString()]: testUtils.randomString(),
        };
        const checkForExcelOut = testUtils.randomString();
        calculation.checkForExcelBooleanFormat.returns(checkForExcelOut);
        // Act
        calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
        // Assert
        const expectedInputValue = mappedLine[calculationObj.conditions[0].if];
        expect(calculation.checkComparison.calledOnce).to.be.true;
        expect(calculation.checkComparison.calledWith(expectedInputValue, checkForExcelOut, comparison)).to.be.true;
        done();
      });
    });
    describe('for a condition with inputType of "Field" and property stored in conditions.if does not match a property on mappedLine', () => {
      it('should set the inputValue to undefined', (done) => {
        // Arrange
        const property = testUtils.randomString();
        const comparison = testUtils.randomString();
        calculationObj = {
          conditions: [
            {
              inputType: 'Field',
              if: property,
              comparison,
            },
          ],
        };
        mappedLine = {
          [testUtils.randomString()]: testUtils.randomString(),
          [testUtils.randomString()]: testUtils.randomString(),
          [testUtils.randomString()]: testUtils.randomString(),
        };
        const checkForExcelOut = testUtils.randomString();
        calculation.checkForExcelBooleanFormat.returns(checkForExcelOut);
        // Act
        calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
        // Assert
        const expectedInputValue = undefined;
        expect(calculation.checkComparison.calledOnce).to.be.true;
        expect(calculation.checkComparison.calledWith(expectedInputValue, checkForExcelOut, comparison)).to.be.true;
        done();
      });
    });

    it('should call calculation.checkForExcelBooleanFormat with the correct arguments once, when one condition is supplied', (done) => {
      // Arrange
      calculationObj = {
        conditions: [
          { value: testUtils.randomString() },
        ],
      };
      calculation.checkComparison.restore();
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.exist;
      expect(calculation.checkForExcelBooleanFormat.calledOnce).to.be.true;
      expect(calculation.checkForExcelBooleanFormat.calledWith(calculationObj.conditions[0].value)).to.be.true;
      done();
    });
    it('should call calculation.checkForExcelBooleanFormat with the correct arguments twice, when two conditions are supplied', (done) => {
      // Arrange
      calculationObj = {
        conditions: [
          { value: testUtils.randomString() },
          { value: testUtils.randomString() },
        ],
      };
      calculation.checkComparison.restore();
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.exist;
      expect(calculation.checkForExcelBooleanFormat.calledTwice).to.be.true;
      // note: the loop parses the array in reverse, so first call is on last element of array
      expect(calculation.checkForExcelBooleanFormat.firstCall.calledWith(calculationObj.conditions[1].value)).to.be.true;
      expect(calculation.checkForExcelBooleanFormat.secondCall.calledWith(calculationObj.conditions[0].value)).to.be.true;
      done();
    });

    it('should return true if conditionType = "Any" and conditionMet array contains true', (done) => {
      // Arrange
      calculationObj = {
        conditions: testUtils.randomArray(2),
        conditionType: 'Any',
      };
      calculation.checkComparison.onCall(0).returns(true);
      calculation.checkComparison.onCall(1).returns(false);
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false if conditionType = "Any" and conditionMet array does not contain true', (done) => {
      // Arrange
      calculationObj = {
        conditions: testUtils.randomArray(2),
        conditionType: 'Any',
      };
      calculation.checkComparison.onCall(0).returns(false);
      calculation.checkComparison.onCall(1).returns(false);
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true if conditionType = "All" and conditionMet array does not contain false', (done) => {
      // Arrange
      calculationObj = {
        conditions: testUtils.randomArray(2),
        conditionType: 'All',
      };
      calculation.checkComparison.onCall(0).returns(true);
      calculation.checkComparison.onCall(1).returns(true);
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false if conditionType = "All" and conditionMet array includes false', (done) => {
      // Arrange
      calculationObj = {
        conditions: testUtils.randomArray(2),
        conditionType: 'All',
      };
      calculation.checkComparison.onCall(0).returns(false);
      calculation.checkComparison.onCall(1).returns(true);
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true if conditionType = "Always" and conditionMet array includes true or false', (done) => {
      // Arrange
      calculationObj = {
        conditions: testUtils.randomArray(2),
        conditionType: 'Always',
      };
      calculation.checkComparison.onCall(0).returns(true);
      calculation.checkComparison.onCall(1).returns(false);
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true if conditionType = "Always" and conditionMet array includes no values', (done) => {
      // Arrange
      calculationObj = {
        conditions: [],
        conditionType: 'Always',
      };
      // Act
      const output = calculation.evaluateConditions(rawLine, mappedLine, calculationObj);
      // Assert
      expect(output).to.be.true;
      done();
    });
  });

  describe('calculation.checkForExcelBooleanFormat', () => {
    it('should return true when value is "TRUE"', (done) => {
      // Arrange
      const value = 'TRUE';
      // Act
      const output = calculation.checkForExcelBooleanFormat(value);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when value is "true"', (done) => {
      // Arrange
      const value = 'true';
      // Act
      const output = calculation.checkForExcelBooleanFormat(value);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when value is "FALSE"', (done) => {
      // Arrange
      const value = 'FALSE';
      // Act
      const output = calculation.checkForExcelBooleanFormat(value);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when value is "false"', (done) => {
      // Arrange
      const value = 'false';
      // Act
      const output = calculation.checkForExcelBooleanFormat(value);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return the input value if any other value', (done) => {
      // Arrange
      const value = testUtils.randomString();
      // Act
      const output = calculation.checkForExcelBooleanFormat(value);
      // Assert
      expect(output).to.eq(value);
      done();
    });
  });

  describe('calculation.checkComparison', () => {
    // case 'Equals':
    it('should return true when comparison is "Equals" AND value (string) is Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Equals';
      const value = testUtils.randomString();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Equals" AND value (string) is NOT Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Equals';
      const value = testUtils.randomString(10);
      const compareTo = testUtils.randomString(20);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return true when comparison is "Equals" AND value (number) is Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Equals';
      const value = testUtils.randomFloat();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Equals" AND value (number) is NOT Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Equals';
      const value = testUtils.randomFloat();
      const compareTo = testUtils.randomFloat() + testUtils.randomInt();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Does Not Equal':
    it('should return true when comparison is "Does Not Equal" AND value (string) is NOT Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Equal';
      const value = testUtils.randomString(10);
      const compareTo = testUtils.randomString(20);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Does Not Equal" AND value (string) is Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Equal';
      const value = testUtils.randomString();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return true when comparison is "Does Not Equal" AND value (number) is NOT Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Equal';
      const value = testUtils.randomFloat();
      const compareTo = testUtils.randomFloat() + testUtils.randomInt();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Does Not Equal" AND value (number) is Equal to compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Equal';
      const value = testUtils.randomFloat();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Greater Than':
    it('should return true when comparison is "Greater Than" AND value is Greater Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Greater Than';
      const value = testUtils.randomFloat();
      const compareTo = value - testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Greater Than" AND value is Equal to compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Greater Than';
      const value = testUtils.randomFloat();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Greater Than" AND value is Less Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Greater Than';
      const value = testUtils.randomFloat();
      const compareTo = value + testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true when comparison is "Greater Than" AND value is Greater Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Greater Than';
      const value = testUtils.randomFloat();
      const compareTo = String(value - testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Greater Than" AND value is Equal to compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Greater Than';
      const value = testUtils.randomFloat();
      const compareTo = String(value);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Greater Than" AND value is Less Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Greater Than';
      const value = testUtils.randomFloat();
      const compareTo = String(value + testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Greater Than or Equal To':
    it('should return true when comparison is "Greater Than or Equal To" AND value is Greater Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Greater Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = value - testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Greater Than or Equal To" AND value is Equal to compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Greater Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Greater Than or Equal To" AND value Less Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Greater Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = value + testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true when comparison is "Greater Than or Equal To" AND value is Greater Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Greater Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = String(value - testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Greater Than or Equal To" AND value is Equal to compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Greater Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = String(value);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Greater Than or Equal To" AND value Less Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Greater Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = String(value + testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Less Than':
    it('should return true when comparison is "Less Than" AND value is Less Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Less Than';
      const value = testUtils.randomFloat();
      const compareTo = value + testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Less Than" AND value is Equal to compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Less Than';
      const value = testUtils.randomFloat();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Less Than" AND value is Greater Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Less Than';
      const value = testUtils.randomFloat();
      const compareTo = value - testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true when comparison is "Less Than" AND value is Less Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Less Than';
      const value = testUtils.randomFloat();
      const compareTo = String(value + testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Less Than" AND value is Equal to compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Less Than';
      const value = testUtils.randomFloat();
      const compareTo = String(value);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Less Than" AND value is Greater Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Less Than';
      const value = testUtils.randomFloat();
      const compareTo = String(value - testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Less Than or Equal To':
    it('should return true when comparison is "Less Than or Equal To" AND value is Less Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Less Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = value + testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Less Than or Equal To" AND value is Equal to compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Less Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = value;
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Less Than or Equal To" AND value is Greater Than compareTo (number)', (done) => {
      // Arrange
      const comparison = 'Less Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = value - testUtils.randomFloat();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true when comparison is "Less Than or Equal To" AND value is Less Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Less Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = String(value + testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Less Than or Equal To" AND value is Equal to compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Less Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = String(value);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Less Than or Equal To" AND value is Greater Than compareTo (number as string)', (done) => {
      // Arrange
      const comparison = 'Less Than or Equal To';
      const value = testUtils.randomFloat();
      const compareTo = String(value - testUtils.randomFloat());
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Contains':
    it('should return true when comparison is "Contains" AND value (string) contains compareTo', (done) => {
      // Arrange
      const comparison = 'Contains';
      const compareTo = testUtils.randomString();
      const value = testUtils.randomString() + compareTo + testUtils.randomString();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Contains" AND value (string) does NOT contain compareTo', (done) => {
      // Arrange
      const comparison = 'Contains';
      const compareTo = testUtils.randomString(20);
      const value = testUtils.randomString(10);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true when comparison is "Contains" AND value (number) contains compareTo', (done) => {
      // Arrange
      const comparison = 'Contains';
      const compareTo = testUtils.randomInt();
      const value = Number(String(testUtils.randomInt()) + String(compareTo) + String(testUtils.randomInt()));
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Contains" AND value (number) does NOT contain compareTo', (done) => {
      // Arrange
      const comparison = 'Contains';
      const compareTo = testUtils.randomString();
      const value = testUtils.randomInt();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Does Not Contain':
    it('should return true when comparison is "Does Not Contain" AND value (string) does NOT contain compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Contain';
      const compareTo = testUtils.randomString(20);
      const value = testUtils.randomString(10);
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Does Not Contain" AND value (string) contains compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Contain';
      const compareTo = testUtils.randomString();
      const value = testUtils.randomString() + compareTo + testUtils.randomString();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    it('should return true when comparison is "Does Not Contain" AND value (number) does NOT contain compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Contain';
      const compareTo = testUtils.randomString();
      const value = testUtils.randomInt();
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Does Not Contain" AND value (number) contains compareTo', (done) => {
      // Arrange
      const comparison = 'Does Not Contain';
      const compareTo = testUtils.randomInt();
      const value = Number(String(testUtils.randomInt()) + String(compareTo) + String(testUtils.randomInt()));
      // Act
      const output = calculation.checkComparison(value, compareTo, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Is Blank':
    it('should return true when comparison is "Is Blank" AND value null', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = null;
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Is Blank" AND value undefined', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = undefined;
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Is Blank" AND value is an empty string', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = '';
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Is Blank" AND value is string of only spaces', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = '    ';
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return false when comparison is "Is Blank" AND value is 0', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = 0;
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Is Blank" AND value is a number', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = testUtils.randomInt();
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Is Blank" AND value is a string of characters', (done) => {
      // Arrange
      const comparison = 'Is Blank';
      const value = testUtils.randomString();
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });

    // case 'Is Not Blank':
    it('should return false when comparison is "Is Not Blank" AND value null', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = null;
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Is Not Blank" AND value undefined', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = undefined;
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Is Not Blank" AND value is an empty string', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = '';
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return false when comparison is "Is Not Blank" AND value is string of only spaces', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = '    ';
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.false;
      done();
    });
    it('should return true when comparison is "Is Not Blank" AND value is 0', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = 0;
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Is Not Blank" AND value is a number', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = testUtils.randomInt();
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
    it('should return true when comparison is "Is Not Blank" AND value is a string of characters', (done) => {
      // Arrange
      const comparison = 'Is Not Blank';
      const value = testUtils.randomString();
      // Act
      const output = calculation.checkComparison(value, null, comparison);
      // Assert
      expect(output).to.be.true;
      done();
    });
  });

  describe('calculation.performCalculation', () => {
    let rawLine; let mappedLine; let baseValue; let calculationObj; let template;

    // valueType is 'Column'
    describe('when valueType is "Column", calculation.value is a number', () => {
      it('should return rawLine[calculation.value - 1]', (done) => {
        // Arrange
        const index = 2;
        const field = testUtils.randomString();
        const type = testUtils.randomString();
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Equals',
          valueType: 'Column',
          value: index,
        };
        rawLine = testUtils.randomArray(10);
        template = [
          {
            field: testUtils.randomString(),
            type: testUtils.randomString(),
          },
          {
            field,
            type,
          },
        ];
        const formattedField = testUtils.randomString();
        salesIngestionUtils.fieldToFormat.returns(formattedField);
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(formattedField);
        expect(salesIngestionUtils.fieldToFormat.called).to.be.true;
        expect(salesIngestionUtils.fieldToFormat.calledWith(rawLine[index - 1], field, type)).to.be.true;
        done();
      });
    });
    describe('when valueType is "Column", calculation.value is a number and index at number does not exist on rawLine', () => {
      it('should return rawLine[calculation.value - 1]', (done) => {
        // Arrange
        const index = 20;
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Equals',
          valueType: 'Column',
          value: index,
        };
        rawLine = testUtils.randomArray(10);
        const formattedField = testUtils.randomString();
        salesIngestionUtils.fieldToFormat.returns(formattedField);
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(undefined);
        expect(salesIngestionUtils.fieldToFormat.called).to.be.false;
        done();
      });
    });
    describe('when valueType is "Column", calculation.value is a number with field not defined', () => {
      it('should defaulting field to "name", call salesIngestionUtils.fieldToFormat with the correct arguments and return the output of this', (done) => {
        // Arrange
        const index = 2;
        const field = undefined;
        const type = testUtils.randomString();
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Equals',
          valueType: 'Column',
          value: index,
        };
        rawLine = testUtils.randomArray(10);
        template = [
          {
            field: testUtils.randomString(),
            type: testUtils.randomString(),
          },
          {
            field,
            type,
          },
        ];
        const formattedField = testUtils.randomString();
        salesIngestionUtils.fieldToFormat.returns(formattedField);
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(formattedField);
        expect(salesIngestionUtils.fieldToFormat.called).to.be.true;
        expect(salesIngestionUtils.fieldToFormat.calledWith(rawLine[index - 1], 'name', type)).to.be.true;
        done();
      });
    });
    describe('when valueType is "Column", calculation.value is a number as string', () => {
      it('should salesIngestionUtils.fieldToFormat with the correct arguments and return the output of this', (done) => {
        // Arrange
        const index = 2;
        const field = testUtils.randomString();
        const type = testUtils.randomString();
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Equals',
          valueType: 'Column',
          value: String(index),
        };
        rawLine = testUtils.randomArray(10);
        template = [
          {
            field: testUtils.randomString(),
            type: testUtils.randomString(),
          },
          {
            field,
            type,
          },
        ];
        const formattedField = testUtils.randomString();
        salesIngestionUtils.fieldToFormat.returns(formattedField);
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(formattedField);
        expect(salesIngestionUtils.fieldToFormat.called).to.be.true;
        expect(salesIngestionUtils.fieldToFormat.calledWith(rawLine[index - 1], field, type)).to.be.true;
        done();
      });
    });

    // valueType is 'Field'
    describe('when valueType is "Field"', () => {
      it('should return property x of mappedLine where x = calculation.value', (done) => {
        // Arrange
        const property = testUtils.randomString();
        const value = testUtils.randomString();
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Equals',
          valueType: 'Field',
          value: property,
        };
        mappedLine = {
          [testUtils.randomString()]: testUtils.randomString(),
          [property]: value,
          [testUtils.randomString()]: testUtils.randomString(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(mappedLine[property]);
        done();
      });
    });
    describe('when valueType is "Field" and property stored in calculation.value does not match a property on mappedLine', () => {
      it('should return undefined', (done) => {
        // Arrange
        const property = testUtils.randomString();
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Equals',
          valueType: 'Field',
          value: property,
        };
        mappedLine = {
          [testUtils.randomString()]: testUtils.randomString(),
          [testUtils.randomString()]: testUtils.randomString(),
          [testUtils.randomString()]: testUtils.randomString(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(undefined);
        done();
      });
    });

    // valueType is 'Value'
    describe('when calculation.function is "Equals" and valueType is "Value"', () => {
      it('should return calculation.value', (done) => {
        // Arrange
        calculationObj = {
          function: 'Equals',
          valueType: 'Value',
          value: testUtils.randomString(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculationObj.value);
        done();
      });
    });

    // Addition
    describe('when calculation.function is "Addition", valueType is "Value" and calculation.value is set', () => {
      it('should return baseValue + calculation.value', (done) => {
        // Arrange
        baseValue = testUtils.randomFloat();
        calculationObj = {
          function: 'Addition',
          valueType: 'Value',
          value: testUtils.randomFloat(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(baseValue + calculationObj.value));
        done();
      });
    });
    describe('when calculation.function is "Addition", valueType is "Value" and calculation.value is not defined', () => {
      it('should return baseValue', (done) => {
        // Arrange
        baseValue = testUtils.randomFloat();
        calculationObj = {
          function: 'Addition',
          valueType: 'Value',
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });
    describe('when calculation.function is "Addition" and valueType is "Value", baseValue is a number as string and calculation.value is a number as string', () => {
      it('should convert baseValue & calculation.value to numbers, then return baseValue + calculation.value', (done) => {
        // Arrange
        baseValue = String(testUtils.randomFloat());
        calculationObj = {
          function: 'Addition',
          valueType: 'Value',
          value: String(testUtils.randomFloat()),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(parseFloat(baseValue) + parseFloat(calculationObj.value)));
        done();
      });
    });
    describe('when calculation.function is "Addition" and valueType is "Value", baseValue is a number as string and calculation.value is not defined', () => {
      it('should convert baseValue to a number and return this', (done) => {
        // Arrange
        baseValue = String(testUtils.randomFloat());
        calculationObj = {
          function: 'Addition',
          valueType: 'Value',
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(parseFloat(baseValue));
        done();
      });
    });

    // Minus
    describe('when calculation.function is "Minus", valueType is "Value" and calculation.value is set', () => {
      it('should return baseValue - calculation.value', (done) => {
        // Arrange
        baseValue = testUtils.randomFloat();
        calculationObj = {
          function: 'Minus',
          valueType: 'Value',
          value: testUtils.randomFloat(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(baseValue - calculationObj.value));
        done();
      });
    });
    describe('when calculation.function is "Minus", valueType is "Value" and calculation.value is not defined', () => {
      it('should return baseValue', (done) => {
        // Arrange
        baseValue = testUtils.randomFloat();
        calculationObj = {
          function: 'Minus',
          valueType: 'Value',
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });
    describe('when calculation.function is "Minus" and valueType is "Value", baseValue is a number as string and calculation.value is a number as string', () => {
      it('should convert baseValue & calculation.value to numbers, then return baseValue subtracted by calculation.value', (done) => {
        // Arrange
        baseValue = String(testUtils.randomFloat());
        calculationObj = {
          function: 'Minus',
          valueType: 'Value',
          value: String(testUtils.randomFloat()),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(parseFloat(baseValue) - parseFloat(calculationObj.value)));
        done();
      });
    });
    describe('when calculation.function is "Minus" and valueType is "Value", baseValue is a number as string and calculation.value is not defined', () => {
      it('should convert baseValue to a number and return this', (done) => {
        // Arrange
        baseValue = String(testUtils.randomFloat());
        calculationObj = {
          function: 'Minus',
          valueType: 'Value',
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(parseFloat(baseValue));
        done();
      });
    });

    // Multiply
    describe('when calculation.function is "Multiply" and valueType is "Value"', () => {
      it('should return baseValue multiplied by calculation.value', (done) => {
        // Arrange
        baseValue = testUtils.randomFloat();
        calculationObj = {
          function: 'Multiply',
          valueType: 'Value',
          value: testUtils.randomFloat(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(baseValue * calculationObj.value));
        done();
      });
    });
    describe('when calculation.function is "Multiply" and valueType is "Value", baseValue is a number as string, calculation.value is a number as string', () => {
      it('should convert baseValue & calculation.value to numbers, then return baseValue multiplied by calculation.value', (done) => {
        // Arrange
        baseValue = String(testUtils.randomFloat());
        calculationObj = {
          function: 'Multiply',
          valueType: 'Value',
          value: String(testUtils.randomFloat()),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(parseFloat(baseValue) * parseFloat(calculationObj.value)));
        done();
      });
    });

    describe('when calculation.function is "Divide" and valueType is "Value"', () => {
      it('should return baseValue divided calculation.value', (done) => {
        // Arrange
        baseValue = testUtils.randomFloat();
        calculationObj = {
          function: 'Divide',
          valueType: 'Value',
          value: testUtils.randomFloat(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(baseValue / calculationObj.value));
        done();
      });
    });
    describe('when calculation.function is "Divide" and valueType is "Value", baseValue is a number as string, calculation.value is a number as string', () => {
      it('should convert baseValue & calculation.value to numbers, then return baseValue divided calculation.value', (done) => {
        // Arrange
        baseValue = String(testUtils.randomFloat());
        calculationObj = {
          function: 'Divide',
          valueType: 'Value',
          value: String(testUtils.randomFloat()),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(calculation.formatCalculationOutput(parseFloat(baseValue) / parseFloat(calculationObj.value)));
        done();
      });
    });

    // Left
    describe('when calculation.function is "Left", valueType is "Value" and baseValue is a string', () => {
      it('should return the first x characters from baseValue where x = calculation.value', (done) => {
        // Arrange
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Left',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue.substring(0, calculationObj.value));
        done();
      });
    });
    describe('when calculation.function is "Left", valueType is "Value" and baseValue is a number', () => {
      it('should the first 3 digits as a string', (done) => {
        // Arrange
        baseValue = 123456;
        calculationObj = {
          function: 'Left',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq('123');
        done();
      });
    });
    describe('when calculation.function is "Left", valueType is "Value" and baseValue is a null', () => {
      it('should return the baseValue', (done) => {
        // Arrange
        baseValue = null;
        calculationObj = {
          function: 'Left',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });
    describe('when calculation.function is "Left", valueType is "Value" and baseValue is not undefined', () => {
      it('should return the baseValue', (done) => {
        // Arrange
        baseValue = undefined;
        calculationObj = {
          function: 'Left',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });

    // Right
    describe('when calculation.function is "Right", valueType is "Value" and baseValue is a string', () => {
      it('should return the last x characters from baseValue where x = calculation.value', (done) => {
        // Arrange
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Right',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue.substring(baseValue.length - calculationObj.value, baseValue.length));
        done();
      });
    });
    describe('when calculation.function is "Right", valueType is "Value" and baseValue is a number', () => {
      it('should return the last 3 digits of the number', (done) => {
        // Arrange
        baseValue = 123456;
        calculationObj = {
          function: 'Right',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq('456');
        done();
      });
    });
    describe('when calculation.function is "Right", valueType is "Value" and baseValue is a null', () => {
      it('should return the baseValue', (done) => {
        // Arrange
        baseValue = null;
        calculationObj = {
          function: 'Right',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });
    describe('when calculation.function is "Right", valueType is "Value" and baseValue is not undefined', () => {
      it('should return the baseValue', (done) => {
        // Arrange
        baseValue = undefined;
        calculationObj = {
          function: 'Right',
          valueType: 'Value',
          value: 3,
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });

    // Concatenate
    describe('when calculation.function is "Concatenate", valueType is "Value" and calculation.value is set', () => {
      it('should join baseValue and calculation.value into one string and return this', (done) => {
        // Arrange
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Concatenate',
          valueType: 'Value',
          value: testUtils.randomString(),
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(`${baseValue}${calculationObj.value}`);
        done();
      });
    });
    describe('when calculation.function is "Concatenate", valueType is "Value" and calculation.value is not undefined', () => {
      it('should return the baseValue', (done) => {
        // Arrange
        baseValue = testUtils.randomString();
        calculationObj = {
          function: 'Concatenate',
          valueType: 'Value',
        };
        // Act
        const output = calculation.performCalculation(rawLine, mappedLine, baseValue, calculationObj, template);
        // Assert
        expect(output).to.eq(baseValue);
        done();
      });
    });
  });
});
