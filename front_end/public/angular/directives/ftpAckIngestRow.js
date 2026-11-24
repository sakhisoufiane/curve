angular.module('Curve')
  .directive('ftpAckIngestRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/ftp-ack-ingest-row.html',
    scope: {
      server: '=',
      index: '=',
      clientAdminUser: '=',
      delete: '&',
      verifyFtp: '&',
      uploadFile: '&',
    },
    link($scope) {
      $scope.files = [];
      $scope.serverProtocols = ['FTP', 'SFTP', 'FTPES', 'FTPS'];
      $scope.authenticationTypes = ['Password', 'Key File'];
    },
  }));
