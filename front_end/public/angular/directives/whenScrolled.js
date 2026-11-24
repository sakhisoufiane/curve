angular.module('Curve')
  .directive('whenScrolled', () => function (scope, elm, attr) {
    const raw = elm[0];
    elm.bind('scroll', () => {
      if (raw.scrollTop + raw.offsetHeight >= (raw.scrollHeight - 1)) {
        scope.$apply(attr.whenScrolled);
      }
    });
  });
