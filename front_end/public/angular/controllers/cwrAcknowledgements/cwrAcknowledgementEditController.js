angular.module('Curve')
  .controller('CwrAcknowledgementEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'CwrAcknowledgement', 'Delivery', 'Territories', 'Notification', 'Fields', 'Loader', 'Settings', 'Work', 'Pagination', 'Uploader', 'DeliveryPartner',
    function ($rootScope, $scope, $routeParams, $window, Session, CwrAcknowledgement, Delivery, Territories, Notification, Fields, Loader, Settings, Work, Pagination, Uploader, DeliveryPartner) {
      $window.scrollTo(0, 0);
      $scope.clientType = Session.clientType;
      $scope.cwrAcknowledgement = {
        clientId: Session.clientId,
        workIds: [],
      };

      $scope.rights = {};
      $scope.isShowingAll = false;

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
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

      // Wait till file ingested
      function init(callback) {
        if ($routeParams.id) {
          CwrAcknowledgement.get($routeParams.id, (response) => {
            if (response.status === 200) {
              $scope.cwrAcknowledgement = response.data;
              const cutoffDate = new Date('2023-08-06T00:00:00.000Z');
              const updatedAt = new Date($scope.cwrAcknowledgement.updatedAt);
              $scope.v1 = false;
              if (updatedAt < cutoffDate) {
                $scope.v1 = true;
              }
              $scope.worksPagination.deliveryPartnerId = $scope.cwrAcknowledgement?.deliveryPartnerId?._id;

              if ($scope.cwrAcknowledgement.deliveryPartnerId && $scope.cwrAcknowledgement.deliveryPartnerId._id) {
                Delivery.all({ deliveryPartnerId: $scope.cwrAcknowledgement.deliveryPartnerId._id }, (response) => {
                  if (response.status === 200) {
                    $scope.deliveries = response.data.cwrDeliveries;
                  } else {
                    Loader.error(response.data.message);
                  }
                });
              }
              DeliveryPartner.allCwr({ receivingParty: $scope.cwrAcknowledgement.source }, (response) => {
                if (response.status === 200) {
                  $scope.deliveryPartners = response.data.deliveryPartners;
                } else {
                  Loader.error(response.data.message);
                }
              })
                .catch(() => {
                  Loader.error('Error loading delivery partners, please try again or contact support');
                });

              if ($scope.cwrAcknowledgement.status === 'Queued' || $scope.cwrAcknowledgement.status === 'In Progress') {
                setTimeout(init, 5000);
              } else {
                loadAssociatedWorks(() => {
                  Loader.complete();
                });
              }
              $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
              if (callback) { callback(); }
            } else {
              if (callback) { callback(); }
              Loader.error('Error loading Acknowledgement, please try again or contact support');
            }
          });
        }
      }

      $scope.searchDeliveries = function (select) {
        if ($scope.cwrAcknowledgement.deliveryPartnerId && $scope.cwrAcknowledgement.deliveryPartnerId._id) {
          Delivery.all({ text: select.search, deliveryPartnerId: $scope.cwrAcknowledgement.deliveryPartnerId._id }, (response) => {
            if (response.status === 200) {
              $scope.deliveries = response.data.cwrDeliveries;
            } else {
              Loader.error('Could not load deliveries');
            }
          });
        }
      };

      $scope.toggleArchived = function () {
        $scope.cwrAcknowledgement.archived = !$scope.cwrAcknowledgement.archived;
        const ids = [$scope.cwrAcknowledgement._id];
        const method = ($scope.cwrAcknowledgement.archived) ? 'archiveMany' : 'unarchiveMany';

        CwrAcknowledgement[method](ids, (response) => {
          if (response.status === 200) {
            const messageText = ($scope.cwrAcknowledgement.archived) ? 'archived' : 'unarchived';
            Loader.success(`Acknowledgement "${$scope.cwrAcknowledgement.name}" has been ${messageText}`);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.worksPagination = { status: 'All' };
      function loadAssociatedWorks(callback) {
        if ($scope.cwrAcknowledgement?.deliveryPartnerId?._id && !$scope.v1) {
          CwrAcknowledgement.getWorks($scope.cwrAcknowledgement._id, $scope.worksPagination, (response) => {
            if (response.status === 200) {
              $scope.associatedWorks = response.data.deliveryLogs;
              // lets filter down the delivery log to just the acknowledgement
              for (let i = 0; i < $scope.associatedWorks.length; i += 1) {
                const work = $scope.associatedWorks[i];
                const filteredLog = work.log.filter((logEntry) => logEntry.acknowledgementId === $scope.cwrAcknowledgement._id);
                // sort the log by descending date in case the file is re-ingested
                filteredLog.sort((a, b) => new Date(b.date) - new Date(a.date));
                $scope.associatedWorks[i].log = filteredLog;
              }
              $scope.totalPages = response.data.meta.totalPages;
              $scope.currentPage = response.data.meta.currentPage;
              if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
                $scope.total = response.data.meta.total;
              }
              $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
              callback();
            } else {
              callback('Error loading associated works, please try again or contact support');
            }
          });
        } else if ($scope.v1) {
          CwrAcknowledgement.getWorks_v1($scope.cwrAcknowledgement._id, $scope.worksPagination, (response) => {
            if (response.status === 200) {
              $scope.associatedWorks = response.data.works;
              $scope.totalPages = response.data.meta.totalPages;
              $scope.currentPage = response.data.meta.currentPage;
              if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
                $scope.total = response.data.meta.total;
              }
              $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
              callback();
            } else {
              callback('Error loading associated works, please try again or contact support');
            }
          });
        }
        callback();
      }

      $scope.onSelectedStatus = function () {
        Loader.load();
        $scope.worksPagination.page = 1;
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };

      $scope.export = function () {
        Loader.load();
        CwrAcknowledgement.export($scope.cwrAcknowledgement._id, { paginationParams: $scope.worksPagination, v1: $scope.v1 }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.redeliverWorks = function () {
        Loader.load();
        if (!$scope.cwrAcknowledgement.deliveryPartnerId && $scope.cwrAcknowledgement.status !== 'Complete') {
          Loader.error('Unable to determine Delivery Partner. Please select the Delivery Partner manually');
          Loader.complete();
        } else {
          CwrAcknowledgement.redeliverWorks($scope.cwrAcknowledgement._id, { status: 'Rejected' }, (response) => {
            if (response.status === 200) {
              Loader.success('Delivery created successfully');
              $window.location.href = `#/deliveries/${response.data._id}/edit`;
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.workHeaders = [{
        title: 'Title',
        name: 'title',
        sortable: false,
        onCellClick(id) {
          $location.path(`/works/${id}/edit`);
        },
        required: true,
      },
      { title: 'Composer', name: 'composer', sortable: false, required: true },
      { title: 'Main identifier', name: 'identifier', sortable: false },
      ];

      $scope.getOrderByValue = (orderBy) => {
        let orderByValue;
        if ($scope.v1) {
          if (orderBy === 'title') {
            orderByValue = 'workId.title';
          } else if (orderBy === 'composers') {
            orderByValue = 'workId.composer';
          } else if (orderBy === 'main identifier') {
            orderByValue = 'workId.identifier';
          } else if (orderBy === 'returned id') {
            orderByValue = 'partnerId';
          } else if (orderBy === 'iswc') {
            orderByValue = 'iswc';
          } else if (orderBy === 'status') {
            orderByValue = 'status';
          }
        } else if (orderBy === 'title') {
          orderByValue = 'workId.title';
        } else if (orderBy === 'composers') {
          orderByValue = 'workId.composer';
        } else if (orderBy === 'main identifier') {
          orderByValue = 'workId.identifier';
        } else if (orderBy === 'returned id') {
          orderByValue = 'log.partnerId';
        } else if (orderBy === 'iswc') {
          orderByValue = 'log.iswc';
        } else if (orderBy === 'status') {
          orderByValue = 'log.status';
        }

        return orderByValue;
      };

      $scope.whatClassIsIt = function (field) {
        if ($scope.worksPagination.orderBy === $scope.getOrderByValue(field)) {
          if ($scope.worksPagination.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.worksPagination.orderDir = 'asc';

      $scope.getSortedData = function (orderBy) {
        orderBy = $scope.getOrderByValue(orderBy);
        $scope.worksPagination.orderBy = orderBy;
        $scope.worksPagination.orderDir = $scope.worksPagination.orderDir === 'asc' ? 'desc' : 'asc';
        Loader.load();
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };

      $scope.changePage = function (page) {
        $scope.worksPagination.page = page;
        Loader.load();
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };

      $scope.selectFile = function (file) {
        $scope.file = file;
      };

      $scope.save = save;

      function save(callback) {
        Loader.load();
        if (!$scope.cwrAcknowledgement._id) {
          CwrAcknowledgement.create($scope.cwrAcknowledgement, (response) => {
            if (response.status === 200) {
              $scope.cwrAcknowledgement = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
              if ($scope.file) {
                upload($scope.file, () => {
                  $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
                  $window.location.href = '#/cwrAcknowledgements/';
                });
              } else {
                Loader.success('Acknowledgement successfully created');
                $window.location.href = `#/cwrAcknowledgements/${response.data._id}/edit`;
              }
            } else {
              Loader.error('Error creating Acknowledgement, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          CwrAcknowledgement.update($scope.cwrAcknowledgement._id, $scope.cwrAcknowledgement, (response) => {
            if (response.status === 200) {
              $scope.cwrAcknowledgement = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
              if ($scope.file) {
                upload($scope.file, () => {
                  // Remove file upload
                  $('#fileUploadField').val(null);
                  $scope.file = null;
                  // Reload CWR Acknowledgement
                  CwrAcknowledgement.get($scope.cwrAcknowledgement._id, (response) => {
                    if (response.status === 200) {
                      $scope.cwrAcknowledgement = response.data;
                      $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
                      Loader.success('Acknowledgement successfully saved and triggered for ingestion. You will be notified when it is complete.');
                      $window.location.href = '#/cwrAcknowledgements/';
                    }
                  });
                });
              } else {
                $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
                Loader.success('Acknowledgement successfully saved');
              }
            } else {
              Loader.error('Error saving Acknowledgement, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      }

      $scope.saveLinkedDelivery = function () {
        Loader.load();
        $('#linkDeliveryModal').modal('hide');
        CwrAcknowledgement.update($scope.cwrAcknowledgement._id, $scope.cwrAcknowledgement, (response) => {
          if (response.status === 200) {
            $scope.cwrAcknowledgement = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
            Loader.success('Acknowledgement successfully saved');
          } else {
            Loader.error('Error saving Acknowledgement, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The object has not been saved.  ${response.data.message}`);
        });
      };

      function upload(file, callback) {
        Uploader.upload(file, `/cwrAcknowledgements/${$scope.cwrAcknowledgement._id}/get_upload_credentials`).then((response) => {
          callback(response);
        });
      }

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          CwrAcknowledgement.delete($scope.cwrAcknowledgement._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/cwrAcknowledgements';
              Loader.success('Acknowledgement Successfully Deleted');
            } else {
              Loader.error('Error deleting Acknowledgement, please try again or contact support');
            }
          });
        });
      };

      $scope.import = function () {
        Loader.load();
        CwrAcknowledgement.importAcknowledgement($scope.cwrAcknowledgement._id, $scope.importFile, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Acknowledgement is importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      $scope.$on('$locationChangeStart', (event) => {
        const current = JSON.parse(angular.toJson($scope.cwrAcknowledgement));

        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm('You have unsaved changes. Are you sure you want to leave this page?');
          if (!answer) {
            event.preventDefault();
          }
        }
      });

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.delivery._id) {
          CwrAcknowledgement.modelHistory($scope.cwrAcknowledgement._id, (response) => {
            if (response.status === 200) {
              $scope.cwrAcknowledgement.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
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

      $scope.formatNumber = function (num) {
        if (num >= 1000) {
          return `${Math.floor(num / 1000)}k`;
        }
        return num;
      };

      $scope.showAll = function () {
        $scope.worksPagination = {
          status: $scope.worksPagination.status ? $scope.worksPagination.status : 'All',
          deliveryPartnerId: $scope.cwrAcknowledgement.deliveryPartnerId._id,
          limit: 1000,
          page: 1,
        };
        $scope.isShowingAll = true;
        Loader.load();
        loadAssociatedWorks(() => {
          Loader.complete();
        });
      };

      $scope.reingestCwrAcknowledgement = function () {
        Loader.load();
        CwrAcknowledgement.update($scope.cwrAcknowledgement._id, $scope.cwrAcknowledgement, (response) => {
          if (response.status === 200) {
            $scope.cwrAcknowledgement = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.cwrAcknowledgement));
            CwrAcknowledgement.reingest($scope.cwrAcknowledgement._id, $scope.cwrAcknowledgement, (response) => {
              Loader.success(`Acknowledgement ${JSON.stringify(response.data.name)} successfully sent for reingestion`);
            });
          } else {
            Loader.error('Error reingesting Acknowledgement, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The object has not been saved.  ${response.data.message}`);
        });
      };
    },
  ]);
