/* eslint-disable max-len */
/* eslint-disable consistent-return */
/**
 * @module utils
 */

const { ObjectId } = require('mongodb');
const _ = require('lodash');

/**
 * @namespace
 */
const utils = {
  /**
   * Unescapes html characters
   *
   * @param {String} Html String escaped
   * @returns {String} Html String unescaped
   */
  unescapeHtml(text) {
    if (text) {
      return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
    }
  },
  /**
   * Checks if mechanical license contains valid numbers
   *
   * @param {Object} license Mechanical License Object to validate
   * @returns {Object} Mechanical License with invalid numbers
   */
  validateMechanicalLicense(license) {
    if (!license.rate && !license.share) {
      return;
    }

    const rate = Number(license.rate);
    const share = Number(license.share);

    if (Number.isNaN(rate) || Number.isNaN(share) || !license.contractId) {
      return license;
    }
  },
  /**
   * Converts String with line breaks to String with ;
   *
   * @param {String} input
   * @returns {String}
   */
  convertLineBreakToSemiColon(input) {
    return input ? input.replace(/\n/g, ';') : input;
  },
  /**
   * Converts String with ; to String with line breaks (\n)
   *
   * @param {String} input
   * @returns {String}
   */
  convertSemiColonToLineBreak(input) {
    return input ? input.toString().replace(/;/g, '\n') : input;
  },
  /**
   * Checks if whole number is larger than 3 digits
   *
   * @param {Int} selfBillingTaxRate
   * @param {Int} feesInvoiceTaxRate
   * @param {Int} withholdingTaxRate
   * @returns {bool}
   */
  isNotValidTaxRate(selfBillingTaxRate, feesInvoiceTaxRate, withholdingTaxRate) {
    if (selfBillingTaxRate >= 1000 || feesInvoiceTaxRate >= 1000 || withholdingTaxRate >= 1000) {
      return true;
    }
    return false;
  },
  /**
   * Compares two work.societyIdentifier arrays and returns the difference
   *
   * @param {array} array1 - current array of societyIdentifiers
   * @param {array} array2 - original array of societyIdentifiers
   * @returns {array} returns an array of societyIdentifiers
   */
  getDifference(array1, array2) {
    return array1.filter(
      (object1) =>
        !array2.some((object2) => object1.identifier === object2.identifier && object1.society === object2.society)
    );
  },

  /**
   * Checks whether a barcode has been corrupted by a csv on import
   *
   * @param {any} number - any data type passed to function, should anticipate either a string or number
   * @returns {bool} return either true or false based on the result of condition
   */
  isBarcodeCorrupt(barcode) {
    if (!barcode) {
      return false;
    }

    const convertedBarcode = String(barcode);
    // Check for scientific notation in string format
    if (convertedBarcode.toLowerCase().includes('e+')) {
      return true;
    }

    // If barcode is a number with 5 or more 0s on the end, we class this as a corrupted barcode.
    const lastFiveChars = convertedBarcode.slice(-5);
    return lastFiveChars === '00000';
  },

  /**
   * Converts any string boolean to a boolean from excel import.
   *
   * @param {any} inputParam - inputParam is passed from field from excel import, could either be a string e.g. 'TRUE' or bool true
   * @returns {boolean} returns either true or false based on conditon passed
   */
  convertStringToBoolean(param) {
    if (typeof param === 'string') {
      return param === 'TRUE';
    }
    return param;
  },

  /**
   * Converts `=`, `<`, `>`, `=<`, `=>` from `participation` param (if this exists) to database filter and adds to the filter object passed
   *
   * @param {object} inputParams - input params passed from route
   * @param {object} params - filter to be added to
   * @returns {object} params to use as filter with `totalParticipation` added if `inputParams.participation` filter exists
   */
  paramsToFilterParticipation(inputParams, params) {
    const { participation } = inputParams;
    if (participation && participation.value === 0) {
      inputParams.participation.value = inputParams.participation.value.toString();
    }
    if (participation && participation.symbol && participation.value) {
      params.totalParticipation = utils.filterEqualLessAndGreaterThan(participation.symbol, participation.value);
    }
    return params;
  },

  /**
   * Converts `=`, `<`, `>`, `=<`, `=>` from `ownership` param (if this exists) to database filter and adds to the filter object passed
   *
   * @param {object} inputParams - input params passed from route
   * @param {object} params - filter to be added to
   * @returns {object} params to use as filter with `totalParticipation` added if `inputParams.participation` filter exists
   */
  paramsToFilterOwnership(inputParams, params) {
    const { ownership } = inputParams;
    if (ownership && ownership.value === 0) {
      inputParams.ownership.value = inputParams.ownership.value.toString();
    }
    if (ownership && ownership.symbol && ownership.value) {
      params['totalCollection.totalOwnedMechanical'] = utils.filterEqualLessAndGreaterThan(
        ownership.symbol,
        ownership.value
      );
    }
    return params;
  },

  /**
   * Converts `=`, `<`, `>`, `=<`, `=>` to database filter
   *
   * @param {object} symbol - symbol for comparison
   * @param {object} value - value to filter on
   * @returns {object} filter object
   */
  filterEqualLessAndGreaterThan(symbol, value) {
    let filter = {};
    if (symbol === '<') {
      filter.$lt = value;
    } else if (symbol === '>') {
      filter.$gt = value;
    } else if (symbol === '=<') {
      filter.$lte = value;
    } else if (symbol === '=>') {
      filter.$gte = value;
    } else {
      filter = value;
    }
    return filter;
  },

  /**
   * Performs an Atlas Search
   *
   * @param {object} Model - Database Model to use for the aggregation query
   * @param {object} query - Query as passed by the front end
   * @param {object} user - User object containing payeeId and contractId properties
   * @param {object} params - Parameters for the search are provided as an object
   * @param {string} params.searchIndex - Atlas Search index to use for the search
   * @param {number} [params.page] - Number of the page to return
   * @param {number} [params.limit] - Maximum number of results to return
   * @param {string} [params.sortBy] - The field to sort on
   * @param {string} [params.sortOrder] - The order for the sort asc|desc - defaults to asc
   * @param {object[]} [params.filterItems] - Fields to filter on
   * @param {string} [params.filterItems.name] - Name of the field for each filter on (as provided as a property on the query object)
   * @param {string} [params.filterItems.field] - Indexed field each filter relates to
   * @param {string} [params.filterItems.type] - Type of field - `text`,`boolean`,`before`,`after`,`beforeInclusive`,`afterInclusive`,`equalLessGreaterThan`,`objectIds`
   * @param {string[]} [params.payeeFilterFields] - Fields to use for Payee Users filter
   * @param {string[]} [params.textSearchFields] - Indexed fields to use for Text Search
   * @param {string[]} [params.payeeFilterFields] - Fields to use for Payee Users filter
   *
   * @returns {object} containing `docs`, `totalPages`, `total`
   */
  async atlasSearch({ Payee, Model, query, user, params }) {
    // console.time(`Atlas Search - ${params.searchIndex}`);
    let { clientId } = user;
    const skip = params.page ? (params.page - 1) * params.limit : params.limit;
    let filter = [];
    let mustNot = [];
    const should = [];
    const postSearchMatch = {}; // Filters to apply after $search stage (for operations not supported in $search, eg. empty array filter)
    const limitBeforeSort = 1000;

    // @TODO: consider if this should throw an error when user.payeeId exists, but params.payeeFilterFields does not. Might be safest to do ensure payee users only have access to restricted results.
    if (user.payeeId && params.payeeFilterFields) {
      const payee = await Payee.findById(user.payeeId, 'clientId');
      // if payee exists in db, change clientId to the payee's clientId
      if (payee && payee.clientId) {
        ({ clientId } = payee);
      }
      if (user?.contractIds?.length > 0) {
        filter.push({
          text: {
            // @TODO: consider refactoring this to not run the search at all if no user.contractIds
            query: user.contractIds,
            path: params.payeeFilterFields,
          },
        });
      }
    }
    // filter to always include clientId
    filter.push({
      text: {
        query: clientId,
        path: 'clientId',
      },
    });

    // Loop through items to add to filter
    params.filterItems.forEach((filterItem) => {
      const val = query[filterItem.name];
      const path = filterItem.field;
      const { type } = filterItem;

      if (type === 'custom' && filterItem.handler) {
        const customFilters = filterItem.handler(val);
        if (Array.isArray(customFilters)) {
          filter.push(...customFilters);
        }
      } else if ((val || val === false) && path) {
        // path: dont add filter for All contractType.
        if (path === 'contractType') {
          if (val !== 'All' && val !== 'all') {
            if (val === 'Artist') {
              mustNot.push({
                text: {
                  query: 'Mechanical',
                  path,
                },
              });
            } else {
              filter.push({
                text: {
                  query: val,
                  path,
                },
              });
            }
          }
          // type: text, used for catalogueGroups etc.
        } else if (type === 'text') {
          filter.push({
            text: {
              query: val,
              path,
            },
          });
        } else if (type === 'wildcard') {
          filter.push({
            wildcard: {
              query: `*${val}*`,
              path,
              allowAnalyzedField: true,
            },
          });
        } else if (type === 'boolean') {
          // type: boolean, used for valid etc. (can be supplied as true|false or 'true'|'false')
          filter.push({
            equals: {
              // @TODO: this input.valid is a quick fix. We should look to standardise what we're passing from the Front-end to API.
              value: val !== false && val !== 'false', // converts 'false' and 'true' to Boolean
              path,
            },
          });
        } else if (type === 'before') {
          // type: before, used for createdBefore etc.
          filter.push({
            range: {
              lt: new Date(val),
              path,
            },
          });
        } else if (type === 'after') {
          // type: after, used for createdAfter etc.
          filter.push({
            range: {
              gt: new Date(val),
              path,
            },
          });
        } else if (type === 'beforeInclusive') {
          // type: beforeInclusive, like before but inclusive of the date (lte)
          filter.push({
            range: {
              lte: new Date(val),
              path,
            },
          });
        } else if (type === 'afterInclusive') {
          // type: afterInclusive, like after but inclusive of the date (gte)
          filter.push({
            range: {
              gte: new Date(val),
              path,
            },
          });
        } else if (type === 'equalLessGreaterThan') {
          // type: equalLessGreaterThan, used for participation, ownership etc.
          const result = utils.atlasSearchEqualLessGreaterThan(val, path);
          if (result && result.filter) {
            filter = [...filter, ...result.filter];
          }
          if (result && result.mustNot) {
            mustNot = [...mustNot, ...result.mustNot];
          }
        } else if (type === 'objectIds') {
          // type: objectIds, used for ids etc.
          filter.push({
            equals: {
              value: val.map((id) => new ObjectId(id)),
              path,
            },
          });
        } else if (type === 'excludeText') {
          mustNot.push({
            text: {
              query: val,
              path,
            },
          });
        } else if (type === 'emptyList') {
          if (val === 'true') {
            postSearchMatch[`${path}.0`] = { $exists: false };
          } else if (val === 'false') {
            postSearchMatch[`${path}.0`] = { $exists: true };
          }
        }
      }
    });

    // build text search filter
    if (Array.isArray(params.textSearchFields)) {
      if (query.text && query.text.length === 24 && ObjectId.isValid(query.text)) {
        // if the text filter is an object id, add _id clause to filter
        filter.push({
          equals: {
            value: new ObjectId(query.text),
            path: '_id',
          },
        });
      } else if (query.text && query.text !== '') {
        // otherwise add to should clauses
        should.push({
          wildcard: {
            query: `*${query.text}*`,
            path: params.textSearchFields,
            allowAnalyzedField: true,
          },
        });
      }
    }

    const search = {
      index: params.searchIndex,
      compound: {},
      count: {
        type: 'total',
      },
    };

    if (filter.length > 0) {
      search.compound.filter = filter;
    }
    if (mustNot.length > 0) {
      search.compound.mustNot = mustNot;
    }
    if (should.length > 0) {
      search.compound.should = should;
      search.compound.minimumShouldMatch = 1; // ensure at least of the should clauses match
    }

    // // Alternative search using Autocomplete data type, keeping here for reference - to be removed b4 release
    // const searchAutocomplete = {
    //   index: 'worksSearchNGram',
    //   compound: {
    //     filter,
    //     mustNot,
    //     should: [
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'title',
    //           tokenOrder: 'sequential',
    //         },
    //       },
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'composer',
    //           tokenOrder: 'sequential',
    //         },
    //       },
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'identifier',
    //         },
    //       },
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'iswc',
    //         },
    //       },
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'tunecode',
    //         },
    //       },
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'aliases',
    //         },
    //       },
    //       {
    //         autocomplete: {
    //           query: query.text,
    //           path: 'societyIdentifiers.identifier',
    //         },
    //       },
    //     ],
    //     minimumShouldMatch: 1,
    //   },
    //   count: {
    //     type: 'total',
    //   },
    // };

    // Alternative search using Autocomplete edgeGram data type
    if (params?.searchIndex === 'contractAutocomplete') {
      search.compound = {
        filter,
        mustNot,
        should: [
          {
            autocomplete: {
              query: query.text,
              path: 'name',
            },
          },
        ],
        minimumShouldMatch: 1,
      };
    }

    const aggregation = [
      {
        $search: search,
      },
    ];

    // Add $match stage for filters not supported in $search (e.g., emptyList checks)
    if (Object.keys(postSearchMatch).length > 0) {
      aggregation.push({
        $match: postSearchMatch,
      });
    }

    // Add sorting if used
    if (params.sortBy) {
      if (skip + params.limit <= limitBeforeSort) {
        aggregation.push({
          $limit: limitBeforeSort,
        });
      }
      aggregation.push({
        $sort: {
          [params.sortBy]: params.sortOrder && params.sortOrder === 'desc' ? -1 : 1,
        },
      });
    }
    if (skip) {
      aggregation.push({ $skip: skip });
    }
    if (params.limit) {
      aggregation.push({ $limit: params.limit });
    }
    if (params.project) {
      aggregation.push({
        $project: params.project,
      });
    }
    const hasPostSearchFilters = Object.keys(postSearchMatch).length > 0;
    aggregation.push({
      $facet: {
        docs: [],
        // // Make sorting dependant on results - keeping as reference - to be removed b4 release
        // docs: [
        //   { $match: { $expr: { $lt: ['$$SEARCH_META.count.total', 1000] } } },
        //   { $sort: { title: 1 } },
        //   { $skip: skip },
        //   { $limit: params.limit },
        //   ],
        // docsUnsorted: [
        //   { $match: { $expr: { $gte: ['$$SEARCH_META.count.total', 1000] } } },
        //   { $skip: skip },
        //   { $limit: params.limit },
        // ],
        meta: [{ $replaceWith: '$$SEARCH_META' }, { $limit: 1 }],
        // When postSearchMatch filters are applied, we need accurate count after $match
        ...(hasPostSearchFilters && { count: [{ $count: 'total' }] }),
      },
    });

    // Call aggregation
    const result = await Model.aggregate(aggregation).read('secondaryPreferred').allowDiskUse(true);
    const docs = result[0] && result[0].docs[0] && result[0].docs.length > 0 ? result[0].docs : [];

    // Use count from $count stage if postSearchMatch filters were applied, otherwise use $search metadata
    const total =
      hasPostSearchFilters && result[0]?.count?.[0]?.total
        ? result[0].count[0].total
        : result[0] && result[0].meta[0] && result[0].meta[0].count && result[0].meta[0].count.total
          ? result[0].meta[0].count.total
          : 0;
    const totalPages = Math.ceil(total / params.limit);
    // console.timeEnd(`Atlas Search - ${params.searchIndex}`);
    return { docs, total, totalPages };
  },

  /**
   * Converts `=`, `<`, `>`, `=<`, `=>` to atlas search range filters
   *
   * @param {string} comparison.symbol - Symbol for comparison
   * @param {number|string} comparison.value - Value to compare to
   * @param {string} path - Indexed field path to apply the range filter to
   * @returns {object} object containing either `filter` or `mustNot` property as array
   */
  atlasSearchEqualLessGreaterThan(comparison, path) {
    if (path && comparison && comparison.symbol && (comparison.value || comparison.value === 0)) {
      const { symbol } = comparison;
      const numberVal = Number(comparison.value);
      if (symbol === '<' || symbol === '>' || symbol === '=<' || symbol === '=>') {
        const range = {
          path,
        };
        if (symbol === '<') {
          range.lt = numberVal;
        } else if (symbol === '>') {
          range.gt = numberVal;
        } else if (symbol === '=<') {
          range.lte = numberVal;
        } else if (symbol === '=>') {
          range.gte = numberVal;
        }
        const filter = [
          {
            range,
          },
        ];
        return {
          filter,
        };
      }
      // @TODO: waiting on docs from Mongo to see if we can use near to equal a number and add to filter instead
      // filter.push({
      //   near: {
      //     origin: numberVal,
      //     path,
      //     pivot: 1,
      //   },
      // });
      const mustNot = [
        {
          range: {
            lt: numberVal,
            path,
          },
        },
        {
          range: {
            gt: numberVal,
            path,
          },
        },
      ];
      return {
        mustNot,
      };
    }
    return null;
  },

  // List of all Territories
  allTerritories: [
    'DZ',
    'AO',
    'BJ',
    'BW',
    'BF',
    'BI',
    'CM',
    'CV',
    'CF',
    'TD',
    'KM',
    'CG',
    'CD',
    'CI',
    'DJ',
    'EG',
    'GQ',
    'ER',
    'ET',
    'GA',
    'GM',
    'GH',
    'GN',
    'GW',
    'KE',
    'LS',
    'LR',
    'LY',
    'MG',
    'MW',
    'ML',
    'MR',
    'MU',
    'YT',
    'MA',
    'MZ',
    'NA',
    'NE',
    'NG',
    'RE',
    'RW',
    'SH',
    'ST',
    'SN',
    'SC',
    'SL',
    'SO',
    'ZA',
    'SS',
    'SD',
    'SZ',
    'TZ',
    'TG',
    'TN',
    'UG',
    'EH',
    'ZM',
    'ZW',
    'AW',
    'AI',
    'AG',
    'AR',
    'BS',
    'BB',
    'BZ',
    'BM',
    'BO',
    'BQ',
    'BR',
    'VG',
    'CA',
    'KY',
    'CL',
    'CO',
    'CR',
    'CU',
    'CW',
    'DM',
    'DO',
    'EC',
    'SV',
    'FK',
    'GF',
    'GL',
    'GD',
    'GP',
    'GT',
    'GY',
    'HT',
    'HN',
    'JM',
    'MQ',
    'MX',
    'MS',
    'AN',
    'NI',
    'PA',
    'PY',
    'PE',
    'PR',
    'BL',
    'KN',
    'LC',
    'MF',
    'SX',
    'PM',
    'VC',
    'SR',
    'TT',
    'TC',
    'US',
    'UY',
    'VE',
    'VI',
    'AF',
    'AM',
    'AZ',
    'BH',
    'BD',
    'BT',
    'BN',
    'KH',
    'CN',
    'GE',
    'HK',
    'IN',
    'ID',
    'IR',
    'IQ',
    'IL',
    'JP',
    'JO',
    'KZ',
    'KP',
    'KR',
    'KW',
    'KG',
    'LA',
    'LB',
    'MO',
    'MY',
    'MV',
    'MN',
    'MM',
    'NP',
    'OM',
    'PK',
    'PS',
    'PH',
    'QA',
    'SA',
    'SG',
    'LK',
    'SY',
    'TW',
    'TJ',
    'TH',
    'TL',
    'TR',
    'TM',
    'AE',
    'UZ',
    'VN',
    'YE',
    'AL',
    'AD',
    'AT',
    'BY',
    'BE',
    'BA',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FO',
    'FI',
    'FR',
    'DE',
    'GI',
    'GR',
    'GG',
    'VA',
    'HU',
    'IS',
    'IE',
    'IM',
    'IT',
    'JE',
    'XK',
    'LV',
    'LI',
    'LT',
    'LU',
    'MK',
    'MT',
    'MD',
    'MC',
    'ME',
    'NL',
    'NO',
    'PL',
    'PT',
    'RO',
    'RU',
    'SM',
    'RS',
    'SK',
    'SI',
    'ES',
    'SJ',
    'SE',
    'CH',
    'UA',
    'GB',
    'AX',
    'AS',
    'AQ',
    'AU',
    'BV',
    'IO',
    'CX',
    'CC',
    'CK',
    'FJ',
    'PF',
    'TF',
    'GU',
    'HM',
    'KI',
    'MH',
    'FM',
    'NR',
    'NC',
    'NZ',
    'NU',
    'NF',
    'MP',
    'PW',
    'PG',
    'PN',
    'SB',
    'GS',
    'TK',
    'TO',
    'TV',
    'UM',
    'VU',
    'WF',
    'WS',
  ],

  /**
   * Clears blank strings that could cause .populate to error
   *
   * * For properties of type array this processes contractId, composerId, publisherId on any object in the array
   * * For properties of type string this processes the property itself
   *
   * @param {object} document - the document object containing properties to be cleaned up
   * @param {string[]} properties - list of properties to check and fix if blank strings are found
   */
  clearBlankStrings(document, properties) {
    if (Array.isArray(properties)) {
      properties.forEach((property) => {
        let item = document?.[property];
        if (Array.isArray(item)) {
          item = item.map((right) => {
            if (right?.contractId === '') {
              right.contractId = null;
            }
            if (right?.composerId === '') {
              right.composerId = null;
            }
            if (right?.publisherId === '') {
              right.publisherId = null;
            }
            if (typeof right === 'string' && right === '') return null;
            return right;
          });
        }
        if (typeof item === 'string' && item === '') {
          document[property] = null;
        }
      });
    }
  },

  /**
   * Check if the provided password meets the minimum requirements
   *
   * * Contains at least 1 lower case letter, 1 upper case letter, 1 digit, 1 special character
   * * Has a minimum length of 8 chars
   *
   * @param {string} password - password to check
   * @returns {boolean} true if password meets the minimum requirements
   */
  isStrongPassword(password) {
    // Ensure password contains at least 1 lower case letter, 1 upper case letter, 1 digit, 1 special character and has a minimum length of 8 chars
    const passwordRequirements = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{12,}$/;
    return passwordRequirements.test(password);
  },

  /**
   * Clears blank strings that could cause .populate to error
   *
   * @param {string} input - the input value to be padded
   * @param {string} padding - the value to pad the input value
   * @param {number} length - the length of the output string
   * @param {string} where - where the padding should take place
   * @param {string[]} properties - list of properties to check and fix if blank strings are found
   */
  padWithValue(input, padding, length, where) {
    const difference = length - input.length;
    if (difference > 0 && where === 'start') {
      // Add padding to start
      return String(padding).repeat(difference) + input;
    }
    if (difference > 0 && where === 'end') {
      // Add padding to end
      return input + String(padding).repeat(difference);
    }
    if (difference < 0) {
      // Cut short
      return input.slice(0, length);
    }
    return input;
  },
  /**
   * Removes leading zeros from a string or numeric value.
   *
   * @param {string|number} value - The value to strip leading zeros from
   * @returns {string} The value without leading zeros, or an empty string if falsy
   */
  removeLeadingZeros(value) {
    if (value) {
      return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
    }
    return '';
  },

  /**
   * Pads a value with leading zeros to a given length.
   *
   * @param {string|number} value - The value to pad
   * @param {number} [num=0] - The target string length
   * @returns {string} The padded string
   */
  padLeadingZeros(value, num = 0) {
    if (value) {
      return String(value).padStart(num, '0');
    }
    return ''.padStart(num, '0');
  },

  /**
   * Creates `contractIds` from `companyIds` and intersects these with any `contractIds` present on inputParams
   *
   * * If no `companyIds` are present it will return `inputParams.contractIds`
   * * If no `contractIds` are present it will return all `contractIds` associated with a company (or companies)
   * * If both are present only `contractIds` present in both `contractIds` and extracted `contractIds` from `companyIds` will be returned
   *
   * @param {object} inputParams - input params used for filtering
   * @param {string[]} inputParams.companyIds - list of company ids
   * @param {string[]} inputParams.contractIds - list of contract ids
   * @param {string} clientId - the clientId to be used when searching for contracts
   * @returns {string[]} - array of contract ids as strings
   */
  async combineContractAndCompanyIds({ Contract, inputParams, clientId }) {
    if (inputParams.companyIds && inputParams.companyIds.length > 0 && clientId) {
      const contracts = await Contract.find({ clientId, companyId: { $in: inputParams.companyIds } }, { _id: 1 });
      const contractIds = contracts.map((contract) => contract._id.toString());
      if (inputParams.contractIds && inputParams.contractIds.length > 0) {
        return _.intersection(contractIds, inputParams.contractIds);
      }
      return contractIds;
    }
    return inputParams.contractIds;
  },
};

module.exports = utils;
