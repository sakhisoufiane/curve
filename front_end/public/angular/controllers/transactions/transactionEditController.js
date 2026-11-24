angular.module('Curve')
  .controller('transactionEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Transaction', 'Loader',
    function ($rootScope, $scope, $routeParams, $window, Session, Transaction, Loader) {
      $window.scrollTo(0, 0);
      $scope.transaction = {};
      $scope.contractId = $routeParams.contractId;
      $scope.transaction.contractId = $routeParams.contractId;
      $scope.clientType = Session.clientType;

      if ($scope.clientType === 'Publisher') {
        $scope.transactionTypes = ['Payment', 'Royalties', 'Advance', 'Other'];
      } else {
        $scope.transactionTypes = ['Payment', 'Royalties', 'Advance', 'Reserve Withheld', 'Reserve Released', 'Other'];
      }

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.transactionValidation = () => (['Payment', 'Advance'].includes($scope.transaction.type) && $scope.transaction.amount > 0) || ($scope.transaction.type === 'Royalties' && $scope.transaction.amount < 0);

      if ($routeParams.id) {
        Loader.load();
        Transaction.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.transaction = response.data;
            if (response.data.date) { $scope.transaction.date = new Date(response.data.date); }
            Loader.complete();
          } else {
            Loader.error('Error loading transaction, please try again or contact support');
          }
        });
      }

      $scope.datePopup = false;

      $scope.openDatePopup = function () {
        $scope.datePopup = true;
      };

      $scope.validateTransaction = function () {
        Loader.load();
        Transaction.validate($scope.transaction, (response) => {
          if (response.status === 200) {
            Loader.complete();
            $scope.save();
          } else if (response.status === 201) {
            Loader.complete();
            $scope.validateTransactionMessage = response.data.message;
            $('#validateTransactionModal').modal('show');
          } else {
            Loader.error('Error validating transaction, please try again or contact support');
          }
        });
      };
      $scope.save = function () {
        Loader.load();
        // Browsers can produce undefined for invalid type="number" input (e.g. commas), which JSON.stringify drops — coerce to null to keep the field in the payload.
        if ($scope.transaction.amount === undefined) $scope.transaction.amount = null;
        if (!$scope.transaction._id) {
          Transaction.create($scope.transaction, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/contracts/${$scope.contractId}/edit`;
              Loader.success('Transaction successfully created');
            } else {
              Loader.error('Error creating transaction, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        } else {
          Transaction.update($scope.transaction._id, $scope.transaction, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/contracts/${$scope.contractId}/edit`;
              Loader.success('Transaction successfully saved');
            } else {
              Loader.error('Error saving transaction, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Transaction.delete($scope.transaction._id, (response) => {
            if (response.status === 200) {
              $window.location.href = `#/contracts/${$scope.contractId}/edit`;
              Loader.success('Transaction successfully deleted');
            } else {
              Loader.error('Error deleting transaction, please try again or contact support');
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.transaction._id) {
          Transaction.modelHistory($scope.transaction._id, (response) => {
            if (response.status === 200) {
              $scope.transaction.modelHistory = response.data.modelHistory;
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
    }]);
