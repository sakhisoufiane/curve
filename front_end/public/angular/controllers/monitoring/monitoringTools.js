angular.module('Curve')
  .controller('monitoringTools', ['$scope', '$window', 'Session', 'Loader', 'Client', 'Monitoring',
    function ($scope, $window, Session, Loader, Client, Monitoring) {
      $scope.copyClientId = '';
      $scope.selectedScript = '';
      $scope.selectedIngestion = '';
      $scope.selectedFtpIngestion = '';
      $scope.disableCopyBtn = true;
      $scope.includeSalesFiles = false;
      $scope.includePeriodAndStatementFiles = false;
      $scope.includeTables = false;
      $scope.includeArchived = false;
      $scope.production = Session.production;

      function getSupportScriptList() {
        Loader.load();
        Monitoring.supportScriptList((response) => {
          if (response.status === 200) {
            const supportScripts = response.data.map((obj) => {
              if (obj.script === 'triggerIngestion' && Session.clientType === 'Label') {
                return { ...obj, scriptParams: obj.scriptParams.filter((ingestion) => ingestion.name !== 'Acknowledgement') };
              }
              return obj;
            });
            $scope.supportScripts = supportScripts;
            Loader.success('Support script loaded');
          } else {
            Loader.error('Could not load support scripts');
          }
        });
      }
      getSupportScriptList();

      $scope.copy = function () {
        Loader.load();
        const params = { id: $scope.copyClientId, includeSalesFiles: $scope.includeSalesFiles, includePeriodAndStatementFiles: $scope.includePeriodAndStatementFiles, includeTables: $scope.includeTables, includeArchived: $scope.includeArchived };
        Monitoring.copyClient(params, (response) => {
          if (response.status === 200) {
            $scope.copyClientId = '';
            $window.location.href = '#/monitoring/';
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.createScriptTask = function () {
        Loader.load();
        const params = JSON.parse(angular.toJson($scope.selectedScript));
        Monitoring.supportScript(params, (response) => {
          if (response.status === 200) {
            $scope.selectedScript = '';
            $window.location.href = '#/monitoring/';
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.setCurrentScript = function ($script) {
        $scope.selectedScript = $script;
      };

      $scope.setSelectedIngestion = function (item) {
        if (!Session.clientId) {
          return Loader.error('No client found');
        }
        if ($scope.selectedFtpIngestion) $scope.selectedFtpIngestion = '';
        $scope.selectedIngestion = item;
        if (item.scriptParams && item.name !== 'Catalogue') {
          Loader.load();
          Monitoring.ftpIngestionList({ clientId: Session.clientId, ftpIngestionType: item.scriptParams.name }, (response) => {
            if (response.status === 200) {
              $scope.selectedIngestion = { ...$scope.selectedIngestion, items: response.data };
              Loader.success('FTP ingestion list successfully loaded');
            } else {
              Loader.error('Failed to load FTP ingestion list');
            }
          });
        }
      };

      $scope.setSelectedFtpIngestion = function (item) {
        $scope.selectedFtpIngestion = item;
      };

      $scope.triggerFtpIngestion = function () {
        const { clientId } = Session;
        const ftpIngestionType = $scope.selectedIngestion.scriptParams.name;
        const name = $scope.selectedFtpIngestion;
        Monitoring.triggerFtpIngestion({ clientId, ftpIngestionType, name }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.$watch('copyClientId', (clientId) => {
        $scope.disableCopyBtn = true;
        if (clientId && clientId !== '') {
          const params = { name: clientId };

          Client.all(params, (response) => {
            if (response.status === 200) {
              $scope.client = response.data.clients[0];
              $scope.disableCopyBtn = false;
            } else {
              Loader.error('Could not find client');
              $scope.disableCopyBtn = true;
            }
          });
        }
      });
    },
  ]);
