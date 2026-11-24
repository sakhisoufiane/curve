angular.module('Curve')
  .controller('clientEditController', ['$scope', '$routeParams', '$window', 'Session', 'Client', 'Parent', 'Notification', 'Loader', 'Currencies', 'Settings',
    function ($scope, $routeParams, $window, Session, Client, Parent, Notification, Loader, Currencies, Settings) {
      $window.scrollTo(0, 0);
      $scope.userType = Session.userType;
      $scope.parents = [{}];
      $scope.usage = { amount: 0, catalogue: 0, contracts: 0, nextBillingDate: null };
      $scope.paymentTiers = ['Essentials', 'Pro', 'Enterprise', 'Custom'];
      $scope.clientTypes = ['Distributor', 'Label', 'Publisher'];
      $scope.fugaSplits = ['Fuga Split', 'White Label Split'];
      $scope.currencies = Currencies;
      $scope.billingFrequencies = ['Monthly', 'Quartely', 'Half-Yearly', 'Yearly'];
      $scope.calculationFrequencies = ['Monthly', 'Quartely', 'Half-Yearly', 'Yearly'];
      $scope.production = Session.production;
      $scope.internalUser = false;
      $scope.today = new Date();
      $scope.$watch(() => Session.userType, (userType) => {
        if (userType === 'internal') {
          $scope.internalUser = true;
          loadParents();
        }
      });

      function loadParents() {
        Parent.all({ limit: 1000 }, (response) => {
          if (response.status === 200 && response.data && response.data.parents) {
            $scope.parents = response.data.parents;
          }
        });
      }

      $scope.client = { features: {} };
      $scope.originalObj = JSON.parse(angular.toJson($scope.client));
      // Load Client if ID exists
      if ($routeParams.id) {
        Loader.load();
        Client.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
            $scope.originalClient = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.client));
            if (!$scope.client.billing) { $scope.client.billing = {}; }
            if ($scope.client.billing.lastPaymentDate) {
              const nextBillingDate = new Date(response.data.billing.lastPaymentDate);
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
              $scope.client.billing.nextBillingDate = nextBillingDate;
            }
            Client.getUsage($scope.client._id, null, (response) => { $scope.usage = response.data; });
            Loader.complete();
          } else {
            Loader.error('Error loading client, please try again or contact support');
          }
        });
      }

      // Load Clients for Inherit Catalogue Select
      Client.all({ limit: 10000 }, (response) => {
        if (response.status === 200) {
          $scope.clients = response.data.clients.map((client) => {
            if (client._id !== $scope.client._id) {
              return client;
            }
          }).filter(Boolean);
        }
      });

      $scope.addInheritCatalogueClient = function () {
        $scope.client.inheritCatalogueFrom = $scope.client.inheritCatalogueFrom || [];
        $scope.client.inheritCatalogueFrom.push({});
      };
      $scope.deleteInheritCatalogueClient = function (clientId) {
        const index = $scope.client.inheritCatalogueFrom.indexOf(clientId);
        $scope.client.inheritCatalogueFrom.splice(index, 1);
      };

      Settings.getReports().then((reports) => {
        $scope.salesReports = reports.map((report) => {
          if (report.table === 'Sales Output') {
            return report;
          }
        }).filter(Boolean);
        $scope.costsReports = reports.map((report) => {
          if (report.table === 'Costs Output') {
            return report;
          }
        }).filter(Boolean);
      });

      $scope.save = function () {
        Loader.load();
        delete $scope.client.releaseMappings;
        delete $scope.client.trackMappings;
        delete $scope.client.workMappings;

        if ($scope.client.trialDays < 14) {
          return Loader.error('Trial days can\'t be below 14.');
        }

        if ($scope.client.billing && $scope.client.billing.nextBillingDate) {
          const lastPaymentDate = new Date($scope.client.billing.nextBillingDate);
          lastPaymentDate.setMonth(lastPaymentDate.getMonth() - 1);
          $scope.client.billing.lastPaymentDate = lastPaymentDate;
        }

        if (!$scope.client._id) {
          Client.create($scope.client, (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.client));
              $window.location.href = `#/clients/${response.data._id}/edit`;
              Loader.success('Client successfully created');
            } else {
              Loader.error(response.data.message);
            }
          });
        } else {
          Client.update($scope.client._id, $scope.client, (response) => {
            if (response.status === 200) {
              $scope.client = response.data;
              if (response.data.billing.lastPaymentDate) {
                const nextBillingDate = new Date(response.data.billing.lastPaymentDate);
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
                $scope.client.billing.nextBillingDate = nextBillingDate;
              }
              Client.getUsage($scope.client._id, null, (response) => { $scope.usage = response.data; });
              Loader.success('Client successfully saved');
            } else {
              Loader.error('Error saving client, please try again or contact support');
            }
          });
        }
      };

      $scope.showDeleteModal = function () {
        $('#validationModal').modal();
      };

      $scope.delete = function () {
        Loader.load();
        $('#validationModal').modal('hide');
        $('#validationModal').on('hidden.bs.modal', () => {
          Client.delete($scope.client._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/clients';
              Loader.success('Client successfully deleted');
            } else {
              Loader.error('Error deleting client, please try again or contact support');
            }
          });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.client._id) {
          Client.modelHistory($scope.client._id, (response) => {
            if (response.status === 200) {
              $scope.client.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.client));
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

      $scope.chargeClient = function () {
        Loader.load();
        Client.charge((response) => {
          if (response.status === 200) {
            $scope.chargeSuccess = true;
            $scope.chargeError = false;
          } else {
            $scope.chargeSuccess = false;
            $scope.chargeError = response.data.message;
          }
          Loader.complete();
        });
      };

      $scope.chargeClients = function () {
        Loader.load();
        Client.chargeClients((response) => {
          Loader.complete();
        });
      };
      $scope.checkExpiringTrials = function () {
        Loader.load();
        Client.checkExpiringTrials((response) => {
          Loader.complete();
        });
      };
      $scope.notifyAboutClientBeingDeleted = function () {
        Loader.load();
        Client.notifyAboutClientBeingDeleted((response) => {
          Loader.complete();
        });
      };
      $scope.deleteClients = function () {
        Loader.load();
        Client.deleteClients((response) => {
          Loader.complete();
        });
      };
      $scope.openLastPaymentDatePopup = function () {
        $scope.lastPaymentDatePopup = true;
      };
      $scope.timeAgo = function (date) {
        if (!date) { return '0 days'; }
        const currentDate = new Date(date);
        const seconds = Math.floor((new Date() - currentDate) / 1000);
        const d = Math.floor(seconds / (3600 * 24));
        if (d < 0) {
          return `In ${-d} days`;
        }
        return `${d} days ago`;
      };
      $scope.openNextBillingDatePopup = function () {
        if (typeof ($scope.nextBillingDatePopup) === 'undefined') {
          $scope.nextBillingDatePopup = {};
        }
        $scope.nextBillingDatePopup.opened = true;
      };
      $scope.openCreatedAtDatePopup = function () {
        if (typeof ($scope.createdAtDatePopup) === 'undefined') {
          $scope.createdAtDatePopup = {};
        }
        $scope.createdAtDatePopup.opened = true;
      };
      $scope.flushLockedStatus = function () {
        $scope.client.lockedForNonPayment = false;
        $scope.save();
      };
      $scope.reactivateTrial = function () {
        delete $scope.client.billing.nextBillingDate;
        delete $scope.client.billing.lastPaymentDate;

        $scope.save();
      };
      $scope.endTrial = function () {
        $scope.client.billing.nextBillingDate = new Date().setMonth(new Date().getMonth() + 1);

        $scope.save();
      };
    },
  ]);
