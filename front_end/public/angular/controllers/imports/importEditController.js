angular.module('Curve')
  .controller('importEditController', ['$rootScope', '$scope', '$q', '$routeParams', '$window', '$location', 'Session', 'Import', 'Notification', 'Settings', 'Loader', 'Uploader', 'SelectAll', 'ImportPartner', 'Publisher', 'CwrTerritories', 'TerritoryGroup', 'Pagination', 'Work', '$timeout', 'Pros', 'Society',
    function ($rootScope, $scope, $q, $routeParams, $window, $location, Session, Import, Notification, Settings, Loader, Uploader, SelectAll, ImportPartner, Publisher, CwrTerritories, TerritoryGroup, Pagination, Work, $timeout, Pros, Society) {
      $window.scrollTo(0, 0);
      $scope.catalogueGroups = [];
      $scope.import = {
        clientId: Session.clientId,
        status: 'Setup',
      };
      $scope.pros = Pros;
      $scope.currentStatusIndex = 0;
      $scope.setupErrors = [];
      $scope.filesErrors = [];
      $scope.mappingNames = {
        territories: 'Territories',
        distributionChannels: 'Distribution Channels',
        configurations: 'Configurations',
        priceCategories: 'Price Categories',
        capacities: 'Capacities',
        societies: 'Societies',
        publishingRates: 'Publishing Rates',
      };
      $scope.importPartners = [];

      $scope.files = [];
      $scope.currentlyUploadedFile = '';
      $scope.selectedImportPartner = null;
      $scope.importPartner = {
        defaults: {},
      };
      $scope.workFilter = { text: null, orderBy: 'title', orderDir: 'asc', limit: 25, page: 1 };
      $scope.canRunImport = false;
      $scope.hasUserEditedForm = false;
      $scope.works = [];
      $scope.showAll = false;
      $scope.transferringSystem = $location.search().transferringSystem ?? '';
      $scope.activeTab = 'import';
      $scope.rights = {};
      $scope.headers = [
        {
          link: '/#/works/[id]/edit',
          name: 'title',
          required: true,
          // sortable: true,
          title: 'Title',
        },
        {
          title: 'Composer',
          name: 'composer',
          // sortable: true,
          required: true,
        },
        { title: 'Main identifier', name: 'identifier' },
        { title: 'ISWC', name: 'iswc' },
        {
          title: 'Status',
          name: 'status',
          type: 'status',
          showStatus: true,
          tooltip: 'Work',
        },
      ];
      $scope.catalogueMappingErrors = [];
      $scope.isEdit = !!$routeParams.id;
      $scope.isValuesForMappingSet = () => {
        if (!$routeParams.id || !$scope.import.valuesForMapping || $scope.transferringSystem !== 'Catalogue Shipment') return false;
        return Object.values($scope.import.valuesForMapping).some((mapping) => mapping.length);
      };
      $scope.defaultMappingsApplied = false;
      $scope.partnerMappingsApplied = false;

      // Load Import if ID exists
      if ($routeParams.id) {
        Loader.load();
        init();
      }

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      const getWorks = async (filter) => {
        const response = await Work.allAsync({ 'source.importId': $scope.import._id, ...filter });
        $scope.works = response.data.works;
        $scope.workTotalPages = response.data.meta.totalPages;
        $scope.workCurrentPage = response.data.meta.currentPage;
        if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
          $scope.workTotal = response.data.meta.total;
        }
        $scope.workPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
      };

      function init(callback) {
        if ($routeParams.id) {
          Import.get($routeParams.id, async (response) => {
            if (response.status === 200 && response.data.status === 'Importing') {
              $scope.import = response.data;
              // We only do this if it's the new imports
              if ($routeParams.transferringSystem) {
                $scope.currentlyUploadedFile = getFileNameFromPath(response.data.counterpointFiles?.publishingCatalogueExport);
                $scope.selectedImportPartner = response.data?.importPartnerId || null;
                setImportPartner();
                determineIfUserCanRunImport();
              }
              Loader.complete();
              setTimeout(() => {
                init(callback);
              }, 2000);
            } else if (response.status === 200) {
              $scope.import = response.data;
              // We only do this if it's the new imports
              if ($routeParams.transferringSystem) {
                $scope.currentlyUploadedFile = getFileNameFromPath(response.data.counterpointFiles?.publishingCatalogueExport);
                $scope.selectedImportPartner = response.data?.importPartnerId || null;

                if ($scope.transferringSystem === 'Catalogue Shipment') {
                  $scope.setMappingsFromImportPartner({ ...$scope.import.mappings }, { ...$scope.import.importPartnerId.mappings });
                  $scope.setDefaultMappings({ ...$scope.import.valuesForMapping }, { ...$scope.import.mappings });
                }

                $scope.originalObj = JSON.parse(angular.toJson(response.data));
                setImportPartner();
                determineIfUserCanRunImport();
              }
              Loader.complete();
              if (callback) {
                callback();
              }
              if ($scope.import.status === 'Processing') {
                setTimeout(init, 500);
              }
            } else {
              Loader.error('Error loading import, please try again or contact support');
            }

            // Set the correct tab
            if (Session.importEditActiveTab === 'mappings' && $scope.isValuesForMappingSet()) {
              $scope.activeTab = Session.importEditActiveTab;
            } else {
              $scope.activeTab = 'import';
              Session.importEditActiveTab = $scope.activeTab;
            }

            if ($scope.import.status === 'Complete' && $routeParams.transferringSystem) {
              Loader.load();
              await getWorks($scope.workFilter);
              Loader.complete();
              $scope.$applyAsync();
            }
          });
        }
      }

      // Only used for frontend
      const setImportPartner = async () => {
        $scope.importPartner = {
          defaults: {},
        };

        const importPartner = {
          defaults: {},
        };

        importPartner.defaults = $scope.import.status === 'Complete' ? $scope.import.defaults : $scope.import.importPartnerId.defaults;

        $scope.importPartner.defaults.setMainIdentifier = importPartner.defaults.setMainIdentifier;
        $scope.importPartner.defaults.setPublisherInterestedParty = importPartner.defaults.setPublisherInterestedParty;
        $scope.importPartner.defaults.setComposerInterestedParty = importPartner.defaults.setComposerInterestedParty;
        $scope.importPartner.defaults.ingestionTerritory = importPartner.defaults.ingestionTerritory;

        const totalTerritories = CwrTerritories.ALL.filter(({ code }) => code.length === 2 && code !== 'WW').length;
        if (importPartner.defaults.territoryGroupId) {
          const response = await TerritoryGroup.getAsync(importPartner.defaults.territoryGroupId);
          if (response.status === 200) {
            $scope.importPartner.defaults.territories = response.data.name;
          }
        } else if (importPartner.defaults.territories.length === totalTerritories) {
          $scope.importPartner.defaults.territories = 'World';
        } else if (importPartner.defaults.territories.length) {
          $scope.importPartner.defaults.territories = `specific: ${importPartner.defaults.territories.join(',')}`;
        } else {
          $scope.importPartner.defaults.territories = '';
        }

        if (importPartner?.defaults?.claimingParty?.publisherId) {
          const response = await Publisher.getAsync(importPartner.defaults.claimingParty.publisherId);
          if (response.status === 200) {
            $scope.importPartner.defaults.claimingPartyPublisher = response.data.name;
            $scope.importPartner.defaults.claimingPartyContractType = importPartner.defaults.claimingParty.contractType;
          }
        }
      };

      const getImportPartners = async () => {
        try {
          const response = await ImportPartner.all({ transferringSystem: $scope.transferringSystem });
          if (response.status !== 200) {
            throw new Error(
              'Error retrieving import partners, please try again or contact support',
            );
          }
          $scope.importPartners = response.data.importPartners;
        } catch (e) {
          Loader.error(
            'Error retrieving import partners, please try again or contact support',
          );
        }
      };

      getImportPartners();

      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });

      $scope.validateSetup = function () {
        $scope.setupErrors = [];
        if (!$scope.import.name) {
          $scope.setupErrors.push('Import is required to have a name');
        }
        if (!$scope.import.transferringSystem) {
          $scope.setupErrors.push('Import is required to have a From System');
        }
        if ($scope.setupErrors.length === 0 && $scope.import.transferringSystem === 'CWR') {
          $('#importModal').modal('show');
        }
        if ($scope.import.transferringSystem !== 'CWR') {
          $scope.postValidateSetup(false);
        }
      };

      $scope.postValidateSetup = function (isImportModalOpen) {
        if (isImportModalOpen) {
          $('#importModal').modal('hide');
          $('.modal-backdrop').remove();
        }
        if ($scope.setupErrors.length === 0) {
          $scope.import.setupStage = 'Files';
          save();
        }
      };

      $scope.validateFilesStep = function (form) {
        Loader.load();
        $scope.filesErrors = [];
        if (!form.$valid) {
          $scope.filesErrors.push(`Import is required to have all files uploaded, it remains : ${form.$error.required.length}`);
        } else {
          Import.filesValidation($routeParams.id, (response) => {
            if (response.data && response.data.errors && response.data.errors.length) {
              $scope.filesErrors = [];
              $scope.filesErrors = response.data.errors;
            } else {
              init(() => {
                if ($scope.import.transferringSystem === 'CWR' || $scope.import.transferringSystem === 'Maestro 400 Catalogue Shipment') {
                  $scope.import.setupStage = 'Defaults';
                } else {
                  $scope.import.setupStage = 'Mapping';
                }
                save(() => {
                  Loader.complete();
                });
              });
            }
          });
        }
      };

      $scope.validateMappingStep = function (form) {
        $scope.MappingErrors = [];
        if (!form.$valid) {
          $scope.MappingErrors.push('All fields are required to be filled in');
        }
        if ($scope.import.mappings) {
          Object.keys($scope.import.mappings).forEach((mapping) => {
            const mappedTotal = $scope.import.mappings[mapping] ? Object.values($scope.import.mappings[mapping]).filter((value) => value) : 0;
            if ($scope.import.valuesForMapping[mapping]) {
              const unmapped = $scope.import.valuesForMapping[mapping].length - mappedTotal.length;
              if (unmapped > 0) {
                $scope.MappingErrors.push(`${unmapped} mapping${(unmapped > 1) ? 's' : ''} missing in ${$scope.mappingNames[mapping]}`);
              }
            }
          });
        }
        if ($scope.MappingErrors.length === 0) {
          $scope.import.setupStage = 'Defaults';
          save();
        } else {
          $window.scrollTo(0, 0);
        }
      };

      $scope.changePage = function (page, form) {
        $scope.import.setupStage = page;
        $scope.import.status = 'Setup';
        save(() => {
          if (page === 'Setup') {
            init();
          }
        });
      };

      $scope.ingest = function () {
        Loader.load();
        Import.update($scope.import._id, $scope.import, (response) => {
          Import.startIngestion($routeParams.id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/imports';
              Loader.success('Import is running, you will be alerted once it finishes');
            }
          });
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      function save(callback) {
        if (!$scope.import._id) {
          $scope.import.status = 'Setup';
          Import.create($scope.import, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/imports/${response.data._id}/edit`;
              // Loader.success('Import successfully created');
              if (callback) {
                callback();
              }
            } else {
              Loader.error('Error creating import, please try again or contact support');
              if (callback) {
                callback();
              }
            }
          });
        } else {
          Import.update($scope.import._id, $scope.import, (response) => {
            if (response.status === 200) {
              $scope.import = response.data;
              // Loader.success('Import successfully saved');
              if (callback) {
                callback();
              }
            } else {
              Loader.error('Error saving import, please try again or contact support');
              if (callback) {
                callback();
              }
            }
          });
        }
      }

      $scope.uploadFile = function (file, type) {
        Uploader.upload(file, `/imports/${$scope.import._id}/get_upload_credentials/${type}`).then((response) => {
          if (response.status === 200) {
            Loader.load();
            init();
          } else {
            Loader.error('There was an error in uploading this file. Please try against or contact support');
          }
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.import._id) {
          Import.modelHistory($scope.import._id, (response) => {
            if (response.status === 200) {
              $scope.import.modelHistory = response.data.modelHistory;
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

      const newSave = async () => new Promise((resolve) => {
        const data = { ...$scope.import };
        data.importPartnerId = $scope.selectedImportPartner._id;

        if (!$scope.import._id) {
          data.status = 'Setup';
          Import.create(data, (response) => {
            if (response.status !== 200) {
              Loader.error(
                'Error creating import, please try again or contact support',
              );
              return resolve();
            }
            return resolve(response.data);
          });
        } else {
          Import.update(data._id, data, (response) => {
            if (response.status !== 200) {
              Loader.error(
                'Error saving import, please try again or contact support',
              );
              return resolve();
            }
            return resolve(response.data);
          });
        }
      });

      const getFileNameFromPath = (filePath) => {
        if (!filePath) return '';
        return filePath.split('/').pop();
      };

      const uploadFile = async (importId) => {
        if (!$scope.files.length) return;

        const [file] = $scope.files;
        await Uploader.upload(
          file,
          `/imports/${importId}/get_upload_credentials/publishingCatalogueExport`,
        );
        $scope.currentlyUploadedFile = file.name;

        const response = await Import.filesValidationAsync(importId);
        if (
          response.data
          && response.data.errors
          && response.data.errors.length
        ) {
          $scope.filesErrors = [];
          $scope.filesErrors = response.data.errors;
        }

        $scope.files = [];
      };

      $scope.save = async (fromSystem) => {
        try {
          Loader.load();

          // As soon as we save we disable the flag and let the validation take over
          $scope.defaultMappingsApplied = false;
          $scope.partnerMappingsApplied = false;

          determineIfUserCanRunImport();
          if ($scope.setupErrors.length) {
            Loader.error('There are validation errors');
            return;
          }

          $scope.import.transferringSystem = $scope.transferringSystem;
          const result = await newSave(fromSystem);
          $scope.import = result;
          $scope.originalObj = JSON.parse(angular.toJson($scope.import));

          await Promise.all([
            uploadFile(result._id),
            setImportPartner(),
          ]);

          $scope.files = [];

          if ($scope.isEdit && fromSystem === 'Catalogue Shipment') {
            const importPartner = {
              ...$scope.import.importPartnerId,
              mappings: $scope.import.mappings,
            };

            await ImportPartner.update($scope.selectedImportPartner._id, importPartner);
          }

          if (!$scope.isEdit && $scope.transferringSystem === 'Catalogue Shipment') {
            // We don't use the setTab function because the checks within the function fail since it hasn't got the latest data yet
            Session.importEditActiveTab = 'mappings';
            $location.path(`/imports/${result._id}/edit`).search({ transferringSystem: fromSystem });
            Loader.success('Import successfully saved');
            $scope.$applyAsync();
          } else if (!$scope.isEdit) {
            Loader.success('Import successfully saved');
            $location.path(`/imports/${result._id}/edit`).search({ transferringSystem: fromSystem });
          } else {
            Loader.success('Import successfully saved');
            $scope.$applyAsync();
          }
        } catch (e) {
          Loader.error('There are was an error saving the import');
        }
      };

      $scope.runImport = async () => {
        Import.startIngestion($routeParams.id, (response) => {
          if (response.status === 200) {
            $location.path('/imports').search({ transferringSystem: $scope.transferringSystem });
            Loader.success('Import is running, you will be alerted once it finishes');
          }
        });
      };

      const determineIfUserCanRunImport = () => {
        if ($scope.import.status !== 'Setup') {
          $scope.canRunImport = false;
          return;
        }

        $scope.setupErrors = [];
        $scope.canRunImport = false;

        if (!$scope.import.name) {
          $scope.setupErrors.push('Import is required to have a name');
        }

        if (!$scope.selectedImportPartner) {
          $scope.setupErrors.push('Import partner is required');
        }

        if (!$scope.import?.counterpointFiles?.publishingCatalogueExport && !$scope.files.length) {
          $scope.setupErrors.push('At least one file is required');
        }

        let canRun = false;
        if (!$scope.setupErrors.length) canRun = true;

        $scope.hasUserEditedForm = false;
        $scope.canRunImport = canRun && $scope.transferringSystem !== 'Catalogue Shipment';

        if ($scope.transferringSystem !== 'Catalogue Shipment' || !$scope.isEdit) return;

        $scope.catalogueMappingErrors = validateCatalogueShipmentMappings();
        if (!$scope.catalogueMappingErrors.length && !$scope.defaultMappingsApplied && !$scope.partnerMappingsApplied) $scope.canRunImport = true;
      };

      $scope.workChangePage = async (page) => {
        Loader.load();
        $scope.workFilter.page = page;
        await getWorks($scope.workFilter);
        Loader.complete();
        $scope.$applyAsync();
      };

      $scope.toggleShowAll = function () {
        $scope.$applyAsync(() => {
          $scope.showAll = !$scope.showAll;
        });
      };

      $scope.setTab = function (value) {
        if (value === 'mappings') {
          if (!$scope.isValuesForMappingSet() || $scope.hasUserEditedForm) return;
        }
        $scope.activeTab = value;
        Session.importEditActiveTab = $scope.activeTab;
      };

      const validateCatalogueShipmentMappings = () => {
        const errors = [];
        Object.keys($scope.import.valuesForMapping).forEach((mapping) => {
          const requiredValues = $scope.import.valuesForMapping[mapping];
          if (!requiredValues.length) return;

          const values = $scope.import.mappings[mapping] ? $scope.import?.mappings[mapping] : null;
          if (!values) {
            errors.push(`${requiredValues.length} mappings missing in ${mapping}`);
            return;
          }

          const mappedValueKeys = Object.keys(values).filter((key) => requiredValues.includes(key) && values[key]);
          const totalNumberOfValues = mappedValueKeys.length ?? 0;
          const missingTotal = requiredValues.length - totalNumberOfValues;

          if (missingTotal <= 0) return;

          errors.push(`${missingTotal} mappings missing in ${mapping}`);
        });
        return errors;
      };

      $scope.removeMapping = (type, key) => {
        delete $scope.import.mappings[type][key];
      };

      const capacities = [
        { name: 'Admin', code: 'AM' },
        { name: 'Original Publisher', code: 'E' },
        { name: 'Original Publisher', code: 'OP' },
        { name: 'Sub Publisher', code: 'SP' },
        { name: 'Sub Publisher', code: 'SE' },
        { name: 'Lyrics', code: 'A' },
        { name: 'Music', code: 'C' },
        { name: 'Lyrics and Music', code: 'CA' },
        { name: 'Arranger', code: 'AR' },
        { name: 'Sub Arranger', code: 'SR' },
        { name: 'Adapter', code: 'AD' },
        { name: 'Sub Author', code: 'SA' },
        { name: 'Translator', code: 'TR' },
      ];

      $scope.setDefaultMappings = (valuesForMapping, mappings) => {
        const newMappings = { ...mappings };

        Object.keys($scope.import.valuesForMapping).forEach((type) => {
          if (!valuesForMapping[type].length) return;
          const valuesThatNeedMapping = valuesForMapping[type];

          valuesThatNeedMapping.forEach((value) => {
            let key; let displayValue;

            if (type === 'territories') {
              const territory = $scope.territories.find((territory) => territory.code.toLowerCase() === value.toLowerCase());
              if (!territory) return;
              key = territory.code;
              displayValue = territory.code;
            } else if (type === 'capacities') {
              const capacity = capacities.find((capacity) => capacity.code.toLowerCase() === value.toLowerCase());
              if (!capacity) return;
              key = capacity.code;
              displayValue = capacity.name;
            } else if (type === 'societies') {
              let society = $scope.pros.find((society) => society.toLowerCase() === value.toLowerCase());
              if (!society) {
                const valueFound = Society.listCodesReversed[value];
                if (!valueFound) return;
                const doesValueExistInPros = $scope.pros.includes(valueFound);
                if (!doesValueExistInPros) return;
                society = valueFound;
              }
              key = value;
              displayValue = society;
            }

            if (!newMappings[type]) {
              $scope.defaultMappingsApplied = true;
              newMappings[type] = { [key]: displayValue };
            } else if (!newMappings[type][key]) {
              $scope.defaultMappingsApplied = true;
              // Only update if the user hasn't set the value
              newMappings[type] = {
                ...newMappings[type],
                [key]: displayValue,
              };
            }
          });
        });
        $scope.import.mappings = newMappings;
      };

      $scope.setMappingsFromImportPartner = (importMappings, partnerMappings) => {
        Object.keys(partnerMappings).forEach((type) => {
          const importMapping = importMappings[type];
          const partnerMapping = partnerMappings[type];
          if (!partnerMapping) return;

          if (!importMapping) {
            importMappings[type] = partnerMapping;
            $scope.partnerMappingsApplied = true;
            return;
          }
          Object.keys(partnerMapping).forEach((key) => {
            if (importMapping[key]) return;
            importMappings[type][key] = partnerMapping[key];
            $scope.partnerMappingsApplied = true;
          });
        });

        $scope.import.mappings = importMappings;
      };

      $scope.exportErrors = async () => {
        Loader.load();

        Import.exportErrors($routeParams.id, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/text' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `Import Errors ${$routeParams.id}.csv`;
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        if ($scope.transferringSystem !== 'Catalogue Shipment' || !$scope.isEdit) return;
        delete $scope.import.updatedAt;
        delete $scope.import.importPartnerId.updatedAt;
        delete $scope.originalObj.updatedAt;
        delete $scope.originalObj.importPartnerId.updatedAt;

        const current = JSON.parse(angular.toJson($scope.import));

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
            $scope.import = $scope.originalObj;
          }
        }
      }
    },
  ]);
