angular.module('Curve')
  .controller('CwrAcknowledgementsNewBulkController', ['$rootScope', '$scope', '$routeParams', '$q', '$window', 'Session', 'Notification', 'Territories', 'Settings', 'Uploader', 'CwrAcknowledgement', 'Currencies', 'Loader', 'Pros',
    function ($rootScope, $scope, $routeParams, $q, $window, Session, Notification, Territories, Settings, Uploader, CwrAcknowledgement, Currencies, Loader, Pros) {
      $window.scrollTo(0, 0);
      $scope.files = [];
      $scope.fileErrors = [];
      // $scope.validFileTypes = ['.txt', '.csv'];
      $scope.uploadComplete = false;
      $scope.uploadCancelled = false;
      $scope.fileToUpload = {};
      $scope.fileCurrentlyUploading = {};
      $scope.duplicateModal = {};
      $scope.uploadedFiles = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.catalogue;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      $('#filedrop-container input').hide();
      $('#filedrop-container')
        .on('drag dragstart dragend dragover dragenter dragleave drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
        })
        .on('dragover dragenter', () => {
          $('#filedrop-container').addClass('is-dragover');
        })
        .on('dragleave dragend drop', () => {
          $('#filedrop-container').removeClass('is-dragover');
        })
        .on('drop', (e) => {
          $scope.files = [];
          $.each(e.originalEvent.dataTransfer.files, (idx, file) => {
            $scope.files.push(file);
          });
          filedropDisplayText();
          $scope.acknowledgementUpload();
        });
      $scope.filedropFilesAdded = function (files, invalidFiles) {
        $scope.clearErrors();
        invalidFiles.forEach((file) => {
          $scope.fileErrors.push(file.name);
        });
        filedropDisplayText();
        $scope.acknowledgementUpload();
      };
      function filedropDisplayText() {
        if ($scope.files.length > 0) {
          $('#filedrop-text').html(($scope.files.length > 1) ? `${$scope.files.length} files added` : `1 file added<br/><br/>${$scope.files[0].name}`);
        } else {
          $('#filedrop-text').text('Choose more files or drag and drop them here');
        }
      }
      $scope.clearErrors = function () {
        $scope.formErrors = [];
        $scope.fileErrors = [];
      };

      $scope.acknowledgementUpload = function () {
        if (validateForm() && $scope.formErrors && $scope.formErrors.length === 0) {
          $('#importModal').modal({ backdrop: 'static', keyboard: false });
          $scope.files.reduce((p, file) => p.then(() => uploadAcknowledgementFile(file)), $q.when(true)).then(() => {
            $scope.files = [];
            filedropDisplayText();
            $('#importModal').modal('hide');
          }, (err) => {
            // eslint-disable-next-line no-console
            console.error(err);
          });
        }
      };
      function validateForm() {
        $scope.clearErrors();
        if ($scope.files.length === 0) { $scope.formErrors.push('Please supply at least one file to upload'); }
        // $scope.files.forEach((file) => {
        // const ext = file.name.substring(file.name.lastIndexOf('.'));
        // if (!$scope.validFileTypes.includes(ext)) {
        //   $scope.fileErrors.push(file.name);
        // }
        // });
        return ($scope.fileErrors.length === 0);
      }
      $('#duplicateModal').on('hidden.bs.modal', () => {
        if ($scope.duplicateModal.action === 'skip') {
          $scope.fileToUpload.skipped = true;
          $scope.duplicateModal.skipUpload();
        } else if ($scope.duplicateModal.action === 'upload') { $scope.duplicateModal.doUpload(); }
      });
      function uploadAcknowledgementFile(file) {
        const acknowledgementFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const cwrAcknowledgement = { name: acknowledgementFileName };
        $scope.fileToUpload = file;
        return $q((resolve, reject) => {
          $scope.duplicateModal.doUpload = function () { startUpload(file, cwrAcknowledgement, resolve, reject); };
          $scope.duplicateModal.skipUpload = function () { resolve(); };
          CwrAcknowledgement.all({ name: acknowledgementFileName }, (response) => {
            if (response.data.cwrAcknowledgements && response.data.cwrAcknowledgements.length !== 0) {
              $('#duplicateModal').modal({ backdrop: 'static', keyboard: false });
            } else {
              startUpload(file, cwrAcknowledgement, resolve, reject);
            }
          });
        });
      }
      function startUpload(file, cwrAcknowledgement, resolve, reject) {
        save(cwrAcknowledgement, (response) => {
          if (response.status === 200) {
            const returnedFile = response.data;
            $scope.fileCurrentlyUploading = returnedFile;
            const hideLoader = true;
            const ingest = true;
            const progress = function (upload, evt) {
              if ($scope.uploadCancelled) {
                upload.abort();
                $scope.uploadCancelled = false;
              } else {
                file.total = (evt.total > 1000000) ? `${parseInt(evt.total / 100000) / 10}MB` : `${parseInt(evt.total / 100) / 10}kB`;
                file.loaded = (evt.total > 1000000) ? `${parseInt(evt.loaded / 100000) / 10}MB` : `${parseInt(evt.loaded / 100) / 10}kB`;
              }
            };
            Uploader.upload(file, `/cwrAcknowledgements/${returnedFile._id}/get_upload_credentials`, hideLoader, ingest, progress).then((response) => {
              $scope.uploadedFiles.push(file);
              resolve();
            }).catch(() => {
              reject('upload cancelled');
            });
          } else {
            // eslint-disable-next-line no-console
            console.error('Error saving acknowledgement file, please try again or contact support');
            reject();
          }
        });
      }
      $scope.cancelUpload = function () {
        $scope.uploadCancelled = true;
        $('#importModal').modal('hide');
        Loader.load();
        CwrAcknowledgement.delete($scope.fileCurrentlyUploading._id, (response) => {
          Loader.complete();
          $window.location.href = '#/cwrAcknowledgements';
        });
      };

      function save(cwrAcknowledgement, callback) {
        CwrAcknowledgement.create(cwrAcknowledgement, (response) => {
          callback(response);
        });
      }
    }]);
