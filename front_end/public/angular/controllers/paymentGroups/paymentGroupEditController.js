angular.module('Curve')
  .controller('paymentGroupEditController', ['$rootScope', '$scope', '$location', '$routeParams', '$window', 'Session', 'PaymentGroup', 'Payment', 'Client', 'Notification', 'Track', 'Pagination', 'Settings', 'Loader', 'Territories', 'SelectAll',
    function ($rootScope, $scope, $location, $routeParams, $window, Session, PaymentGroup, Payment, Client, Notification, Track, Pagination, Settings, Loader, Territories, SelectAll) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.paymentGroup = { totalPayments: 0, totalPaid: 0, totalRemaining: 0 };
      $scope.payments = [];
      $scope.originalObj = JSON.parse(angular.toJson($scope.paymentGroup));
      $scope.currencySymbol = Session.currencySymbol;
      $scope.rights = {};
      $scope.balance = 0;
      $scope.currentPaymentsPage = 1;
      $scope.currencyMismatch = false;
      $scope.paymentsStatusFilter = [
        { name: 'All', value: 'All' },
        { name: 'Missing Info', value: 'MissingInfo' },
        { name: 'Pending', value: 'Pending' },
        { name: 'Payment Error', value: 'PaymentError' },
        { name: 'With Issues', value: 'WarningsOnly' },
        { name: 'Paid', value: 'Paid' },
        { name: 'Paid Offline', value: 'PaidOffline' },
      ];
      $scope.paymentProvider = Session.paymentProvider || 'Standard CSV';
      $scope.markPaymentAsModalData = { status: '', count: 0 };
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('clientAdminUser', () => {
        if (!$rootScope.clientAdminUser) {
          Loader.complete();
          setTimeout($location.path('/'), 0);
        }
      });

      $scope.$watch('paymentsFilter.showPayments', () => {
        this.loadPayments($scope.paymentsFilter);
      });

      $scope.showPaymentsWithIssues = function (array) {
        $scope.paymentsFilter.showPayments = 'WarningsOnly';
      };

      if (Session.paymentsFilter && Session.paymentsFilter.paymentGroupId === $routeParams.id) {
        $scope.paymentsFilter = Session.paymentsFilter;
      } else {
        $scope.paymentsFilter = { paymentGroupId: $routeParams.id, text: null, limit: 100, orderBy: 'name', orderDir: 'asc', showPayments: 'All' };
      }

      $scope.isShowingAllPayments = false;

      $scope.showAllPayments = function () {
        $scope.isShowingAllPayments = true;
        $scope.paymentsFilter.limit = 500;
        controller.loadPayments($scope.paymentsFilter);
      };

      $scope.selectAll = function (array) {
        SelectAll.select(array);
      };

      $scope.changePaymentsPage = function (page) {
        $scope.paymentsFilter.page = page;
        controller.loadPayments($scope.paymentsFilter);
      };

      $scope.whatClassIsIt = function (field) {
        if ($scope.paymentsFilter.orderBy === field) {
          if ($scope.paymentsFilter.orderDir === 'asc') {
            return 'sorting_asc';
          }
          return 'sorting_desc';
        }
        return 'sorting';
      };

      $scope.getSortedData = function (orderBy, orderDir) {
        $scope.paymentsFilter.orderBy = orderBy;
        $scope.paymentsFilter.orderDir = orderDir === 'asc' ? 'desc' : 'asc';
        controller.loadPayments($scope.paymentsFilter, () => {
          Loader.complete();
        });
      };

      this.loadPayments = function (params, callback) {
        Session.paymentsFilter = params;

        Loader.load();
        PaymentGroup.getPayments($routeParams.id, params, (response) => {
          if (response.status === 200) {
            $scope.payments = response.data.payments;
            $scope.totalPaymentsPages = response.data.meta.totalPages;
            $scope.currentPaymentsPage = response.data.meta.currentPage;
            if (response.data.meta && (response.data.meta.total || response.data.meta.total === 0)) {
              $scope.totalPayments = response.data.meta.total;
            }
            $scope.paymentsPages = Pagination.createArray(response.data.meta.currentPage, response.data.meta.totalPages);
            if (callback) { callback(); }
            Loader.complete();
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      this.loadPaymentGroup = function () {
        Loader.load();
        PaymentGroup.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.paymentGroup = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.paymentGroup));
            controller.loadPayments($scope.paymentsFilter);
            Loader.success('Payment group successfully loaded');
          } else {
            Loader.error('Error loading payment group, please try again or contact support');
          }
        });
      };

      if ($routeParams.id) {
        controller.loadPaymentGroup();
      }

      this.save = function (params) {
        Loader.load();
        if (!$scope.paymentGroup._id) {
          PaymentGroup.create(JSON.parse(angular.toJson($scope.paymentGroup)), (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.paymentGroup));
              const href = `#/paymentGroups/${response.data._id}/edit`;
              $window.location.href = href;
              Loader.success('Payment group successfully created');
            } else {
              Loader.error('Error creating payment group, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          PaymentGroup.update($scope.paymentGroup._id, $scope.paymentGroup, (response) => {
            if (response.status === 200) {
              $scope.paymentGroup = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.paymentGroup));
              Loader.success('Payment group successfully saved');
            } else {
              Loader.error('Error saving payment group, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      };

      $scope.save = function (params) {
        controller.save(params);
      };

      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        PaymentGroup.delete([$scope.paymentGroup._id], (response) => {
          if (response.status === 200) {
            $window.location.href = '#/paymentGroups';
            Loader.success('Payment group successfully deleted');
          } else {
            Loader.error(response.data.message);
          }
        }).catch((response) => {
          Loader.error(response.data.message);
        });
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const paymentGroup = JSON.parse(angular.toJson($scope.paymentGroup));
        const original = JSON.parse(angular.toJson($scope.originalObj));
        if (paymentGroup && angular.toJson(paymentGroup) !== angular.toJson(original)) {
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
            $scope.paymentGroup = $scope.originalObj;
          }
        }
      }

      $scope.import = function () {
        Loader.load();
        PaymentGroup.import($routeParams.id, $scope.importFile, (response) => {
          if (response.status === 200) {
            $('#importModal').modal('hide');
            Loader.success('Payments are importing, and a report will be sent to you shortly');
          } else {
            Loader.error(response.data.message || 'File could not be imported');
          }
        });
      };

      $scope.flushPaymentStatus = function () {
        Loader.load();
        Payment.flushStatus($scope.paymentGroup._id, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.setMarkPaymentAsModalData = function (status) {
        const selectedPayments = $scope.payments.filter((payment) => payment.selected);
        const paymentsToProcess = selectedPayments.length > 0 ? selectedPayments : $scope.payments;

        const isPaymentValid = (payment) => {
          if (status === 'Paid Offline') {
            return (
              payment.status === 'Pending'
              || payment.status === 'Payment Error'
              || payment.status === 'Missing Info'
              || (payment.paymentDetails?.provider === 'Standard CSV' && !payment.paymentDetails?.paidOffline && payment.status !== 'Paid')
            );
          }
          if (status === 'Pending') {
            return (
              (payment.status === 'Paid' && payment.paymentDetails?.paidOffline)
              || (payment.status === 'Paid' && payment.paymentDetails?.provider === 'Standard CSV')
            );
          }
          return false;
        };

        const validPayments = paymentsToProcess.filter(isPaymentValid);

        if (validPayments.length === 0) {
          Loader.error(
            `The selected payments cannot be marked as ${status} as they do not meet the required conditions.`,
          );
        }

        $scope.markPaymentAsModalData.status = status;
        $scope.markPaymentAsModalData.count = validPayments.length;
        $scope.selectedPaymentIds = validPayments.map((payment) => payment._id);
      };

      $scope.markPayments = function () {
        Loader.load();

        const payload = {
          ids: $scope.selectedPaymentIds,
          status: $scope.markPaymentAsModalData.status,
        };

        PaymentGroup.markPayments($routeParams.id, payload, (response) => {
          if (response.status === 200) {
            Loader.success(`${$scope.markPaymentAsModalData.count} payments marked as ${$scope.markPaymentAsModalData.status} successfully.`);
            controller.loadPayments($scope.paymentsFilter);
          } else {
            Loader.error(response.data.message || `Error marking payments as ${$scope.markPaymentAsModalData.status}.`);
          }
        }).catch((response) => {
          Loader.error(response.data.message);
        });
      };

      $scope.export = function () {
        const selectedPayments = [];
        $scope.payments.forEach((payment) => {
          if (payment.selected) {
            selectedPayments.push(payment._id);
          }
        });

        Loader.load();
        PaymentGroup.export($routeParams.id, { ids: selectedPayments }, (response) => {
          if (response.status === 200) {
            Loader.success('Your report will be sent to you shortly');
          } else {
            Loader.error(response.data.message);
          }
        });
      };

      $scope.removePayments = function () {
        const selectedPayments = [];
        $('#removePaymentsModal').modal('hide');
        $('#removePaymentsModal').one('hidden.bs.modal', () => {
          $scope.payments.forEach((payment) => {
            if (payment.selected) { selectedPayments.push(payment._id); }
          });
          if (selectedPayments.length > 0) {
            Loader.load();
            Payment.delete(selectedPayments, (response) => {
              // Received success response 200 or 201
              if (response.status === 200) {
                const { deletedCount } = response.data;
                if (deletedCount > 0) {
                  // Succesfully deleted all requested releases
                  controller.loadPayments($scope.paymentsFilter);
                  Loader.success(`${deletedCount}/${selectedPayments.length} payments successfully deleted`);
                } else {
                  // No associations preventing deletion but nothing was deleted
                  Loader.error('The payments have not been deleted due to an internal error. Please try again or contact support');
                }
              } else {
                // Received 201: We have prevented deletion due to associations
                Loader.error(`The payments have not been deleted. ${response.data}`);
              }
            }).catch((response) => {
              // Server returned an error response
              Loader.error(`The payments have not been deleted. ${response.data.message}`);
            });
          } else {
            Loader.error('Please select at least one payment to delete');
          }
        });
      };

      $scope.paySelected = function () {
        $('#paySelected').modal('hide');
        const selectedPayments = [];
        $scope.payments.forEach((payment) => {
          if (payment.selected) {
            selectedPayments.push(payment._id);
          }
        });

        Loader.load();
        if (selectedPayments.length === 0) {
          Loader.error('Select at least one payment to pay');
        } else {
          PaymentGroup.paySelected($routeParams.id, { ids: selectedPayments, type: 'csv' }, (response) => {
            if (response.status === 200) {
              Loader.success(response.data.message);
              controller.loadPayments();
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.payAll = function () {
        $('#payAll').modal('hide');
        Loader.load();
        PaymentGroup.payAll($routeParams.id, { type: 'csv' }, (response) => {
          if (response.status === 200) {
            Loader.success(response.data.message);
            controller.loadPayments();
          } else {
            Loader.error(response.data.message);
          }
        })
          .catch((error) => {
            Loader.error(error.data.message);
          });
      };

      this.getPayerBalance = function () {
        $scope.gettingBalance = true;
        PaymentGroup.getPayerBalance($routeParams.id, {}, (response) => {
          if (response.status === 200) {
            $scope.balance = response.data.balance;
            if (response.data.currency && Session.currency !== response.data.currency) { $scope.currencyMismatch = true; }
          } else if (response.status === 404) {
            $scope.balanceError = response.data.message;
          }
          $scope.gettingBalance = false;
        });
      };
      // Get payer balance
      if ($routeParams.id) {
        controller.getPayerBalance();
      }

      // Download import template
      $scope.downloadTemplate = function () {
        Loader.load();
        Client.downloadTemplate({ type: 'payment' }, (response) => {
          if (response.status === 200) {
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'Payment Import Template.xlsx';
            link.click();
            Loader.complete();
          } else {
            Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
          }
        }).catch(() => {
          Loader.error('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
        });
      };
    },
  ]);
