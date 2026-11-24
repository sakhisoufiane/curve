angular.module('Curve')
  .factory('Catalogue', ($http, Session) => ({
    runFindDuplicatesTask(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/catalogue/duplicates/start-task?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    getFindDuplicatesStatus(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/catalogue/duplicates/task/status?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
  }));
