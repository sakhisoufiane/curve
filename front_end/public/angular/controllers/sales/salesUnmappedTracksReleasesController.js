angular.module('Curve')
  .controller('salesUnmappedTracksReleasesController', ['$rootScope', '$scope', '$q', '$routeParams', '$window', 'Session', 'Pagination', 'Notification', 'Territories', 'Settings', 'Client', 'Loader', 'SelectAll', 'UnmappedTrack', 'UnmappedRelease', 'Sales', 'Track', 'Release',
    function ($rootScope, $scope, $q, $routeParams, $window, Session, Pagination, Notification, Territories, Settings, Client, Loader, SelectAll, UnmappedTrack, UnmappedRelease, Sales, Track, Release) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.filter = {};
      $scope.unmappedWorks = []; // for deletion
      $scope.unmappedTracks = [];
      $scope.unmappedReleases = [];
      $scope.userType = Session.userType;
      $scope.uploader = {};
      $scope.importCatTypes = ['Track', 'Release', 'Contract'];
      $scope.importTemplateTypes = ['Aliases'];
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
      Settings.getTracks()
        .then((response) => {
          $scope.tracks = response.tracks;
        });
      Settings.getReleases()
        .then((response) => {
          $scope.releases = response.releases;
        });

      // Sidebar
      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.sales').addClass('active');
      $('.sidebar-menu-item.sales').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.unmapped-item').find('span.icon-thumbnail').addClass('white');

      if (Session.unmappedTracksReleasesFilter) {
        $scope.filter = Session.unmappedTracksReleasesFilter;
      } else {
        $scope.filter = { orderBy: 'title', orderDir: 'asc' };
      }

      this.filter = function (callback) {
        Loader.load();
        $scope.filter.complete = $scope.filter.status === 'Complete';
        Session.unmappedTracksReleasesFilter = $scope.filter;

        if ($scope.activeTab === 'releases') {
          loadReleases($scope.filter, callback);
        } else {
          loadTracks($scope.filter, callback);
        }
      };

      if ($routeParams.salesFile) {
        $scope.filter = { salesFileIds: [$routeParams.salesFile] };
      }

      if ($routeParams.activeTab) {
        $scope.activeTab = $routeParams.activeTab;
      } else {
        $scope.activeTab = 'tracks';
      }

      // Search for unmapped tracks/releases on init
      controller.filter();

      $scope.search = controller.filter;

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        $scope.currentPage = page;
        controller.filter();
      };

      $scope.changePageReleases = function (page) {
        $scope.filter.pageReleases = page;
        $scope.currentPageReleases = page;
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

      $scope.selectAllTracksChecked = false;
      $scope.selectAllTracks = function () {
        SelectAll.select($scope.unmappedTracks);
        $scope.selectAllTracksChecked = true;
      };

      $scope.$watch('unmappedTracks', () => {
        $scope.selectAllTracksChecked = true;
        $scope.unmappedTracks.forEach((track) => {
          if (!track.selected) { $scope.selectAllTracksChecked = false; }
        });
        $scope.selectedTracks = $scope.unmappedTracks.filter((track) => track.selected).length;
      }, true);

      $scope.selectAllReleasesChecked = false;
      $scope.selectAllReleases = function () {
        SelectAll.select($scope.unmappedReleases);
        $scope.selectAllReleasesChecked = true;
      };

      $scope.$watch('unmappedReleases', () => {
        $scope.selectAllReleasesChecked = true;
        $scope.unmappedReleases.forEach((release) => {
          if (!release.selected) { $scope.selectAllReleasesChecked = false; }
        });
        $scope.selectedReleases = $scope.unmappedReleases.filter((release) => release.selected).length;
      }, true);

      $scope.import = function () {
        Loader.load();
        Sales.importMappings($scope.uploader.file, $scope.uploader.catalogueType, $scope.uploader.templateType, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Aliases are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };

      // tracks - create

      $scope.createTrack = function (track) {
        $scope.selectedTrack = track;
        $scope.track = {
          title: track.title,
          version: track.version,
          artist: track.artist,
          isrc: track.isrc,
          salesReturnsRights: [],
          salesReturnsRightsDisplay: [],
        };
        $('#createTrackModal').modal('show');
      };
      $scope.addSalesReturnsRights = function () {
        $scope.track.salesReturnsRightsDisplay.push({ percentage: 100 });
      };
      $scope.deleteSalesReturnsRights = function (contract) {
        const index = $scope.track.salesReturnsRightsDisplay.indexOf(contract);
        $scope.track.salesReturnsRightsDisplay.splice(index, 1);
      };

      $scope.saveTrack = function () {
        Loader.load();
        updateContracts();
        // $scope.track.costsRights = $scope.track.salesReturnsRights;
        Track.create(JSON.parse(angular.toJson($scope.track)), (response) => {
          if (response.status === 200) {
            $('#createTrackModal').modal('hide');
            Loader.success('Track successfully created');
            const index = $scope.unmappedTracks.findIndex((unmappedTrack) => unmappedTrack._id === $scope.selectedTrack._id);
            // Set new track data to unmappedtrack
            $scope.unmappedTracks[index].isrc = response.data.isrc;
            $scope.unmappedTracks[index].title = response.data.title;
            $scope.unmappedTracks[index].trackId = response.data._id;
            // Reset selectedTrack
            $scope.selectedTrack = null;
            $scope.track = {};
          } else {
            Loader.error('Error creating track, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The track has not been saved.  ${response.data.message}`);
        });
      };
      // Saving Contracts
      function updateContracts() {
        return $q((resolve, reject) => {
          $scope.track.salesReturnsRights = [];
          const contractPromises = $scope.track.salesReturnsRightsDisplay.map((contract) => addContractToSalesReturnsRights(100, contract));
          $q.all(contractPromises).then(() => {
            resolve();
          });
        });
      }
      function addContractToSalesReturnsRights(currentPercentage, displayContract) {
        return $q((resolve, reject) => {
          const calculatedPercentage = (currentPercentage * displayContract.percentage) / 100;
          $scope.track.salesReturnsRights.push({ contractId: displayContract.contractId, percentage: calculatedPercentage, displayPercentage: displayContract.percentage });
          const childContractPromises = displayContract.children ? displayContract.children.map((childContract) => addContractToSalesReturnsRights(calculatedPercentage, childContract)) : [];
          $q.all(childContractPromises).then(() => {
            resolve();
          });
        });
      }

      $scope.createTracks = function (type) {
        let selectedTracks = [];
        const modalId = (type === 'all') ? '#createTracksAllModal' : '#createTracksModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'all') {
            selectedTracks = $scope.unmappedTracks;
          } else {
            selectedTracks = $scope.unmappedTracks.filter((track) => track.selected);
          }
          selectedTracks = selectedTracks.map((track) => ({
            id: track._id,
            title: track.title,
            version: track.version,
            artist: track.artist,
            isrc: track.isrc,
          }));
          if (selectedTracks.length > 0) {
            Loader.load();
            UnmappedTrack.createTracks(selectedTracks, (response) => {
              // Received success response 200
              if (response.status === 200) {
                const { created, failed } = response.data;
                controller.filter(() => {
                  if (failed.length > 0) {
                    $scope.unmappedTracks.map((track) => {
                      if (failed.includes(track._id)) {
                        track.selected = true;
                      }
                    });
                    Loader.warning(`${created.length} track${(created.length > 1 || created.length === 0) ? 's' : ''} created, ${failed.length} track${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already being created elsewhere. Reingest or Revalidate the file to match down any that have been created already.`);
                  } else {
                    Loader.success(`${created.length} track${(created.length > 1 || created.length === 0) ? 's' : ''} created`);
                  }
                });
              } else {
                // Received status other than 200
                Loader.error(`The tracks have not been created. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The tracks have not been created. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one track');
          }
        });
      };

      // releases - create

      $scope.createRelease = function (release) {
        $scope.selectedRelease = release;
        $scope.release = {
          title: release.title,
          version: release.version,
          artist: release.artist,
          catNo: release.catNo,
          barcode: release.barcode,
          salesReturnsRights: [],
          salesReturnsRightsDisplay: [],
        };
        $('#createReleaseModal').modal('show');
      };
      $scope.addReleaseSalesReturnsRights = function () {
        $scope.release.salesReturnsRightsDisplay.push({ percentage: 100 });
      };
      $scope.deleteReleaseSalesReturnsRights = function (contract) {
        const index = $scope.release.salesReturnsRightsDisplay.indexOf(contract);
        $scope.release.salesReturnsRightsDisplay.splice(index, 1);
      };

      $scope.saveRelease = function () {
        Loader.load();
        updateReleaseContracts();
        // $scope.track.costsRights = $scope.track.salesReturnsRights;
        Release.create(JSON.parse(angular.toJson($scope.release)), (response) => {
          if (response.status === 200) {
            $('#createReleaseModal').modal('hide');
            Loader.success('Release successfully created');
            const index = $scope.unmappedReleases.findIndex((unmappedRelease) => unmappedRelease._id === $scope.selectedRelease._id);
            // Set new release data to unmappedRelease
            $scope.unmappedReleases[index].catNo = response.data.catNo;
            $scope.unmappedReleases[index].barcode = response.data.barcode;
            $scope.unmappedReleases[index].title = response.data.title;
            $scope.unmappedReleases[index].releaseId = response.data._id;
            // Reset selectedRelease
            $scope.selectedRelease = null;
            $scope.release = {};
          } else {
            Loader.error('Error creating release, please try again or contact support');
          }
        }).catch((response) => {
          Loader.error(`The release has not been saved.  ${response.data.message}`);
        });
      };
      // Saving Contracts
      function updateReleaseContracts() {
        return $q((resolve, reject) => {
          $scope.release.salesReturnsRights = [];
          const contractPromises = $scope.release.salesReturnsRightsDisplay.map((contract) => addReleaseContractToSalesReturnsRights(100, contract));
          $q.all(contractPromises).then(() => {
            resolve();
          });
        });
      }
      function addReleaseContractToSalesReturnsRights(currentPercentage, displayContract) {
        return $q((resolve, reject) => {
          const calculatedPercentage = (currentPercentage * displayContract.percentage) / 100;
          $scope.release.salesReturnsRights.push({ contractId: displayContract.contractId, percentage: calculatedPercentage, displayPercentage: displayContract.percentage });
          const childContractPromises = displayContract.children ? displayContract.children.map((childContract) => addReleaseContractToSalesReturnsRights(calculatedPercentage, childContract)) : [];
          $q.all(childContractPromises).then(() => {
            resolve();
          });
        });
      }

      $scope.createReleases = function (type) {
        let selectedReleases = [];
        const modalId = (type === 'all') ? '#createReleasesAllModal' : '#createReleasesModal';
        $(modalId).modal('hide');
        $(modalId).one('hidden.bs.modal', () => {
          if (type === 'all') {
            selectedReleases = $scope.unmappedReleases;
          } else {
            selectedReleases = $scope.unmappedReleases.filter((release) => release.selected);
          }
          selectedReleases = selectedReleases.map((release) => ({
            id: release._id,
            title: release.title,
            version: release.version,
            artist: release.artist,
            catNo: release.catNo,
            barcode: release.barcode,
          }));
          if (selectedReleases.length > 0) {
            Loader.load();
            UnmappedRelease.createReleases(selectedReleases, (response) => {
              // Received success response 200
              if (response.status === 200) {
                const { created, failed } = response.data;
                loadReleases($scope.filter, () => {
                  if (failed.length > 0) {
                    $scope.unmappedReleases.map((release) => {
                      if (failed.includes(release._id)) {
                        release.selected = true;
                      }
                    });
                    Loader.warning(`${created.length} release${(created.length > 1 || created.length === 0) ? 's' : ''} created, ${failed.length} release${(failed.length > 1) ? 's' : ''} failed - most likely due to ${(failed.length > 1) ? 'them' : 'it'} already being created elsewhere. Reingest or Revalidate the file to match down any that have been created already.`);
                  } else {
                    Loader.success(`${created.length} release${(created.length > 1 || created.length === 0) ? 's' : ''} created`);
                  }
                });
              } else {
                // Received status other than 200
                Loader.error(`The releases have not been created. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The releases have not been created. ${response.data.message}`);
            });
          } else {
            Loader.error('Choose at least one release');
          }
        });
      };

      // Tabs
      $scope.setTab = function (value) {
        $scope.activeTab = value;
        if (value === 'releases') { loadReleases($scope.filter); }
        if (value === 'tracks') { loadTracks($scope.filter); }
      };

      function loadReleases(params, callback) {
        Loader.load();
        UnmappedRelease.all(params, (response) => {
          if (response.status === 200) {
            $scope.unmappedReleases = response.data.unmappedReleases;
            $scope.totalPagesReleases = response.data.meta.totalPages;
            $scope.currentPageReleases = response.data.meta.currentPage;

            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalReleases = response.data.meta.total;
            }

            $scope.pagesReleases = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      function loadTracks(params, callback) {
        Loader.load();
        UnmappedTrack.all(params, (response) => {
          if (response.status === 200) {
            $scope.unmappedTracks = response.data.unmappedTracks;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;

            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalTracks = response.data.meta.total;
            }

            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

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
        if ($scope.activeTab === 'tracks') {
          const trackIds = $scope.unmappedTracks.filter((track) => track.selected).map((track) => track._id);
          const exportBody = {
            filter,
            trackIds,
          };
          UnmappedTrack.export(exportBody, (response) => {
            if (response.status === 200) {
              Loader.success('Your unmapped tracks will be sent to you shortly');
            } else {
              Loader.error(response.data.message);
            }
          });
        } else {
          const releaseIds = $scope.unmappedReleases.filter((release) => release.selected).map((release) => release._id);
          const exportBody = {
            filter,
            releaseIds,
          };
          UnmappedRelease.export(exportBody, (response) => {
            if (response.status === 200) {
              Loader.success('Your unmapped releases will be sent to you shortly');
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };
    },
  ]);
