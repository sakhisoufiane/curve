const app = angular.module('Curve', ['ngRoute', 'ngCookies', 'ngFileUpload', 'ngFileSaver', 'ui.select', 'ui.sortable', 'ui.bootstrap', 'angular-jwt', 'ngSanitize', 'ngMaterial', 'ngAnimate', 'ngAria', 'chart.js', '720kb.tooltips']);

app.config(['$locationProvider', function ($locationProvider) {
  $locationProvider.hashPrefix('');
}]);

app.run(['$cookies', 'Session', 'Auth', '$window', '$rootScope', function ($cookies, Session, Auth, $window, $rootScope) {
  Session.token = $cookies.get('curveToken');
  Auth.test($cookies.get('curveToken'));

  if ($window.posthog && Session.production && $cookies.get('qaMode') !== 'true') {
    $window.posthog.init('phc_385huJz7jXt3yGTUnaxe22lcpCAbsggfkm2Hypa62ZQ', {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2025-05-24',
      person_profiles: 'always',
      // We capture pageviews manually on $routeChangeSuccess (below) because Angular's
      // hash-based routing does not reliably trigger PostHog's default pageview tracking.
      capture_pageview: false,
    });

    // Fire a $pageview event on every successful Angular route change so SPA
    // navigations are recorded in PostHog.
    $rootScope.$on('$routeChangeSuccess', () => {
      $window.posthog.capture('$pageview');
    });
  }
}]);
