angular.module('Curve')
  .factory('httpInterceptor', ($q, $window, $injector, $rootScope) => {
    let Session;
    return {
      responseError(response) {
        // App is in maintenance
        if (response.status === 503) {
          $rootScope.inMaintenanceMode = true;
        } else if (response.status === 402) {
          // Client billing issue.
          $window.location.href = '#/billing';
          Session = Session || $injector.get('Session');
          Session.setLockedForPayment(true);
        }
        return $q.reject(response);
      },
      response(response) {
        if ($rootScope.inMaintenanceMode) { $rootScope.inMaintenanceMode = false; }
        return response;
      },
      // add session token and applicationToken to header for each API request
      request(config) {
        Session = Session || $injector.get('Session');
        // only add tokens to header if API call
        if (new RegExp(`^${Session.apiUrl.replace(/[:/.]/g, '\\$&')}`).test(config.url)) {
          config.headers.token = Session.token;
          config.headers.applicationToken = 'DrLmNC2q9t';
        }

        // Handle demo mode
        if ($rootScope.demoMode) {
          config.headers.demo = true;
        }

        return config;
      },
    };
  });

angular.module('Curve').config(($httpProvider) => {
  $httpProvider.interceptors.push('httpInterceptor');
});
