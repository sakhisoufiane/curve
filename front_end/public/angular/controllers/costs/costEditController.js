angular.module('Curve')
  .controller('costEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Cost', 'Notification', 'Settings', 'Upload', 'Territories', '$timeout', 'Loader', 'Release', 'Track', 'Contract', 'Uploader', 'Currencies',
    function ($rootScope, $scope, $routeParams, $window, Session, Cost, Notification, Settings, Upload, Territories, $timeout, Loader, Release, Track, Contract, Uploader, Currencies) {
      $window.scrollTo(0, 0);
      $scope.costTypes = [];
      $scope.currencies = Currencies;
      $scope.releases = [];
      $scope.tracks = [];
      $scope.works = [];
      $scope.contracts = [];
      $scope.territories = Territories;
      $scope.datePopup = false;
      $scope.cost = { fileName: null };
      $scope.files = [];
      $scope.validFileTypes = $rootScope.validFileTypesGeneral;
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
      $scope.rights = {};
      $scope.currencySymbol = Session.currencySymbol;
      if (Session.clientCurrencies) {
        $scope.clientCurrencies = Session.clientCurrencies.slice();
        $scope.clientCurrencies.unshift('Home Currency');
      }
      $scope.warningMessages = [];

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.sales === 'None') {
            $location.path('/');
          }
        }
      });

      // Load Cost if ID exists
      if ($routeParams.id) {
        Loader.load();
        Cost.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.cost = response.data;
            organiseCatalogueMapping();
            checkForWarnings();
            $scope.files = response.data.files;
            if ($scope.cost.date) { $scope.cost.date = new Date(response.data.date); }
            $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
            loadCurrentReleases();
            loadCurrentTracks();
            loadCurrentContracts();
            Loader.complete();
          } else {
            Loader.error('Error loading cost, please try again or contact support');
          }
        });
      } else if (Cost.copiedCost) {
        delete Cost.copiedCost._id;
        delete Cost.copiedCost.createdAt;
        delete Cost.copiedCost.UpdatedAt;
        delete Cost.copiedCost.reportedStatus;
        delete Cost.copiedCost.calculationContractIds;
        delete Cost.copiedCost.periodIds;
        delete Cost.copiedCost.archived;
        delete Cost.copiedCost.files;
        if (Cost.copiedCost.name) {
          Cost.copiedCost.name += ' - Copy';
        }
        $scope.cost = Cost.copiedCost;
        delete Cost.copiedCost;
        $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
      }

      Settings.getSettings()
        .then((settings) => {
          angular.extend($scope, settings);
        });

      $scope.groupFind = function (territory) {
        return territory.continent;
      };

      $scope.openDatePopup = function () {
        $scope.datePopup = true;
      };

      $scope.upload = function (file) {
        if ($scope.cost._id) {
          return Upload.upload({
            url: 'http://localhost:8081/costs/upload',
            method: 'POST',
            data: {
              file,
              cost_id: $scope.cost._id,
            },
          })
            .then((resp) => {
              $scope.file = null;
              return resp;
            });
        }
      };

      $scope.uploadFiles = function (files) {
        if (files.length) {
          Loader.load();
          uploadSingleFile(files, 0, () => {
            Loader.success('Files successfully uploaded');
          });
        }
        function uploadSingleFile(files, index, callback) {
          Uploader.upload(files[index], `/costs/${$scope.cost._id}/upload`).then((response) => {
            if (response.data.type === 'Processing') {
              Loader.success('File is currently processing, check back to the file shortly');
            } else {
              const responseFiles = response.files === undefined ? response.data.files : response.files;
              const version = response.version === undefined ? response.data.version : response.version;
              $scope.cost.__v = version;
              updateFiles(responseFiles);
              if (files[index + 1]) {
                uploadSingleFile(files, index + 1, callback);
              } else {
                callback();
              }
            }
          });
        }
      };

      function updateFiles(files) {
        $scope.$apply(() => {
          $scope.cost.files = files;
          $scope.files = $scope.cost.files;
        });
      }

      $scope.deleteFileConfirm = function (key) {
        $scope.deleteFileKey = key;
      };

      $scope.deleteFile = function () {
        Loader.load();
        // Prepare Key
        let { deleteFileKey } = $scope;
        deleteFileKey = deleteFileKey.replace(/\//g, '-');
        // Call API
        Cost.deleteFile($scope.cost._id, deleteFileKey, (response) => {
          $('#deleteFileModal').modal('hide');
          if (response.status === 200) {
            $scope.cost.files = response.files === undefined ? response.data.files : response.files;
            $scope.files = $scope.cost.files;
            const version = response.version === undefined ? response.data.version : response.version;
            $scope.cost.__v = version;
            Loader.success('File successfully deleted');
          } else if (response.status === 201) {
            $scope.deletionError = response.data;
            Loader.error('File cannot be deleted as it is in use');
          } else {
            Loader.error('Error deleting file, please try again or contact support');
          }
        });
      };

      $scope.copy = function () {
        Cost.copiedCost = $scope.cost;
        $window.location.href = '#/costs/new';
      };

      function checkForWarnings() {
        $scope.warningMessages = [];

        if ($scope.cost.amount < 0) {
          $scope.warningMessages.push('Costs should be positive, unless you are refunding a cost to a contract');
        }
        if ($scope.cost.contractIds.length > 1 || $scope.cost.releaseIds.length > 1 || $scope.cost.trackIds.length > 1) {
          $scope.warningMessages.push('This cost previously contained multiple catalogue or contract items attached to it. This is no longer allowed, and only one item is allowed to be attached. If you save this cost, it will lose those multiple attachments.');
        }
      }

      function organiseCatalogueMapping() {
        $scope.cost.trackId = $scope.cost.trackIds[0];
        $scope.cost.releaseId = $scope.cost.releaseIds[0];
        $scope.cost.contractId = $scope.cost.contractIds[0];
      }

      function sanitiseCatalogue() {
        $scope.cost.releaseIds = [$scope.cost.releaseId];
        $scope.cost.trackIds = [$scope.cost.trackId];
        $scope.cost.contractIds = [$scope.cost.contractId];

        // Clear any null values from array
        $scope.cost.releaseIds = $scope.cost.releaseIds.filter((releaseId) => releaseId);
        $scope.cost.trackIds = $scope.cost.trackIds.filter((trackId) => trackId);
        $scope.cost.contractIds = $scope.cost.contractIds.filter((contractId) => contractId);

        // Clear extra fields
        delete $scope.cost.trackId;
        delete $scope.cost.releaseId;
        delete $scope.cost.contractId;
      }

      $scope.save = function () {
        sanitiseCatalogue();
        Loader.load();
        // Browsers can produce undefined for invalid type="number" input (e.g. commas), which JSON.stringify drops — coerce to null to keep the field in the payload.
        if ($scope.cost.amount === undefined) $scope.cost.amount = null;
        if (!$scope.cost._id) {
          Cost.create($scope.cost, (response) => {
            if (response.status === 200) {
              $scope.cost._id = response.data._id;
              $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
              if ($scope.file) {
                $scope.upload($scope.file)
                  .then(() => {
                    $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
                    $window.location.href = `#/costs/${response.data._id}/edit`;
                    Loader.success('Cost successfully created');
                  });
              } else {
                $window.location.href = `#/costs/${response.data._id}/edit`;
                Loader.success('Cost successfully created');
              }
            } else {
              Loader.error('Error creating cost, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          Cost.update($scope.cost._id, $scope.cost, (response) => {
            if (response.status === 200) {
              $scope.cost = response.data;
              organiseCatalogueMapping();
              checkForWarnings();
              if ($scope.cost.date) { $scope.cost.date = new Date(response.data.date); }
              $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
              if ($scope.file) {
                $scope.upload($scope.file)
                  .then((resp) => {
                    $scope.cost = resp.data;
                    $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
                    Loader.success('Cost successfully saved');
                  });
              } else {
                Loader.success('Cost successfully saved');
              }
            } else {
              Loader.error('Error saving cost, please try again or contact support');
            }
          })
            .catch((response) => {
              organiseCatalogueMapping();
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Cost.delete($scope.cost._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/costs';
              Loader.success('Cost successfully deleted');
            } else if (response.status === 201) {
              $scope.deletionError = response.data;
              Loader.error('This Cost cannot be deleted as it is in use.');
            } else {
              Loader.error('Error deleting release, please try again or contact support');
            }
          });
        });
      };

      $scope.toggleArchived = function () {
        $scope.cost.archived = !$scope.cost.archived;
        const ids = [$scope.cost._id];

        Cost.archiveMany(ids, $scope.cost.archived, (response) => {
          if (response.status === 200) {
            const messageText = ($scope.cost.archived) ? 'archived' : 'unarchived';
            Loader.success(`Cost "${$scope.cost.name}" has been ${messageText}`);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const current = JSON.parse(angular.toJson($scope.cost));
        delete current.tracks;
        delete current.archived;
        delete $scope.originalObj.archived;

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
            $scope.cost = $scope.originalObj;
          }
        }
      }

      $scope.searchReleases = function (select) {
        Release.all({ text: select.search }, (response) => {
          $scope.releases = response.data.releases;
        });
      };

      function loadCurrentReleases() {
        if ($scope.cost.releaseIds && $scope.cost.releaseIds.length > 0) {
          Release.all({ ids: $scope.cost.releaseIds }, (response) => {
            $scope.releases = response.data.releases;
          });
        }
      }

      $scope.searchTracks = function (select) {
        Track.all({ text: select.search }, (response) => {
          $scope.tracks = response.data.tracks;
        });
      };

      function loadCurrentTracks() {
        if ($scope.cost.trackIds && $scope.cost.trackIds.length > 0) {
          Track.all({ ids: $scope.cost.trackIds }, (response) => {
            $scope.tracks = response.data.tracks;
          });
        }
      }

      $scope.searchContracts = function (select) {
        Contract.all({ text: select.search }, (response) => {
          $scope.contracts = response.data.contracts;
        });
      };

      function loadCurrentContracts() {
        if ($scope.cost.contractIds && $scope.cost.contractIds.length > 0) {
          Contract.all({ ids: $scope.cost.contractIds }, (response) => {
            $scope.contracts = response.data.contracts;
          });
        }
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.cost._id) {
          Cost.modelHistory($scope.cost._id, (response) => {
            if (response.status === 200) {
              $scope.cost.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.cost));
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
    },
  ]);
