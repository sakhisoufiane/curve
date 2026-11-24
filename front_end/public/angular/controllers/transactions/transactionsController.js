angular.module('Curve')
  .controller('transactionsController', ['$scope', '$routeParams', 'Session', 'Pagination', 'Transaction', 'Contract', 'Notification', 'Loader', 'SelectAll',
    function ($scope, $routeParams, Session, Pagination, Transaction, Contract, Notification, Loader, SelectAll) {
      const controller = this;
      $scope.transactions = [];
      $scope.filter = {};

      this.filter = function (params, callback) {
        Loader.load();
        Transaction.all(params, (response) => {
          if (response.status === 200) {
            $scope.transactions = response.data.transactions;
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      function init() {
        Contract.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            $scope.contracts = response.data.contracts;
            $scope.filter.contractId = response.data.contracts[0]._id;
            getContract($scope.filter.contractId);
            controller.filter($scope.filter);
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      $scope.selectContract = function (contract) {
        getContract(contract._id);
        controller.filter($scope.filter);
      };

      function getContract(contractId) {
        Contract.get($scope.filter.contractId, (response) => {
          if (response.status === 200) {
            $scope.contract = response.data;
          }
        });
      }

      init();
    },
  ]);
