angular.module('Curve')
  .controller('worksController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'Pagination', 'Work', 'Client', 'Notification', 'FileSaver', 'Loader', 'Settings', 'Contract', 'Composer', 'Publisher', 'Delivery', 'DeliveryPartner', '$timeout',
    function ($rootScope, $scope, $location, $routeParams, $window, Session, Pagination, Work, Client, Notification, FileSaver, Loader, Settings, Contract, Composer, Publisher, Delivery, DeliveryPartner, $timeout) {
      const controller = this;
      $scope.works = [];
      $scope.rights = {};
      $scope.features = $rootScope.features;
      $scope.approvalStatusFilterValues = [{ name: 'Invalid', value: 'Invalid' }, { name: 'Ready for Approval', value: 'Ready for Approval' }, { name: 'Approved', value: 'Approved' }];
      $scope.onHoldValues = [{ name: 'Yes', value: true }, { name: 'No', value: false }];
      $scope.deliveryStatuses = [{ name: 'Mark Delivered', value: 'Delivered' }, { name: 'Mark Accepted', value: 'Accepted' }];
      $scope.specificDeliveries = [];
      $scope.addToDelivery = {};
      $scope.showCreateDelivery = false;
      $rootScope.$watch('clientRights', () => {
        $scope.isInternal = Session.internal;
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.works === 'None') {
            $location.path('/');
          }
        }
      });

      if (Session.worksFilter) {
        $scope.filter = Session.worksFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'title', orderDir: 'asc', onHold: '' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.work-item').find('span.icon-thumbnail').addClass('white');

      // Filters
      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });

      $scope.searchContracts = function (select) {
        Contract.all({ text: select.search }, (response) => {
          $scope.contracts = response.data.contracts;
        });
      };

      $scope.searchComposers = function (select) {
        Composer.all({ text: select.search }, (response) => {
          $scope.composers = response.data.composers;
        });
      };

      $scope.searchPublishers = function (select) {
        Publisher.all({ text: select.search }, (response) => {
          $scope.publishers = response.data.publishers;
        });
      };

      $scope.openCreatedAfterPopup = function () {
        $scope.createdAfterPopup = true;
      };

      $scope.openCreatedBeforePopup = function () {
        $scope.createdBeforePopup = true;
      };

      this.filter = function (params, callback) {
        Session.worksFilter = params;
        Loader.load();
        Work.getWorks(params, (response) => {
          if (response.status === 200) {
            $scope.works = response.data.works;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }

            for (let i = 0; i < $scope.works.length; i += 1) {
              const obj = $scope.works[i];
              if (!obj.title) { obj.title = '<i>New Work</i>'; }
            }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.getSpecificDeliveries = function () {
        const params = { filterType: 'specific', status: 'Pending' };
        Loader.load();
        Delivery.specificDeliveries(params, (response) => {
          if (response.status === 200) {
            $scope.specificDeliveries = response.data.specificDeliveries;
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.getSpecificDeliveries();

      $scope.addToDeliverySelected = function () {
        Loader.load();
        const selectedWorks = [];
        $scope.works.forEach((work, callback) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });
        if (selectedWorks.length > 0) {
          Delivery.updateWorkIds($scope.addToDelivery.delivery._id, { workIds: selectedWorks }, (response) => {
            if (response.status === 200) {
              $('#addToDeliveryModal').modal('hide');
              Loader.success(response.data.message);
              $window.location.href = `#/deliveries/${$scope.addToDelivery.delivery._id}/edit`;
            } else {
              $scope.addToDelivery = {};
              Loader.error('Error adding to Delivery, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The Delivery has not been saved.  ${response.data.message}`);
            });
        } else {
          $('#addToDeliveryModal').modal('hide');
          $scope.addToDelivery = {};
          Loader.error('Choose at least one work');
        }
      };

      $scope.createNewDelivery = function (bool) {
        $scope.showCreateDelivery = bool;
      };

      $scope.createDelivery = function () {
        Loader.load();
        const selectedWorks = [];
        $scope.works.forEach((work, callback) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });
        if (selectedWorks.length > 0 && $scope.addToDelivery?.partner?._id) {
          DeliveryPartner.get($scope.addToDelivery?.partner?._id, (response) => {
            if (response.status === 200) {
              const deliveryPartner = response.data;
              Delivery.create({ deliveryPartnerId: deliveryPartner._id.toString(),
                receivingParty: deliveryPartner?.receivingParty,
                outputFormat: deliveryPartner?.outputFormat,
                cwrVersion: deliveryPartner?.cwrVersion,
                territory: deliveryPartner?.territory,
                filterType: 'specific',
                'filter.workIds': selectedWorks }, (response) => {
                if (response.status === 200) {
                  $('#addToDeliveryModal').modal('hide');
                  Loader.success('Delivery Successfully Created');
                  $window.location.href = `#/deliveries/${response.data._id}/edit`;
                } else {
                  Loader.error('Error creating Delivery, please try again or contact support');
                }
              })
                .catch((response) => {
                  Loader.error(`The object has not been saved.  ${response.data.message}`);
                });
            } else {
              Loader.error('Error loading Delivery Partner, please try again or contact support');
            }
          });
        } else {
          $('#addToDeliveryModal').modal('hide');
          Loader.error('Choose at least one Work and a Delivery Partner');
        }
        $scope.addToDelivery = {};
        $scope.showCreateDelivery = $scope.createNewDelivery(false);
      };

      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = orderDir;
        controller.filter($scope.filter);
        Loader.complete();
      };

      $scope.partnersFilter = { text: null, orderBy: 'name', orderDir: 'asc', page: 1, limit: 1000, select: 'name receivingParty' };

      $scope.getPartnersSortedData = function (orderBy, orderDir) {
        $scope.partnersFilter.orderBy = orderBy;
        $scope.partnersFilter.orderDir = orderDir;
        getDeliveryPartners();
      };

      const getDeliveryPartners = function () {
        Loader.load();
        DeliveryPartner.allCwr($scope.partnersFilter, (response) => {
          if (response.status === 200) {
            $scope.partners = response.data.deliveryPartners;
            for (let i = 0; i < $scope.partners.length; i += 1) {
              const obj = $scope.partners[i];
              if (!obj.title) { obj.title = '<i>New Delivery Partner</i>'; }
            }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.updateDeliveryStatus = function () {
        const selectedWorks = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });

        const selectedPartners = [];
        $scope.partners.forEach((partner) => {
          if (partner.selected) {
            selectedPartners.push(partner._id);
          }
        });

        Loader.load();

        if (!$scope.partnersFilter.deliveryStatus) {
          return Loader.error('A delivery status is required');
        }

        if (!selectedPartners.length) {
          return Loader.error('At least one Partner needs to be selected');
        }

        if (selectedWorks.length === 0) {
          $scope._confirmedPartners = selectedPartners;
          $scope._confirmedStatus = $scope.partnersFilter.deliveryStatus;
          $('#updateDeliveryStatus').modal('hide');
          controller.filter($scope.filter, () => {
            const count = $scope.total.toLocaleString();
            $scope.deliveryStatusConfirmMessage = `You are about to update the delivery status on <strong>${count} works</strong> - `
              + `all works matching your current filter. No works are individually selected, so every one of these <strong>${count} works</strong> will be affected. This cannot be undone.`;
            $('#deliveryStatusConfirmModal').modal('show');
          });
          return;
        }

        Work.updateBulkDeliveryStatus({ ids: selectedWorks, filter: $scope.filter, deliveryPartnerIds: selectedPartners, deliveryStatus: $scope.partnersFilter.deliveryStatus }, (response) => {
          if (response.status === 200) {
            $('#updateDeliveryStatus').modal('hide');
            Loader.success('Delivery status successfully updated');
          } else {
            Loader.error('Error updating status, please try again or contact support');
          }
        }).catch(() => {
          Loader.error('Error updating status, please try again or contact support');
        });
      };

      $scope.confirmBulkDeliveryStatus = function () {
        Loader.load();
        Work.updateBulkDeliveryStatus({ ids: [], filter: $scope.filter, deliveryPartnerIds: $scope._confirmedPartners, deliveryStatus: $scope._confirmedStatus }, (response) => {
          if (response.status === 200) {
            Loader.success('Delivery status successfully updated');
          } else {
            Loader.error('Error updating status, please try again or contact support');
          }
        }).catch(() => {
          Loader.error('Error updating status, please try again or contact support');
        });
      };

      $scope.search = function () {
        addStoredIdentifierEntry();
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Works Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function (type) {
        let works = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';

        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              works = $scope.bulkDeleteIds.split('\n');
              works.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            $scope.works.forEach((work) => {
              if (work.selected) {
                works.push(work._id);
              }
            });
          }

          if (works.length > 0) {
            Loader.load();
            Work.delete('multi', works, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Succesfully deleted all requested works
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${works.length} works successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The works have not been deleted due to an error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The works have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The works have not been deleted. ${response.data.message}`);
            });
          } else {
            const message = (type === 'bulk') ? 'Please paste in at least one work ID to delete' : 'Select at least one work to delete';
            Loader.error(message);
          }
        });
      };

      $scope.approveMany = function () {
        const works = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            works.push(work._id);
          }
        });
        if (works.length > 0) {
          Loader.load();
          Work.approveMany(works, (response) => {
            // Received success response 200 or not
            if (response.status === 200) {
              const { approved, failed } = response.data;
              controller.filter($scope.filter);
              if (failed.length > 0) {
                Loader.warning(`${approved.length} work${(approved.length > 1 || approved.length === 0) ? 's' : ''} approved, ${failed.length} work${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} not being Ready for Approval or already Approved. Check the status of the works and try again`);
              } else {
                Loader.success(`${approved.length} work${(approved.length > 1 || approved.length === 0) ? 's' : ''} approved`);
              }
            } else {
              // No received 200: We have prevented approval
              Loader.error('The works have not been approved.');
            }
          }).catch((response) => {
            // Server returned an error response
            Loader.error(`The works have not been approved. ${response.data.message}`);
          });
        } else {
          const message = 'Select at least one work to approved';
          Loader.error(message);
        }
      };

      $scope.holdMany = function () {
        const works = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            works.push(work._id);
          }
        });
        if (works.length > 0) {
          Loader.load();
          Work.holdMany(works, (response) => {
            // Received success response 200 or not
            if (response.status === 200) {
              const { putOnHold, failed } = response.data;
              controller.filter($scope.filter);
              if (failed.length > 0) {
                Loader.warning(`${putOnHold.length} work${(putOnHold.length > 1 || putOnHold.length === 0) ? 's' : ''} put On Hold, ${failed.length} work${(failed.length > 1) ? 's' : ''} unchanged`);
              } else {
                Loader.success(`${putOnHold.length} work${(putOnHold.length > 1 || putOnHold.length === 0) ? 's' : ''} put On Hold`);
              }
            } else {
              // No received 200: We have prevented approval
              Loader.error('The works have not been put On Hold.');
            }
          }).catch((response) => {
            // Server returned an error response
            Loader.error(`The works have not been put On Hold. ${response.data.message}`);
          });
        } else {
          const message = 'Select at least one work to put On Hold';
          Loader.error(message);
        }
      };

      $scope.resumeMany = function () {
        const works = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            works.push(work._id);
          }
        });
        if (works.length > 0) {
          Loader.load();
          Work.resumeMany(works, (response) => {
            // Received success response 200 or not
            if (response.status === 200) {
              const { resumed, failed } = response.data;
              controller.filter($scope.filter);
              if (failed.length > 0) {
                Loader.warning(`${resumed.length} work${(resumed.length > 1 || resumed.length === 0) ? 's' : ''} Resumed, ${failed.length} work${(failed.length > 1) ? 's' : ''} unchanged`);
              } else {
                Loader.success(`${resumed.length} work${(resumed.length > 1 || resumed.length === 0) ? 's' : ''} Resumed`);
              }
            } else {
              // No received 200: We have prevented approval
              Loader.error('The works have not been Resumed.');
            }
          }).catch((response) => {
            // Server returned an error response
            Loader.error(`The works have not been Resumed. ${response.data.message}`);
          });
        } else {
          const message = 'Select at least one work to Resume';
          Loader.error(message);
        }
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : 'false';
        Work.import($scope.importFile, overwriteBlanks, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Works are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.updateCatalogue = function () {
        Loader.load();
        Work.updateCatalogue($scope.importFile, (response) => {
          if (response.status === 200) {
            $('#updateCatalogueModal').modal('hide');
            Loader.success("We're updating the Main Identifier, a report will be sent to you shortly");
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.export = function () {
        const selectedWorks = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });
        const params = JSON.parse(JSON.stringify($scope.filter));
        for (const key in params) {
          if (Array.isArray(params[key]) && params[key].length === 0) {
            delete params[key];
          } else if (params[key] === null) {
            delete params[key];
          }
        }
        const data = { filter: params };
        if (selectedWorks.length > 0) {
          data.ids = selectedWorks;
        }
        Loader.load();
        Work.export(data, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.rawExport = function () {
        const selectedWorks = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });

        const params = JSON.parse(JSON.stringify($scope.filter));
        for (const key in params) {
          if (Array.isArray(params[key]) && params[key].length === 0) {
            delete params[key];
          } else if (params[key] === null) {
            delete params[key];
          }
        }

        Loader.load();
        Work.rawExport({ ids: selectedWorks, filter: params }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.exportErroredWorks = async () => {
        Loader.load();
        const selectedWorks = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });
        const params = JSON.parse(JSON.stringify($scope.filter));
        for (const key in params) {
          if (Array.isArray(params[key]) && params[key].length === 0) {
            delete params[key];
          } else if (params[key] === null) {
            delete params[key];
          }
        }

        const response = await Work.exportValidationErrors({ ids: selectedWorks, filter: params });

        if (response.status === 200) {
          Loader.success('Your report will be sent to you shortly');
        } else {
          Loader.error(response.data.message);
        }

        $scope.$applyAsync();
      };

      $scope.deliverWorks = function () {
        const selectedWorks = [];
        $scope.works.forEach((work) => {
          if (work.selected) {
            selectedWorks.push(work._id);
          }
        });

        Loader.load();
        Work.createDelivery({ ids: selectedWorks, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Delivery created successfully');
            $window.location.href = `#/deliveries/${response.data._id}/edit`;
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.showIdentifierBulkModal = function () {
        $('#identifierBulkModal').modal('show');
      };

      $scope.includeBulkIdentifiers = function () {
        $('#identifierBulkModal').modal('hide');
        // Get the IDs from the modal
        const bulkIds = $scope.bulkIncludeIds.split('\n');
        delete $scope.bulkIncludeIds;
        addIdentifiersToFilter(bulkIds);
      };

      function addIdentifiersToFilter(ids) {
        if (!$scope.filter) { $scope.filter = {}; }
        if (!$scope.filter.identifiers) { $scope.filter.identifiers = []; }
        const workIds = $scope.filter.identifiers.concat(ids);
        const uniqueIds = workIds.filter((item, pos) => workIds.indexOf(item) === pos && item !== '');
        $scope.filter.identifiers = uniqueIds;
      }

      $scope.storeIdentifierEntry = function (input) {
        $scope.identifierEntry = input;
      };

      $scope.identifierFilterChange = function (isOpen) {
        if (!isOpen) {
          addStoredIdentifierEntry();
        }
      };
      function addStoredIdentifierEntry() {
        addIdentifiersToFilter([$scope.identifierEntry]);
        $scope.identifierEntry = '';
      }
      const headersWithDeliveries = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        link: '/#/works/[id]/edit',
        required: true,
      },
      { title: 'Composer', name: 'composer', sortable: true, required: true },
      { title: 'Main identifier', name: 'identifier', sortable: true },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      {
        title: 'Ownership',
        name: 'totalCollection',
        sortable: true,
        type: 'nested',
        field: 'totalOwnedMechanical',
        showAsLabel: true,
      },
      { title: 'Participation', name: 'totalParticipation', sortable: true, type: 'participation', showAsLabel: true },
      { title: 'Status', name: 'status', type: 'status', showStatus: true, tooltip: 'Work' },
      ];

      const headersNoDeliveries = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        link: '/#/works/[id]/edit',
        required: true,
      },
      { title: 'Composer', name: 'composer', sortable: true, required: true },
      { title: 'Main identifier', name: 'identifier', sortable: true },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      {
        title: 'Ownership',
        name: 'totalCollection',
        sortable: true,
        type: 'nested',
        field: 'totalOwnedMechanical',
        showAsLabel: true,
      },
      { title: 'Participation', name: 'totalParticipation', sortable: true, type: 'participation', showAsLabel: true },
      ];

      $scope.partnersHeaders = [
        { title: 'Name', name: 'name', sortable: true },
        { title: 'Receiving Party', name: 'receivingParty', sortable: true },
      ];

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            $scope.headers = $scope.features?.deliveries ? headersWithDeliveries : headersNoDeliveries;
          });
        });
      });

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      this.filter($scope.filter);

      getDeliveryPartners();

      $scope.showFlushContractsModal = function () {
        $('#validationModal').modal('show');
      };

      $scope.flushContractsFromIpChains = function () {
        const selectedWorks = $scope.works.filter((work) => work.selected).map((work) => work._id);
        Loader.load();
        Work.flushContracts({ ids: selectedWorks, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        }).catch((err) => {
          Loader.error(err.data.message);
        });
      };

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'work' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Work Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };
    },
  ]);
