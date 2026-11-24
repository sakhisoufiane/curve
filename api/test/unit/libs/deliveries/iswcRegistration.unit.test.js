// process.env.NODE_ENV = 'test';
// const chai = require('chai');
// const { logger } = require('@curveroyaltysystems/platform-shared-utils');

// const { expect } = chai;
// const sinon = require('sinon');
// const IswcRegistration = require('../../../../libs/deliveries/iswcRegistration');

// logger.debug('\n\n**** .test/unit/libs/deliveries/iswcRegistration.unit.test.js');

// describe('IswcRegistration', () => {
//   let works; let iswcRegistration;

//   before((done) => {
//     // Clean up
//     sinon.restore();
//     done();
//   });

//   beforeEach((done) => {
//     iswcRegistration = new IswcRegistration();

//     works = [
//       {
//         title: 'Work Title',
//         recordings: [
//           { title: 'Track 1', isrc: 'ABC123' },
//           { title: 'Track 2', isrc: 'ABC124' },
//         ],
//         rightsChain: [
//           {
//             territory: 'WW',
//             children: [
//               {
//                 publisher: {
//                   territories: [
//                     'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
//                     'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
//                     'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
//                     'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE',
//                     'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
//                     'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI',
//                     'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG',
//                     'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC',
//                     'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN',
//                     'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR',
//                   ],
//                   _id: '5ff83abd8a117301523505bd',
//                   societies: [],
//                   publisherAgreements: [],
//                   linkedContracts: [],
//                   clientId: '5d5bebe63faed34f863736e9',
//                   name: '474 MUSIC',
//                   cae: '00449852120',
//                   performancePro: 'BMI',
//                   controlled: true,
//                   partyNo: 97,
//                   __v: 0,
//                   lowerCaseName: '474 music',
//                 },
//                 publisherId: '5ff83abd8a117301523505bd',
//                 type: 'Publisher',
//                 contractType: 'Admin',
//                 controlled: true,
//                 mechanicalOwnership: 0,
//                 performanceOwnership: 0,
//                 mechanicalCollection: 100,
//                 performanceCollection: 50,
//                 children: [
//                   {
//                     type: 'Publisher',
//                     publisherId: '5e1202661f62745ba87230f5',
//                     contractType: 'Admin',
//                     controlled: true,
//                     performanceOwnership: 0,
//                     mechanicalOwnership: 0,
//                     performanceCollection: 0,
//                     mechanicalCollection: 0,
//                     children: [
//                       {
//                         type: 'Publisher',
//                         publisherId: '5e2d849e454b761dbe9504da',
//                         contractType: 'Original Publisher',
//                         controlled: true,
//                         performanceOwnership: 50,
//                         performanceCollection: 0,
//                         mechanicalOwnership: 100,
//                         mechanicalCollection: 0,
//                         interestedPartyNo: 'P168',
//                         children: [
//                           {
//                             type: 'Composer',
//                             composerId: '5e2d849e454b761dbe9504e1',
//                             contractType: 'Lyrics and Music',
//                             controlled: true,
//                             performanceOwnership: 50,
//                             performanceCollection: 50,
//                             mechanicalOwnership: 0,
//                             mechanicalCollection: 0,
//                             composer: {
//                               territories: [
//                                 'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF',
//                                 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER',
//                                 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR',
//                                 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ',
//                                 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC',
//                                 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN',
//                                 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS',
//                                 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY',
//                                 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV',
//                                 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN',
//                                 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE',
//                                 'PR',
//                               ],
//                               societies: [],
//                               publisherAgreements: [],
//                               linkedContracts: [],
//                               clientId: '5d5bebe63faed34f863736e9',
//                               name: 'DANIELLE GOODING',
//                               cae: '00630263090',
//                               performancePro: 'PRS',
//                               mechanicalPro: 'PRS',
//                               syncPro: 'PRS',
//                               controlled: true,
//                               partyNo: 5,
//                               __v: 0,
//                               lowerCaseName: 'danielle gooding',
//                             },
//                           },
//                           {
//                             type: 'Composer',
//                             composerId: '5e2d849e454b761dbe9504e1',
//                             contractType: 'Lyrics and Music',
//                             controlled: true,
//                             performanceOwnership: 50,
//                             performanceCollection: 50,
//                             mechanicalOwnership: 0,
//                             mechanicalCollection: 0,
//                             composer: {
//                               territories: [
//                                 'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF',
//                                 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER',
//                                 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR',
//                                 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ',
//                                 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC',
//                                 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN',
//                                 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS',
//                                 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY',
//                                 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV',
//                                 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN',
//                                 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE',
//                                 'PR',
//                               ],
//                               societies: [],
//                               publisherAgreements: [],
//                               linkedContracts: [],
//                               clientId: '5d5bebe63faed34f863736e9',
//                               name: 'DANIELLE GOODING 2',
//                               cae: '00630263091',
//                               performancePro: 'PRS',
//                               mechanicalPro: 'PRS',
//                               syncPro: 'PRS',
//                               controlled: true,
//                               partyNo: 5,
//                               __v: 0,
//                               lowerCaseName: 'danielle gooding',
//                             },
//                           },
//                         ],
//                         syncCollection: 100,
//                         publisher: {
//                           territories: [
//                             'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
//                             'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
//                             'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
//                             'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE',
//                             'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
//                             'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI',
//                             'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG',
//                             'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC',
//                             'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN',
//                             'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR',
//                           ],
//                           societies: [],
//                           publisherAgreements: [],
//                           linkedContracts: [],
//                           clientId: '5d5bebe63faed34f863736e9',
//                           name: 'SONGS IN THE KEY OF KNIFE',
//                           cae: '00274018085',
//                           performancePro: 'PRS',
//                           mechanicalPro: 'MCPS',
//                           syncPro: 'PRS',
//                           controlled: true,
//                           partyNo: 2,
//                           __v: 0,
//                           lowerCaseName: 'songs in the key of knife',
//                         },
//                       },
//                     ],
//                     publisher: {
//                       territories: [
//                         'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD',
//                         'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA',
//                         'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW',
//                         'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE',
//                         'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
//                         'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI',
//                         'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG',
//                         'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC',
//                         'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN',
//                         'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR',
//                       ],
//                       societies: [
//                         {
//                           society: 'ASCAP',
//                           identifier: '',
//                           publisherName: 'Someone Else 2',
//                         },
//                       ],
//                       publisherAgreements: [],
//                       linkedContracts: [],
//                       name: 'Test Publisher',
//                       controlled: true,
//                       clientId: '5d5bebe63faed34f863736e9',
//                       partyNo: 1,
//                       __v: 4,
//                       mainPro: 'PRS',
//                       mechanicalPro: null,
//                       performancePro: null,
//                       syncPro: null,
//                       mainProIdentifier: '12345',
//                       cae: '33333',
//                       lowerCaseName: 'test publisher',
//                     },
//                   },
//                 ],
//               },
//             ],
//             score: 1000,
//           },
//         ],
//       },
//     ];
//     done();
//   });

