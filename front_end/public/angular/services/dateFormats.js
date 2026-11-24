angular.module('Curve')
  .factory('dateFormats', () => [{ name: 'DD/MM/YYYY', format: 'dd/MM/yyyy', default: true }, { name: 'MM/DD/YYYY', format: 'MM/dd/yyyy', default: false }]);
