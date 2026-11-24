angular.module('Curve')
  .controller('periodCompleteController', ['$rootScope', '$scope', '$location', '$routeParams', '$q', '$window', 'Session', 'Pagination', 'Period', 'Notification', 'Settings', 'OutputSales', 'Loader', 'Statement', 'SelectAll', 'SalesFile', 'Cost', 'Release', 'Track', 'Work', 'Territories', 'Company', 'Payee', '$timeout', 'Client',
    function ($rootScope, $scope, $location, $routeParams, $q, $window, Session, Pagination, Period, Notification, Settings, OutputSales, Loader, Statement, SelectAll, SalesFile, Cost, Release, Track, Work, Territories, Company, Payee, $timeout, Client) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.clientType = Session.clientType;
      $scope.clientName = Session.clientName;
      $scope.features = $rootScope.features;
      $scope.userType = Session.userType;
      $scope.period = { salesFilesIds: [], costIds: [] };
      $scope.salesFiles = [];
      $scope.costs = [];
      $scope.includedSalesFiles = [];
      $scope.includedResolvedGroups = [];
      $scope.includedCosts = [];
      $scope.outputSales = [];
      $scope.contractCategories = [];
      $scope.payeeCategories = [];
      $scope.statements = [];
      $scope.calculationLog = [];
      $scope.salesTable = {};
      $scope.statementFilter = { periodId: $routeParams.id, text: null, limit: 100, orderBy: 'date -name', orderDir: 'desc', published: null, sent: null, contractCategories: [], payeeCategories: [], companyIds: [], payeeIds: [] };
      $scope.publishedValues = [{ name: 'Published', value: true }, { name: 'Unpublished', value: false }];
      $scope.sentValues = [{ name: 'Sent', value: true }, { name: 'Unsent', value: false }];
      $scope.statementsTable = {};
      $scope.filter = {
        orderBy: 'saleDate',
        orderDir: 'asc',
      };
      $scope.includedSalesTable = {};
      $scope.includedSalesTable.filter = {
        orderBy: 'name',
        orderDir: 'asc',
      };
      $scope.includedResolvedGroupsTable = {};
      $scope.includedResolvedGroupsTable.filter = {
        orderBy: 'name',
        orderDir: 'asc',
      };
      $scope.includedCostsTable = {};
      $scope.includedCostsTable.filter = {
        orderBy: 'name',
        orderDir: 'asc',
      };

      $scope.batchTaskFilter = { text: null, limit: 100, orderBy: 'status', orderDir: 'asc' };
      $scope.batchTaskStatus = ['In Progress', 'Pending', 'Errored'];
      $scope.batchTaskSelect = null;

      $scope.currentStatusIndex = 0;
      $scope.processingStatuses = ['Clearing Previous Data', 'Updating Catalogue Data', 'Calculating Costs', 'Calculating Sales', 'Flushing Catalogue Data to Output', 'Getting Period Data', 'Creating Period Files', 'Creating Statements', 'Setting Statement Data', 'Creating Statement Files', 'Creating Zip of All Statements'];
      $scope.processingErrorStatuses = ['Errored in Clearing Previous Data', 'Errored in Updating Catalogue Data', 'Costs Calculation Errored', 'Sales Calculation Errored', 'Flushing Catalogue Data to Output Errored', 'Errored In Getting Period Data', 'Errored In Creating Period Files', 'Errored in Creating Statements', 'Errored in Getting Statement Data', 'Creating Statement Files Errored', 'Errored Creating Zip of All Statements'];

      $scope.downloadAllOptions = {
        pdf: { value: false, display: 'Statement PDFs' },
        salesCsv: { value: false, display: 'Sales CSV' },
        costsCsv: { value: false, display: 'Costs CSV' },
        statementOfAccount: { value: false, display: 'Statement of Account' },
        feesInvoice: { value: false, display: 'Fees Invoice' },
        selfBillingInvoice: { value: false, display: 'Self Billing Invoice' },
      };
      $scope.totalStatement = 0;
      $scope.DMPData = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            if ($scope.features?.payeeBalances) {
              $scope.processingStatuses.push('Creating Payee Balances');
              $scope.processingErrorStatuses.push('Errored in Creating Payee Balances');
            }
          });
        });
      });

      // Set Loading Indexes
      $scope.$watch('period.calculationStatus', (status) => {
        // DMP specific change
        if (status && status.startsWith('DMP Period Ingest')) {
          $scope.DMPData = status.split(':');
          status = 'DMP Period Ingest';
        }
        $scope.currentStatusIndex = $scope.processingStatuses.indexOf(status);
        $scope.erroredStatusIndex = $scope.processingErrorStatuses.indexOf(status);
      });

      // Load Period if ID exists
      if ($routeParams.id) {
        Loader.load();
        init();
      }

      let initTimeout;
      let isTimeoutActive = false;

      function init() {
        // Do not execute if route has changed and periodId is not available
        if (!$routeParams.id) return;

        Period.get($routeParams.id, async (response) => {
          if (response.status === 200) {
            $scope.period = response.data;
            $scope.currencySymbol = $scope.period.contractType === 'Mechanical' ? null : Session.currencySymbol;
            $scope.filter.periodId = $scope.period._id;

            $scope.client = await new Promise((resolve, reject) => {
              Client.get($scope.period.clientId, (response) => {
                if (response.status === 200) resolve(response.data);
                else reject(response);
              });
            });

            setPeriodStatusTab();
            loadAnalytics();
            showHelpscoutPopup();

            if (!$scope.clientType && Session.clientType) $scope.clientType = Session.clientType;

            Loader.complete();

            if ($scope.period.status === 'Processing' && !isTimeoutActive) {
              getTotalCatalogueItems();
              isTimeoutActive = true;
              initTimeout = setTimeout(() => {
                isTimeoutActive = false;
                init();
              }, 5000);
            }
          } else {
            Loader.error('Error loading period, please try again or contact support');
          }
        });
      }

      $scope.$on('$destroy', () => {
        if (initTimeout) {
          clearTimeout(initTimeout);
          isTimeoutActive = false;
        }
      });

      function setPeriodStatusTab() {
        const { status } = $scope.period;

        if (status === 'Complete' || status === 'Deleting') {
          $scope.periodStatusHtml = 'overview-tab.html';
        } else if (status === 'Processing') {
          $scope.periodStatusHtml = 'period-processing.html';
        } else {
          $scope.periodStatusHtml = 'period-errored.html';
        }
      }

      function getTotalCatalogueItems() {
        $scope.totalCatalogueItems = $scope.period.totalContractsForCalculation;
      }

      $scope.getSortedData = function (orderBy) {
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.filter.orderBy = orderBy;
        controller.filterOutput($scope.filter);
      };
      $scope.whatClassIsIt = function (field) {
        if ($scope.filter.orderBy === field) {
          if ($scope.filter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      // included sales table
      $scope.includedSalesTable.getSortedData = function (orderBy) {
        if ($scope.includedSalesTable.filter.orderBy === orderBy) {
          $scope.includedSalesTable.filter.orderDir = ($scope.includedSalesTable.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.includedSalesTable.filter.orderBy = orderBy;
        loadIncludedSalesFiles($scope.includedSalesTable.filter);
      };
      $scope.includedSalesTable.whatClassIsIt = function (field) {
        if ($scope.includedSalesTable.filter.orderBy === field) {
          if ($scope.includedSalesTable.filter.orderBy === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      // included costs table
      $scope.includedCostsTable.getSortedData = function (orderBy) {
        if ($scope.includedCostsTable.filter.orderBy === orderBy) {
          $scope.includedCostsTable.filter.orderDir = ($scope.includedCostsTable.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.includedCostsTable.filter.orderBy = orderBy;
        loadIncludedCosts($scope.includedCostsTable.filter);
      };
      $scope.includedCostsTable.whatClassIsIt = function (field) {
        if ($scope.includedCostsTable.filter.orderBy === field) {
          if ($scope.includedCostsTable.filter.orderBy === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.runCalculation = function () {
        delete $scope.recalculationError;
        Loader.load();
        Period.runCalculation($scope.period._id, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/periods';
            Loader.success('Period sent for calculation');
          } else {
            Loader.error('Period cannot be recalculated.');
            $scope.recalculationError = response.data.message;
          }
        });
      };

      $scope.runCalculationFull = function () {
        delete $scope.recalculationError;
        Loader.load();
        Period.runCalculationFull($scope.period._id, (response) => {
          if (response.status === 200) {
            $window.location.href = '#/periods';
            Loader.success('Period sent for calculation');
          } else {
            Loader.error('Period cannot be recalculated.');
            $scope.recalculationError = response.data.message;
          }
          Loader.complete();
        });
      };

      $('#validatePeriodFileGenerationModal').on('hidden.bs.modal', () => {
        $scope.periodFilesValidationModalData = null;
      });

      $scope.periodFilesValidationModalData = null;

      $scope.navigateToLink = function (id, type) {
        const link = type === 'sales' ? `#/sales/${id}/ingestion_complete` : `#/statements/${id}`;
        $window.location.href = link;
        $('#validatePeriodFileGenerationModal').modal('hide');
      };

      $scope.validatePeriodFileGeneration = function (type) {
        $scope.periodFilesValidationModalData = null; // Reset

        Loader.load();
        Period.validatePeriodFileGeneration($scope.period._id, type, (response) => {
          if (response.status === 200) {
            $scope.periodFilesValidationModalData = response.data;
            $('#validatePeriodFileGenerationModal').modal();
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.generateUnreportedFile = function (type) {
        Loader.load();
        $('#validatePeriodFileGenerationModal').modal('hide');
        const excludedSalesFileIds = $scope.periodFilesValidationModalData?.salesFileList?.map((file) => file._id) || [];
        Period.generateUnreportedFile($scope.period._id, type, excludedSalesFileIds, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.platoonExport = function () {
        Loader.load();
        Period.platoonExport($scope.period._id, () => {
          Loader.success('Your export will be sent to the SFTP shortly');
        });
      };

      $scope.platoonDownload = function () {
        Loader.load();
        Period.platoonDownload($scope.period._id, () => {
          Loader.success('Your download will be available shortly');
        });
      };

      $scope.openDownloadModal = () => $('#downloadModal').modal();

      $scope.downloadSelectedStatements = () => {
        const selectedFiles = Object.entries($scope.downloadAllOptions).filter(([_, selected]) => selected.value).map(([file]) => file);
        if (selectedFiles.length === 0) {
          Loader.error('You must select at least one file to download');
          return;
        }
        Loader.load();
        Period.exportStatementsZip($scope.period._id, { selectedFiles }, (response) => {
          if (response.status === 200) {
            $('#downloadModal').modal('hide');
            Object.keys($scope.downloadAllOptions).forEach((k) => { $scope.downloadAllOptions[k].value = false; });

            const { alreadyInProgress, started, errored, invalid } = response.data.exportStatus;

            const displayFiles = (files) => files.map((file) => {
              let displayName = $scope.downloadAllOptions[file].display;
              if ($scope.clientType === 'Publisher' && file === 'salesCsv') displayName = 'Income CSV';
              return `<li>${displayName}</li>`;
            }).join('');

            if (started.length > 0) {
              const message = `Your export(s) will be sent to you shortly:<ul>${displayFiles(started)}</ul>`;
              Loader.success(message);
            }
            if (alreadyInProgress.length > 0) {
              const message = `Your export(s) are already in progress – please wait until they have completed before downloading again:<ul>${displayFiles(alreadyInProgress)}</ul>`;
              Loader.warning(message);
            }
            if (errored.length > 0) {
              const message = `Your export(s) are not available for the period:<ul>${displayFiles(errored)}</ul>`;
              Loader.error(message);
            }
            if (invalid.length > 0) {
              if (invalid.includes('invoices') || invalid.includes('salesCsv')) {
                const message = 'Invoices and Sales CSVs are not available when using Custom Statements';
                Loader.error(message);
              }
            }
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.exportSalesCsv = function () {
        Loader.load();
        Period.exportSalesCsv($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your export will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.exportCostsCsv = function () {
        Loader.load();
        Period.exportCostsCsv($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your export will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // included sales
      function loadIncludedSalesFiles(params) {
        Loader.load();
        Period.salesFiles($scope.period._id, params, (response) => {
          if (response.status === 200) {
            $scope.includedSalesFiles = response.data.salesFiles;
            $scope.totalSalesFilePages = response.data.meta.totalPages;
            $scope.currentSalesFilePage = response.data.meta.currentPage;
            $scope.salesFilePages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('Sales Files failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.changeSalesFilePage = function (page) {
        $scope.includedSalesTable.filter.page = page;
        loadIncludedSalesFiles($scope.includedSalesTable.filter);
      };

      function loadIncludedResolvedGroups(params) {
        Loader.load();
        Period.resolvedGroups($scope.period._id, params, (response) => {
          if (response.status === 200) {
            $scope.includedResolvedGroups = response.data.resolvedGroups;
            $scope.totalResolvedGroupPages = response.data.meta.totalPages;
            $scope.currentResolvedGroupPage = response.data.meta.currentPage;
            $scope.resolvedGroupPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('Resolved Groups failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.changeResolvedGroupPage = function (page) {
        $scope.includedResolvedGroupsTable.filter.page = page;
        loadIncludedResolvedGroups($scope.includedResolvedGroupsTable.filter);
      };

      // included costs
      function loadIncludedCosts(params) {
        Loader.load();
        Period.costs($scope.period._id, params, (response) => {
          if (response.status === 200) {
            $scope.includedCosts = response.data.costs;
            $scope.totalCostPages = response.data.meta.totalPages;
            $scope.currentCostPage = response.data.meta.currentPage;
            $scope.costPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('Costs failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.changeCostPage = function (page) {
        $scope.includedCostsTable.filter.page = page;
        loadIncludedCosts($scope.includedCostsTable.filter);
      };

      $scope.isShowingAllStatement = false;

      $scope.showAllStatement = function () {
        $scope.isShowingAllStatement = true;
        $scope.statementFilter.limit = 500;
        $scope.statementFilter.page = 1;
        controller.loadStatements();
      };

      $scope.changeStatementPage = function (page) {
        $scope.statementFilter.page = page;
        controller.loadStatements();
      };

      $scope.statementsTable.getSortedData = function (orderBy) {
        if ($scope.statementFilter.orderBy.includes(orderBy)) {
          $scope.statementFilter.orderDir = ($scope.statementFilter.orderDir === 'asc') ? 'desc' : 'asc';
        }

        $scope.statementFilter.orderBy = orderBy;

        if ($scope.statementFilter.orderBy === 'name') {
          $scope.statementFilter.orderBy = $scope.statementFilter.orderDir === 'asc' ? 'date name' : 'date -name';
        }

        controller.loadStatements();
      };

      $scope.statementsTable.whatClassIsIt = function (field) {
        if ($scope.statementFilter.orderBy.replace('-', '') === field) {
          if ($scope.statementFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.loadStatements = function (callback) {
        Loader.load();
        Statement.all($scope.statementFilter, (response) => {
          if (response.status === 200) {
            $scope.statements = response.data.statements;
            $scope.totalStatementPages = response.data.meta.totalPages;
            $scope.currentStatementPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalStatement = response.data.meta.total;
            }
            $scope.statementPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      this.loadStatements = $scope.loadStatements;

      function loadAnalytics() {
        Loader.load();
        Period.analytics($scope.period._id, (response) => {
          if (response.status === 200) {
            $scope.analytics = response.data.analytics;
            Loader.complete();
          } else {
            Loader.error('Analytics failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.toggleLock = function () {
        $scope.period.locked = !$scope.period.locked;
        delete $scope.period.usedReleaseIds;
        delete $scope.period.usedTrackIds;
        delete $scope.period.usedWork;
        delete $scope.period.analysis;
        if (!$scope.period.locked) {
          $('#unlockModal').modal('hide');
          $('#unlockModal').one('hidden.bs.modal', () => {
            save();
          });
        } else {
          save();
        }
      };

      function save() {
        Loader.load();
        Period.update($scope.period._id, $scope.period, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/periods/${response.data._id}/edit`;
            Loader.success('Period successfully saved');
          } else {
            Loader.error('Error saving period, please try again or contact support');
          }
        });
      }

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        // Load data on change of tab
        if (value === 'statements' && $scope.statements.length === 0) {
          controller.loadStatements();
        } else if (value === 'sales') {
          controller.filterOutput($scope.filter);
        } else if (value === 'includedSales' && $scope.includedSalesFiles.length === 0) {
          loadIncludedSalesFiles($scope.includedSalesTable.filter);
        } else if (value === 'includedResolvedGroups' && $scope.includedResolvedGroups.length === 0) {
          loadIncludedResolvedGroups($scope.includedResolvedGroupsTable.filter);
        } else if (value === 'includedCosts' && $scope.includedCosts.length === 0) {
          loadIncludedCosts($scope.includedCostsTable.filter);
        } else if (value === 'qaReport') {
          loadQAReport();
        } else if (value === 'batchTasks') {
          controller.loadBatchTasks($scope.batchTaskFilter);
        }
      };

      $scope.searchBatchTasks = function () {
        $scope.batchTaskFilter.page = 1;
        controller.loadBatchTasks($scope.batchTaskFilter);
      };

      this.loadBatchTasks = function (params) {
        Loader.load();
        Period.batchTasks($routeParams.id, params, (response) => {
          if (response.status === 200) {
            $scope.batchTasks = formatBatchTasks(response.data.batchTasks);

            $scope.totalBatchTaskPages = response.data.meta.totalPages;
            $scope.currentBatchTaskPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalBatchTasks = response.data.meta.total;
            }
            $scope.batchTaskPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error('Batch Tasks failed to load, please try again by refreshing the page');
          }
        });
      };

      $scope.openBatchTaskModal = function (batchTask) {
        $scope.selectedBatchTask = batchTask;

        $('#batchTaskModal').modal();
      };

      $scope.reprocessBatchTask = function () {
        $('#batchTaskModal').modal('hide');
        Loader.load();
        Period.runBatchTask($routeParams.id, { batchTaskId: $scope.selectedBatchTask._id }, (response) => {
          $scope.selectedBatchTask = null;
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }

          init();
          controller.loadBatchTasks();
        });
      };

      function formatBatchTasks(data) {
        const batchTasks = [];
        data.forEach((batchTask) => {
          batchTask.statusClass = getClass(batchTask.status);

          batchTasks.push(batchTask);
        });

        return batchTasks;
      }

      function getClass(status) {
        switch (status) {
          case 'In Progress':
            return 'label-info';
          case 'Pending':
            return 'label-success';
          case 'Errored':
            return 'label-danger';
          default:
            return '';
        }
      }

      $scope.changeBatchTaskPage = function (page) {
        $scope.batchTaskFilter.page = page;
        controller.loadBatchTasks($scope.batchTaskFilter);
      };

      function loadQAReport() {
        Loader.load();
        Period.qaReport($routeParams.id, (response) => {
          if (response.status === 200) {
            // delete response.data.calculationLog.currencyExchangeRates;; or move to new var for seperate display?
            $scope.calculationLog = response.data.calculationLog;
            Loader.complete();
          } else {
            Loader.error('QA Report failed to load, please try again by refreshing the page');
          }
        });
      }

      $scope.edit = function () {
        // @to only want to send the following - need to update the api route and thoroughly test
        // const periodMeta = {
        //   status: 'Setup',
        //   setupStage: 'Setup'
        // }
        $scope.period.status = 'Setup';
        $scope.period.setupStage = 'Setup';
        delete $scope.period.usedReleaseIds;
        delete $scope.period.usedTrackIds;
        delete $scope.period.usedWork;
        delete $scope.period.analysis;
        delete $scope.period.locked;
        Period.update($scope.period._id, $scope.period, (response) => {
          if (response.status === 200) {
            $window.location.href = `#/periods/${response.data._id}/edit`;
            Loader.success('Period successfully saved');
          } else {
            Loader.error('Error saving period, please try again or contact support');
          }
        });
      };

      $scope.paySelected = function () {
        Loader.load();
        const ids = [];
        $scope.statements.forEach((statement) => {
          if (statement.selected) {
            ids.push(statement._id);
          }
        });
        if (ids.length === 0) {
          Loader.error('At least one Statements needs to be selected');
        } else {
          Statement.payMany(ids, (response) => {
            if (response.status === 200) {
              Loader.success(response.data.message);
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.exportStatements = function () {
        Loader.load();
        Period.exportStatements($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Archiving Sales Files
      $scope.archiveAllSalesFiles = function () {
        Loader.load();
        Period.archiveAllSalesFiles($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Sales Files Successfully Archived');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.archiveFullyReportedSalesFiles = function () {
        Loader.load();
        Period.archiveFullyReportedSalesFiles($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Sales Files Successfully Archived');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.archiveSelectedSalesFiles = function () {
        Loader.load();
        const ids = [];
        $scope.includedSalesFiles.forEach((salesFile) => {
          if (salesFile.selected) {
            ids.push(salesFile._id);
          }
        });
        SalesFile.archiveMany(ids, (response) => {
          if (response.status === 200) {
            Loader.success('Sales Files Successfully Archived');
          } else {
            Loader.error('There was an error when attempting to archive the selected Sales Files. Please try again or contact support.');
          }
        });
      };

      // Archiving Costs
      $scope.archiveAllCosts = function () {
        Loader.load();
        Period.archiveAllCosts($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Costs Successfully Archived');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.archiveFullyReportedCosts = function () {
        Loader.load();
        Period.archiveFullyReportedCosts($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Costs Successfully Archived');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.archiveSelectedCosts = function () {
        Loader.load();
        const ids = [];
        const archived = 'true';
        $scope.includedCosts.forEach((cost) => {
          if (cost.selected) {
            ids.push(cost._id);
          }
        });

        Cost.archiveMany(ids, archived, (response) => {
          if (response.status === 200) {
            Loader.success('Costs Successfully Archived');
          } else {
            Loader.error('There was an error when attempting to archive the selected Costs. Please try again or contact support.');
          }
        });
      };

      $scope.getRunTime = function (startDate, endDate) {
        if (!startDate || !endDate) return '0s';

        startDate = new Date(startDate);
        endDate = new Date(endDate);
        const duration = Math.abs(endDate.getTime() - startDate.getTime());

        // const milliseconds = parseInt((duration % 1000) / 100);
        let seconds = parseInt((duration / 1000) % 60);
        let minutes = parseInt((duration / (1000 * 60)) % 60);
        let hours = parseInt((duration / (1000 * 60 * 60)) % 24);
        let days = parseInt(duration / (1000 * 60 * 60 * 24));

        days = (days > 0 && days < 10) ? `0${days}` : days;
        hours = (hours > 0 && hours < 10) ? `0${hours}` : hours;
        minutes = (minutes > 0 && minutes < 10) ? `0${minutes}` : minutes;
        seconds = (seconds > 0 && seconds < 10) ? `0${seconds}` : seconds;

        if (days !== 0) {
          return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } if (days === 0 && hours !== 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        } if (days === 0 && hours === 0 && minutes !== 0) {
          return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
      };

      $scope.exportSales = function () {
        Loader.load();
        Period.exportSales($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your Sales Export will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.exportCosts = function () {
        Loader.load();
        Period.exportCosts($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your Costs Export will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Sales Tab
      $scope.search = function () {
        $scope.filter.periodId = $scope.period._id;
        $scope.filter.page = 1;
        controller.filterOutput($scope.filter, () => {
          Loader.success('Sales Successfully Searched');
        });
      };

      $scope.searchLoadStatements = function () {
        $scope.statementFilter.page = 1;
        controller.loadStatements();
      };

      $scope.filterOutput = function () {
        controller.filterOutput($scope.filter);
      };

      this.filterOutput = function (params, callback) {
        Loader.load();
        $scope.territories = Territories;
        Settings.getSettings()
          .then((settings) => {
            $scope.prices = JSON.parse(JSON.stringify(settings.priceCategories));
            $scope.prices.shift();
            $scope.configs = JSON.parse(JSON.stringify(settings.configurations));
            $scope.configs.shift();
            $scope.channels = JSON.parse(JSON.stringify(settings.distributionChannels));
            $scope.channels.shift();
          });
        OutputSales.all(params, (response) => {
          if (response.status === 200) {
            $scope.outputSales = response.data.sales;
            $scope.salesTotalPages = response.data.meta.totalPages;
            $scope.salesCurrentPage = response.data.meta.currentPage;
            $scope.total = response.data.meta.total;
            $scope.salesPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.changeSalesPage = function (page) {
        $scope.filter.page = page;
        $scope.salesCurrentPage = page;
        controller.filterOutput($scope.filter);
      };

      $scope.groupFind = function (country) {
        return country.continent;
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

      $scope.searchReleases = function (select) {
        Release.all({ text: select.search }, (response) => {
          $scope.releases = response.data.releases;
        });
      };

      $scope.searchTracks = function (select) {
        Track.all({ text: select.search }, (response) => {
          $scope.tracks = response.data.tracks;
        });
      };

      $scope.searchWorks = function (select) {
        Work.all({ text: select.search }, (response) => {
          $scope.works = response.data.works;
        });
      };

      $scope.createStatement = function () {
        Loader.load();
        if ($scope.createStatementContractId) {
          Period.createStatement($scope.period._id, $scope.createStatementContractId, (response) => {
            if (response.status === 200) {
              $('#createStatementModal').modal('hide');
              Loader.complete('Statement Created and Sent For Calculation');
              controller.loadStatements();
            } else {
              Loader.error(response.data.message);
            }
          });
        } else {
          Loader.error('You must select a contract to create a statement');
        }
      };

      Settings.getSettings().then((settings) => {
        $scope.contractCategories = settings.contractCategories;
        $scope.payeeCategories = settings.payeeCategories;
      });

      $scope.searchCompanies = function (select) {
        Company.all({ text: select.search }, (response) => {
          $scope.companies = response.data.companies;
        });
      };

      $scope.searchPayees = function (select) {
        Payee.all({ text: select.search }, (response) => {
          $scope.payees = response.data.payees;
        });
      };

      $scope.$watch('statements', () => {
        const selectedStatements = $scope.statements.filter((statement) => statement.selected);
        $scope.publishTotal = selectedStatements.length || $scope.totalStatement;
      }, true);

      $scope.openPublishModal = function (action) {
        $scope.publishAction = action;
        $('#publishModal').modal();
      };

      $scope.publishStatements = function () {
        const ids = [];
        $scope.statements.forEach((statement) => { if (statement.selected) { ids.push(statement._id); } });
        if ($scope.publishAction === 'Publish') {
          Statement.publishMany({ ids, filter: $scope.statementFilter }, (response) => {
            if (response.status === 200) {
              Loader.success(`${ids.length || $scope.publishTotal} ${ids.length === 1 ? 'statement is' : 'statements are'} being published. You will be notified once this process is complete`);
              controller.loadStatements(() => { $('#publishModal').modal('hide'); });
            } else {
              Loader.error(response.data.message);
            }
          });
        } else if ($scope.publishAction === 'Unpublish') {
          Statement.unpublishMany({ ids, filter: $scope.statementFilter }, (response) => {
            if (response.status === 200) {
              Loader.success(`${ids.length || $scope.publishTotal} ${ids.length === 1 ? 'statement is' : 'statements are'} being unpublished. You will be notified once this process is complete`);
              controller.loadStatements(() => { $('#publishModal').modal('hide'); });
            } else {
              Loader.error(response.data.message);
              $('#publishModal').modal('hide');
            }
          });
        }
      };

      $scope.openSendModal = function () {
        const selectedStatements = $scope.statements.filter((statement) => statement.selected);

        if (selectedStatements.length) {
          const { publishedStatements, unpublishedStatements } = selectedStatements.reduce((acc, statement) => {
            if (statement.status === 'Published') {
              acc.publishedStatements.push(statement);
            } else {
              acc.unpublishedStatements.push(statement);
            }
            return acc;
          }, { publishedStatements: [], unpublishedStatements: [] });

          $scope.sendTotal = publishedStatements.length;
          $scope.unpublishedCount = unpublishedStatements.length;
          $('#sendModal').modal();
        } else {
          const filterWithPublishedStatus = { ...$scope.statementFilter, status: 'Published', limit: 0 };

          Statement.all(filterWithPublishedStatus, (response) => {
            if (response.status === 200) {
              $scope.sendTotal = response.data.meta.total;
              $scope.unpublishedCount = 0;
              $('#sendModal').modal();
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.sendStatements = function () {
        const ids = [];
        $scope.statements.forEach((statement) => { if (statement.selected) { ids.push(statement._id); } });
        Statement.sendMany({
          ids,
          filter: {
            ...$scope.statementFilter,
            status: 'Published',
          },
        }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
            $scope.statements.forEach((statement) => { statement.selected = false; });
            $('#sendModal').modal('hide');
          } else {
            Loader.error(response.data.message);
            $('#sendModal').modal('hide');
          }
        });
      };

      function showHelpscoutPopup() {
        // Helpscout
        const publisherBeacon = 'cc97c132-7297-4cc2-af70-3f7fc00db4ae';
        const labelBeacon = '3d786d98-f895-4bdf-b68f-a5a5db481e5d';
        // Set beacon to load based on user and client type
        if ($scope.clientType === 'Publisher') {
          $window.Beacon('show-message', publisherBeacon);
        } else {
          $window.Beacon('show-message', labelBeacon);
        }
      }

      $scope.publishFugaStatements = async () => {
        if (!window.confirm('Are you sure you want to publish all statements for this period to GCS? Existing statements will be overwritten.')) {
          return;
        }
        Loader.load();
        $scope.disableFugaPublishButton = true;
        Period.publishFugaStatements($scope.period._id, (response) => {
          if (response.status === 200) {
            Loader.success('Your statements are being published to GCS. You will be notified via email once this process is complete.');
          } else {
            Loader.error(response?.data?.message ?? 'There was an error attempting to publish your statements to GCS. Please try again or contact support.');
          }
          setTimeout(() => {
            $scope.disableFugaPublishButton = false;
          }, 5000);
        });
      };
    },
  ]);