//   afterEach((done) => {
//     // Clean up
//     sinon.restore();
//     done();
//   });

//   describe('.createData', () => {
//     // Arrange
//     let config;

//     beforeEach((done) => {
//       config = { hello: 'World' };
//       iswcRegistration.createHeader = sinon.stub().yields();
//       iswcRegistration.createWorks = sinon.stub().yields();
//       done();
//     });

//     it('should call createHeader', (done) => {
//       // Act
//       iswcRegistration.createData([], config, (err, output) => {
//         // Assert
//         expect(iswcRegistration.createHeader.called);
//         done();
//       });
//     });
//     it('should call createWorks', (done) => {
//       // Act
//       iswcRegistration.createData([], config, (err, output) => {
//         // Assert
//         expect(iswcRegistration.createWorks.called);
//         done();
//       });
//     });
//     describe('when createHeader returns an error', () => {
//       it('should return the error to the callback', (done) => {
//         // Arrange
//         const errMessage = new Error('This is an error');
//         iswcRegistration.createHeader.yields(errMessage);
//         // Act
//         iswcRegistration.createData([], config, (err) => {
//           // Assert
//           expect(err).to.eq(errMessage);
//           done();
//         });
//       });
//     });
//     describe('when createWorks returns an error', () => {
//       it('should return the error to the callback', (done) => {
//         // Arrange
//         const errMessage = new Error('This is an error');
//         iswcRegistration.createWorks.yields(errMessage);
//         // Act
//         iswcRegistration.createData([], config, (err) => {
//           // Assert
//           expect(err).to.eq(errMessage);
//           done();
//         });
//       });
//     });
//   });

//   describe('.createHeader', () => {
//     describe('when config is passed', () => {
//       it('should add the header to the output object');
//     });

//     describe('when config is not passed', () => {
//       it('should return an error', (done) => {
//         // Arrange
//         const expectedError = new Error('Configuration required to setup fileHeader');
//         // Act
//         iswcRegistration.createHeader(null, (err) => {
//           // Assert
//           expect(err.message).to.eq(expectedError.message);
//           done();
//         });
//       });
//     });
//   });

