angular.module('Curve')
  .controller('applicationController', ['$scope', '$route', '$window', '$rootScope', '$cookies', 'Session', 'Auth', 'Loader', 'Pagination', 'User', 'Client', 'Notification', 'jwtHelper', 'SymbolFromCurrency', '$timeout',
    function ($scope, $route, $window, $rootScope, $cookies, Session, Auth, Loader, Pagination, User, Client, Notification, jwtHelper, SymbolFromCurrency, $timeout) {
      const controller = this;
      let showingLegalModal;
      $scope.isLoggedIn = Session.isLoggedIn;
      $scope.internalUser = false;
      $scope.superInternalUser = false;
      $scope.monitoring = false;
      $scope.parentUser = false;
      $scope.temporaryClient = '';
      $scope.userType = Session.userType;
      $scope.userEmail = Session.userEmail;
      $scope.clientType = Session.clientType;
      $scope.clientRights = Session.clientRights;
      $scope.paymentProvider = Session.paymentProvider;
      $scope.lockedForNonPayment = Session.getlockedForNonPayment;
      $scope.darkLogo = 'assets/img/curvetyp2x.png';
      $scope.lightLogo = 'assets/img/curvetypwhite2x.png';
      $scope.overlayLogo = 'assets/img/Curve-Logo-Light-Blue.png?rel=b2dc5b0ea2';
      $scope.date = new Date();
      $scope.userSuccess = false;
      $scope.demoMode = $cookies.get('demoMode') === 'true';
      $scope.qaMode = $cookies.get('qaMode') === 'true';
      $scope.labelStonlyTourId = 'ygiKLZMXwK';
      $scope.publisherStonlyTourId = 'hiV1A7nwQ1';
      $scope.payeeStonlyTourid = 'qeSxGLwZEb';
      $rootScope.demoMode = $scope.demoMode;
      $scope.launchTourIsClicked = false;
      $rootScope.validFileTypesGeneral = ['.pdf', '.xls', '.xlsx', '.xlsb', '.csv', '.doc', '.docx', '.rtf', '.png', '.jpg', '.tiff', '.tif'];
      $rootScope.validFileTypesSales = ['.txt', '.csv', '.tsv', '.xls', '.xlsx', '.xlsb', '.dat', '.crd', '.020', '.021', '.022', '.200', '.210', '.220', '.301', '.302', '.303', '.304', '.axf', '.roy', '.tab'];
      // add upper case versions of extensions as well
      $rootScope.validFileTypesGeneral = $rootScope.validFileTypesGeneral.concat($rootScope.validFileTypesGeneral.map((item) => item.toUpperCase()));
      $rootScope.validFileTypesSales = $rootScope.validFileTypesSales.concat($rootScope.validFileTypesSales.map((item) => item.toUpperCase()));

      const params = (new URL($window.location)).searchParams;
      const curveToken = params.get('curveToken');
      if (curveToken) {
        $cookies.put('curveToken', curveToken, { secure: true });
        $window.location.href = '/#/';
      }

      Auth.whitelabel($cookies.get('curveToken'), (err, result) => {
        if (result.darkLogo) {
          $scope.whiteLabelled = true;
          $scope.darkLogo = result.darkLogo;
        }
        if (result.lightLogo) { $scope.lightLogo = result.lightLogo; }
        if (result.pageTitle) { $window.document.title = result.pageTitle; }
        if (result.favicon) {
          const link = document.querySelector('link[rel*=\'icon\']') || document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          link.href = result.favicon;
          document.getElementsByTagName('head')[0].appendChild(link);
        }
      });

      Auth.test($cookies.get('curveToken'), (session) => {
        $scope.temporaryClient = session.clientName;
        if (session.internal) {
          Session.internal = true;
          $scope.internalUser = true;
        } else if (session.parentId) {
          Session.parent = true;
          $scope.parentUser = true;
        }

        if (session.superInternal) {
          Session.superInternal = true;
          $scope.superInternalUser = true;
        }

        if (session.monitoring) {
          Session.monitoring = true;
          $scope.monitoring = true;
        }

        $scope.userType = session.userType;
        $scope.userEmail = session.userEmail;
        $scope.adminType = session.adminType;
        $rootScope.clientAdminUser = $scope.adminType === 'Admin';
        $scope.clientType = session.clientType;
        $scope.flushScripts = session.flushScripts;
        $scope.altEnvironment = !session.production; // && !session.beta
        $scope.requiresTsAndCsConfirmation = session.requiresTsAndCsConfirmation;
        $scope.id = session.id;

        // set $rootScope as well. We need this to watch for any changes on browser refresh in controllers.
        $rootScope.internal = session.internal;
        $rootScope.clientType = session.clientType;
        $rootScope.userType = session.userType;
        $rootScope.features = session.features;
        $rootScope.clientId = session.clientId;
        $rootScope.parentId = session.parentId;
        if (!$scope.demoMode) { $cookies.put('originalUserId', session.id, { secure: true }); }
        initHelpscout();
        getClients();
        identifyPosthogUser();
      });

      $('.sidebar-menu ul li.sidebar-menu-item a.go-to').click(function (e) {
        // e.preventDefault();
        $('.sidebar-menu-item').removeClass('active');
        $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
        $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
        $(this).parents('.sidebar-menu-item').addClass('active');
        $(this).parents('.sidebar-menu-item').find('span.icon-thumbnail:first').addClass('bg-success');
        $(this).parents('.sub-menu-item').find('span.icon-thumbnail').addClass('white');
      });

      $scope.openOverlay = function () {
        $rootScope.isOpenOverlay = true;
      };

      $scope.logout = function () {
        Auth.logout();
      };

      // Client Select in Sidebar
      function getClients(searchTerm = '') {
        User.get_possible_clients($scope.id, { searchTerm }, (response) => {
          if (response.status === 200) {
            $scope.clients = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading user, please try again or contact support');
          }
        });
      }

      $scope.searchClients = function (select) {
        getClients(select.search);
      };

      // Not triggering the set client request until we get the User ID
      waitForIdBeforeSettingClient();
      function waitForIdBeforeSettingClient() {
        if ($scope.id) {
          setClientForCurrentUser({ clientId: Session.clientId, name: Session.clientName, payeeId: Session.payeeId });
        } else {
          setTimeout(waitForIdBeforeSettingClient, 250);
        }
      }

      $scope.setClientForCurrentUser = function (client) {
        Loader.load();
        setClientForCurrentUser(client, () => {
          $window.location.href = '#/';
          Loader.success(`You Are Now Logged In as ${client.name}`);
        });
      };

      function setClientForCurrentUser(client, callback) {
        // only set client if clientId or payeeId are available (will not be available for internal and parent users)
        // if (client.clientId || client.payeeId) {
        Session.setLockedForPayment(false);
        const params = {};
        if (client.clientId) {
          Session.clientId = client.clientId;
          Session.payeeId = null;
          params.roleId = client.clientId;
          params.role = 'client';
        } else if (client.payeeId) {
          Session.payeeId = client.payeeId;
          params.roleId = client.payeeId;
          params.role = 'payee';
        }
        User.set_client($scope.id, params, (response) => {
          $scope.userSuccess = response.data.success;
          Session.token = response.data.token;
          if (!$scope.demoMode) { $cookies.put('originalToken', response.data.token, { secure: true }); }
          $cookies.put('curveToken', Session.token, { secure: true });
          Session.currency = response.data.currency;
          Session.currencySymbol = SymbolFromCurrency.get(response.data.currency);
          Session.dateFormat = response.data.dateFormat;
          Session.clientId = response.data.clientId;
          Session.clientType = response.data.clientType;
          $scope.clientType = response.data.clientType;
          Session.clientName = (response.data.userType === 'payee') ? null : response.data.clientName;
          Session.clientCurrencies = response.data.multiCurrencies;
          Session.userType = response.data.userType;
          $scope.userType = response.data.userType;
          Session.userEmail = response.data.email;
          $scope.userEmail = response.data.email;
          Session.adminType = response.data.adminType;
          $scope.adminType = response.data.adminType;
          $rootScope.clientAdminUser = $scope.adminType === 'Admin';
          $scope.parentUser = response.data.parentUser;
          Session.requiresTsAndCsConfirmation = response.data.requiresTsAndCsConfirmation;
          $scope.requiresTsAndCsConfirmation = response.data.requiresTsAndCsConfirmation;
          Session.isInTrial = response.data.isInTrial;
          $scope.isInTrial = response.data.isInTrial;
          Session.trialDaysLeft = response.data.trialDaysLeft;
          $scope.trialDaysLeft = response.data.trialDaysLeft;
          Session.paymentProvider = response.data.paymentProvider;
          $scope.paymentProvider = response.data.paymentProvider;
          $scope.temporaryClient = client.name;
          $scope.apiUser = response.data.features.apiUser;
          $scope.fugaApiUser = response.data.features.fugaApiUser;
          $timeout(() => {
            $scope.$apply(() => {
              $scope.client = { _id: client.clientId, name: client.name };
              if (!$scope.demoMode) {
                $cookies.put('originalClient', JSON.stringify({ clientId: Session.clientId, name: Session.clientName, payeeId: Session.payeeId }), { secure: true });
              }
            });
          });
          Session.paymentTier = response.data.paymentTier;
          // White Label logos
          if (response.data.darkLogo) {
            $scope.darkLogo = response.data.darkLogo;
          } else if (!$scope.whiteLabelled) {
            // Reset all if no dark logo
            $scope.darkLogo = 'assets/img/curvetyp2x.png';
            $scope.lightLogo = 'assets/img/curvetypwhite2x.png';
            $scope.overlayLogo = 'assets/img/Curve-Logo-Light-Blue.png?rel=b2dc5b0ea2';
          }
          if (response.data.lightLogo) {
            // Set light logo if it isn't
            $scope.lightLogo = response.data.lightLogo;
          }
          if ($window.location.href.split('/').length === 5 && $window.location.href.split('/')[4] === '') {
            $window.location.href = '/#';
          }
          Session.clientRights = response.data.clientRights;
          $scope.clientRights = response.data.clientRights;
          Session.paymentProvider = response.data.paymentProvider;
          $scope.notifications = [];
          // set $rootScope as well. We need this to watch for any changes on browser refresh in controllers.
          $rootScope.internal = response.data.internal;
          $rootScope.clientType = response.data.clientType;
          $rootScope.userType = response.data.userType;
          $rootScope.features = response.data.features;
          $rootScope.clientId = response.data.clientId;
          $rootScope.clientRights = response.data.clientRights;
          $rootScope.paymentProvider = response.data.paymentProvider;
          $rootScope.tipaltiCrossPayeeDetails = response.data.tipaltiCrossPayeeDetails;
          $rootScope.paymentTier = response.data.paymentTier;
          $rootScope.dateFormat = response.data.dateFormat;
          $scope.notifications = [];
          controller.getNotificationCount();
          initHelpscout();
          // Manage legal popup if required
          if ($scope.requiresTsAndCsConfirmation) {
            openLegalModal();
          }

          if (callback) { callback(); }
        });
        // }
      }

      $scope.clearClientForCurrentUser = function () {
        Loader.load();
        User.remove_client($scope.id, (response) => {
          Session.token = response.data.token;
          $cookies.put('curveToken', Session.token, { secure: true });
          $scope.temporaryClient = null;
          $scope.clientType = null;
          $scope.adminType = null;
          $rootScope.clientAdminUser = false;
          Session.clientId = null;
          Session.payeeId = null;
          Session.currency = null;
          Session.currencySymbol = null;
          $scope.client = null;
          $scope.notificationCount = 0;
          $scope.notifications = [];
          $scope.apiUser = false;
          $scope.fugaApiUser = false;
          if (response.data.internal) {
            Session.userType = 'internal';
            $scope.userType = 'internal';
          } else if (response.data.parentId) {
            $scope.parentUser = true;
            Session.userType = 'parent';
            $scope.userType = 'parent';
          }
          // Reset all if no dark logo
          $scope.darkLogo = 'assets/img/curvetyp2x.png';
          $scope.lightLogo = 'assets/img/curvetypwhite2x.png';
          $scope.overlayLogo = 'assets/img/Curve-Logo-Light-Blue.png?rel=b2dc5b0ea2';
          getClients();
          $window.location.href = '#/';
          Loader.success('You are no longer logged in as a client');
        });
      };

      $scope.getPlaceholder = function (name) {
        return name || 'Select Client';
      };

      this.getNotificationCount = function () {
        Notification.count({ read: false }, (err, response) => {
          if (!err && response && response.data) {
            $scope.notificationCount = response.data.count;
          } else {
            $scope.notificationCount = 0;
          }
        });
      };

      this.markNotificationRead = function (notifications, callback) {
        const ids = [];
        notifications.forEach((notification) => {
          ids.push(notification._id);
        });
        Notification.markRead(ids, (response) => {
          if (callback) { callback(response); }
        });
      };

      $scope.getNotificationDetails = function (id, index) {
        $scope.notificationDetails = 0;
        Notification.get(id, (response) => {
          if (response.status === 200) {
            $scope.notifications[index].read = true;
            $scope.notificationDetails = response.data.notification;
            // show modal
            $('#notificationErrors').modal('show');
          }
        });
      };

      $scope.isShowingAll = false;
      $scope.filter = { limit: 5, orderBy: 'createdAt', orderDir: 'desc' };
      if (Session.notificationsFilter) {
        $scope.filter = Session.notificationsFilter;
      }

      $scope.notifications = [];
      $scope.nextPage = null;
      $scope.inProgress = true;

      this.showNotifications = function () {
        const params = { limit: 5 * ($scope.pageToShow || 1), orderBy: 'createdAt', orderDir: 'desc', page: 1 };
        Session.notificationsFilter = params;

        Notification.all(params, (response) => {
          Loader.load();
          if (response.status === 200) {
            if (response.data.notifications) {
              $scope.notifications = response.data.notifications;
            }
            Loader.complete();
            controller.markNotificationRead($scope.notifications, (res) => {
              controller.getNotificationCount();
            });
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.clearAllNotifications = function () {
        const params = { limit: 10000, orderBy: 'createdAt', orderDir: 'desc', page: 1 };
        Notification.all(params, (response) => {
          if (response.status === 200) {
            const ids = response.data.notifications.map((notification) => notification._id);
            const chunkPromises = [];
            for (let i = 0; i < ids.length; i += 100) {
              const chunk = ids.slice(i, i + 100);
              chunkPromises.push(new Promise((resolve) => {
                Notification.markRead(chunk, () => {
                  resolve();
                });
              }));
            }

            Promise.all(chunkPromises).then(() => {
              controller.getNotificationCount();
              $scope.notifications = [];
            });
          }
        });
      };

      $scope.timeAgo = function (date) {
        const currentDate = new Date(date);
        const seconds = Math.floor((new Date() - currentDate) / 1000);
        const secondsAgo = Math.floor(seconds % 3600 % 60);

        let interval = seconds / 31536000;

        if (interval > 1) {
          return `${Math.floor(interval)}y`;
        }
        interval = seconds / 2592000;
        if (interval > 1) {
          return `${Math.floor(interval)}mth`;
        }
        interval = seconds / 86400;
        if (interval > 1) {
          return `${Math.floor(interval)}d`;
        }
        interval = seconds / 3600;
        if (interval > 1) {
          const mintues = seconds / 60;
          return `${Math.floor(interval)}h ${Math.floor(mintues % 60)}m`;
        }
        interval = seconds / 60;
        if (interval > 1) {
          return `${Math.floor(interval)}m ${secondsAgo}s`;
        }
        return `${Math.floor(seconds)}s`;
      };

      $scope.showNotifications = function () {
        controller.showNotifications();
      };

      $scope.showAll = function (page) {
        $scope.isShowingAll = true;
        $scope.filter.limit = 100000;
        controller.showNotifications($scope.filter);
      };

      $scope.changePage = function (page) {
        $scope.pageToShow = $scope.pageToShow || 1;
        $scope.pageToShow += 1;
        controller.showNotifications();
      };

      controller.getNotificationCount();

      setInterval(() => {
        // Can Disable the check for client as this resolves some minor issues with maintenance mode not switching mode.
        // NUmber of requests isn't going to be increased dramatically by this - api returns {"message":"Forbidden"} in this scenario
        // Pausing this change as has other implications like refreshing won't break the process of removing the modal leaving the client dropdown
        // empty and possibly other unknow side effects
        if ($scope.client) {
          controller.getNotificationCount();
        }
      }, 10000);

      function initHelpscout() {
        // Helpscout
        $window.Beacon('destroy');
        const publisherBeacon = '49311711-30a9-4d44-b105-8182cdc55479';
        const labelBeacon = '18540986-b11e-42b0-aeee-c395003847c7';
        const artistBeacon = '090a922a-0be0-4014-bee5-d588d4045341';
        // Set beacon to load based on user and client type
        if ($scope.userType === 'payee') {
          $window.Beacon('init', artistBeacon);
        } else if ($scope.clientType === 'Publisher') {
          $window.Beacon('init', publisherBeacon);
        } else {
          $window.Beacon('init', labelBeacon);
        }
        // Set identification
        const identification = {
          email: $scope.userEmail,
          company: $scope.temporaryClient,
        };
        $window.Beacon('identify', identification);
      }

      initHelpscout();

      function identifyPosthogUser() {
        // PostHog user identification - only run in production
        if ($window.posthog && Session.production && $cookies.get('qaMode') !== 'true') {
          $window.posthog.identify($scope.id, {
            email: Session.userEmail,
            userType: Session.userType,
            clientType: Session.clientType,
            clientName: Session.clientName,
            clientId: Session.clientId,
          });

          // Associate the user with their client for B2B group analytics. This lets us
          // aggregate metrics (retention, feature adoption, etc.) by client, not just
          // by individual user. Requires the "client" group type to be enabled in the
          // PostHog project settings.
          if (Session.clientId) {
            $window.posthog.group('client', String(Session.clientId), {
              name: Session.clientName,
              type: Session.clientType,
            });
          }
        }
      }

      // Legal Notice
      if ($scope.requiresTsAndCsConfirmation) {
        openLegalModal();
      }

      $scope.acceptTermsAndConditions = function () {
        Client.acceptLegalTerms((response) => {
          $('#legalModal').modal('hide');
          showingLegalModal = false;
          Loader.success('You have successfully accepted the terms and conditions');
        });
      };

      // Is this on a guarded path. Should we check features?
      function containsGuardedPath(nextURL) {
        return (nextURL.includes('/#/ftpIntegration')
          || nextURL.includes('/#/territoryGroups')
          || nextURL.includes('/#/contractTermGroups')
          || nextURL.includes('/#/deliveries')
          || nextURL.includes('/#/companies')
          || nextURL.includes('/#/cwrAcknowledgements')
          || nextURL.includes('/#/deliverySettings/deliveryProfiles')
          || nextURL.includes('/#/mcps'));
      }

      // Not triggering the redirect until we can check the features
      function waitForFeaturesBeforeRedirect(nextURL) {
        if ($scope.userSuccess && $rootScope.features) {
          if (nextURL.includes('/#/ftpIntegration') && !$rootScope.features.ftpIngestion) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/territoryGroups') && !$rootScope.features.termGroups) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/contractTermGroups') && !$rootScope.features.termGroups) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/deliveries') && !$rootScope.features.deliveries) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/companies') && !$rootScope.features.companies) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/cwrAcknowledgements') && !$rootScope.features.deliveries) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/deliverySettings/deliveryProfiles') && !$rootScope.features.deliveries) { $window.location.href = '/#'; }
          if (nextURL.includes('/#/mcps') && !$rootScope.features.mcps) { $window.location.href = '/#'; }
        } else {
          setTimeout(() => {
            waitForFeaturesBeforeRedirect(nextURL);
          }, 250);
        }
      }

      // Check the the client has access the routes their accessing
      $rootScope.$on('$locationChangeStart', (event, next) => {
        // FTP Integrations
        if (containsGuardedPath(next)) {
          waitForFeaturesBeforeRedirect(next);
        }
      });

      $(document).keydown((e) => {
        if (e.key === 'Escape' && showingLegalModal) { openLegalModal(); }
        if (e.key === 'Escape' && $rootScope.inMaintenanceMode) { openMaintenanceModal(); }
      });

      const openLegalModal = function () {
        $('#legalModal').modal('show');
        angular.element('#legalModal').css('padding-right', '0px');
        showingLegalModal = true;
      };

      $rootScope.$watch('inMaintenanceMode', () => {
        if ($rootScope.inMaintenanceMode) {
          openMaintenanceModal();
          // Reset any running loaders
          Loader.complete();
        } else {
          $('#maintenanceModeModal').modal('hide');
        }
      });

      const openMaintenanceModal = function () {
        $('#maintenanceModeModal').modal('show');
        angular.element('#maintenanceModeModal').css('padding-right', '0px');
      };

      $scope.toggleDemoMode = function (demoMode, tour) {
        $scope.launchTourIsClicked = true;
        $scope.demoMode = demoMode;
        $rootScope.demoMode = demoMode;
        $cookies.put('demoMode', demoMode);

        if (demoMode === false) {
          $scope.launchTourIsClicked = false;
          $scope.id = $cookies.get('originalUserId');
          Session.token = $cookies.get('originalToken');
          $cookies.put('curveToken', Session.token, { secure: true });
        }

        User.get_possible_clients($scope.id, { searchTerm: null }, (response) => {
          if (response.status === 200) {
            if (tour) { window.StonlyWidget('openGuidedTour', { guideId: tour }); }
            $timeout(() => {
              $scope.$apply(() => {
                $scope.clients = response.data;
                const client = demoMode === true ? $scope.clients[0] : JSON.parse($cookies.get('originalClient'));
                $scope.setClientForCurrentUser(client);
              });
            });
          } else {
            Loader.error('Error loading user, please try again or contact support');
          }
        }).catch(() => {
          Loader.complete();
        });
      };

      $scope.openStonlyTour = function (tour) {
        $scope.launchTourIsClicked = true;
        window.StonlyWidget('openGuidedTour', { guideId: tour });
        setTimeout(() => {
          $scope.launchTourIsClicked = false;
        }, 5000);
      };

      const getWidth = () => Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth,
      );

      const setShowAccordions = () => {
        $scope.showAccordions = getWidth() < 800;
      };

      setShowAccordions();
      angular.element($window).bind('resize', setShowAccordions);

      // Checks if the client has access to a feature
      $rootScope.featureAccess = function (feature) {
        // Return false if features aren't loaded/found
        if (!$rootScope.features) return false;

        return $rootScope.features[feature] === true;
      };
    },
  ]);
