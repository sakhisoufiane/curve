angular.module('Curve')
  .directive('ftpIswcIngestRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/ftp-iswc-ingest-row.html',
    scope: {
      server: '=',
      verifyFtp: '&',
      index: '=',
      clientAdminUser: '=',
      delete: '&',
    },
    link($scope) {
      $scope.serverProtocols = ['FTP', 'SFTP'];
    },
  }));
