/* eslint-disable max-len */
angular.module('Curve')
  .controller('salesIngestionCompleteController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'Pagination', 'TerritoriesWithoutContinents', 'Currencies', 'Settings', 'Client', 'SalesFile', 'Sales', 'Loader', 'SelectAll', 'SalesTemplate', 'Release', 'Track', 'Work', 'UnmappedWork', 'Contract', 'Pros', 'Uploader', '$timeout', 'SalesGroup',
    // eslint-disable-next-line max-len
    function ($rootScope, $scope, $location, $routeParams, $window, Session, Pagination, TerritoriesWithoutContinents, Currencies, Settings, Client, SalesFile, Sales, Loader, SelectAll, SalesTemplate, Release, Track, Work, UnmappedWork, Contract, Pros, Uploader, $timeout, SalesGroup) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.clientType = $rootScope.clientType;
      $scope.displayIgnition = !!(Session.clientName && Session.clientName.includes('Ignition'));
      $scope.saleDatePopup = false;
      $scope.transactionDatePopup = false;
      const territoriesWithoutContinentsPlusWorld = [{ code: 'WW', name: 'World', continent: 'World' }, ...TerritoriesWithoutContinents];
      $scope.territories = territoriesWithoutContinentsPlusWorld;
      $scope.currencies = Currencies;
      $scope.catTypes = Session.clientType === 'Publisher' ? ['Work', 'Contract'] : ['Release', 'Track', 'Contract'];
      $scope.status = ['Complete', 'Incomplete'];
      $scope.filter = {
        contractIdFilterType: '=',
        originalTrackTitleFilterType: '=',
        originalTrackArtistFilterType: '=',
        originalReleaseTitleFilterType: '=',
        originalReleaseArtistFilterType: '=',
        barcodeFilterType: '=',
        catNoFilterType: '=',
        isrcFilterType: '=',
        territoryFilterType: '=',
        distributionChannelFilterType: '=',
        configurationFilterType: '=',
        sourceFilterType: '=',
        subSourceFilterType: '=',
        originalWorkTitleFilterType: '=',
        originalComposersFilterType: '=',
        originalIdentifierFilterType: '=',
        iswcFilterType: '=',
        tunecodeFilterType: '=',
      };
      $scope.filterTypes = ['=', 'contains', 'is_blank'];
      $scope.sales = [];
      $scope.sale = {};
      $scope.searchText = null;
      $scope.filterSales = [];
      $scope.releases = [];
      $scope.tracks = [];
      $scope.works = [];
      $scope.currentPage = 1;
      $scope.setupStage = '';
      $scope.nextSetupStage = '';
      $scope.selectedDistributionChannels = [];
      $scope.selectedConfigurations = [];
      $scope.selectedPriceCategories = [];
      $scope.selectedTerritories = [];
      $scope.selectedCurrencyCodes = [];
      $scope.selectedCurrencies = [];
      $scope.selectedSubSources = [];
      $scope.mappedReleases = [];
      $scope.mappedTracks = [];
      $scope.mappedWorks = [];
      $scope.mappedContracts = [];
      $scope.displayMappedTracks = [];
      $scope.totalWorksPages = 1;
      $scope.currentWorksPage = 1;
      $scope.mappingDistributionChannels = [];
      $scope.mappingConfigurations = [];
      $scope.mappingPriceCategories = [];
      $scope.mappingTerritories = [];
      $scope.mappingCurrencyCodes = [];
      $scope.mappingCurrencies = [];
      $scope.mappingSubSources = [];
      $scope.currencySymbol = Session.currencySymbol;
      $scope.deletionError = '';
      $scope.isNew = $routeParams.isNew;
      $scope.files = [];
      $scope.originalCurrencyMissing = false;
      $scope.areAnySalesSelected = false;
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('clientType', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.clientType = $rootScope.clientType;
          });
        });
      });

      $rootScope.$watch('features', () => {
        if ($rootScope.features?.useAlternativeId) {
          $scope.filter.alternativeIdFilterType = '=';
        }
      }, true);

      $scope.$watch('sales', () => {
        $scope.areAnySalesSelected = $scope.sales.some((sale) => sale.selected);
      }, true);
      $scope.selectAllChecked = false;

      $scope.selectAllSales = function () {
        SelectAll.select($scope.sales);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('sales', () => {
        $scope.selectAllChecked = true;
        $scope.sales.forEach((sale) => {
          if (!sale.selected) { $scope.selectAllChecked = false; }
        });
      }, true);

      $scope.$watch('filter.selectedContracts', (newVal) => {
        // keep the contractIds synced with the selected contracts
        $scope.filter.contractId = newVal?.map((contract) => contract._id);
      }, true);

      $scope.$watch('filter', (newFilter) => {
        Object.keys(newFilter).forEach((key) => {
          const value = newFilter[key];
          const filterTypeKey = `${key}FilterType`;

          // This code is used in case a filter gets deleted after inputting it, we are deleting the key Value Pair from the filter object to allow for a clean reset
          // If value is empty AND not a needed filter type, remove the field
          if ((!value || (Array.isArray(value) && value.length === 0))
            && ($scope.filter[filterTypeKey] !== 'is_blank' && $scope.filter[filterTypeKey] !== 'is_not_blank')) {
            delete $scope.filter[key];
          }

          // If FilterType is  set to "is_blank" or "is_not_blank", remove corresponding field
          if (key.endsWith('FilterType') && (value === 'is_blank' || value === 'is_not_blank')) {
            const realKey = key.replace('FilterType', '');
            if ($scope.filter[realKey]) {
              delete $scope.filter[realKey];
            }
            if (realKey === 'contractId') {
              delete $scope.filter.selectedContracts;
            }
          }
        });

        // Check if there are any active filters excluding the dropdowns
        $scope.isFilterEmpty = Object.keys($scope.filter)
          .filter((key) => !key.endsWith('FilterType'))
          .length === 0;
      }, true);

      $scope.$on('$locationChangeStart', (event) => {
        event.preventDefault();
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');
        event.defaultPrevented = false;
      });

      $scope.showInvalidLines = () => {
        $scope.filter = { status: 'Incomplete' };
        $scope.search();
      };

      // Search functionality for typeahead
      $scope.getContracts = function (val) {
        if (!val || val.length < 3) {
          $scope.contracts = [];
          return;
        }
        const params = { text: val, autocomplete: true };
        Contract.all(params, (res) => {
          if (res.data && res.data.contracts) {
            $scope.contracts = res.data.contracts
              .map((item) => ({
                _id: item._id,
                name: item.name,
              }));
          }
        });
      };

      $scope.contractString = function (item) {
        return `${item.name} - ${item._id}`;
      };

      this.filter = function (params, callback) {
        Loader.load();
        Sales.all(params, (response) => {
          if (response.status === 200) {
            $scope.sales = response.data.sales;
            if (response.data.meta && response.data.meta.totalPages) { $scope.totalPages = response.data.meta.totalPages; }
            if (response.data.meta && response.data.meta.currentPage) { $scope.currentPage = parseInt(response.data.meta.currentPage); }
            if (response.data.meta && response.data.meta.currentPage && response.data.meta.totalPages) { $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages); }
            if (response.data.meta) { $scope.total = response.data.meta.total ? response.data.meta.total : 0; }
            if (response.data && response.data.meta) { $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages); }
            $scope.showResolve = $scope.filter?.suspenseGroupIds?.length;
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.refreshFilter = function (callback) {
        controller.filter($scope.filter, callback);
      };

      // Load Sales File if ID exists
      if ($routeParams.id) {
        SalesFile.get($routeParams.id, (response) => {
          if (response.status === 200 && response.data.status !== 'Complete') {
            $window.location.href = `#/sales/${$routeParams.id}/edit`;
          } else if (response.status === 200) {
            $scope.salesFile = response.data;
            if ($scope.salesFile.overwriteFields && $scope.salesFile.overwriteFields.saleDate) { $scope.salesFile.overwriteFields.saleDate = new Date(response.data.overwriteFields.saleDate); }
            if ($scope.salesFile.overwriteFields && $scope.salesFile.overwriteFields.transactionDate) { $scope.salesFile.overwriteFields.transactionDate = new Date(response.data.overwriteFields.transactionDate); }
            // Set salesFileId in filter
            $scope.filter.salesFileId = $routeParams.id;
            $scope.filter.partitionNo = response.data.partitionNo;
            $scope.getTemplate();
            $scope.setupModalTabs();
            $scope.setupReleasesForSaving();
            $scope.setupTracksForSaving();
            const mappingRights = !($scope.rights && $scope.rights.sales !== 'Edit');
            if (mappingRights && $scope.modalTabs.length > 0) { $('#modalCatalogueMapping').modal('show'); }
          } else {
            Loader.error('Error loading template, please try again or contact support');
          }
        });
      }

      // Return to previous state
      $scope.edit = function () {
        Loader.load();
        $scope.salesFile.status = 'Setup';
        // Remove catalogue values for saving - is too much data
        delete $scope.salesFile.invalidFields.releases;
        delete $scope.salesFile.invalidFields.tracks;
        delete $scope.salesFile.invalidFields.works;
        delete $scope.salesFile.invalidFields.contracts;
        delete $scope.salesFile.usedReleaseIds;
        delete $scope.salesFile.usedTrackIds;
        delete $scope.salesFile.usedWorkIds;
        SalesFile.update($scope.salesFile._id, $scope.salesFile, () => {
          $window.location.href = `#/sales/${$scope.salesFile._id}/edit`;
        });
      };

      $scope.showReingestConfirmModel = function () {
        Loader.load();
        let showModel = false;
        if ($scope.salesFile.reportedStatus === 'Partially Complete' || $scope.salesFile.reportedStatus === 'Complete') {
          showModel = true;
        }
        if (showModel) {
          $('#validationModal').modal('show');
          Loader.complete();
        } else {
          $scope.reingest(false);
          Loader.complete();
        }
      };

      $scope.reingest = function (closeModel) {
        Loader.load();
        if (closeModel) {
          $('#reingestModal').modal('hide');
        }
        SalesFile.ingest($scope.salesFile._id, {}, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/sales';
            Loader.success('Sales file ingestion started');
          } else if (response.status === 201) {
            Loader.error(response.data.message);
          } else {
            Loader.error('Error kicking off ingestion, please try again or contact support');
          }
        });
      };

      $scope.revalidate = function () {
        Loader.load();
        SalesFile.revalidate($scope.salesFile._id, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/sales';
            Loader.success('Sales file revalidation started');
          } else if (response.status === 201) {
            Loader.error(response.data.message);
          } else {
            Loader.error('Error kicking off revalidation, please try again or contact support');
          }
        });
      };

      $scope.toggleArchived = function () {
        $scope.salesFile.archived = !$scope.salesFile.archived;
        const ids = [$scope.salesFile._id];
        const method = ($scope.salesFile.archived) ? 'archiveMany' : 'unarchiveMany';

        SalesFile[method](ids, (response) => {
          if (response.status === 200) {
            const messageText = ($scope.salesFile.archived) ? 'archived' : 'unarchived';
            Loader.success(`Sales File "${$scope.salesFile.name}" has been ${messageText}`);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // function save(callback) {
      //   Loader.load();
      //   // Remove catalogue values for saving - is too much data
      //   delete $scope.salesFile.invalidFields.releases;
      //   delete $scope.salesFile.invalidFields.tracks;
      //   delete $scope.salesFile.invalidFields.works;
      //   delete $scope.salesFile.invalidFields.contracts;
      //   delete $scope.salesFile.usedReleaseIds;
      //   delete $scope.salesFile.usedTrackIds;
      //   delete $scope.salesFile.usedWorkIds;
      //   $scope.salesFile.viewed = true;
      //   SalesFile.update($scope.salesFile._id, $scope.salesFile, callback);
      // }

      $scope.getSortedData = function (orderBy) {
        if ($scope.orderBy === orderBy) {
          $scope.orderDir = ($scope.orderDir === 'asc') ? 'desc' : 'asc';
        } else {
          $scope.orderDir = 'asc';
        }
        $scope.orderBy = orderBy;
        $scope.filter.orderBy = $scope.orderBy;
        $scope.filter.orderDir = $scope.orderDir;
        $scope.search();
      };
      $scope.whatClassIsIt = function (field) {
        if ($scope.orderBy === field) {
          if ($scope.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.search = function () {
        $scope.filter.salesFileId = $scope.salesFile._id;
        $scope.filter.page = 1;
        const activeFilters = {};

        Object.keys($scope.filter).forEach((key) => {
          const value = $scope.filter[key];

          if (key.endsWith('FilterType')) {
            const fieldKey = key.replace('FilterType', '');

            if (fieldKey in $scope.filter || value === 'is_blank' || value === 'is_not_blank') {
              activeFilters[key] = value;
              activeFilters[fieldKey] = $scope.filter[fieldKey];
            }
          } else if (!(`${key}FilterType` in $scope.filter)) {
            activeFilters[key] = value;
          }
        });

        if (Object.keys(activeFilters).length > 0) {
          controller.filter(activeFilters, () => {
            $scope.filterSales = $scope.sales;
            Loader.success('Sales Successfully Searched');
          });
        } else {
          // No filters, fetch all results
          controller.filter({}, () => {
            $scope.filterSales = $scope.sales;
            Loader.success('All sales retrieved');
          });
        }
      };

      $scope.export = function () {
        Loader.load();
        const selectedSales = $scope.sales.filter((sale) => sale.selected).map((sale) => sale.id);
        $scope.filter.salesFileId = $scope.salesFile._id;
        if ($scope.clientType === 'Publisher') { $scope.filter.exportType = 'Publishing'; }
        Sales.export({ ids: selectedSales, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
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
        if (item.format && item.format !== '') {
          output += ` - ${item.format}`;
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

      $scope.searchSuspenseGroups = function (select) {
        SalesGroup.all({ type: 'suspense', text: select?.search || '' }, (response) => {
          $scope.suspenseGroups = response.data.salesGroups;
        });
      };

      $scope.searchResolvedGroups = function (select) {
        SalesGroup.all({ type: 'resolved', text: select?.search || '' }, (response) => {
          $scope.resolvedGroups = response.data.salesGroups;
        });
      };

      $scope.onSelectedSuspenseGroup = function () {
        $scope.filter.resolvedGroupIds = [];
      };

      $scope.onSelectedResolvedGroup = function () {
        $scope.filter.suspenseGroupIds = [];
      };

      $scope.$watch('filter.suspenseGroupIds', () => {
        $scope.showResolve = false;
      }, true);

      $scope.ignitionExport = function () {
        Loader.load();
        SalesFile.ignitionExport($scope.salesFile._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        $scope.currentPage = page;
        controller.filter($scope.filter);
      };

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
          $scope.formats = $scope.configurations;
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
      $scope.getTemplateSources = function () {
        $scope.templateSources = [];
        if (Session.clientType === 'Publisher') {
          $scope.templateSources = Pros.map((pro) => pro);
          $scope.templateSources.push('Other');
        } else if (Session.clientType === 'Label' || Session.clientType === 'Distributor') {
          $scope.templateSources.push('Apple');
        }
        $scope.templates.forEach((template) => {
          if ($scope.templateSources.indexOf(template.source) === -1) {
            $scope.templateSources.push(template.source);
          }
        });
        return $scope.templateSources;
      };

      Settings.getActiveTemplates()
        .then((templates) => {
          $scope.templates = templates;
          // Add iTunes templates
          $scope.getTemplateSources();
        });

      $scope.onSelectedTemplate = function (selectedItem) {
        if (selectedItem) {
          $scope.salesFile.salesAccountName = selectedItem.source;
          $scope.salesFile.salesTemplateId = selectedItem._id;
          $scope.currentTemplate = selectedItem;
          if (selectedItem.overwriteFields) {
            $scope.salesFile.overwriteFields = selectedItem.overwriteFields;
            delete $scope.salesFile.overwriteFields.exchangeRate;
            $scope.salesFile.overwriteFields.saleDate = new Date(selectedItem.overwriteFields.saleDate);
            $scope.salesFile.overwriteFields.transactionDate = new Date(selectedItem.overwriteFields.transactionDate);
          } else {
            $scope.salesFile.overwriteFields = {};
          }
          $scope.templateId = selectedItem._id;
        }
        return $scope.currentTemplate;
      };

      $scope.getTemplate = function () {
        SalesTemplate.get($scope.salesFile.salesTemplateId, (response) => {
          $scope.currentTemplate = response.data;
          if ($scope.salesFile.overwriteFields && !$scope.salesFile.overwriteFields.originalCurrency) {
            if ($scope.currentTemplate && $scope.currentTemplate.fields) {
              const matchedFields = $scope.currentTemplate.fields.filter((val) => val && val.field === 'originalCurrency');
              if (matchedFields.length === 0) {
                $scope.originalCurrencyMissing = true;
              }
            } else {
              $scope.originalCurrencyMissing = true;
            }
          }
        });
      };

      function inArray(array, name, map) {
        let isIn = false;
        array.forEach((el) => {
          if (el.name === name && el.map === map) {
            isIn = true;
          }
        });
        return isIn;
      }

      function updateTemplate(oldPage) {
        SalesTemplate.update($scope.salesFile.salesTemplateId, $scope.currentTemplate, (response) => {
          if (response.status === 200) {
            $scope.currentTemplate = response.data;
            Loader.success(`${oldPage} successfully saved`);
          } else {
            Loader.error('Error saving, please try again or contact support');
          }
        })
          .catch((response) => {
            Loader.error(`The object has not been saved.  ${response.data.message}`);
          });
      }

      // Mapping Modal
      $scope.setupModalTabs = function () {
        $scope.modalTabs = [];
        if (!$scope.salesFile.viewed || $scope.isNew) {
          $scope.modalTabs.push('Setup'); $scope.salesFile.viewed = true;
        } else if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.customAdditionalFile) {
          // if sales file is not new check if Financial File was missing during ingestion
          $scope.modalTabs.push('Financial File');
        }
        if ($scope.salesFile.invalidFields && ($scope.salesFile.invalidFields.saleDate || $scope.salesFile.invalidFields.transactionDate)) { $scope.modalTabs.push('Dates'); }
        if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.distributionChannels.length > 0) { $scope.modalTabs.push('Channels'); }
        if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.configurations.length > 0) { $scope.modalTabs.push('Configurations'); }
        if ($scope.clientType !== 'Publisher' && $scope.salesFile.invalidFields && $scope.salesFile.invalidFields.priceCategories.length > 0) { $scope.modalTabs.push('Price Categories'); }
        if ($scope.clientType === 'Publisher' && $scope.salesFile.invalidFields && $scope.salesFile.invalidFields.subSources.length > 0) { $scope.modalTabs.push('Sub Sources'); }
        if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.territories.length > 0) { $scope.modalTabs.push('Territories'); }
        if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.currencyCodes.length > 0) { $scope.modalTabs.push('Currencies'); }
        // Condition for when Sales File is an Apple Sales File
        if ($scope.salesFile.salesAccountName === 'Apple') {
          if ($scope.viewed || !$scope.isNew) {
            if (!$scope.salesFile.customAdditionalFile && !$scope.modalTabs.includes('Setup') && !$scope.modalTabs.includes('Financial File')) {
              $scope.modalTabs.push('Financial File');
            } else if ($scope.salesFile.customAdditionalFile && $scope.salesFile.invalidFields.currencies.length > 0) {
              $scope.modalTabs.push('Exchange Rates');
            }
          }
        } else if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.currencies.length > 0 && $scope.salesFile.invalidFields.currencyCodes.length === 0) {
          $scope.modalTabs.push('Exchange Rates');
        }
        if ($scope.clientType !== 'Publisher' && $scope.salesFile.invalidFields && $scope.salesFile.invalidFields.releases.length > 0) { $scope.modalTabs.push('Releases'); }
        if ($scope.clientType !== 'Publisher' && $scope.salesFile.invalidFields && $scope.salesFile.invalidFields.tracks.length > 0) { $scope.modalTabs.push('Tracks'); }
        if ($scope.clientType === 'Publisher' && $scope.salesFile.invalidFields && $scope.salesFile.invalidFields.works.length > 0) { $scope.modalTabs.push('Works'); }
        if ($scope.salesFile.invalidFields && $scope.salesFile.invalidFields.contracts.length > 0) { $scope.modalTabs.push('Contracts'); }
        $scope.setupStage = $scope.modalTabs[0];
        $scope.nextSetupStage = $scope.modalTabs[1];
      };
      $scope.changeTab = function (page) {
        const oldPage = $scope.setupStage;
        const ingestAfterUpload = (page === 'ingestAfterUpload');
        if ($scope.setupStage === 'Setup') {
          saveSetup(oldPage, ingestAfterUpload);
        } else if ($scope.setupStage === 'Financial File') {
          saveFinancialFile(ingestAfterUpload);
        } else if ($scope.setupStage === 'Dates') {
          saveDates(oldPage);
        } else if ($scope.setupStage === 'Channels') {
          saveDistributionChannels(oldPage);
        } else if ($scope.setupStage === 'Configurations') {
          saveConfigurations(oldPage);
        } else if ($scope.setupStage === 'Price Categories') {
          savePriceCategories(oldPage);
        } else if ($scope.setupStage === 'Territories') {
          saveTerritories(oldPage);
        } else if ($scope.setupStage === 'Currencies') {
          saveCurrencies(oldPage);
        } else if ($scope.setupStage === 'Exchange Rates') {
          saveExchangeRates(oldPage);
        } else if ($scope.setupStage === 'Sub Sources') {
          saveSubSources(oldPage);
        } else if ($scope.setupStage === 'Releases') {
          saveReleases(oldPage);
        } else if ($scope.setupStage === 'Tracks') {
          saveTracks(oldPage);
        } else if ($scope.setupStage === 'Works') {
          saveWorks(oldPage);
        } else if ($scope.setupStage === 'Contracts') {
          saveContracts(oldPage);
        }
        if (!page || page === 'Close') {
          $('#modalCatalogueMapping').modal('hide');
        } else if (page === 'Reingest') {
          $('#modalCatalogueMapping').modal('hide');
          setTimeout($scope.showReingestConfirmModel, 1000);
        } else if (page === 'Revalidate') {
          $('#modalCatalogueMapping').modal('hide');
          setTimeout($scope.revalidate, 1000);
        } else {
          $scope.setupStage = page;
          $scope.nextSetupStage = $scope.modalTabs[$scope.modalTabs.indexOf(page) + 1];
        }
      };

      $scope.setupReleasesForSaving = function () {
        if ($scope.salesFile.invalidFields.releases) {
          $scope.salesFile.invalidFields.releases = $scope.salesFile.invalidFields.releases.map((release) => {
            const dataArray = [release.title, release.artist, release.catNo, release.barcode].filter(Boolean);
            release.display = dataArray.join(' - ');
            release.value = (release.catNo) ? release.catNo : release.barcode;
            return release;
          });
        }
      };

      $scope.setupTracksForSaving = function () {
        if ($scope.salesFile.invalidFields.tracks) {
          $scope.salesFile.invalidFields.tracks = $scope.salesFile.invalidFields.tracks.map((track) => {
            const dataArray = [track.title, track.artist, track.isrc].filter(Boolean);
            track.display = dataArray.join(' - ');
            track.value = track.isrc;
            return track;
          });
        }
      };

      $scope.setupWorksForSaving = function () {
        const pageSize = 25;
        if ($scope.salesFile.invalidFields.works) {
          $scope.totalWorksPages = Math.ceil($scope.salesFile.invalidFields.works.length / pageSize);
          $scope.displayMappedWorks = $scope.salesFile.invalidFields.works.slice(0, pageSize);
          $scope.worksPages = Pagination.createArray($scope.currentWorksPage, $scope.totalWorksPages);
        }
      };

      $scope.createRelease = function (release) {
        $scope.mappedRelease = release;
        $scope.release = {
          title: release.title,
          artist: release.artist,
          catNo: release.catNo,
          barcode: release.barcode,
          salesReturnsRights: [],
          unmappedReleaseId: release._id,
        };
        $('#createReleaseModal').modal('show');
      };
      $scope.saveRelease = function () {
        Loader.load();
        $scope.release.costsRights = $scope.release.salesReturnsRights;
        Release.create(JSON.parse(angular.toJson($scope.release)), (response) => {
          if (response.status === 200) {
            $('#createReleaseModal').modal('hide');
            Loader.success('Release successfully created');
            delete $scope.mappedRelease.value;
            const index = $scope.salesFile.invalidFields.releases.indexOf($scope.mappedRelease);
            $scope.salesFile.invalidFields.releases.splice(index, 1);
            $scope.mappedReleases.splice(index, 1);
            $scope.mappedRelease = null;
            $scope.release = {};
          } else {
            Loader.error('Error creating release, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The release has not been saved.  ${response.data.message}`);
        });
      };
      $scope.createReleases = function (type) {
        let selectedReleases = [];
        const modalId = (type === 'all') ? '#createReleasesAllModal' : '#createReleasesModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          // add the array indexes to the releases for referencing the correct releases when processing the api response
          const releasesWithIndex = $scope.salesFile.invalidFields.releases.map((release, index) => ({ ...release, index }));
          if (type === 'all') {
            selectedReleases = releasesWithIndex;
          } else {
            selectedReleases = releasesWithIndex.filter((release) => release.selected);
          }
          selectedReleases = selectedReleases.map((release) => ({
            index: release.index,
            title: release.title,
            artist: release.artist,
            catNo: release.catNo,
            barcode: release.barcode,
            unmappedReleaseId: release._id,
          }));
          if (selectedReleases.length > 0) {
            Loader.load();
            Release.createMany(selectedReleases, (response) => {
              // Received success response 200
              if (response.status === 200) {
                const { created, failed } = response.data;
                // reference all releases that have not been created
                const releasesFiltered = $scope.salesFile.invalidFields.releases.map((release, index) => (created.includes(index) ? null : release)).filter(Boolean);
                // and assign back to invalid releases list
                $scope.salesFile.invalidFields.releases = releasesFiltered;
                if (failed.length > 0) {
                  Loader.warning(`${created.length} release${(created.length > 1 || created.length === 0) ? 's' : ''} created, ${failed.length} release${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already being created elsewhere. Reingest or Revalidate the file to match down any that have been created already.`);
                } else {
                  Loader.success(`${created.length} release${(created.length > 1 || created.length === 0) ? 's' : ''} created`);
                }
              } else {
                // Received status other than 200
                Loader.error(`The releases have not been created. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The releases have not been created. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one release');
          }
        });
      };
      $scope.selectAllReleasesChecked = false;
      $scope.selectAllReleases = function () {
        SelectAll.select($scope.salesFile.invalidFields.releases);
        $scope.selectAllReleasesChecked = true;
      };
      $scope.$watch('salesFile.invalidFields.releases', () => {
        if ($scope.salesFile?.invalidFields) {
          $scope.selectAllReleasesChecked = true;
          $scope.salesFile.invalidFields.releases.forEach((release) => {
            if (!release.selected) { $scope.selectAllReleasesChecked = false; }
          });
          $scope.selectedReleases = $scope.salesFile.invalidFields.releases.filter((release) => release.selected).length;
        }
      }, true);
      $scope.selectAllWorksChecked = false;
      $scope.selectAllWorks = function () {
        SelectAll.select($scope.salesFile.invalidFields.works);
        $scope.selectAllWorksChecked = true;
      };
      $scope.$watch('salesFile.invalidFields.works', () => {
        if ($scope.salesFile?.invalidFields) {
          $scope.selectAllWorksChecked = true;
          $scope.salesFile.invalidFields.works.forEach((work) => {
            if (!work.selected) { $scope.selectAllWorksChecked = false; }
          });
          $scope.selectedWorks = $scope.salesFile.invalidFields.works.filter((work) => work.selected).length;
        }
      }, true);

      // Helper function to fetch client settings
      const fetchClientSettings = async () => {
        await Client.get(Session.clientId, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
          }
        });
      };

      $scope.createWork = async function (work) {
        $scope.mappedWork = work;

        // Fetch client settings to check if issueIdentifier is enabled
        await fetchClientSettings();

        // Determine identifier based on client settings
        const shouldGenerateIdentifier = $scope.client && $scope.client.issueIdentifier === true;

        $scope.work = {
          title: work?.title,
          identifier: shouldGenerateIdentifier ? undefined : work?.identifier,
          iswc: work?.iswc,
          tunecode: work?.tunecode,
          salesReturnsRights: [],
          salesReturnsRightsDisplay: [],
          societyIdentifiers: [{ society: $scope.mappedWork.source, identifier: foundIdentifier($scope.mappedWork) }],
          unmappedWorkIds: Array.isArray(work.ids) ? work.ids : [work._id],
        };
        $('#createWorkModal').modal('show');
      };
      $scope.saveWork = function () {
        Loader.load();
        $scope.work.salesReturnsRights = $scope.getsalesReturnsRights($scope.work.salesReturnsRightsDisplay);
        $scope.work.costsRights = $scope.work.salesReturnsRights;
        Work.create(JSON.parse(angular.toJson($scope.work)), (response) => {
          if (response.status === 200) {
            $('#createWorkModal').modal('hide');
            Loader.success('Work successfully created');
            delete $scope.mappedWork.value;
            const index = $scope.salesFile.invalidFields.works.indexOf($scope.mappedWork);
            $scope.salesFile.invalidFields.works.splice(index, 1);
            $scope.mappedWorks.splice(index, 1);
            $scope.mappedWork = null;
            $scope.work = {};
          } else {
            Loader.error('Error creating work, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The work has not been saved.  ${response.data.message}`);
        });
      };

      function foundIdentifier(unmappedWork) {
        if (unmappedWork._id.identifier) {
          return unmappedWork._id.identifier;
        } if (unmappedWork.identifier) {
          return unmappedWork.identifier;
        } if (unmappedWork.tunecode) {
          return unmappedWork.tunecode;
        } if (unmappedWork.iswc) {
          return unmappedWork.iswc;
        } if (unmappedWork.songcode) {
          return unmappedWork.songcode;
        } if (unmappedWork.title) {
          let string = unmappedWork.title;
          if (unmappedWork.party1) { string += ` - ${unmappedWork.party1}`; }
          if (unmappedWork.party2) { string += ` - ${unmappedWork.party2}`; }
          if (unmappedWork.party3) { string += ` - ${unmappedWork.party3}`; }
          return string.replace(/[^0-9a-zA-Z- (),_'"]/gi, '');
        }
      }

      $scope.createWorks = async function (type, creationType) {
        let selectedWorks = [];
        const modalId = (type === 'all') ? '#createWorksAllModal' : '#createWorksModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', async () => {
          // Fetch client settings to check if issueIdentifier is enabled
          await fetchClientSettings();

          // Determine identifier based on client settings
          const shouldGenerateIdentifier = $scope.client && $scope.client.issueIdentifier === true;

          // add the array indexes to the works for referencing the correct works when processing the api response
          const worksWithIndex = $scope.salesFile.invalidFields.works.map((work, index) => ({ ...work, index }));
          if (type === 'all') {
            selectedWorks = worksWithIndex;
          } else {
            selectedWorks = worksWithIndex.filter((work) => work.selected);
          }
          selectedWorks = selectedWorks.map((work) => ({
            index: work.index,
            title: work.title,
            identifier: shouldGenerateIdentifier ? undefined : work?.identifier,
            iswc: work?.iswc,
            tunecode: work?.tunecode,
            societyIdentifiers: [{ society: work.source, identifier: foundIdentifier(work) }],
            unmappedWorkIds: Array.isArray(work.ids) ? work.ids : [work._id],
            creationType,
          }));
          if (selectedWorks.length > 0) {
            Loader.load();
            Work.createMany(selectedWorks, (response) => {
              // Received success response 200
              if (response.status === 200) {
                const { created, failed } = response.data;
                // reference all works that have not been created
                const worksFiltered = $scope.salesFile.invalidFields.works.map((work, index) => (created.includes(index) ? null : work)).filter(Boolean);
                // and assign back to invalid works list
                $scope.salesFile.invalidFields.works = worksFiltered;
                if (failed.length > 0) {
                  Loader.warning(`${created.length} work${(created.length > 1 || created.length === 0) ? 's' : ''} created, ${failed.length} work${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already being created elsewhere. Reingest or Revalidate the file to match down any that have been created already.`);
                } else {
                  Loader.success(`${created.length} work${(created.length > 1 || created.length === 0) ? 's' : ''} created`);
                }
              } else {
                // Received status other than 200
                Loader.error(`The works have not been created. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The works have not been created. ${response.data?.message || ''}`);
            });
          } else {
            Loader.error('Choose at least one work');
          }
        });
      };

      $scope.getsalesReturnsRights = function (salesReturnsRightsDisplay) {
        let contractIds = [];

        // loop through each object in the array
        for (let i = 0; i < salesReturnsRightsDisplay.length; i += 1) {
          const contractObj = salesReturnsRightsDisplay[i];
          const { contractId } = contractObj;

          // add the current contractId to the array
          contractIds.push({ contractId, percentage: contractObj.percentage, displayPercentage: contractObj.percentage });

          // if there are children, call this function recursively and concatenate the results
          if (contractObj.children && contractObj.children.length > 0) {
            contractIds = contractIds.concat($scope.getsalesReturnsRights(contractObj.children));
          }
        }

        return contractIds;
      };

      $scope.createTrack = function (track) {
        $scope.mappedTrack = track;
        $scope.track = {
          title: track.title,
          artist: track.artist,
          isrc: track.isrc,
          salesReturnsRights: [],
          unmappedTrackId: track._id,
        };
        $('#createTrackModal').modal('show');
      };
      $scope.saveTrack = function () {
        Loader.load();
        $scope.track.costsRights = $scope.track.salesReturnsRights;
        Track.create(JSON.parse(angular.toJson($scope.track)), (response) => {
          if (response.status === 200) {
            $('#createTrackModal').modal('hide');
            Loader.success('Track successfully created');
            delete $scope.mappedTrack.value;
            const index = $scope.salesFile.invalidFields.tracks.indexOf($scope.mappedTrack);
            $scope.salesFile.invalidFields.tracks.splice(index, 1);
            $scope.mappedTracks.splice(index, 1);
            $scope.mappedTrack = null;
            $scope.track = {};
          } else {
            Loader.error('Error creating track, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The track has not been saved.  ${response.data.message}`);
        });
      };
      $scope.createTracks = function (type) {
        let selectedTracks = [];
        const modalId = (type === 'all') ? '#createTracksAllModal' : '#createTracksModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          // add the array indexes to the tracks for referencing the correct tracks when processing the api response
          const tracksWithIndex = $scope.salesFile.invalidFields.tracks.map((track, index) => ({ ...track, index }));
          if (type === 'all') {
            selectedTracks = tracksWithIndex;
          } else {
            selectedTracks = tracksWithIndex.filter((track) => track.selected);
          }
          selectedTracks = selectedTracks.map((track) => ({
            index: track.index,
            title: track.title,
            artist: track.artist,
            isrc: track.isrc,
            unmappedTrackId: track._id,
          }));
          if (selectedTracks.length > 0) {
            Loader.load();
            Track.createMany(selectedTracks, (response) => {
              // Received success response 200
              if (response.status === 200) {
                const { created, failed } = response.data;
                // reference all tracks that have not been created
                const tracksFiltered = $scope.salesFile.invalidFields.tracks.map((track, index) => (created.includes(index) ? null : track)).filter(Boolean);
                // and assign back to invalid tracks list
                $scope.salesFile.invalidFields.tracks = tracksFiltered;
                if (failed.length > 0) {
                  Loader.warning(`${created.length} track${(created.length > 1 || created.length === 0) ? 's' : ''} created, ${failed.length} track${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already being created elsewhere. Reingest or Revalidate the file to match down any that have been created already.`);
                } else {
                  Loader.success(`${created.length} track${(created.length > 1 || created.length === 0) ? 's' : ''} created`);
                }
              } else {
                // Received status other than 200
                Loader.error(`The tracks have not been created. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The tracks have not been created. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one track');
          }
        });
      };
      $scope.selectAllTracksChecked = false;
      $scope.selectAllTracks = function () {
        SelectAll.select($scope.salesFile.invalidFields.tracks);
        $scope.selectAllTracksChecked = true;
      };
      $scope.$watch('salesFile.invalidFields.tracks', () => {
        if ($scope.salesFile?.invalidFields) {
          $scope.selectAllTracksChecked = true;
          $scope.salesFile.invalidFields.tracks.forEach((track) => {
            if (!track.selected) { $scope.selectAllTracksChecked = false; }
          });
          $scope.selectedTracks = $scope.salesFile.invalidFields.tracks.filter((track) => track.selected).length;
        }
      }, true);

      $scope.addSalesReturnsRights = function (rights) {
        rights.push({ percentage: 100 });
      };
      $scope.deleteSalesReturnsRights = function (rights, contract) {
        const index = rights.indexOf(contract);
        rights.splice(index, 1);
      };

      function saveFinancialFile(ingestAfterUpload, callback) {
        if ($scope.files[0]) {
          Uploader.upload($scope.files[0], `/salesFiles/${$scope.salesFile._id}/get_additional_file_upload_credentials`).then(() => {
            if (ingestAfterUpload) { $scope.reingest(false); }
            if (callback) { callback(); } else { Loader.success('Financial file successfully uploaded'); }
          });
        } else {
          if (ingestAfterUpload) { $scope.reingest(false); }
          if (callback) { callback(); }
        }
      }

      function saveSetup(oldPage, ingestAfterUpload) {
        // Update saleTemplateName on mapping manager
        $scope.salesFile.salesTemplateName = $scope.currentTemplate.name;

        SalesFile.update($scope.salesFile._id, $scope.salesFile, (response) => {
          $scope.salesFile.__v = response.data.__v;
          saveFinancialFile(ingestAfterUpload, () => {
            if ($scope.originalCurrencyMissing && $scope.salesFile.overwriteFields.originalCurrency) {
              $scope.currentTemplate.overwriteFields.originalCurrency = $scope.salesFile.overwriteFields.originalCurrency;
              updateTemplate(oldPage);
            } else {
              Loader.success(`${oldPage} successfully saved`);
            }
          });
        });
      }

      function saveDates(oldPage) {
        SalesFile.update($scope.salesFile._id, $scope.salesFile, (response) => {
          $scope.salesFile.__v = response.data.__v;
          Loader.success(`${oldPage} successfully saved`);
        });
      }

      function saveDistributionChannels(oldPage) {
        if ($scope.salesFile.invalidFields.distributionChannels) {
          for (let i = 0; i < $scope.salesFile.invalidFields.distributionChannels.length; i += 1) {
            if ($scope.selectedDistributionChannels[i]) {
              $scope.mappingDistributionChannels.push({
                name: $scope.selectedDistributionChannels[i],
                map: $scope.salesFile.invalidFields.distributionChannels[i],
              });
            }
          }
          if ($scope.mappingDistributionChannels.length > 0) {
            angular.forEach($scope.mappingDistributionChannels, (channel) => {
              if (!inArray($scope.currentTemplate.distributionChannels, channel.name, channel.map)) {
                $scope.currentTemplate.distributionChannels.push({ name: channel.name, map: channel.map });
              }
            });
          }
        }
        updateTemplate(oldPage);
      }

      function saveConfigurations(oldPage) {
        if ($scope.salesFile.invalidFields.configurations) {
          for (let i = 0; i < $scope.salesFile.invalidFields.configurations.length; i += 1) {
            if ($scope.selectedConfigurations[i]) {
              $scope.mappingConfigurations.push({
                name: $scope.selectedConfigurations[i],
                map: $scope.salesFile.invalidFields.configurations[i],
              });
            }
          }
          if ($scope.mappingConfigurations.length > 0) {
            angular.forEach($scope.mappingConfigurations, (configuration) => {
              if (!inArray($scope.currentTemplate.configurations, configuration.name, configuration.map)) {
                $scope.currentTemplate.configurations.push({ name: configuration.name, map: configuration.map });
              }
            });
          }
        }
        updateTemplate(oldPage);
      }

      function savePriceCategories(oldPage) {
        if ($scope.salesFile.invalidFields.priceCategories) {
          for (let i = 0; i < $scope.salesFile.invalidFields.priceCategories.length; i += 1) {
            if ($scope.selectedPriceCategories[i]) {
              $scope.mappingPriceCategories.push({
                name: $scope.selectedPriceCategories[i],
                map: $scope.salesFile.invalidFields.priceCategories[i],
              });
            }
          }
          if ($scope.mappingPriceCategories.length > 0) {
            angular.forEach($scope.mappingPriceCategories, (category) => {
              if (!inArray($scope.currentTemplate.priceCategories, category.name, category.map)) {
                $scope.currentTemplate.priceCategories.push({ name: category.name, map: category.map });
              }
            });
          }
        }
        updateTemplate(oldPage);
      }

      function saveTerritories(oldPage) {
        if ($scope.salesFile.invalidFields.territories) {
          for (let i = 0; i < $scope.salesFile.invalidFields.territories.length; i += 1) {
            if ($scope.selectedTerritories[i]) {
              $scope.mappingTerritories.push({
                name: $scope.selectedTerritories[i],
                map: $scope.salesFile.invalidFields.territories[i],
              });
            }
          }
          if ($scope.mappingTerritories.length > 0) {
            angular.forEach($scope.mappingTerritories, (territory) => {
              if (!inArray($scope.currentTemplate.territories, territory.name, territory.map)) {
                $scope.currentTemplate.territories.push({ name: territory.name, map: territory.map });
              }
            });
          }
        }
        updateTemplate(oldPage);
      }

      function saveCurrencies(oldPage) {
        if ($scope.salesFile.invalidFields.currencyCodes) {
          for (let i = 0; i < $scope.salesFile.invalidFields.currencyCodes.length; i += 1) {
            if ($scope.selectedCurrencyCodes[i]) {
              $scope.mappingCurrencyCodes.push({
                name: $scope.selectedCurrencyCodes[i],
                map: $scope.salesFile.invalidFields.currencyCodes[i],
              });
            }
          }
          if ($scope.mappingCurrencyCodes.length > 0) {
            angular.forEach($scope.mappingCurrencyCodes, (currency) => {
              if (!inArray($scope.currentTemplate.currencies, currency.name, currency.map)) {
                $scope.currentTemplate.currencies.push({ name: currency.name, map: currency.map });
              }
            });
          }
        }
        updateTemplate(oldPage);
      }

      function saveExchangeRates(oldPage) {
        if ($scope.salesFile.invalidFields.currencies) {
          for (let i = 0; i < $scope.salesFile.invalidFields.currencies.length; i += 1) {
            if ($scope.selectedCurrencies[i]) {
              // Add to sales file exchange rates
              $scope.salesFile.exchangeRates.push({
                rate: parseFloat($scope.selectedCurrencies[i]),
                from: $scope.salesFile.invalidFields.currencies[i],
                to: 'Home Currency',
              });
            }
          }
          SalesFile.update($scope.salesFile._id, { exchangeRates: $scope.salesFile.exchangeRates }, (response) => {
            $scope.salesFile.__v = response.data.__v;
            Loader.success(`${oldPage} successfully saved`);
          });
        }
      }

      function saveSubSources(oldPage) {
        if ($scope.salesFile.invalidFields.subSources) {
          for (let i = 0; i < $scope.salesFile.invalidFields.subSources.length; i += 1) {
            if ($scope.selectedSubSources[i]) {
              $scope.mappingSubSources.push({
                name: $scope.selectedSubSources[i],
                map: $scope.salesFile.invalidFields.subSources[i],
              });
            }
          }
          if ($scope.mappingSubSources.length > 0) {
            angular.forEach($scope.mappingSubSources, (subSource) => {
              if (!inArray($scope.currentTemplate.subSources, subSource.name, subSource.map)) {
                $scope.currentTemplate.subSources.push({ name: subSource.name, map: subSource.map });
              }
            });
          }
        }
        updateTemplate(oldPage);
      }

      function saveReleases(oldPage) {
        const updateReleasesObject = {};
        for (let j = 0; j < $scope.mappedReleases.length; j += 1) {
          if ($scope.mappedReleases[j]) {
            if (updateReleasesObject[$scope.mappedReleases[j]]) {
              updateReleasesObject[$scope.mappedReleases[j]].push($scope.salesFile.invalidFields.releases[j].value);
            } else {
              updateReleasesObject[$scope.mappedReleases[j]] = [$scope.salesFile.invalidFields.releases[j].value];
            }
          }
        }
        if (Object.keys(updateReleasesObject).length) {
          Release.addBulkAliases(updateReleasesObject, (response) => {
            if (response.status === 200) {
              const { succeeded, failed } = response.data;
              if (failed.length > 0) {
                Loader.warning(`Successfully mapped to ${succeeded.length} Release${(succeeded.length > 1 || succeeded.length === 0) ? 's' : ''}, Failed to map to ${failed.length} Release${(failed.length > 1) ? 's' : ''} - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already having been mapped elsewhere. Reingesting or Revalidating the file will match down any that have been mapped already.`);
              } else {
                Loader.success(`Successfully mapped to ${succeeded.length} Release${(succeeded.length > 1 || succeeded.length === 0) ? 's' : ''}`);
              }
            } else {
              Loader.error('Error saving, please try again or contact support');
            }
          })
            .catch(() => {
              // Loader.error('The object has not been saved.  ' + response.data.message);
            });
        } else {
          Loader.success(`${oldPage} successfully saved`);
        }
      }

      function saveWorks(oldPage) {
        const updatedWorksObject = {};
        for (let j = 0; j < $scope.mappedWorks.length; j += 1) {
          if ($scope.mappedWorks[j]) {
            if (updatedWorksObject[$scope.mappedWorks[j]]) {
              updatedWorksObject[$scope.mappedWorks[j]].push($scope.salesFile.invalidFields.works[j]);
            } else {
              updatedWorksObject[$scope.mappedWorks[j]] = [$scope.salesFile.invalidFields.works[j]];
            }
          }
        }

        if (Object.keys(updatedWorksObject).length) {
          UnmappedWork.addBulkAliases(updatedWorksObject, (response) => {
            if (response.status === 200) {
              Loader.success(`${oldPage} successfully saved`);
            } else {
              Loader.error('Error saving, please try again or contact support');
            }
          })
            .catch(() => {
              // Loader.error('The object has not been saved.  ' + response.data.message);
            });
        } else {
          Loader.success(`${oldPage} successfully saved`);
        }
      }

      function saveTracks(oldPage) {
        const updateTracksObject = {};
        for (let j = 0; j < $scope.mappedTracks.length; j += 1) {
          if ($scope.mappedTracks[j]) {
            if (updateTracksObject[$scope.mappedTracks[j]]) {
              updateTracksObject[$scope.mappedTracks[j]].push($scope.salesFile.invalidFields.tracks[j].value);
            } else {
              updateTracksObject[$scope.mappedTracks[j]] = [$scope.salesFile.invalidFields.tracks[j].value];
            }
          }
        }
        if (Object.keys(updateTracksObject).length) {
          Track.addBulkAliases(updateTracksObject, (response) => {
            if (response.status === 200) {
              const { succeeded, failed } = response.data;
              if (failed.length > 0) {
                Loader.warning(`Successfully mapped to ${succeeded.length} Track${(succeeded.length > 1 || succeeded.length === 0) ? 's' : ''}, Failed to map to ${failed.length} Track${(failed.length > 1) ? 's' : ''} - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already having been mapped elsewhere. Reingesting or Revalidating the file will match down any that have been mapped already.`);
              } else {
                Loader.success(`Successfully mapped to ${succeeded.length} Track${(succeeded.length > 1 || succeeded.length === 0) ? 's' : ''}`);
              }
            } else {
              Loader.error('Error saving, please try again or contact support');
            }
          })
            .catch(() => {
              // Loader.error('The object has not been saved.  ' + response.data.message);
            });
        } else {
          Loader.success(`${oldPage} successfully saved`);
        }
      }

      function saveContracts(oldPage) {
        const updateContractsObject = {};
        for (let j = 0; j < $scope.mappedContracts.length; j += 1) {
          if ($scope.mappedContracts[j]) {
            if (updateContractsObject[$scope.mappedContracts[j]]) {
              updateContractsObject[$scope.mappedContracts[j]].push($scope.salesFile.invalidFields.contracts[j]);
            } else {
              updateContractsObject[$scope.mappedContracts[j]] = [$scope.salesFile.invalidFields.contracts[j]];
            }
          }
        }
        if (Object.keys(updateContractsObject).length) {
          Object.keys(updateContractsObject).forEach((contractId) => {
            Contract.addAliases(contractId, updateContractsObject[contractId], (response) => {
              if (response.status !== 200) {
                Loader.error('Error saving, please try again or contact support');
              }
            })
              .catch(() => {
                Loader.error('Error saving, please try again or contact support');
              });
          });
          Loader.success(`${oldPage} successfully saved`);
        } else {
          Loader.success(`${oldPage} successfully saved`);
        }
      }

      $scope.trackMappingIndex = 0;
      $scope.contractMappingIndex = 0;
      $scope.releaseMappingIndex = 0;
      $scope.workMappingIndex = 0;
      $scope.channelMappingIndex = 0;
      $scope.configurationMappingIndex = 0;
      $scope.territoryMappingIndex = 0;
      $scope.currencyMappingIndex = 0;
      $scope.currencyCodeMappingIndex = 0;
      $scope.priceCatMappingIndex = 0;
      $scope.subSourceMappingIndex = 0;

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

      $scope.openSaleDatePopup = function () {
        $scope.saleDatePopup = true;
      };
      $scope.openTransactionDatePopup = function () {
        $scope.transactionDatePopup = true;
      };

      // Editing Sales Lines
      $scope.editSingle = function (sale) {
        $scope.editType = 'single';
        // Copy object without reference - to allow for someone to hit cancel
        $scope.sale = $.extend(true, {}, sale);
        if ($scope.sale.saleDate && $scope.sale.saleDate.value) { $scope.sale.saleDate = new Date($scope.sale.saleDate.value); }
        if ($scope.sale.transactionDate && $scope.sale.transactionDate.value) { $scope.sale.transactionDate = new Date($scope.sale.transactionDate.value); }
      };
      $scope.editSelected = function () {
        $scope.editType = 'selected';
        $scope.sale = {};
      };
      $scope.editFiltered = function () {
        $scope.editType = 'filtered';
        $scope.sale = {};
      };
      $scope.setupDeleteSingle = function (sale) {
        $scope.deleteType = 'single';
        $scope.sale = sale;
      };
      $scope.setupDeleteSelected = function () {
        $scope.deleteType = 'selected';
        $scope.sale = {};
      };

      $scope.updateSingle = function () {
        Loader.load();
        Sales.update($scope.sale.id, $scope.sale, (response) => {
          if (response.status === 200) {
            controller.filter($scope.filter, () => {
              $scope.filterSales = $scope.sales;
              Loader.success('Sales line successfully updated');
            });
          } else {
            Loader.error('Error saving sales line, please try again or contact support');
          }
        });
      };

      $scope.deleteSingle = function () {
        Loader.load();
        Sales.delete($scope.sale.id, (response) => {
          if (response.status === 200) {
            controller.filter($scope.filter, () => {
              $scope.filterSales = $scope.sales;
              $('#modalDeleteSalesLine').modal('hide');
              Loader.success('Sales line successfully deleted');
            });
          } else if (response.status === 201) {
            $scope.deletionError = response.data;
            Loader.error('This Sales File cannot be deleted as it is in use.');
          } else {
            Loader.error('Error deleting release, please try again or contact support');
          }
        });
      };

      $scope.deleteSelected = function () {
        Loader.load();
        const ids = $scope.sales.map((sale) => {
          if (sale.selected) {
            return sale.id;
          }
        }).filter(Boolean);
        Sales.deleteMultipleIds(ids, (response) => {
          if (response.status === 200) {
            controller.filter($scope.filter, () => {
              $scope.filterSales = $scope.sales;
              $('#modalDeleteSalesLine').modal('hide');
              Loader.success(`${ids.length} Sales successfully deleted`);
            });
          } else {
            Loader.error('Error deleting sales line, please try again or contact support');
          }
        });
      };

      $scope.updateSelected = function () {
        Loader.load();
        const ids = $scope.sales.map((sale) => {
          if (sale.selected) {
            return sale.id;
          }
        }).filter(Boolean);
        if ($scope.sale.release) {
          $scope.sale.releaseId = $scope.sale.release._id;
        }
        if ($scope.sale.track) {
          $scope.sale.trackId = $scope.sale.track._id;
        }
        Sales.updateMultipleIds(ids, $scope.sale, (response) => {
          if (response.status === 200) {
            $('#modalEditFields').modal('hide');
            controller.filter($scope.filter, () => {
              Loader.success(`${ids.length} Sales successfully updated`);
            });
          } else {
            Loader.error('Error saving sales line, please try again or contact support');
          }
        });
      };

      $scope.updateFiltered = function () {
        Loader.load();
        if ($scope.sale.release) {
          $scope.sale.releaseId = $scope.sale.release._id;
        }
        if ($scope.sale.track) {
          $scope.sale.trackId = $scope.sale.track._id;
        }
        Sales.updateFiltered($scope.filter, $scope.sale, (response) => {
          if (response.status === 200) {
            $('#modalEditFields').modal('hide');
            controller.filter($scope.filter, () => {
              Loader.success('Filtered sales successfully updated');
            });
          } else {
            Loader.error('Error saving sales line, please try again or contact support');
          }
        });
      };

      $scope.filteredToSuspense = function () {
        $scope.suspenseType = 'filtered';
      };
      $scope.selectedToSuspense = function () {
        $scope.selectedForSuspense = [];
        $scope.sales.forEach((sale) => {
          if (sale.selected) {
            $scope.selectedForSuspense.push(sale.id);
          }
        });
        $scope.suspenseType = 'selected';
      };

      $scope.filteredToResolved = function () {
        $scope.resolvedType = 'filtered';
      };
      $scope.selectedToResolved = function () {
        $scope.selectedForResolved = [];
        $scope.sales.forEach((sale) => {
          if (sale.selected) {
            $scope.selectedForResolved.push(sale.id);
          }
        });
        $scope.resolvedType = 'selected';
      };
    },
  ]);
