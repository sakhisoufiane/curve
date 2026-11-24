angular.module('Curve')
  .factory('Company', ($http, Session, Report, $q) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/companies?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/companies/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/companies/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/companies/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/companies`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/companies/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    getReports(reports) {
      return $q((resolve) => {
        Report.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ reports } = response.data);
            resolve(reports);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
  }));
