angular.module('Curve')
  .controller('releaseEditController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'Release', 'Notification', 'Track', 'Pagination', 'Settings', 'Loader', 'Territories', '$timeout',
    function ($rootScope, $scope, $location, $routeParams, $window, Session, Release, Notification, Track, Pagination, Settings, Loader, Territories, $timeout) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.release = { salesReturnsRights: [], costsRights: [], priceCategoryDealerPrices: [], aliases: [], mechanicalLicenses: {}, tracks: [], trackIds: [] };
      $scope.formats = [];
      $scope.distributionChannels = [];
      $scope.catalogueGroups = [];
      $scope.priceCategories = [];
      $scope.contracts = [];
      $scope.countries = Territories;
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.release));
      $scope.searchTracks = [];
      $scope.mechanicalsRowsMode = 'editing';
      $scope.mechanicalsShowToggleButton = true;
      $scope.newMechanicalLicenses = {};
      $scope.features = $rootScope.features;
      $scope.rights = {};
      $scope.clientType = $rootScope.clientType;
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
          });
        });
      });

      $rootScope.$watch('clientType', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.clientType = $rootScope.clientType;
          });
        });
      });

      this.loadRelease = function () {
        Loader.load();
        Release.get($routeParams.id, (response) => {
          if (response.status === 200) {
            controller.postLoadReleaseTasks(response.data);
            if ($routeParams.proRataFromTracks) {
              $scope.setTab('rights');
              $scope.proRataTrackContracts();
            }
          } else {
            Loader.error('Error loading release, please try again or contact support');
          }
        });
      };

      this.postLoadReleaseTasks = function (release) {
        $scope.release = release;
        $scope.originalObj = JSON.parse(angular.toJson($scope.release));
        Release.loadTracks($scope.release, () => {
          prepareMechanicalLicenses();
          if (release.releaseDate) { $scope.release.releaseDate = new Date(release.releaseDate); }
          $scope.originalObj = JSON.parse(angular.toJson($scope.release));
          Loader.success('Release successfully loaded');
        });
        initAnalyticsConfig();
        Loader.complete();
      };

      if ($routeParams.id) {
        controller.loadRelease();
      } else if (Release.copiedRelease) {
        delete Release.copiedRelease._id;
        delete Release.copiedRelease.createdAt;
        delete Release.copiedRelease.UpdatedAt;

        if (Release.copiedRelease.title) {
          Release.copiedRelease.title += ' - Copy';
        }

        if (Release.copiedRelease.catNo) {
          Release.copiedRelease.catNo += ' - Copy';
        }

        if (Release.copiedRelease.barcode) {
          delete Release.copiedRelease.barcode;
        }

        $scope.release = Release.copiedRelease;
      }

      function prepareMechanicalLicenses() {
        let totalMechanicalLicenses = 0;
        if ($scope.release) {
          $scope.release.tracks.forEach((track) => {
            $scope.release.mechanicalLicenses = $scope.release.mechanicalLicenses || {};
            $scope.release.mechanicalLicenses[track._id] = $scope.release.mechanicalLicenses[track._id] || {};
            totalMechanicalLicenses += $scope.release.mechanicalLicenses[track._id].licenses ? $scope.release.mechanicalLicenses[track._id].licenses.length : 0;
          });
        }
        if (totalMechanicalLicenses > 10) {
          $scope.mechanicalsRowsMode = 'readOnly';
        }
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        Release.copiedRelease = $scope.release;
        delete Release.copiedRelease.aliases;
        $scope.leavingForCopy = true;
        $window.location.href = '#/releases/new';
      };

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.release-item').find('span.icon-thumbnail').addClass('white');

      Settings.getSettings()
        .then((settings) => {
          $scope.priceCategories = removeAllValue(settings.priceCategories);
          $scope.formats = removeAllValue(settings.configurations);
          $scope.distributionChannels = removeAllValue(settings.distributionChannels);
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);

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

      $scope.openReleaseDatePopup = function () {
        if (typeof ($scope.releaseDatePopup) === 'undefined') {
          $scope.releaseDatePopup = {};
        }
        $scope.releaseDatePopup.opened = true;
      };
      $scope.addSalesReturnsRights = function () {
        $scope.release.salesReturnsRights.push({ percentage: 100 });
      };
      $scope.deleteSalesReturnsRights = function (contract) {
        const index = $scope.release.salesReturnsRights.indexOf(contract);
        $scope.release.salesReturnsRights.splice(index, 1);
      };
      $scope.proRataTrackContracts = function () {
        if (!$scope.release._id) {
          $scope.save({ proRataTrackContracts: true });
        } else {
          Loader.load();
          Release.proRataTrackContracts($scope.release, () => {
            Loader.complete();
          });
        }
      };
      $scope.addCostsRights = function () {
        $scope.release.costsRights.push({ percentage: 100 });
      };
      $scope.deleteCostsRights = function (contract) {
        const index = $scope.release.costsRights.indexOf(contract);
        $scope.release.costsRights.splice(index, 1);
      };
      $scope.copySalesContractsToCosts = function () {
        Loader.load();
        $scope.release.costsRights = $scope.release.salesReturnsRights.slice(0);
        Loader.complete();
      };
      $scope.$watch('release.aliases', (aliases) => {
        $scope.displayAliases = [];
        angular.forEach(aliases, (alias) => {
          $scope.displayAliases.push({ name: alias });
        });
      });
      $scope.addAlias = function () {
        $scope.displayAliases.push('');
        updateAliases();
      };
      $scope.deleteAlias = function (alias) {
        const index = $scope.displayAliases.indexOf(alias);
        $scope.displayAliases.splice(index, 1);
      };

      function updateAliases(callback) {
        $scope.release.aliases = [];
        if ($scope.displayAliases.length > 0) {
          angular.forEach($scope.displayAliases, (alias) => {
            $scope.release.aliases.push(alias.name);
            if ($scope.release.aliases.length === $scope.displayAliases.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.addMechanicalLicense = function (trackId) {
        $scope.release.mechanicalLicenses = $scope.release.mechanicalLicenses || {};
        $scope.release.mechanicalLicenses[trackId] = $scope.release.mechanicalLicenses[trackId] || {};
        $scope.release.mechanicalLicenses[trackId].licenses = $scope.release.mechanicalLicenses[trackId].licenses || [];
        $scope.release.mechanicalLicenses[trackId].licenses.push({ rate: 100, share: 100 });
        // Flag the license as a new one for the mechanical rows
        $scope.newMechanicalLicenses[trackId] = $scope.newMechanicalLicenses[trackId] || {};
        $scope.newMechanicalLicenses[trackId][$scope.release.mechanicalLicenses[trackId].licenses.length - 1] = true;
      };
      $scope.deleteMechanicalLicense = function (license, trackId) {
        const index = $scope.release.mechanicalLicenses[trackId].licenses.indexOf(license);
        $scope.release.mechanicalLicenses[trackId].licenses.splice(index, 1);
      };
      $scope.inheritTrackMechanicals = function () {
        Loader.load();
        Release.inheritTrackMechanicals($scope.release, (response) => {
          if (response.status === 200) {
            controller.postLoadReleaseTasks(response.data.release);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      // Dealer Prices
      $scope.$watch('release.priceCategoryDealerPrices', (priceCategories) => {
        $scope.displayPriceCategoryDealerPrices = [];
        angular.forEach(priceCategories, (pc) => {
          $scope.displayPriceCategoryDealerPrices.push({ priceCategory: pc.priceCategory, territory: pc.territory, currency: pc.currency, dealerPrice: pc.dealerPrice });
        });
      });
      $scope.addPriceCategoryDealerPrice = function () {
        $scope.displayPriceCategoryDealerPrices.push({ priceCategory: null, territory: null, currency: null, dealerPrice: null });
        updatePriceCategoryDealerPrices();
      };
      $scope.deletePriceCategoryDealerPrice = function (pc) {
        const index = $scope.displayPriceCategoryDealerPrices.indexOf(pc);
        $scope.displayPriceCategoryDealerPrices.splice(index, 1);
      };

      function updatePriceCategoryDealerPrices(callback) {
        $scope.release.priceCategoryDealerPrices = [];
        if ($scope.displayPriceCategoryDealerPrices.length > 0) {
          angular.forEach($scope.displayPriceCategoryDealerPrices, (pc) => {
            $scope.release.priceCategoryDealerPrices.push({ priceCategory: pc.priceCategory, territory: pc.territory, currency: pc.currency, dealerPrice: pc.dealerPrice });
            if ($scope.release.priceCategoryDealerPrices.length === $scope.displayPriceCategoryDealerPrices.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }
      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        if (value === 'analytics') {
          $rootScope.$broadcast('triggerAnalyticsLoader');
        } else if (value === 'mechanicals') {
          $scope.loadMechanicals = true;
        }
      };
      this.save = function (params) {
        Loader.load();
        this.updateTrackSorting($scope.release.tracks);
        cleanPopulatedFields($scope.release);
        updatePriceCategoryDealerPrices(() => {
          updateAliases(() => {
            if (!$scope.release._id) {
              Release.create(JSON.parse(angular.toJson($scope.release)), (response) => {
                if (response.status === 200) {
                  $scope.originalObj = JSON.parse(angular.toJson($scope.release));
                  let href = `#/releases/${response.data._id}/edit`;
                  if (params && params.proRataTrackContracts) {
                    href += '?proRataFromTracks';
                  }
                  $window.location.href = href;
                  Loader.success('Release successfully created');
                } else {
                  Loader.error('Error creating release, please try again or contact support');
                }
              })
                .catch((response) => {
                  Loader.error(`The object has not been saved.  ${response.data.message}`);
                });
            } else {
              Release.update($scope.release._id, $scope.release, (response) => {
                if (response.status === 200) {
                  $scope.release = response.data;
                  $scope.originalObj = JSON.parse(angular.toJson($scope.release));
                  initAnalyticsConfig();
                  Release.loadTracks($scope.release, () => {
                    if (response.data.releaseDate) { $scope.release.releaseDate = new Date(response.data.releaseDate); }
                    $scope.originalObj = JSON.parse(angular.toJson($scope.release));
                    Loader.success('Release successfully saved');
                  });
                } else {
                  Loader.error('Error saving release, please try again or contact support');
                }
              })
                .catch((response) => {
                  Loader.error(`The object has not been saved.  ${response.data.message}`);
                });
            }
          });
        });
      };
      $scope.save = function (params) {
        controller.save(params);
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        Release.delete('single', [$scope.release._id], (response) => {
          if (response.status === 201) {
            $scope.deletionError = response.data;
            Loader.error('This Release cannot be deleted as it is in use.');
          } else if (response.status === 200) {
            delete $scope.release;
            $window.location.href = '#/releases';
            Loader.success('Release successfully deleted');
          }
        }).catch(() => {
          Loader.error('Error deleting Release, please try again or contact support');
        });
      };

      // Tracks
      this.filterTracks = function (params, callback) {
        Loader.load();
        params.notInclude = $scope.release.trackIds;
        Track.loadTracksForRelease(params, (response) => {
          if (response.status === 200) {
            $scope.searchTracks = response.data.tracks;
            $scope.totalTrackPages = response.data.meta.totalPages;
            $scope.currentTrackPage = response.data.meta.currentPage;
            $scope.trackPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.tracksSearch = function () {
        controller.filterTracks({ text: $scope.trackSearchText }, () => {
          Notification.success('Tracks Successfully Searched');
        });
      };
      $scope.changeTrackPage = function (page) {
        controller.filterTracks({ text: $scope.trackSearchText, page });
      };
      $scope.addTrack = function (track) {
        track.added = true;
        if (!$scope.release.trackIds) { $scope.release.trackIds = []; }
        $scope.release.trackIds.push(track._id);
      };
      $scope.addTracks = function () {
        let num = 0;
        const selectedTracks = $scope.searchTracks.filter((track) => track.selected);
        if (!$scope.release.trackIds) { $scope.release.trackIds = []; }
        selectedTracks.forEach((track) => {
          if (track.selected) {
            num += 1;
            track.selected = false;
            $scope.release.trackIds.push(track._id);
            $scope.release.tracks.push(track);
            const idx = $scope.searchTracks.indexOf(track);
            $scope.searchTracks.splice(idx, 1);
          }
        });
        if (num > 0) Notification.success(`${num} Tracks successfully added to Release`);
      };
      $scope.removeTracks = function () {
        let num = 0;
        $('#removeTracksModal').modal('hide');
        const tracksCopy = Array.from($scope.release.tracks);
        tracksCopy.forEach((track) => {
          if (track.selected) {
            num += 1;
            // Remove from Track IDs
            const trackIdsIndex = $scope.release.trackIds.indexOf(track._id);
            if (trackIdsIndex !== -1) { $scope.release.trackIds.splice(trackIdsIndex, 1); }
            // Remove from Tracks
            const tracksIndex = $scope.release.tracks.indexOf(track);
            if (tracksIndex !== -1) { $scope.release.tracks.splice(tracksIndex, 1); }
          }
        });
        Notification.success(`${num} Tracks successfully removed from Release`);
      };
      $scope.headers = [{
        title: 'Title',
        name: 'title',
        sortable: false,
        required: true,
      },
      { title: 'Version', name: 'version', sortable: false, required: false },
      { title: 'Artist', name: 'artist', sortable: false, required: true },
      { title: 'ISRC', name: 'isrc', sortable: false },
      ];
      $scope.modalHeaders = [
        { title: 'Title', name: 'title', sortable: false, required: true },
        { title: 'Version', name: 'version', sortable: false, required: false },
        { title: 'Artist', name: 'artist', sortable: false, required: true },
        { title: 'ISRC', name: 'isrc', sortable: false }, {
          title: '',
          name: '',
          type: 'actions',
          sortable: false,
          onCellClick(track) {
            $scope.addTrack(track);
          },
        },
      ];

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const release = JSON.parse(angular.toJson($scope.release));
        const original = JSON.parse(angular.toJson($scope.originalObj));

        delete release.tracks;
        delete release.aliases;
        delete original.tracks;
        delete original.aliases;

        if (release && angular.toJson(release) !== angular.toJson(original)) {
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
            $scope.release = $scope.originalObj;
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          Release.copiedRelease = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      this.updateTrackSorting = function (tracks) {
        const trackIds = [];
        if (tracks && tracks.length > 0) {
          tracks.forEach((track, index) => {
            trackIds[index] = track._id;
          });
        }
        $scope.release.trackIds = trackIds;
      };

      function initAnalyticsConfig() {
        $scope.analyticsConfig = {
          baseFilter: {
            key: 'releaseIds',
            value: $routeParams.id,
            title: $scope.release.title,
            includeTracksWithRelease: false,
          },
          hideFieldOptions: ['trackIds', 'priceCategories'],
          hideChartOptions: ['catalogue', 'topArtists', 'topLabels'],
        };
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.release._id) {
          Release.modelHistory($scope.release._id, (response) => {
            if (response.status === 200) {
              $scope.release.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.release));
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

        if (object.mechanicalLicenses) {
          // eslint-disable-next-line no-restricted-syntax
          for (const track in object.mechanicalLicenses) {
            if (object.mechanicalLicenses[track].licenses && object.mechanicalLicenses[track].licenses.length) {
              object.mechanicalLicenses[track].licenses.forEach((license) => {
                delete license.contract;
                delete license.composer;
                delete license.publisher;
              });
            }
          }
        }
      };
    },
  ]);
