angular.module('Curve')
  .directive('responsiveTable', ['SelectAll', 'Session', function (SelectAll, Session) {
    return {
      restrict: 'E',
      templateUrl: 'angular/templates/directives/responsive-table.html',
      scope: {
        headers: '=',
        data: '=',
        selectable: '=',
        orderBy: '=?',
        sortChanged: '&',
        hideValidation: '=',
      },
      link(scope) {
        scope.orderBy = scope.orderBy ? scope.orderBy : 'title';
        scope.orderDir = 'asc';
        scope.selectAllChecked = false;
        scope.currencySymbol = Session.currencySymbol;
        scope.sortByHeader = function (header) {
          if (header.sortable && header.name) {
            if (scope.orderBy === header.name) {
              scope.orderDir = (scope.orderDir === 'asc') ? 'desc' : 'asc';
            }
            scope.orderBy = header.name;
            scope.sortChanged({
              orderBy: scope.orderBy,
              orderDir: scope.orderDir,
            });
          }
        };

        scope.selectAll = function (array) {
          SelectAll.select(array);
          scope.selectAllChecked = true;
        };

        scope.formatNumber = function (num) {
          if (num >= 1000) {
            return `${Math.floor(num / 1000)}k`;
          }
          return num;
        };

        scope.whatClassIsIt = function (header) {
          if (!header.sortable || !header.name) return '';
          if (scope.orderBy === header.name) {
            if (scope.orderDir === 'asc') {
              return 'sorting_asc';
            }
            return 'sorting_desc';
          }
          return 'sorting';
        };

        scope.$watch('data', () => {
          if (scope.selectAllChecked) {
            scope.selectAllChecked = false;
          }
        });
      },
    };
  }])
  .directive('customCell', ['$sce', function ($sce) {
    return {
      restrict: 'E',
      template: '<div ng-bind-html=\'content\'></div>',
      scope: {
        row: '=',
        onRendered: '&',
      },
      link(scope, element) {
        scope.content = $sce.trustAsHtml(scope.onRendered({
          event: {
            row: scope.row,
            element,
          },
        }));

        // detect change and re-render
        scope.$watch('row', () => {
          scope.content = $sce.trustAsHtml(scope.onRendered({
            event: {
              row: scope.row,
              element,
            },
          }));
        });
      },
    };
  }]);
