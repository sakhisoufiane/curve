angular.module('Curve')
  .directive('alternateTitleRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/alternate-title-row.html',
    scope: {
      title: '=',
      languages: '=',
      delete: '&',
      edit: '=',
    },
  }));
