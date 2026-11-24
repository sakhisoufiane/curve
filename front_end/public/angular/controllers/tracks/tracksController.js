angular.module('Curve')
  .controller('tracksController', ['$rootScope', '$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Track', 'Client', 'Notification', 'FileSaver', 'Loader', 'Settings', 'Contract', '$timeout', 'Spotify',
    function ($rootScope, $scope, $location, $routeParams, Session, Pagination, Track, Client, Notification, FileSaver, Loader, Settings, Contract, $timeout, Spotify) {
      const controller = this;
      $scope.tracks = [];
      $scope.paymentTier = Session.paymentTier;
      $scope.importType = {
        options: [{ version: 'v1', label: 'Combined' }, { version: 'v2', label: 'Separated' }],
        version: 'v2',
      };
      $scope.rights = {};
      $scope.clientType = $rootScope.clientType;
      $scope.spotifyOperationType = '';
      $scope.spotifyTracksToAdd = 0;
      $scope.validFilterValues = [{ name: 'Complete', value: true }, { name: 'Incomplete', value: false }];
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

      if (Session.tracksFilter) {
        $scope.filter = Session.tracksFilter;
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
        Session.tracksFilter = params;
        Loader.load();
        Track.all(params, (response) => {
          if (response.status === 200) {
            $scope.tracks = response.data.tracks;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.tracks.length; i += 1) {
              const obj = $scope.tracks[i];
              if (!obj.title) { obj.title = '<i>New Track</i>'; }
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
          Loader.success('Tracks Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.delete = function (type) {
        let tracks = [];
        const modalId = (type === 'bulk') ? '#deleteBulkModal' : '#deleteModal';

        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'bulk') {
            if ($scope.bulkDeleteIds) {
              tracks = $scope.bulkDeleteIds.split('\n');
              tracks.map(Function.prototype.call, String.prototype.trim);
            }
          } else {
            $scope.tracks.forEach((track) => {
              if (track.selected) {
                tracks.push(track._id);
              }
            });
          }

          if (tracks.length > 0) {
            Loader.load();
            Track.delete('multi', tracks, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Succesfully deleted all requested tracks
                  controller.filter($scope.filter);
                  Loader.success(`${deletedCount}/${tracks.length} tracks successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The tracks have not been deleted due to an error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The tracks have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The tracks have not been deleted. ${response.data.message}`);
            });
          } else {
            const message = (type === 'bulk') ? 'Please paste in at least one track ID to delete' : 'Select at least one track to delete';
            Loader.error(message);
          }
        });
      };

      $scope.deleteSelected = function () {
        Loader.load();
        let count = 0;
        const selectedTracks = [];
        let deletedCount = 0;
        $scope.tracks.forEach((track) => {
          if (track.selected) {
            count += 1;
            selectedTracks.push(track._id);
          }
        });
        if (count > 0) {
          Track.delete('multi', selectedTracks, (response) => {
            if (response.status === 200) {
              ({ deletedCount } = response.data);
              $('#deleteModal').modal('hide');
              Loader.complete();
            } else {
              Loader.error(`The tracks have not been deleted. ${response.data}`);
            }
          }).catch(() => {
            Loader.error('The tracks have not been deleted due to an error. Please try again or contact support');
          });

          $('#deleteModal').one('hidden.bs.modal', () => {
            if (deletedCount > 0) {
              controller.filter($scope.filter);
              Loader.success(`${deletedCount}/${selectedTracks.length} tracks successfully deleted`);
            } else {
              Loader.error('The tracks have not been deleted.');
            }
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };

      $scope.deleteBulk = function () {
        Loader.load();
        const bulkIdsArray = $scope.bulkDeleteIds.split('\n');
        bulkIdsArray.map(Function.prototype.call, String.prototype.trim);
        let deletedCount = 0;

        if (bulkIdsArray.length > 0) {
          Track.delete('multi', bulkIdsArray, (response) => {
            if (response.status === 200) {
              ({ deletedCount } = response.data);
              $('#deleteBulkModal').modal('hide');
              Loader.complete();
            } else {
              Loader.error(`The tracks have not been deleted. ${response.data}`);
            }
          }).catch(() => {
            Loader.error('The tracks have not been deleted due to an error. Please try again or contact support');
          });

          $('#deleteBulkModal').one('hidden.bs.modal', () => {
            if (deletedCount > 0) {
              controller.filter($scope.filter);
              Loader.success(`${deletedCount}/${bulkIdsArray.length} Tracks successfully deleted`);
            } else {
              Loader.error('The tracks have not been deleted.');
            }
          });
        } else {
          $('#deleteBulkModal').modal('hide');
          Loader.error('Please paste in at least one ID');
        }
      };

      $scope.import = function () {
        Loader.load();
        const overwriteBlanks = $scope.overwriteBlanks ? $scope.overwriteBlanks : 'false';
        const importTemplateVersion = $scope.importType.version ? $scope.importType.version : 'v1';
        Track.import($scope.importFile, overwriteBlanks, importTemplateVersion, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Tracks are importing, and a report will be sent to you shortly');
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
        Track.updateCatalogue($scope.importFile, (response) => {
          if (response.status === 200) {
            $('#updateCatalogueModal').modal('hide');
            Loader.success("We're updating the ISRCs, a report will be sent to you shortly");
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      $scope.export = function (exportTemplateVersion) {
        const selectedTracks = [];
        $scope.tracks.forEach((track) => {
          if (track.selected) {
            selectedTracks.push(track._id);
          }
        });

        Loader.load();
        Track.export({ ids: selectedTracks, filter: $scope.filter }, $scope.paymentTier === 'Lite' ? 'v2' : exportTemplateVersion, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.rawExport = function () {
        const selectedTracks = [];
        $scope.tracks.forEach((track) => {
          if (track.selected) {
            selectedTracks.push(track._id);
          }
        });

        Loader.load();
        Track.rawExport({ ids: selectedTracks, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
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
        link: '/#/tracks/[id]/edit',
        required: true,
      },
      { title: 'Version', name: 'version', sortable: false, required: false },
      { title: 'Artist', name: 'artist', sortable: true, required: true },
      { title: 'ISRC', name: 'isrc', sortable: true },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' },
      { title: 'Participation', name: 'totalParticipation', sortable: true, type: 'participation', showAsLabel: true },
      { title: 'Status', name: 'status', type: 'status', showValid: true, tooltip: 'Track' },
      ];

      this.filter($scope.filter);

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        let template;
        if ($scope.paymentTier === 'Lite') {
          template = 'track';
        } else if ($scope.importType.version === 'v1') {
          template = 'trackCombined';
        } else if ($scope.importType.version === 'v2') {
          template = 'trackSeparated';
        }

        Client.downloadTemplate({ type: template }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Track Import Template.xlsx';
            if ($scope.paymentTier === 'Lite') {
              link.download = 'Track Import Template.xlsx';
            } else if ($scope.importType.version === 'v1') {
              link.download = 'Combined Track Import Template.xlsx';
            } else if ($scope.importType.version === 'v2') {
              link.download = 'Separated Track Import Template.xlsx';
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
        if (!$scope.spotifyFilter.searchTerm && !$scope.spotifyFilter.album && !$scope.spotifyFilter.artist && !$scope.spotifyFilter.label) {
          Loader.error('Please enter a search term');
        }
        const searchTerm = {
          searchTerm: $scope.spotifyFilter.searchTerm,
          album: $scope.spotifyFilter.album,
          artist: $scope.spotifyFilter.artist,
          label: $scope.spotifyFilter.label,
          type: 'track',
          page: $scope.spotifyFilter.page || 1,
          limit: $scope.spotifyFilter.limit || 25,
        };
        Spotify.search(searchTerm, (response) => {
          if (response.status === 200) {
            $scope.spotifyTracks = response.data.items;
            $scope.totalSpotifyPages = response.data.meta.totalPages;
            $scope.currentSpotifyPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.spotifyTotal = response.data.meta.total;
            }
            $scope.spotifyPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
            if (loadNext) {
              Loader.success(`${$scope.spotifyTracksToAdd} ${$scope.spotifyTracksToAdd !== 1 ? 'Tracks' : 'Track'} importing from Spotify. You will receive a notification when complete`);
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

      $scope.setSpotifyOpTypeAndTracksCount = function (type) {
        $scope.spotifyOperationType = type;
        if ($scope.spotifyOperationType === 'selectedSpotify') {
          $scope.spotifyTracksToAdd = $scope.spotifyTracks && $scope.spotifyTracks.length > 0 ? $scope.spotifyTracks.filter((track) => track.selected).length : 0;
        } else if ($scope.spotifyOperationType === 'allSpotify') {
          $scope.spotifyTracksToAdd = $scope.spotifyTracks && $scope.spotifyTracks.length > 0 ? $scope.spotifyTracks.length : 0;
        }
        if (!$scope.spotifyTracksToAdd) {
          return Loader.error('At least one Track has to be selected');
        }
        $('#spotifyConfirmationModal').modal('show');
        $scope.isSpotifyConfirmationModalOpen = true;
      };

      $scope.showSpotifySearchModal = function (type) {
        $scope.isSpotifyConfirmationModalOpen = false;
        $('#spotifyConfirmationModal').modal('hide');
        setTimeout(() => {
          $('#spotifyModal').modal('show');
        }, 500);
      };

      $scope.executeSpotifyOperation = function (loadNext) {
        if ($scope.spotifyOperationType === 'selectedSpotify') {
          $scope.addSelectedSpotifyTracks(loadNext);
        }
        // else if ($scope.spotifyOperationType === 'allSpotify') {
        //   $scope.addAllSpotifyTracks();
        // }
        $scope.spotifyOperationType = ''; // reset operation type
      };

      $scope.addSelectedSpotifyTracks = async function (loadNext) {
        Loader.load();
        const type = 'track';
        const selectedSpotifyTracks = [];
        if ($scope.spotifyTracks && $scope.spotifyTracks.length > 0) {
          $scope.spotifyTracks.forEach((spotifyTrack) => {
            if (spotifyTrack.selected) {
              selectedSpotifyTracks.push(spotifyTrack);
            }
          });
          const updateExistingItems = $scope.overwriteTracks ? $scope.overwriteTracks : false;
          if (selectedSpotifyTracks.length > 0) {
            await Spotify.import(selectedSpotifyTracks, type, updateExistingItems, (response) => {
              if (response.status === 200) {
                if (loadNext) {
                  $('#spotifyConfirmationModal').modal('hide');
                  $scope.isSpotifyConfirmationModalOpen = false;
                  $scope.changeSpotifyPage($scope.spotifyFilter.page + 1, loadNext);
                } else {
                  $('#spotifyModal').modal('hide');
                  $('#spotifyConfirmationModal').modal('hide');
                  $scope.isSpotifyConfirmationModalOpen = false;
                  Loader.success(`${$scope.spotifyTracksToAdd} ${$scope.spotifyTracksToAdd !== 1 ? 'Tracks' : 'Track'} importing from Spotify. You will receive a notification when complete`);
                }
              } else {
                Loader.error('Error importing Tracks from Spotify. Please try again or contact support');
                Loader.complete();
              }
            });
          } else {
            // user has searched but not selected a track
            Loader.error('At least one Track must be selected');
          }
        } else {
          // user has not searched or selected
          Loader.error('At least one Track must be selected');
        }
      };

      /*
      add all functionality may become operable following potential future expansions to Spotify's API limitations
      */
      // $scope.addAllSpotifyTracks = async function () {
      //   Loader.load();
      //   const type = 'track';
      //   const updateExistingItems = $scope.overwriteTracks ? $scope.overwriteTracks : false;
      //   if ($scope.spotifyTracks && $scope.spotifyTracks.length > 0) {
      //     await Spotify.import($scope.spotifyTracks, type, updateExistingItems, (response) => {
      //       if (response.status === 200) {
      //         $('#spotifyModal').modal('hide');
      //         $('#spotifyConfirmationModal').modal('hide');
      //         Loader.success(`${$scope.spotifyTracksToAdd} ${$scope.spotifyTracksToAdd !== 1 ? 'Tracks' : 'Track'} importing from Spotify. You will receive a notification when complete`);
      //       } else {
      //         Loader.error('Error importing Tracks from Spotify. Please try again or contact support');
      //         Loader.complete();
      //       }
      //     });
      //   } else {
      //     // user has clicked add all before searching
      //     Loader.error('Please search for Tracks before adding all');
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
        { title: 'ISRC', name: 'isrc', sortable: false, required: true },
        { title: 'URL', name: 'spotify_url', sortable: false, required: true },
        { title: 'Duration', name: 'duration', sortable: false, required: true }];
    },
  ]);
