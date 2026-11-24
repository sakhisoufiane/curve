angular.module('Curve')
  .directive('salesTemplateCalculationOutputfieldRow', ['$rootScope', 'Session', 'TemplateFields', function ($rootScope, Session, TemplateFields) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/sales-template-calculation-outputfield-row.html',
      scope: {
        outputfield: '=',
        calculateAfterMapping: '=',
        delete: '&',
        edit: '=',
        enablePublisherMapping: '=',
      },
      link(scope) {
        scope.functionTypes = [{ name: 'Plus', value: 'Addition' }, { name: 'Minus', value: 'Minus' }, { name: 'Multiplied By', value: 'Multiply' }, { name: 'Divided By', value: 'Divide' }, { name: 'Get First X Number of Characters', value: 'Left' }, { name: 'Get Last X Number of Characters', value: 'Right' }, { name: 'Concatenate', value: 'Concatenate' }];
        scope.valueTypes = ['Column', 'Field', 'Value'];
        scope.templateFields = Session.clientType === 'Publisher' ? TemplateFields.publishing : TemplateFields.recordings;

        updateTemplateFields(scope.calculateAfterMapping);
        scope.$watch('calculateAfterMapping', (calculateAfterMapping) => {
          updateTemplateFields(calculateAfterMapping);
          // ensure mapped field values are removed when calculateAfterMapping is unchecked
          if (!calculateAfterMapping && scope.outputfield.valueType === 'Field' && scope.templateFields.filter((row) => row.value === scope.outputfield.value).length === 0) {
            delete scope.outputfield.value;
          }
        });
        scope.$watch('enablePublisherMapping', () => {
          updateTemplateFields(scope.calculateAfterMapping);
        });
        scope.$watch(
          () => $rootScope.features,
          () => {
            updateTemplateFields(scope.calculateAfterMapping);
          },
        );

        function updateTemplateFields(calculateAfterMapping) {
          if (calculateAfterMapping) {
            scope.templateFields = Session.clientType === 'Publisher' ? TemplateFields.publishingWithMappedValues : TemplateFields.recordingsWithMappedValues;
          } else {
            scope.templateFields = Session.clientType === 'Publisher' ? TemplateFields.publishing : TemplateFields.recordings;
          }
          // Filter out mappedPublishers if publisher mapping is not enabled
          if (!($rootScope.features?.enhancedParticipationRates && Session.clientType === 'Publisher' && scope.enablePublisherMapping)) {
            scope.templateFields = scope.templateFields.filter((f) => f.value !== 'mappedPublishers');
          }
        }
      },
    };
  }]);
