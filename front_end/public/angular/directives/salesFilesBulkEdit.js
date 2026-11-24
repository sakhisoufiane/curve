/* eslint-disable no-return-assign */
angular.module('Curve')
  .directive('salesFilesBulkEdit', () => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/sales-files-bulk-edit.html',
    bindToController: true,
    controller($scope, $location, Loader, SalesFile, ExchangeRates, Uploader) {
      $scope.files = $scope.$parent.selectedSalesFiles;
      $scope.dateToday = new Date();
      $scope.tab = 'edit'; // "edit" | "review"
      $scope.platformTab = 'default'; // "default" | "apple"
      $scope.bulkEditData = null;
      $scope.onlyUpdateMissing = true;
      $scope.changeRows = [];
      $scope.appleFinancialFile = null;

      // Prevent future date being selected (otherwise impossible to retrieve future exchange rates)
      $scope.dateOptions = { maxDate: new Date() };

      // Fields to be updated
      $scope.newTargetPeriod = '';
      $scope.newSaleDate = '';
      $scope.newTransactionDate = '';

      // Loaders
      $scope.loadingExchangeRates = false;

      // Messages
      const cancelMessage = 'Are you sure you want to cancel? Your changes will be lost';

      const init = async () => {
        if (!Loader.getLoader()) Loader.load();
        const ids = $scope.files.map((file) => file._id);
        SalesFile.bulkEditGet(ids, (response) => {
          if (response.status === 200) {
            $scope.bulkEditData = response.data;
            Loader.complete();
          } else {
            Loader.error('Failed to retrieve Sales Files for bulk updating');
          }
        });
      };

      const getReviewData = () => {
        const rows = [];
        for (const file of $scope.files) {
          const newTargetPeriod = (
            ($scope.onlyUpdateMissing && !file.targetPeriod)
            || (!$scope.onlyUpdateMissing && file.targetPeriod !== $scope.newTargetPeriod)
          ) ? $scope.newTargetPeriod : 'No Change';
          rows.push({
            salesFileId: file._id,
            salesFileName: file.name,
            existingTargetPeriod: file.targetPeriod ?? '-',
            newTargetPeriod,
            newTransactionDate: $scope.newTransactionDate,
            newSaleDate: $scope.newSaleDate,
          });
        }
        $scope.changeRows = rows;
      };

      const changesExist = () => {
        const changedRates = $scope.bulkEditData.platform.default.exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing'].filter((exchangeRate) => exchangeRate.rate);
        const changedAppleRates = $scope.bulkEditData.platform.apple.exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing'].filter((exchangeRate) => exchangeRate.rate);
        return $scope.newTargetPeriod
          || $scope.newSaleDate
          || $scope.newTransactionDate
          || changedRates.length > 0
          || changedAppleRates.length > 0;
      };

      $scope.isFutureDate = (date) => {
        const tempDate = new Date(date);
        tempDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return tempDate > today;
      };

      const checkValidDates = () => !$scope.isFutureDate($scope.newSaleDate);

      $scope.getFileNameFromId = (salesFileId) => {
        const file = $scope.files.find((file) => file._id === salesFileId);
        return file ? file.name : salesFileId;
      };

      $scope.setTab = (tab) => {
        const changedCurrencies = ($scope.bulkEditData.platform.default.exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing']).filter((rate) => rate.rate);
        if (tab === 'review' && !$scope.newTargetPeriod && !$scope.newTransactionDate && !$scope.newSaleDate && changedCurrencies.length === 0) {
          Loader.error('No adjustments made to the selected Sales Files');
          return;
        }
        if (tab === 'review') {
          if (checkValidDates()) {
            getReviewData();
          } else {
            Loader.error('Sale Date cannot be set to a future date');
            return;
          }
        }
        $scope.tab = tab; // "edit" | "review"
      };

      // Use this when needing to check for any changes before leaving bulk edit
      $scope.cancelBulkEdit = (fromPostUpdate = false) => {
        if (!fromPostUpdate && changesExist()) {
          // eslint-disable-next-line no-alert
          if (!window.confirm(cancelMessage)) return;
        }
        $scope.finishBulkEdit(fromPostUpdate);
      };

      // Use this when not needing to check for changes before leaving bulk edit e.g. successfully updated
      $scope.finishBulkEdit = (fromPostUpdate = false) => {
        $scope.$parent.selectedSalesFiles.forEach((file) => file.selected = false);
        $scope.$parent.inBulkEdit = false;
        if (fromPostUpdate) {
          $location.search('fromUpdateSuccess', 1);
        }
      };

      const getExchangeRates = (date, platform) => {
        $scope.loadingExchangeRates = true;
        Loader.load();
        const exchangeRates = $scope.bulkEditData.platform[platform].exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing'];
        const currencyCodes = exchangeRates.map((rate) => rate.currencyCode);
        ExchangeRates.getHistorical({
          currencyCodes,
          date,
        }, (response) => {
          if (response.status === 200) {
            $scope.bulkEditData.platform[platform].exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing'].forEach((rate) => {
              const matchingCurrency = response.data.find((realRate) => realRate.currencyCode === rate.currencyCode);
              if (matchingCurrency) {
                rate.rate = matchingCurrency.rate;
              }
            });
            Loader.success(`Retrieved exchange rates for ${new Date(date).toDateString()}`);
          } else {
            Loader.error('Failed to retrieve exchange rates');
          }
          $scope.loadingExchangeRates = false;
        });
      };

      $scope.addExchangesRatesTransactionDate = (platform = 'default') => {
        getExchangeRates($scope.newTransactionDate.toISOString(), platform);
      };

      $scope.addExchangeRatesToday = (platform = 'default') => {
        getExchangeRates(new Date().toISOString(), platform);
      };

      // withAction = null | "revalidate" | "reingest"
      $scope.updateSalesFiles = async (withAction = null) => {
        Loader.load();
        const updates = {
          ids: $scope.files.map((file) => file._id),
          targetPeriod: $scope.newTargetPeriod,
          transactionDate: $scope.newTransactionDate,
          saleDate: $scope.newSaleDate,
          exchangeRates: $scope.bulkEditData.platform.default.exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing'],
          onlyUpdateMissing: $scope.onlyUpdateMissing,
          appleSpecific: {
            withFinancialFile: !!$scope.appleFinancialFile,
            ids: $scope.bulkEditData.platform.apple.salesFileIds,
          },
        };
        // Add Apple exchange rates
        if ($scope.bulkEditData.platform.apple.salesFileIds.length > 0) {
          updates.exchangeRates = updates.exchangeRates.concat($scope.bulkEditData.platform.apple.exchangeRates[$scope.onlyUpdateMissing ? 'invalid' : 'existing']);
        }
        SalesFile.bulkUpdate(updates, (res) => {
          if (res.status === 200) {
            const count = $scope.files.length;
            Loader.success(`${count} Sales File(s) successfully updated`);
            if (withAction === 'revalidate') {
              return SalesFile.bulkRevalidate(updates.ids, (revalidateResponse) => {
                if (revalidateResponse.status === 200) {
                  Loader.success(`${count} Sales File(s) revalidating...`);
                } else {
                  Loader.error('Failed to revalidate files after bulk update');
                }
                $scope.finishBulkEdit(!!withAction);
              });
            }
            if (withAction === 'reingest') {
              const appleIds = $scope.bulkEditData.platform.apple.salesFileIds;
              return SalesFile.bulkIngest(appleIds, (ingestResponse) => {
                if (ingestResponse.status === 200) Loader.success(`${count} Sales File(s) reingesting...`);
                else Loader.error('Failed to reingest files after bulk update');
                $scope.finishBulkEdit(!!withAction);
              });
            }
            $scope.finishBulkEdit(!!withAction);
          } else {
            Loader.error('Failed to bulk update Sales Files');
          }
        });
      };

      const checkForChanges = (event) => {
        if (changesExist()) {
          // eslint-disable-next-line no-alert
          if (!window.confirm(cancelMessage)) event.preventDefault();
        }
      };

      $scope.uploadFinancialFile = async () => {
        if (!$scope.appleFinancialFile || $scope.bulkEditData.platform.apple.salesFileIds.length === 0) return;
        Loader.load();
        try {
          for (const id of $scope.bulkEditData.platform.apple.salesFileIds) {
            // eslint-disable-next-line no-await-in-loop
            await Uploader.upload($scope.appleFinancialFile, `/salesFiles/${id}/get_additional_file_upload_credentials`, false);
          }
          // Re-trigger loading state as it will be stopped by the Uploader.upload calls
          Loader.load();

          // All Apple Sales Files will have the same financial file saved in the previous step, so any can be used here
          const [appleSalesFileId] = $scope.bulkEditData.platform.apple.salesFileIds;
          const appleCurrencyCodes = await new Promise((resolve, reject) => {
            SalesFile.processFinancialFile(appleSalesFileId, (res) => {
              if (res.status === 200) resolve(res.data.currencyCodes);
              else reject(new Error(res.data.message));
            });
          });

          $scope.bulkEditData.platform.apple.exchangeRates.invalid = appleCurrencyCodes.map((currencyCode) => ({
            salesFileIds: $scope.bulkEditData.platform.apple.salesFileIds,
            currencyCode,
            rate: null,
          }));
          $scope.bulkEditData.platform.apple.hasFinancialFile = true;

          Loader.success('Financial File successfully uploaded');
        } catch (err) {
          Loader.error('Error uploading Financial File');
        }
      };

      init();

      $scope.$on('$locationChangeStart', checkForChanges);

      // Check for changes on refresh (and make sure to clear when controller is no longer in use i.e. leaving the page)
      window.onbeforeunload = checkForChanges;
      $scope.$on('$destroy', () => window.onbeforeunload = null);
    },
  }));
