angular.module('Curve')
  .controller('trackEditController', ['$rootScope', '$scope', '$routeParams', '$window', '$location', 'Session', 'Track', 'Parent', 'Settings', 'Notification', 'Loader', '$timeout',
    function ($rootScope, $scope, $routeParams, $window, $location, Session, Track, Parent, Settings, Notification, Loader, $timeout) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.track = { salesReturnsRights: [], costsRights: [], releaseSpecificSalesReturnsRights: [], mechanicalLicenses: [] };
      $scope.canUseAlternativeId = false;
      $scope.releases = null;
      $scope.contracts = [];
      $scope.catalogueGroups = [];
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.track));
      $scope.mechanicalsRowsMode = 'editing';
      $scope.mechanicalsShowToggleButton = false;
      $scope.newMechanicalLicenses = {};
      $scope.features = $rootScope.features;
      $scope.rights = {};
      $scope.clientType = $rootScope.clientType;
      $scope.mechanicalCalculationBasisTypes = [{ label: 'Sale Date', value: 'Sale Date' }, { label: 'Custom', value: 'Custom' }];
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
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
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            updateCanUseAlternativeId();
          });
        });
      });

      if ($routeParams.id) {
        Loader.load();
        Track.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.track = response.data;
            updateCanUseAlternativeId();
            initAnalyticsConfig();
            Loader.complete();
            $scope.originalObj = JSON.parse(angular.toJson($scope.track));
            if ($scope.track.mechanicalLicenses && $scope.track.mechanicalLicenses.length > 10) {
              $scope.mechanicalsRowsMode = 'readOnly';
              $scope.mechanicalsShowToggleButton = true;
            }
          } else {
            Loader.error('Error loading track, please try again or contact support');
          }
        });
      } else if (Track.copiedTrack) {
        delete Track.copiedTrack._id;
        delete Track.copiedTrack.createdAt;
        delete Track.copiedTrack.UpdatedAt;
        if (Track.copiedTrack.title) {
          Track.copiedTrack.title += ' - Copy';
        }
        if (Track.copiedTrack.isrc) {
          Track.copiedTrack.isrc += ' - Copy';
        }
        $scope.track = Track.copiedTrack;
        updateCanUseAlternativeId();
        $scope.originalObj = JSON.parse(angular.toJson($scope.track));
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        Track.copiedTrack = $scope.track;
        delete Track.copiedTrack.aliases;
        $scope.leavingForCopy = true;
        $window.location.href = '#/tracks/new';
      };

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.track-item').find('span.icon-thumbnail').addClass('white');

      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);
          if (!$scope.track._id) {
            $scope.track.mechanicalCalculationBasis = settings.defaultMechanicalBasis;
            $scope.track.reportMechanicals = settings.defaultReportMechanicals;
          }

          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });

      Settings.getMechanicalContracts()
        .then((contracts) => {
          $scope.mechanicalContracts = contracts.contracts;
        });

      $scope.addSalesReturnsRights = function () {
        $scope.track.salesReturnsRights.push({ percentage: 100 });
      };
      $scope.deleteSalesReturnsRights = function (contract) {
        const index = $scope.track.salesReturnsRights.indexOf(contract);
        $scope.track.salesReturnsRights.splice(index, 1);
      };
      $scope.addReleaseSpecificSalesReturnsRights = function () {
        $scope.track.releaseSpecificSalesReturnsRights.push({ percentage: 100 });
      };
      $scope.deleteReleaseSpecificSalesReturnsRights = function (contract) {
        const index = $scope.track.releaseSpecificSalesReturnsRights.indexOf(contract);
        $scope.track.releaseSpecificSalesReturnsRights.splice(index, 1);
      };
      $scope.addCostsRights = function () {
        $scope.track.costsRights.push({ percentage: 100 });
      };
      $scope.deleteCostsRights = function (contract) {
        const index = $scope.track.costsRights.indexOf(contract);
        $scope.track.costsRights.splice(index, 1);
      };
      $scope.copySalesContractsToCosts = function () {
        Loader.load();
        $scope.track.costsRights = $scope.track.salesReturnsRights.slice(0);
        Loader.complete();
      };
      $scope.$watch('track.aliases', (aliases) => {
        $scope.displayAliases = [];
        if (aliases && aliases.length > 0) {
          angular.forEach(aliases, (alias) => {
            $scope.displayAliases.push({ name: alias });
          });
        }
      });
      $scope.addAlias = function () {
        $scope.displayAliases.push('');
        updateAliases();
      };
      $scope.deleteAlias = function (alias) {
        const index = $scope.displayAliases.indexOf(alias);
        $scope.displayAliases.splice(index, 1);
      };

      function updateCanUseAlternativeId() {
        $scope.canUseAlternativeId = $scope.features?.useAlternativeId || $scope.track.useAlternativeId;
      }

      function updateAliases(callback) {
        $scope.track.aliases = [];
        if ($scope.displayAliases.length > 0) {
          angular.forEach($scope.displayAliases, (alias) => {
            $scope.track.aliases.push(alias.name);
            if ($scope.track.aliases.length === $scope.displayAliases.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.addMechanicalLicense = function () {
        $scope.track.mechanicalLicenses = $scope.track.mechanicalLicenses || [];
        $scope.track.mechanicalLicenses.push({ share: 100, rate: 100 });
        // Flag the license as a new one for the mechanical rows
        $scope.newMechanicalLicenses[$scope.track.mechanicalLicenses.length - 1] = true;
      };
      $scope.deleteMechanicalLicense = function (license) {
        const index = $scope.track.mechanicalLicenses.indexOf(license);
        $scope.track.mechanicalLicenses.splice(index, 1);
      };

      $scope.$watch('track.releaseSpecificForeignIds', (releaseSpecificForeignIds) => {
        $scope.displayReleaseSpecificForeignIds = [];
        if (releaseSpecificForeignIds && Object.keys(releaseSpecificForeignIds).length > 0) {
          angular.forEach(Object.keys(releaseSpecificForeignIds), (key) => {
            $scope.displayReleaseSpecificForeignIds.push({ releaseId: key, value: releaseSpecificForeignIds[key] });
          });
        }
      });
      $scope.addReleaseSpecificForeignId = function () {
        $scope.displayReleaseSpecificForeignIds.push({});
        updateAliases();
      };
      $scope.deleteReleaseSpecificForeignId = function (item) {
        const index = $scope.displayReleaseSpecificForeignIds.indexOf(item);
        $scope.displayReleaseSpecificForeignIds.splice(index, 1);
      };

      function updateReleaseSpecificForeignId(callback) {
        $scope.track.releaseSpecificForeignIds = {};
        if ($scope.displayReleaseSpecificForeignIds.length > 0) {
          angular.forEach($scope.displayReleaseSpecificForeignIds, (item) => {
            $scope.track.releaseSpecificForeignIds[item.releaseId] = item.value;
            if (callback) { callback(); }
          });
        } else if (callback) { callback(); }
      }
      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        if (value === 'releases' && (!$scope.releases || $scope.releases.length === 0) && $scope.track._id) {
          Loader.load();
          Track.loadReleases($scope.track, (releases) => {
            $scope.releases = releases;
            Loader.complete();
          });
        } else if (value === 'analytics') {
          $rootScope.$broadcast('triggerAnalyticsLoader');
          // Alternatively use scope/watch rather than broadcast/on :
          // $scope.analyticsConfig.triggerAnalyticsLoader = true;
        }
      };
      $scope.save = function () {
        Loader.load();
        cleanPopulatedFields($scope.track);
        updateAliases(() => {
          updateReleaseSpecificForeignId(() => {
            if (!$scope.track._id) {
              Track.create(JSON.parse(angular.toJson($scope.track)), (response) => {
                if (response.status === 200) {
                  $scope.isSaveSuccessful = false;
                  $scope.originalObj = JSON.parse(angular.toJson($scope.track));
                  $window.location.href = `#/tracks/${response.data._id}/edit`;
                  Loader.success('Track successfully created');
                } else {
                  Loader.error('Error creating track, please try again or contact support');
                }
              })
                .catch((response) => {
                  Loader.error(`The object has not been saved.  ${response.data.message}`);
                });
            } else {
              Track.update($scope.track._id, $scope.track, (response) => {
                if (response.status === 200) {
                  $scope.track = response.data;
                  updateCanUseAlternativeId();
                  $scope.originalObj = JSON.parse(angular.toJson($scope.track));
                  initAnalyticsConfig();
                  Loader.success('Track successfully saved');
                } else {
                  Loader.error('Error saving track, please try again or contact support');
                }
              })
                .catch((response) => {
                  Loader.error(`The object has not been saved.  ${response.data.message}`);
                });
            }
          });
        });
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        Track.delete('single', [$scope.track._id], (response) => {
          if (response.status === 201) {
            $scope.deletionError = response.data;
            Loader.error('This Track cannot be deleted as it is in use.');
          } else if (response.status === 200) {
            delete $scope.track;
            $window.location.href = '#/tracks';
            Loader.success('Track successfully deleted');
          }
        }).catch(() => {
          Loader.error('Error deleting Track, please try again or contact support');
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        if ($scope.isSaveSuccessful) {
          $scope.isSaveSuccessful = false;
          return;
        }
        const track = JSON.parse(angular.toJson($scope.track));

        delete track.releases;
        delete track.aliases;
        delete track.mechanicalCalculationBasis;
        delete track.reportMechanicals;
        delete $scope.originalObj.releases;
        delete $scope.originalObj.aliases;
        delete $scope.originalObj.mechanicalCalculationBasis;
        delete $scope.originalObj.reportMechanicals;

        if (angular.toJson(track) !== angular.toJson($scope.originalObj)) {
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
            $scope.track = $scope.originalObj;
            updateCanUseAlternativeId();
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          Track.copiedTrack = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      // Releases Listing Table
      $scope.headersReleases = [
        {
          title: 'Title',
          name: 'title',
          sortable: false,
          link: '/#/releases/[id]/edit',
          required: true,
        },
        { title: 'Artist', name: 'artist', sortable: false, required: true },
        { title: 'Cat No', name: 'catNo', sortable: false },
        { title: 'Barcode', name: 'barcode', sortable: false },
        { title: 'Format', name: 'format', sortable: false },
        { title: 'Created', name: 'createdAt', sortable: false, type: 'date' },
      ];

      function initAnalyticsConfig() {
        $scope.analyticsConfig = {
          baseFilter: {
            key: 'trackIds',
            value: $routeParams.id,
            title: $scope.track.title,
          },
          hideFieldOptions: [
            'releaseIds',
            'releaseDateStart',
            'releaseDateEnd',
            'priceCategories'],
          hideChartOptions: ['catalogue', 'topArtists', 'topLabels'],
        };
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.track._id) {
          Track.modelHistory($scope.track._id, (response) => {
            if (response.status === 200) {
              $scope.track.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.track));
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
      $scope.toggleMechanicalLicensesEdit = function () {
        $scope.mechanicalsRowsMode = $scope.mechanicalsRowsMode === 'readOnly' ? 'editing' : 'readOnly';
      };

      // Clean release from populated fields
      const cleanPopulatedFields = function (object) {
        if (object.costsRights && object.costsRights.length) {
          object.costsRights.forEach((right) => {
            delete right.contract;
          });
        }

        if (object.salesReturnsRights && object.salesReturnsRights.length) {
          object.salesReturnsRights.forEach((right) => {
            delete right.contract;
          });
        }

        if (object.releaseSpecificSalesReturnsRights && object.releaseSpecificSalesReturnsRights.length) {
          object.releaseSpecificSalesReturnsRights.forEach((right) => {
            delete right.contract;
          });
        }

        if (object.mechanicalLicenses && object.mechanicalLicenses.length) {
          object.mechanicalLicenses.forEach((license) => {
            delete license.contract;
            delete license.composer;
            delete license.publisher;
          });
        }
      };
    },
  ]);
