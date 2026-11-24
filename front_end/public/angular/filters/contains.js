angular.module('Curve').filter('contains', () => function (array, needle) {
  return array.indexOf(needle) !== -1;
});
