angular.module('Curve')
  .controller('salesUnmappedWorksController', ['$rootScope', '$scope', '$q', '$routeParams', '$window', 'Session', 'Pagination', 'Notification', 'Territories', 'Settings', 'Client', 'Loader', 'SelectAll', 'UnmappedWork', 'Sales', 'Work',
    function ($rootScope, $scope, $q, $routeParams, $window, Session, Pagination, Notification, Territories, Settings, Client, Loader, SelectAll, UnmappedWork, Sales, Work) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.filter = {};
      $scope.unmappedWorks = [];
      $scope.userType = Session.userType;
      $scope.uploader = {};
      $scope.importCatTypes = ['Work', 'Contract'];
      $scope.importTemplateTypes = ['Aliases', 'Society Identifiers'];
      // default template to Aliases
      $scope.uploader.templateType = 'Aliases';
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      Settings.getSalesFiles()
        .then((response) => {
          $scope.salesFiles = response;
        });
      Settings.getWorks()
        .then((response) => {
          $scope.works = response.works;
        });

      // Sidebar
      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.sales').addClass('active');
      $('.sidebar-menu-item.sales').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.unmapped-item').find('span.icon-thumbnail').addClass('white');

      if (Session.unmappedWorksFilter) {
        $scope.filter = Session.unmappedWorksFilter;
      } else {
        $scope.filter = { orderBy: 'netValue', orderDir: 'asc' };
      }

      this.filter = function (callback) {
        Loader.load();
        $scope.filter.complete = $scope.filter.status === 'Complete';
        Session.unmappedWorksFilter = $scope.filter;
        UnmappedWork.all($scope.filter, (response) => {
          if (response.status === 200) {
            $scope.unmappedWorks = response.data.unmappedWorks;
            if (response.data.meta && response.data.meta.totalPages) { $scope.totalPages = response.data.meta.totalPages; }
            if (response.data.meta && response.data.meta.currentPage) { $scope.currentPage = response.data.meta.currentPage; }
            if (response.data.meta && response.data.meta.currentPage && response.data.meta.totalPages) { $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages); }
            if (response.data.meta) { $scope.total = response.data.meta.total ? response.data.meta.total : 0; }
            if (response.data && response.data.meta) { $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages); }
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error('There was an error loading the works');
          }
        });
      };

      if ($routeParams.salesFile) {
        $scope.filter = { salesFileIds: [$routeParams.salesFile] };
      }
      // Search for unmapped works on init
      controller.filter();

      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter();
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        $scope.currentPage = page;
        controller.filter();
      };

      $scope.getSortedData = function (orderBy) {
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        } else {
          $scope.filter.orderDir = 'asc';
        }
        $scope.filter.orderBy = orderBy;
        controller.filter();
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

      $scope.selectAllChecked = false;
      $scope.selectAll = function () {
        SelectAll.select($scope.unmappedWorks);
        $scope.selectAllChecked = true;
      };

      $scope.$watch('unmappedWorks', () => {
        $scope.selectAllChecked = true;
        $scope.unmappedWorks.forEach((work) => {
          if (!work.selected) { $scope.selectAllChecked = false; }
        });
        $scope.selectedWorks = $scope.unmappedWorks.filter((work) => work.selected).length;
      }, true);

      $scope.onImportCatTypeChange = () => {
        $scope.uploader.templateType = 'Aliases';
      };
      $scope.import = function () {
        Loader.load();
        Sales.importMappings($scope.uploader.file, $scope.uploader.catalogueType, $scope.uploader.templateType, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Society mappings are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      $scope.createWork = async function (work) {
        $scope.selectedWork = work;

        // Fetch client settings to check if issueIdentifier is enabled
        await Client.get(Session.clientId, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
          }
        });

        // Determine identifier based on client settings
        const shouldGenerateIdentifier = $scope.client && $scope.client.issueIdentifier === true;

        $scope.work = {
          title: work.title,
          composer: work.composer,
          foreignId: work.foreignId,
          identifier: shouldGenerateIdentifier ? undefined : work._id.identifier,
          iswc: work.iswc,
          tunecode: work.tunecode,
          salesReturnsRights: [],
          salesReturnsRightsDisplay: [],
        };

        // Always add society identifier when available (for re-ingestion matching)
        if (work._id.identifier && work._id.source) {
          $scope.work.societyIdentifiers = [{
            society: work._id.source,
            identifier: work._id.identifier,
          }];
        }

        $('#createWorkModal').modal('show');
      };
      $scope.addSalesReturnsRights = function () {
        $scope.work.salesReturnsRightsDisplay.push({ percentage: 100 });
      };
      $scope.deleteSalesReturnsRights = function (contract) {
        const index = $scope.work.salesReturnsRightsDisplay.indexOf(contract);
        $scope.work.salesReturnsRightsDisplay.splice(index, 1);
      };

      $scope.saveWork = function () {
        Loader.load();
        updateContracts();
        Work.create(JSON.parse(angular.toJson($scope.work)), (response) => {
          if (response.status === 200) {
            $('#createWorkModal').modal('hide');
            Loader.success('Work successfully created');
            const index = $scope.unmappedWorks.findIndex((unmappedWork) => unmappedWork._id === $scope.selectedWork._id);
            // Set new work data to unmappedwork
            $scope.unmappedWorks[index].iswc = response.data.iswc;
            $scope.unmappedWorks[index].title = response.data.title;
            $scope.unmappedWorks[index].workId = response.data._id;
            // Reset selectedWork
            $scope.selectedWork = null;
            $scope.work = {};
          } else {
            Loader.error('Error creating work, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The work has not been saved.  ${response.data.message}`);
        });
      };
      // Saving Contracts
      function updateContracts() {
        return $q((resolve, reject) => {
          $scope.work.salesReturnsRights = [];
          const contractPromises = $scope.work.salesReturnsRightsDisplay.map((contract) => addContractToSalesReturnsRights(100, contract));
          $q.all(contractPromises).then(() => {
            resolve();
          });
        });
      }
      function addContractToSalesReturnsRights(currentPercentage, displayContract) {
        return $q((resolve, reject) => {
          const calculatedPercentage = (currentPercentage * displayContract.percentage) / 100;
          $scope.work.salesReturnsRights.push({ contractId: displayContract.contractId, percentage: calculatedPercentage, displayPercentage: displayContract.percentage });
          const childContractPromises = displayContract.children ? displayContract.children.map((childContract) => addContractToSalesReturnsRights(calculatedPercentage, childContract)) : [];
          $q.all(childContractPromises).then(() => {
            resolve();
          });
        });
      }

      $scope.createWorks = function (type) {
        let selectedWorks = [];
        const modalId = (type === 'all') ? '#createWorksAllModal' : '#createWorksModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'all') {
            selectedWorks = $scope.unmappedWorks;
          } else {
            selectedWorks = $scope.unmappedWorks.filter((work) => work.selected);
          }
          if (selectedWorks.length > 0) {
            Loader.load();
            UnmappedWork.createWorks(selectedWorks, (response) => {
              // Received success response 200
              if (response.status === 200) {
                const { created, failed } = response.data;
                controller.filter(() => {
                  if (failed.length > 0) {
                    $scope.unmappedWorks.map((work) => {
                      if (failed.includes(work._id.identifier)) {
                        work.selected = true;
                      }
                    });
                    Loader.warning(`${created.length} work${(created.length > 1 || created.length === 0) ? 's' : ''} created, ${failed.length} work${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already being created elsewhere. Reingest or Revalidate the file to match down any that have been created already.`);
                  } else {
                    Loader.success(`${created.length} work${(created.length > 1 || created.length === 0) ? 's' : ''} created`);
                  }
                });
              } else {
                // Received status other than 200
                Loader.error(`The works have not been created. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The works have not been created. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one work');
          }
        });
      };

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

      $scope.export = function () {
        Loader.load();
        const filter = { ...$scope.filter };
        if (filter.salesFileIds && filter.salesFileIds.length === 0) delete filter.salesFileIds;
        const workIds = $scope.unmappedWorks.filter((work) => work.selected).map((work) => work.ids[0]);
        const exportBody = {
          filter,
          workIds,
        };
        UnmappedWork.export(exportBody, (response) => {
          if (response.status === 200) {
            Loader.success('Your unmapped works will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };
    },
  ]);
