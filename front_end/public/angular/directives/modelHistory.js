angular.module('Curve')
  .directive('modelHistory', ['$http', 'Session', 'ModelHistoryFieldMapping', function ($http, Session, ModelHistoryFieldMapping) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/model-history.html',
      scope: {
        data: '=',
        deliveryPartnerData: '=',
      },
      link(scope) {
        scope.toggleFieldsTable = function (index) {
          $(`.fields-table.${index}`).toggleClass('hidden');
        };
        scope.makeReadable = function (path) {
          const formattedPath = ModelHistoryFieldMapping.formatted(path);
          if (formattedPath === 'Rights Chain') {
            if (path.includes('publisherId')) {
              return `${formattedPath} - Publisher - Significant Update`;
            }
            if (path.includes('composerId')) {
              return `${formattedPath} - Composer - Significant Update`;
            }
            return `${formattedPath} - Significant Update`;
          }
          if (formattedPath === 'Title' || formattedPath === 'Territories') {
            return `${formattedPath} - Significant Update`;
          }
          return formattedPath;
        };
        scope.formatOps = function (ops, path) {
          if (path === 'Delivered To') {
            return ModelHistoryFieldMapping.getDeliveryPartnerNameFromOps(ops, scope.deliveryPartnerData);
          }
          return ops;
        };
      },
    };
  }]);
