angular.module('Curve')
  .factory('DeliveryPartner', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryPartners?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    allCwr(params, callback) {
      params.excludeOutputFormat = ['ISWC Allocation (IAS)', 'ISWC Resolution (IRS)'];
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryPartners?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    allIswc(params, callback) {
      params.outputFormat = ['ISWC Allocation (IAS)', 'ISWC Resolution (IRS)'];
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryPartners?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryPartners/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/deliveryPartners/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/deliveryPartners/${id}`).then((data) => {
        callback(data);
      }).catch(callback);
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/deliveryPartners`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/deliveryPartners/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    upload(id, file, callback) {
      Upload.upload({ url: `${Session.apiUrl}/deliveryPartners/${id}/ftp_key_file`, data: { file } }).then((response) => {
        callback(response);
      });
    },
    deleteUpload(id, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/deliveryPartners/${id}/ftp_key_file`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
