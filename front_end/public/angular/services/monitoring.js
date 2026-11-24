angular.module('Curve')
  .factory('Monitoring', ($http, Session, Upload) => ({
    copyClient(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/copyClient?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    supportScript(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/supportScript?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    supportScriptList(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/supportScriptList` }).then((data) => {
        callback(data);
      });
    },
    triggerFtpIngestion(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/triggerFtpIngestion?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((err) => callback(err));
    },
    ftpIngestionList(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/ftpIngestionList?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((err) => callback(err));
    },
    getChartCredentials(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/chart_credentials` }).then((data) => {
        callback(data);
      }).catch((err) => callback(err));
    },
    toggleQueueBlockedStatus(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/toggle-queue-status` }).then((data) => {
        callback(data);
      });
    },
    setTaskAsHung(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/set-task-as-hung?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    deleteTask(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/delete-task?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    rerunTask(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/rerun-task?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    terminateTask(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/terminate?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    clearBatchWorkers(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/monitoring/clear-batch-workers` }).then((data) => {
        callback(data);
      });
    },
  }));
