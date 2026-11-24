angular.module('Curve')
  .factory('PaymentGroup', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payment_groups?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payment_groups/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/payment_groups/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/payment_groups`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payment_groups`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    getPayments(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payment_groups/${id}/payments?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    getPayerBalance(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/payment_groups/${id}/payer_balance?${$.param(params)}` })
        .then((data) => {
          callback(data);
        })
        .catch((data) => {
          callback(data);
        });
    },
    import(id, file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/payment_groups/${id}/import_payments`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payment_groups/${id}/export_payments`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    paySelected(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payment_groups/${id}/pay_selected`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    payAll(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payment_groups/${id}/pay_all`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    markPayments(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/payment_groups/${id}/mark_payments`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
