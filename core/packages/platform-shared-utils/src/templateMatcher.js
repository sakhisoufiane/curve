/**
 * @module templateMatcher
 */
const async = require('async');
const hasha = require('hasha');

const logger = require('./logger');

/**
  * @typedef {Object} identification
  * @property {string} a1 - The top left cell of the tabulated data
  * @property {number} totalTabs - The number of tabs/sheets contained in the file
  * @property {string[]} topRows - Array of hashed rows
  */

// ******* Helper functions *******

/**
  * Checks if the supplied identification matches the supplied template and returns the number of matched rows
  *
  * @param {object} template - Template model to check against
  * @param {identification} identification - The identification to check against
  * @returns {number} Number of matching rows in template identification
  */
function checkForMatch(template, identification) {
  let foundMatch = false;
  if (template.identification) {
    template.identification.forEach((row) => {
      // TODO: should run through all identifications even when a match has been found already and only add another match if the length of this is higher than the current one?
      if (!foundMatch && row && identification && (row.a1 === identification.a1) && (row.totalTabs === identification.totalTabs)) {
        logger.info(`total tabs (${row.totalTabs}) and a1 (${row.a1}) matching on template ${template._id}`);
        const match = identification.topRows.filter((hash) => row.topRows.includes(hash));
        foundMatch = match.length;
        logger.info((foundMatch) ? `and ${foundMatch} identifiers match` : 'but no identifier matches');
      }
    });
    return foundMatch;
  }
  return false;
}

/**
  * Checks if the supplied identification matches the supplied template BY topRows ONLY and returns the number of matched rows
  *
  * @param {object} template - Template model to check against
  * @param {identification} identification - The identification to check against
  * @returns {number} Number of matching rows in template identification
  */
function checkForMatchByTopRowsOnly(template, identification) {
  let foundMatch = false;
  if (template.identification) {
    template.identification.forEach((row) => {
      // TODO: should run through all identifications even when a match has been found already and only add another match if the length of this is higher than the current one?
      if (!foundMatch && row && identification) {
        const match = identification.topRows.filter((hash) => row.topRows.includes(hash));
        foundMatch = match.length;
        logger.info((foundMatch) ? `${foundMatch} identifiers match` : 'no identifier matches');
      }
    });
    return foundMatch;
  }
  return false;
}

/**
  * Searches database for matching templates (either Sales Templates or Library Templates) and adds them to the supplied *matchedTemplates* object
  *
  * * Calls `callback(err, foundMatch)` with `foundMatch` flag set to true if any templates were matched
  * * Calls `callback(err, foundMatch)` with an `err` message if an error occurs
  *
  * @param {object} Model - The template model to use for database lookup. Can be either a Sales Template or Library Template model
  * @param {object} filter - Filter to use for selecting templates
  * @param {object} matchedTemplates - Object to add matched template models to
  * @param {number} idx - Tab index
  * @param {identification} identification - The identification to check against
  * @param {boolean} matchByTopRowsOnly - Flag to set if only the top rows should be matched
  * @param {function(string, boolean)} callback - A callback that handles the response
  */
