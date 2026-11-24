angular.module('Curve')
  .controller('userEditController', ['$scope', '$location', '$window', '$routeParams', 'Session', 'Client', 'Parent', 'Payee', 'User', 'Notification', 'Loader', 'Settings',
    function ($scope, $location, $window, $routeParams, Session, Client, Parent, Payee, User, Notification, Loader, Settings) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.user = { payeeIds: [], clientIds: [], adminType: 'Standard', authenticationType: 'Email', rights: {} };
      $scope.userRole = Session.userType;
      $scope.internal = Session.internal;
      $scope.clientId = Session.clientId;
      $scope.parent = !!Session.parentId;

      // Same privilege + payee checks as index.html (applicationController $scope).
      $scope.$watchGroup(['userType', 'adminType', 'internalUser', 'parentUser'], () => {
        if (!$scope.userType) return;
        const allowedHere = ($scope.adminType === 'Admin' || $scope.internalUser || $scope.parentUser) && $scope.userType !== 'payee';
        if (!allowedHere) {
          Loader.error('You are not authorized to access this page');
          $location.path('/');
        }
      });
      $scope.userAdminTypes = ['Admin', 'Standard'];
      $scope.userAuthenticationTypes = ['Email', 'OneLogin', 'OKTA'];
      $scope.rights = ['Edit', 'View', 'None'];
      $scope.periodRights = ['Edit', 'Approval', 'View', 'None'];
      $scope.disableEdit = false;
      $scope.hidePayeesPanel = false;
      $scope.parents = [];
      $scope.clients = [];
      $scope.payees = [];
      $scope.clientPayeeIds = [];

      if ($scope.user.rights) {
        if (!$scope.user.rights[Session.clientId]) {
          $scope.user.rights[Session.clientId] = {
            catalogue: 'Edit',
            contracts: 'Edit',
            sales: 'Edit',
            periods: 'Edit',
          };
        }
      } else {
        $scope.user.rights = {};
        $scope.user.rights[Session.clientId] = {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        };
      }

      if ($routeParams.id) {
        Loader.load();
        User.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.user = response.data;
            if ($scope.user.clientIds.includes($scope.clientId)) $scope.hidePayeesPanel = true;
            controller.setupUserData(() => {
              controller.getAssociatedObjects(() => {
                Loader.complete();
              });
            });
          } else {
            Loader.error('Error loading user, please try again or contact support');
          }
        });
      } else if ($scope.userRole === 'internal') {
        Loader.load();
        Parent.all({ limit: 10000 }, (response) => {
          $scope.parents = response.data.parents;
          Loader.complete();
        });
      } else {
        // Load payees for a new user when not internal
        getPayees();
      }

      this.setupUserData = function (callback) {
        $scope.user.payeeIds = $scope.user.payeeIds.map((id) => ({ id }));
        $scope.user.clientIds = $scope.user.clientIds.map((id) => ({ id }));

        if ($scope.userRole !== 'payee') {
          User.getPayees($scope.user._id, (response) => {
            if (response.status === 200) {
              $scope.userPayees = response.data;
            }
          });
        }
        if ($scope.userRole === 'parent' || $scope.userRole === 'internal') {
          User.getClients($scope.user._id, (response) => {
            if (response.status === 200) {
              $scope.userClients = response.data;
            }
          });
        }
        $scope.disableEdit = true;

        if ($scope.user.rights) {
          if (!$scope.user.rights[Session.clientId]) {
            $scope.user.rights[Session.clientId] = {
              catalogue: 'Edit',
              contracts: 'Edit',
              sales: 'Edit',
              periods: 'Edit',
            };
          }
        } else {
          $scope.user.rights = {};
          $scope.user.rights[Session.clientId] = {
            catalogue: 'Edit',
            contracts: 'Edit',
            sales: 'Edit',
            periods: 'Edit',
          };
        }

        $scope.userRole = Session.userType;
        callback();
      };

      // Load Associations
      this.getAssociatedObjects = function (callback) {
        if ($scope.userRole === 'internal') {
          Parent.all({ limit: 10000 }, (response) => {
            $scope.parents = response.data.parents;
            callback();
          });
        }
        if ($scope.userRole === 'client') {
          // Load payees for dropdown box on initial load
          getPayees('', () => {
            // Load the relevant payees for the user on initial load
            User.getPayees($scope.user._id, (response) => {
              $scope.payees = [...$scope.payees, ...response.data];
              // remove duplicates
              const foundPayees = new Set();
              $scope.payees = $scope.payees.filter((item) => !foundPayees.has(item._id) && foundPayees.add(item._id));
              $scope.payees.sort((a, b) => a.name.localeCompare(b.name));
              $scope.clientPayeeIds = $scope.payees.map((payee) => payee._id);
              callback();
            });
          });
        }
      };

      $scope.searchPayees = (select) => {
        if (select?.search) {
          getPayees(select.search);
        }
      };

      function getPayees(searchTerm, callback) {
        Payee.all({ text: searchTerm || '', limit: 100 }, (response) => {
          $scope.payees = response.data.payees;
          if (callback) callback();
        });
      }

      $scope.onSelectPayee = (select) => {
        const payeeId = select.selected._id;
        $scope.clientPayeeIds.push(payeeId);
      };

      // Save
      this.setAssociation = function (callback) {
        if ($scope.userRole === 'parent' && (!$scope.user.clientIds || $scope.user.clientIds.length === 0)) {
          // Set parent ID to same
          $scope.user.parentId = Session.parentId;
          callback();
        } else if ($scope.userRole === 'client' && (!$scope.user.payeeIds || $scope.user.payeeIds.length === 0)) {
          // Set client ID to same
          $scope.user.clientId = Session.clientId;
          callback();
        } else if ($scope.userRole === 'payee') {
          // Set payee ID to same
          $scope.user.payeeId = Session.payeeId;
          callback();
        } else {
          callback();
        }
      };

      $scope.changeRole = function (model) {
        if (!model._id) {
          $scope.selectedRole = null;
          return;
        }
        $scope.selectedRole = model;
      };

      $scope.saveUserSettings = function () {
        if ($routeParams.id) {
          const data = controller.getUserData();
          User.update($scope.user._id, data, (response) => {
            if (!response.data.success) {
              Loader.error(response.data.message);
              return;
            }
            Loader.success('User successfully updated');
          });
        } else {
          const data = controller.getUserData();
          User.create(data, (response) => {
            if (!response.data.success) {
              Loader.error(response.data.message);
              return;
            }
            $window.location.href = '#/users';
          });
        }
      };

      $scope.addPayeeId = function () {
        $scope.user.payeeIds = $scope.user.payeeIds || [];
        $scope.user.payeeIds.push({});
        $scope.userPayees = $scope.userPayees || [];
        $scope.userPayees.push('');
        const clientIdsOnly = $scope.user.clientIds.map((client) => client.id);
        const index = clientIdsOnly.indexOf($scope.clientId);
        if (index !== -1) { $scope.user.clientIds.splice(index, 1); }
      };

      $scope.deletePayeeId = function (id) {
        const index = $scope.user.payeeIds.indexOf(id);
        $scope.user.payeeIds.splice(index, 1);
        const index2 = $scope.userPayees.indexOf(id._id);
        $scope.userPayees.splice(index2, 1);
        const clientIdsOnly = $scope.user.clientIds.map((client) => client.id);
        if ($scope.user.payeeIds.length === 0 && clientIdsOnly.indexOf($scope.clientId) === -1) {
          $scope.user.clientIds.push({ id: $scope.clientId });
        }
      };

      $scope.addClientId = function () {
        $scope.user.clientIds.push({});
      };

      $scope.deleteClientId = function (id) {
        const index = $scope.user.clientIds.indexOf(id);
        $scope.user.clientIds.splice(index, 1);
      };

      $scope.save = function () {
        // ensure parentId is removed when unset by internal user
        if ($scope.userRole === 'internal' && !$scope.user.parentId) {
          $scope.user.parentId = null;
        }
        if (
          ($scope.userRole === 'client' && !$scope.confirmSave && (!$scope.userPayees || $scope.userPayees.length === 0))
          || ($scope.userRole === 'parent' && !$scope.confirmSave && (!$scope.user.clientIds || $scope.user.clientIds.length === 0))
        ) {
          // Add pop up if a client and no payees added
          $('#createAlertModal').modal('show');
        } else if ($scope.userRole === 'internal' && !$scope.confirmSave && $scope.user.internal) {
          // Add pop up for internal user if no clients, payees and parent added
          $('#createInternalAlertModal').modal('show');
        } else {
          Loader.load();
          controller.setAssociation(() => {
            // Clone the user object so we can change the format of payees without disrupting the UI
            const clonedUser = structuredClone($scope.user);
            if (clonedUser.payeeIds) clonedUser.payeeIds = $scope.user.payeeIds.map((id) => id.id);
            if (clonedUser.clientIds) clonedUser.clientIds = $scope.user.clientIds.map((id) => id.id);
            if (!clonedUser._id) {
              User.create(clonedUser, (response) => {
                if (response.status === 200) {
                  $window.location.href = '#/users';
                  Loader.success('User successfully created and invite sent to their email');
                } else if (response.data.message) {
                  Loader.error(response.data.message);
                } else {
                  Loader.error('Error creating user, please try again or contact support');
                }
              });
            } else {
              User.update(clonedUser._id, clonedUser, (response) => {
                if (response.status === 200) {
                  $scope.user = response.data;
                  controller.setupUserData(() => {
                    controller.getAssociatedObjects(() => {
                      Loader.success('User successfully saved');
                      // Fetch all payees again after save so if the user opens the dropdown it's populated with all payees
                      getPayees();
                    });
                  });
                } else {
                  Loader.error('Error saving user, please try again or contact support');
                }
              });
            }
          });
        }
      };

      $scope.resetAssociations = function () {
        if ($scope.user.adminType === 'Admin') {
          $scope.user.rights[$scope.clientId].admin = true;
          delete $scope.user.payeeIds;
          delete $scope.user.clientIds;
        } else {
          $scope.user.rights[$scope.clientId].admin = false;
        }
      };

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.user._id) {
          User.modelHistory($scope.user._id, (response) => {
            if (response.status === 200) {
              $scope.user.modelHistory = response.data.modelHistory;
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
