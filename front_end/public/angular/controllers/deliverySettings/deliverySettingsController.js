angular.module('Curve')
  .controller('deliverySettingsController', ['$rootScope', '$scope', '$location', 'Session', 'Pagination', 'DeliveryPartner', 'DeliveryProfile', 'Client', 'User', 'Loader', 'SelectAll', '$timeout',
    function ($rootScope, $scope, $location, Session, Pagination, DeliveryPartner, DeliveryProfile, Client, User, Loader, SelectAll, $timeout) {
      $scope.client = {
        configurations: [],
        sources: [],
      };
      $scope.user = {};
      $scope.displayGL = Session.internal;
      $scope.clientType = $rootScope.clientType;
      $scope.features = $rootScope.features;
      $scope.notifications = ['Email', 'In App Notifications', 'Both'];
      $scope.deliveryPartners = [];
      $scope.deliveryProfiles = [];
      $scope.deliveryEmails = [];
      const controller = this;

      // Tabs
      if (Session.deliverySettingsActiveTab) {
        $scope.activeTab = Session.deliverySettingsActiveTab;
      } else {
        $scope.activeTab = 'overview';
        Session.deliverySettingsActiveTab = $scope.activeTab;
      }

      $scope.setTab = function (value) {
        $scope.activeTab = value;
        Session.deliverySettingsActiveTab = $scope.activeTab;
      };

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
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
          });
        });
      });

      // start of overview functionality
      waitForIdBeforeGettingClient();
      function waitForIdBeforeGettingClient() {
        if (Session.id) {
          getClientForCurrentUser({ sessionId: Session.id });
        } else {
          setTimeout(waitForIdBeforeGettingClient, 250);
        }
      }

      function getClientForCurrentUser(sessionId, callback) {
        if (sessionId) {
          $scope.userRole = Session.userType;
          Loader.load();
          getUser();
        }
        if (callback) { callback(); }
      }

      function getUser() {
        User.get(Session.id, (response) => {
          if (response.status === 200) {
            setUser(response);
          } else {
            Loader.error('Error loading user, please try again or contact support');
          }
        });
      }

      function setUser(response) {
        $scope.user = response.data;
        if ($scope.userRole === 'client' && $scope.user.clientId) {
          getClient();
        } else {
          Loader.complete();
        }
      }

      function getClient() {
        Client.get($scope.user.clientId, (response) => {
          if (response.status === 200) {
            $scope.deliveryEmails = response.data.deliveryEmails;
            $scope.client = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading client, please try again or contact support');
          }
        });
      }

      // // Delivery Emails
      $scope.addDeliveryEmail = function (deliveryEmails) {
        if (deliveryEmails.length < 3) {
          deliveryEmails.push({ email: '', _id: '' });
        }
      };

      $scope.removeDeliveryEmail = function (email) {
        $scope.deliveryEmails.splice($scope.deliveryEmails.indexOf(email), 1);
      };

      function formatDeliveryEmails() {
        $scope.client.deliveryEmails = $scope.deliveryEmails;
      }

      $scope.saveDeliverySettings = function () {
        formatDeliveryEmails();
        Loader.load();
        updateClient();
      };

      function updateClient() {
        if ($scope.client._id) {
          Client.update($scope.client._id, $scope.client, (response) => {
            if (response.status === 200) {
              updateClientSuccess(response);
            } else {
              handleError(response);
            }
          });
        }
      }

      // only update CWR and Auto Approve Works instead of all fields
      function updateClientSuccess(response) {
        $scope.client.cwrPartyName = response.data.cwrPartyName;
        $scope.client.cwrPartyId = response.data.cwrPartyId;
        $scope.client.ipiNo = response.data.ipiNo;
        $scope.client.autoApproveWorks = response.data.autoApproveWorks;
        Loader.success('Settings successfully saved');
      }

      function handleError(response) {
        const error = (response.data && response.data.message) ? response.data.message : 'Error saving settings, please try again or contact support';
        Loader.error(error);
      }
      // end of overview functionality

      // start of delivery partners functionality
      if (Session.deliveryPartnersFilter) {
        $scope.deliveryPartnersFilter = Session.deliveryPartnersFilter;
      } else {
        $scope.deliveryPartnersFilter = { text: null, orderBy: 'createdAt', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      this.deliveryPartnersFilter = function (params, callback) {
        Session.deliveryPartnersFilter = params;
        Loader.load();
        DeliveryPartner.all(params, (response) => {
          if (response.status === 200) {
            $scope.deliveryPartners = response.data.deliveryPartners;
            $scope.deliveryPartnersTotalPages = response.data.meta.totalPages;
            $scope.deliveryPartnersCurrentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.deliveryPartnersTotal = response.data.meta.total;
            }
            $scope.deliveryPartnersPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            for (let i = 0; i < $scope.deliveryPartners.length; i += 1) {
              const obj = $scope.deliveryPartners[i];
              if (!obj.name) obj.name = '<i>New Delivery Partner</i>';
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.getDeliveryPartnersSortedData = function (orderBy, orderDir) {
        $scope.deliveryPartnersFilter.orderBy = orderBy;
        $scope.deliveryPartnersFilter.orderDir = orderDir;
        $scope.deliveryPartnersFilter.orderDir = orderDir === 'asc' ? 'desc' : 'asc';
        controller.deliveryPartnersFilter($scope.deliveryPartnersFilter);
        Loader.complete();
      };
      $scope.searchDeliveryPartners = function () {
        $scope.deliveryPartnersFilter.page = 1;
        controller.deliveryPartnersFilter($scope.deliveryPartnersFilter, () => {
          Loader.success('Delivery Partners successfully searched');
        });
      };
      $scope.changeDeliveryPartnersPage = function (page) {
        $scope.deliveryPartnersFilter.page = page;
        controller.deliveryPartnersFilter($scope.deliveryPartnersFilter);
      };

      $scope.selectAllDPChecked = false;

      $scope.selectAllDeliveryPartners = function () {
        SelectAll.select($scope.deliveryPartners);
        $scope.selectAllDPChecked = true;
      };

      $scope.$watch('deliveryPartners', () => {
        if ($scope.selectAllDPChecked) {
          $scope.selectAllDPChecked = false;
        }
      });

      $scope.whatClassIsIt = function (field) {
        if ($scope.deliveryPartnersFilter.orderBy === field) {
          if ($scope.deliveryPartnersFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.deleteSelectedDeliveryPartners = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedDeliveryPartners = [];
        $scope.deliveryPartners.forEach((deliveryPartner, callback) => {
          if (deliveryPartner.selected) {
            count += 1;
            selectedDeliveryPartners.push(deliveryPartner);
          }
        });
        if (count > 0) {
          selectedDeliveryPartners.forEach((deliveryPartner) => {
            DeliveryPartner.delete(deliveryPartner._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.deliveryPartners.indexOf(deliveryPartner);
                $scope.deliveryPartners.splice(index, 1);
                if (count === num) {
                  $('#deliveryPartnersDeleteModal').modal('hide');
                  Loader.complete();
                }
              } else if (response.status === 400) {
                Loader.error(`Delivery Partner '${deliveryPartner.name}' is included in a Works Partner IP Chain and cannot be deleted`);
              } else {
                Loader.error(`Error deleting Delivery Partner '${deliveryPartner.name}', please try again or contact support`);
              }
            })
              .catch((response) => {
                Loader.error(`Delivery Partner has not been deleted.  ${response.data.message}`);
              });
          });
          $('#deliveryPartnersDeleteModal').one('hidden.bs.modal', () => {
            Loader.success(`${num} Delivery Partner${num > 1 ? 's' : ''} successfully deleted`);
          });
        } else {
          $('#deliveryPartnersDeleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };

      // Load all deliveryPartners on page load
      this.deliveryPartnersFilter($scope.deliveryPartnersFilter);
      // end of delivery partners tab

      // start of delivery profiles tab
      if (Session.deliveryProfilesFilter) {
        $scope.deliveryProfilesFilter = Session.deliveryProfilesFilter;
      } else {
        $scope.deliveryProfilesFilter = { text: null, orderBy: 'createdAt', orderDir: 'desc' };
      }

      $scope.deliveryProfilesFilter.limit = 25;

      this.deliveryProfilesFilter = function (params, callback) {
        Session.deliveryProfilesFilter = params;
        Loader.load();
        DeliveryProfile.all(params, (response) => {
          if (response.status === 200) {
            $scope.deliveryProfiles = response.data.deliveryProfiles;
            $scope.deliveryProfilesTotalPages = response.data.meta.totalPages;
            $scope.deliveryProfilesCurrentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.deliveryProfilesTotal = response.data.meta.total;
            }
            $scope.deliveryProfilesPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if ($scope.deliveryProfiles && $scope.deliveryProfiles.length > 0) {
              for (let i = 0; i < $scope.deliveryProfiles.length; i += 1) {
                const obj = $scope.deliveryProfiles[i];
                if (!obj.name) { obj.name = '<i>New Delivery Profile</i>'; }
              }
            }

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.getDeliveryProfilesSortedData = function (orderBy, orderDir) {
        $scope.deliveryProfilesFilter.orderBy = orderBy;
        $scope.deliveryProfilesFilter.orderDir = orderDir;
        controller.deliveryProfilesFilter($scope.deliveryProfilesFilter);
        Loader.complete();
      };
      $scope.searchDeliveryProfiles = function () {
        $scope.deliveryProfilesFilter.page = 1;
        controller.deliveryProfilesFilter($scope.deliveryProfilesFilter, () => {
          Loader.success('Delivery Profiles Successfully Searched');
        });
      };
      $scope.changeDeliveryProfilesPage = function (page) {
        $scope.deliveryProfilesFilter.page = page;
        controller.deliveryProfilesFilter($scope.deliveryProfilesFilter);
      };

      $scope.deleteSelectedDeliveryProfiles = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedDeliveryProfiles = [];
        $scope.deliveryProfiles.forEach((deliveryProfile, callback) => {
          if (deliveryProfile.selected) {
            count += 1;
            selectedDeliveryProfiles.push(deliveryProfile);
          }
        });
        if (count > 0) {
          selectedDeliveryProfiles.forEach((deliveryProfile) => {
            DeliveryProfile.delete(deliveryProfile._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.deliveryProfiles.indexOf(deliveryProfile);
                $scope.deliveryProfiles.splice(index, 1);
                if (count === num) {
                  $('#deleteModal').modal('hide');
                  Loader.complete();
                }
              }
            })
              .catch((response) => {
                Loader.error(`The object has not been deleted.  ${response.data.message}`);
              });
          });
          $('#deleteModal').one('hidden.bs.modal', () => {
            Loader.success(`${num} Delivery profiles successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };

      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/deliverySettings/deliveryProfiles/[id]/edit',
        required: true,
      }, {
        title: 'Created',
        name: 'createdAt',
        sortable: true,
        type: 'date',
      }];

      $scope.showAllDeliveryProfiles = function () {
        $scope.isShowingAll = true;
        $scope.deliveryProfilesFilter.page = 1;
        $scope.deliveryProfilesFilter.limit = 500;
        controller.deliveryProfilesFilter($scope.deliveryProfilesFilter);
      };

      this.deliveryProfilesFilter($scope.deliveryProfilesFilter);

      $scope.isShowingAllDeliveryPartners = false;

      $scope.showAllDeliveryPartners = function () {
        $scope.isShowingAllDeliveryPartners = true;
        $scope.deliveryPartnersFilter.page = 1;
        $scope.deliveryPartnersFilter.limit = 500;
        controller.deliveryPartnersFilter($scope.deliveryPartnersFilter);
      };
    },
  ]);
