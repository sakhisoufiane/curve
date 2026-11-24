angular.module('Curve')
  .factory('Auth', ($http, $rootScope, $cookies, Session, jwtHelper, $window) => ({
    test(token, callback) {
      Session.token = token;
      if (window.location.origin === 'http://localhost:8082') {
        Session.apiUrl = 'http://localhost:8081';
        // Session.production = true;
        // Session.apiUrl = "https://staging-api.curveroyaltysystems.com";
      } else if (window.location.origin === 'https://dev.curveroyaltysystems.com') {
        Session.apiUrl = 'https://dev-api.curveroyaltysystems.com';
      } else if (window.location.origin === 'https://staging.curveroyaltysystems.com' || window.location.origin === 'http://Curve-tomallen654558.codeanyapp.com:8082') {
        Session.apiUrl = 'https://staging-api.curveroyaltysystems.com';
      } else if (window.location.origin === 'https://beta.curveroyaltysystems.com' || window.location.origin === 'http://beta.curveroyaltysystems.com') {
        Session.apiUrl = 'https://beta-api.curveroyaltysystems.com';
      } else if (window.location.origin === 'https://release.curveroyaltysystems.com') {
        Session.apiUrl = 'https://release-api.curveroyaltysystems.com';
      } else if (window.location.origin === 'https://beta1.curveroyaltysystems.com' || window.location.origin === 'http://beta1.curveroyaltysystems.com') {
        Session.beta = true;
        Session.apiUrl = 'https://beta1-api.curveroyaltysystems.com';
      } else {
        Session.apiUrl = 'https://api.curveroyaltysystems.com';
        Session.production = true;
      }
      if (token) {
        $http({
          method: 'GET',
          url: `${Session.apiUrl}/authenticate/test_token`,
        }).then((response) => {
          const { data } = response;
          if (data.success === true) {
            Session.isLoggedIn = true;
            Session.token = data.token;
            const tokenPayload = jwtHelper.decodeToken(Session.token);
            Session.clientId = tokenPayload.clientId;
            Session.clientName = data.clientName;
            Session.currencySymbol = data.currencySymbol;
            Session.clientType = data.clientType;
            Session.internal = tokenPayload.internal;
            Session.superInternal = tokenPayload.superInternal;
            Session.monitoring = tokenPayload.monitoring;
            Session.parentId = tokenPayload.parentId;
            Session.payeeId = tokenPayload.payeeId;
            Session.id = tokenPayload.id;
            Session.userType = data.userType;
            Session.adminType = data.adminType;
            Session.requiresTsAndCsConfirmation = data.requiresTsAndCsConfirmation;
            Session.features = data.features;
            Session.flushScripts = data.flushScripts;
            $rootScope.$broadcast('user-logged-in', Session);
            if (callback) {
              callback(Session);
            }
            setTimeout(() => {
              jQuery('#logo-overlay').addClass('hidden-overlay');
            }, 500);
          } else {
            setTimeout(() => {
              jQuery('#sidebar').addClass('display-none');
              jQuery('#container').addClass('display-none');
              jQuery('#overlay').addClass('display-none');
              jQuery('#logo-overlay').addClass('hidden-overlay');
              $cookies.remove('curveToken');
              $cookies.remove('originalUserId');
              $cookies.remove('originalToken');
              $cookies.remove('originalClient');
              $cookies.remove('demoMode');
              window.location.replace(`${window.location.origin}/login`);
              if (callback) {
                callback(Session);
              }
            }, 1500);
          }
        }, (error) => {
          setTimeout(() => {
            jQuery('#sidebar').addClass('display-none');
            jQuery('#container').addClass('display-none');
            jQuery('#overlay').addClass('display-none');
            jQuery('#logo-overlay').addClass('hidden-overlay');
            $cookies.remove('curveToken');
            $cookies.remove('originalUserId');
            $cookies.remove('originalToken');
            $cookies.remove('originalClient');
            $cookies.remove('demoMode');
            window.location.replace(`${window.location.origin}/login`);
            if (callback) {
              callback(Session);
            }
          }, 1500);
        });
      } else {
        setTimeout(() => {
          jQuery('#sidebar').addClass('display-none');
          jQuery('#container').addClass('display-none');
          jQuery('#overlay').addClass('display-none');
          jQuery('#logo-overlay').addClass('hidden-overlay');
          $cookies.remove('curveToken');
          $cookies.remove('originalUserId');
          $cookies.remove('originalToken');
          $cookies.remove('originalClient');
          $cookies.remove('demoMode');
          window.location.replace(`${window.location.origin}/login`);
          if (callback) {
            callback(Session);
          }
        }, 1500);
      }
    },
    whitelabel(token, callback) {
      $http({
        method: 'GET',
        url: `${Session.apiUrl}/authenticate/whitelabel`,
      }).then((response) => {
        callback(null, response.data);
      });
    },
    logout() {
      $cookies.remove('curveToken');
      $cookies.remove('originalUserId');
      $cookies.remove('originalToken');
      $cookies.remove('originalClient');
      $cookies.remove('demoMode');
      $cookies.remove('qaMode');
      $window.location.replace('/login');
    },
  }));
