angular.module('Curve')
  .directive('salesTemplateCalculationRow', ['$rootScope', 'Session', 'TemplateFields', 'TemplateTypes', 'Territories', 'TerritoriesWithoutContinents', function ($rootScope, Session, TemplateFields, TemplateTypes, Territories, TerritoriesWithoutContinents) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/sales-template-calculation-row.html',
      scope: {
        calculation: '=',
        options: '=',
        delete: '&',
        edit: '=',
        enablePublisherMapping: '=',
      },
      link(scope) {
        angular.extend(scope.options, {
          directiveFunction() {
            // updateConditions();
            // updateOutputFields();
          },
        });

        function updateCalcTemplateFields() {
          let fields = Session.clientType === 'Publisher' ? TemplateFields.publishingWithMappedValues : TemplateFields.recordingsWithMappedValues;
          if (!($rootScope.features?.enhancedParticipationRates && Session.clientType === 'Publisher' && scope.enablePublisherMapping)) {
            fields = fields.filter((f) => f.value !== 'mappedPublishers');
          }
          scope.templateFields = fields;
          if (scope.templateFields.map((val) => val.name).indexOf('Skip Row') === -1) { scope.templateFields.unshift({ name: 'Skip Row', value: 'Skip Row' }); }
        }
        updateCalcTemplateFields();
        scope.$watch('enablePublisherMapping', updateCalcTemplateFields);
        scope.$watch(() => $rootScope.features, updateCalcTemplateFields);

        scope.calculationTypes = ['Complex', 'Simple Calculation', 'Copy Field'];
        scope.calculationConditions = [{ name: 'Any One of the Below', value: 'Any' }, { name: 'All of the Below', value: 'All' }, { name: 'Always', value: 'Always' }];
        scope.functionTypes = ['Equals', 'Addition', 'Minus', 'Multiply', 'Divide', 'Left', 'Right'];
        scope.valueTypes = ['Column', 'Field', 'Value'];
        scope.dateTypes = TemplateTypes.filter((row) => row.name.includes('Date:'));

        // WW – All World should be included but not continents
        // Territories[0] should always be All World
        scope.territories = [Territories[0], ...TerritoriesWithoutContinents];

        scope.$watch('calculation.conditions', (conditions) => {
          scope.calculation.displayConditions = [];
          angular.forEach(conditions, (condition) => {
            if (condition) {
              scope.calculation.displayConditions.push({
                inputType: condition.inputType,
                if: condition.if,
                comparison: condition.comparison,
                value: condition.value,
              });
            }
          });
        });
        scope.addCondition = function () {
          scope.calculation.displayConditions.push({});
        };
        scope.deleteCondition = function (condition) {
          const index = scope.calculation.displayConditions.indexOf(condition);
          scope.calculation.displayConditions.splice(index, 1);
        };

        scope.$watch('calculation.calculations', (outputFields) => {
          scope.calculation.displayOutputFields = [];
          angular.forEach(outputFields, (outputField) => {
            scope.calculation.displayOutputFields.push({
              function: outputField.function,
              valueType: outputField.valueType,
              value: outputField.value,
            });
          });
        });
        scope.addOutputField = function () {
          scope.calculation.displayOutputFields.push({});
        };
        scope.deleteOutputField = function (outputField) {
          const index = scope.calculation.displayOutputFields.indexOf(outputField);
          scope.calculation.displayOutputFields.splice(index, 1);
        };

        scope.addField = function (type) {
          if (type === 'Simple Calculation') {
            scope.addOutputField();
            scope.calculation.conditionType = 'Always';
          }
        };
      },
    };
  }]);
