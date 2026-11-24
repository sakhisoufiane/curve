angular.module('Curve')
  .factory('Notification', ($http, Session) => ({
    success(message) {
      $('body').pgNotification({
        style: 'simple',
        message,
        position: 'bottom-left',
        timeout: 3500,
        type: 'success',
      }).show();
    },
    warning(message) {
      $('body').pgNotification({
        style: 'simple',
        message,
        position: 'bottom-left',
        timeout: 10000,
        type: 'warning',
      }).show();
    },
    error(message) {
      $('body').pgNotification({
        style: 'simple',
        message,
        position: 'bottom-left',
        timeout: 10000,
        type: 'error',
      }).show();
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/notifications/${id}` }).then((data) => {
        callback(data);
      });
    },
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/notifications?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    count(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/notifications/count?${$.param(params)}` }).then(
        (data) => callback(null, data),
        (error) => callback(error),
      );
    },
    markRead(ids, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/notifications/mark_read?${$.param({ ids })}` }).then((data) => {
        callback(data);
      });
    },
  }));
