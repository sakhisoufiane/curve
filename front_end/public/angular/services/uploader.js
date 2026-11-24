angular.module('Curve')
  .factory('Uploader', ($http, Session, Upload, Loader) => ({
    upload(file, createPath, hideLoader, ingest, progress) {
      this.show = true;
      const uploader = this;
      return new Promise((resolve, reject) => {
        if (file && file.name) {
          const params = { filename: file.name, type: file.type };
          // Hit API for upload credentials
          // $http({ method: 'PUT', url: Session.apiUrl + '/salesFiles/' + id + '/get_upload_credentials', data: params, headers: { 'Content-Type': 'application/json' } }).then(function(data) {
          $http({ method: 'PUT', url: Session.apiUrl + createPath, data: params, headers: { 'Content-Type': 'application/json' } }).then((response) => {
            const result = response.data.credentials;
            const upload = Upload.upload({
              url: result.url,
              transformRequest(data, headersGetter) {
                const headers = headersGetter();
                delete headers.Authorization;
                return data;
              },
              fields: result.fields,
              method: 'POST',
              file,
            });

            // Update Upload Events
            upload.progress((evt) => {
              if (progress) progress(upload, evt);
              file.progress = parseInt(100.0 * (evt.loaded / evt.total));
            }).success((data, status, headers, config) => {
              // File has uploaded, return the key to the API
              uploader.returnToApi(data, response.data.completePath, ingest, (response) => {
                file.progress_complete = true;
                resolve(response);
              });
            }).error((err) => {
              // console.error(err);
              reject(err);
            });

            // Add to uploads array
            if (!hideLoader) Loader.fileUpload({ file, upload });
          }).catch((response) => {
            Loader.error('Could not upload file. Please save the file and try again.');
          });
        } else {
          Loader.error('Could not upload file. Incorrect file type.');
        }
      });
    },
    show: false,
    returnToApi(data, path, ingest, callback) {
      const xml = $.parseXML(data);
      const key = $(xml).find('Key')[0].innerHTML;
      $http({ method: 'PUT', url: Session.apiUrl + path, data: { key, ingest }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        Loader.fileUploadComplete();
        callback(data);
      }, (error) => {
        Loader.fileUploadComplete();
        callback(error);
      });
    },
  }));
