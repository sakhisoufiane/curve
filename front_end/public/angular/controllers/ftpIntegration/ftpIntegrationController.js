angular.module('Curve')
  .controller('ftpIntegrationController', ['$window', '$location', '$rootScope', '$scope', 'Session', 'Client', 'User', 'Notification', 'Loader', 'Settings', '$timeout',
    function ($window, $location, $rootScope, $scope, Session, Client, User, Notification, Loader, Settings, $timeout) {
      $window.scrollTo(0, 0);
      $window.setImmediate = function (callback) {
        setTimeout(callback, 0);
      };
      $scope.client = { distributionChannels: [], configurations: [], priceCategories: [], sources: [], costTypes: [] };
      $scope.clientType = Session.clientType;
      $scope.userRole = Session.userType;
      $scope.fugaClientTypes = ['Aggregation', 'Direct'];
      $scope.fuga = {
        fugaOrgId: '',
        fugaNotifyEmails: [],
        fugaLastSync: null,
        fugaAutoSyncEnabled: false,
        defaultDistributionChannel: '',
        matchContractsOnImport: false,
        setDefaultReleaseIdOnImport: false,
        ingestForeignIdsFromDelivery: false,
        setCatNoFromBarcodeOnImport: false,
        statementNotifications: '',
      };
      $scope.internalUser = Session.internal;
      $scope.fugaNotifyEmails = [];
      // Tabs
      $scope.activeTab = 'catalogue';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.uploadFile = function (server, file) {
        const serverIndex = $scope.client.ackFtpIngestions.indexOf(server);

        function saveKeyFile() {
          Client.upload($scope.client._id, serverIndex, file, (response) => {
            if (response.status === 200) {
              $scope.client.ackFtpIngestions[serverIndex].fileKey = response.data.client.ackFtpIngestions[serverIndex].fileKey;
              Loader.success('File successfully uploaded');
            } else {
              Loader.error('Error uploading file, please try again or contact support');
            }
          });
        }

        $scope.saveSettings(saveKeyFile);
      };

      $scope.uploadCatalogueKeyFile = function (client, file) {
        function saveKeyFile() {
          Client.uploadCatalogueKeyFile(client._id, file, (response) => {
            if (response.status === 200) {
              $scope.client.ftpFileKey = response.data.client.ftpFileKey;
              Loader.success('File successfully uploaded');
            } else {
              Loader.error('Error uploading file, please try again or contact support');
            }
          });
        }

        $scope.saveSettings(saveKeyFile);
      };

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.periods === 'None') {
            $location.path('/');
          }
        }
      });

      $rootScope.$watch('clientType', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.clientType = $rootScope.clientType;
            $scope.loadFugaCatSyncView();
          });
        });
      });

      $rootScope.$watch('userType', () => {
        $timeout(() => {
          $scope.$apply(() => {
            $scope.userRole = $rootScope.userType;
            $scope.getClient();
          });
        });
      });

      $rootScope.$watch('internal', () => {
        $timeout(() => {
          $scope.$apply(() => {
            if ($rootScope.internal) {
              $scope.internalUser = true;
              $scope.loadFugaCatSyncView();
            }
          });
        });
      });

      $scope.loadFugaCatSyncView = function () {
        if (($scope.userRole === 'client' && $scope.clientType === 'Label' && $scope.client?.fugaIntegration?.fugaOrgId) || $scope.internalUser) {
          if (Session.id && Session.userType === 'client') {
            User.get(Session.id, (response) => {
              if (response.status === 200) {
                $scope.user = response.data;
                if ($scope.user.clientId) {
                  Client.get($scope.user.clientId, (response) => {
                    if (response.status === 200) {
                      $scope.client = response.data;
                      if ($scope.client.fugaIntegration) {
                        $scope.fuga = $scope.client.fugaIntegration;
                        const fugaNotifyEmails = [];
                        $scope.client.fugaIntegration.fugaNotifyEmails.map((item) => {
                          fugaNotifyEmails.push({ email: item, id: uuid() });
                        });
                        $scope.fuga.fugaNotifyEmails = fugaNotifyEmails;
                        $scope.setTab('fugaSync');
                        $window.setImmediate(() => {
                          $('#tab-option-catalogue').removeClass('active');
                          $('#tab-option-fugaSync').addClass('active');
                        });
                      }
                    }
                  });
                }
              }
            });
          }
        }
      };

      $scope.getClient = function () {
        if (Session.id && Session.userType === 'client') {
          Loader.load();
          User.get(Session.id, (response) => {
            if (response.status === 200) {
              $scope.user = response.data;
              if ($scope.user.clientId) {
                Client.get($scope.user.clientId, (response) => {
                  if (response.status === 200) {
                    $scope.client = response.data;
                    Loader.complete();
                    $scope.loadFugaCatSyncView();
                  } else {
                    Loader.error('Error loading client, please try again or contact support');
                  }
                });
              }
            } else {
              Loader.error('Error loading user, please try again or contact support');
            }
          });
        }
      };

      $scope.getClient();

      $scope.saveSettings = function (callback) {
        Loader.load();
        const allEntriesValid = checkAllEntriesValid($scope.client?.salesFtpIngestions) && checkAllEntriesValid($scope.client?.ackFtpIngestions);

        if (!allEntriesValid) {
          Loader.error('Please ensure Port numbers are valid for the server');
          return;
        }

        if ($scope.user.newPassword !== $scope.user.confirmNewPassword) {
          Loader.error('Passwords do not match');
          return;
        }

        if ($scope.client.fugaIntegration && $scope.client.fugaIntegration.fugaNotifyEmails) {
          // remove ID added by loadFugaCatSyncView, save an array of strings, filtering out empty values
          $scope.client.fugaIntegration.fugaNotifyEmails = $scope.client.fugaIntegration.fugaNotifyEmails.map((notificationEmail) => notificationEmail.email).filter((email) => !!email);
        }

        // Function to handle client update
        function saveClient() {
          Client.update($scope.client._id, $scope.client, (clientResponse) => {
            if (clientResponse.status === 200) {
              $scope.client = clientResponse.data;
              Loader.success('Integrations successfully saved');

              if (callback) callback();

              if ($scope.client.fugaIntegration) {
                $scope.fuga = $scope.client.fugaIntegration;
                const fugaNotifyEmails = $scope.client.fugaIntegration.fugaNotifyEmails.map((item) => ({
                  email: item,
                  id: uuid(),
                }));
                $scope.fuga.fugaNotifyEmails = fugaNotifyEmails;
              }
            } else {
              Loader.error(clientResponse.data.message);
            }
          });
        }

        User.update($scope.user._id, $scope.user, (userResponse) => {
          if (userResponse.status !== 200) {
            Loader.error(userResponse.data.message);
            return;
          }

          $scope.user = userResponse.data;

          if ($scope.client._id) {
            // Manage Key Files
            if ($scope.client.ackFtpIngestions) {
              // Loop ACK Ingestions
              $scope.client.ackFtpIngestions.forEach((ingestion, index) => {
                ingestion.newConnection = false;

                if (ingestion.fileKey && (ingestion.protocol !== 'SFTP' || ingestion.authenticationType !== 'Key File')) {
                  Client.deleteUpload($scope.client._id, index, (response) => {
                    $scope.client.ackFtpIngestions[index].fileKey = null;
                    Loader.success(response.status === 200 ? 'Acknowledgement Key file successfully deleted' : 'Error deleting Acknowledgement Key File, please try again or contact support');
                  });
                }
              });
            }

            // Manage Catalogue Key File
            if ($scope.client.ftpFileKey && ($scope.client.ftpProtocol !== 'SFTP' || $scope.client.ftpAuthenticationType !== 'Key File')) {
              // Key File exists but not using SFTP or Key File authentication
              Client.deleteCatalogueKeyFile($scope.client._id, (response) => {
                $scope.client.ftpFileKey = null;
                Loader.success(response.status === 200 ? 'Catalogue Key file successfully deleted' : 'Error deleting Catalogue Key File, please try again or contact support');
                saveClient();
              });
            } else {
              saveClient();
            }
          } else {
            if (callback) callback();
            Loader.success('Integrations successfully saved');
          }
        });
      };

      function checkAllEntriesValid(entries) {
        return entries?.every((entry) => entry.port >= 1 && entry.port <= 65535);
      }

      $scope.addFtpIngestRow = function (ftpIngestions) {
        $scope.client[ftpIngestions] = $scope.client[ftpIngestions] || [];
        $scope.client[ftpIngestions].push({ active: true });
        $scope.client[ftpIngestions][$scope.client[ftpIngestions].length - 1].newConnection = true;
      };

      $scope.deleteFtpIngestRow = function (server, ftpIngestions) {
        const index = $scope.client[ftpIngestions].indexOf(server);
        if (server.fileKey) {
          Client.deleteUpload($scope.client._id, index, (response) => {
            Loader.success(response.status === 200 ? 'Key file successfully deleted' : 'Error deleting Key File, please try again or contact support');
          });
        }
        $scope.client[ftpIngestions].splice(index, 1);
      };

      function uuid() {
        let dt = new Date().getTime();
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          // eslint-disable-next-line no-bitwise
          const r = (dt + Math.random() * 16) % 16 | 0;
          dt = Math.floor(dt / 16);
          // eslint-disable-next-line no-bitwise, no-mixed-operators
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
      }

      $scope.addFugaNotificationEmail = function () {
        if ($scope.internalUser) {
          if ($scope.fuga.fugaNotifyEmails.length < 10) {
            $scope.fuga.fugaNotifyEmails.push({ email: '', id: uuid() });
          }
        } else if ($scope.fuga.fugaNotifyEmails.length < 3) {
          $scope.fuga.fugaNotifyEmails.push({ email: '', id: uuid() });
        }
      };

      $scope.removeFugaNotificationEmail = function (emailId) {
        const emailIndex = $scope.fuga.fugaNotifyEmails.findIndex((item) => item.id === emailId);
        $scope.fuga.fugaNotifyEmails.splice($scope.fuga.fugaNotifyEmails.indexOf(emailIndex), 1);
      };

      $scope.syncFugaCatalogue = function () {
        if (Session.clientId) {
          Loader.load();
          Client.fugaSyncCatalogue(Session.clientId, $scope.user.email, (response) => {
            if (response.status === 200) {
              Loader.success('Synchronisation is running, you will be alerted once it finishes');
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.saveFugaSettings = function () {
        if (Session.clientId) {
          Loader.load();
          const fugaIntegration = JSON.parse(JSON.stringify($scope.fuga));
          fugaIntegration.fugaNotifyEmails = fugaIntegration.fugaNotifyEmails.map((item) => item.email.trim());
          Client.updateFugaSettings(Session.clientId, { fugaIntegration }, (response) => {
            if (response.status === 200) {
              Loader.success('Settings successfully saved');
            } else {
              Loader.error(response.data.message);
            }
          });
        }
      };

      $scope.verifyFtp = function (server) {
        if (Session.clientId) {
          Loader.load();
          const ftpConfig = JSON.parse(JSON.stringify(server));
          Client.verifyFtp({ ftpConfig }, (response) => {
            if (response.status === 200) {
              Loader.success('FTP connection verification success');
            } else {
              Loader.error('FTP connection verification failed - please check your credentials');
            }
          });
        }
      };

      $scope.verifyFtpClient = function (client) {
        const server = {
          name: 'FTP',
          protocol: client.ftpProtocol || 'FTP',
          host: client.ftpHost,
          username: client.ftpUsername,
          password: client.ftpPassword,
          port: client.ftpPort || (client.ftpProtocol === 'SFTP' ? 22 : 21),
          directory: client.ftpRootDir,
          authenticationType: client.ftpAuthenticationType,
          fileKey: client.ftpFileKey,
        };
        $scope.verifyFtp(server);
      };
    },
  ]);
