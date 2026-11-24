angular.module('Curve')
  .directive('analyticsSuite', ['$rootScope', '$window', 'Session', 'Loader', 'Settings', 'Contract', 'Territories', 'Release', 'Track', 'Work', 'Report', 'SalesFile', 'Cost',
    function ($rootScope, $window, Session, Loader, Settings, Contract, Territories, Release, Track, Work, Report, SalesFile, Cost) {
      return {
        restrict: 'E',
        templateUrl: 'angular/templates/directives/analytics/analytics-suite.html',
        scope: {
          prePopulateFilters: '=',
          prePopulateComparisonFilters: '=',
          analyticsConfig: '=',
          analyticsInfo: '=',
          analyticsMobileSections: '=',
          ignoreGraphs: '=',
          ignoreComparison: '=',
          hideOr: '=',
          dataset: '=',
          filterParams: '=',
          reportType: '=',
        },
        link($scope, element) {
          $window.scrollTo(0, 0);
          $scope.clientType = Session.clientType;
          $scope.showGraphs = !$scope.ignoreGraphs;
          $scope.filtersOpen = true;
          // $scope.btnTester = function() {}
          $rootScope.$watch('clientType', (newValue) => {
            if (newValue) {
              $scope.clientType = newValue;
            }
          });
          const emptyBlocksObject = {
            filterblocks: [{
              filterRows: [{}],
            }],
          };

          Loader.load();
          Settings.getSettings().then(async (settings) => {
            if (Session.userType !== 'payee') {
              await searchSalesTargetPeriodsAndForeignIds({ clientId: Session.clientId });
              await searchCostsTargetPeriods({ clientId: Session.clientId });
            }
            $scope.targetPeriods = $scope.dataset === 'Costs Input' || $scope.dataset === 'Costs Output' ? $scope.costsTargetPeriods : $scope.salesTargetPeriods;
            $scope.foreignIds = $scope.salesForeignIds;
            $scope.prices = angular.copy(settings.priceCategories);
            $scope.prices.shift();
            $scope.configs = angular.copy(settings.configurations);
            $scope.configs.shift();
            $scope.channels = angular.copy(settings.distributionChannels);
            $scope.channels.shift();
            $scope.catTypes = ['Release', 'Track', 'Contract'];
            $scope.contractCategories = settings.contractCategories;
            $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);
            $scope.territories = Territories;
            $scope.fieldOptions = initFieldOptions($scope.clientType, Session.payeeId, $scope.filterParams);
            $scope.filters = initialiseFilters();
            if ($scope.showGraphs) {
              $scope.graphOptions = initGraphOptions($scope.clientType);
            }
            $scope.searchPeriods();
            Loader.complete();
            if ($scope.analyticsConfig && $scope.analyticsConfig.devAutoload) {
              $scope.getAnalyticsData();
            }
          });

          $scope.$watch('dataset', (dataset) => {
            $scope.table = dataset;
            $scope.targetPeriods = dataset === 'Costs Input' || dataset === 'Costs Output' ? $scope.costsTargetPeriods : $scope.salesTargetPeriods;
            $scope.foreignIds = $scope.salesForeignIds;
          });

          $scope.$on('triggerAnalyticsLoader', (event, args) => {
            if ($scope.filters && !$scope.analyticsMobileSections && !$scope.analyticsTriggered) {
              // Using and setting $scope.analyticsTriggered here rather than placing $scope.analyticsLoaded
              // in getAnalyticsData and using that to prevent a 2nd load being made if tabs are switched
              // quickly whilst 1st load still running
              $scope.analyticsTriggered = true;
              $scope.getAnalyticsData();
            }

            // Alternatively use scope/watch rather than broadcast/on
            // $scope.$watch('analyticsConfig.triggerAnalyticsLoader', function (analysisData) {
            //   console.log('analyticsTriggered', $scope.analyticsTriggered );
            //   //if ($scope.filters && !$scope.analyticsTriggered) {
            //   if ($scope.filters && !$scope.analyticsMobileSections  && !$scope.analyticsTriggered) {
            //     $scope.analyticsTriggered = true;
            //     console.log('getAnalyticsData');
            //     //console.log('$scope.filters', $scope.filters);
            //     //console.log('$scope.comparisonFilters', $scope.comparisonFilters);
            //     $scope.getAnalyticsData();
            //   }
            // });
          });

          const searchSalesTargetPeriodsAndForeignIds = async () => {
            await SalesFile.getFilterOptions((response) => {
              if (response.status === 403) return;
              if (response.status !== 200) return Loader.error('Failed to load sales filter options, please try again');
              const { targetPeriods, foreignIds } = response.data;
              $scope.salesTargetPeriods = targetPeriods;
              $scope.salesForeignIds = foreignIds;
            });
          };

          const searchCostsTargetPeriods = async () => {
            if ($scope.costsTargetPeriods) return;

            await Cost.getFilterOptions((response) => {
              if (response.status === 403) return;
              if (response.status !== 200) return Loader.error('Failed to load costs filter options, please try again');
              const { targetPeriods } = response.data;
              $scope.costsTargetPeriods = targetPeriods;
            });
          };

          $scope.searchPeriods = function () {
            if (!$scope.periods) {
              Settings.getPeriods().then((periods) => {
                $scope.periods = periods.periods;
              });
            }
          };

          $scope.searchCompanies = function () {
            if (!$scope.companies) {
              Settings.getCompanies().then((companies) => {
                $scope.companies = companies;
              });
            }
          };

          $scope.searchSalesFiles = function () {
            if (!$scope.salesFiles) {
              Settings.getSalesFiles().then((salesFiles) => {
                $scope.salesFiles = salesFiles;
              });
            }
          };

          $scope.searchContracts = function (select) {
            Contract.all({ text: select.search, contractType: 'All', autocomplete: true }, (response) => {
              $scope.contracts = response.data.contracts;
            });
          };

          $scope.searchReleases = function (select) {
            Release.all({ text: select.search }, (response) => {
              $scope.releases = response.data.releases;
            });
          };

          $scope.releaseString = function (item) {
            let output = item.title;
            if (item.version) {
              output += ` (${item.version})`;
            }
            if (item.artist) {
              output += ` - ${item.artist}`;
            }
            if (item.catNo) {
              output += ` - ${item.catNo}`;
            }
            if ((!item.format || item.format === '') && item.distributionChannel && item.distributionChannel !== '') {
              output += ` - ${item.distributionChannel}`;
            }
            return output;
          };

          $scope.searchTracks = function (select) {
            Track.all({ text: select.search }, (response) => {
              $scope.tracks = response.data.tracks;
            });
          };

          $scope.trackString = function (item) {
            let output = '';
            if (item.isrc && item.isrc !== '') {
              output += item.isrc;
            }
            if (item.title) {
              output += ` - ${item.title}`;
            }
            if (item.version) {
              output += ` (${item.version})`;
            }
            if (item.artist) {
              output += ` - ${item.artist}`;
            }
            return output;
          };

          $scope.searchWorks = function (select) {
            Work.all({ text: select.search }, (response) => {
              $scope.works = response.data.works;
            });
          };

          $scope.addFilterBlock = function (filters) {
            filters.filterblocks.push({
              filterRows: [{}],
            });
          };

          $scope.addComparisonFilter = function () {
            // Create comparison filters object with copy of default emptyBlocksObject
            $scope.comparisonFilters = angular.copy(emptyBlocksObject);
          };

          $scope.removeComparisonFilter = function () {
            $scope.comparisonFilters = false;
            $scope.comparisonAnalytics = false;
          };

          $scope.showFilters = function (action) {
            action = action || 'close';
            const filtersPanel = element.find('#analyticsFiltersUIToggle');
            const filtersMarker = element.find('.filtersMarker');// parent.document.querySelector('.filtersMarker');

            if (action === 'open') {
              $scope.filtersOpen = true;
              filtersMarker.hide();
              filtersPanel.slideDown(500);
            } else {
              $scope.filtersOpen = false;
              filtersMarker.show();
              filtersPanel.slideUp(500);
            }
            // $window.scrollTo(0, 0);

            // could actually do with long manual switch statement against all options
            // console.log($scope.filters);
            // var firstFilterBlockText = $scope.fieldOptions[]
            // probs need to run through all and break out when found in case of empty rows/block
            // var firstFilterBlock = $scope.filters.filterblocks[0].filterRows[0];//.forEach(function (row, i) {

            // console.log({firstFilterBlock});
            // if (firstFilterBlock && firstFilterBlock.key && firstFilterBlock.values) {
            //   console.log('key',firstFilterBlock.key);
            //   console.log($scope.fieldOptions);
            //   $scope.fieldOptions.forEach(function (option, i) {
            //     if (option.value === firstFilterBlock.key) {
            //       $scope.firstFilterBlockText = option.name + ': ';
            //     }
            //   });

            //   $scope.firstFilterBlockText += firstFilterBlock.values.join(', _ ');

            //   var data = $scope.analytics;
            //   console.log('data[firstFilterBlock.key]');
            //   console.log(data);
            //   console.log(data[firstFilterBlock.key]);

            //   firstFilterBlock.values.forEach(function (option, i) {

            //   });
            //   console.log('$scope.firstFilterBlockText ', $scope.firstFilterBlockText);

            //   //$scope.firstFilterBlockText = $scope.fieldOptions[firstFilterBlock.key].name;
            // } else {
            //   $scope.firstFilterBlockText = '';
            // }
          };

          $scope.getAnalyticsData = function () {
            const loaderErrorMessage = 'Error retrieving analytics data, please try again or contact support';

            const requestObject = {
              filter: buildAnalyticsRequest($scope.filters),
              comparison: buildAnalyticsRequest($scope.comparisonFilters),
              outputs: buildGraphOutputsArray(),
            };

            if ($scope.analyticsConfig && $scope.analyticsConfig.devShowDebug) {
              $scope.viewRequestObjectRawJSON = requestObject;
              // console.log('#### ANALYTICS REQUEST ####');
              // console.log(requestObject);
            }

            Loader.load();
            Report.getAnalytics(requestObject, (response) => {
              if (response.status === 200) {
                if ($scope.analyticsConfig && $scope.analyticsConfig.devShowDebug) {
                  // console.log('#### ANALYTICS DATA ####');
                  // console.log(response.data);
                }

                if (response.data) {
                  if (response.data.analytics) {
                    $scope.analytics = response.data.analytics;
                  }
                  if ($scope.comparisonFilters && response.data.comparison) {
                    $scope.comparisonAnalytics = response.data.comparison;
                  }

                  // prevent runon drilldown - no scroll up!!
                  $scope.showFilters();

                  Loader.success('Analytics Data Successfully Retrieved');
                } else {
                  Loader.error(loaderErrorMessage);
                }
              } else {
                Loader.error(loaderErrorMessage);
              }
            });
          };

          $scope.loadCurrentCatalogue = function (filterblocks) {
            // Test on audiosalad with following:
            // {
            //   key: "releaseIds",
            //   values: [ "5e9eb1d7bd15d65a78a3275d" ]
            // }
            // console.log('filter', filter);

            let releaseIds = [];
            let trackIds = [];
            let workIds = [];
            let contractIds = [];

            if (filterblocks) {
              filterblocks.forEach((block) => {
                block.filterRows.forEach((row) => {
                  if (row.key && row.values) {
                    if (row.key === 'releaseIds') {
                      releaseIds = releaseIds.concat(row.values);
                    } else if (row.key === 'trackIds') {
                      trackIds = trackIds.concat(row.values);
                    } else if (row.key === 'workIds') {
                      workIds = workIds.concat(row.values);
                    } else if (row.key === 'contractIds') {
                      contractIds = contractIds.concat(row.values);
                    }
                  }
                });
              });

              if (releaseIds.length > 0) {
                Release.all({ ids: releaseIds, limit: releaseIds.length }, (response) => {
                  $scope.releases = response.data.releases;
                  // console.log('$scope.releases', $scope.releases);
                });
              }
              if (trackIds.length > 0) {
                Track.all({ ids: trackIds, limit: trackIds.length }, (response) => {
                  $scope.tracks = response.data.tracks;
                  // console.log('$scope.tracks', $scope.tracks);
                });
              }
              if (workIds.length > 0) {
                Work.all({ ids: workIds, limit: workIds.length }, (response) => {
                  $scope.works = response.data.works;
                  // console.log('$scope.works', $scope.works);
                });
              }

              if (contractIds.length > 0) {
                Contract.all({ ids: contractIds, limit: contractIds.length, contractType: 'All' }, (response) => {
                  $scope.contracts = response.data.contracts;
                });
              }
            }
          };

          function initialiseFilters() {
            let filter;
            const hasFilter = $scope.prePopulateFilters && $scope.prePopulateFilters.filterblocks && Array.isArray($scope.prePopulateFilters.filterblocks);
            const hasComparison = $scope.prePopulateComparisonFilters && $scope.prePopulateComparisonFilters.filterblocks && Array.isArray($scope.prePopulateComparisonFilters.filterblocks);

            // Create filters object with a copy of either prePopulateFilters or default emptyBlocksObject
            // If we have catalogue Ids present then load relevant catalogue items
            if (hasFilter) {
              filter = $scope.prePopulateFilters;
              const filterBlocks = filter.filterblocks;
              const filterComparisonBlocks = (hasComparison) ? $scope.prePopulateComparisonFilters.filterblocks : [];
              $scope.loadCurrentCatalogue(filterBlocks.concat(filterComparisonBlocks));
            } else {
              filter = angular.copy(emptyBlocksObject);// JSON.parse(JSON.stringify(emptyBlocksObject));
            }

            if (hasComparison) {
              // if comparison passed correctly then assign this to current $scope
              $scope.comparisonFilters = $scope.prePopulateComparisonFilters;
            }
            return filter;
          }

          function initFieldOptions(clientType, payeeId, filterParams) {
            // Field options set the available options for filter row property selection
            // They must each have 4 properties : value, name, type & unused
            // value & name set the dropdown options
            // unused is used to prevent duplicate selections within blocks
            // type: multi|single is necessary in order to set the values for graph drill down functionality
            let fieldOptions = [];
            if (filterParams) {
              fieldOptions = filterParams;
            } else {
              fieldOptions = [
                { value: 'contractIds', name: 'Contracts', type: 'multi' },
                { value: 'periodIds', name: 'Periods', type: 'multi' },
                { value: 'distributionChannels', name: 'Distribution Channels', type: 'multi' },
                { value: 'configurations', name: 'Configurations', type: 'multi' },
                { value: 'territories', name: 'Territories', type: 'multi' },
                { value: 'sources', name: 'Sources', type: 'single' },
                { value: 'subSources', name: 'Sub Sources', type: 'single' },
                { value: 'transactionDate', name: 'Transaction Date In Last...', type: 'single' }, // no drilldown: type not relevant
                { value: 'saleDateStart', name: 'Sale Date Start', type: 'single' }, // no drilldown: type not relevant
                { value: 'saleDateEnd', name: 'Sale Date End', type: 'single' }, // no drilldown: type not relevant
                { value: 'transactionDateStart', name: 'Transaction Date Start', type: 'single' }, // no drilldown: type not relevant
                { value: 'transactionDateEnd', name: 'Transaction Date End', type: 'single' }, // no drilldown: type not relevant
                { value: 'calculationTypes', name: 'Calculation Type', type: 'multi' },
                { value: 'projectId', name: 'Project ID', type: 'single' },
                { value: 'targetPeriod', name: 'Target Period', type: 'single' },
              ];

              const fieldOptionsNotPayee = [
                { value: 'companies', name: 'Companies', type: 'multi' },
                { value: 'salesFileIds', name: 'Sales Files', type: 'array' },
                { value: 'contractCategories', name: 'Contract Categories', type: 'multi' },
                { value: 'catalogueGroups', name: 'Catalogue Groups', type: 'multi' },
                { value: 'saleDate', name: 'Sale Date In Last...', type: 'single' }, // no drilldown: type not relevant
              ];

              const fieldOptionsPublisher = [
                { value: 'workIds', name: 'Works', type: 'multi' },
                { value: 'catalogueWorkForeignId', name: 'Work Foreign ID', type: 'single' },
                { value: 'foreignId', name: 'Income File Foreign ID', type: 'single' },
              ];

              const fieldOptionsLabel = [
                { value: 'trackIds', name: 'Tracks', type: 'multi' },
                { value: 'catType', name: 'Cat Type', type: 'single' },
                { value: 'priceCategories', name: 'Price Categories', type: 'multi' },
                { value: 'releaseIds', name: 'Releases', type: 'multi' },
                { value: 'releaseDateStart', name: 'Release Date Start', type: 'single' }, // no drilldown: type not relevant
                { value: 'releaseDateEnd', name: 'Release Date End', type: 'single' }, // no drilldown: type not relevant
                { value: 'trackLabel', name: 'Track Label', type: 'single' },
                { value: 'catalogueReleaseForeignId', name: 'Release Foreign ID', type: 'single' },
                { value: 'catalogueTrackForeignId', name: 'Track Foreign ID', type: 'single' },
                { value: 'foreignId', name: 'Sales File Foreign ID', type: 'single' },
              ];

              if (!payeeId) {
                // if !payeeId - Add Sales File, Release Label, Sale Date In Last
                fieldOptions = fieldOptions.concat(fieldOptionsNotPayee);
                if ($scope.dataset === 'Costs Input') {
                  const salesFileIndex = fieldOptions.findIndex((i) => i.value === 'salesFileIds');
                  fieldOptions.splice(salesFileIndex, 1);
                }
              }

              if (clientType === 'Publisher') {
                fieldOptions = fieldOptions.concat(fieldOptionsPublisher);
              } else {
                fieldOptions = fieldOptions.concat(fieldOptionsLabel);
                if (!payeeId) {
                  fieldOptions.push({ value: 'releaseLabel', name: 'Release Label', type: 'single' });
                }
              }
            }
            let autoHideOptions = [];
            if ($scope.analyticsConfig) {
              if ($scope.analyticsConfig.hideFieldOptions && Array.isArray($scope.analyticsConfig.hideFieldOptions)) {
                autoHideOptions = $scope.analyticsConfig.hideFieldOptions;
              }
              if ($scope.analyticsConfig.baseFilter && $scope.analyticsConfig.baseFilter.key) {
                autoHideOptions.push($scope.analyticsConfig.baseFilter.key);
              }
            }

            // Set all options as unused except where we use analyticsConfig.baseFilter (prevent duplicate selection within block)
            fieldOptions.forEach((option) => {
              option.unused = true;
              if (autoHideOptions && autoHideOptions.indexOf(option.value) !== -1) {
                option.unused = false;
              }

              if (option.value === 'calculationTypes' && $scope.dataset !== 'Sales Output') {
                option.forceShowField = false;
              } else {
                option.forceShowField = true;
              }
            });

            // Return the sorted array - could use orderBy in ui-select filters but its here for now
            return fieldOptions.sort((a, b) => {
              if (a.name < b.name) {
                return -1;
              } if (a.name > b.name) {
                return 1;
              }
              return 0;
            });
          }

          function initGraphOptions(clientType) {
            const graphOptions = [
              { value: 'distributionChannels', name: 'Distribution Channels', selected: true },
              { value: 'configurations', name: 'Configurations', selected: true },
              { value: 'territories', name: 'Territories', selected: true },
              { value: 'sources', name: 'Sources', selected: true },
              { value: 'subSources', name: 'Sub Sources', selected: true },
              { value: 'catalogue', name: 'Top Catalogue', selected: true },
              { value: 'revenueOverTime', name: 'Revenues over time', selected: true },
            ];
            if (clientType !== 'Publisher') {
              graphOptions.push({ value: 'costs', name: 'Costs', selected: true });
              graphOptions.push({ value: 'topArtists', name: 'Top Artists', selected: false });
              graphOptions.push({ value: 'topLabels', name: 'Top Labels', selected: false });
            }
            // optional graphs default to not selected
            graphOptions.push({ value: 'averageStreamRates', name: 'Average Rates', selected: false });
            graphOptions.push({ value: 'contractBreakdown', name: 'Contract Breakdown', selected: false });

            const { analyticsConfig } = $scope;
            if (analyticsConfig && analyticsConfig.hideChartOptions && Array.isArray(analyticsConfig.hideChartOptions)) {
              graphOptions.forEach((option, i) => {
                if (analyticsConfig.hideChartOptions.indexOf(option.value) !== -1) {
                  delete graphOptions[i];
                  // console.log('hide graph option', option.value);
                }
              });
              // console.log(graphOptions);
            }

            return graphOptions;
          }

          function buildGraphOutputsArray() {
            return $scope.graphOptions.filter((option) => option.selected).map((option) => option.value);
          }

          function buildAnalyticsRequest(filter) {
            // REQUIRED Output
            // {
            //   filter: [
            //     { // Filter 1
            //       releaseIds: ["123", "321"],
            //       distributionChannels: ["a", "b"]
            //     }
            //   ],
            //   comparison: [], // Same as filter
            //   outputs: [“configuaration”, “source"]
            // }
            let requestFilter = false;

            if (filter && filter.filterblocks) {
              requestFilter = [];

              filter.filterblocks.forEach((block) => {
                const blockFilter = {};
                if (block.includeTracksWithRelease) { blockFilter.includeTracksWithRelease = true; }
                block.filterRows.forEach((row) => {
                  if (row.key && row.values) {
                    // Add row to the filter - create property or extend if exists
                    // for saleDate & transactionDate number and period combos we need to map the data
                    if (row.key === 'saleDate' || row.key === 'transactionDate') {
                      // Only add to filter when both number and period have been entered
                      if (row.option) {
                        // Add both number and period to the filter
                        const keyIdentifier = (row.key === 'saleDate') ? 'sale' : 'transaction';
                        blockFilter[`${keyIdentifier}DateNumber`] = row.values;
                        blockFilter[`${keyIdentifier}DatePeriod`] = row.option;
                      }
                    } else {
                      // Now duplicates are prevented in the UI this is not necessary but leaving as a fallback
                      // eslint-disable-next-line no-lonely-if
                      if (blockFilter[row.key]) {
                        if (Array.isArray(row.values)) {
                          blockFilter[row.key] = blockFilter[row.key].concat(row.values);
                        } else {
                          blockFilter[row.key] = `${blockFilter[row.key]},${row.values}`;
                        }
                      } else {
                        blockFilter[row.key] = row.values;
                      }
                    }
                  }
                });

                // Check for location specific override filter ie trackIds, releaseIds etc
                if ($scope.analyticsConfig && $scope.analyticsConfig.baseFilter) {
                  const populateKey = $scope.analyticsConfig.baseFilter.key;
                  const populateVal = $scope.analyticsConfig.baseFilter.value;
                  const populateOption = $scope.analyticsConfig.baseFilter.option;

                  // actually this shouldn't be necessary as the unused flag will prevent a push being needed
                  // do want to check any passed prePopulateFilters don't include analyticsConfig.baseFilter.key and if they do then remove that
                  if (populateKey && populateVal) {
                    if (blockFilter[populateKey] && Array.isArray(blockFilter[populateKey])) {
                      blockFilter[populateKey].push(populateVal);
                    } else {
                      blockFilter[populateKey] = [populateVal];
                    }
                    if (populateOption) {
                      blockFilter.includeTracksWithRelease = true;
                    }
                  }
                }

                // If block has filters set then add to main filters object
                if (Object.keys(blockFilter).length) {
                  requestFilter.push(blockFilter);
                }
              });
            }
            return requestFilter;
          }

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        },
      };
    }]);
