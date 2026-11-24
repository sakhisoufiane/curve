angular.module('Curve')
  .factory('Task', ($http, Session) => ({
    count(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/count` }).then((data) => {
        callback(data);
      });
    },
    pending(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/pending` }).then((data) => {
        callback(data);
      });
    },
    processing(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/processing` }).then((data) => {
        callback(data);
      });
    },
    errored(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/errored` }).then((data) => {
        callback(data);
      });
    },
    hung(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/hung` }).then((data) => {
        callback(data);
      });
    },
    today(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/today` }).then((data) => {
        callback(data);
      });
    },
    isQueueBlocked(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/is-queue-blocked` }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tasks/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
