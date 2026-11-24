angular.module('Curve').factory('ImportPartner', ($http, Session) => ({
  all(params) {
    return $http({
      method: 'GET',
      url: `${Session.apiUrl}/importPartners?${$.param(params)}`,
    });
  },
  get(id) {
    return $http({
      method: 'GET',
      url: `${Session.apiUrl}/importPartners/${id}`,
    });
  },
  update(id, params) {
    return $http({
      method: 'PUT',
      url: `${Session.apiUrl}/importPartners/${id}`,
      data: params,
      headers: { 'Content-Type': 'application/json' },
    });
  },
  delete(id) {
    return $http.delete(`${Session.apiUrl}/importPartners/${id}`);
  },

  create(params, callback) {
    return $http({ method: 'POST', url: `${Session.apiUrl}/importPartners`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
      callback(data);
    });
  },
}));
