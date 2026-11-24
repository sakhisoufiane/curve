angular.module('Curve')
  .controller('salesUnmappedController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Pagination', 'Notification', 'TerritoriesWithoutContinents', 'Settings', 'Currencies', 'Sales', 'Loader', 'SelectAll', 'FileSaver', 'Release', 'Track', 'Work', 'Period', 'SalesFile', 'Client', 'Contract', 'SalesGroup',
    function ($rootScope, $scope, $routeParams, $window, Session, Pagination, Notification, TerritoriesWithoutContinents, Settings, Currencies, Sales, Loader, SelectAll, FileSaver, Release, Track, Work, Period, SalesFile, Client, Contract, SalesGroup) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.saleDatePopup = false;
      $scope.transactionDatePopup = false;
      const territoriesWithoutContinentsPlusWorld = [{ code: 'WW', name: 'World', continent: 'World' }, ...TerritoriesWithoutContinents];
      $scope.territories = territoriesWithoutContinentsPlusWorld;
      $scope.currencies = Currencies;
      $scope.catTypes = ['Release', 'Track', 'Work', 'Contract'];
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
      $scope.targetPeriodFilterValues = [{ name: 'Unassigned', value: 'unassigned' }];
      $scope.sales = [];
      $scope.sale = {};
      $scope.searchText = null;
      $scope.filterSales = [];
      $scope.releases = [];
      $scope.tracks = [];
      $scope.works = [];
      $scope.uploader = {};
      $scope.periods = [];
      $scope.importTemplateTypes = ['Aliases', 'Society Identifiers'];
      // default template to Aliases
      $scope.uploader.templateType = 'Aliases';

      $scope.rights = {};
      $scope.isFilterEmpty = !Object.keys($scope.filter).length;
      $scope.areAnySalesSelected = false;

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });
      $scope.$watch('sales', () => {
        $scope.areAnySalesSelected = $scope.sales.some((sale) => sale.selected);
      }, true);

      $rootScope.$watch('features', () => {
        if ($rootScope.features?.useAlternativeId) {
          $scope.filter.alternativeIdFilterType = '=';
        }
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

      if ($routeParams.suspenseGroupId) {
        $scope.filter.suspenseGroupIds = [$routeParams.suspenseGroupId];
      } else if ($routeParams.resolvedGroupId) {
        $scope.filter.resolvedGroupIds = [$routeParams.resolvedGroupId];
      }

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

      $rootScope.$watch('clientType', () => {
        $scope.setImportCatTypes();
      });

      // Sidebar
      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.sales').addClass('active');
      $('.sidebar-menu-item.sales').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.incomplete-item').find('span.icon-thumbnail').addClass('white');

      this.filter = function (params, callback) {
        Loader.load();
        Sales.all(params, (response) => {
          if (response.status === 200) {
            $scope.sales = response.data.sales;
            if (response.data.meta && response.data.meta.totalPages) { $scope.totalPages = response.data.meta.totalPages; }
            if (response.data.meta && response.data.meta.currentPage) { $scope.currentPage = response.data.meta.currentPage; }
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

      async function getFilterOptions() {
        SalesFile.getFilterOptions((response) => {
          if (response.status === 200) {
            const targetPeriods = response.data.targetPeriods.map((targetPeriod) => ({ name: targetPeriod, value: targetPeriod }));
            $scope.targetPeriodFilterValues = [...$scope.targetPeriodFilterValues, ...targetPeriods];
          } else {
            Loader.error('Failed to load Target Period filter options, please try again');
          }
        });
      }

      $scope.refreshFilter = function (callback) {
        controller.filter($scope.filter, callback);
      };

      $scope.getSortedData = function (orderBy) {
        if ($scope.orderBy === orderBy) {
          $scope.orderDir = ($scope.orderDir === 'asc') ? 'desc' : 'asc';
        } else {
          $scope.orderDir = 'asc';
        }
        $scope.orderBy = orderBy;
        $scope.filter.orderBy = $scope.orderBy;
        $scope.filter.orderDir = $scope.orderDir;
        controller.filter($scope.filter);
        Loader.complete();
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

      $scope.search = function () {
        $scope.filter.page = 1;
        const activeFilters = {};

        Object.keys($scope.filter).forEach((key) => {
          const value = $scope.filter[key];

          if (key.endsWith('FilterType')) {
            const fieldKey = key.replace('FilterType', '');

            // Check if the corresponding value exists or is "is_blank" || "is_not_blank"
            if ($scope.filter[fieldKey] || value === 'is_blank' || value === 'is_not_blank') {
              activeFilters[key] = value;
              activeFilters[fieldKey] = $scope.filter[fieldKey];
            }
          } else if (!$scope.filter[`${key}FilterType`]) {
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

      $scope.searchPeriods = function (select) {
        Period.all({ text: select.search }, (response) => {
          $scope.periods = response.data.periods;
        });
      };

      $scope.searchSalesFiles = function (select) {
        SalesFile.all({ text: select.search }, (response) => {
          $scope.salesFiles = response.data.salesFiles;
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

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.export = function () {
        Loader.load();
        const selectedSales = $scope.sales.filter((sale) => sale.selected).map((sale) => sale.id);
        Sales.export({ ids: selectedSales, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
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

      $scope.editSingle = function (sale) {
        $scope.editType = 'single';
        // $scope.sale = sale;
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
      $scope.setupDeleteSelected = function (sale) {
        $scope.deleteType = 'selected';
        $scope.sale = {};
      };

      $scope.updateSingle = function (sale) {
        Loader.load();
        $('#modalEditFields').modal('hide');
        Sales.update($scope.sale.id, $scope.sale, (response) => {
          if (response.status === 200) {
            controller.filter($scope.filter, () => {
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
          } else {
            Loader.error('Error deleting sales line, please try again or contact support');
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

      $scope.updateFilteredShowModalConfirmation = function () {
        $('#validationModal').modal();
      };

      $scope.updateFiltered = function () {
        Loader.load();
        Sales.updateFiltered($scope.filter, $scope.sale, (response) => {
          if (response.status === 200) {
            $('#modalEditFields').modal('hide');
            controller.filter($scope.filter, () => {
              Loader.success('Filtered sales successfully updated');
            });
          } else {
            Loader.error('Error saving sales line, please try again or contact support');
          }
        }).catch((response) => {
          if (response.status === 400) {
            Loader.error(`${response.data.message}`);
          } else {
            Loader.error('Could not update sales, please apply a value to a field before updating.');
          }
        });
      };

      $scope.setImportCatTypes = () => {
        if ($rootScope.clientType === 'Publisher') {
          $scope.importCatTypes = ['Work', 'Contract'];
        } else {
          $scope.importCatTypes = ['Release', 'Track', 'Contract'];
        }
      };
      $scope.setImportCatTypes();
      $scope.onImportCatTypeChange = () => {
        $scope.uploader.templateType = 'Aliases';
      };

      $scope.import = function () {
        Loader.load();
        Sales.importMappings($scope.uploader.file, $scope.uploader.catalogueType, $scope.uploader.templateType, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Alias mappings are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      // Load all sales on page load
      this.filter($scope.filter);

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        const type = ($scope.uploader.templateType === 'Society Identifiers') ? 'workAliasMapping' : 'aliasMapping';
        Client.downloadTemplate({ type }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = ($scope.uploader.templateType === 'Society Identifiers') ? 'Society Identifiers Mapping Import Template.xlsx' : 'Alias Mapping Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
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
      // Load filter options in the background
      getFilterOptions();
    },
  ]);
