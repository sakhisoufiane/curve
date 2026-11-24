process.env.NODE_ENV = 'test';
// require('../../../models/db');
const { CWR } = require('@curveroyaltysystems/curve-shared-logic');
const { expect } = require('chai');
const sinon = require('sinon');
const util = require('util');

const cwr = new CWR();

describe('mergeChains', () => {
  describe('when passed one chain', () => {
    it('should return the chain unchanged', (done) => {
      // Arrange
      const chains = [{
        territory: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
        children: [
          {
            type: 'Publisher',
            publisherId: '604be42957a8000041e9c27e',
            contractType: 'Admin',
            controlled: true,
            mechanicalOwnership: 0,
            performanceOwnership: 0,
            mechanicalCollection: 50,
            performanceCollection: 25,
            children: [
              {
                type: 'Publisher',
                publisherId: '604be57557a8000041e9d2bd',
                contractType: 'Original Publisher',
                controlled: true,
                mechanicalOwnership: 50,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 0,
                children: [
                  {
                    type: 'Composer',
                    composerId: '604be57557a8000041e9d2d1',
                    contractType: 'Lyrics and Music',
                    controlled: true,
                    mechanicalOwnership: 0,
                    performanceOwnership: 25,
                    mechanicalCollection: 0,
                    performanceCollection: 25,
                    composer: {
                      societies: [],
                      publisherAgreements: [],
                      linkedContracts: [],
                      _id: '604be57557a8000041e9d2d1',
                      clientId: '6011be441c0f9a00565b6daa',
                      name: 'ARNI FREYR LARUSSON',
                      cae: '00896177772',
                      performancePro: 'STEF',
                      mechanicalPro: 'NCB',
                      syncPro: 'NS',
                      controlled: true,
                      partyNo: 222,
                      __v: 2,
                      firstName: 'ARNI',
                      mainPro: 'STEF',
                      middleNames: 'FREYR',
                      surname: 'LARUSSON',
                    },
                  },
                ],
                publisher: {
                  societies: [],
                  publisherAgreements: [
                    {
                      publisherId: '6068e8243ee1ec00b99aea43',
                      agreementType: 'Subpublishing Specific',
                      territory: 'GB',
                      society: 'PRS',
                      agreementNo: '10926197',
                    },
                  ],
                  linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                  _id: '604be57557a8000041e9d2bd',
                  clientId: '6011be441c0f9a00565b6daa',
                  name: 'TOO FM',
                  cae: '01032520712',
                  performancePro: 'ASCAP',
                  mechanicalPro: 'HARRY FOX',
                  syncPro: 'NS',
                  controlled: true,
                  partyNo: 40,
                  __v: 2,
                  mainPro: 'ASCAP',
                },
              },
            ],
            publisher: {
              societies: [],
              publisherAgreements: [
                {
                  publisherId: '6068e8243ee1ec00b99aea43',
                  agreementType: 'Subpublishing General',
                  territory: 'GB',
                  society: 'PRS',
                  agreementNo: '10775645',
                },
              ],
              linkedContracts: [],
              _id: '604be42957a8000041e9c27e',
              clientId: '6011be441c0f9a00565b6daa',
              name: 'COMPOSITIONS OF KOZE',
              cae: '00394572130',
              performancePro: 'ASCAP',
              mechanicalPro: 'HARRY FOX',
              syncPro: 'NS',
              controlled: true,
              partyNo: 1,
              __v: 1,
              mainPro: 'ASCAP',
            },
          },
          {
            type: 'Publisher',
            publisherId: '6056a882f4b3e50016b69f9d',
            contractType: 'Original Publisher',
            controlled: false,
            mechanicalOwnership: 50,
            performanceOwnership: 25,
            mechanicalCollection: 50,
            performanceCollection: 25,
            children: [
              {
                type: 'Composer',
                composerId: '6056d250f4b3e50016b69fd6',
                contractType: 'Lyrics and Music',
                controlled: false,
                mechanicalOwnership: 0,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 25,
                composer: {
                  societies: [],
                  publisherAgreements: [],
                  linkedContracts: [],
                  _id: '6056d250f4b3e50016b69fd6',
                  name: 'UNKNOWN WRITER',
                  firstName: 'UNKNOWN',
                  surname: 'WRITER',
                  mainPro: 'NS',
                  mechanicalPro: 'NS',
                  performancePro: 'NS',
                  clientId: '6011be441c0f9a00565b6daa',
                  partyNo: 388,
                  __v: 0,
                },
              },
            ],
            publisher: {
              societies: [],
              publisherAgreements: [],
              linkedContracts: [],
              _id: '6056a882f4b3e50016b69f9d',
              clientId: '6011be441c0f9a00565b6daa',
              name: 'UNKNOWN PUBLISHER',
              mainPro: 'NS',
              mechanicalPro: 'NS',
              performancePro: 'NS',
              syncPro: 'NS',
              partyNo: 51,
              __v: 0,
            },
          },
        ],
        score: 24900,
      }];
      const testOutput = chains.slice();
      // Act
      const outputChains = cwr.mergeChains(chains);
      // Assert
      expect(outputChains).to.deep.eq(testOutput);
      done();
    });
  });
  describe('when passed two chains that have no publishers the same', () => {
    it('should return the two chains unchanged', (done) => {
      // Arrange
      const chains = [{
        territory: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
        children: [
          {
            type: 'Publisher',
            publisherId: '604be42957a8000041e9c27e',
            contractType: 'Admin',
            controlled: true,
            mechanicalOwnership: 0,
            performanceOwnership: 0,
            mechanicalCollection: 50,
            performanceCollection: 25,
            children: [
              {
                type: 'Publisher',
                publisherId: '604be57557a8000041e9d2bd',
                contractType: 'Original Publisher',
                controlled: true,
                mechanicalOwnership: 50,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 0,
                children: [
                  {
                    type: 'Composer',
                    composerId: '604be57557a8000041e9d2d1',
                    contractType: 'Lyrics and Music',
                    controlled: true,
                    mechanicalOwnership: 0,
                    performanceOwnership: 25,
                    mechanicalCollection: 0,
                    performanceCollection: 25,
                    composer: {
                      societies: [],
                      publisherAgreements: [],
                      linkedContracts: [],
                      _id: '604be57557a8000041e9d2d1',
                      clientId: '6011be441c0f9a00565b6daa',
                      name: 'ARNI FREYR LARUSSON',
                      cae: '00896177772',
                      performancePro: 'STEF',
                      mechanicalPro: 'NCB',
                      syncPro: 'NS',
                      controlled: true,
                      partyNo: 222,
                      __v: 2,
                      firstName: 'ARNI',
                      mainPro: 'STEF',
                      middleNames: 'FREYR',
                      surname: 'LARUSSON',
                    },
                  },
                ],
                publisher: {
                  societies: [],
                  publisherAgreements: [
                    {
                      publisherId: '6068e8243ee1ec00b99aea43',
                      agreementType: 'Subpublishing Specific',
                      territory: 'GB',
                      society: 'PRS',
                      agreementNo: '10926197',
                    },
                  ],
                  linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                  _id: '604be57557a8000041e9d2bd',
                  clientId: '6011be441c0f9a00565b6daa',
                  name: 'TOO FM',
                  cae: '01032520712',
                  performancePro: 'ASCAP',
                  mechanicalPro: 'HARRY FOX',
                  syncPro: 'NS',
                  controlled: true,
                  partyNo: 40,
                  __v: 2,
                  mainPro: 'ASCAP',
                },
              },
            ],
            publisher: {
              societies: [],
              publisherAgreements: [
                {
                  publisherId: '6068e8243ee1ec00b99aea43',
                  agreementType: 'Subpublishing General',
                  territory: 'GB',
                  society: 'PRS',
                  agreementNo: '10775645',
                },
              ],
              linkedContracts: [],
              _id: '604be42957a8000041e9c27e',
              clientId: '6011be441c0f9a00565b6daa',
              name: 'COMPOSITIONS OF KOZE',
              cae: '00394572130',
              performancePro: 'ASCAP',
              mechanicalPro: 'HARRY FOX',
              syncPro: 'NS',
              controlled: true,
              partyNo: 1,
              __v: 1,
              mainPro: 'ASCAP',
            },
          },
          {
            type: 'Publisher',
            publisherId: '6056a882f4b3e50016b69f9d',
            contractType: 'Original Publisher',
            controlled: false,
            mechanicalOwnership: 50,
            performanceOwnership: 25,
            mechanicalCollection: 50,
            performanceCollection: 25,
            children: [
              {
                type: 'Composer',
                composerId: '6056d250f4b3e50016b69fd6',
                contractType: 'Lyrics and Music',
                controlled: false,
                mechanicalOwnership: 0,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 25,
                composer: {
                  societies: [],
                  publisherAgreements: [],
                  linkedContracts: [],
                  _id: '6056d250f4b3e50016b69fd6',
                  name: 'UNKNOWN WRITER',
                  firstName: 'UNKNOWN',
                  surname: 'WRITER',
                  mainPro: 'NS',
                  mechanicalPro: 'NS',
                  performancePro: 'NS',
                  clientId: '6011be441c0f9a00565b6daa',
                  partyNo: 388,
                  __v: 0,
                },
              },
            ],
            publisher: {
              societies: [],
              publisherAgreements: [],
              linkedContracts: [],
              _id: '6056a882f4b3e50016b69f9d',
              clientId: '6011be441c0f9a00565b6daa',
              name: 'UNKNOWN PUBLISHER',
              mainPro: 'NS',
              mechanicalPro: 'NS',
              performancePro: 'NS',
              syncPro: 'NS',
              partyNo: 51,
              __v: 0,
            },
          },
        ],
        score: 24900,
      },
      {
        territory: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
        children: [
          {
            type: 'Publisher',
            publisherId: '604be42957a8000041e9c27e',
            contractType: 'Admin',
            controlled: true,
            mechanicalOwnership: 0,
            performanceOwnership: 0,
            mechanicalCollection: 50,
            performanceCollection: 25,
            children: [
              {
                type: 'Publisher',
                publisherId: '604be57557a8000041e9d2bd',
                contractType: 'Original Publisher',
                controlled: true,
                mechanicalOwnership: 50,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 0,
                children: [
                  {
                    type: 'Composer',
                    composerId: '604be57557a8000041e9d2d1',
                    contractType: 'Lyrics and Music',
                    controlled: true,
                    mechanicalOwnership: 0,
                    performanceOwnership: 25,
                    mechanicalCollection: 0,
                    performanceCollection: 25,
                    composer: {
                      societies: [],
                      publisherAgreements: [],
                      linkedContracts: [],
                      _id: '604be57557a8000041e9d2d1',
                      clientId: '6011be441c0f9a00565b6daa',
                      name: 'ARNI FREYR LARUSSON',
                      cae: '00896177772',
                      performancePro: 'STEF',
                      mechanicalPro: 'NCB',
                      syncPro: 'NS',
                      controlled: true,
                      partyNo: 222,
                      __v: 2,
                      firstName: 'ARNI',
                      mainPro: 'STEF',
                      middleNames: 'FREYR',
                      surname: 'LARUSSON',
                    },
                  },
                ],
                publisher: {
                  societies: [],
                  publisherAgreements: [
                    {
                      publisherId: '6068e8243ee1ec00b99aea43',
                      agreementType: 'Subpublishing Specific',
                      territory: 'GB',
                      society: 'PRS',
                      agreementNo: '10926197',
                    },
                  ],
                  linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                  _id: '604be57557a8000041e9d2bd',
                  clientId: '6011be441c0f9a00565b6daa',
                  name: 'TOO FM UNRELATED',
                  cae: '01032520712',
                  performancePro: 'ASCAP',
                  mechanicalPro: 'HARRY FOX',
                  syncPro: 'NS',
                  controlled: true,
                  partyNo: 40,
                  __v: 2,
                  mainPro: 'ASCAP',
                },
              },
            ],
            publisher: {
              societies: [],
              publisherAgreements: [
                {
                  publisherId: '6068e8243ee1ec00b99aea43',
                  agreementType: 'Subpublishing General',
                  territory: 'GB',
                  society: 'PRS',
                  agreementNo: '10775645',
                },
              ],
              linkedContracts: [],
              _id: '604be42957a8000041e9c27e',
              clientId: '6011be441c0f9a00565b6daa',
              name: 'COMPOSITIONS OF KOZE UNRELATED',
              cae: '00394572130',
              performancePro: 'ASCAP',
              mechanicalPro: 'HARRY FOX',
              syncPro: 'NS',
              controlled: true,
              partyNo: 1,
              __v: 1,
              mainPro: 'ASCAP',
            },
          },
          {
            type: 'Publisher',
            publisherId: '6056a882f4b3e50016b69f9d',
            contractType: 'Original Publisher',
            controlled: false,
            mechanicalOwnership: 50,
            performanceOwnership: 25,
            mechanicalCollection: 50,
            performanceCollection: 25,
            children: [
              {
                type: 'Composer',
                composerId: '6056d250f4b3e50016b69fd6',
                contractType: 'Lyrics and Music',
                controlled: false,
                mechanicalOwnership: 0,
                performanceOwnership: 25,
                mechanicalCollection: 0,
                performanceCollection: 25,
                composer: {
                  societies: [],
                  publisherAgreements: [],
                  linkedContracts: [],
                  _id: '6056d250f4b3e50016b69fd6',
                  name: 'UNKNOWN WRITER',
                  firstName: 'UNKNOWN',
                  surname: 'WRITER',
                  mainPro: 'NS',
                  mechanicalPro: 'NS',
                  performancePro: 'NS',
                  clientId: '6011be441c0f9a00565b6daa',
                  partyNo: 388,
                  __v: 0,
                },
              },
            ],
            publisher: {
              societies: [],
              publisherAgreements: [],
              linkedContracts: [],
              _id: '6056a882f4b3e50016b69f9d',
              clientId: '6011be441c0f9a00565b6daa',
              name: 'UNKNOWN PUBLISHER',
              mainPro: 'NS',
              mechanicalPro: 'NS',
              performancePro: 'NS',
              syncPro: 'NS',
              partyNo: 51,
              __v: 0,
            },
          },
        ],
        score: 24900,
      }];
      const testOutput = chains.slice();
      // Act
      const outputChains = cwr.mergeChains(chains);
      // Assert
      expect(outputChains).to.deep.eq(testOutput);
      done();
    });
  });
  describe('when passed two chains with one chain adding a subpublisher for certain territories', () => {
    it('should add the subpublisher to the original publisher chain', (done) => {
      // Arrange
      const chains = [
        {
          territory: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
          children: [
            {
              type: 'Publisher',
              publisherId: '604be43957a8000041e9c2b0',
              contractType: 'Original Publisher',
              controlled: true,
              mechanicalOwnership: 34,
              performanceOwnership: 17,
              mechanicalCollection: 34,
              performanceCollection: 17,
              children: [
                {
                  type: 'Composer',
                  composerId: '604be53357a8000041e9cceb',
                  contractType: 'Lyrics and Music',
                  controlled: true,
                  mechanicalOwnership: 0,
                  performanceOwnership: 17,
                  mechanicalCollection: 0,
                  performanceCollection: 17,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f06' }],
                    _id: '604be53357a8000041e9cceb',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'SAMUEL SCOTT GARAY',
                    cae: '00514943453',
                    performancePro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 140,
                    __v: 1,
                    firstName: 'SAMUEL',
                    mainPro: 'BMI',
                    middleNames: 'SCOTT',
                    surname: 'GARAY',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [
                  {
                    publisherId: '6068e8243ee1ec00b99aea43',
                    agreementType: 'Subpublishing General',
                    territory: 'GB',
                    society: 'PRS',
                    agreementNo: '10777079',
                  },
                ],
                linkedContracts: [],
                _id: '604be43957a8000041e9c2b0',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'KOZE SONGS',
                cae: '00397217332',
                performancePro: 'BMI',
                mechanicalPro: 'HARRY FOX',
                syncPro: 'NS',
                controlled: true,
                partyNo: 3,
                __v: 1,
                mainPro: 'BMI',
              },
            },
            {
              type: 'Publisher',
              publisherId: '6056a882f4b3e50016b69f9d',
              contractType: 'Original Publisher',
              controlled: false,
              mechanicalOwnership: 66,
              performanceOwnership: 33,
              mechanicalCollection: 66,
              performanceCollection: 33,
              children: [
                {
                  type: 'Composer',
                  composerId: '606fd6030620d7000fb48db3',
                  contractType: 'Lyrics and Music',
                  controlled: false,
                  mechanicalOwnership: 0,
                  performanceOwnership: 16.5,
                  mechanicalCollection: 0,
                  performanceCollection: 16.5,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [],
                    _id: '606fd6030620d7000fb48db3',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'AMANDA COOKSEY',
                    firstName: 'AMANDA',
                    surname: 'COOKSEY',
                    cae: '00704353078',
                    mainPro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    performancePro: 'BMI',
                    partyNo: 404,
                    __v: 0,
                    syncPro: null,
                  },
                },
                {
                  type: 'Composer',
                  composerId: '606fd6030620d7000fb48db4',
                  contractType: 'Lyrics and Music',
                  controlled: false,
                  mechanicalOwnership: 0,
                  performanceOwnership: 16.5,
                  mechanicalCollection: 0,
                  performanceCollection: 16.5,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [],
                    _id: '606fd6030620d7000fb48db4',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'EMILY CURTIS',
                    firstName: 'EMILY',
                    surname: 'CURTIS',
                    mainPro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    performancePro: 'BMI',
                    partyNo: 405,
                    __v: 0,
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6056a882f4b3e50016b69f9d',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'UNKNOWN PUBLISHER',
                mainPro: 'NS',
                mechanicalPro: 'NS',
                performancePro: 'NS',
                syncPro: 'NS',
                partyNo: 51,
                __v: 0,
              },
            },
          ],
          score: 24900,
        },
        {
          territory: 'CA',
          children: [
            {
              type: 'Publisher',
              publisherId: '6068e9c93ee1ec00b99aea48',
              contractType: 'Sub Publisher',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 34,
              performanceCollection: 17,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be43957a8000041e9c2b0',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 34,
                  performanceOwnership: 17,
                  mechanicalCollection: 34,
                  performanceCollection: 17,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be53357a8000041e9cceb',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 17,
                      mechanicalCollection: 0,
                      performanceCollection: 17,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [{ contractId: '603df6b703ce6400257a0f06' }],
                        _id: '604be53357a8000041e9cceb',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'SAMUEL SCOTT GARAY',
                        cae: '00514943453',
                        performancePro: 'BMI',
                        mechanicalPro: 'HARRY FOX',
                        syncPro: 'NS',
                        controlled: true,
                        partyNo: 140,
                        __v: 1,
                        firstName: 'SAMUEL',
                        mainPro: 'BMI',
                        middleNames: 'SCOTT',
                        surname: 'GARAY',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing General',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10777079',
                      },
                    ],
                    linkedContracts: [],
                    _id: '604be43957a8000041e9c2b0',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'KOZE SONGS',
                    cae: '00397217332',
                    performancePro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 3,
                    __v: 1,
                    mainPro: 'BMI',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6068e9c93ee1ec00b99aea48',
                name: 'KOZE MUSIC PUBLISHING LLC II',
                cae: '01049866323',
                controlled: true,
                notes: 'Our SOCAN entity for BMI affiliated songs',
                mainPro: 'SOCAN',
                mechanicalPro: 'CMRRA',
                performancePro: 'SOCAN',
                clientId: '6011be441c0f9a00565b6daa',
                partyNo: 122,
                __v: 0,
              },
            },
            {
              type: 'Publisher',
              publisherId: '6056a882f4b3e50016b69f9d',
              contractType: 'Original Publisher',
              controlled: false,
              mechanicalOwnership: 66,
              performanceOwnership: 33,
              mechanicalCollection: 66,
              performanceCollection: 33,
              children: [
                {
                  type: 'Composer',
                  composerId: '606fd6030620d7000fb48db3',
                  contractType: 'Lyrics and Music',
                  controlled: false,
                  mechanicalOwnership: 0,
                  performanceOwnership: 16.5,
                  mechanicalCollection: 0,
                  performanceCollection: 16.5,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [],
                    _id: '606fd6030620d7000fb48db3',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'AMANDA COOKSEY',
                    firstName: 'AMANDA',
                    surname: 'COOKSEY',
                    cae: '00704353078',
                    mainPro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    performancePro: 'BMI',
                    partyNo: 404,
                    __v: 0,
                    syncPro: null,
                  },
                },
                {
                  type: 'Composer',
                  composerId: '606fd6030620d7000fb48db4',
                  contractType: 'Lyrics and Music',
                  controlled: false,
                  mechanicalOwnership: 0,
                  performanceOwnership: 16.5,
                  mechanicalCollection: 0,
                  performanceCollection: 16.5,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [],
                    _id: '606fd6030620d7000fb48db4',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'EMILY CURTIS',
                    firstName: 'EMILY',
                    surname: 'CURTIS',
                    mainPro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    performancePro: 'BMI',
                    partyNo: 405,
                    __v: 0,
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6056a882f4b3e50016b69f9d',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'UNKNOWN PUBLISHER',
                mainPro: 'NS',
                mechanicalPro: 'NS',
                performancePro: 'NS',
                syncPro: 'NS',
                partyNo: 51,
                __v: 0,
              },
            },
          ],
          score: 1000,
        },
      ];
      // Create copy for test
      const testOutput = [];
      chains.forEach((item) => {
        testOutput.push(JSON.parse(JSON.stringify(item)));
      });
      // Act
      const outputChains = cwr.mergeChains(chains);
      // Assert
      expect(outputChains[0].children[0].extraPublishers[0].children[0].publisherId).to.eq(testOutput[1].children[0].publisherId);
      done();
    });
  });
  describe('when passed two chains with two separate subpublishers for differing territories', () => {
    it('should combine into a single chain with the second subpublisher chain defined as an extraPublisher on the first', (done) => {
      // Arrange
      const chains = [
        {
          territory: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
          children: [
            {
              type: 'Publisher',
              publisherId: '604be42957a8000041e9c27e',
              contractType: 'Admin',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be57557a8000041e9d2bd',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 50,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 0,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be57557a8000041e9d2d1',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 25,
                      mechanicalCollection: 0,
                      performanceCollection: 25,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [],
                        _id: '604be57557a8000041e9d2d1',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'ARNI FREYR LARUSSON',
                        cae: '00896177772',
                        performancePro: 'STEF',
                        mechanicalPro: 'NCB',
                        syncPro: 'NS',
                        controlled: true,
                        partyNo: 222,
                        __v: 2,
                        firstName: 'ARNI',
                        mainPro: 'STEF',
                        middleNames: 'FREYR',
                        surname: 'LARUSSON',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing Specific',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10926197',
                      },
                    ],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                    _id: '604be57557a8000041e9d2bd',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'TOO FM',
                    cae: '01032520712',
                    performancePro: 'ASCAP',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 40,
                    __v: 2,
                    mainPro: 'ASCAP',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [
                  {
                    publisherId: '6068e8243ee1ec00b99aea43',
                    agreementType: 'Subpublishing General',
                    territory: 'GB',
                    society: 'PRS',
                    agreementNo: '10775645',
                  },
                ],
                linkedContracts: [],
                _id: '604be42957a8000041e9c27e',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'COMPOSITIONS OF KOZE',
                cae: '00394572130',
                performancePro: 'ASCAP',
                mechanicalPro: 'HARRY FOX',
                syncPro: 'NS',
                controlled: true,
                partyNo: 1,
                __v: 1,
                mainPro: 'ASCAP',
              },
            },
            {
              type: 'Publisher',
              publisherId: '6056a882f4b3e50016b69f9d',
              contractType: 'Original Publisher',
              controlled: false,
              mechanicalOwnership: 50,
              performanceOwnership: 25,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Composer',
                  composerId: '6056d250f4b3e50016b69fd6',
                  contractType: 'Lyrics and Music',
                  controlled: false,
                  mechanicalOwnership: 0,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 25,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [],
                    _id: '6056d250f4b3e50016b69fd6',
                    name: 'UNKNOWN WRITER',
                    firstName: 'UNKNOWN',
                    surname: 'WRITER',
                    mainPro: 'NS',
                    mechanicalPro: 'NS',
                    performancePro: 'NS',
                    clientId: '6011be441c0f9a00565b6daa',
                    partyNo: 388,
                    __v: 0,
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6056a882f4b3e50016b69f9d',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'UNKNOWN PUBLISHER',
                mainPro: 'NS',
                mechanicalPro: 'NS',
                performancePro: 'NS',
                syncPro: 'NS',
                partyNo: 51,
                __v: 0,
              },
            },
          ],
          score: 24900,
        },
        {
          territory: 'CA',
          children: [
            {
              type: 'Publisher',
              publisherId: '6068e9373ee1ec00b99aea45',
              contractType: 'Sub Publisher',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be57557a8000041e9d2bd',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 50,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 0,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be57557a8000041e9d2d1',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 25,
                      mechanicalCollection: 0,
                      performanceCollection: 25,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [],
                        _id: '604be57557a8000041e9d2d1',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'ARNI FREYR LARUSSON',
                        cae: '00896177772',
                        performancePro: 'STEF',
                        mechanicalPro: 'NCB',
                        syncPro: 'NS',
                        controlled: true,
                        partyNo: 222,
                        __v: 2,
                        firstName: 'ARNI',
                        mainPro: 'STEF',
                        middleNames: 'FREYR',
                        surname: 'LARUSSON',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing Specific',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10926197',
                      },
                    ],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                    _id: '604be57557a8000041e9d2bd',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'TOO FM',
                    cae: '01032520712',
                    performancePro: 'ASCAP',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 40,
                    __v: 2,
                    mainPro: 'ASCAP',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6068e9373ee1ec00b99aea45',
                name: 'KOZE MUSIC PUBLISHING LLC',
                cae: '01020409815',
                controlled: true,
                mainPro: 'SOCAN',
                mechanicalPro: 'MCPS',
                performancePro: 'SOCAN',
                notes: 'Our SOCAN entity used for ASCAP affiliated songs',
                clientId: '6011be441c0f9a00565b6daa',
                partyNo: 121,
                __v: 0,
                syncPro: null,
              },
            },
            {
              type: 'Publisher',
              publisherId: '6056a882f4b3e50016b69f9d',
              contractType: 'Original Publisher',
              controlled: false,
              mechanicalOwnership: 50,
              performanceOwnership: 25,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Composer',
                  composerId: '6056d250f4b3e50016b69fd6',
                  contractType: 'Lyrics and Music',
                  controlled: false,
                  mechanicalOwnership: 0,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 25,
                  composer: {
                    societies: [],
                    publisherAgreements: [],
                    linkedContracts: [],
                    _id: '6056d250f4b3e50016b69fd6',
                    name: 'UNKNOWN WRITER',
                    firstName: 'UNKNOWN',
                    surname: 'WRITER',
                    mainPro: 'NS',
                    mechanicalPro: 'NS',
                    performancePro: 'NS',
                    clientId: '6011be441c0f9a00565b6daa',
                    partyNo: 388,
                    __v: 0,
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6056a882f4b3e50016b69f9d',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'UNKNOWN PUBLISHER',
                mainPro: 'NS',
                mechanicalPro: 'NS',
                performancePro: 'NS',
                syncPro: 'NS',
                partyNo: 51,
                __v: 0,
              },
            },
          ],
          score: 1000,
        },
      ];
      // Create copy for test
      const testOutput = [];
      chains.forEach((item) => {
        testOutput.push(JSON.parse(JSON.stringify(item)));
      });
      // Act
      const outputChains = cwr.mergeChains(chains);
      // Assert
      expect(outputChains[0].children[0].extraPublishers[0].children[0].publisherId).to.eq(testOutput[1].children[0].publisherId);
      done();
    });
  });
  describe('when passed two chains with multiple publishers that should be shared', () => {
    let chains;
    let testOutput;
    let outputChains;
    before((done) => {
      // Arrange
      chains = [
        {
          territory: ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW', 'AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'SX', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE', 'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'AX', 'AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'],
          children: [
            {
              type: 'Publisher',
              publisherId: '604be43957a8000041e9c2b0',
              contractType: 'Admin',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be4ae57a8000041e9c6a9',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 50,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 0,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be51a57a8000041e9cab0',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 25,
                      mechanicalCollection: 0,
                      performanceCollection: 25,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [],
                        _id: '604be51a57a8000041e9cab0',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'DANIEL JAMES GLAVIN',
                        cae: '00605225385',
                        performancePro: 'BMI',
                        mechanicalPro: 'HARRY FOX',
                        syncPro: 'HARRY FOX',
                        controlled: true,
                        partyNo: 106,
                        __v: 2,
                        firstName: 'DANIEL',
                        mainPro: 'BMI',
                        middleNames: 'JAMES',
                        surname: 'GLAVIN',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing Specific',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10926085',
                      },
                    ],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                    _id: '604be4ae57a8000041e9c6a9',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'TOO LOST PUBLISHING',
                    cae: '01035366967',
                    performancePro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 16,
                    __v: 3,
                    mainPro: 'BMI',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [
                  {
                    publisherId: '6068e8243ee1ec00b99aea43',
                    agreementType: 'Subpublishing General',
                    territory: 'GB',
                    society: 'PRS',
                    agreementNo: '10777079',
                  },
                ],
                linkedContracts: [],
                _id: '604be43957a8000041e9c2b0',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'KOZE SONGS',
                cae: '00397217332',
                performancePro: 'BMI',
                mechanicalPro: 'HARRY FOX',
                syncPro: 'NS',
                controlled: true,
                partyNo: 3,
                __v: 1,
                mainPro: 'BMI',
              },
            },
            {
              type: 'Publisher',
              publisherId: '604be47c57a8000041e9c559',
              contractType: 'Admin',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be51a57a8000041e9cab2',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 50,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 0,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be51a57a8000041e9cab4',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 25,
                      mechanicalCollection: 0,
                      performanceCollection: 25,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [],
                        _id: '604be51a57a8000041e9cab4',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'JERID BRANDON NOWELL',
                        cae: '00719031854',
                        performancePro: 'SESAC',
                        mechanicalPro: 'HARRY FOX',
                        syncPro: 'HARRY FOX',
                        controlled: true,
                        partyNo: 107,
                        __v: 2,
                        firstName: 'JERID',
                        mainPro: 'SESAC',
                        middleNames: 'BRANDON',
                        surname: 'NOWELL',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing Specific',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10986331',
                      },
                    ],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                    _id: '604be51a57a8000041e9cab2',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'TOO LOST COMPOSITIONS',
                    cae: '01071180591',
                    performancePro: 'SESAC',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 20,
                    __v: 3,
                    mainPro: 'SESAC',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [
                  {
                    publisherId: '6068e8243ee1ec00b99aea43',
                    agreementType: 'Subpublishing General',
                    territory: 'GB',
                    society: 'PRS',
                    agreementNo: '10777118',
                  },
                ],
                linkedContracts: [],
                _id: '604be47c57a8000041e9c559',
                clientId: '6011be441c0f9a00565b6daa',
                name: 'KOZE MUSIC',
                cae: '01005016628',
                performancePro: 'SESAC',
                mechanicalPro: 'HARRY FOX',
                syncPro: 'NS',
                controlled: true,
                partyNo: 8,
                __v: 1,
                mainPro: 'SESAC',
              },
            },
          ],
          score: 24900,
        },
        {
          territory: 'CA',
          children: [
            {
              type: 'Publisher',
              publisherId: '6068e9c93ee1ec00b99aea48',
              contractType: 'Sub Publisher',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be4ae57a8000041e9c6a9',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 50,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 0,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be51a57a8000041e9cab0',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 25,
                      mechanicalCollection: 0,
                      performanceCollection: 25,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [],
                        _id: '604be51a57a8000041e9cab0',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'DANIEL JAMES GLAVIN',
                        cae: '00605225385',
                        performancePro: 'BMI',
                        mechanicalPro: 'HARRY FOX',
                        syncPro: 'HARRY FOX',
                        controlled: true,
                        partyNo: 106,
                        __v: 2,
                        firstName: 'DANIEL',
                        mainPro: 'BMI',
                        middleNames: 'JAMES',
                        surname: 'GLAVIN',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing Specific',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10926085',
                      },
                    ],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                    _id: '604be4ae57a8000041e9c6a9',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'TOO LOST PUBLISHING',
                    cae: '01035366967',
                    performancePro: 'BMI',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 16,
                    __v: 3,
                    mainPro: 'BMI',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6068e9c93ee1ec00b99aea48',
                name: 'KOZE MUSIC PUBLISHING LLC II',
                cae: '01049866323',
                controlled: true,
                notes: 'Our SOCAN entity for BMI affiliated songs',
                mainPro: 'SOCAN',
                mechanicalPro: 'CMRRA',
                performancePro: 'SOCAN',
                clientId: '6011be441c0f9a00565b6daa',
                partyNo: 122,
                __v: 0,
              },
            },
            {
              type: 'Publisher',
              publisherId: '6068ea6a1d926d00f05bbb29',
              contractType: 'Sub Publisher',
              controlled: true,
              mechanicalOwnership: 0,
              performanceOwnership: 0,
              mechanicalCollection: 50,
              performanceCollection: 25,
              children: [
                {
                  type: 'Publisher',
                  publisherId: '604be51a57a8000041e9cab2',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalOwnership: 50,
                  performanceOwnership: 25,
                  mechanicalCollection: 0,
                  performanceCollection: 0,
                  children: [
                    {
                      type: 'Composer',
                      composerId: '604be51a57a8000041e9cab4',
                      contractType: 'Lyrics and Music',
                      controlled: true,
                      mechanicalOwnership: 0,
                      performanceOwnership: 25,
                      mechanicalCollection: 0,
                      performanceCollection: 25,
                      composer: {
                        societies: [],
                        publisherAgreements: [],
                        linkedContracts: [],
                        _id: '604be51a57a8000041e9cab4',
                        clientId: '6011be441c0f9a00565b6daa',
                        name: 'JERID BRANDON NOWELL',
                        cae: '00719031854',
                        performancePro: 'SESAC',
                        mechanicalPro: 'HARRY FOX',
                        syncPro: 'HARRY FOX',
                        controlled: true,
                        partyNo: 107,
                        __v: 2,
                        firstName: 'JERID',
                        mainPro: 'SESAC',
                        middleNames: 'BRANDON',
                        surname: 'NOWELL',
                      },
                    },
                  ],
                  publisher: {
                    societies: [],
                    publisherAgreements: [
                      {
                        publisherId: '6068e8243ee1ec00b99aea43',
                        agreementType: 'Subpublishing Specific',
                        territory: 'GB',
                        society: 'PRS',
                        agreementNo: '10986331',
                      },
                    ],
                    linkedContracts: [{ contractId: '603df6b703ce6400257a0f21' }],
                    _id: '604be51a57a8000041e9cab2',
                    clientId: '6011be441c0f9a00565b6daa',
                    name: 'TOO LOST COMPOSITIONS',
                    cae: '01071180591',
                    performancePro: 'SESAC',
                    mechanicalPro: 'HARRY FOX',
                    syncPro: 'NS',
                    controlled: true,
                    partyNo: 20,
                    __v: 3,
                    mainPro: 'SESAC',
                  },
                },
              ],
              publisher: {
                societies: [],
                publisherAgreements: [],
                linkedContracts: [],
                _id: '6068ea6a1d926d00f05bbb29',
                name: 'KOZE MUSIC PUBLISHING III',
                cae: '01049866617',
                controlled: true,
                notes: 'Our SOCAN entity for SESAC affiliated songs',
                mainPro: 'SOCAN',
                mechanicalPro: 'CMRRA',
                performancePro: 'SOCAN',
                clientId: '6011be441c0f9a00565b6daa',
                partyNo: 123,
                __v: 0,
              },
            },
          ],
          score: 1000,
        },
      ];
      // Create copy for test
      testOutput = [];
      chains.forEach((item) => {
        testOutput.push(JSON.parse(JSON.stringify(item)));
      });
      // Act
      outputChains = cwr.mergeChains(chains);
      done();
    });
    it('should return only one chain', (done) => {
      // Assert
      expect(outputChains.length).to.eq(1);
      done();
    });
    it('should include the second publisher on the first where they match', (done) => {
      expect(outputChains[0].children[0].extraPublishers[0].children[0].publisherId).to.eq(testOutput[1].children[0].publisherId);
      done();
    });
  });
});

