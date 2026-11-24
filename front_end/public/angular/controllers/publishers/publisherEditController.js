angular.module('Curve')
  .controller('publisherEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Publisher', 'Notification', 'Fields', 'Loader', 'Settings', 'Pros', 'Territories', 'CwrTerritories',
    function ($rootScope, $scope, $routeParams, $window, Session, Publisher, Notification, Fields, Loader, Settings, Pros, Territories, CwrTerritories) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.publisher = { societies: [], territories: [] };
      $scope.pros = Pros;
      $scope.territories = Territories;
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.publisher));

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      // Load publisher if ID exists
      if ($routeParams.id) {
        Loader.load();
        Publisher.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.publisher = response.data;
            if ($scope.clientType !== 'Publisher') {
              if (!$scope.publisher.linkedContracts || $scope.publisher.linkedContracts.length === 0) {
                $scope.addContract();
              }
            }
            $scope.originalObj = JSON.parse(angular.toJson($scope.publisher));
            Loader.complete();
          } else {
            Loader.error('Error loading publisher, please try again or contact support');
          }
        });
      } else if (Publisher.copiedPublisher) {
        delete Publisher.copiedPublisher._id;
        delete Publisher.copiedPublisher.createdAt;
        delete Publisher.copiedPublisher.updatedAt;
        delete Publisher.copiedPublisher.interestedPartyId;
        if (Publisher.copiedPublisher.name) {
          Publisher.copiedPublisher.name += ' - Copy';
        }
        if (Publisher.copiedPublisher.cae) {
          delete Publisher.copiedPublisher.cae;
        }
        $scope.publisher = Publisher.copiedPublisher;
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        Publisher.copiedPublisher = $scope.publisher;
        $scope.leavingForCopy = true;
        $window.location.href = '#/publishers/new';
      };

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          Publisher.copiedPublisher = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.publisher-item').find('span.icon-thumbnail').addClass('white');

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.save = function () {
        Loader.load();
        updateAliases();

        // Check for duplicate aliases (case-insensitive)
        const aliases = $scope.publisher.aliases || [];
        const aliasesLower = aliases.map((a) => a.toLowerCase());
        const duplicateIndex = aliasesLower.findIndex((item, index) => aliasesLower.indexOf(item) !== index);
        if (duplicateIndex !== -1) {
          Loader.error(`Duplicate alias detected: '${aliases[duplicateIndex]}'. Each alias must be unique.`);
          return;
        }

        // Check if any alias matches the publisher's own primary name (case-insensitive)
        if ($scope.publisher.name && aliasesLower.indexOf($scope.publisher.name.toLowerCase()) !== -1) {
          Loader.error('An alias cannot be the same as the publisher\'s own name.');
          return;
        }

        cleanPopulatedFields($scope.publisher);
        if (!$scope.publisher._id) {
          Publisher.create($scope.publisher, (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.publisher));
              $window.location.href = `#/publishers/${response.data._id}/edit`;
              Loader.success('publisher successfully created');
            } else {
              Loader.error('Error creating publisher, please try again or contact support');
            }
          }).catch((response) => {
            Loader.error(`The object has not been saved.  ${response.data.message}`);
          });
        } else {
          Publisher.update($scope.publisher._id, $scope.publisher, (response) => {
            if (response.status === 200) {
              $scope.publisher = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.publisher));
              Loader.success('Publisher successfully saved');
            } else {
              Loader.error('Error saving publisher, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The publisher has not been saved.  ${response.data.message}`);
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Publisher.delete('single', [$scope.publisher._id], (response) => {
            if (response.status === 201) {
              $scope.deletionError = response.data;
              Loader.error('This publisher cannot be deleted as it is in use.');
            } else if (response.status === 200) {
              $window.location.href = '#/publishers';
              Loader.success('Publisher successfully deleted');
            } else {
              Loader.error('Error deleting publisher, please try again or contact support');
            }
          });
        });
      };

      $scope.agreementTypes = ['Subpublishing General', 'Subpublishing Specific'];

      // Aliases
      $scope.displayAliases = [];
      $scope.$watch('publisher.aliases', (aliases) => {
        $scope.displayAliases = [];
        if (aliases && aliases.length > 0) {
          angular.forEach(aliases, (alias) => {
            $scope.displayAliases.push({ name: alias });
          });
        }
      });

      $scope.addAlias = function () {
        $scope.displayAliases.push({ name: '' });
      };

      $scope.deleteAlias = function (alias) {
        const index = $scope.displayAliases.indexOf(alias);
        $scope.displayAliases.splice(index, 1);
      };

      function updateAliases() {
        $scope.publisher.aliases = [];
        angular.forEach($scope.displayAliases, (alias) => {
          if (alias.name) {
            $scope.publisher.aliases.push(alias.name);
          }
        });
      }

      $scope.addTerritorySocietyIdentifier = function () {
        $scope.publisher.societies.push({});
      };
      $scope.deleteTerritorySocietyIdentifier = function (identifier) {
        const index = $scope.publisher.societies.indexOf(identifier);
        $scope.publisher.societies.splice(index, 1);
      };

      $scope.addPublisherAgreement = function () {
        $scope.publisher.publisherAgreements = $scope.publisher.publisherAgreements ? $scope.publisher.publisherAgreements : [];
        $scope.publisher.publisherAgreements.push({});
      };
      $scope.deletePublisherAgreement = function (agreement) {
        const index = $scope.publisher.publisherAgreements.indexOf(agreement);
        $scope.publisher.publisherAgreements.splice(index, 1);
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        // Find any blank fields
        updateAliases();
        clearBlankFields();
        cleanPopulatedFields($scope.publisher);
        cleanPopulatedFields($scope.originalObj);
        const current = JSON.parse(angular.toJson($scope.publisher));
        delete current.tracks;
        // sort territories to match differently ordered lists of the same territories
        if (Array.isArray(current.territories)) { current.territories = current.territories.sort(); }
        if (Array.isArray($scope.originalObj.territories)) { $scope.originalObj.territories = $scope.originalObj.territories.sort(); }

        // Ignore territories difference if we have greater than the CISAC approved list (can be removed when we've removed all invalid territories from the db)
        if ($scope.originalObj.territories.length > CwrTerritories.COUNT) $scope.originalObj.territories = current.territories;

        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.publisher = $scope.originalObj;
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      function clearBlankFields() {
        // Filter out any blank objects from the following arrays.
        if (Array.isArray($scope.publisher.linkedContracts)) {
          $scope.publisher.linkedContracts = $scope.publisher.linkedContracts.filter((linkedContract) => linkedContract.contractId);
        }

        if (Array.isArray($scope.publisher.societies)) {
          $scope.publisher.societies = $scope.publisher.societies.filter((society) => society.society || society.identifier || society.publisherName || society.mechanicalPro || society.performancePro || society.syncPro);
        }

        if (Array.isArray($scope.publisher.publisherAgreements)) {
          $scope.publisher.publisherAgreements = $scope.publisher.publisherAgreements
            .filter((publisherAgreement) => publisherAgreement.publisherId || publisherAgreement.agreementType || publisherAgreement.territory || publisherAgreement.society || publisherAgreement.agreementNo);
        }
      }

      Settings.getContracts().then((response) => {
        $scope.contracts = response.contracts;
      });
      $scope.addContract = function () {
        $scope.publisher.linkedContracts = $scope.publisher.linkedContracts ? $scope.publisher.linkedContracts : [];
        $scope.publisher.linkedContracts.push({});
      };
      $scope.deleteContract = function (agreement) {
        const index = $scope.publisher.linkedContracts.indexOf(agreement);
        $scope.publisher.linkedContracts.splice(index, 1);
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.publisher._id) {
          Publisher.modelHistory($scope.publisher._id, (response) => {
            if (response.status === 200) {
              $scope.publisher.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.publisher));
              $('#modelHistoryModal').modal();
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };

      // Clean the work from populated fields
      function cleanPopulatedFields(object) {
        if (object.publisherAgreements && object.publisherAgreements.length) {
          object.publisherAgreements.forEach((agreement) => {
            delete agreement.publisher;
          });
        }

        if (object.linkedContracts && object.linkedContracts.length) {
          object.linkedContracts.forEach((contract) => {
            delete contract.contract;
          });
          object.linkedContracts = object.linkedContracts.filter((contract) => Object.keys(contract).length !== 0);
        }
      }
    },
  ]);
