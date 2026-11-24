angular.module('Curve')
  .controller('libraryTemplateEditController', ['$scope', '$routeParams', '$window', 'Session', 'LibraryTemplate', 'Notification', 'Settings', 'Territories', 'Currencies', 'Uploader', 'TemplateFields', 'TemplateTypes', 'Loader', 'Pros', function ($scope, $routeParams, $window, Session, LibraryTemplate, Notification, Settings, Territories, Currencies, Uploader, TemplateFields, TemplateTypes, Loader, Pros) {
    const controller = this;
    $window.scrollTo(0, 0);
    $scope.clientType = Session.clientType;
    // Give all fields
    $scope.templateFields = [].concat(TemplateFields.recordings, TemplateFields.publishing).filter((value, index, self) => self.indexOf(value) === index);
    $scope.templateTypes = TemplateTypes;
    $scope.targetCellFields = TemplateFields.targetCellFields;
    $scope.targetCellTypes = TemplateTypes;
    $scope.libraryTemplate = { overwriteFields: {}, territories: [], distributionChannels: [], configurations: [], priceCategories: [], positiveNegatives: [], subSources: [], overwriteFieldTargetCells: [] };
    $scope.libraryTemplate.fields = [];
    $scope.libraryTemplate.exampleLines = [];
    $scope.saleDatePopup = false;
    $scope.transactionDatePopup = false;
    $scope.territories = Territories;
    $scope.currencies = Currencies;
    $scope.pros = Pros;
    $scope.encodings = [{ name: 'UTF-8', encoding: 'utf8' }, { name: 'UTF-16', encoding: 'utf16le' }];
    $scope.sourcesInput = 'Select';
    if ($scope.pros.indexOf('Other') === -1) { $scope.pros.push('Other'); }
    $scope.fileTypes = [{ name: 'Standard', display: 'Excel/CSV' }, { name: 'Character', display: 'PRO' }, { name: 'CRD', display: 'CRD' }, { name: 'Apple Music', display: 'Apple Music' }, { name: 'iTunes', display: 'iTunes' }, { name: 'iTunes Match', display: 'iTunes Match' }, { name: 'Beats', display: 'Beats' }, { name: 'Apple DJ', display: 'Apple DJ' }, { name: 'Facebook', display: 'Facebook' }];
    $scope.originalObj = JSON.parse(angular.toJson($scope.libraryTemplate));

    this.loadTemplate = function () {
      Loader.load();
      LibraryTemplate.get($routeParams.id, (response) => {
        if (response.status === 200) {
          $scope.libraryTemplate = response.data;
          $scope.originalObj = JSON.parse(angular.toJson($scope.libraryTemplate));
          Loader.complete();
        } else {
          Loader.error('Error loading template, please try again or contact support');
        }
      });
    };

    // Load Template if ID exists
    if ($routeParams.id) {
      controller.loadTemplate();
    }

    Settings.getSettings()
      .then((settings) => {
        angular.extend($scope, settings);
      });

    $scope.groupFind = function (territory) {
      return territory.continent;
    };
    $scope.openSaleDatePopup = function () {
      $scope.saleDatePopup = true;
    };
    $scope.openTransactionDatePopup = function () {
      $scope.transactionDatePopup = true;
    };

    $scope.$watch('libraryTemplate.source', (source) => {
      if (source === 'Other' && $scope.sourcesInput === 'Select') {
        $scope.sourcesInput = 'Text';
        $scope.libraryTemplate.source = '';
      } else if ($scope.libraryTemplate.source && !$scope.pros.includes($scope.libraryTemplate.source)) {
        $scope.sourcesInput = 'Text';
      }
    });

    $scope.$watch('libraryTemplate.overwriteFieldTargetCells', (newField, oldField) => {
      if ($scope.libraryTemplate) {
        for (let i = 0; i < newField.length; i += 1) {
          // Fix any null values
          if (newField[i] === null) { newField[i] = { field: null, type: null }; }
          // Set any values
          if (newField[i] && oldField[i] && newField[i].field !== oldField[i].field) {
            if (['source', 'subSource', 'originalDistributionChannel', 'originalConfiguration', 'originalPriceCategory', 'originalCurrency', 'originalTerritory'].indexOf(newField[i].field) !== -1) {
              $scope.libraryTemplate.overwriteFieldTargetCells[i].type = 'String';
            } else if (['saleDate', 'transactionDate'].indexOf(newField[i].field) !== -1) {
              $scope.libraryTemplate.overwriteFieldTargetCells[i].type = 'Date';
            } else if (['multiplier', 'proRataAmount'].indexOf(newField[i].field) !== -1) {
              $scope.libraryTemplate.overwriteFieldTargetCells[i].type = 'Number';
            }
          }
        }
      }
      updateIncludesFields();
    }, true);
    $scope.addTargetCell = function () {
      $scope.libraryTemplate.overwriteFieldTargetCells.push({});
    };
    $scope.deleteTargetCell = function (targetCell) {
      const index = $scope.libraryTemplate.overwriteFieldTargetCells.indexOf(targetCell);
      $scope.libraryTemplate.overwriteFieldTargetCells.splice(index, 1);
    };

    // Calculations
    $scope.dirOptions = {};

    $scope.$watch('libraryTemplate.calculation', (calculations) => {
      $scope.displayCalculations = [];
      angular.forEach(calculations, (calculation) => {
        const innerCalculations = calculation.calculation ? calculation.calculation.calculations : [];
        $scope.displayCalculations.push({
          calculationType: calculation.calculationType,
          conditionType: calculation.conditionType,
          conditions: calculation.conditions,
          calculation: calculation.calculation,
          calculations: innerCalculations,
          outputField: calculation.outputField,
          notes: calculation.notes,
          dateFormat: calculation.dateFormat,
          calculateAfterMapping: calculation.calculateAfterMapping,
        });
      });
    });
    $scope.addCalculation = function () {
      $scope.displayCalculations.push({ displayOutputFields: [], displayConditions: [] });
    };
    $scope.deleteCalculation = function (calculation) {
      const index = $scope.displayCalculations.indexOf(calculation);
      $scope.displayCalculations.splice(index, 1);
    };

    function updateCalculations(callback) {
      $scope.libraryTemplate.calculation = [];
      if ($scope.displayCalculations.length > 0) {
        angular.forEach($scope.displayCalculations, (result) => {
          updateConditions(result, () => {
            updateOutputFields(result, () => {
              $scope.libraryTemplate.calculation.push({
                calculationType: result.calculationType,
                conditionType: result.conditionType,
                conditions: result.conditions,
                calculation: result.calculation,
                outputField: result.outputField,
                notes: result.notes,
                dateFormat: result.dateFormat,
                calculateAfterMapping: result.calculateAfterMapping,
              });
              if ($scope.libraryTemplate.calculation.length === $scope.displayCalculations.length) {
                if (callback) { callback(); }
              }
            });
          });
        });
      } else if (callback) { callback(); }
    }

    function updateConditions(calculation, callback) {
      if (calculation) {
        calculation.conditions = [];
        if (calculation.displayConditions.length > 0) {
          angular.forEach(calculation.displayConditions, (condition) => {
            calculation.conditions.push({
              inputType: condition.inputType,
              if: condition.if,
              comparison: condition.comparison,
              value: condition.value,
            });
            if (calculation.conditions.length === calculation.displayConditions.length) {
              if (callback) {
                callback();
              }
            }
          });
        } else if (callback) {
          callback();
        }
      } else {
        callback();
      }
    }

    function updateOutputFields(calculation, callback) {
      if (calculation) {
        calculation.calculation = { valueType: calculation.calculation.valueType, value: calculation.calculation.value, function: 'Equals', calculations: [] };
        if (calculation.displayOutputFields.length > 0) {
          angular.forEach(calculation.displayOutputFields, (outputField) => {
            calculation.calculation.calculations.push({
              function: outputField.function,
              valueType: outputField.valueType,
              value: outputField.value,
            });
            if (calculation.calculation.calculations.length === calculation.displayOutputFields.length) {
              if (callback) {
                callback();
              }
            }
          });
        } else if (callback) {
          callback();
        }
      } else {
        callback();
      }
    }

    $scope.$watch('libraryTemplate.territories', (territories) => {
      $scope.displayTerritories = [];
      angular.forEach(territories, (territory) => {
        $scope.displayTerritories.push({ name: territory.name, map: territory.map });
      });
    });
    $scope.addTerritory = function () {
      $scope.displayTerritories.push('');
      updateTerritories();
    };
    $scope.deleteTerritory = function (territory) {
      const index = $scope.displayTerritories.indexOf(territory);
      $scope.displayTerritories.splice(index, 1);
    };

    function updateTerritories(callback) {
      $scope.libraryTemplate.territories = [];
      if ($scope.displayTerritories.length > 0) {
        angular.forEach($scope.displayTerritories, (territory) => {
          $scope.libraryTemplate.territories.push({ name: territory.name, map: territory.map });
          if ($scope.libraryTemplate.territories.length === $scope.displayTerritories.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.distributionChannels', (distributionChannels) => {
      $scope.displayDistributionChannels = [];
      angular.forEach(distributionChannels, (channel) => {
        $scope.displayDistributionChannels.push({ name: channel.name, map: channel.map });
      });
    });
    $scope.addDistributionChannel = function () {
      $scope.displayDistributionChannels.push('');
      updateDistributionhannels();
    };
    $scope.deleteDistributionChannel = function (channel) {
      const index = $scope.displayDistributionChannels.indexOf(channel);
      $scope.displayDistributionChannels.splice(index, 1);
    };

    function updateDistributionhannels(callback) {
      $scope.libraryTemplate.distributionChannels = [];
      if ($scope.displayDistributionChannels.length > 0) {
        angular.forEach($scope.displayDistributionChannels, (channel) => {
          $scope.libraryTemplate.distributionChannels.push({ name: channel.name, map: channel.map });
          if ($scope.libraryTemplate.distributionChannels.length === $scope.displayDistributionChannels.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.configurations', (configurations) => {
      $scope.displayConfigurations = [];
      angular.forEach(configurations, (configuration) => {
        $scope.displayConfigurations.push({ name: configuration.name, map: configuration.map });
      });
    });
    $scope.addConfiguration = function () {
      $scope.displayConfigurations.push('');
      updateConfigurations();
    };
    $scope.deleteConfiguration = function (configuration) {
      const index = $scope.displayConfigurations.indexOf(configuration);
      $scope.displayConfigurations.splice(index, 1);
    };

    function updateConfigurations(callback) {
      $scope.libraryTemplate.configurations = [];
      if ($scope.displayConfigurations.length > 0) {
        angular.forEach($scope.displayConfigurations, (configuration) => {
          $scope.libraryTemplate.configurations.push({ name: configuration.name, map: configuration.map });
          if ($scope.libraryTemplate.configurations.length === $scope.displayConfigurations.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.sources', (sources) => {
      $scope.displaySources = [];
      angular.forEach(sources, (source) => {
        $scope.displaySources.push({ name: source.name, map: source.map });
      });
    });
    $scope.addSource = function () {
      $scope.displaySources.push('');
      updateSources();
    };
    $scope.deleteSource = function (source) {
      const index = $scope.displaySources.indexOf(source);
      $scope.displaySources.splice(index, 1);
    };

    function updateSources(callback) {
      $scope.libraryTemplate.sources = [];
      if ($scope.displaySources.length > 0) {
        angular.forEach($scope.displaySources, (source) => {
          $scope.libraryTemplate.sources.push({ name: source.name, map: source.map });
          if ($scope.libraryTemplate.sources.length === $scope.displaySources.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.subSources', (subSources) => {
      $scope.displaySubSources = [];
      angular.forEach(subSources, (subSource) => {
        $scope.displaySubSources.push({ name: subSource.name, map: subSource.map });
      });
    });
    $scope.addSubSource = function () {
      $scope.displaySubSources.push('');
      updateSubSources();
    };
    $scope.deleteSubSource = function (subSource) {
      const index = $scope.displaySubSources.indexOf(subSource);
      $scope.displaySubSources.splice(index, 1);
    };

    function updateSubSources(callback) {
      $scope.libraryTemplate.subSources = [];
      if ($scope.displaySubSources.length > 0) {
        angular.forEach($scope.displaySubSources, (subSource) => {
          $scope.libraryTemplate.subSources.push({ name: subSource.name, map: subSource.map });
          if ($scope.libraryTemplate.subSources.length === $scope.displaySubSources.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.priceCategories', (priceCategories) => {
      $scope.displayPriceCategories = [];
      angular.forEach(priceCategories, (category) => {
        $scope.displayPriceCategories.push({ name: category.name, map: category.map });
      });
    });
    $scope.addPriceCategory = function () {
      $scope.displayPriceCategories.push('');
      updatePriceCategories();
    };
    $scope.deletePriceCategory = function (category) {
      const index = $scope.displayPriceCategories.indexOf(category);
      $scope.displayPriceCategories.splice(index, 1);
    };

    function updatePriceCategories(callback) {
      $scope.libraryTemplate.priceCategories = [];
      if ($scope.displayPriceCategories.length > 0) {
        angular.forEach($scope.displayPriceCategories, (category) => {
          $scope.libraryTemplate.priceCategories.push({ name: category.name, map: category.map });
          if ($scope.libraryTemplate.priceCategories.length === $scope.displayPriceCategories.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.currencies', (currencies) => {
      $scope.displayCurrencies = [];
      angular.forEach(currencies, (currency) => {
        $scope.displayCurrencies.push({ name: currency.name, map: currency.map });
      });
    });
    $scope.addCurrency = function () {
      $scope.displayCurrencies.push('');
      updateCurrencies();
    };
    $scope.deleteCurrency = function (currency) {
      const index = $scope.displayCurrencies.indexOf(currency);
      $scope.displayCurrencies.splice(index, 1);
    };

    function updateCurrencies(callback) {
      $scope.libraryTemplate.currencies = [];
      if ($scope.displayCurrencies.length > 0) {
        angular.forEach($scope.displayCurrencies, (currency) => {
          $scope.libraryTemplate.currencies.push({ name: currency.name, map: currency.map });
          if ($scope.libraryTemplate.currencies.length === $scope.displayCurrencies.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.copyFields', (copyFields) => {
      $scope.displayCopyFields = [];
      angular.forEach(copyFields, (copyField) => {
        $scope.displayCopyFields.push({ from: copyField.from, to: copyField.to });
      });
    });
    $scope.addCopyField = function () {
      $scope.displayCopyFields.push('');
      updateCopyFields();
    };
    $scope.deleteCopyField = function (copyField) {
      const index = $scope.displayCopyFields.indexOf(copyField);
      $scope.displayCopyFields.splice(index, 1);
    };

    function updateCopyFields(callback) {
      $scope.libraryTemplate.copyFields = [];
      if ($scope.displayCopyFields.length > 0) {
        angular.forEach($scope.displayCopyFields, (copyField) => {
          $scope.libraryTemplate.copyFields.push({ from: copyField.from, to: copyField.to });
          if ($scope.libraryTemplate.copyFields.length === $scope.displayCopyFields.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    $scope.$watch('libraryTemplate.positiveNegatives', (positiveNegatives) => {
      $scope.displayPositiveNegatives = [];
      angular.forEach(positiveNegatives, (category) => {
        $scope.displayPositiveNegatives.push({ name: category.name, map: category.map });
      });
    });
    $scope.addPositiveNegative = function () {
      $scope.displayPositiveNegatives.push('');
      updatePositiveNegatives();
    };
    $scope.deletePositiveNegative = function (category) {
      const index = $scope.displayPositiveNegatives.indexOf(category);
      $scope.displayPositiveNegatives.splice(index, 1);
    };

    function updatePositiveNegatives(callback) {
      $scope.libraryTemplate.positiveNegatives = [];
      if ($scope.displayPositiveNegatives.length > 0) {
        angular.forEach($scope.displayPositiveNegatives, (category) => {
          $scope.libraryTemplate.positiveNegatives.push({ name: category.name, map: category.map });
          if ($scope.libraryTemplate.positiveNegatives.length === $scope.displayPositiveNegatives.length) {
            if (callback) { callback(); }
          }
        });
      } else if (callback) { callback(); }
    }

    // Required Fields
    $scope.includesTerritory = false;
    $scope.includesDistributionChannel = false;
    $scope.includesConfiguration = false;
    $scope.includesPriceCategory = false;
    $scope.includesCurrency = false;
    $scope.includesSource = false;
    $scope.includesUnits = false;
    $scope.includesNetAmount = false;
    $scope.includesSaleDate = false;
    $scope.includesTransactionDate = false;

    function updateIncludesFields() {
      $scope.includesTerritory = checkFieldsOverwriteOrTargetCell('originalTerritory');
      $scope.includesDistributionChannel = checkFieldsOverwriteOrTargetCell('originalDistributionChannel');
      $scope.includesConfiguration = checkFieldsOverwriteOrTargetCell('originalConfiguration');
      $scope.includesPriceCategory = checkFieldsOverwriteOrTargetCell('originalPriceCategory');
      $scope.includesCurrency = checkFieldsOverwriteOrTargetCell('originalCurrency');
      $scope.includesSource = checkFieldsOverwriteOrTargetCell('source');
      $scope.includesUnits = checkFieldsOverwriteOrTargetCell('units');
      $scope.includesNetAmount = checkFieldsOverwriteOrTargetCell('netAmount');
      $scope.includesSaleDate = checkFieldsOverwriteOrTargetCell('saleDate');
      $scope.includesTransactionDate = checkFieldsOverwriteOrTargetCell('transactionDate');
    }
    function checkFieldsOverwriteOrTargetCell(field) {
      const value = $scope.libraryTemplate.overwriteFields[field];
      const fields = $scope.libraryTemplate.fields.map((val) => (val ? val.field : null));
      const matchedTargetCells = $scope.libraryTemplate.overwriteFieldTargetCells.filter((targetCell) => {
        if (targetCell.field && targetCell.field === field && targetCell.cell) return true;
      });
      if (field && fields.indexOf(field) !== -1) {
        return true;
      } if (matchedTargetCells.length > 0 || value) {
        return true;
      }
      return false;
    }

    $scope.$watch('libraryTemplate.overwriteFields', updateIncludesFields, true);
    $scope.$watch('libraryTemplate.fields', updateIncludesFields, true);

    $scope.$watch('libraryTemplate.fields', (newField, oldField) => {
      if ($scope.libraryTemplate) {
        for (let i = 0; i < newField.length; i += 1) {
          // Fix any null values
          if (newField[i] === null) { newField[i] = { field: null, type: null }; }
          // Set any values
          if (newField[i] && oldField[i] && newField[i].field !== oldField[i].field) {
            if (newField[i].field === 'ignore') {
              $scope.libraryTemplate.fields[i].type = 'ignore';
            } else if (['originalDistributionChannel', 'originalConfiguration', 'originalPriceCategory', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'catNo', 'barcode', 'isrc', 'originalIdentifier', 'originalTerritory', 'source', 'subSource', 'originalCurrency', 'iswc', 'tunecode', 'songCode', 'positiveNegative'].indexOf(newField[i].field) !== -1) {
              $scope.libraryTemplate.fields[i].type = 'String';
            } else if (['saleDate', 'transactionDate'].indexOf(newField[i].field) !== -1) {
              $scope.libraryTemplate.fields[i].type = 'Date';
            } else if (['units', 'salePrice', 'exchangeRate', 'grossAmount', 'netAmount', 'perUnitRate', 'duration', 'sharePercentage', 'returnGrossAmount', 'returnNetAmount', 'returnUnits'].indexOf(newField[i].field) !== -1) {
              $scope.libraryTemplate.fields[i].type = 'Number';
            }
          }
        }
        if ($scope.libraryTemplate.fileType === 'Character') { textToColumns(); }
      }
    }, true);
    function textToColumns() {
      const columnCharacters = $scope.libraryTemplate.fields.map((field) => field.characters);
      $scope.libraryTemplate.exampleLines = $scope.libraryTemplate.exampleLines.map((line) => {
        line = line.join('').replace(/ /g, '_');
        const output = [];
        columnCharacters.forEach((character) => {
          character = character || 0;
          output.push(line.slice(0, character));
          line = line.substring(character);
        });
        output.push(line);
        return output;
      });
    }
    function upload(file, callback) {
      // only upload the file if it is larger than 50MB or if the file size is unknown
      if (file && (!file.size || file.size < 50000000)) {
        Uploader.upload(file, `/libraryTemplates/${$scope.libraryTemplate._id}/get_upload_credentials`).then((response) => {
          callback(null, response);
        });
      } else {
        callback('Please upload a smaller version of the file with a small sample of the data (max. 50MB)');
      }
    }

    $scope.addField = function () {
      $scope.libraryTemplate.fields.push({});
    };

    $scope.deleteField = function (field) {
      const index = $scope.libraryTemplate.fields.indexOf(field);
      $scope.libraryTemplate.fields.splice(index, 1);
    };
    // Tabs
    $scope.activeTab = 'overview';
    $scope.setTab = function (value) {
      $scope.activeTab = value;
    };
    $scope.selectFile = function (file) {
      $scope.file = file;
    };
    this.save = function () {
      Loader.load();
      updateTerritories();
      updatePriceCategories();
      updateCopyFields();
      updateConfigurations();
      updateDistributionhannels();
      updatePositiveNegatives();
      updateSources();
      updateSubSources();
      updateCurrencies();
      validateSetup();
      updateCalculations(() => {
        if ($scope.setupErrors && $scope.setupErrors.length === 0) {
          if (!$scope.libraryTemplate._id) {
            LibraryTemplate.create($scope.libraryTemplate, (response) => {
              if (response.status === 200) {
                $scope.libraryTemplate = response.data;
                $scope.originalObj = JSON.parse(angular.toJson($scope.libraryTemplate));
                if ($scope.file) {
                  upload($scope.file, (err) => {
                    $scope.originalObj = JSON.parse(angular.toJson($scope.libraryTemplate));
                    if (err) {
                      Loader.error(err);
                    } else {
                      Loader.success('Template successfully created');
                    }
                    $window.location.href = `#/libraryTemplates/${response.data._id}/edit`;
                  });
                } else {
                  Loader.success('Template successfully created');
                  $window.location.href = `#/libraryTemplates/${response.data._id}/edit`;
                }
              } else {
                Loader.error('Error creating template, please try again or contact support');
              }
            });
          } else {
            LibraryTemplate.update($scope.libraryTemplate._id, $scope.libraryTemplate, (response) => {
              if (response.status === 200) {
                if ($scope.file) {
                  upload($scope.file, (err) => {
                    controller.loadTemplate();
                    $scope.originalObj = JSON.parse(angular.toJson($scope.libraryTemplate));
                    // Remove file upload
                    $('#fileUploadField').val(null);
                    $scope.file = null;
                    if (err) {
                      Loader.error(err);
                    } else {
                      Loader.success('Template successfully saved');
                    }
                  });
                } else {
                  controller.loadTemplate();
                  $scope.originalObj = JSON.parse(angular.toJson($scope.libraryTemplate));
                  Loader.success('Template successfully saved');
                }
              } else {
                Loader.error('Error saving template, please try again or contact support');
              }
            });
          }
        } else {
          Loader.error('Could save your template, as fields were missing');
        }
      });
    };
    $scope.save = controller.save;

    $scope.togglePublish = function () {
      $scope.libraryTemplate.published = !$scope.libraryTemplate.published;
      controller.save();
    };

    $scope.delete = function () {
      $('#deleteModal').modal('hide');
      $('#deleteModal').on('hidden.bs.modal', () => {
        LibraryTemplate.delete($scope.libraryTemplate._id, (response) => {
          if (response.status === 200) {
            Loader.success('Template successfully deleted');
            $window.location.href = '#/libraryTemplates';
          } else {
            Loader.error('Error deleting template, please try again or contact support');
          }
        });
      });
    };

    $scope.removeIdentifier = function (identifier) {
      const index = $scope.libraryTemplate.identification.indexOf(identifier);
      $scope.libraryTemplate.identification.splice(index, 1);
    };

    function validateSetup() {
      $scope.setupErrors = [];
      if (!$scope.libraryTemplate.name) { $scope.setupErrors.push('Template is required to have a name'); }
      if (!$scope.libraryTemplate.source) { $scope.setupErrors.push('Template is required to have a source'); }
      if (!$scope.libraryTemplate.tab) { $scope.setupErrors.push('Template is required to have a tab'); }
      if (!$scope.libraryTemplate.headerRow) { $scope.setupErrors.push('Template is required to have a header row'); }
      if (!$scope.libraryTemplate.startingLine) { $scope.setupErrors.push('Template is required to have a starting row'); }

      // Validate overwrite field target cells
      const incompleteTargetCells = $scope.libraryTemplate.overwriteFieldTargetCells?.filter((cell) => cell && (!cell.field || !cell.cell || !cell.type));
      if (incompleteTargetCells && incompleteTargetCells.length > 0) {
        $scope.setupErrors.push('All Overwrite Field Target Cells must have Field, Cell Reference, and Type filled out');
      }
    }

    $scope.$on('$locationChangeStart', checkForUnsavedChanges);
    window.onbeforeunload = checkForUnsavedChanges;

    function checkForUnsavedChanges(event) {
      const current = JSON.parse(angular.toJson($scope.libraryTemplate));

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
          $scope.libraryTemplate = $scope.originalObj;
        }
      }
    }

    $scope.modelHistory = function () {
      Loader.load();
      if ($scope.libraryTemplate._id) {
        LibraryTemplate.modelHistory($scope.libraryTemplate._id, (response) => {
          if (response.status === 200) {
            $scope.libraryTemplate.modelHistory = response.data.modelHistory;
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
  }]);