function matchTemplatesForTab(Model, filter, matchedTemplates, idx, identification, matchByTopRowsOnly, callback) {
  const thisMatchedTemplates = matchedTemplates; // not shallow copying to a new object on purpose, as we are modifying the passed object. Might want to refactor this.
  Model.find(filter)
    .then((templates) => {
      let foundMatch = false;
      templates.forEach((template) => {
        if (!template.archived) {
          logger.info(`checking for matching identification for tab ${idx}`);
          const match = matchByTopRowsOnly ? checkForMatchByTopRowsOnly(template, identification) : checkForMatch(template, identification);
          if (match && (idx === template.tabIndex())) {
            if (!thisMatchedTemplates[`tab${idx}`]) thisMatchedTemplates[`tab${idx}`] = [];
            thisMatchedTemplates[`tab${idx}`].push({
              tab: idx,
              templateId: template._id,
              match,
              updatedAt: template.updatedAt,
              fileType: template.fileType,
              priorityIngestion: template.priorityIngestion,
              priorityIngestionSuffix: template.priorityIngestionSuffix,
            });
            foundMatch = true;
          }
        } else {
          logger.info(`matched and skipped an archived template: ${template._id}`);
        }
      });
      callback(null, foundMatch);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

/**
  * Searches database for matching templates (either Sales Templates or Library Templates) for all tabs(sheets) supplied and returns matches as an array of objects.
  * For Library Templates clientId should not be supplied.
  *
  * * Calls `callback(err, templates)` with `templates` array of objects = {
  *   * tab: number of tabs,
  *   * matches: number of matches,
  *   * templateId: Sales Template id,
  *   * updatedAt: Date last updated }
  * * Calls `callback(err, templates)` with an `err` message if an error occurs
  *
  * @param {identification[]} tabs - Array of identifications, one for each tab(sheet)
  * @param {string} [clientId] - The client id to use for database lookup
  * @param {object} salesFile - Sales File document
  * @param {object} Model - The template model to use for database lookup. Can be either a Sales Template or Library Template model
  * @param {function(string, object[])} callback - A callback that handles the response
  */
function matchTemplates(tabs, clientId, salesFile, Model, callback) {
  const { modelName } = Model;
  const matchedTemplates = {};
  async.forEachOfSeries(tabs, (tab, idx, cb) => {
    async.waterfall([
      function (waterfallCb) {
        const identification = tab;
        const filter = {
          'identification.a1': identification.a1,
          'identification.totalTabs': identification.totalTabs,
        };
        if (clientId) { filter.clientId = clientId.toString(); }
        if (modelName === 'LibraryTemplate') { filter.published = true; }
        // match by entire identifier first
        matchTemplatesForTab(Model, filter, matchedTemplates, idx, identification, false, waterfallCb);
      },
      function (foundMatch, waterfallCb) {
        if (!foundMatch) {
          logger.info(`Sales File: ${salesFile._id} - no matching template found for tab ${idx}`);
          logger.info(`Sales File: ${salesFile._id} - Attempting to match on topRows without matching A1 and totalTabs`);
          const identification = tab;
          const filter = {
            'identification.topRows': { $in: identification.topRows },
          };
          if (clientId) { filter.clientId = clientId.toString(); }
          if (modelName === 'LibraryTemplate') { filter.published = true; }
          // match by top rows hashes only
          matchTemplatesForTab(Model, filter, matchedTemplates, idx, identification, true, waterfallCb);
        } else {
          waterfallCb();
        }
      },
    ], cb);
  }, (err) => {
    if (err) {
      callback(err);
    } else {
      // build array of results
      let matchedArray = [];
      Object.entries(matchedTemplates).forEach((tab) => {
        const tabObj = tab[1];
        // store any matches which are set to Priority Ingestion
        const priorityIngestionMatches = tabObj.filter((tabObjRow) => tabObjRow.priorityIngestion);
        // store any matches that are an iTunes template
        const iTunesTemplates = tabObj.filter((row) => (row.fileType === 'iTunes'));
        const iTunesMatchTemplates = tabObj.filter((row) => (row.fileType === 'iTunes Match'));
        const fileName = salesFile.file.substr(salesFile.file.lastIndexOf('/') + 1);
        if (priorityIngestionMatches.length > 0) {
          // process matches that are set to Priority Ingestion
          matchedArray = [...matchedArray, ...priorityIngestionMatches];
        } else if ((fileName.match(/^C_/) || fileName.match(/match/i)) && iTunesMatchTemplates.length > 0) {
          // when the Sales File filename starts with "_C" or contains "match" and the matched templates contain iTunes Match template, we add this
          logger.info(`Sales File: ${salesFile._id} - The Sales File filename starts with "_C" or contains "match". Assuming we should match against iTunes Match template`);
          matchedArray.push(iTunesMatchTemplates[0]);
        } else if (iTunesTemplates.length > 0) {
          // when the Sales File filename doesn't start with "_C" and the matched templates contain iTunes template, we add this
          logger.info(`Sales File: ${salesFile._id} - Matched templates contain iTunes template, so adding this`);
          matchedArray.push(iTunesTemplates[0]);
        } else {
          // @TODO: move the sort before iTunes processing
          tabObj.sort((a, b) => b.match - a.match);
          const topMatches = tabObj.filter((tabObjTab) => (tabObjTab.match === tabObj[0].match)); // check if templates have the same number of matching identifiers
          if (topMatches.length > 1) {
            // if there are multiple top matches add the most recently updated
            logger.info(`Sales File: ${salesFile._id} - Found more than 1 template with the same number of matching identifiers: \n${JSON.stringify(topMatches)}`);
            logger.info(`Sales File: ${salesFile._id} - adding the most recently updated template`);
            topMatches.sort((a, b) => b.updatedAt - a.updatedAt);
            matchedArray.push(topMatches[0]);
          } else {
            matchedArray.push(tabObj[0]);
          }
        }
      });
      callback(null, matchedArray);
    }
  });
}

/**
 * Creates a TemplateMatcher Instance.
 * @constructor
 * @param {object} params - Parameters for initializing Big Query.
 * @param {string} params.SalesTemplate - Sales Template Model.
 * @param {string} params.LibraryTemplate - Library Template Model
 */

const TemplateMatcher = function (params) {
  // Initialise
  if (params) {
    if (params.SalesTemplate && params.SalesTemplate.name === 'model' && params.SalesTemplate.collection.name === 'salestemplates') {
      this.SalesTemplate = params.SalesTemplate;
    }
    if (params.LibraryTemplate && params.LibraryTemplate.name === 'model' && params.LibraryTemplate.collection.name === 'librarytemplates') {
      this.LibraryTemplate = params.LibraryTemplate;
    }
  }

  /**
    * Build identification from top rows of data
    *
    * @param {string} totalTabs - Dataset name
    * @param {string} topRows - The top rows of the tabulated document
    * @returns {identification} Identification object
    */
  this.buildIdentification = (totalTabs, topRows) => {
    const hashes = [];
    let count = 0;
    topRows.forEach((row) => {
      if (count < 10) {
        const rowString = row.map((cell) => ((cell && cell !== null) ? String(cell) : ''));
        // don't store any rows with only empty cells
        if (rowString.join('') !== '') {
          count += 1;
          const rowHash = hasha(rowString, { encoding: 'hex', algorithm: 'sha256' });
          hashes.push(rowHash);
        }
      }
    });
    const identification = {
      totalTabs,
      a1: String(topRows[0] ? topRows[0][0] : null),
      topRows: hashes,
    };
    return identification;
  };

  /**
    * Adds the identification a sales template. Checks first if the identification exists on the template already before adding it.
    *
    * * Calls `callback(err)` on success, with `err` set to *null*
    * * Calls `callback(err)` with an `err` message if an error occurs
    *
    * @param {string} salesTemplateId - The sales template id to use
    * @param {identification} identification - Identification to be added
    * @param {function(string)} callback - A callback that handles the response
    */
  this.addIdentificationToTemplate = (salesTemplateId, identification, callback) => {
    // check identification is defined, otherwise don't add it
    if (identification) {
      this.SalesTemplate.findById(salesTemplateId)
        .then((salesTemplate) => {
          try {
            // checking sales template identification
            if (salesTemplate && !checkForMatch(salesTemplate, identification)) {
              // add identification to Sales Template and save
              const thisSalesTemplate = salesTemplate;
              if (!thisSalesTemplate.identification) {
                // create array if not defined
                thisSalesTemplate.identification = [];
              }
              thisSalesTemplate.identification.push(identification);
              thisSalesTemplate.save()
                .then(() => {
                  logger.info(`Added identification to template ${salesTemplateId}`);
                  callback();
                })
                .catch((saveErr) => {
                  logger.error(saveErr);
                  // TODO: we are not passing the error but we probably should be?
                  callback();
                });
            } else {
              // matching identification already exists on sales template, flag identification object
              flagIndentificationAsUsedOnMultipleFiles(salesTemplate, identification);
              salesTemplate.save()
                .then(() => {
                  logger.info(`Flagged identification as used on multiple files ${salesTemplateId}`);
                  callback();
                })
                .catch((saveErr) => {
                  logger.error(saveErr);
                  callback();
                });
            }
          } catch (catchErr) {
            logger.error(catchErr);
            callback(catchErr);
          }
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      callback();
    }
  };

  /**
  * Flags an identification as used on multiple files
  *
  * @param {object} template - Template model to check against
  * @param {identification} identification - The identification to check against
  */
  function flagIndentificationAsUsedOnMultipleFiles(template, identification) {
    let foundMatch = false;
    if (template.identification) {
      template.identification.forEach((row) => {
        if (!foundMatch && row && identification
          && (row.a1 === identification.a1)
          && (row.totalTabs === identification.totalTabs)
          && (row.salesFileId !== identification.salesFileId)) {
          const match = identification.topRows.filter((hash) => row.topRows.includes(hash));
          if (match.length > 0) {
            row.usedOnMultipleFiles = true;
            foundMatch = true;
          }
        }
      });
    }
  }

  /**
    * Finds matching Sales Templates for all tabs(sheets) supplied and returns matches as an array of objects
    * If a Sales Template is not found it checks for a match on a Library Template.
    * If a matching Library Template is found, copies the Library Template to a new Sales Library and returns the Sales Library as part of the array.
    *
    * * Calls `callback(err, templates)` with `templates` array of objects = {
    *   * tab: number of tabs,
    *   * matches: number of matches,
    *   * templateId: Sales Template id,
    *   * updatedAt: Date last updated }
    * * Calls `callback(err, templates)` with an `err` message if an error occurs
    *
    * @param {identification[]} tabs - Array of identifications, one for each tab(sheet)
    * @param {string} clientId - The client id to use for database lookup
    * @param {object} salesFile - Sales File document
    * @param {function(string, object[])} callback - A callback that handles the response
    */
  this.findMatchingTemplates = (tabs, clientId, salesFile, callback) => {
    logger.info(`Sales File: ${salesFile._id} - Looking for matching templates for all tabs`);
    if (clientId) {
      matchTemplates(tabs, clientId, salesFile, this.SalesTemplate, (err, matchedSalesTemplates) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else if (matchedSalesTemplates.length > 0) {
          logger.info(`Sales File: ${salesFile._id} - Found matching sales templates`, JSON.stringify(matchedSalesTemplates));
          callback(null, matchedSalesTemplates);
        } else {
          logger.info(`Sales File: ${salesFile._id} - No matching sales templates found, looking for matching library templates`);
          // if no matching Sales Template found, check Library Templates
          matchTemplates(tabs, null, salesFile, this.LibraryTemplate, (matchTempErr, matchedLibraryTemplates) => {
            if (matchedLibraryTemplates.length > 0) {
              logger.info(`Sales File: ${salesFile._id} - Found matching library templates ${JSON.stringify(matchedLibraryTemplates)}`);
              const copiedSalesTemplates = [];
              logger.info(`Sales File: ${salesFile._id} - Creating sales templates`);
              async.forEachOf(matchedLibraryTemplates, (match, idx, eachCb) => {
                const thisMatch = { ...match };
                // create sales templates from matched library templates
                this.LibraryTemplate.findById(thisMatch.templateId)
                  .then((libraryTemplate) => {
                    libraryTemplate.createSalesTemplate(clientId, (createTempErr, salesTemplate) => {
                      if (createTempErr) {
                        eachCb(createTempErr);
                      } else {
                        logger.info(`Sales File: ${salesFile._id} - Created sales template with id ${salesTemplate._id.toString()}`
                          + ` from library template with id ${thisMatch.templateId}`);
                        // replace template id in match with sales template id
                        thisMatch.templateId = salesTemplate._id.toString();
                        copiedSalesTemplates.push(thisMatch);
                        eachCb();
                      }
                    });
                  })
                  .catch((libTempErr) => {
                    eachCb(libTempErr);
                  });
              }, (forEachOfErr) => {
                callback(forEachOfErr, copiedSalesTemplates);
              });
            } else {
              logger.info(`Sales File: ${salesFile._id} - No matching library templates found`);
              callback(matchTempErr, []);
            }
          });
        }
      });
    } else {
      callback('missing clientId');
    }
  };
};

module.exports = TemplateMatcher;
