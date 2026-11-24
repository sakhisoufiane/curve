angular.module('Curve')
  .controller('salesImportController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Notification', 'TerritoriesWithoutContinents', 'Settings', 'Upload', 'SalesFile', 'SalesTemplate', 'Currencies', 'Loader', 'TemplateFields', 'TemplateTypes', 'Uploader',
    function ($rootScope, $scope, $routeParams, $window, Session, Notification, TerritoriesWithoutContinents, Settings, Upload, SalesFile, SalesTemplate, Currencies, Loader, TemplateFields, TemplateTypes, Uploader) {
      const controller = this;
      $scope.clientType = Session.clientType;
      $scope.salesImport = false;
      $scope.saleDatePopup = false;
      $scope.transactionDatePopup = false;
      const territoriesWithoutContinentsPlusWorld = [{ code: 'WW', name: 'World', continent: 'World' }, ...TerritoriesWithoutContinents];
      $scope.territories = territoriesWithoutContinentsPlusWorld;
      $scope.currencies = Currencies;
      if (Session.clientCurrencies) {
        $scope.clientCurrencies = Session.clientCurrencies;
      }
      $scope.salesFile = { overwriteFields: {}, overwriteFieldTargetCells: [] };
      $scope.targetCellFields = TemplateFields.targetCellFields;
      $scope.targetCellTypes = TemplateTypes;
      $scope.data = [];
      $scope.array = [];
      $scope.exampleTableHeaders = [];
      $scope.exampleTableBody = [];
      // $scope.salesColumnName = salesColumnName;
      $scope.templates = [];
      $scope.originalObj = JSON.parse(angular.toJson($scope.salesFile));
      $scope.files = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      // Load Template if ID exists
      if ($routeParams.id) {
        Loader.load();
        init(() => {
          Loader.complete();
        });
      }

      function init(callback) {
        if ($routeParams.id) {
          SalesFile.get($routeParams.id, (response) => {
            if (response.status === 200 && response.data.status === 'Complete') {
              $window.location.href = `#/sales/${$routeParams.id}/ingestion_complete${$scope.originalViewedState === false ? '?isNew=true' : ''}`;
              if (callback) { callback(); }
            } else if (response.status === 200) {
              if ($scope.originalViewedState === undefined) $scope.originalViewedState = response.data.viewed; // set initial viewed state only if it hasn't been set before
              $scope.salesFile = response.data;
              if ($scope.salesFile.overwriteFields && $scope.salesFile.overwriteFields.saleDate) { $scope.salesFile.overwriteFields.saleDate = new Date(response.data.overwriteFields.saleDate); }
              if ($scope.salesFile.overwriteFields && $scope.salesFile.overwriteFields.transactionDate) { $scope.salesFile.overwriteFields.transactionDate = new Date(response.data.overwriteFields.transactionDate); }
              setupExampleTableHeaders();
              setupExampleTableBody();
              if ($scope.salesFile.status === 'Waiting' || $scope.salesFile.status === 'Ingesting' || $scope.salesFile.status === 'Revalidating') { setTimeout(init, 5000); } else if ($scope.salesFile.salesTemplateId) {
                SalesTemplate.get($scope.salesFile.salesTemplateId, (response) => {
                  if (response.status === 200) {
                    $scope.salesTemplate = response.data;
                    updateIncludesFields();
                  }
                });
              } else {
                $scope.salesTemplate = { source: '', fields: [] };
              }
              $scope.originalObj = JSON.parse(angular.toJson($scope.salesFile));
              if (callback) { callback(); }
            } else {
              if (callback) { callback(); }
              Loader.error('Error loading template, please try again or contact support');
            }
          });
        }
      }

      $scope.getSources = function () {
        $scope.sources = [];
        if (Session.clientType === 'Publisher') {
          // @tom Pros is not defined in this file - can this be removed
          // eslint-disable-next-line no-undef
          $scope.sources = Pros.map((pro) => pro);
          $scope.sources.push('Other');
        }
        $scope.templates.forEach((template) => {
          if ($scope.sources.indexOf(template.source) === -1) {
            $scope.sources.push(template.source);
          }
        });
        return $scope.sources;
      };

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
          $scope.getSources();
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

      function setupExampleTableHeaders() {
        $scope.exampleTableHeaders = $scope.salesFile.exampleLines.splice(0, 1);
      }

      function setupExampleTableBody() {
        $scope.exampleTableBody = $scope.salesFile.exampleLines.splice(2, 12);
      }

      $scope.addExchangeRate = function () {
        $scope.salesFile.exchangeRates = $scope.salesFile.exchangeRates || [];
        $scope.salesFile.exchangeRates.push({});
      };

      $scope.deleteExchangeRate = function (exchangeRate) {
        const index = $scope.salesFile.exchangeRates.indexOf(exchangeRate);
        $scope.salesFile.exchangeRates.splice(index, 1);
      };

      $scope.save = function () {
        Loader.load();
        save((response) => {
          $window.location.href = `#/sales/${$scope.salesFile._id}/ingestion_complete`;
          Loader.success('Sales File successfully saved');
        });
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          SalesFile.delete($scope.salesFile._id, (response) => {
            if (response.status === 200) {
              Loader.success('Sales File successfully deleted');
              $window.location.href = '#/sales';
            } else {
              Loader.error(`The Sales File has not been deleted. ${response.data.message}`);
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.salesFile._id) {
          SalesFile.modelHistory($scope.salesFile._id, (response) => {
            if (response.status === 200) {
              $scope.salesFile.modelHistory = response.data.modelHistory;
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

      $scope.ingest = function () {
        validateSetupIngest();
        if (!($scope.salesFile.status === 'Unrecognised' && $scope.setupErrorsIngest && $scope.setupErrorsIngest.length > 0)) {
          Loader.load();
          save(() => {
            if ($scope.files[0]) {
              Uploader.upload($scope.files[0], `/salesFiles/${$scope.salesFile._id}/get_additional_file_upload_credentials`).then(startIngest);
            } else {
              startIngest();
            }
          });
        }
      };
      function startIngest() {
        SalesFile.ingest($scope.salesFile._id, {}, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/sales';
            Loader.success('Sales file ingestion started');
          } else {
            Loader.error('Error kicking off ingestion, please try again or contact support');
          }
        });
      }

      function validateSetupIngest() {
        $scope.setupErrorsIngest = [];
        if (!$scope.salesFile.salesTemplateId) { $scope.setupErrorsIngest.push('Sales File is required to have a template'); }
        if ($scope.salesFile.salesAccountName === 'Apple' && !$scope.files[0]) { $scope.setupErrorsIngest.push('Finance File is required for Apple Sales Files'); }

        // Validate overwrite field target cells
        const incompleteTargetCells = $scope.salesFile.overwriteFieldTargetCells?.filter((cell) => cell && (!cell.field || !cell.cell || !cell.type));
        if (incompleteTargetCells && incompleteTargetCells.length > 0) {
          $scope.setupErrorsIngest.push('All Overwrite Field Target Cells must have Field, Cell Reference, and Type filled out');
        }
      }

      $scope.createTemplate = function () {
        validateSetup();
        if ($scope.setupErrors && $scope.setupErrors.length === 0) {
          Loader.load();
          $scope.salesTemplate.file = $scope.salesFile.file;
          SalesTemplate.create($scope.salesTemplate, (response) => {
            if (response.status === 200) {
              const saleFileUpdates = {
                salesTemplateId: response.data._id,
                status: 'Setup',
              };
              SalesFile.update($scope.salesFile._id, saleFileUpdates, (response) => {
                if (response.status === 200) {
                  $('#createModal').modal('hide');
                  $window.location.href = `#/templates/${response.data.salesTemplateId}/edit?salesFileId=${$scope.salesFile._id}`;
                  Loader.success('Sales template successfully created');
                } else {
                  Loader.error('Error saving sales file');
                }
              });
            } else {
              Loader.error('Error creating template');
            }
          });
        }
      };

      $scope.editTemplate = function () {
        $window.location.href = `#/templates/${$scope.salesFile.salesTemplateId}/edit?salesFileId=${$scope.salesFile._id}`;
      };

      function save(callback) {
        Loader.load();
        if ($scope.salesFile.lines > 0) {
          $scope.salesFile.status = 'Complete';
          // Remove catalogue values for saving - is too much data
          delete $scope.salesFile.invalidFields.releases;
          delete $scope.salesFile.invalidFields.tracks;
          delete $scope.salesFile.invalidFields.works;
          delete $scope.salesFile.usedReleaseIds;
          delete $scope.salesFile.usedTrackIds;
          delete $scope.salesFile.usedWorkIds;
        }
        if (!$scope.salesFile._id) {
          SalesFile.create($scope.salesFile, (response) => {
            callback(response);
          });
        } else {
          SalesFile.update($scope.salesFile._id, $scope.salesFile, (response) => {
            callback(response);
          });
        }
      }

      $scope.getSources = function () {
        $scope.sources = [];
        // What is this: ??
        // eslint-disable-next-line no-restricted-syntax, no-labels
        next:
        for (let i = 0; i < $scope.templates.length; i += 1) {
          const { source } = $scope.templates[i];
          for (let j = 0; j < $scope.sources.length; j += 1) {
            if ($scope.sources[j].source === source) {
              // eslint-disable-next-line no-labels, no-continue
              continue next;
            }
          }
          $scope.sources.push($scope.templates[i]);
        }
        return $scope.sources;
      };

      $scope.onSelectedTemplate = function (selectedItem) {
        if (selectedItem) {
          $scope.salesFile.salesAccountName = selectedItem.source;
          $scope.salesFile.salesTemplateId = selectedItem._id;
          $scope.selectedTemplate = selectedItem;
          if (selectedItem && selectedItem.overwriteFields) {
            $scope.salesFile.overwriteFields = selectedItem.overwriteFields;
            delete $scope.salesFile.overwriteFields.exchangeRate;
            $scope.salesFile.overwriteFields.saleDate = new Date(selectedItem.overwriteFields.saleDate);
            $scope.salesFile.overwriteFields.transactionDate = new Date(selectedItem.overwriteFields.transactionDate);
          }
          if (selectedItem && selectedItem.overwriteFieldTargetCells) {
            $scope.salesFile.overwriteFieldTargetCells = selectedItem.overwriteFieldTargetCells;
          }
          $scope.templateId = selectedItem._id;
        } else {
          $scope.selectedTemplate = {};
          $scope.salesFile.salesTemplateId = '';
        }
        return $scope.selectedTemplate;
      };

      Settings.getActiveTemplates()
        .then((templates) => {
          $scope.templates = templates;
          $scope.getSources();
        });

      // Overwrite Field Target Cells
      $scope.$watch('salesFile.overwriteFieldTargetCells', (newField, oldField) => {
        if ($scope.salesFile) {
          for (let i = 0; i < newField.length; i += 1) {
            // Fix any null values
            if (newField[i] === null) { newField[i] = { field: null, type: null }; }
            // Set any values
            if (newField[i] && oldField[i] && newField[i].field !== oldField[i].field) {
              if (['source', 'subSource', 'originalDistributionChannel', 'originalConfiguration', 'originalPriceCategory', 'originalCurrency', 'originalTerritory'].indexOf(newField[i].field) !== -1) {
                $scope.salesFile.overwriteFieldTargetCells[i].type = 'String';
              } else if (['saleDate', 'transactionDate'].indexOf(newField[i].field) !== -1) {
                $scope.salesFile.overwriteFieldTargetCells[i].type = 'Date';
              } else if (['multiplier', 'proRataAmount'].indexOf(newField[i].field) !== -1) {
                $scope.salesFile.overwriteFieldTargetCells[i].type = 'Number';
              }
            }
          }
        }
        updateIncludesFields();
      }, true);
      $scope.addTargetCell = function () {
        $scope.salesFile.overwriteFieldTargetCells.push({});
      };
      $scope.deleteTargetCell = function (targetCell) {
        const index = $scope.salesFile.overwriteFieldTargetCells.indexOf(targetCell);
        $scope.salesFile.overwriteFieldTargetCells.splice(index, 1);
      };

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
        let fields = [];
        if ($scope.salesTemplate && $scope.salesTemplate.fields) {
          fields = $scope.salesTemplate.fields.map((val) => (val ? val.field : null));
        }
        const value = ($scope.salesFile.overwriteFields) ? $scope.salesFile.overwriteFields[field] : '';
        const matchedTargetCells = $scope.salesFile.overwriteFieldTargetCells.filter((targetCell) => {
          if (targetCell.field && targetCell.field === field && targetCell.cell) return true;
        });
        if (field && fields.indexOf(field) !== -1) {
          return true;
        } if (matchedTargetCells.length > 0 || value) {
          return true;
        }
        return false;
      }

      function validateSetup() {
        $scope.setupErrors = [];
        if (!$scope.salesTemplate.name) { $scope.setupErrors.push('name'); }
        if (!$scope.salesTemplate.source) { $scope.setupErrors.push('source'); }
        if (!$scope.salesTemplate.tab) { $scope.setupErrors.push('tab'); }
        if (!$scope.salesTemplate.headerRow) { $scope.setupErrors.push('headerRow'); }
        if (!$scope.salesTemplate.startingLine) { $scope.setupErrors.push('startingLine'); }
      }

      $scope.$watch('salesFile.overwriteFields', updateIncludesFields, true);
      $scope.$watch('salesFile.fields', updateIncludesFields, true);
    },
  ]);
