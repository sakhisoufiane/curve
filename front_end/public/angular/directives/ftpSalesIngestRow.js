angular.module('Curve')
  .directive('ftpSalesIngestRow', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/ftp-sales-ingest-row.html',
    scope: {
      server: '=',
      index: '=',
      clientAdminUser: '=',
      delete: '&',
      verifyFtp: '&',
    },
    link($scope) {
      $scope.serverProtocols = ['FTP', 'SFTP', 'FTPES', 'FTPS'];
      // split to name/values - use FTPES (AUTH SSL)
      // list out the ones we know but with a value of other??
      // - looks more knowing
      // + if configs need to be added in the future then noone needs to change setup wwhich they can't do once initialised
      // also thing with ingested file becoming ignored files and not filtering on initialisation
      $scope.dspOptions = [
        { name: 'Amazon', value: 'amazon' },
        { name: 'Merlin', value: 'merlin' },
        { name: 'Spotify', value: 'spotify' },
        { name: 'Other', value: 'other' },
      ];

      $scope.$watch('server.dsp', (dsp) => {
        if (dsp === 'merlin') {
          $scope.server.host = 'ftp.merlinnetwork.org';
          $scope.server.directory = '/';
          $scope.server.protocol = 'FTPES';
          $scope.server.recursive = true;
        }
      });
    },
  }));
