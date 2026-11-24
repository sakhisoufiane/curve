angular.module('Curve')
  .controller('usersController', ['$scope', '$location', '$routeParams', '$window', 'Pagination', 'Session', 'Client', 'Parent', 'Payee', 'User', 'Notification', 'Loader', 'SelectAll',
    function ($scope, $location, $routeParams, $window, Pagination, Session, Client, Parent, Payee, User, Notification, Loader, SelectAll) {
      const controller = this;
      $scope.client = {};
      $scope.selectedUser = {};
      $scope.users = [];
      $scope.userRole = Session.userType;

      // Same privilege + payee checks as index.html (applicationController $scope).
      $scope.$watchGroup(['userType', 'adminType', 'internalUser', 'parentUser'], () => {
        if (!$scope.userType) return;
        const allowedHere = ($scope.adminType === 'Admin' || $scope.internalUser || $scope.parentUser) && $scope.userType !== 'payee';
        if (!allowedHere) {
          Loader.error('You are not authorized to access this page');
          $location.path('/');
        }
      });
      if (Session.usersFilter) {
        $scope.filter = Session.usersFilter;
      } else {
        $scope.filter = { text: null, orderBy: 'email', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      this.filter = function (params, callback) {
        Session.usersFilter = params;
        Loader.load();
        User.all(params, (response) => {
          if (response.status === 200) {
            $scope.users = response.data.users;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.import = function () {
        Loader.load();
        User.import($scope.importFile, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Users are importing, and a report will be sent to you shortly');
          } else if (response.status === 400) {
            $scope.importErrors = response.data.errors;
            Loader.complete();
          } else {
            Loader.complete();
          }
        });
      };
      $scope.export = function () {
        const selectedUsers = [];
        $scope.users.forEach((user, callback) => {
          if (user.selected) {
            selectedUsers.push(user._id);
          }
        });

        Loader.load();
        User.export({ ids: selectedUsers, filter: $scope.filter }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedUsers = [];
        $scope.users.forEach((user, callback) => {
          if (user.selected) {
            count += 1;
            selectedUsers.push(user);
          }
        });
        if (count > 0) {
          selectedUsers.forEach((user) => {
            User.delete(user._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.users.indexOf(user);
                $scope.users.splice(index, 1);
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
          $('#deleteModal').on('hidden.bs.modal', () => {
            Loader.success(`${num} Users successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Users Successfully Searched');
        });
      };
      $scope.getSortedData = function (orderBy) {
        if ($scope.filter.orderBy === orderBy) {
          $scope.filter.orderDir = ($scope.filter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.filter.orderBy = orderBy;
        controller.filter($scope.filter);
        Loader.complete();
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
      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };
      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };
      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };
      // Load all users on page load
      this.filter($scope.filter);
      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'user' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'User Import Template.xlsx';
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
