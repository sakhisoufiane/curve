/** @module filter */
const { ObjectId } = require('mongodb');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Contract = require('../models/contract');
const Release = require('../models/release');
const Track = require('../models/track');
const Work = require('../models/work');
const SalesFile = require('../models/salesFile');
const Cost = require('../models/cost');

/**
 * @namespace
 */
const Filter = {
  filterToDbFilter(filter, options, callback) {
    const orFilters = [];
    // Ensure filter exists
    filter = filter || [];
    if (filter.length === 0) filter.push({}); // require at least one empty filter group for payee users
    async.eachSeries(filter, (filterGroup, eachCb) => {
      Filter.filterGroupToDbFilter(filterGroup, options, (err, dbFilterGroup) => {
        if (err) {
          eachCb(err);
        } else {
          if (dbFilterGroup) { orFilters.push(dbFilterGroup); }
          eachCb();
        }
      });
    }, (err) => {
      const dbFilter = (orFilters.length > 0) ? { $or: orFilters } : null;
      callback(err, dbFilter);
    });
  },

  filterGroupToDbFilter(filterIn, options, callback) {
    let dbFilter = {};
    let filteredContractIds = [];
    let containsContractFilters;

    const releaseFilter = {};
    const trackFilter = {};
    const workFilter = {};
    let catalogueGroupCatalogueFilter;

    const contractCatalogueFilters = {};
    const payeeContracts = [];
    const projectIdCatalogueFilters = {};
    let projectIdContractIds;
    const clientId = options.client._id.toString();

    const filter = { ...filterIn }; // make a copy of filterIn object
    // remove any filter fields not relevant to Costs
    if (['Costs Input', 'Costs Output'].includes(options.table)) {
      const ignoreForCosts = [
        'catType',
        'distributionChannels',
        'configurations',
        'priceCategories',
        'sources',
        'subSources',
      ];
      Object.keys(filter).forEach((field) => {
        if (ignoreForCosts.includes(field)) {
          delete filter[field];
        }
      });
    }

    async.waterfall([
      function (cb) {
        // Standards
        if (filter.distributionChannels && (Array.isArray(filter.distributionChannels) && filter.distributionChannels.length > 0)) { dbFilter.distributionChannel = { $in: filter.distributionChannels }; }
        if (filter.configurations && (Array.isArray(filter.configurations) && filter.configurations.length > 0)) { dbFilter.configuration = { $in: filter.configurations }; }
        if (filter.priceCategories && (Array.isArray(filter.priceCategories) && filter.priceCategories.length > 0)) { dbFilter.priceCategory = { $in: filter.priceCategories }; }
        if (filter.sources && filter.sources !== '') {
          const sources = filter.sources.split(',').map((source) => source.trim());
          dbFilter.source = { $in: sources };
        }
        if (filter.subSources && filter.subSources !== '') {
          const subSources = filter.subSources.split(',').map((subSource) => subSource.trim());
          dbFilter.subSource = { $in: subSources };
        }
        if (filter.catType) { dbFilter.catType = filter.catType; }

        if (filter.territories && (Array.isArray(filter.territories) && filter.territories.length > 0 && !filter.territories.includes('World'))) {
          let territories = [];
          filter.territories.forEach((territory) => {
            if (territory === 'Africa') {
              territories = [].concat(territories, ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW']);
            } else if (territory === 'Americas') {
              territories = [].concat(territories, ['AW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI']);
            } else if (territory === 'Asia') {
              territories = [].concat(territories, ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE']);
            } else if (territory === 'Europe') {
              territories = [].concat(territories, ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX']);
            } else if (territory === 'Oceania') {
              territories = [].concat(territories, ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS']);
            } else {
              territories.push(territory);
            }
          });
          dbFilter.territory = { $in: territories };
        }
        cb();
      },
      function (cb) {
        // Get Contract IDs if Payee user or payee ids supplied
        if (options.payeeId || filter.payeeIds) {
          const payeeFilter = options.payeeId || filter.payeeIds;
          const contractFilter = { clientId, 'payees.payeeId': { $in: payeeFilter } };
          // Filter contracts by Project ID if included
          if (filter.projectId) {
            contractFilter.projectId = filter.projectId;
          }
          Contract.find(contractFilter, '_id')
            .then((contracts) => {
              if (contracts && contracts.length > 0) {
                // Including statement here due to circular dependencies
                const Statement = require('../models/statement');
                async.forEach(contracts, (contract, eachCb) => {
                  const statementsQuery = options.payeeId ? { clientId, contractId: contract._id.toString(), status: 'Published' } : { clientId, contractId: contract._id.toString() };
                  Statement.find(statementsQuery, 'periodId partitionNo')
                    .then((statements) => {
                      if (statements && statements.length > 0) {
                        const payeeContract = {
                          _id: contract._id.toString(),
                          periodIds: statements.map((statement) => statement.periodId),
                          partitionNo: statements.map((statement) => (statement.partitionNo ? statement.partitionNo : null)),
                        };
                        if (payeeContract.partitionNo.includes(null)) {
                          delete payeeContract.partitionNo;
                        }
                        payeeContracts.push(payeeContract);
                      }
                      eachCb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      eachCb(err);
                    });
                }, (err) => {
                  if (payeeFilter.length > 0 && payeeContracts.length === 0) {
                    cb(err || new Error('no statements found for payee(s): ', payeeFilter));
                  } else {
                    cb(err);
                  }
                });
              } else {
                cb(new Error('no contracts found for payee(s): ', payeeFilter));
              }
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb();
        }
      },
      function (cb) {
        if (filter.periodIds && Array.isArray(filter.periodIds) && filter.periodIds.length > 0 && (options.table === 'Sales Input' || options.table === 'Income Data')) {
          const Period = require('../models/period');
          Period.find(
            { _id: { $in: filter.periodIds.map((id) => new ObjectId(id)) } },
            'salesFilesIds',
          )
            .then((periods) => {
              let newIds = [];
              periods.forEach((period) => {
                if (Array.isArray(period.salesFilesIds)) {
                  newIds = newIds.concat(period.salesFilesIds.map((id) => id.toString()));
                }
              });
              if (!filter.salesFileIds || filter.salesFileIds.length === 0) {
                filter.salesFileIds = newIds;
              } else {
                filter.salesFileIds = filter.salesFileIds.filter((id) => newIds.includes(id.toString()));
              }
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb();
        }
      },
      function (cb) {
        if (filter.foreignId) {
          SalesFile.find({ foreignId: filter.foreignId }, '_id')
            .then((salesFiles) => {
              const newIds = salesFiles.map((sf) => sf._id.toString());
              if (!filter.salesFileIds || filter.salesFileIds.length === 0) {
                filter.salesFileIds = newIds;
              } else {
                filter.salesFileIds = filter.salesFileIds.filter((id) => newIds.includes(id.toString()));
              }
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb();
        }
      },
      function (cb) {
        if (filter.targetPeriod) {
          if (['Sales Input', 'Sales Output', 'Income Data'].includes(options.table)) {
            filter.salesFileIds = filter.salesFileIds ?? [];
            SalesFile.find({ clientId, targetPeriod: filter.targetPeriod }, { _id: 1 }).lean()
              .then((salesFiles) => {
                const newIds = (salesFiles ?? []).map((sf) => sf._id.toString());
                if (!filter.salesFileIds || filter.salesFileIds.length === 0) {
                  filter.salesFileIds = newIds;
                } else {
                  filter.salesFileIds = filter.salesFileIds.filter((id) => newIds.includes(id.toString()));
                }
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else if (['Costs Input', 'Costs Output'].includes(options.table)) {
            filter.costIds = filter.costIds ?? [];
            Cost.find({ clientId, targetPeriod: filter.targetPeriod }, { _id: 1 }).lean()
              .then((costs) => {
                const costIds = (costs ?? []).map((cost) => cost._id.toString());
                filter.costIds.push(...costIds);
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            cb();
          }
        } else {
          cb();
        }
      },
      function (cb) {
        // Filter contractIds before applying to catalogue items
        const contractFilter = {};
        // Companies filter
        if (Array.isArray(filter.companies) && filter.companies.length > 0) {
          containsContractFilters = true;
          if (filter?.contractIds?.length > 0) {
            contractFilter.$and = contractFilter.$and || [];
            contractFilter.$and.push({ companyId: { $in: filter.companies } });
          } else {
            contractFilter.$or = contractFilter.$or || [];
            contractFilter.$or.push({ companyId: { $in: filter.companies } });
          }
        }
        // Contract Categories filter
        if (Array.isArray(filter.contractCategories) && filter.contractCategories.length > 0) {
          containsContractFilters = true;
          contractFilter.$or = contractFilter.$or || [];
          contractFilter.$or.push({ contractCategories: { $in: filter.contractCategories } });
        }
        // Specific Contract IDs
        if (Array.isArray(filter.contractIds) && filter.contractIds.length > 0) {
          containsContractFilters = true;
          contractFilter.$or = contractFilter.$or || [];
          contractFilter.$or.push({ _id: { $in: filter.contractIds.map((id) => new ObjectId(id)) } });
        }
        // Filter contracts by Project ID if included
        if (filter.projectId && containsContractFilters) {
          contractFilter.projectId = filter.projectId;
        }
        if (Object.keys(contractFilter).length > 0) {
          contractFilter.clientId = clientId;
          Contract.find(contractFilter, '_id')
            .then((contracts) => {
              filteredContractIds = contracts.map((contract) => contract._id.toString());
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb();
        }
      },
      function (cb) {
        // Get catalogue IDs
        const releaseCatalogueFilter = [];
        const trackCatalogueFilter = [];
        const workCatalogueFilter = [];

        // Label Filter
        if (filter.releaseLabel && filter.releaseLabel !== '') {
          const releaseLabels = filter.releaseLabel.split(',').map((label) => label.trim());
          releaseCatalogueFilter.push({ label: { $in: releaseLabels } });
        }
        if (filter.trackLabel && filter.trackLabel !== '') {
          const trackLabels = filter.trackLabel.split(',').map((label) => label.trim());
          trackCatalogueFilter.push({ label: { $in: trackLabels } });
        }
        // Foreign IDs
        if (filter.catalogueReleaseForeignId && filter.catalogueReleaseForeignId !== '') {
          const releaseIds = filter.catalogueReleaseForeignId.split(',').map((item) => item.trim());
          releaseCatalogueFilter.push({ foreignId: { $in: releaseIds } });
        }
        if (filter.catalogueTrackForeignId && filter.catalogueTrackForeignId !== '') {
          const trackIds = filter.catalogueTrackForeignId.split(',').map((item) => item.trim());
          trackCatalogueFilter.push({ foreignId: { $in: trackIds } });
        }
        if (filter.catalogueWorkForeignId && filter.catalogueWorkForeignId !== '') {
          const workIds = filter.catalogueWorkForeignId.split(',').map((item) => item.trim());
          workCatalogueFilter.push({ foreignId: { $in: workIds } });
        }
        // Catalogue Groups Filter
        if (Array.isArray(filter.catalogueGroups) && filter.catalogueGroups.length > 0) {
          catalogueGroupCatalogueFilter = {
            clientId,
            catalogueGroups: { $in: filter.catalogueGroups },
          };
        }

        // Specific Catalogue IDs
        if (Array.isArray(filter.releaseIds) && filter.releaseIds.length > 0) {
          releaseCatalogueFilter.push({ _id: { $in: filter.releaseIds.map((id) => new ObjectId(id)) } });
        }
        if (Array.isArray(filter.trackIds) && filter.trackIds.length > 0) {
          trackCatalogueFilter.push({ _id: { $in: filter.trackIds.map((id) => new ObjectId(id)) } });
        }
        if (Array.isArray(filter.workIds) && filter.workIds.length > 0) {
          workCatalogueFilter.push({ _id: { $in: filter.workIds.map((id) => new ObjectId(id)) } });
        }
        if (releaseCatalogueFilter.length > 0) releaseFilter.$and = [{ $and: releaseCatalogueFilter }];
        if (trackCatalogueFilter.length > 0) trackFilter.$and = [{ $and: trackCatalogueFilter }];
        if (workCatalogueFilter.length > 0) workFilter.$and = [{ $and: workCatalogueFilter }];

        // TODO: can we add this to releaseCatalogueFilter and reduce down a bit (no $and within $and)?
        // Filter releases by Date if included
        if (filter.releaseDateStart) {
          releaseFilter.$and = releaseFilter.$and || [];
          releaseFilter.$and.push({ releaseDate: { $gte: new Date(filter.releaseDateStart) } });
        }
        if (filter.releaseDateEnd) {
          releaseFilter.$and = releaseFilter.$and || [];
          releaseFilter.$and.push({ releaseDate: { $lte: new Date(filter.releaseDateEnd) } });
        }

        // TODO: can we combine this with releaseFilter etc, so we only need one query to DB for catalogue?
        // Contracts Catalogue Filter
        // Only filter contracts on input table, otherwise it uses the contractId field
        if ((filteredContractIds.length > 0 || payeeContracts.length > 0) && (options.table === 'Sales Input' || options.table === 'Income Data' || options.table === 'Costs Input')) {
          // use filtered contract ids as default and only use payee contracts if no contract filters have been added
          const selectedContractIds = (filteredContractIds.length > 0) ? filteredContractIds : payeeContracts.map((contract) => contract._id);
          const contractFilter = {
            $and: [
              { clientId },
              {
                $or: [
                  { 'salesReturnsRights.contractId': { $in: selectedContractIds } },
                  { mechanicalContractIds: { $in: selectedContractIds } },
                ],
              },
            ],
          };
          contractCatalogueFilters.releaseFilter = contractFilter;
          contractCatalogueFilters.trackFilter = contractFilter;
          contractCatalogueFilters.workFilter = {
            $and: [
              { clientId },
              { 'salesReturnsRights.contractId': { $in: selectedContractIds } },
            ],
          };
        }
        // Filter catalogue by Project ID if included, but not for payee users and not if a contract filter is used
        if (filter.projectId && !options.payeeId && !filter.payeeIds && !containsContractFilters && !releaseFilter.$and && !trackFilter.$and && !workFilter.$and) {
          const baseFilter = {
            clientId,
            $or: [
              { projectId: filter.projectId },
            ],
          };
          projectIdCatalogueFilters.releaseFilter = { ...baseFilter };
          projectIdCatalogueFilters.trackFilter = { ...baseFilter };
          projectIdCatalogueFilters.workFilter = { ...baseFilter };

          // Get contracts filter for catalogue matching on Project ID
          Contract.find({ projectId: filter.projectId }, '_id')
            .then((contracts) => {
              if (contracts) {
                const contractIds = contracts.map((contract) => contract._id.toString());
                projectIdCatalogueFilters.releaseFilter.$or.push({ 'salesReturnsRights.contractId': { $in: contractIds } });
                projectIdCatalogueFilters.releaseFilter.$or.push({ mechanicalContractIds: { $in: contractIds } });
                projectIdCatalogueFilters.trackFilter.$or.push({ 'salesReturnsRights.contractId': { $in: contractIds } });
                projectIdCatalogueFilters.trackFilter.$or.push({ mechanicalContractIds: { $in: contractIds } });
                projectIdCatalogueFilters.workFilter.$or.push({ 'salesReturnsRights.contractId': { $in: contractIds } });
                if (options.table === 'Costs Input' || options.table === 'Costs Output') {
                  projectIdContractIds = [...contractIds];
                }
              }
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          if (filter.projectId) {
            if (releaseFilter.$and) {
              releaseFilter.$and.push({ projectId: filter.projectId });
            }
            if (trackFilter.$and) {
              trackFilter.$and.push({ projectId: filter.projectId });
            }
            if (workFilter.$and) {
              workFilter.$and.push({ projectId: filter.projectId });
            }
          }
          cb();
        }
      },
      function (cb) {
        // Filter on catalogue items
        async.parallel({
          releaseIds(paraCb) {
            if (releaseFilter.$and) {
              releaseFilter.$and.push({ clientId });
              Release.find(releaseFilter, '_id')
                .then((releases) => {
                  const ids = releases.map((release) => release._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          trackIds(paraCb) {
            if (trackFilter.$and) {
              trackFilter.$and.push({ clientId });
              Track.find(trackFilter, '_id')
                .then((tracks) => {
                  const ids = tracks.map((track) => track._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          workIds(paraCb) {
            if (workFilter.$and) {
              workFilter.$and.push({ clientId });
              Work.find(workFilter, '_id')
                .then((works) => {
                  const ids = works.map((work) => work._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          releaseTrackIds(paraCb) {
            if (releaseFilter.$and && filter.includeTracksWithRelease) {
              Release.find(releaseFilter, 'trackIds')
                .then((releases) => {
                  const trackIds = releases.map((release) => release.trackIds);
                  const trackIdsMerged = [].concat.apply([], trackIds);
                  paraCb(null, trackIdsMerged);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb();
            }
          },
          contractReleaseIds(paraCb) {
            if (contractCatalogueFilters.releaseFilter) {
              Release.find(contractCatalogueFilters.releaseFilter, '_id')
                .then((releases) => {
                  const ids = releases.map((release) => release._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          contractTrackIds(paraCb) {
            if (contractCatalogueFilters.trackFilter) {
              Track.find(contractCatalogueFilters.trackFilter, '_id')
                .then((tracks) => {
                  const ids = tracks.map((track) => track._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          contractWorkIds(paraCb) {
            if (contractCatalogueFilters.workFilter) {
              Work.find(contractCatalogueFilters.workFilter, '_id')
                .then((works) => {
                  const ids = works.map((work) => work._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          catalogueGroupReleaseIds(paraCb) {
            if (catalogueGroupCatalogueFilter) {
              Release.find(catalogueGroupCatalogueFilter, '_id')
                .then((releases) => {
                  const ids = releases.map((release) => release._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          catalogueGroupTrackIds(paraCb) {
            if (catalogueGroupCatalogueFilter) {
              Track.find(catalogueGroupCatalogueFilter, '_id')
                .then((tracks) => {
                  const ids = tracks.map((track) => track._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          catalogueGroupWorkIds(paraCb) {
            if (catalogueGroupCatalogueFilter) {
              Work.find(catalogueGroupCatalogueFilter, '_id')
                .then((works) => {
                  const ids = works.map((work) => work._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          projectIdReleaseIds(paraCb) {
            if (projectIdCatalogueFilters.releaseFilter) {
              Release.find(projectIdCatalogueFilters.releaseFilter, '_id')
                .then((releases) => {
                  const ids = releases.map((release) => release._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          projectIdTrackIds(paraCb) {
            if (projectIdCatalogueFilters.trackFilter) {
              Track.find(projectIdCatalogueFilters.trackFilter, '_id')
                .then((tracks) => {
                  const ids = tracks.map((track) => track._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
          projectIdWorkIds(paraCb) {
            if (projectIdCatalogueFilters.workFilter) {
              Work.find(projectIdCatalogueFilters.workFilter, '_id')
                .then((works) => {
                  const ids = works.map((work) => work._id.toString());
                  paraCb(null, ids);
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            } else {
              paraCb(null, []);
            }
          },
        }, cb);
      },
      function (catalogueIds, cb) {
        if (
          (releaseFilter.$and && catalogueIds.releaseIds.length === 0)
          || (trackFilter.$and && catalogueIds.trackIds.length === 0)
          || (workFilter.$and && catalogueIds.workIds.length === 0)
        ) {
          logger.debug('-------- clearing filter due to catalogue filters not returning any results ------');
          dbFilter = {};
        } else if (
          Object.keys(projectIdCatalogueFilters).length > 0 && !releaseFilter.$and && !trackFilter.$and && !workFilter.$and
          && !(catalogueIds.projectIdReleaseIds.length > 0 || catalogueIds.projectIdTrackIds.length > 0 || catalogueIds.projectIdWorkIds.length > 0 || (projectIdContractIds && projectIdContractIds.length > 0))
        ) {
          logger.debug('-------- clearing filter due to projectIdCatalogueFilters not returning any results ------');
          dbFilter = {};
        // TODO combine Catalogue Group and Project ID filters
        } else if (
          catalogueGroupCatalogueFilter && !releaseFilter.$and && !trackFilter.$and && !workFilter.$and
          && !(catalogueIds.catalogueGroupReleaseIds.length > 0 || catalogueIds.catalogueGroupTrackIds.length > 0 || catalogueIds.catalogueGroupWorkIds.length > 0)
        ) {
          logger.debug('-------- clearing filter due to projectIdCatalogueFilters not returning any results ------');
          dbFilter = {};
        } else {
          // Specifics for each table
          let tableSpecificsFilter = {};

          // TABLE 1 - Sales Input || Income Data
          if (options.table === 'Sales Input' || options.table === 'Income Data') {
            tableSpecificsFilter = Filter.processSalesInput(filter, filteredContractIds, catalogueIds);

          // TABLE 2 - Sales Output || Royalties || Sales
          } else if (options.table === 'Sales Output' || options.table === 'Royalties' || options.table === 'Sales') {
            tableSpecificsFilter = Filter.processSalesOutput(filter, filteredContractIds, catalogueIds, payeeContracts, options.payeeId);

          // TABLE 3 - Costs Input
          } else if (options.table === 'Costs Input') {
            tableSpecificsFilter = Filter.processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId);

          // TABLE 4 - Costs Output || Costs
          } else if (options.table === 'Costs Output' || options.table === 'Costs') {
            tableSpecificsFilter = Filter.processCostsOutput(filter, filteredContractIds, catalogueIds, payeeContracts, projectIdContractIds);
          }

          // combine dbFilter and Table Specifics Filter
          dbFilter = { ...dbFilter, ...tableSpecificsFilter };
        }
        cb();
      },
    ], (err) => {
      if (err && err.message.includes('no contracts found')) {
        callback(null, null);
      } else if (Object.keys(dbFilter).length === 0 && Object.keys(filter).length > 0) {
        // if resulting filter is empty but filters have been applied don't return any results
        callback(null, null);
      } else if ((options.payeeId || filter.payeeIds) && Object.keys(dbFilter).length === 0) {
        // if looking for payee data and resulting filter is empty don't return any results
        callback(null, null);
      } else {
        callback(err, dbFilter);
      }
    });
  },
  /**
   * Process Sales Input || Income Data
   *
   * @param {object} filter - filter passed to filter lib
   * @param {string[]} filteredContractIds - Contract Ids resulting from applying all contract filters
   * @param {object} catalogueIds - output of all catalogue queries to Catalogue DB
   * @returns {object} - the Sales Input Filter
   */
  processSalesInput(filter, filteredContractIds, catalogueIds) {
    const salesInFilter = {};
    // if include tracks with release(s) option is selected
    if (catalogueIds.releaseTrackIds && catalogueIds.releaseTrackIds.length > 0) {
      // select all tracks of those release(s) or any that are not reported as part of a release
      // TODO: remove these lines below and instead create one $and array, push items to it and then assign to salesInFilter.$and if it has any items
      salesInFilter.$and = salesInFilter.$and || [];
      salesInFilter.$and.push({
        $or: [{
          catType: 'Track',
          trackId: { $in: catalogueIds.releaseTrackIds },
          $or: [{ releaseId: { $in: catalogueIds.releaseIds } }, { releaseId: null }],
        }, {
          catType: 'Release', releaseId: { $in: catalogueIds.releaseIds },
        }],
      });
    } else if (catalogueIds.releaseIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      // otherwise select lines that are reported against the release(s)
      salesInFilter.$and.push({ catType: 'Release', releaseId: { $in: catalogueIds.releaseIds } });
    }
    if (catalogueIds.trackIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      salesInFilter.$and.push({ catType: 'Track', trackId: { $in: catalogueIds.trackIds } });
    }
    if (catalogueIds.workIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      salesInFilter.$and.push({ catType: 'Work', workId: { $in: catalogueIds.workIds } });
    }
    if (catalogueIds.contractReleaseIds.length > 0 || catalogueIds.contractTrackIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      const contractCatFilter = [];
      // add an "OR contractId IN" to salesInput search - only when other catalogue items returned
      if (filteredContractIds.length > 0) {
        contractCatFilter.push({ catType: 'Contract', contractId: { $in: filteredContractIds } });
      }
      if (catalogueIds.contractReleaseIds.length > 0) {
        contractCatFilter.push({ catType: 'Release', releaseId: { $in: catalogueIds.contractReleaseIds } });
      }
      if (catalogueIds.contractTrackIds.length > 0) {
        contractCatFilter.push({ catType: 'Track', trackId: { $in: catalogueIds.contractTrackIds } });
      }
      salesInFilter.$and.push({ $or: contractCatFilter });
    }
    if (catalogueIds.contractWorkIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      // If an existing $or filter has been added when querying Contract data
      // We need to add it to the existing $or rather than creating a new $and condition (otherwise it leads to an impossible query)
      if (catalogueIds.contractReleaseIds.length > 0 || catalogueIds.contractTrackIds.length > 0) {
        const releaseOrTrackConstraints = salesInFilter.$and?.[0]?.$or;
        const hasContractIdFilter = releaseOrTrackConstraints?.find((c) => c.catType === 'Contract' && c.contractId);
        const hasContractTrackIdsFilter = releaseOrTrackConstraints?.find((c) => c.catType === 'Track' && c.trackId);
        const hasContractReleaseIdsFilter = releaseOrTrackConstraints?.find((c) => c.catType === 'Release' && c.trackId);
        if (releaseOrTrackConstraints && (hasContractIdFilter || hasContractTrackIdsFilter || hasContractReleaseIdsFilter)) {
          salesInFilter.$and[0].$or.push({ catType: 'Work', workId: { $in: catalogueIds.contractWorkIds } });
        }
      } else {
        salesInFilter.$and.push({ catType: 'Work', workId: { $in: catalogueIds.contractWorkIds } });
      }
    }
    if (catalogueIds.catalogueGroupReleaseIds.length > 0 || catalogueIds.catalogueGroupTrackIds.length > 0 || catalogueIds.catalogueGroupWorkIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      const catalogueGroupCatFilter = [];
      if (catalogueIds.catalogueGroupReleaseIds.length > 0) {
        catalogueGroupCatFilter.push({ catType: 'Release', releaseId: { $in: catalogueIds.catalogueGroupReleaseIds } });
      }
      if (catalogueIds.catalogueGroupTrackIds.length > 0) {
        catalogueGroupCatFilter.push({ catType: 'Track', trackId: { $in: catalogueIds.catalogueGroupTrackIds } });
      }
      if (catalogueIds.catalogueGroupWorkIds.length > 0) {
        catalogueGroupCatFilter.push({ catType: 'Work', workId: { $in: catalogueIds.catalogueGroupWorkIds } });
      }
      salesInFilter.$and.push({ $or: catalogueGroupCatFilter });
    }
    if (catalogueIds.projectIdReleaseIds.length > 0 || catalogueIds.projectIdTrackIds.length > 0 || catalogueIds.projectIdWorkIds.length > 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      const projectIdCatFilter = [];
      if (catalogueIds.projectIdReleaseIds.length > 0) {
        projectIdCatFilter.push({ catType: 'Release', releaseId: { $in: catalogueIds.projectIdReleaseIds } });
      }
      if (catalogueIds.projectIdTrackIds.length > 0) {
        projectIdCatFilter.push({ catType: 'Track', trackId: { $in: catalogueIds.projectIdTrackIds } });
      }
      if (catalogueIds.projectIdWorkIds.length > 0) {
        projectIdCatFilter.push({ catType: 'Work', workId: { $in: catalogueIds.projectIdWorkIds } });
      }
      salesInFilter.$and.push({ $or: projectIdCatFilter });
    }
    if (filter.saleDateStart) { salesInFilter.saleDate = { $gte: new Date(filter.saleDateStart) }; }
    if (filter.saleDateEnd) {
      const endDate = new Date(filter.saleDateEnd);
      // Set end date to end of the day
      endDate.setHours(endDate.getHours() + 23);
      salesInFilter.saleDate = { $lte: endDate };
    }
    // TODO: could just push { saleDate: date } instead, so we end up with $and = [ { saleDate: $lte: start }, { saleDate: $gte: end } ]
    if (filter.saleDateStart && filter.saleDateEnd) {
      // Set end date to end of the day
      const endDate = new Date(filter.saleDateEnd);
      endDate.setHours(endDate.getHours() + 23);
      salesInFilter.saleDate = { $gte: new Date(filter.saleDateStart), $lte: endDate };
    }
    if (filter.transactionDateStart) { salesInFilter.transactionDate = { $gte: new Date(filter.transactionDateStart) }; }
    if (filter.transactionDateEnd) {
      const endDate = new Date(filter.transactionDateEnd);
      // Set end date to end of the day
      endDate.setHours(endDate.getHours() + 23);
      salesInFilter.transactionDate = { $lte: endDate };
    }
    if (filter.transactionDateStart && filter.transactionDateEnd) {
      // Set end date to end of the day
      const endDate = new Date(filter.transactionDateEnd);
      endDate.setHours(endDate.getHours() + 23);
      salesInFilter.transactionDate = { $gte: new Date(filter.transactionDateStart), $lte: endDate };
    }
    if (filter.saleDatePeriod && filter.saleDateNumber) {
      const date = new Date();
      if (filter.saleDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.saleDateNumber));
      } else if (filter.saleDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.saleDateNumber));
      }
      date.setHours(date.getHours() + 12);
      salesInFilter.saleDate = { $gte: date };
    }
    if (filter.transactionDatePeriod && filter.transactionDateNumber) {
      const date = new Date();
      if (filter.transactionDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.transactionDateNumber));
      } else if (filter.transactionDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.transactionDateNumber));
      }
      salesInFilter.transactionDate = { $gte: date };
    }
    if (Array.isArray(filter.salesFileIds) && filter.salesFileIds.length > 0) { salesInFilter.salesFileId = { $in: filter.salesFileIds }; }
    // When a contract is passed (so looking at a specific contract's data), and no catalogue is returned for it, filter on catType: 'Contract'
    if (Array.isArray(filteredContractIds) && filteredContractIds.length > 0 && catalogueIds.contractReleaseIds.length === 0 && catalogueIds.contractTrackIds.length === 0 && catalogueIds.contractWorkIds.length === 0) {
      salesInFilter.$and = salesInFilter.$and || [];
      salesInFilter.$and.push({ catType: 'Contract', contractId: { $in: filteredContractIds } });
    }
    return salesInFilter;
  },

  /**
   * Process Sales Output || Royalties || Sales
   *
   * @param {object} filter - filter passed to filter lib
   * @param {string[]} filteredContractIds - Contract Ids resulting from applying all contract filters
   * @param {object} catalogueIds - output of all catalogue queries to Catalogue DB
   * @param {object[]} payeeContracts - all contracts payee has access to
   * @returns {object} - the Sales Output Filter
   */
  processSalesOutput(filter, filteredContractIds, catalogueIds, payeeContracts, payeeId) {
    const salesOutFilter = {};
    if (filter.periodIds && (Array.isArray(filter.periodIds) && filter.periodIds.length > 0)) { salesOutFilter.periodId = { $in: filter.periodIds }; }
    if (filteredContractIds.length > 0) { salesOutFilter.contractId = { $in: filteredContractIds }; }
    if (payeeContracts && payeeContracts.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      salesOutFilter.$and.push({
        $or: payeeContracts.map((payeeContract) => ({
          contractId: payeeContract._id,
          periodId: payeeContract.periodIds,
          contractPartitionNo: payeeContract.partitionNo,
        })),
      });
    }
    if (filter.salesFileIds && (Array.isArray(filter.salesFileIds) && filter.salesFileIds.length > 0)) { salesOutFilter.salesFileId = { $in: filter.salesFileIds }; }
    // if include tracks with release(s) option is selected
    if (catalogueIds.releaseTrackIds && catalogueIds.releaseTrackIds.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      // select all tracks of those release(s) or any that are not reported as part of a release
      salesOutFilter.$and.push({
        $or: [{
          catType: 'Track',
          trackId: { $in: catalogueIds.releaseTrackIds },
          $or: [{ releaseId: { $in: catalogueIds.releaseIds } }, { releaseId: null }],
        }, {
          catType: 'Release', releaseId: { $in: catalogueIds.releaseIds },
        }],
      });
    } else if (catalogueIds.releaseIds.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      // otherwise select lines that are reported against the release(s)
      salesOutFilter.$and.push({ catType: 'Release', releaseId: { $in: catalogueIds.releaseIds } });
    }
    if (catalogueIds.trackIds.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      salesOutFilter.$and.push({ catType: 'Track', trackId: { $in: catalogueIds.trackIds } });
    }
    if (catalogueIds.workIds.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      salesOutFilter.$and.push({ catType: 'Work', workId: { $in: catalogueIds.workIds } });
    }
    if (catalogueIds.catalogueGroupReleaseIds.length > 0 || catalogueIds.catalogueGroupTrackIds.length > 0 || catalogueIds.catalogueGroupWorkIds.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      const catalogueGroupCatFilter = [];
      if (catalogueIds.catalogueGroupReleaseIds.length > 0) {
        catalogueGroupCatFilter.push({ catType: 'Release', releaseId: { $in: catalogueIds.catalogueGroupReleaseIds } });
      }
      if (catalogueIds.catalogueGroupTrackIds.length > 0) {
        catalogueGroupCatFilter.push({ catType: 'Track', trackId: { $in: catalogueIds.catalogueGroupTrackIds } });
      }
      if (catalogueIds.catalogueGroupWorkIds.length > 0) {
        catalogueGroupCatFilter.push({ catType: 'Work', workId: { $in: catalogueIds.catalogueGroupWorkIds } });
      }
      salesOutFilter.$and.push({ $or: catalogueGroupCatFilter });
    }
    if (catalogueIds.projectIdReleaseIds.length > 0 || catalogueIds.projectIdTrackIds.length > 0 || catalogueIds.projectIdWorkIds.length > 0) {
      salesOutFilter.$and = salesOutFilter.$and || [];
      const projectIdCatFilter = [];
      if (catalogueIds.projectIdReleaseIds.length > 0) {
        projectIdCatFilter.push({ catType: 'Release', releaseId: { $in: catalogueIds.projectIdReleaseIds } });
      }
      if (catalogueIds.projectIdTrackIds.length > 0) {
        projectIdCatFilter.push({ catType: 'Track', trackId: { $in: catalogueIds.projectIdTrackIds } });
      }
      if (catalogueIds.projectIdWorkIds.length > 0) {
        projectIdCatFilter.push({ catType: 'Work', workId: { $in: catalogueIds.projectIdWorkIds } });
      }
      salesOutFilter.$and.push({ $or: projectIdCatFilter });
    }
    if (filter.saleDateStart) { salesOutFilter.saleDate = { $gte: new Date(filter.saleDateStart) }; }
    if (filter.saleDateEnd) {
      const endDate = new Date(filter.saleDateEnd);
      // Set end date to end of the day
      endDate.setHours(endDate.getHours() + 23);
      salesOutFilter.saleDate = { $lte: endDate };
    }
    if (filter.saleDateStart && filter.saleDateEnd) {
      // Set end date to end of the day
      const endDate = new Date(filter.saleDateEnd);
      endDate.setHours(endDate.getHours() + 23);
      salesOutFilter.saleDate = { $gte: new Date(filter.saleDateStart), $lte: endDate };
    }
    if (filter.transactionDateStart) { salesOutFilter.transactionDate = { $gte: new Date(filter.transactionDateStart) }; }
    if (filter.transactionDateEnd) {
      const endDate = new Date(filter.transactionDateEnd);
      // Set end date to end of the day
      endDate.setHours(endDate.getHours() + 23);
      salesOutFilter.transactionDate = { $lte: endDate };
    }
    if (filter.transactionDateStart && filter.transactionDateEnd) {
      // Set end date to end of the day
      const endDate = new Date(filter.transactionDateEnd);
      endDate.setHours(endDate.getHours() + 23);
      salesOutFilter.transactionDate = { $gte: new Date(filter.transactionDateStart), $lte: endDate };
    }
    if (filter.saleDatePeriod && filter.saleDateNumber) {
      const date = new Date();
      if (filter.saleDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.saleDateNumber));
      } else if (filter.saleDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.saleDateNumber));
      }
      salesOutFilter.saleDate = { $gte: date };
    }
    if (filter.transactionDatePeriod && filter.transactionDateNumber) {
      const date = new Date();
      if (filter.transactionDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.transactionDateNumber));
      } else if (filter.transactionDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.transactionDateNumber));
      }
      salesOutFilter.transactionDate = { $gte: date };
    }
    if (payeeId) {
      // suppress 0% royalty rates from artists/payees
      salesOutFilter.$and = salesOutFilter.$and || [];
      salesOutFilter.$and.push({ royaltyRate: { $gt: 0 } });
    }
    return salesOutFilter;
  },

  /**
   * Process Costs Input
   *
   * @param {object} filter - filter passed to filter lib
   * @param {string[]} filteredContractIds - Contract Ids resulting from applying all contract filters
   * @param {object} catalogueIds - output of all catalogue queries to Catalogue DB
   * @param {string[]} projectIdContractIds - Contract Ids resulting from applying Project Id filter
   * @param {string} clientId - the clientId from user
   * @returns {object} - the Costs Input Filter
   */
  processCostsInput(filter, filteredContractIds, catalogueIds, projectIdContractIds, clientId) {
    // Costs Input is stored in Mongo DB, so we need to always add the clientId to the filter unlike the BigQuery tables, which are client specific
    const costsInFilter = { clientId };
    if (filter.periodIds && (Array.isArray(filter.periodIds) && filter.periodIds.length > 0)) { costsInFilter.periodIds = { $in: filter.periodIds }; }
    // if include tracks with release(s) option is selected
    if (catalogueIds.releaseTrackIds && catalogueIds.releaseTrackIds.length > 0) {
      costsInFilter.$and = costsInFilter.$and || [];
      // select all tracks of those release(s) or any that are not reported as part of a release
      costsInFilter.$and.push({
        $or: [{
          trackIds: { $in: catalogueIds.releaseTrackIds.map((id) => new ObjectId(id)) },
        }, {
          releaseIds: { $in: catalogueIds.releaseIds.map((id) => new ObjectId(id)) },
        }],
      });
    } else if (catalogueIds.releaseIds.length > 0) {
      costsInFilter.$and = costsInFilter.$and || [];
      // otherwise select lines that are reported against the release(s)
      costsInFilter.$and.push({ releaseIds: { $in: catalogueIds.releaseIds.map((id) => new ObjectId(id)) } });
    }
    if (catalogueIds.trackIds.length > 0) {
      costsInFilter.$and = costsInFilter.$and || [];
      costsInFilter.$and.push({ trackIds: { $in: catalogueIds.trackIds.map((id) => new ObjectId(id)) } });
    }
    if (filteredContractIds.length > 0 || catalogueIds.contractReleaseIds.length > 0 || catalogueIds.contractTrackIds.length > 0) {
      costsInFilter.$and = costsInFilter.$and || [];
      const contractCatFilter = [];
      if (filteredContractIds.length > 0) {
        contractCatFilter.push({ contractIds: { $in: filteredContractIds.map((id) => new ObjectId(id)) } });
      }
      if (catalogueIds.contractReleaseIds.length > 0) {
        contractCatFilter.push({ releaseIds: { $in: catalogueIds.contractReleaseIds.map((id) => new ObjectId(id)) } });
      }
      if (catalogueIds.contractTrackIds.length > 0) {
        contractCatFilter.push({ trackIds: { $in: catalogueIds.contractTrackIds.map((id) => new ObjectId(id)) } });
      }
      costsInFilter.$and.push({ $or: contractCatFilter });
    }
    if (catalogueIds.catalogueGroupReleaseIds.length > 0 || catalogueIds.catalogueGroupTrackIds.length > 0 || catalogueIds.catalogueGroupWorkIds.length > 0) {
      costsInFilter.$and = costsInFilter.$and || [];
      const catalogueGroupCatFilter = [];
      if (catalogueIds.catalogueGroupReleaseIds.length > 0) {
        catalogueGroupCatFilter.push({ releaseIds: { $in: catalogueIds.catalogueGroupReleaseIds.map((id) => new ObjectId(id)) } });
      }
      if (catalogueIds.catalogueGroupTrackIds.length > 0) {
        catalogueGroupCatFilter.push({ trackIds: { $in: catalogueIds.catalogueGroupTrackIds.map((id) => new ObjectId(id)) } });
      }
      if (catalogueIds.catalogueGroupWorkIds.length > 0) {
        catalogueGroupCatFilter.push({ workIds: { $in: catalogueIds.catalogueGroupWorkIds.map((id) => new ObjectId(id)) } });
      }
      costsInFilter.$and.push({ $or: catalogueGroupCatFilter });
    }
    if (catalogueIds.projectIdReleaseIds.length > 0 || catalogueIds.projectIdTrackIds.length > 0 || catalogueIds.projectIdWorkIds.length > 0 || (Array.isArray(projectIdContractIds) && projectIdContractIds.length > 0)) {
      costsInFilter.$and = costsInFilter.$and || [];
      const projectIdCatFilter = [];
      if (catalogueIds.projectIdReleaseIds.length > 0) {
        projectIdCatFilter.push({ releaseIds: { $in: catalogueIds.projectIdReleaseIds.map((id) => new ObjectId(id)) } });
      }
      if (catalogueIds.projectIdTrackIds.length > 0) {
        projectIdCatFilter.push({ trackIds: { $in: catalogueIds.projectIdTrackIds.map((id) => new ObjectId(id)) } });
      }
      if (catalogueIds.projectIdWorkIds.length > 0) {
        projectIdCatFilter.push({ workIds: { $in: catalogueIds.projectIdWorkIds.map((id) => new ObjectId(id)) } });
      }
      if (projectIdContractIds.length > 0) {
        projectIdCatFilter.push({ contractIds: { $in: projectIdContractIds.map((id) => new ObjectId(id)) } });
      }
      costsInFilter.$and.push({ $or: projectIdCatFilter });
    }
    if (filter.saleDateStart) { costsInFilter.date = { $gte: new Date(filter.saleDateStart) }; }
    if (filter.saleDateEnd) {
      const endDate = new Date(filter.saleDateEnd);
      // Set end date to end of the day
      endDate.setHours(endDate.getHours() + 23);
      costsInFilter.date = { $lte: endDate };
    }
    if (filter.saleDateStart && filter.saleDateEnd) {
      // Set end date to end of the day
      const endDate = new Date(filter.saleDateEnd);
      endDate.setHours(endDate.getHours() + 23);
      costsInFilter.date = { $gte: new Date(filter.saleDateStart), $lte: endDate };
    }
    if (filter.saleDatePeriod && filter.saleDateNumber) {
      const date = new Date();
      if (filter.saleDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.saleDateNumber));
      } else if (filter.saleDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.saleDateNumber));
      }
      costsInFilter.saleDate = { $gte: date };
    }
    if (filter.transactionDatePeriod && filter.transactionDateNumber) {
      const date = new Date();
      if (filter.transactionDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.transactionDateNumber));
      } else if (filter.transactionDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.transactionDateNumber));
      }
      costsInFilter.transactionDate = { $gte: date };
    }
    if (filter.costIds && (Array.isArray(filter.costIds) && filter.costIds.length > 0)) {
      costsInFilter._id = { $in: filter.costIds.map((id) => new ObjectId(id)) };
    }
    return costsInFilter;
  },

  /**
   * process Costs Output || Costs
   *
   * @param {object} filter - filter passed to filter lib
   * @param {string[]} filteredContractIds - Contract Ids resulting from applying all contract filters
   * @param {object} catalogueIds - output of all catalogue queries to Catalogue DB
   * @param {object[]} payeeContracts - all contracts payee has access to
   * @param {string[]} projectIdContractIds - Contract Ids resulting from applying Project Id filter
   * @returns {object} - the Costs Output Filter
   */
  processCostsOutput(filter, filteredContractIds, catalogueIds, payeeContracts, projectIdContractIds) {
    const costsOutFilter = {};
    if (filter.periodIds && (Array.isArray(filter.periodIds) && filter.periodIds.length > 0)) { costsOutFilter.periodId = { $in: filter.periodIds }; }
    if (filteredContractIds.length > 0) { costsOutFilter.contractId = { $in: filteredContractIds }; }
    if (payeeContracts && payeeContracts.length > 0) {
      costsOutFilter.$and = costsOutFilter.$and || [];
      costsOutFilter.$and.push({
        $or: payeeContracts.map((payeeContract) => ({
          contractId: payeeContract._id,
          periodId: payeeContract.periodIds,
        })),
      });
    }
    // if include tracks with release(s) option is selected
    if (catalogueIds.releaseTrackIds && catalogueIds.releaseTrackIds.length > 0) {
      costsOutFilter.$and = costsOutFilter.$and || [];
      // select all tracks of those release(s) or any that are not reported as part of a release
      costsOutFilter.$and.push({
        $or: [{
          trackId: { $in: catalogueIds.releaseTrackIds },
          $or: [{ releaseId: { $in: catalogueIds.releaseIds } }, { releaseId: null }],
        }, {
          releaseId: { $in: catalogueIds.releaseIds },
        }],
      });
    } else if (catalogueIds.releaseIds.length > 0) {
      costsOutFilter.$and = costsOutFilter.$and || [];
      // otherwise select lines that are reported against the release(s)
      costsOutFilter.$and.push({ releaseId: { $in: catalogueIds.releaseIds } });
    }
    if (catalogueIds.trackIds.length > 0) {
      costsOutFilter.$and = costsOutFilter.$and || [];
      costsOutFilter.$and.push({ trackId: { $in: catalogueIds.trackIds } });
    }
    if (catalogueIds.catalogueGroupReleaseIds.length > 0 || catalogueIds.catalogueGroupTrackIds.length > 0 || catalogueIds.catalogueGroupWorkIds.length > 0) {
      costsOutFilter.$and = costsOutFilter.$and || [];
      const catalogueGroupCatFilter = [];
      if (catalogueIds.catalogueGroupReleaseIds.length > 0) {
        catalogueGroupCatFilter.push({ releaseId: { $in: catalogueIds.catalogueGroupReleaseIds } });
      }
      if (catalogueIds.catalogueGroupTrackIds.length > 0) {
        catalogueGroupCatFilter.push({ trackId: { $in: catalogueIds.catalogueGroupTrackIds } });
      }
      if (catalogueIds.catalogueGroupWorkIds.length > 0) {
        catalogueGroupCatFilter.push({ workId: { $in: catalogueIds.catalogueGroupWorkIds } });
      }
      costsOutFilter.$and.push({ $or: catalogueGroupCatFilter });
    }
    if (catalogueIds.projectIdReleaseIds.length > 0 || catalogueIds.projectIdTrackIds.length > 0 || catalogueIds.projectIdWorkIds.length > 0 || (Array.isArray(projectIdContractIds) && projectIdContractIds.length > 0)) {
      costsOutFilter.$and = costsOutFilter.$and || [];
      const projectIdCatFilter = [];
      if (catalogueIds.projectIdReleaseIds.length > 0) {
        projectIdCatFilter.push({ releaseId: { $in: catalogueIds.projectIdReleaseIds } });
      }
      if (catalogueIds.projectIdTrackIds.length > 0) {
        projectIdCatFilter.push({ trackId: { $in: catalogueIds.projectIdTrackIds } });
      }
      if (catalogueIds.projectIdWorkIds.length > 0) {
        projectIdCatFilter.push({ workId: { $in: catalogueIds.projectIdWorkIds } });
      }
      if (Array.isArray(projectIdContractIds) && projectIdContractIds.length > 0) {
        projectIdCatFilter.push({ contractId: { $in: projectIdContractIds } });
      }
      costsOutFilter.$and.push({ $or: projectIdCatFilter });
    }
    if (filter.saleDateStart) { costsOutFilter.date = { $gte: new Date(filter.saleDateStart) }; }
    if (filter.saleDateEnd) {
      const endDate = new Date(filter.saleDateEnd);
      // Set end date to end of the day
      endDate.setHours(endDate.getHours() + 23);
      costsOutFilter.date = { $lte: endDate };
    }
    if (filter.saleDateStart && filter.saleDateEnd) {
      // Set end date to end of the day
      const endDate = new Date(filter.saleDateEnd);
      endDate.setHours(endDate.getHours() + 23);
      costsOutFilter.date = { $gte: new Date(filter.saleDateStart), $lte: endDate };
    }
    if (filter.saleDatePeriod && filter.saleDateNumber) {
      const date = new Date();
      if (filter.saleDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.saleDateNumber));
      } else if (filter.saleDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.saleDateNumber));
      }
      costsOutFilter.saleDate = { $gte: date };
    }
    if (filter.transactionDatePeriod && filter.transactionDateNumber) {
      const date = new Date();
      if (filter.transactionDatePeriod === 'Days') {
        date.setDate(date.getDate() - parseInt(filter.transactionDateNumber));
      } else if (filter.transactionDatePeriod === 'Months') {
        date.setMonth(date.getMonth() - parseInt(filter.transactionDateNumber));
      }
      costsOutFilter.transactionDate = { $gte: date };
    }
    if (filter.costIds && (Array.isArray(filter.costIds) && filter.costIds.length > 0)) {
      costsOutFilter.costId = { $in: filter.costIds };
    }
    return costsOutFilter;
  },
};

module.exports = Filter;
