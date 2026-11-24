angular.module('Curve')
  .controller('salesTemplateEditController', ['$rootScope', '$scope', '$location', '$routeParams', '$timeout', '$window', 'Session', 'SalesTemplate', 'Notification', 'Settings', 'TerritoriesWithoutContinents', 'Currencies', 'Uploader', 'TemplateFields', 'TemplateTypes', 'Loader', 'Pros', 'SalesFile',
    function ($rootScope, $scope, $location, $routeParams, $timeout, $window, Session, SalesTemplate, Notification, Settings, TerritoriesWithoutContinents, Currencies, Uploader, TemplateFields, TemplateTypes, Loader, Pros, SalesFile) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.userRole = Session.userType;
      $scope.internalUser = Session.internal;
      $scope.clientType = Session.clientType;
      $scope.features = $rootScope.features;
      $scope.showPublisherMapping = $scope.features?.enhancedParticipationRates && Session.clientType === 'Publisher';
      $scope.templateFields = Session.clientType === 'Publisher' ? TemplateFields.publishing : TemplateFields.recordings;
      $scope.templateTypes = TemplateTypes;
      $scope.targetCellFields = TemplateFields.targetCellFields;
      $scope.targetCellTypes = TemplateTypes;
      $scope.salesTemplate = { fileType: 'Standard', overwriteFields: {}, territories: [], distributionChannels: [], configurations: [], priceCategories: [], positiveNegatives: [], subSources: [], overwriteFieldTargetCells: [], ignoreMainIdentifiers: true, enablePublisherMapping: false };
      $scope.salesTemplate.fields = [];
      $scope.salesTemplate.exampleLines = [];
      $scope.saleDatePopup = false;
      $scope.transactionDatePopup = false;
      const territoriesWithoutContinentsPlusWorld = [{ code: 'WW', name: 'World', continent: 'World' }, ...TerritoriesWithoutContinents];
      $scope.territories = territoriesWithoutContinentsPlusWorld;
      $scope.currencies = Currencies;
      $scope.pros = Pros;
      $scope.encodings = [{ name: 'UTF-8', encoding: 'utf8' }, { name: 'UTF-16', encoding: 'utf16le' }];
      $scope.sourcesInput = 'Select';
      $scope.salesFileId = $routeParams.salesFileId;

      $scope.contractIdentifierWarning = false;
      $scope.$watch('salesTemplate.fields', (fields) => {
        const isContractIdentifier = fields.some((key) => key.field === 'contractIdentifier');
        $scope.contractIdentifierWarning = isContractIdentifier;
      });

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.$watch(() => Session.clientType, (newVal) => {
        if (newVal) {
          $scope.clientType = newVal;
        }
        updateTemplateFields();
      });

      $rootScope.$watch('features', (newVal) => {
        $scope.features = newVal;
        $scope.showPublisherMapping = $scope.features?.enhancedParticipationRates && $scope.clientType === 'Publisher';
        updateTemplateFields();
      });

      $rootScope.$watch('paymentTier', removeFieldsForLiteClients);
      removeFieldsForLiteClients();

      if ($scope.pros.indexOf('Other') === -1) { $scope.pros.push('Other'); }
      if (Session.clientType === 'Publisher') {
        $scope.fileTypes = [{ name: 'Standard', display: 'Excel/CSV Structured' }, { name: 'Character', display: 'PRO' }, { name: 'CRD', display: 'CRD' }];
      } else {
        $scope.fileTypes = [{ name: 'Standard', display: 'Excel/CSV' }, { name: 'Apple Music', display: 'Apple Music' }, { name: 'iTunes', display: 'iTunes' }, { name: 'iTunes Match', display: 'iTunes Match' }, { name: 'Beats', display: 'Beats' }, { name: 'Apple DJ', display: 'Apple DJ' }, { name: 'Facebook', display: 'Facebook' }];
      }
      $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));

      this.loadTemplate = function () {
        Loader.load();
        SalesTemplate.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.salesTemplate = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
            // Defer until after digest cycle processes watchers triggered by salesTemplate assignment
            $timeout(() => updateTemplateFields());
            // Let page load before loading example line mapping
            Loader.complete();
          } else {
            Loader.error('Error loading template, please try again or contact support');
          }
        });
      };

      // Load Template if ID exists
      if ($routeParams.id) {
        controller.loadTemplate();
      } else if (SalesTemplate.copiedSalesTemplate) {
        delete SalesTemplate.copiedSalesTemplate._id;
        delete SalesTemplate.copiedSalesTemplate.createdAt;
        delete SalesTemplate.copiedSalesTemplate.UpdatedAt;
        // Remove any identifiers on the template copy to prevent auto matching on the new template the same as the old template
        delete SalesTemplate.copiedSalesTemplate.identification;
        delete SalesTemplate.copiedSalesTemplate.file;

        if (SalesTemplate.copiedSalesTemplate.name) {
          SalesTemplate.copiedSalesTemplate.name += ' - Copy';
        }
        $scope.salesTemplate = SalesTemplate.copiedSalesTemplate;
        delete SalesTemplate.copiedSalesTemplate;
        $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
      }

      $scope.copy = function () {
        SalesTemplate.copiedSalesTemplate = $scope.salesTemplate;
        $window.location.href = '#/templates/new';
      };

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
          $scope.distributionChannels.unshift('');
          $scope.configurations.unshift('');
          $scope.priceCategories.unshift('');
          // Remove All Values
          $scope.distributionChannels = JSON.parse(JSON.stringify($scope.distributionChannels));
          $scope.distributionChannels.splice($scope.distributionChannels.indexOf('All'), 1);

          $scope.configurations = JSON.parse(JSON.stringify($scope.configurations));
          $scope.configurations.splice($scope.configurations.indexOf('All'), 1);

          $scope.priceCategories = JSON.parse(JSON.stringify($scope.priceCategories));
          $scope.priceCategories.splice($scope.priceCategories.indexOf('All'), 1);
        });

      $scope.groupFind = function (territory) {
        return territory.continent;
      };
      $scope.openSaleDatePopup = function () {
        $scope.saleDatePopup = true;
      };
      $scope.openTransactionDatePopup = function () {
        $scope.transactionDatePopup = true;
      };

      $scope.$watch('salesTemplate.source', (source) => {
        if (source === 'Other' && $scope.sourcesInput === 'Select') {
          $scope.sourcesInput = 'Text';
          $scope.salesTemplate.source = '';
        } else if ($scope.salesTemplate.source && !$scope.pros.includes($scope.salesTemplate.source)) {
          $scope.sourcesInput = 'Text';
        }
      });

      $scope.$watch('salesTemplate.overwriteFieldTargetCells', (newField, oldField) => {
        if ($scope.salesTemplate) {
          for (let i = 0; i < newField.length; i += 1) {
            // Fix any null values
            if (newField[i] === null) { newField[i] = { field: null, type: null }; }
            // Set any values
            if (newField[i] && oldField[i] && newField[i].field !== oldField[i].field) {
              if (['source', 'subSource', 'originalDistributionChannel', 'originalConfiguration', 'originalPriceCategory', 'originalCurrency', 'originalTerritory'].indexOf(newField[i].field) !== -1) {
                $scope.salesTemplate.overwriteFieldTargetCells[i].type = 'String';
              } else if (['saleDate', 'transactionDate'].indexOf(newField[i].field) !== -1) {
                $scope.salesTemplate.overwriteFieldTargetCells[i].type = 'Date';
              } else if (['multiplier', 'proRataAmount'].indexOf(newField[i].field) !== -1) {
                $scope.salesTemplate.overwriteFieldTargetCells[i].type = 'Number';
              }
            }
          }
        }
        updateIncludesFields();
      }, true);
      $scope.addTargetCell = function () {
        $scope.salesTemplate.overwriteFieldTargetCells.push({});
      };
      $scope.deleteTargetCell = function (targetCell) {
        const index = $scope.salesTemplate.overwriteFieldTargetCells.indexOf(targetCell);
        $scope.salesTemplate.overwriteFieldTargetCells.splice(index, 1);
      };

      // Calculations
      $scope.dirOptions = {};

      $scope.$watch('salesTemplate.calculation', (calculations) => {
        $scope.displayCalculations = [];
        angular.forEach(calculations, (calculation) => {
          const innerCalculations = calculation.calculation ? calculation.calculation.calculations : [];
          $scope.displayCalculations.push({
            calculationType: calculation.calculationType,
            conditionType: calculation.conditionType,
            conditions: calculation.conditions,
            calculation: calculation.calculation,
            calculations: innerCalculations,
            outputField: calculation.outputField,
            notes: calculation.notes,
            dateFormat: calculation.dateFormat,
            calculateAfterMapping: calculation.calculateAfterMapping,
          });
        });
      });
      $scope.addCalculation = function () {
        $scope.displayCalculations.push({ displayOutputFields: [], displayConditions: [] });
      };
      $scope.deleteCalculation = function (calculation) {
        const index = $scope.displayCalculations.indexOf(calculation);
        $scope.displayCalculations.splice(index, 1);
      };

      function updateCalculations(callback) {
        $scope.salesTemplate.calculation = [];
        if ($scope.displayCalculations.length > 0) {
          angular.forEach($scope.displayCalculations, (result) => {
            updateConditions(result, () => {
              updateOutputFields(result, () => {
                $scope.salesTemplate.calculation.push({
                  calculationType: result.calculationType,
                  conditionType: result.conditionType,
                  conditions: result.conditions,
                  calculation: result.calculation,
                  outputField: result.outputField,
                  notes: result.notes,
                  dateFormat: result.dateFormat,
                  calculateAfterMapping: result.calculateAfterMapping,
                });
                if ($scope.salesTemplate.calculation.length === $scope.displayCalculations.length) {
                  if (callback) { callback(); }
                }
              });
            });
          });
        } else if (callback) { callback(); }
      }

      function updateConditions(calculation, callback) {
        if (calculation) {
          calculation.conditions = [];
          if (calculation.displayConditions.length > 0) {
            angular.forEach(calculation.displayConditions, (condition) => {
              calculation.conditions.push({
                inputType: condition.inputType,
                if: condition.if,
                comparison: condition.comparison,
                value: condition.value,
              });
              if (calculation.conditions.length === calculation.displayConditions.length) {
                if (callback) {
                  callback();
                }
              }
            });
          } else if (callback) {
            callback();
          }
        } else {
          callback();
        }
      }

      function updateOutputFields(calculation, callback) {
        if (calculation) {
          calculation.calculation = { valueType: calculation.calculation.valueType, value: calculation.calculation.value, function: 'Equals', calculations: [] };
          if (calculation.displayOutputFields.length > 0) {
            angular.forEach(calculation.displayOutputFields, (outputField) => {
              calculation.calculation.calculations.push({
                function: outputField.function,
                valueType: outputField.valueType,
                value: outputField.value,
              });
              if (calculation.calculation.calculations.length === calculation.displayOutputFields.length) {
                if (callback) {
                  callback();
                }
              }
            });
          } else if (callback) {
            callback();
          }
        } else {
          callback();
        }
      }
      // Mapping Tab
      // Pagination for mappings
      $scope.channelMappingIndex = 0;
      $scope.configurationMappingIndex = 0;
      $scope.territoryMappingIndex = 0;
      $scope.priceCatMappingIndex = 0;
      $scope.sourceMappingIndex = 0;
      $scope.subSourceMappingIndex = 0;
      $scope.currencyMappingIndex = 0;

      $scope.addToIndex = function (index, number) {
        $scope[index] += number;
      };
      $scope.minusFromIndex = function (index, number) {
        $scope[index] -= number;
      };
      $scope.lowestValue = function (a, b) {
        if (a < b) {
          return a;
        }
        return b;
      };

      $scope.numberOfPagesLeft = function (contractTerms, currentIndex) {
        const totalNumberOfPages = Math.ceil(contractTerms.length / 25) - 1;
        const currentPage = Math.round(currentIndex / 25);
        if (currentPage < totalNumberOfPages) {
          return false;
        }
        return true;
      };

      function setStartIndex(array) {
        if (array.length > 25) {
          if (array.length / 25 === Math.floor(array.length / 25)) {
            return 25 * (Math.floor(array.length / 25) - 1);
          }
          return 25 * Math.floor(array.length / 25);
        }
        return 0;
      }

      this.removeTerritoriesAllValues = function () {
        $scope.territories = JSON.parse(JSON.stringify($scope.territories));

        $scope.territories = $scope.territories.map((territory) => (!['All Europe', 'All Africa', 'All Asia', 'All Americas', 'All Oceania'].includes(territory.name) ? territory : null)).filter(Boolean);
      };

      controller.removeTerritoriesAllValues();

      $scope.$watch('salesTemplate.territories', (territories) => {
        $scope.displayTerritories = [];
        angular.forEach(territories, (territory) => {
          $scope.displayTerritories.push({ name: territory.name, map: territory.map });
        });
      });
      $scope.addTerritory = function () {
        $scope.displayTerritories.push('');
        $scope.territoryMappingIndex = setStartIndex($scope.displayTerritories);
        updateTerritories();
      };
      $scope.deleteTerritory = function (territory) {
        const index = $scope.displayTerritories.indexOf(territory);
        $scope.displayTerritories.splice(index, 1);
        if ($scope.territoryMappingIndex === $scope.displayTerritories.length) {
          $scope.territoryMappingIndex = setStartIndex($scope.displayTerritories);
        }
      };

      function updateTerritories(callback) {
        $scope.salesTemplate.territories = [];
        if ($scope.displayTerritories.length > 0) {
          angular.forEach($scope.displayTerritories, (territory) => {
            $scope.salesTemplate.territories.push({ name: territory.name, map: territory.map });
            if ($scope.salesTemplate.territories.length === $scope.displayTerritories.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.distributionChannels', (distributionChannels) => {
        $scope.displayDistributionChannels = [];
        angular.forEach(distributionChannels, (channel) => {
          $scope.displayDistributionChannels.push({ name: channel.name, map: channel.map });
        });
      });
      $scope.addDistributionChannel = function () {
        $scope.displayDistributionChannels.push('');
        $scope.channelMappingIndex = setStartIndex($scope.displayDistributionChannels);
        updateDistributionhannels();
      };
      $scope.deleteDistributionChannel = function (channel) {
        const index = $scope.displayDistributionChannels.indexOf(channel);
        $scope.displayDistributionChannels.splice(index, 1);
        if ($scope.channelMappingIndex === $scope.displayDistributionChannels.length) {
          $scope.channelMappingIndex = setStartIndex($scope.displayDistributionChannels);
        }
      };

      function updateDistributionhannels(callback) {
        $scope.salesTemplate.distributionChannels = [];
        if ($scope.displayDistributionChannels.length > 0) {
          angular.forEach($scope.displayDistributionChannels, (channel) => {
            $scope.salesTemplate.distributionChannels.push({ name: channel.name, map: channel.map });
            if ($scope.salesTemplate.distributionChannels.length === $scope.displayDistributionChannels.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.configurations', (configurations) => {
        $scope.displayConfigurations = [];
        angular.forEach(configurations, (configuration) => {
          $scope.displayConfigurations.push({ name: configuration.name, map: configuration.map });
        });
      });
      $scope.addConfiguration = function () {
        $scope.displayConfigurations.push('');
        $scope.configurationMappingIndex = setStartIndex($scope.displayConfigurations);
        updateConfigurations();
      };
      $scope.deleteConfiguration = function (configuration) {
        const index = $scope.displayConfigurations.indexOf(configuration);
        $scope.displayConfigurations.splice(index, 1);
        if ($scope.configurationMappingIndex === $scope.displayConfigurations.length) {
          $scope.configurationMappingIndex = setStartIndex($scope.displayConfigurations);
        }
      };

      function updateConfigurations(callback) {
        $scope.salesTemplate.configurations = [];
        if ($scope.displayConfigurations.length > 0) {
          angular.forEach($scope.displayConfigurations, (configuration) => {
            $scope.salesTemplate.configurations.push({ name: configuration.name, map: configuration.map });
            if ($scope.salesTemplate.configurations.length === $scope.displayConfigurations.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.sources', (sources) => {
        $scope.displaySources = [];
        angular.forEach(sources, (source) => {
          $scope.displaySources.push({ name: source.name, map: source.map });
        });
      });
      $scope.addSource = function () {
        $scope.displaySources.push('');
        $scope.sourceMappingIndex = setStartIndex($scope.displaySources);
        updateSources();
      };
      $scope.deleteSource = function (source) {
        const index = $scope.displaySources.indexOf(source);
        $scope.displaySources.splice(index, 1);
        if ($scope.sourceMappingIndex === $scope.displaySources.length) {
          $scope.sourceMappingIndex = setStartIndex($scope.displaySources);
        }
      };

      function updateSources(callback) {
        $scope.salesTemplate.sources = [];
        if ($scope.displaySources.length > 0) {
          angular.forEach($scope.displaySources, (source) => {
            $scope.salesTemplate.sources.push({ name: source.name, map: source.map });
            if ($scope.salesTemplate.sources.length === $scope.displaySources.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.subSources', (subSources) => {
        $scope.displaySubSources = [];
        angular.forEach(subSources, (subSource) => {
          $scope.displaySubSources.push({ name: subSource.name, map: subSource.map });
        });
      });
      $scope.addSubSource = function () {
        $scope.displaySubSources.push('');
        $scope.subSourceMappingIndex = setStartIndex($scope.displaySubSources);
        updateSubSources();
      };
      $scope.deleteSubSource = function (subSource) {
        const index = $scope.displaySubSources.indexOf(subSource);
        $scope.displaySubSources.splice(index, 1);
        if ($scope.subSourceMappingIndex === $scope.displaySubSources.length) {
          $scope.subSourceMappingIndex = setStartIndex($scope.displaySubSources);
        }
      };

      function updateSubSources(callback) {
        $scope.salesTemplate.subSources = [];
        if ($scope.displaySubSources.length > 0) {
          angular.forEach($scope.displaySubSources, (subSource) => {
            $scope.salesTemplate.subSources.push({ name: subSource.name, map: subSource.map });
            if ($scope.salesTemplate.subSources.length === $scope.displaySubSources.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.priceCategories', (priceCategories) => {
        $scope.displayPriceCategories = [];
        angular.forEach(priceCategories, (category) => {
          $scope.displayPriceCategories.push({ name: category.name, map: category.map });
        });
      });
      $scope.addPriceCategory = function () {
        $scope.displayPriceCategories.push('');
        $scope.priceCatMappingIndex = setStartIndex($scope.displayPriceCategories);
        updatePriceCategories();
      };
      $scope.deletePriceCategory = function (category) {
        const index = $scope.displayPriceCategories.indexOf(category);
        $scope.displayPriceCategories.splice(index, 1);
        if ($scope.priceCatMappingIndex === $scope.displayPriceCategories.length) {
          $scope.priceCatMappingIndex = setStartIndex($scope.displayPriceCategories);
        }
      };

      function updatePriceCategories(callback) {
        $scope.salesTemplate.priceCategories = [];
        if ($scope.displayPriceCategories.length > 0) {
          angular.forEach($scope.displayPriceCategories, (category) => {
            $scope.salesTemplate.priceCategories.push({ name: category.name, map: category.map });
            if ($scope.salesTemplate.priceCategories.length === $scope.displayPriceCategories.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.currencies', (currencies) => {
        $scope.displayCurrencies = [];
        angular.forEach(currencies, (currency) => {
          $scope.displayCurrencies.push({ name: currency.name, map: currency.map });
        });
      });
      $scope.addCurrency = function () {
        $scope.displayCurrencies.push('');
        $scope.currencyMappingIndex = setStartIndex($scope.displayCurrencies);
        updateCurrencies();
      };
      $scope.deleteCurrency = function (currency) {
        const index = $scope.displayCurrencies.indexOf(currency);
        $scope.displayCurrencies.splice(index, 1);
        if ($scope.currencyMappingIndex === $scope.displayCurrencies.length) {
          $scope.currencyMappingIndex = setStartIndex($scope.displayCurrencies);
        }
      };

      function updateCurrencies(callback) {
        $scope.salesTemplate.currencies = [];
        if ($scope.displayCurrencies.length > 0) {
          angular.forEach($scope.displayCurrencies, (currency) => {
            $scope.salesTemplate.currencies.push({ name: currency.name, map: currency.map });
            if ($scope.salesTemplate.currencies.length === $scope.displayCurrencies.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.copyFields', (copyFields) => {
        $scope.displayCopyFields = [];
        angular.forEach(copyFields, (copyField) => {
          $scope.displayCopyFields.push({ from: copyField.from, to: copyField.to });
        });
      });
      $scope.addCopyField = function () {
        $scope.displayCopyFields.push('');
        updateCopyFields();
      };
      $scope.deleteCopyField = function (copyField) {
        const index = $scope.displayCopyFields.indexOf(copyField);
        $scope.displayCopyFields.splice(index, 1);
      };

      function updateCopyFields(callback) {
        $scope.salesTemplate.copyFields = [];
        if ($scope.displayCopyFields.length > 0) {
          angular.forEach($scope.displayCopyFields, (copyField) => {
            $scope.salesTemplate.copyFields.push({ from: copyField.from, to: copyField.to });
            if ($scope.salesTemplate.copyFields.length === $scope.displayCopyFields.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('salesTemplate.positiveNegatives', (positiveNegatives) => {
        $scope.displayPositiveNegatives = [];
        angular.forEach(positiveNegatives, (category) => {
          $scope.displayPositiveNegatives.push({ name: category.name, map: category.map });
        });
      });
      $scope.addPositiveNegative = function () {
        $scope.displayPositiveNegatives.push('');
        updatePositiveNegatives();
      };
      $scope.deletePositiveNegative = function (category) {
        const index = $scope.displayPositiveNegatives.indexOf(category);
        $scope.displayPositiveNegatives.splice(index, 1);
      };

      function updatePositiveNegatives(callback) {
        $scope.salesTemplate.positiveNegatives = [];
        if ($scope.displayPositiveNegatives.length > 0) {
          angular.forEach($scope.displayPositiveNegatives, (category) => {
            $scope.salesTemplate.positiveNegatives.push({ name: category.name, map: category.map });
            if ($scope.salesTemplate.positiveNegatives.length === $scope.displayPositiveNegatives.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      // Required Fields
      $scope.includesTerritory = false;
      $scope.includesDistributionChannel = false;
      $scope.includesConfiguration = false;
      $scope.includesPriceCategory = false;
      $scope.includesCurrency = false;
      $scope.includesSource = false;
      $scope.includesUnits = false;
      $scope.includesNetAmount = false;
      $scope.includesSaleDate = false;
      $scope.includesTransactionDate = false;

      function updateTemplateFields() {
        $scope.templateFields = $scope.clientType === 'Publisher' ? TemplateFields.publishing : TemplateFields.recordings;
        if ($scope.features?.useAlternativeId) {
          $scope.templateFields = $scope.templateFields.concat([
            { name: 'Alternative ID', value: 'alternativeId' },
            // eslint-disable-next-line no-nested-ternary,no-confusing-arrow
          ]).sort((a, b) => (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0));
        }
        // Only include 'Mapped Publishers' when EPR is enabled and publisher mapping is checked
        // Don't filter until template data is loaded (avoids race with watchers firing before loadTemplate)
        const templateLoaded = $scope.salesTemplate._id || !$routeParams.id;
        if (templateLoaded) {
          const mappedPublishersInUse = $scope.salesTemplate.fields && $scope.salesTemplate.fields.some((f) => f.field === 'mappedPublishers');
          if (!($scope.showPublisherMapping && $scope.salesTemplate.enablePublisherMapping) && !mappedPublishersInUse) {
            $scope.templateFields = $scope.templateFields.filter((f) => f.value !== 'mappedPublishers');
          }
        }
        removeFieldsForLiteClients();
        controller.initializeSelectedFields(); // update selected fields when templateFields change
      }

      $scope.onEnablePublisherMappingChange = function () {
        if (!$scope.salesTemplate.enablePublisherMapping) {
          // Clear any columns that were assigned 'mappedPublishers'
          $scope.salesTemplate.fields.forEach((column) => {
            if (column.field === 'mappedPublishers') {
              column.field = undefined;
              column.type = '';
              delete column.delimiter;
            }
          });
        }
        updateTemplateFields();
      };

      function updateIncludesFields() {
        $scope.includesTerritory = checkFieldsOverwriteOrTargetCell('originalTerritory');
        $scope.includesDistributionChannel = checkFieldsOverwriteOrTargetCell('originalDistributionChannel');
        $scope.includesConfiguration = checkFieldsOverwriteOrTargetCell('originalConfiguration');
        $scope.includesPriceCategory = checkFieldsOverwriteOrTargetCell('originalPriceCategory');
        $scope.includesCurrency = checkFieldsOverwriteOrTargetCell('originalCurrency');
        $scope.includesSource = checkFieldsOverwriteOrTargetCell('source');
        $scope.includesUnits = checkFieldsOverwriteOrTargetCell('units');
        $scope.includesNetAmount = checkFieldsOverwriteOrTargetCell('netAmount');
        $scope.includesSaleDate = checkFieldsOverwriteOrTargetCell('saleDate');
        $scope.includesTransactionDate = checkFieldsOverwriteOrTargetCell('transactionDate');
      }
      function checkFieldsOverwriteOrTargetCell(field) {
        const value = $scope.salesTemplate.overwriteFields ? $scope.salesTemplate.overwriteFields[field] : null;
        const fields = $scope.salesTemplate.fields.map((val) => (val ? val.field : null));
        const matchedTargetCells = $scope.salesTemplate.overwriteFieldTargetCells.filter((targetCell) => {
          if (targetCell.field && targetCell.field === field && targetCell.cell) return true;
        });
        if (field && fields.indexOf(field) !== -1) {
          return true;
        } if (matchedTargetCells.length > 0 || value) {
          return true;
        }
        return false;
      }

      $scope.$watch('salesTemplate.overwriteFields', updateIncludesFields, true);
      $scope.$watch('salesTemplate.fields', updateIncludesFields, true);

      $scope.$watch('salesTemplate.fields', (newField, oldField) => {
        if ($scope.salesTemplate) {
          for (let i = 0; i < newField.length; i += 1) {
            // Fix any null values
            if (newField[i] === null) { newField[i] = { field: null, type: null }; }
            // Set any values
            if (newField[i] && oldField[i] && newField[i].field !== oldField[i].field) {
              if (newField[i].field === 'ignore') {
                $scope.salesTemplate.fields[i].type = 'ignore';
              } else if (['originalDistributionChannel', 'originalConfiguration', 'originalPriceCategory', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'catNo', 'barcode', 'isrc', 'originalWorkTitle', 'originalComposers', 'originalIdentifier', 'originalTerritory', 'source', 'subSource', 'originalCurrency', 'iswc', 'tunecode', 'songCode', 'positiveNegative', 'originalPositiveNegative', 'contractIdentifier', 'party1', 'party2', 'party3', 'party4', 'party5', 'party6', 'party7', 'party8', 'party9', 'production', 'description', 'episode', 'mappedPublishers', 'Temp 1', 'Temp 2', 'Temp 3', 'Temp 4', 'Temp 5'].indexOf(newField[i].field) !== -1) {
                $scope.salesTemplate.fields[i].type = 'String';
              } else if (['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].indexOf(newField[i].field) !== -1) {
                $scope.salesTemplate.fields[i].type = 'Date';
              } else if (['units', 'retailPrice', 'salePrice', 'exchangeRate', 'grossAmount', 'netAmount', 'perUnitRate', 'duration', 'sharePercentage', 'returnGrossAmount', 'returnNetAmount', 'returnUnits', 'mechanicalAtSource', 'discountAmount'].indexOf(newField[i].field) !== -1) {
                $scope.salesTemplate.fields[i].type = 'Number';
              } else {
                $scope.salesTemplate.fields[i].type = '';
              }
            }
          }
          if ($scope.salesTemplate.fileType === 'Character') { textToColumns(); }
        }
      }, true);

      function textToColumns() {
        const columnCharacters = $scope.salesTemplate.fields.map((field) => field.characters);
        $scope.salesTemplate.exampleLines = $scope.salesTemplate.exampleLines.map((line) => {
          line = line.join('').replace(/ /g, '_');
          const output = [];
          columnCharacters.forEach((character) => {
            character = character || 0;
            output.push(line.slice(0, character));
            line = line.substring(character);
          });
          output.push(line);
          return output;
        });
      }

      function upload(file, callback) {
        // only upload the file if it is larger than 50MB or if the file size is unknown
        if (file && (!file.size || file.size < 50000000)) {
          Uploader.upload(file, `/salesTemplates/${$scope.salesTemplate._id}/get_upload_credentials`).then((response) => {
            callback(null, response);
          });
        } else {
          callback('Please upload a smaller version of the file with a small sample of the data (max. 50MB)');
        }
      }

      // Remove fields for Lite clients
      function removeFieldsForLiteClients() {
        if ($rootScope.paymentTier === 'Lite') {
          // filter out contractIdentifier fields as they should not be visible to Lite clients
          $scope.templateFields = $scope.templateFields.filter((templateField) => (templateField.value !== 'contractIdentifier'));
        }
      }

      // Handle Selected Fields
      this.initializeSelectedFields = function () {
        $scope.templateFields = $scope.templateFields.map((templateField) => {
          let selected = false;
          $scope.salesTemplate.fields.map((salesTemplateField) => {
            if (salesTemplateField.field === templateField.value) {
              selected = true;
            }
          });

          templateField.selected = selected;
          return templateField;
        });
      };

      // Run after template load to refresh any used items
      $timeout(() => {
        controller.initializeSelectedFields();
      });

      // Set field to selected = true
      $scope.updateSelectedFields = function (field) {
        controller.initializeSelectedFields();
        if (!field || field === 'contractIdentifier') {
          const isContractIdentifier = $scope.salesTemplate.fields.some((obj) => obj.field === 'contractIdentifier');
          if (isContractIdentifier !== $scope.contractIdentifierWarning) {
            $scope.contractIdentifierWarning = isContractIdentifier;
          }
        }
      };

      $scope.addField = function () {
        $scope.salesTemplate.fields.push({});
      };

      $scope.deleteField = function (field) {
        const index = $scope.salesTemplate.fields.indexOf(field);
        $scope.salesTemplate.fields.splice(index, 1);
      };
      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };
      $scope.selectFile = function (file) {
        $scope.file = file;
      };
      $scope.save = function () {
        Loader.load();
        updateTerritories();
        updatePriceCategories();
        updateCopyFields();
        updateConfigurations();
        updateDistributionhannels();
        updatePositiveNegatives();
        updateSources();
        updateSubSources();
        updateCurrencies();
        validateSetup();
        validateCalculations();
        updateCalculations(() => {
          if ($scope.setupErrors && $scope.setupErrors.length === 0) {
            if (!$scope.salesTemplate._id) {
              SalesTemplate.create($scope.salesTemplate, (response) => {
                if (response.status === 200) {
                  $scope.salesTemplate = response.data;
                  $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
                  if ($scope.file) {
                    upload($scope.file, (err) => {
                      $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
                      if (err) {
                        Loader.error(err);
                      } else {
                        Loader.success('Template successfully created');
                      }
                      $window.location.href = `#/templates/${response.data._id}/edit`;
                    });
                  } else {
                    Loader.success('Template successfully created');
                    $window.location.href = `#/templates/${response.data._id}/edit`;
                  }
                } else {
                  Loader.error('Error creating template, please try again or contact support');
                }
              });
            } else {
              SalesTemplate.update($scope.salesTemplate._id, $scope.salesTemplate, (response) => {
                if (response.status === 200) {
                  if ($scope.file) {
                    upload($scope.file, (err) => {
                      controller.loadTemplate();
                      $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
                      // Remove file upload
                      $('#fileUploadField').val(null);
                      $scope.file = null;
                      if (err) {
                        Loader.error(err);
                      } else {
                        Loader.success('Template successfully saved');
                      }
                    });
                  } else {
                    controller.loadTemplate();
                    $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
                    Loader.success('Template successfully saved');
                  }
                } else {
                  Loader.error('Error saving template, please try again or contact support');
                }
              });
            }
          } else {
            Loader.error('Couldn\'t save your template, as fields were missing');
          }
        });
      };
      $scope.saveAndIngest = function () {
        Loader.load();
        updateTerritories();
        updatePriceCategories();
        updateCopyFields();
        updateConfigurations();
        updateDistributionhannels();
        updatePositiveNegatives();
        updateSources();
        updateSubSources();
        updateCurrencies();
        validateSetup();
        updateCalculations(() => {
          if ($scope.setupErrors && $scope.setupErrors.length === 0) {
            SalesTemplate.update($scope.salesTemplate._id, $scope.salesTemplate, (response) => {
              if (response.status === 200) {
                const salesFile = {
                  salesAccountName: $scope.salesTemplate.source,
                  salesTemplateName: $scope.salesTemplate.name,
                };
                if ($scope.salesTemplate.overwriteFields) {
                  salesFile.overwriteFields = $scope.salesTemplate.overwriteFields;
                  delete salesFile.overwriteFields.exchangeRate;
                  salesFile.overwriteFields.saleDate = new Date($scope.salesTemplate.overwriteFields.saleDate);
                  salesFile.overwriteFields.transactionDate = new Date($scope.salesTemplate.overwriteFields.transactionDate);
                }
                // save sales file
                SalesFile.update($scope.salesFileId, salesFile, (response) => {
                  if (response.status === 200) {
                    // ingest sales file
                    SalesFile.ingest($scope.salesFileId, {}, (response) => {
                      if (response.status === 200) {
                        $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
                        $window.location.href = '#/sales';
                        Loader.success('Template saved and sales file ingestion started');
                      } else {
                        Loader.error('Error kicking off ingestion, please try again or contact support');
                      }
                    });
                  } else {
                    Loader.error('Error saving sales file, please try again or contact support');
                  }
                });
              } else {
                Loader.error('Error saving template, please try again or contact support');
              }
            });
          } else {
            Loader.error('Couldn\'t save your template, as fields were missing');
          }
        });
      };

      $scope.addToLibrary = function () {
        SalesTemplate.addToLibrary($scope.salesTemplate._id, (response) => {
          if (response.status === 200) {
            Loader.success('Template successfully added.');
            $window.location.href = '#/templates';
          } else {
            Loader.error('Error copying template, please try again or contact support');
          }
        });
      };

      $scope.delete = function () {
        $('#deleteModal').modal('hide');
        SalesTemplate.delete($scope.salesTemplate._id, (response) => {
          if (response.status === 200) {
            Loader.success('Template successfully deleted');
            $window.location.href = '#/templates';
          } else if (response.data && response.data.message) {
            Loader.error(response.data.message);
          } else {
            Loader.error('Error deleting template, please try again or contact support');
          }
        });
      };

      $scope.archive = function (templateId, archived) {
        Loader.load();
        SalesTemplate.archiveMany([templateId], archived, (response) => {
          if (response.status === 200) {
            $scope.salesTemplate.archived = archived;
            $scope.originalObj.archived = archived;
            Loader.success('This template has been archived');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.removeIdentifier = function (identifier) {
        const index = $scope.salesTemplate.identification.indexOf(identifier);
        $scope.salesTemplate.identification.splice(index, 1);
      };

      function validateSetup() {
        $scope.setupErrors = [];
        if (!$scope.salesTemplate.name) { $scope.setupErrors.push('Template is required to have a name'); }
        if (!$scope.salesTemplate.source) { $scope.setupErrors.push('Template is required to have a source'); }
        if (!$scope.salesTemplate.tab) { $scope.setupErrors.push('Template is required to have a tab'); }
        if (!$scope.salesTemplate.headerRow) { $scope.setupErrors.push('Template is required to have a header row'); }
        if (!$scope.salesTemplate.startingLine) { $scope.setupErrors.push('Template is required to have a starting row'); }

        // Validate overwrite field target cells
        const incompleteTargetCells = $scope.salesTemplate.overwriteFieldTargetCells?.filter((cell) => cell && (!cell.field || !cell.cell || !cell.type));
        if (incompleteTargetCells && incompleteTargetCells.length > 0) {
          $scope.setupErrors.push('All Overwrite Field Target Cells must have Field, Cell Reference, and Type filled out');
        }

        // Validate Mapped Publishers delimiter
        const mappedPublishersFields = $scope.salesTemplate.fields.filter((f) => f.field === 'mappedPublishers');
        if (mappedPublishersFields.length > 0) {
          const missingDelimiter = mappedPublishersFields.some((f) => !f.delimiter);
          if (missingDelimiter) {
            $scope.setupErrors.push('Please select a delimiter for the Mapped Publishers column');
          }
        }
      }

      function validateCalculations() {
        if (!$scope.salesTemplate?.calculation) return;

        // Check territory mapped values are a valid territory code
        // This check is needed for older templates that may have incorrect values before we added the territory dropdown
        const territoryCalculations = $scope.salesTemplate.calculation.filter((c) => c.outputField === 'territory');
        if (territoryCalculations.length > 0) {
          for (const { calculation } of territoryCalculations) {
            if (calculation.valueType === 'Value') {
              const territoryExists = $scope.territories.some((t) => t.code === calculation.value);
              if (!territoryExists) $scope.setupErrors.push(`Invalid territory calculation: "${calculation.value}" is not an approved territory`);
            }
          }
        }
      }

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const current = JSON.parse(angular.toJson($scope.salesTemplate));
        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.salesTemplate = $scope.originalObj;
          }
        }
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.salesTemplate._id) {
          SalesTemplate.modelHistory($scope.salesTemplate._id, (response) => {
            if (response.status === 200) {
              $scope.salesTemplate.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.salesTemplate));
              $('#modelHistoryModal').modal();
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };
    }]);
