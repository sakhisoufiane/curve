angular.module('Curve')
  .controller('salesFileNewController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Notification', 'Territories', 'Settings', 'Uploader', 'SalesFile', 'Currencies', 'Loader', 'Pros',
    function ($rootScope, $scope, $routeParams, $window, Session, Notification, Territories, Settings, Uploader, SalesFile, Currencies, Loader, Pros) {
      $window.scrollTo(0, 0);
      $scope.salesFile = { overwriteFields: {}, overwriteFieldTargetCells: {} };
      $scope.templates = [];
      $scope.selectedTemplate = { exampleLines: [] };
      $scope.data = [];
      $scope.array = [];
      $scope.files = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.sales;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $scope.getSources = function () {
        $scope.sources = [];
        if (Session.clientType === 'Label' || Session.clientType === 'Distributor') {
          $scope.sources.push('Apple');
        }
        $scope.templates.forEach((template) => {
          if ($scope.sources.indexOf(template.source) === -1) {
            $scope.sources.push(template.source);
          }
        });
        return $scope.sources;
      };

      Settings.getActiveTemplates()
        .then((templates) => {
          $scope.templates = templates;
          // Add iTunes templates
          $scope.getSources();
        });

      $scope.onSelectedTemplate = function (selectedItem) {
        if (selectedItem) {
          $scope.salesFile.salesAccountName = selectedItem.source;
          $scope.salesFile.salesTemplateId = selectedItem._id;
          $scope.templateId = selectedItem._id;
          $scope.selectedTemplate = selectedItem;
          if (selectedItem.overwriteFields) {
            $scope.salesFile.overwriteFields = selectedItem.overwriteFields;
            delete $scope.salesFile.overwriteFields.exchangeRate;
            if (selectedItem.overwriteFields.saleDate) { $scope.salesFile.overwriteFields.saleDate = new Date(selectedItem.overwriteFields.saleDate); }
            if (selectedItem.overwriteFields.transactionDate) { $scope.salesFile.overwriteFields.transactionDate = new Date(selectedItem.overwriteFields.transactionDate); }
          }
          $scope.templateId = selectedItem._id;
          if (selectedItem.overwriteFieldTargetCells) {
            $scope.salesFile.overwriteFieldTargetCells = selectedItem.overwriteFieldTargetCells;
          }
        } else {
          $scope.selectedTemplate = {};
          $scope.salesFile.salesTemplateId = '';
        }
        return $scope.selectedTemplate;
      };

      $scope.addExchangeRate = function () {
        $scope.salesFile.exchangeRates = $scope.salesFile.exchangeRates || [];
        $scope.salesFile.exchangeRates.push({});
      };

      $scope.deleteExchangeRate = function (exchangeRate) {
        const index = $scope.salesFile.exchangeRates.indexOf(exchangeRate);
        $scope.salesFile.exchangeRates.splice(index, 1);
      };

      $scope.create = function () {
        $scope.salesFile.status = 'Setup';
        // Validate everything is included
        validateSetup();
        if ($scope.setupErrors && $scope.setupErrors.length === 0) {
          Loader.load();
          save((response) => {
            if (response.status === 200) {
              $scope.salesFile = response.data;
              Loader.complete();
              Uploader.upload($scope.files[0], `/salesFiles/${$scope.salesFile._id}/get_upload_credentials`).then((response) => {
                if (response.data.type === 'Processing') {
                  $window.location.href = '#/sales';
                  Loader.success('The Sales File is currently processing, check back to the file shortly');
                } else if ($scope.files[1]) {
                  Uploader.upload($scope.files[1], `/salesFiles/${$scope.salesFile._id}/get_additional_file_upload_credentials`).then((response) => {
                    $window.location.href = `#/sales/${$scope.salesFile._id}/edit`;
                    Loader.success('Sales File successfully created');
                  });
                } else {
                  $window.location.href = `#/sales/${$scope.salesFile._id}/edit`;
                  Loader.success('Sales File successfully created');
                }
              });
            } else {
              Loader.error('Error saving sales file, please try again or contact support');
            }
          });
        }
      };

      function validateSetup() {
        $scope.setupErrors = [];
        if (!$scope.salesFile.name) { $scope.setupErrors.push('Sales File is required to have a name'); }
        if (!$scope.salesFile.salesTemplateId) { $scope.setupErrors.push('Sales File is required to have a template'); }
        if (!$scope.files[0]) { $scope.setupErrors.push('Sales File is required to have a file'); }
        if ($scope.salesFile.salesAccountName === 'Apple' && !$scope.files[1]) { $scope.setupErrors.push('Finance File is required for Apple Sales Files'); }
      }

      function save(callback) {
        SalesFile.create($scope.salesFile, (response) => {
          callback(response);
        });
      }
    }]);