//   describe('.createWorks', () => {
//     describe('when works are passed', () => {
//       it('should add an item to addSubmissions on the output object for each work');
//       it('should call getIsrcsFromWork for each work passed');
//       it('should call getInterestedPartiesFromWork for each work passed');
//       it('should structure the output as expected and add to addSubmissions');
//     });
//     describe('when no works are passed', () => {
//       it('should not raise an error');
//       it('should not change the addSubmissions array');
//     });
//   });

//   describe('.getIsrcsFromWork', () => {
//     describe('when work has recordings', () => {
//       it('should return an array of ISRCs from the recordings');
//       it('should remove any duplicate ISRCs');
//     });
//     describe('when work has no recordings', () => {
//       it('should return a blank array');
//     });
//   });

//   describe('.getInterestedPartiesFromWork', () => {
//     describe('when work has a rightsChain', () => {
//       it('should call composersFromChildren for each item within the rightsChain');
//       it('should return a composer for each unique composer in the chain');
//       it('should call composersToUniqueOutput once');
//     });
//     describe('when work does not have a rightsChain', () => {
//       it('should return a blank array');
//     });
//   });

//   describe('.composersFromChildren', () => {
//     describe('when chain has no children', () => {
//       it('should return a blank array');
//     });
//     describe('when chain has children', () => {
//       it('should return an item for each composer in the chain');
//       it('should extract the composer item from each level within the chain');
//       it('should not extract publisher items');
//     });
//   });

//   describe('.composersToUniqueOutput', () => {
//     let mapRoleValue;

//     beforeEach((done) => {
//       mapRoleValue = 'Value';
//       iswcRegistration.mapRole = sinon.stub().returns(mapRoleValue);
//       done();
//     });

//     describe('when passed composers', () => {
//       let composers;
//       beforeEach(() => {
//         composers = [
//           { name: 'ABC', cae: '123', contractType: 'Lyrics and Music' },
//           { name: 'ABCD', cae: '1234', contractType: 'Music' },
//         ];
//       });

//       it('should return an item for each unique value in the input', (done) => {
//         // Act
//         const output = iswcRegistration.composersToUniqueOutput(composers);
//         // Assert
//         expect(output.length).to.eq(composers.length);
//         done();
//       });
//       it('should remove any duplicate composers', (done) => {
//         // Arrange
//         composers.push(composers[0]); // Adds a duplicate
//         // Act
//         const output = iswcRegistration.composersToUniqueOutput(composers);
//         // Assert
//         expect(output.length).to.eq(2);
//         done();
//       });
//       it('should map the cae and role in the output', (done) => {
//         // Arrange
//         const expectedOutput = {
//           nameNumber: parseInt(composers[0].cae),
//           role: mapRoleValue,
//         };
//         // Act
//         const output = iswcRegistration.composersToUniqueOutput(composers);
//         // Assert
//         expect(output[0]).to.deep.eq(expectedOutput);
//         done();
//       });
//       it('should return the value from mapRole in the role field', (done) => {
//         // Act
//         const output = iswcRegistration.composersToUniqueOutput(composers);
//         // Assert
//         expect(iswcRegistration.mapRole.called);
//         expect(output[0].role).to.eq(mapRoleValue);
//         done();
//       });
//     });
//     describe('when not passed composers', () => {
//       it('should return a blank array', (done) => {
//         // Act
//         const output = iswcRegistration.composersToUniqueOutput(null);
//         // Assert
//         expect(output).to.deep.eq([]);
//         done();
//       });
//     });
//   });

//   describe('.mapRole', () => {
//     it('should return CA when passed Lyrics and Music', (done) => {
//       // Act
//       const output = iswcRegistration.mapRole('Lyrics and Music');
//       // Assert
//       expect(output).to.eq('CA');
//       done();
//     });
//     it('should return A when passed Lyrics', (done) => {
//       // Act
//       const output = iswcRegistration.mapRole('Lyrics');
//       // Assert
//       expect(output).to.eq('A');
//       done();
//     });
//     it('should return C when passed Music', (done) => {
//       // Act
//       const output = iswcRegistration.mapRole('Music');
//       // Assert
//       expect(output).to.eq('C');
//       done();
//     });
//     it('should return CA when passed anything else', (done) => {
//       // Act
//       const output = iswcRegistration.mapRole('Anything Else');
//       // Assert
//       expect(output).to.eq('CA');
//       done();
//     });
//   });
// });
