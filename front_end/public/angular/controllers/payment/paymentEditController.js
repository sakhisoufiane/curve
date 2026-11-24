angular.module('Curve')
  .controller('paymentEditController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'Payment', 'Loader', 'PaymentGroup',
    function ($rootScope, $scope, $location, $routeParams, $window, Session, Payment, Loader, PaymentGroup) {
      const controller = this;
      $window.scrollTo(0, 0);

      $scope.payment = { amount: 0 };
      $scope.payees = [];
      $scope.contracts = [];
      $scope.originalObj = JSON.parse(angular.toJson($scope.payment));
      $scope.clientCurrencies = [Session.currency].concat(Session.clientCurrencies);
      $scope.rights = {};
      $scope.paymentGroupId = $routeParams.paymentGroupId;
      $scope.paymentProvider = Session.paymentProvider || 'Standard CSV';
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      this.loadPayment = function () {
        Loader.load();
        Payment.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.payment = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.payment));
            Loader.success('Payment succesfully loaded');
          } else {
            Loader.error('Error loading payment, please try again or contact support');
          }
        });
      };

      if ($routeParams.id) {
        controller.loadPayment();
      } else {
        $scope.payment.paymentGroupId = $routeParams.paymentGroupId;
      }

      this.save = function (params) {
        Loader.load();
        if (!$scope.payment._id) {
          Payment.create(JSON.parse(angular.toJson($scope.payment)), (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.payment));
              const href = `#/paymentGroups/${$scope.paymentGroupId}/edit`;
              $window.location.href = href;
              Loader.success('Payment succesfully created');
            } else {
              Loader.error('Error creating payment, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          Payment.update($scope.payment._id, $scope.payment, (response) => {
            if (response.status === 200) {
              $scope.payment = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.payment));
              Loader.success('Payment successfully saved');
            } else {
              Loader.error('Error saving payment, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      };

      $scope.save = function (params) {
        controller.save(params);
      };

      $scope.pay = function () {
        Loader.load();
        if (!$scope.paymentGroupId) {
          Loader.error('This payment isn\'t associated with a payment group.');
        } else if (!$scope.payment._id) {
          Loader.error('Please save the payment first before attempting to pay it.');
        } else {
          PaymentGroup.paySelected($scope.paymentGroupId, { ids: [$scope.payment._id], type: 'csv' }, (response) => {
            if (response.status === 200) {
              Loader.success('Payment made successfully');
              controller.loadPayment();
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.delete = function () {
        Loader.load();

        $('#deletePaymentModal').modal('hide');

        Payment.delete([$scope.payment._id], (response) => {
          if (response.status === 200) {
            $window.location.href = `#/paymentGroups/${$scope.payment.paymentGroupId}/edit`;
            Loader.success('Payment successfully deleted');
          }
        }).catch((response) => {
          Loader.error(`The payment has not been deleted.  ${response.data.message}`);
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.payment._id) {
          Payment.modelHistory($scope.payment._id, (response) => {
            if (response.status === 200) {
              $scope.payment.modelHistory = response.data.modelHistory;
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
