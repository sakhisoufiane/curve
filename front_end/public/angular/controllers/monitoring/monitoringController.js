angular.module('Curve')
  .controller('monitoringController', ['$route', '$rootScope', '$cookies', '$scope', '$window', '$interval', '$location', 'Session', 'Task', 'Monitoring', 'User', 'SymbolFromCurrency', '$timeout', 'Loader',
    function ($route, $rootScope, $cookies, $scope, $window, $interval, $location, Session, Task, Monitoring, User, SymbolFromCurrency, $timeout, Loader) {
      const controller = this;
      $scope.counts = null;
      $scope.pending = null;
      $scope.processing = null;
      $scope.errored = null;
      $scope.hung = null;
      $scope.today = null;

      $scope.clickThrough = function (task) {
        let ref = '';

        if (task.name === 'Sales File Ingest' || task.name === 'Sales File Revalidate') {
          ref = `#/sales/${task.value}/edit`;
        } else if (task.name === 'Process Period') {
          ref = `#/periods/${task.value}/complete`;
        } else if (task.name === 'Process Statement') {
          ref = `#/statements/${task.value}`;
        }

        setClientForCurrentUser({ clientId: task.clientId, name: task.client }, () => {
          $window.location.href = ref;
          $window.location.reload();
        });
      };

      function setClientForCurrentUser(client, callback) {
        const params = {
          roleId: client.clientId,
          role: 'client',
        };

        User.set_client($scope.id, params, (response) => {
          Session.token = response.data.token;
          $cookies.put('curveToken', Session.token, { secure: true });
          Session.setLockedForPayment(false);
          callback();
        });
      }

      this.getLabel = function (name) {
        if (name.includes('Period Statements Zip')) {
          return 'Statements Zip';
        } if (name.includes('RASA Statement')) {
          return 'RASA Statement';
        } if (name.includes('Statement')) {
          return 'Statement';
        } if (name.includes('Revalidate Sales File')) {
          return 'Revalidate';
        } if (name.includes('Profit Share')) {
          return 'Profit Share';
        }
        return name;
      };

      this.getClass = function (name) {
        if (name.includes('Process')) {
          return 'label-info';
        } if (name.includes('Sales File')) {
          return 'label-success';
        }
        return ''; // default grey
      };

      function determineValueField(obj) {
        if (obj.name === 'RASA Statement') {
          const parsedValue = (typeof obj.value === 'string') ? JSON.parse(obj.value) : obj.value;
          return parsedValue.metadata?.statement_id;
        }
        if (obj.name === 'Download Selected Statements Zip') return `Downloading ${obj.value.ids.length} Statements`;
        if (obj.name === 'Fuga Youtube Catalog Sync') return obj._id;
        return obj.value[Object.keys(obj.value)[0]];
      }

      this.extractData = function (data) {
        const extracted = [];
        data.forEach((o, i) => {
          const obj = {};
          obj.name = o.name;
          obj.client = o.clientName || o.clientId || o.value?.metadata?.fuga_organization_id;
          obj.clientId = o.clientId;
          obj.label = controller.getLabel(o.name);
          obj.class = controller.getClass(o.name);
          obj.value = determineValueField(o);
          obj.date = o.createdAt;
          obj.status = o.progressStatus;
          obj.processState = o.value?.processState || null;
          obj._id = o._id;
          obj.taskArn = o.taskArn;
          obj.healthy = o.healthy;
          obj.stepFunctionId = o.metadata?.stepFunctionExecutionId;

          if (o.value.salesCount || o.value.salesCount === 0) {
            obj.salesCount = o.value.salesCount;
          }

          if (o.value.statementCount || o.value.statementCount === 0) {
            obj.statementCount = o.value.statementCount;
          }

          if (o.error) { obj.error = o.error; }

          extracted[i] = obj;
        });

        return extracted;
      };

      this.getQueueStats = function () {
        Task.count((response) => {
          if (response.status === 200) {
            $scope.counts = response.data;
          }
        });
        Task.pending((response) => {
          if (response.status === 200) {
            $scope.pendings = controller.extractData(response.data);
          }
        });
        Task.processing((response) => {
          if (response.status === 200) {
            $scope.processings = controller.extractData(response.data);
          }
        });
        Task.errored((response) => {
          if (response.status === 200) {
            $scope.errored = controller.extractData(response.data);
          }
        });
        Task.hung((response) => {
          if (response.status === 200) {
            $scope.hung = controller.extractData(response.data);
          }
        });
        Task.today((response) => {
          if (response.status === 200) {
            $scope.todays = controller.extractData(response.data);
          }
        });
        Task.isQueueBlocked((response) => {
          if (response.status === 200) {
            $scope.isQueueBlocked = response.data?.isQueueBlocked;
          }
        });
      };

      $scope.toggleQueueBlockedStatus = function () {
        Monitoring.toggleQueueBlockedStatus((response) => {
          if (response.status === 200) {
            $scope.isQueueBlocked = !$scope.isQueueBlocked;
          }
        });
      };

      $scope.clearBatchWorkers = function () {
        Monitoring.clearBatchWorkers((response) => {
          if (response.status === 200) {
            controller.getQueueStats();
          }
        });
      };

      $scope.editingTask = function (task, isErrored, isPending) {
        $scope.taskBeingEdited = task;
        $scope.editAction = null;
        $scope.isErroredEdit = !!isErrored;
        $scope.isPendingEdit = !!isPending;
      };

      $scope.showTaskEditConfirmation = function (action) {
        $scope.editAction = action;
      };

      // Reset editAction when the modal is closed
      $('#editTaskModal').on('hidden.bs.modal', () => {
        $scope.$apply(() => {
          $scope.editAction = null;
        });
      });

      $scope.setTaskAsHung = function (task) {
        const taskId = task._id;
        Monitoring.setTaskAsHung({ taskId }, (response) => {
          if (response.status === 200) {
            $scope.editAction = null;
            controller.getQueueStats();
          }
        });
      };

      $scope.deleteTask = function (task) {
        const taskId = task._id;
        Monitoring.deleteTask({ taskId }, (response) => {
          if (response.status === 200) {
            $scope.editAction = null;
            controller.getQueueStats();
          }
        });
      };

      $scope.rerunTask = function (task) {
        const taskId = task._id;
        $('#editTaskModal').modal('hide');
        Loader.load();
        Monitoring.rerunTask({ taskId }, (response) => {
          if (response.status === 200) {
            Loader.success('Task re-run successfully');
            controller.getQueueStats();
          } else {
            Loader.error(response.data?.message || 'Failed to re-run task');
          }
        });
      };

      $scope.terminateTask = function (task) {
        const taskId = task._id;
        $('#editTaskModal').modal('hide');
        Loader.load();
        Monitoring.terminateTask({ taskId }, (response) => {
          if (response.status === 200) {
            Loader.success('Task terminated successfully');
            controller.getQueueStats();
          } else {
            Loader.error(response.data?.message || 'Failed to terminate task');
          }
        });
      };

      $scope.timeAgo = function (date) {
        const currentDate = new Date(date);
        const seconds = Math.floor((new Date() - currentDate) / 1000);

        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 3600 % 60);

        if (d > 0 && d < 2) {
          return `${d} day`;
        }
        if (d >= 2) {
          return `${d} days`;
        }
        if (seconds < 60) {
          return `${s} secs`;
        }
        if (seconds < 120) {
          return `${m} min and ${s} secs`;
        }
        if (seconds >= 120 && seconds < 3600) {
          return `${m} mins and ${s} secs`;
        }
        if (seconds >= 3600 && seconds < 7200) {
          return `${h} hr and ${m} mins`;
        }
        if (seconds >= 7200) {
          return `${h} hrs and ${m} mins`;
        }
      };

      $scope.$on('$viewContentLoaded', () => {
        // if(Session.userType === "internal") {
        if (Session.internal || Session.monitoring) {
          controller.getQueueStats();
        } else {
          $location.path('/');
        }
      });

      const queueStatsInterval = $interval(controller.getQueueStats, 5000);

      $scope.$on('$destroy', () => {
        $interval.cancel(queueStatsInterval);
      });
    },
  ]);
