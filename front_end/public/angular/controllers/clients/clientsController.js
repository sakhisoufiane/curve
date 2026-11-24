angular.module('Curve')
  .controller('clientsController', ['$scope', '$location', '$routeParams', 'Session', 'Pagination', 'Client', 'Notification', 'Loader', 'SelectAll',
    function ($scope, $location, $routeParams, Session, Pagination, Client, Notification, Loader, SelectAll) {
      const controller = this;
      $scope.clients = [];
      if (Session.clientsFilter) {
        $scope.filter = Session.clientsFilter;
      } else {
        $scope.filter = { name: null, orderBy: 'name', orderDir: 'asc' };
      }
      $scope.isShowingAll = false;
      $scope.filter.limit = 25;

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      this.filter = function (params, callback) {
        Session.clientsFilter = params;
        Loader.load();
        Client.all(params, (response) => {
          if (response.status === 200) {
            $scope.clients = response.data.clients;
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
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
          Loader.success('Clients Successfully Searched');
        });
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.deleteSelected = function () {
        Loader.load();
        let num = 0;
        let count = 0;
        const selectedClients = [];
        $scope.clients.forEach((client, callback) => {
          if (client.selected) {
            count += 1;
            selectedClients.push(client);
          }
        });
        if (count > 0) {
          selectedClients.forEach((client) => {
            Client.delete(client._id, (response) => {
              if (response.status === 200) {
                num += 1;
                const index = $scope.clients.indexOf(client);
                $scope.clients.splice(index, 1);
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
            Loader.success(`${num} Clients successfully deleted`);
          });
        } else {
          $('#deleteModal').modal('hide');
          Loader.error('Choose at least one position');
        }
      };
      $scope.export = function () {
        const selectedClients = [];
        $scope.clients.forEach((client, callback) => {
          if (client.selected) {
            selectedClients.push(client._id);
          }
        });
        Loader.load();
        Client.export({ ids: selectedClients, filter: $scope.filter, clientType: $scope.clientType }, (response) => {
          if (response.status === 200) {
            Loader.success('Your Export Will be Sent to you via Email Shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };
      $scope.headers = [{
        title: 'Name',
        name: 'name',
        sortable: true,
        link: '/#/clients/[id]/edit',
        required: true,
      },
      { title: 'Created', name: 'createdAt', sortable: true, type: 'date' }];
      // Load all clients on page load
      this.filter($scope.filter);
    },
  ]);