describe('stringToParts', () => {
  describe('when passed a string and array', () => {
    it('should return an array', (done) => {
      // Arrange
      const string = 'string';
      const originalPublishers = ['One'];
      // Act
      const result = cwr.stringToParts(string, originalPublishers);
      // Assert
      expect(Array.isArray(result));
      done();
    });
    it('should include all strings down to the point no originalPublishers are included', (done) => {
      // Arrange
      const string = 'Three|Two|One|Composer 1|Composer 2';
      const originalPublishers = ['One'];
      const expectedResult = ['Three|Two|One|Composer 1|Composer 2', 'Two|One|Composer 1|Composer 2', 'One|Composer 1|Composer 2'];
      // Act
      const result = cwr.stringToParts(string, originalPublishers);
      // Assert
      expect(result).to.deep.eq(expectedResult);
      done();
    });
    it('should not include a string that does not include an originalPublisher', (done) => {
      // Arrange
      const string = 'Three|Two|One|Composer 1|Composer 2';
      const originalPublishers = ['One'];
      // Act
      const result = cwr.stringToParts(string, originalPublishers);
      // Assert
      expect(result.includes('Composer 1|Composer 2')).to.be.false;
      done();
    });
  });
  describe('when not passed a string', () => {
    it('should throw and error', (done) => {
      // Arrange
      const string = null;
      const originalPublishers = ['One'];
      // Act
      try {
        cwr.stringToParts(string, originalPublishers);
      } catch (e) {
        // Assert
        expect(e.message).to.eq('stringToParts requires a string and array or originalPublishers to be passed');
        done();
      }
    });
  });
  describe('when not passed an array', () => {
    it('should throw and error', (done) => {
      // Arrange
      const string = 'string';
      const originalPublishers = null;
      // Act
      try {
        cwr.stringToParts(string, originalPublishers);
      } catch (e) {
        // Assert
        expect(e.message).to.eq('stringToParts requires a string and array or originalPublishers to be passed');
        done();
      }
    });
  });
});
