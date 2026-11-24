angular.module('Curve')
  .directive('salesTemplateCalculationConditionRow', ['Session', 'TemplateFields', function (Session, TemplateFields) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/sales-template-calculation-condition-row.html',
      scope: {
        condition: '=',
        delete: '&',
        edit: '=',
      },
      link(scope) {
        scope.inputTypes = ['Column', 'Field'];
        scope.comparaisons = [
          'Equals',
          'Does Not Equal',
          'Greater Than',
          'Greater Than or Equal To',
          'Less Than',
          'Less Than or Equal To',
          'Contains',
          'Does Not Contain',
          'Is Blank',
          'Is Not Blank',
        ];
        scope.templateFields = Session.clientType === 'Publisher' ? TemplateFields.publishingWithMappedValues : TemplateFields.recordingsWithMappedValues;
      },
    };
  }]);
