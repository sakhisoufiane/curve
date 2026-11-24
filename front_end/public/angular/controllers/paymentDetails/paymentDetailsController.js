angular.module('Curve')
  .controller('paymentDetailsController', ['$rootScope', '$scope', '$routeParams', '$window', '$sce', '$timeout', 'Session', 'Payee', 'Client', 'Territories', 'Loader', 'Settings', 'Pagination', 'Contract', 'Currencies', 'CurvePay',
    function ($rootScope, $scope, $routeParams, $window, $sce, $timeout, Session, Payee, Client, Territories, Loader, Settings, Pagination, Contract, Currencies, CurvePay) {
      $window.scrollTo(0, 0);
      $scope.payeeLoaded = false;
      $scope.payee = null;
      $scope.curvePayiFrameUrl = '';

      function getPayee() {
        if ($scope.payeeLoaded) return;

        Loader.load();
        $scope.payeeLoaded = true;

        Payee.get(Session.payeeId, (response) => {
          if (response.status === 200) {
            $scope.payee = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.payee));
            Loader.complete();
          } else {
            Loader.error('Error loading payee, please try again or contact support');
          }
        }).catch((response) => Loader.error(response.data.message));
      }

      $rootScope.$watch('paymentProvider', () => {
        if (!$rootScope.paymentProvider) return;

        $timeout(() => {
          $scope.$apply(() => {
            $scope.paymentProvider = $rootScope.paymentProvider;
            getPayee();
          });
        });
      });

      $rootScope.$watch('features', () => {
        if (!$rootScope.features) return;

        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            getPayee();
          });
        });
      });

      $scope.$watch('payee', () => {
        if (!$scope.payee) return;

        getPaymentDetails();
      });

      Settings.getSettings().then((settings) => {
        $scope.payeeCategories = settings.payeeCategories;
      });

      function getPaymentDetails() {
        if ($scope.paymentProvider === 'Wise' && $scope.payee.paymentCurrency) {
          Client.getWisePaymentRequirements(Session.clientId, { currency: $scope.payee.paymentCurrency }, (response) => {
            if (response.status === 200) { $scope.paymentRequirements = response.data.requirements; }
            Loader.complete();
          });
        }

        if ($scope.paymentProvider === 'Tipalti') {
          getTipaltiIframeAuthentication();
        }

        if ($scope.paymentProvider === 'Curve Pay') {
          getCurvePayIframe();
        }
      }

      function getCurvePayIframe() {
        if ($scope.paymentProvider === 'Curve Pay' && $scope.payee && $scope.payee._id) {
          Loader.load();
          CurvePay.getiFrame(
            {
              route: 'payee',
              id: $scope.payee._id,
            },
            (response) => {
              if (response.status === 200) {
                $scope.curvePayiFrameUrl = $sce.trustAsResourceUrl(response.data.url);
                Loader.complete();
              } else {
                $scope.curvePayError = 'Error communicating with the Payments application, please try again or contact support';
                Loader.complete();
              }
            },
          );
        }
      }

      function getTipaltiIframeAuthentication() {
        Loader.load();
        Payee.getTipaltiIframeAuthentication($scope.payee._id, (response) => {
          if (response.status === 200) {
            $scope.tipaltiIframeUrl = $sce.trustAsResourceUrl(response.data.url);
          }
          Loader.complete();
        });
      }

      $scope.$watch('payee.paymentCurrency', () => {
        if ($scope.paymentProvider === 'Wise' && $scope.payee.paymentCurrency) {
          Loader.load();
          if ($scope.originalObj.paymentCurrency !== $scope.payee.paymentCurrency && $scope.payee.paymentProviders && $scope.payee.paymentProviders.wise) {
            delete $scope.payee.paymentProviders.wise.paymentMethod;
            delete $scope.payee.paymentProviders.wise.paymentMethodRequirements;
            delete $scope.payee.paymentProviders.wise.paymentFields;
          }
          Client.getWisePaymentRequirements(Session.clientId, { currency: $scope.payee.paymentCurrency }, (response) => {
            if (response.status === 200) {
              $scope.paymentRequirements = response.data.requirements;
              Loader.complete();
            } else {
              $scope.paymentRequirements = [];
              Loader.error(response.data.message);
            }
          });
        }
      });

      $scope.$watch('payee.paymentProviders.wise.paymentMethod', () => {
        if ($scope.paymentProvider === 'Wise' && $scope.payee.paymentProviders && $scope.payee.paymentProviders.wise && $scope.payee.paymentProviders.wise.paymentMethod) {
          Loader.load();
          // eslint-disable-next-line max-len
          if ($scope.originalObj.paymentProviders && $scope.payee.paymentProviders && $scope.originalObj.paymentProviders.wise && $scope.payee.paymentProviders.wise && $scope.originalObj.paymentProviders.wise.paymentMethod !== $scope.payee.paymentProviders.wise.paymentMethod) {
            delete $scope.payee.paymentProviders.wise.paymentMethodRequirements;
            delete $scope.payee.paymentProviders.wise.paymentFields;
          }
          Client.getWisePaymentRequirements(Session.clientId, { currency: $scope.payee.paymentCurrency }, (response) => {
            if (response.status === 200) {
              $scope.paymentRequirements = response.data.requirements;
              $scope.paymentRequirements.forEach((requirement) => {
                if (requirement.type === $scope.payee.paymentProviders.wise.paymentMethod) {
                  $scope.payee.paymentProviders.wise.paymentMethodRequirements = {
                    usageInfo: requirement.usageInfo,
                    fields: requirement.fields,
                  };
                }
              });
              Loader.complete();
            } else {
              $scope.paymentRequirements = [];
              Loader.error(response.data.message);
            }
          });
        }
      });
    },
  ]);
