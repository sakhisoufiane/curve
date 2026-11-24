angular.module('Curve')
  .factory('Loader', ($http, $rootScope, Notification) => {
    let isLoading = false;
    let isFileLoading = false;
    let uploadFile = {};
    let timeout = null;
    return {
      load() {
        isLoading = true;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          isLoading = false;
          $rootScope.$apply();
        }, 300 * 1000);
      },
      complete() {
        isLoading = false;
        clearTimeout(timeout);
      },
      success(str) {
        this.complete();
        setTimeout(() => {
          Notification.success(str);
        }, 1200);
      },
      warning(str) {
        this.complete();
        setTimeout(() => {
          Notification.warning(str);
        }, 1200);
      },
      error(str) {
        this.complete();
        setTimeout(() => {
          Notification.error(str);
        }, 1200);
      },
      getLoader() {
        return isLoading;
      },
      getFileLoader() {
        return isFileLoading;
      },
      getUploadFile() {
        return uploadFile;
      },
      fileUpload(newUploadFile) {
        isLoading = false;
        isFileLoading = true;
        uploadFile = newUploadFile;
      },
      fileUploadComplete() {
        isFileLoading = false;
      },
    };
  });
