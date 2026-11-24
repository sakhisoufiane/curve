angular.module('Curve')
  .controller('salesFileNewBulkController', ['$rootScope', '$scope', '$routeParams', '$q', '$window', 'Session', 'Notification', 'Territories', 'Settings', 'Uploader', 'SalesFile', 'Currencies', 'Loader', 'Pros',
    function ($rootScope, $scope, $routeParams, $q, $window, Session, Notification, Territories, Settings, Uploader, SalesFile, Currencies, Loader, Pros) {
      $window.scrollTo(0, 0);
      $scope.files = [];
      $scope.fileErrors = [];
      $scope.validFileTypes = $rootScope.validFileTypesSales;
      $scope.uploadComplete = false;
      $scope.uploadCancelled = false;
      $scope.fileToUpload = {};
      $scope.salesFileCurrentlyUploading = {};
      $scope.duplicateModal = {};
      $scope.uploadedFiles = [];

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.sales;
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
          $scope.salesupload();
        });
      $scope.filedropFilesAdded = function (files, invalidFiles) {
        $scope.clearErrors();
        invalidFiles.forEach((file) => {
          $scope.fileErrors.push(file.name);
        });
        filedropDisplayText();
        $scope.salesupload();
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

      $scope.salesupload = function () {
        if (validateForm() && $scope.formErrors && $scope.formErrors.length === 0) {
          $('#importModal').modal({ backdrop: 'static', keyboard: false });
          $scope.files.reduce((p, file) => p.then(() => uploadSalesFile(file)), $q.when(true)).then(() => {
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
        $scope.files.forEach((file) => {
          const ext = file.name.substring(file.name.lastIndexOf('.'));
          if (!$scope.validFileTypes.includes(ext)) {
            $scope.fileErrors.push(file.name);
          }
        });
        return ($scope.fileErrors.length === 0);
      }
      $('#duplicateModal').on('hidden.bs.modal', () => {
        if ($scope.duplicateModal.action === 'skip') {
          $scope.fileToUpload.skipped = true;
          $scope.duplicateModal.skipUpload();
        } else if ($scope.duplicateModal.action === 'upload') { $scope.duplicateModal.doUpload(); }
      });
      function uploadSalesFile(file) {
        const salesFileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const salesFile = { name: salesFileName };
        $scope.fileToUpload = file;
        return $q((resolve, reject) => {
          $scope.duplicateModal.doUpload = function () { startUpload(file, salesFile, resolve, reject); };
          $scope.duplicateModal.skipUpload = function () { resolve(); };
          SalesFile.all({ name: salesFileName }, (response) => {
            if (response.data.salesFiles && response.data.salesFiles.length !== 0) {
              $('#duplicateModal').modal({ backdrop: 'static', keyboard: false });
            } else {
              startUpload(file, salesFile, resolve, reject);
            }
          });
        });
      }
      function startUpload(file, salesFile, resolve, reject) {
        save(salesFile, (response) => {
          if (response.status === 200) {
            const returnedSalesFile = response.data;
            $scope.salesFileCurrentlyUploading = returnedSalesFile;
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
            Uploader.upload(file, `/salesFiles/${returnedSalesFile._id}/get_upload_credentials`, hideLoader, ingest, progress).then((response) => {
              $scope.uploadedFiles.push(file);
              resolve();
            }).catch(() => {
              reject('upload cancelled');
            });
          } else {
            // eslint-disable-next-line no-console
            console.error('Error saving sales file, please try again or contact support');
            reject();
          }
        });
      }
      $scope.cancelUpload = function () {
        $scope.uploadCancelled = true;
        $('#importModal').modal('hide');
        Loader.load();
        SalesFile.delete($scope.salesFileCurrentlyUploading._id, (response) => {
          Loader.complete();
          $window.location.href = '#/sales';
        });
      };

      function save(salesFile, callback) {
        SalesFile.create(salesFile, (response) => {
          callback(response);
        });
      }
    }]);
