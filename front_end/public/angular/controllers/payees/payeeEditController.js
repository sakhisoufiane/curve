angular.module('Curve')
  .controller('payeeEditController', ['$rootScope', '$scope', '$routeParams', '$window', '$sce', '$timeout', 'Session', 'Payee', 'Client', 'TerritoriesWithoutContinents', 'Loader', 'Settings', 'Pagination', 'Contract', 'Currencies', 'CurvePay',
    function ($rootScope, $scope, $routeParams, $window, $sce, $timeout, Session, Payee, Client, TerritoriesWithoutContinents, Loader, Settings, Pagination, Contract, Currencies, CurvePay) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.clientType = Session.clientType;
      $scope.features = $rootScope.features;
      $scope.paymentProvider = Session.paymentProvider;
      $scope.tipaltiCrossPayeeDetails = $rootScope.tipaltiCrossPayeeDetails;
      $scope.clientCurrencies = [Session.currency].concat(Session.clientCurrencies);
      $scope.currencies = Currencies;
      $scope.wiseRecipients = [];

      $scope.payee = {};
      $scope.users = [];
      $scope.payeeCategories = [];
      $scope.countries = TerritoriesWithoutContinents;
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.payee));
      $scope.paymentRequirements = [];

      $scope.transaction = {};

      $scope.transactionTypes = ['Payment', 'Royalties', 'Advance', 'Other'];

      $scope.rights = {};

      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      function updatePaymentRequirementsOnLoad() {
        if ($scope.paymentProvider === 'Wise' && $scope.payee.paymentCurrency) {
          Client.getWisePaymentRequirements(Session.clientId, { currency: $scope.payee.paymentCurrency }, (response) => {
            if (response.status === 200) { $scope.paymentRequirements = response.data.requirements; }
            Loader.complete();
          });
        } else if ($scope.paymentProvider === 'Tipalti') {
          getTipaltiIframeAuthentication();
        } else if ($scope.paymentProvider === 'Curve Pay') {
          getCurvePayiFrame();
        }
      }

      $rootScope.$watch('paymentProvider', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.paymentProvider = $rootScope.paymentProvider;
            updatePaymentRequirementsOnLoad();
          });
        });
      });

      $rootScope.$watch('tipaltiCrossPayeeDetails', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.tipaltiCrossPayeeDetails = $rootScope.tipaltiCrossPayeeDetails;
          });
        });
      });

      $rootScope.$watch('features', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.features = $rootScope.features;
            updatePaymentRequirementsOnLoad();
          });
        });
      });

      Settings.getSettings().then((settings) => {
        $scope.payeeCategories = settings.payeeCategories;
      });

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        if (value === 'users') {
          loadUsers($scope.usersFilter);
        } else if (value === 'contracts') {
          loadContracts($scope.contractsFilter);
        } else if (value === 'analytics') {
          $rootScope.$broadcast('triggerAnalyticsLoader');
        } else if (value === 'transactions') {
          loadTransactions();
        } else if (value === 'statements') {
          loadStatements();
        }
        $scope.activeTab = value;
      };

      const loadPayee = () => {
        Loader.load();
        Payee.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.payee = response.data;
            $scope.openingBalance = $scope.payee.openingBalance;
            $scope.originalObj = JSON.parse(angular.toJson($scope.payee));
            initAnalyticsConfig();
            // If wise, load recipients
            if ($scope.payee && $scope.payee.paymentProviders && $scope.payee.paymentProviders.wise) {
              getListOfWiseRecipients();
            }
            // Get payment iFrames
            updatePaymentRequirementsOnLoad();
            Loader.complete();
          } else {
            Loader.error(
              'Error loading payee, please try again or contact support',
            );
          }
        }).catch((response) => {
          Loader.error(response.data.message);
        });
      };

      // Load Payee if ID exists
      if ($routeParams.id) {
        loadPayee();
      } else if (Payee.copiedPayee) {
        delete Payee.copiedPayee._id;
        delete Payee.copiedPayee.createdAt;
        delete Payee.copiedPayee.updatedAt;
        delete Payee.copiedPayee.paymentProviders;
        if (Payee.copiedPayee.name) Payee.copiedPayee.name += ' - Copy';

        if (Payee.copiedPayee.foreignId) delete Payee.copiedPayee.foreignId;

        $scope.payee = Payee.copiedPayee;
      }

      // Users Tab Listing
      $scope.usersFilter = { text: null, orderBy: 'email', orderDir: 'asc' };
      $scope.isShowingAllUsers = false;

      this.filterUsers = function (params, callback) {
        Session.usersFilter = params;
        loadUsers($scope.usersFilter, callback);
      };

      $scope.getSortedDataUsers = function (orderBy) {
        if ($scope.usersFilter.orderBy === orderBy) {
          $scope.usersFilter.orderDir = ($scope.usersFilter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.usersFilter.orderBy = orderBy;
        controller.filterUsers($scope.usersFilter);
      };
      $scope.whatClassIsItUsers = function (field) {
        if ($scope.usersFilter.orderBy === field) {
          if ($scope.usersFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };
      $scope.showAllUsers = function () {
        $scope.isShowingAllUsers = true;
        $scope.usersFilter.limit = 500;
        $scope.usersFilter.page = 1;
        loadUsers($scope.usersFilter);
      };
      $scope.changePageUsers = function (page) {
        $scope.usersFilter.page = page;
        loadUsers($scope.usersFilter);
      };
      function loadUsers(params, callback) {
        const payeeId = $routeParams.id;
        Session.usersFilter = params;
        Loader.load();
        Payee.getUsers(payeeId, params, (response) => {
          if (response.status === 200) {
            $scope.users = response.data.users;
            $scope.totalPagesUsers = response.data.meta.totalPages;
            $scope.currentPageUsers = response.data.meta.currentPage;
            if (
              response.data.meta
              && (response.data.meta.total || response.data.meta.total === 0)
            ) {
              $scope.totalUsers = response.data.meta.total;
            }
            $scope.pagesUsers = Pagination.createArray(
              response.data.meta.currentPage,
              response.data.meta.totalPages,
            );
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      $scope.updateOpeningBalance = function () {
        $scope.openingBalance = $scope.payee.openingBalance;
        $('#updateOpeningBalancePayeeModal').modal();
      };

      function loadTransactions() {
        Loader.load();
        Payee.getTransactions($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.transactions = response.data;

            // Convert date strings to Date objects for the datepicker
            $scope.transactions.forEach((transaction) => {
              if (transaction.date) {
                transaction.date = new Date(transaction.date);
              }
            });

            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      function loadStatements() {
        Loader.load();

        Payee.getStatements($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.statements = response.data;
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      $scope.datePopup = false;

      $scope.openDatePopup = function () {
        $scope.datePopup = true;
      };

      $scope.openTransactionModal = function (transaction) {
        if (transaction) { $scope.transaction = transaction; }
        $('#createTransactionModal').modal('show');
      };

      $('#createTransactionModal').on('hidden.bs.modal', () => {
        $scope.transaction = {};
        loadTransactions();
      });

      $scope.transactionValidation = () => (['Payment', 'Advance'].includes($scope.transaction.type) && $scope.transaction.amount > 0) || ($scope.transaction.type === 'Royalties' && $scope.transaction.amount < 0);

      $scope.saveTransaction = function () {
        Loader.load();
        if ($scope.transaction._id) {
          // Update
          Payee.updateTransaction($routeParams.id, $scope.transaction, (response) => {
            if (response.status === 200) {
              $scope.transaction = response.data;
              $('#createTransactionModal').modal('hide');
              Loader.success('Transaction successfully saved');
            } else {
              Loader.error(
                'Error saving transaction, please try again or contact support',
              );
            }
          });
        } else {
          Payee.createTransaction($routeParams.id, $scope.transaction, (response) => {
            if (response.status === 200) {
              $scope.transaction = response.data;
              $('#createTransactionModal').modal('hide');
              Loader.success('Transaction successfully created');
            } else {
              Loader.error(
                response.data?.message || 'Error creating transaction, please try again or contact support',
              );
            }
          });
        }
      };

      $scope.deleteTransaction = (transaction) => {
        Loader.load();
        Payee.deleteTransaction($routeParams.id, transaction._id, (response) => {
          if (response.status === 200) {
            $('#createTransactionModal').modal('hide');
            Loader.success('Transaction successfully deleted');
          } else {
            Loader.error(
              'Error deleting transaction, please try again or contact support',
            );
          }
        });
      };

      // Contracts Tab
      $scope.contractsFilter = { text: null, payeeId: $routeParams.id, orderBy: 'name', orderDir: 'asc' };
      $scope.isShowingAllContracts = false;

      this.filterContracts = function (params, callback) {
        Session.contractsFilter = params;
        loadContracts($scope.contractsFilter, callback);
      };

      $scope.getSortedDataContracts = function (orderBy) {
        if ($scope.contractsFilter.orderBy === orderBy) {
          $scope.contractsFilter.orderDir = ($scope.contractsFilter.orderDir === 'asc') ? 'desc' : 'asc';
        }
        $scope.contractsFilter.orderBy = orderBy;
        controller.filterContracts($scope.contractsFilter);
      };
      $scope.whatClassIsItContracts = function (field) {
        if ($scope.contractsFilter.orderBy === field) {
          if ($scope.contractsFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };
      $scope.showAllContracts = function () {
        $scope.isShowingAllContracts = true;
        $scope.contractsFilter.limit = 500;
        $scope.contractsFilter.page = 1;
        loadContracts($scope.contractsFilter);
      };
      $scope.changePageContracts = function (page) {
        $scope.contractsFilter.page = page;
        loadContracts($scope.contractsFilter);
      };
      function loadContracts(params, callback) {
        Loader.load();
        Contract.all(params, (response) => {
          if (response.status === 200) {
            $scope.contracts = response.data.contracts;
            $scope.totalPagesContracts = response.data.meta.totalPages;
            $scope.currentPageContracts = response.data.meta.currentPage;
            if (
              response.data.meta
              && (response.data.meta.total || response.data.meta.total === 0)
            ) {
              $scope.totalContracts = response.data.meta.total;
            }
            $scope.pagesContracts = Pagination.createArray(
              response.data.meta.currentPage,
              response.data.meta.totalPages,
            );
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      $scope.copy = function () {
        Payee.copiedPayee = $scope.payee;
        $window.location.href = '#/payees/new';
      };

      $scope.groupFind = function (country) {
        return country.continent;
      };

      function sanitiseTaxRates() {
        if ($scope.payee.selfBillingTaxRate) {
          const convertedNumber = parseFloat($scope.payee.selfBillingTaxRate).toFixed(2);
          $scope.payee.selfBillingTaxRate = parseFloat(convertedNumber);
        }
        if ($scope.payee.feesInvoiceTaxRate) {
          const convertedNumber = parseFloat($scope.payee.feesInvoiceTaxRate).toFixed(2);
          $scope.payee.feesInvoiceTaxRate = parseFloat(convertedNumber);
        }
        if ($scope.payee.withholdingTaxRate) {
          const convertedNumber = parseFloat($scope.payee.withholdingTaxRate).toFixed(2);
          $scope.payee.withholdingTaxRate = parseFloat(convertedNumber);
        }
      }

      $scope.save = function () {
        $('#updateOpeningBalancePayeeModal').modal('hide');

        if ($scope.payee.openingBalance !== $scope.openingBalance) {
          $scope.payee.openingBalance = $scope.openingBalance;
        }

        sanitiseTaxRates();
        Loader.load();
        if (!$scope.payee._id) {
          Payee.create($scope.payee, (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.payee));
              $window.location.href = `#/payees/${response.data._id}/edit`;
              Loader.success('Payee successfully created');
            } else {
              Loader.error(
                'Error creating payee, please try again or contact support',
              );
            }
          }).catch((response) => {
            Loader.error(
              `The object has not been saved.  ${response.data.message}`,
            );
          });
        } else {
          Payee.update($scope.payee._id, $scope.payee, (response) => {
            if (response.status === 200) {
              loadPayee();
              Loader.success('Payee successfully saved');
            } else {
              Loader.error(
                'Error saving payee, please try again or contact support',
              );
            }
          }).catch((response) => {
            Loader.error(
              `The object has not been saved.  ${response.data.message}`,
            );
          });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Payee.delete($scope.payee._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/payees';
              Loader.success('Payee successfully deleted');
            } else if (response.status === 201) {
              $scope.deletionError = response.data;
              Loader.error('This Payee cannot be deleted as it is in use.');
            } else {
              Loader.error(
                'Error deleting payee, please try again or contact support',
              );
            }
          });
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const current = JSON.parse(angular.toJson($scope.payee));
        if (current.paymentProviders && current.paymentProviders.wise) { delete current.paymentProviders.wise.paymentMethodRequirements; }
        if ($scope.originalObj.paymentProviders && $scope.originalObj.paymentProviders.wise) { delete $scope.originalObj.paymentProviders.wise.paymentMethodRequirements; }

        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.payee = $scope.originalObj;
          }
        }
      }

      function initAnalyticsConfig() {
        $scope.analyticsConfig = {
          baseFilter: {
            key: 'payeeIds',
            value: $routeParams.id,
            title: $scope.payee.name,
          },
          hideChartOptions: ['topArtists', 'topLabels'],
        };
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.payee._id) {
          Payee.modelHistory($scope.payee._id, (response) => {
            if (response.status === 200) {
              $scope.payee.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.payee));
              $('#modelHistoryModal').modal();
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };

      function getTipaltiIframeAuthentication() {
        if ($scope.paymentProvider === 'Tipalti' && $scope.payee && $scope.payee.paymentProviders && $scope.payee.paymentProviders.tipalti.payeeId) {
          Loader.load();
          Payee.getTipaltiIframeAuthentication($scope.payee._id, (response) => {
            if (response.status === 200) {
              //  console.log(response.data.url);
              $scope.tipaltiIframeUrl = $sce.trustAsResourceUrl(response.data.url);
            }
            Loader.complete();
          });
        }
      }

      function getCurvePayiFrame() {
        if ($scope.paymentProvider === 'Curve Pay' && $scope.payee && $scope.payee._id && $scope.features.payments) {
          Loader.load();
          CurvePay.getiFrame(
            {
              route: 'payee',
              id: $scope.payee._id,
            },
            (response) => {
              if (response.status === 200) {
                $scope.curvePayiFrameUrl = $sce.trustAsResourceUrl(response.data.url);
                Loader.complete();
              } else {
                $scope.curvePayError = 'Error communicating with the Payments application, please try again or contact support';
              }
            },
          );
        }
      }

      $scope.$watch('payee.paymentCurrency', () => {
        if ($scope.paymentProvider === 'Wise' && $scope.payee.paymentCurrency) {
          Loader.load();
          if ($scope.originalObj.paymentCurrency !== $scope.payee.paymentCurrency && $scope.payee.paymentProviders && $scope.payee.paymentProviders.wise) {
            delete $scope.payee.paymentProviders.wise.paymentMethod;
            delete $scope.payee.paymentProviders.wise.paymentMethodRequirements;
            delete $scope.payee.paymentProviders.wise.paymentFields;
          }
          Client.getWisePaymentRequirements(Session.clientId, { currency: $scope.payee.paymentCurrency }, (response) => {
            if (response.status === 200) {
              $scope.paymentRequirements = response.data.requirements;
              Loader.complete();
            } else {
              $scope.paymentRequirements = [];
              Loader.error(response.data.message);
            }
          });
        }
      });

      $scope.$watch('payee.paymentProviders.wise.paymentMethod', () => {
        if ($scope.paymentProvider === 'Wise' && $scope.payee.paymentProviders && $scope.payee.paymentProviders.wise && $scope.payee.paymentProviders.wise.paymentMethod) {
          Loader.load();
          // eslint-disable-next-line max-len
          if ($scope.originalObj.paymentProviders && $scope.payee.paymentProviders && $scope.originalObj.paymentProviders.wise && $scope.payee.paymentProviders.wise && $scope.originalObj.paymentProviders.wise.paymentMethod !== $scope.payee.paymentProviders.wise.paymentMethod) {
            delete $scope.payee.paymentProviders.wise.paymentMethodRequirements;
            delete $scope.payee.paymentProviders.wise.paymentFields;
          }
          Client.getWisePaymentRequirements(Session.clientId, { currency: $scope.payee.paymentCurrency }, (response) => {
            if (response.status === 200) {
              $scope.paymentRequirements = response.data.requirements;
              $scope.paymentRequirements.forEach((requirement) => {
                if (requirement.type === $scope.payee.paymentProviders.wise.paymentMethod) {
                  $scope.payee.paymentProviders.wise.paymentMethodRequirements = {
                    usageInfo: requirement.usageInfo,
                    fields: requirement.fields,
                  };
                }
              });
              Loader.complete();
            } else {
              $scope.paymentRequirements = [];
              Loader.error(response.data.message);
            }
          });
        }
      });

      $scope.enterCreateWiseRecipientMode = () => {
        $scope.createWiseRecipientMode = true;
      };

      $scope.createWiseRecipient = () => {
        Loader.load();
        Payee.createWiseRecipient($scope.payee._id, { wise: $scope.payee.paymentProviders.wise, paymentCurrency: $scope.payee.paymentCurrency }, (response) => {
          if (response.status === 200) {
            $scope.createWiseRecipientMode = false;
            Loader.success('New Payee created successfully');
            loadPayee();
          } else {
            Loader.error(response.data && response.data.message ? response.data.message : 'Couldn\'t create the payee on Wise');
          }
        });
      };

      $scope.clearWiseRecipientDetails = () => {
        $scope.createWiseRecipientMode = false;
        delete $scope.payee.paymentCurrency;
        delete $scope.payee.paymentProviders.wise.paymentMethod;
        delete $scope.payee.paymentProviders.wise.paymentFields;
        delete $scope.paymentRequirements;
      };

      function getListOfWiseRecipients() {
        Loader.load();
        Client.getWiseListOfRecipients(Session.clientId, {}, (response) => {
          if (response.status === 200) {
            $scope.wiseRecipients = response.data.recipients;
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      }
    },
  ]);
