angular.module('Curve')
  .factory('Statement', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    analytics(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}/detail` }).then((data) => {
        callback(data);
      });
    },
    salesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}/sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    costs(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}/costs?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/statements/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    send(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}/send` }).then((data) => {
        callback(data);
      });
    },
    sendMany({ ids, filter }, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/send_many`, data: { ids, filter }, headers: { 'Content-Type': 'application/json' } }).then(
        (data) => {
          callback(data);
        },
        // handle errors
        (error) => {
          callback(error);
        },
      );
    },
    publishMany({ ids, filter }, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/publish_many`, data: { ids, filter }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    unpublishMany({ ids, filter }, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/unpublish_many`, data: { ids, filter }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    runCalculation(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/${id}/calculate`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(
        (data) => {
          callback(null, data);
        },
        (error) => {
          callback(error);
        },
      );
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    exportToClient(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/statements/${id}/export_to_client?${$.param(params)}` }).then(
        (data) => {
          callback(data);
        },
        // handle errors
        (error) => {
          callback(error);
        },
      );
    },
    pay(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/${id}/pay` })
        .then((data) => {
          callback(data);
        })
        .catch((data) => {
          callback(data);
        });
    },
    payMany(ids, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/pay_many`, data: { ids }, headers: { 'Content-Type': 'application/json' } })
        .then((data) => {
          callback(data);
        })
        .catch((data) => {
          callback(data);
        });
    },
    setPublishedStatus(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/statements/${id}/set_published_status`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    downloadSelectedStatements(statementIds, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/statements/download_selected_statements`, data: { statementIds }, headers: { 'Content-Type': 'application/json' } })
        .then((data) => {
          callback(data);
        })
        .catch((data) => {
          callback(data);
        });
    },
  }));
