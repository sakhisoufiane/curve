angular.module('Curve')
  .controller('fixedReportsEditController', ['$scope', '$routeParams', 'Loader', 'FixedReport', 'Client',
    function ($scope, $routeParams, Loader, FixedReport, Client) {
      const controller = this;

      $scope.specificAccessItems = ['Public', 'Client'];

      this.loadReport = function () {
        Loader.load();
        FixedReport.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.fixedReport = response.data;
            setSpecificAccess();
            Loader.complete();
          } else {
            Loader.error('Error loading report, please try again or contact support');
          }
        });
      };

      $scope.save = () => {
        Loader.load();

        const isValid = validateFields();
        if (!isValid) { return; }

        delete $scope.fixedReport.specificAccess;
        FixedReport.update($scope.fixedReport._id, $scope.fixedReport, (response) => {
          if (response.status === 200) {
            controller.loadReport();
            Loader.success('Report successfully saved');
          } else {
            Loader.error('Error saving Report, please try again or contact support');
          }
        });
      };

      $scope.loadClients = () => {
        Client.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            $scope.clients = response.data.clients;
          } else {
            Loader.error('Could not load clients');
          }
        });
      };

      function setSpecificAccess() {
        let access = '';

        if ($scope.fixedReport.public) {
          access = 'Public';
        } else if ($scope.fixedReport.clientIds.length > 0) {
          access = 'Client';
        }

        $scope.fixedReport.specificAccess = access;
      }

      function validateFields() {
        if (!$scope.fixedReport.specificAccess) {
          $scope.fixedReport.public = false;
          $scope.fixedReport.clientIds = [];
          return true;
        }

        if ($scope.fixedReport.specificAccess === 'Public') {
          $scope.fixedReport.public = true;
          $scope.fixedReport.clientIds = [];
          return true;
        }

        if ($scope.fixedReport.clientIds.length > 0) {
          $scope.fixedReport.public = false;
          return true;
        }

        if ($scope.fixedReport.specificAccess === 'Client' && !$scope.fixedReport.clientIds.length) {
          Loader.error('Requires a Client ID');
          return false;
        }
      }

      // Init
      if ($routeParams.id) { controller.loadReport(); }
    },
  ]);
