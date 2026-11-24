angular.module('Curve')
  .factory('User', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/${id}` }).then((data) => {
        callback(data);
      });
    },
    getClients(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/${id}/clients` }).then(
        (data) => {
          callback(data);
        },
        // handle errors
        (error) => {
          callback(error);
        },
      );
    },
    getPayees(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/${id}/payees` }).then(
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
      return $http({ method: 'PUT', url: `${Session.apiUrl}/users/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/users`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/users/${id}` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    get_possible_clients(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/${id}/get_possible_clients?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    set_client(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/users/${id}/set_client`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    remove_client(id, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/users/${id}/remove_client`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/users/import`,
        data: {
          file,
          another: 'field',
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/users/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    setupAuthenticatorApp(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/users/${id}/setup_mfa` }).then((data) => {
        callback(data);
      });
    },
    checkMfaToken(params, userId, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/users/${userId}/check_mfa`, data: params, headers: { 'Content-Type': 'application/json' } })
        .then(callback)
        .catch(callback);
    },
    setupEmail(userId, multiFactorAuthenticationType, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/users/${userId}/setup_mfa_email`, data: { multiFactorAuthenticationType }, headers: { 'Content-Type': 'application/json' } })
        .then((data) => callback(data))
        .catch(callback);
    },
  }));
