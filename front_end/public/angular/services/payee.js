angular.module('Curve')
  .factory('Payee', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}` }).then((data) => {
        callback(data);
      });
    },
    getSummary(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/summary` }).then((data) => {
        callback(data);
      });
    },
    getPayeeBalance(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/payee_balance` }).then((data) => {
        callback(data);
      });
    },
    getTransactions(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/transactions` }).then((data) => {
        callback(data);
      });
    },
    getStatements(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/statements` }).then((data) => {
        callback(data);
      });
    },
    createTransaction(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payees/${id}/transaction`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    updateTransaction(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/payees/${id}/transaction`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    deleteTransaction(id, transactionId, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/payees/${id}/transaction/${transactionId}` }).then((data) => {
        callback(data);
      });
    },
    getAnalytics(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/detail` }).then((data) => {
        callback(data);
      });
    },
    getUsers(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/users?${$.param(params)}` }).then(
        (data) => {
          callback(data);
        },
        // handle errors
        (error) => {
          callback(error);
        },
      );
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/payees/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/payees/${id}`).then((data) => {
        callback(data);
      });
    },
    deleteBulk(ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/payees/bulk`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payees`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    import(file, overwriteBlanks, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/payees/import?overwriteBlanks=${overwriteBlanks}`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payees/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    getTipaltiIframeAuthentication(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payees/${id}/tipalti_iframe_authentication` })
        .then((data) => { callback(data); })
        .catch(((data) => { callback(data); }));
    },
    createWiseRecipient(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payees/${id}/create_wise_recipient`, data: params, headers: { 'Content-Type': 'application/json' } })
        .then((data) => { callback(data); })
        .catch(((data) => { callback(data); }));
    },
    importPayeeTransactions(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/payees/transactions/import`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    exportPayeeTransactions(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payees/transactions/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
  }));
