angular.module('Curve')
  .controller('releasesController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Release', 'Client', 'Notification', 'FileSaver', 'Loader', 'Settings', 'Contract', '$timeout', 'Spotify',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Release, Client, Notification, FileSaver, Loader, Settings, Contract, $timeout, Spotify) {
      const controller = this;
      $scope.releases = [];
      $scope.rights = {};
      $scope.clientType = $rootScope.clientType;
      $scope.spotifyOperationType = '';
      $scope.spotifyReleasesToAdd = 0;
      $scope.validFilterValues = [{ name: 'Complete', value: true }, { name: 'Incomplete', value: false }];
      $scope.paymentTier = Session.paymentTier;
      $scope.importType = {
        options: [{ version: 'v1', label: 'Combined' }, { version: 'v2', label: 'Separated' }],
        version: 'v2',
      };
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        $scope.isInternal = Session.internal;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('paymentTier', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.paymentTier = $rootScope.paymentTier;
          });
        });
      });

      if (Session.releasesFilter) {
        $scope.filter = Session.releasesFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'title', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      if (Session.spotifyFilter) {
        $scope.spotifyFilter = Session.spotifyFilter;
      } else {
        $scope.spotifyFilter = { text: null, orderBy: 'title', orderDir: 'asc' };
      }
      $scope.isShowingAllSpotify = false;
      $scope.spotifyFilter.limit = 25;

      // Filters
      Settings.getSettings()
        .then((settings) => {
          $scope.catalogueGroups = removeAllValue(settings.catalogueGroups);
          $scope.configurations = removeAllValue(settings.configurations);
          $scope.distributionChannels = removeAllValue(settings.distributionChannels);
          function removeAllValue(array) {
            const index = array.indexOf('All');
            array.splice(index, 1);
            return array;
          }
        });
      Settings.getCompanies()
        .then((companies) => {
          $scope.companies = companies;
        });

      $scope.searchContracts = function (select) {
        Contract.all({ text: select.search, contractType: 'Artist', autocomplete: true }, (response) => {
          $scope.contracts = response.data.contracts;
        });
      };
      $scope.searchMechanicalContracts = function (select) {
        Contract.all({ text: select.search, contractType: 'Mechanical', autocomplete: true }, (response) => {
          $scope.mechanicalContracts = response.data.contracts;
        });
      };

      $scope.openCreatedAfterPopup = function () {
        $scope.createdAfterPopup = true;
      };

      $scope.openCreatedBeforePopup = function () {
        $scope.createdBeforePopup = true;
      };

      this.filter = function (params, callback) {
        Session.releasesFilter = params;
        Loader.load();
        Release.all(params, (response) => {
          if (response.status === 200) {
            $scope.releases = response.data.releases;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.releases.length; i += 1) {
              const obj = $scope.releases[i];
              if (!obj.title) { obj.title = '<i>New Release</i>'; }
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = orderDir;
        controller.filter($scope.filter);
        Loader.complete();
      };

      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Releases Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function (type) {
        let releases = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';

        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              releases = $scope.bulkDeleteIds.split('\n');
              releases.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            $scope.releases.forEach((release) => {
              if (release.selected) {
                releases.push(release._id);
              }
            });
          }

          if (releases.length > 0) {
            Loader.load();
            Release.delete('multi', releases, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Succesfully deleted all requested releases
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${releases.length} releases successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The releases have not been deleted due to an error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The releases have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The releases have not been deleted. ${response.data.message}`);
            });
          } else {
            const message = (type === 'bulk') ? 'Please paste in at least one release ID to delete' : 'Select at least one release to delete';
            Loader.error(message);
          }
        });
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : 'false';
        const importTemplateVersion = $scope.importType.version ? $scope.importType.version : 'v1';
        Release.import($scope.importFile, overwriteBlanks, importTemplateVersion, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Releases are importing, and a report will be sent to you shortly');
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
        Release.updateCatalogue($scope.importFile, (response) => {
          if (response.status === 200) {
            $('#updateCatalogueModal').modal('hide');
            Loader.success("We're updating the Catalogue Number(s), a report will be sent to you shortly");
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      $scope.rawExport = function () {
        const selectedReleases = [];
        $scope.releases.forEach((release) => {
          if (release.selected) {
            selectedReleases.push(release._id);
          }
        });

        Loader.load();
        Release.rawExport({ ids: selectedReleases, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.export = function (exportTemplateVersion) {
        const selectedReleases = [];
        $scope.releases.forEach((release) => {
          if (release.selected) {
            selectedReleases.push(release._id);
          }
        });

        Loader.load();
        Release.export({ ids: selectedReleases, filter: $scope.filter }, $scope.paymentTier === 'Lite' ? 'v2' : exportTemplateVersion, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.proRataContracts = function () {
        const selectedReleases = [];
        $scope.releases.forEach((release) => {
          if (release.selected) {
            selectedReleases.push(release._id);
          }
        });
        Loader.load();
        Release.proRataContracts({ ids: selectedReleases, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
          $('#proRataContractsModal').modal('hide');
        });
      };

      $scope.inheritMechanicals = function () {
        const selectedReleases = [];
        $scope.releases.forEach((release) => {
          if (release.selected) {
            selectedReleases.push(release._id);
          }
        });
        Loader.load();
        Release.inheritMechanicals({ ids: selectedReleases, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
          $('#inheritMechanicalsModal').modal('hide');
        });
      };

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      $scope.headers = [{
        title: 'Title',
        name: 'title',
        sortable: true,
        link: '/#/releases/[id]/edit',
        required: true,
      },
      { title: 'Artist', name: 'artist', sortable: true, required: true },
      { title: 'Cat No', name: 'catNo', sortable: true },
      { title: 'Barcode', name: 'barcode', sortable: true },
      { title: 'Format', name: 'format', sortable: true },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      { title: 'Participation', name: 'totalParticipation', sortable: true, type: 'participation', showAsLabel: true },
      { title: 'Status', name: 'status', type: 'status', required: true, showValid: true, tooltip: 'Release' },
      ];

      this.filter($scope.filter);

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        let template;
        if ($scope.paymentTier === 'Lite') {
          template = 'release';
        } else if ($scope.importType.version === 'v1') {
          template = 'releaseCombined';
        } else if ($scope.importType.version === 'v2') {
          template = 'releaseSeparated';
        }

        Client.downloadTemplate({ type: template }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Release Import Template.xlsx';
            if ($scope.paymentTier === 'Lite') {
              link.download = 'Release Import Template.xlsx';
            } else if ($scope.importType.version === 'v1') {
              link.download = 'Combined Release Import Template.xlsx';
            } else if ($scope.importType.version === 'v2') {
              link.download = 'Separated Release Import Template.xlsx';
            }
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };

      this.spotifyFilter = function (params, loadNext, callback) {
        Session.spotifyFilter = params;
        Loader.load();
        if (!$scope.spotifyFilter.searchTerm && !$scope.spotifyFilter.artist && !$scope.spotifyFilter.label) {
          Loader.error('Please enter a search term');
        }
        const searchTerm = {
          searchTerm: $scope.spotifyFilter.searchTerm,
          artist: $scope.spotifyFilter.artist,
          label: $scope.spotifyFilter.label,
          type: 'album',
          page: $scope.spotifyFilter.page || 1,
          limit: $scope.spotifyFilter.limit || 25,
        };
        Spotify.search(searchTerm, (response) => {
          if (response.status === 200) {
            $scope.spotifyReleases = response.data.items;
            $scope.totalSpotifyPages = response.data.meta.totalPages;
            $scope.currentSpotifyPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.spotifyTotal = response.data.meta.total;
            }
            $scope.spotifyPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
            if (loadNext) {
              Loader.success(`${$scope.spotifyReleasesToAdd} ${$scope.spotifyReleasesToAdd !== 1 ? 'Releases' : 'Release'} importing from Spotify. You will receive a notification when complete`);
            }
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.searchSpotify = function () {
        $scope.showAddSelectedButton = true;
        $scope.spotifyFilter.page = 1;
        controller.spotifyFilter($scope.spotifyFilter, false, () => {
          Loader.success('Spotify Successfully Searched');
        });
      };

      $scope.changeSpotifyPage = function (page, loadNext) {
        $scope.spotifyFilter.page = page;
        controller.spotifyFilter($scope.spotifyFilter, loadNext);
      };

      // $scope.showAllSpotify = function () {
      //   $scope.isShowingAllSpotify = true;
      //   $scope.spotifyFilter.page = 1;
      //   $scope.spotifyFilter.limit = 50;
      //   controller.spotifyFilter($scope.spotifyFilter);
      // };

      $scope.setSpotifyOpTypeAndReleasesCount = function (type) {
        $scope.spotifyOperationType = type;
        if ($scope.spotifyOperationType === 'selectedSpotify') {
          $scope.spotifyReleasesToAdd = $scope.spotifyReleases && $scope.spotifyReleases.length > 0 ? $scope.spotifyReleases.filter((release) => release.selected).length : 0;
        } else if ($scope.spotifyOperationType === 'allSpotify') {
          $scope.spotifyReleasesToAdd = $scope.spotifyReleases && $scope.spotifyReleases.length > 0 ? $scope.spotifyReleases.length : 0;
        }

        if (!$scope.spotifyReleasesToAdd) {
          return Loader.error('At least one Release has to be selected');
        }
        $('#spotifyConfirmationModal').modal('show');
        $scope.isSpotifyConfirmationModalOpen = true;
      };

      $scope.showSpotifySearchModal = function (type) {
        $('#spotifyConfirmationModal').modal('hide');
        setTimeout(() => {
          $('#spotifyModal').modal('show');
        }, 500);
      };

      $scope.executeSpotifyOperation = function (loadNext) {
        if ($scope.spotifyOperationType === 'selectedSpotify') {
          $scope.addSelectedSpotifyReleases(loadNext);
        }
        // else if ($scope.spotifyOperationType === 'allSpotify') {
        //   $scope.addAllSpotifyReleases();
        // }
        $scope.spotifyOperationType = ''; // reset operation type
      };

      $scope.addSelectedSpotifyReleases = async function (loadNext) {
        Loader.load();
        const type = 'album';
        const selectedSpotifyReleases = [];
        if ($scope.spotifyReleases && $scope.spotifyReleases.length > 0) {
          $scope.spotifyReleases.forEach((spotifyRelease) => {
            if (spotifyRelease.selected) {
              selectedSpotifyReleases.push(spotifyRelease);
            }
          });
          const updateExistingItems = $scope.overwriteReleases ? $scope.overwriteReleases : false;
          if (selectedSpotifyReleases.length > 0) {
            await Spotify.import(selectedSpotifyReleases, type, updateExistingItems, (response) => {
              if (response.status === 200) {
                if (loadNext) {
                  $('#spotifyConfirmationModal').modal('hide');
                  $scope.changeSpotifyPage($scope.spotifyFilter.page + 1, loadNext);
                  $scope.isSpotifyConfirmationModalOpen = false;
                } else {
                  $('#spotifyModal').modal('hide');
                  $('#spotifyConfirmationModal').modal('hide');
                  $scope.isSpotifyConfirmationModalOpen = false;
                  Loader.success(`${$scope.spotifyReleasesToAdd} ${$scope.spotifyReleasesToAdd !== 1 ? 'Releases' : 'Release'} importing from Spotify. You will receive a notification when complete`);
                }
              } else {
                Loader.error('Error importing Releases from Spotify. Please try again or contact support');
                Loader.complete();
              }
            });
          } else {
            // user has searched but not selected a release
            Loader.error('At least one Release must be selected');
          }
        } else {
          // user has not searched or selected
          Loader.error('At least one Release must be selected');
        }
      };

      /*
      add all functionality may become operable following potential future expansions to Spotify's API limitations
      */
      // $scope.addAllSpotifyReleases = async function () {
      //   Loader.load();
      //   const type = 'album';
      //   const updateExistingItems = $scope.overwriteReleases ? $scope.overwriteReleases : false;
      //   if ($scope.spotifyReleases && $scope.spotifyReleases.length > 0) {
      //     await Spotify.import($scope.spotifyReleases, type, updateExistingItems, (response) => {
      //       if (response.status === 200) {
      //         $('#spotifyModal').modal('hide');
      //         $('#spotifyConfirmationModal').modal('hide');
      //         Loader.success(`${$scope.spotifyReleasesToAdd} ${$scope.spotifyReleasesToAdd !== 1 ? 'Releases' : 'Release'} importing from Spotify. You will receive a notification when complete`);
      //       } else {
      //         Loader.error('Error importing Releases from Spotify. Please try again or contact support');
      //         Loader.complete();
      //       }
      //     });
      //   } else {
      //     // user has clicked add all before searching
      //     Loader.error('Please search for Releases before adding all');
      //   }
      // };

      $('#spotifyConfirmationModal').on('hidden.bs.modal', () => {
        $scope.$apply(() => {
          $scope.isSpotifyConfirmationModalOpen = false;
        });
      });

      $scope.spotifyHeaders = [
        { title: '', name: 'image', sortable: false, required: true },
        { title: 'Title', name: 'name', sortable: false, required: true },
        { title: 'Artist', name: 'artist', sortable: false, required: true },
        { title: 'UPC', name: 'upc', sortable: false, required: true },
        { title: 'URL', name: 'spotify_url', sortable: false, required: true },
        { title: 'Release Date', name: 'release_date', sortable: false, required: true },
        { title: 'Total Tracks', name: 'total_tracks', sortable: false, required: true }];
    },
  ]);
