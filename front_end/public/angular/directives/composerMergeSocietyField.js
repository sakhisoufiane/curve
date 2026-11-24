angular.module('Curve')
  .directive('composerMergeSocietyField', ($http, $timeout, Session, Composer) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/composer-merge-society-field.html',
    scope: {
      label: '@',
      proKey: '@',
      proIdentifierKey: '@',
      mergedFields: '=',
      mergedComposer: '=',
    },
  }));
