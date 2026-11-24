angular.module('Curve')
  .directive('spotifyResponsiveTable', ['SelectAll', 'Session', function (SelectAll, Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/spotify-responsive-table.html',
      scope: {
        headers: '=',
        data: '=',
        selectable: '=',
        orderBy: '=?',
        sortChanged: '&',
        hideValidation: '=',
      },
      link(scope) {
        scope.convertDuration = function (duration) {
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration - minutes * 60);
          return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        };
        scope.selectAllChecked = false;
        scope.selectAll = function (array) {
          SelectAll.select(array);
          scope.selectAllChecked = true;
        };
        scope.$watch('data', () => {
          if (scope.selectAllChecked) {
            scope.selectAllChecked = false;
          }
        });
      },
    };
  }]);
