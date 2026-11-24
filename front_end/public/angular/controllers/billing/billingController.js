angular.module('Curve')
  .controller('billingController', ['$rootScope', '$scope', '$cookies', '$window', 'Session', 'Client', 'User', 'Loader', 'dateFormats', 'TerritoriesWithoutContinents', 'Invoice', 'Pagination', 'SymbolFromCurrency', '$timeout', 'Notification',
    function ($rootScope, $scope, $cookies, $window, Session, Client, User, Loader, DateFormat, TerritoriesWithoutContinents, Invoice, Pagination, SymbolFromCurrency, $timeout, Notification) {
      const controller = this;
      // Setup Stripe
      const stipeKey = Session.production ? 'pk_live_KoGVHK27STTUHHcUJ8qGLgKI' : 'pk_test_Cf8Nld4cmELJtEGapW5XLa2j';
      const stripe = Stripe(stipeKey);
      const elements = stripe.elements();
      const cardElement = elements.create('card');

      $scope.client = { billing: [] };
      $scope.user = {};
      $scope.userType = Session.userType;
      $scope.lockedForNonPayment = Session.getlockedForNonPayment;
      $scope.internal = Session.internal;
      $scope.dateFormats = DateFormat;
      $scope.displayGL = !!(Session.clientName && Session.clientName.includes('Disney'));
      $scope.clientType = Session.clientType;
      $scope.features = $rootScope.features;
      $scope.invoices = [];
      $scope.headers = [
        { title: 'Name', name: 'name', sortable: true },
        { title: 'Date', name: 'date', sortable: true, type: 'date' },
        { title: 'Amount', sortable: true, type: 'invoice_total' },
        { title: 'Download', name: 'publicLink', sortable: true, type: 'download' },
      ];
      $scope.currencyMapping = { GBP: '£', USD: '$', EUR: '€' };
      $scope.requiresAdminChanges = false;

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
          });
        });
      });

      // Not triggering the get client request until we get the Session ID
      waitForIdBeforeGettingClient();
      function waitForIdBeforeGettingClient() {
        if (Session.id) {
          if (Session.adminType === 'Admin' || Session.internal) {
            // If admin or internal user, get usage and billing details
            getClientForCurrentUser({ sessionId: Session.id }, () => {
              getClientBilling(() => {
                $scope.getClientUsage();
              });
            });
          } else {
            // To check if the client is locked, we need to attempt any API request to check for a 402 response code (only for standard users)
            Notification.count({ read: false }, (err) => {
              // If client locked AND subscription active, show message to contact client admin
              if (err && err.status === 402) {
                $scope.requiresAdminChanges = true;
              } else {
                // If client not locked AND subscription not cancelled, redirect as no access to billing page
                $window.location.href = '#/';
                return;
              }
              Loader.complete();
            });
          }
        } else {
          setTimeout(waitForIdBeforeGettingClient, 250);
        }
      }

      function getClientForCurrentUser(sessionId, callback) {
        if (sessionId) {
          $scope.userRole = Session.userType === 'internal' ? 'internal' : 'client';
          Loader.load();
          User.get(Session.id, (response) => {
            if (response.status === 200) {
              $scope.user = response.data;
            } else {
              Loader.error('Error loading user, please try again or contact support');
            }
            callback();
          });
        }
      }
      // end get client

      // General Ledger
      $scope.countries = TerritoriesWithoutContinents;

      $scope.saveSettings = function () {
        Loader.load();
        if ($scope.client.billing && $scope.client.billing.billingType === 'Card' && (!$scope.client.billing.companyName || !$scope.client.billing.address1 || !$scope.client.billing.city || !$scope.client.billing.postcode || !$scope.client.billing.country || !$scope.client.billing.currency)) {
          Loader.error('Error saving settings, missing billing details');
        } else if ($scope.client._id) {
          // remove duplicates
          Client.updateBilling($scope.client._id, $scope.client, (response) => {
            if (response.status === 200) {
              $scope.client = response.data;
              Loader.success('Settings successfully saved');
            } else {
              Loader.error(response.data.message);
            }
          });
        } else {
          Loader.error('Error saving settings, no client ID');
        }
      };

      $scope.saveCard = function () {
        Loader.load();
        $scope.stripeError = null;
        $scope.stripeSuccess = null;
        stripe.confirmCardSetup(
          $scope.client_secret,
          {
            payment_method: {
              card: cardElement,
            },
          },
        ).then((result) => {
          if (result.error) {
            $scope.stripeError = result.error.message;
            Loader.complete();
          } else {
            Client.setPaymentMethod(result, (response) => {
              if (response.status === 200) {
                $scope.stripeSuccess = 'Card has successfully been added, and will be billed on your next billing date';
                cardElement.clear();
                getClientBilling();
              } else {
                Loader.error('Error saving billing card, please try again or contact support');
              }
            });
          }
        });
      };

      const getClientBilling = function (callback) {
        Client.getBilling($scope.user.clientId, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
            if ($scope.user.adminType === 'Admin') {
              Client.getStripeSetupIntent((response) => {
                if (response.status === 200) {
                  $scope.client_secret = response.data.client_secret;
                  cardElement.mount('#card-element');
                  Loader.complete();
                  $scope.getPaymentMethod();
                } else {
                  Loader.error('Error loading client payment details, please try again or contact support');
                }
                callback();
              });
            } else {
              callback();
            }
          } else {
            Loader.error('Error loading client, please try again or contact support');
            callback();
          }
        });
      };

      $scope.getPaymentMethod = function () {
        Client.getPaymentMethod((response) => {
          if (response.status === 200 && response.data && response.data.card) {
            $scope.payment_method = response.data.card;
          }
        });
      };

      $scope.getClientUsage = function () {
        Loader.load();
        const { currency } = $scope.client.billing;
        Client.getUsage($scope.user.clientId, currency, (response) => {
          if (response.status === 200 && response.data) {
            $scope.usage = response.data;
          }
          Loader.complete();
        }).catch(() => {
          Loader.error('Error getting client usage');
        });
      };

      $scope.chargeClient = function (showErrorMessage) {
        Loader.load();
        Client.charge((response) => {
          if (response.status === 200) {
            Loader.success('Card charged successfully');
            setClientForCurrentUser({ clientId: Session.clientId, name: Session.clientName, payeeId: Session.payeeId });
          } else if (showErrorMessage) {
            Loader.error('Error charging card, please try again or contact support');
          } else {
            Loader.complete();
          }
        }).catch(() => {
          Loader.error('Error charging card, please try again or contact support');
        });
      };

      $scope.filter = { text: null, orderBy: 'title', orderDir: 'asc' };
      $scope.isShowingAll = false;

      $scope.showAll = function () {
        $scope.isShowingAll = true;
        $scope.filter.page = 1;
        $scope.filter.limit = 500;
        controller.filter($scope.filter);
      };

      controller.filter = function (params, callback) {
        Loader.load();
        Invoice.all(params, (response) => {
          if (response.status === 200) {
            $scope.invoices = response.data.invoices;
            $scope.invoices.forEach((invoice) => {
              invoice.usage.currencyToChargeSymbol = SymbolFromCurrency.get(invoice.usage.currencyToCharge, null);
            });
            $scope.totalPages = response.data.meta.totalPages;
            $scope.currentPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.total = response.data.meta.total;
            }
            $scope.pages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);

            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.filter.orderBy = orderBy;
        $scope.filter.orderDir = orderDir;
        controller.filter($scope.filter);
        Loader.complete();
      };

      $scope.search = function () {
        $scope.filter.page = 1;
        controller.filter($scope.filter, () => {
          Loader.success('Invoices Successfully Searched');
        });
      };

      $scope.changePage = function (page) {
        $scope.filter.page = page;
        controller.filter($scope.filter);
      };

      $scope.cancelSubscription = function () {
        Loader.load();
        $scope.client.cancelledSubscription = true;
        Client.updateBilling($scope.client._id, $scope.client, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
            $('#cancelSubscriptionModal').modal('hide');
            Loader.success('Subscription cancelled successfully');
          } else {
            $scope.client.cancelledSubscription = false;
            Loader.error('Error cancelling subscription, please try again or contact support');
          }
        });
      };

      $scope.resumeSubscription = function () {
        Loader.load();
        $scope.client.cancelledSubscription = false;
        Client.updateBilling($scope.client._id, $scope.client, (response) => {
          if (response.status === 200) {
            $scope.client = response.data;
            Loader.success('Subscription resumed successfully');
            $scope.chargeClient(false);
          } else {
            $scope.client.cancelledSubscription = false;
            Loader.error('Error resuming subscription, please try again or contact support');
          }
        });
      };

      $scope.getCancelSubscriptionDate = function () {
        if ($scope.usage && $scope.usage.nextBillingDate) {
          const date = new Date($scope.usage.nextBillingDate);
          return new Date(date.setMonth(date.getMonth() + 3));
        }
      };

      function setClientForCurrentUser(client) {
        const params = {
          roleId: client.clientId,
          role: 'client',
        };
        User.set_client($scope.id, params, (response) => {
          Session.token = response.data.token;
          $cookies.put('curveToken', Session.token, { secure: true });
          Session.setLockedForPayment(false);
        });
      }

      controller.filter($scope.filter);
    },
  ]);
