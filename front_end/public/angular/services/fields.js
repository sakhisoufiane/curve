angular.module('Curve')
  .factory('Fields', () => ({
    allOutputSales() {
      return [{
        field: 'salesFileId',
        header: 'Sales File ID',
        type: 'Selector',
      }, {
        field: 'contractId',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractName',
        header: 'Contract Name',
        type: 'Selector',
      }, {
        field: 'contractType',
        header: 'Contract Type',
        type: 'Selector',
      }, {
        field: 'contractForeignId',
        header: 'Contract Foreign ID',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'contractCategories',
        header: 'Contract Categories',
        type: 'Selector',
      }, {
        field: 'contractCurrency',
        header: 'Contract Currency',
        type: 'Selector',
      }, {
        field: 'contractDealType',
        header: 'Contract Deal Type',
        type: 'Selector',
      }, {
        field: 'contractProfitSharePercentage',
        header: 'Contract Profit Share %',
        type: 'Selector',
      }, {
        field: 'payeeName',
        header: 'Payee Name',
        type: 'Selector',
      }, {
        field: 'payeeForeignId',
        header: 'Payee Foreign ID',
        type: 'Selector',
      }, {
        field: 'payeeProjectId',
        header: 'Payee Project ID',
        type: 'Selector',
      }, {
        field: 'payeeCategories',
        header: 'Payee Categories',
        type: 'Selector',
      }, {
        field: 'catType',
        header: 'Catalogue Type',
        type: 'Selector',
      }, {
        field: 'source',
        header: 'Source',
        type: 'Selector',
      }, {
        field: 'subSource',
        header: 'Sub Source',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Territory',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'foreignId',
        header: 'Sales File Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'ppd',
        header: 'PPD',
        type: 'Selector',
      }, {
        field: 'perUnitRate',
        header: 'Per Unit Rate',
        type: 'Selector',
      }, {
        field: 'retailPrice',
        header: 'Retail Price',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'distributionChannel',
        header: 'Distribution Channel',
        type: 'Selector',
      }, {
        field: 'configuration',
        header: 'Configuration',
        type: 'Selector',
      }, {
        field: 'priceCategory',
        header: 'Price Category',
        type: 'Selector',
      }, {
        field: 'units',
        header: 'Units',
        type: 'Calculator',
      }, {
        field: 'grossAmount',
        header: 'Gross Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'netAmount',
        header: 'Net Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'originalCurrency',
        header: 'Original Currency',
        type: 'Selector',
      }, {
        field: 'exchangeRate',
        header: 'Exchange Rate',
        type: 'Selector',
      }, {
        field: 'homeCurrencyGrossAmount',
        header: 'Gross Amount',
        type: 'Calculator',
      }, {
        field: 'homeCurrencyNetAmount',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'calculationType',
        header: 'Calculation Type',
        type: 'Selector',
      }, {
        field: 'calculationInput',
        header: 'Calculation Input',
        type: 'Calculator',
      }, {
        field: 'objectPercentage',
        header: 'Participation Rate',
        type: 'Selector',
      }, {
        field: 'proRataAmount',
        header: 'Pro Rata',
        type: 'Calculator',
      }, {
        field: 'deductionUnitRate',
        header: 'Deduction Unit Rate',
        type: 'Selector',
      }, {
        field: 'deductionRate',
        header: 'Deduction Rate',
        type: 'Selector',
      }, {
        field: 'deduction',
        header: 'Deduction',
        type: 'Calculator',
      }, {
        field: 'mechanicalType',
        header: 'Mechanical Type',
        type: 'Selector',
      }, {
        field: 'mechanicalPercentage',
        header: 'Mechanical Percentage',
        type: 'Selector',
      }, {
        field: 'mechanicalDeductionType',
        header: 'Mechanical Deduction Type',
        type: 'Selector',
      }, {
        field: 'mechanicalPercentage',
        header: 'Mechanical Deduction Rate',
        type: 'Selector',
      }, {
        field: 'mechanicalAmount',
        header: 'Mechanical Amount',
        type: 'Selector',
      }, {
        field: 'mechanicalDeduction',
        header: 'Mechanical Deduction',
        type: 'Calculator',
      }, {
        field: 'multiplier',
        header: 'Multiplier',
        type: 'Selector',
      }, {
        field: 'reductionRate',
        header: 'Reduction Rate',
        type: 'Selector',
      }, {
        field: 'royaltyRate',
        header: 'Royalty Rate',
        type: 'Selector',
      }, {
        field: 'unitRate',
        header: 'Unit Rate',
        type: 'Selector',
      }, {
        field: 'calculationOutput',
        header: 'Net Payable',
        type: 'Calculator',
      }, {
        field: 'reserveRate',
        header: 'Reserve Rate',
        type: 'Selector',
      }, {
        field: 'reserve',
        header: 'Reserve',
        type: 'Calculator',
      }, {
        field: 'withholdingTaxRate',
        header: 'Withholding Tax Rate',
        type: 'Selector',
      }, {
        field: 'withholdingTax',
        header: 'Withholding Tax',
        type: 'Calculator',
      }, {
        field: 'saleDate',
        header: 'Sale Date',
        type: 'Selector',
      }, {
        field: 'transactionDate',
        header: 'Transaction Date',
        type: 'Selector',
      }, {
        field: 'contractCurrencyProRataAmount',
        header: 'Contract Currency Pro Rata',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyExchangeRate',
        header: 'Contract Currency Exchange Rate',
        type: 'Selector',
      }, {
        field: 'contractCurrencyGrossAmount',
        header: 'Contract Currency Gross Amount',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyNetAmount',
        header: 'Contract Currency Net Amount',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyPpd',
        header: 'Contract Currency PPD',
        type: 'Selector',
      }, {
        field: 'contractCurrencyPerUnitRate',
        header: 'Contract Currency Per Unit Rate',
        type: 'Selector',
      }, {
        field: 'contractCurrencyUnitRate',
        header: 'Contract Currency Unit Rate',
        type: 'Selector',
      }, {
        field: 'contractCurrencyRetailPrice',
        header: 'Contract Currency Retail Price',
        type: 'Selector',
      }, {
        field: 'contractCurrencyCalculationInput',
        header: 'Contract Currency Calculation Input',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyDeduction',
        header: 'Contract Currency Deduction',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyDeductionUnitRate',
        header: 'Contract Currency Deduction Unit Rate',
        type: 'Selector',
      }, {
        field: 'contractCurrencyWithholdingTax',
        header: 'Contract Currency Withholding Tax',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyMechanicalAmount',
        header: 'Contract Currency Mechanical Amount',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyMechanicalDeduction',
        header: 'Contract Currency Mechanical Deduction',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyCalculationOutput',
        header: 'Contract Currency Calculation Output',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyReserve',
        header: 'Contract Currency Reserve',
        type: 'Calculator',
      }, {
        field: 'periodName',
        header: 'Period Name',
        type: 'Selector',
      }, {
        field: 'periodId',
        header: 'Period ID',
        type: 'Selector',
      }, {
        field: 'periodYear',
        header: 'Period Year',
        type: 'Selector',
      }, {
        field: 'periodAccountingPeriod',
        header: 'Period Accounting Period',
        type: 'Selector',
      }, {
        field: 'periodAccountingPeriodType',
        header: 'Period Accounting Period Type',
        type: 'Selector',
      }, {
        field: 'periodStartDate',
        header: 'Period Start Date',
        type: 'Selector',
      }, {
        field: 'periodEndDate',
        header: 'Period End Date',
        type: 'Selector',
      }, {
        field: 'periodAccountingDate',
        header: 'Period Accounting Date',
        type: 'Selector',
      },
      {
        field: 'licenseNo',
        header: 'License Number',
        type: 'Selector',
      },
      {
        field: 'mechanicalBasisPercentage',
        header: 'Mechanical Basis Percentage',
        type: 'Selector',
      },
      {
        field: 'mechanicalRate',
        header: 'Mechanical Rate',
        type: 'Selector',
      },
      {
        field: 'share',
        header: 'Share',
        type: 'Selector',
      },
      {
        field: 'catalogueComposer',
        header: 'Composer',
        type: 'Selector',
      },
      {
        field: 'cataloguePublisher',
        header: 'Publisher',
        type: 'Selector',
      },
      {
        field: 'targetPeriod',
        header: 'Target Period',
        type: 'Selector',
      }];
    },
    allOutputSalesPayee() {
      return [{
        field: 'salesFileId',
        header: 'Sales File ID',
        type: 'Selector',
      }, {
        field: 'catalogueContractIds',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'catType',
        header: 'Catalogue Type',
        type: 'Selector',
      }, {
        field: 'source',
        header: 'Source',
        type: 'Selector',
      }, {
        field: 'subSource',
        header: 'Sub Source',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Territory',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'foreignId',
        header: 'Sales File Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'ppd',
        header: 'PPD',
        type: 'Selector',
      }, {
        field: 'perUnitRate',
        header: 'Per Unit Rate',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'distributionChannel',
        header: 'Distribution Channel',
        type: 'Selector',
      }, {
        field: 'configuration',
        header: 'Configuration',
        type: 'Selector',
      }, {
        field: 'priceCategory',
        header: 'Price Category',
        type: 'Selector',
      }, {
        field: 'units',
        header: 'Units',
        type: 'Calculator',
      }, {
        field: 'grossAmount',
        header: 'Gross Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'netAmount',
        header: 'Net Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'originalCurrency',
        header: 'Original Currency',
        type: 'Selector',
      }, {
        field: 'exchangeRate',
        header: 'Exchange Rate',
        type: 'Selector',
      }, {
        field: 'homeCurrencyGrossAmount',
        header: 'Gross Amount',
        type: 'Calculator',
      }, {
        field: 'homeCurrencyNetAmount',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'calculationType',
        header: 'Calculation Type',
        type: 'Selector',
      }, {
        field: 'calculationInput',
        header: 'Calculation Input',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyCalculationOutput',
        header: 'Contract Currency Calculation Output',
        type: 'Calculator',
      }, {
        field: 'objectPercentage',
        header: 'Participation Rate',
        type: 'Selector',
      }, {
        field: 'proRataAmount',
        header: 'Pro Rata',
        type: 'Calculator',
      }, {
        field: 'deductionUnitRate',
        header: 'Deduction Unit Rate',
        type: 'Selector',
      }, {
        field: 'deductionRate',
        header: 'Deduction Rate',
        type: 'Selector',
      }, {
        field: 'deduction',
        header: 'Deduction',
        type: 'Calculator',
      }, {
        field: 'multiplier',
        header: 'Multiplier',
        type: 'Selector',
      }, {
        field: 'reductionRate',
        header: 'Reduction Rate',
        type: 'Selector',
      }, {
        field: 'royaltyRate',
        header: 'Royalty Rate',
        type: 'Selector',
      }, {
        field: 'unitRate',
        header: 'Unit Rate',
        type: 'Selector',
      }, {
        field: 'calculationOutput',
        header: 'Net Payable',
        type: 'Calculator',
      }, {
        field: 'reserveRate',
        header: 'Reserve Rate',
        type: 'Selector',
      }, {
        field: 'reserve',
        header: 'Reserve',
        type: 'Calculator',
      }, {
        field: 'withholdingTax',
        header: 'Witholding Tax',
        type: 'Calculator',
      }, {
        field: 'saleDate',
        header: 'Sale Date',
        type: 'Selector',
      }, {
        field: 'transactionDate',
        header: 'Transaction Date',
        type: 'Selector',
      }, {
        field: 'contractName',
        header: 'Contract Name',
        type: 'Selector',
      }, {
        field: 'licenseNo',
        header: 'License Number',
        type: 'Selector',
      }, {
        field: 'catalogueComposer',
        header: 'Composer',
        type: 'Selector',
      }, {
        field: 'cataloguePublisher',
        header: 'Publisher',
        type: 'Selector',
      }, {
        field: 'mechanicalRate',
        header: 'Mechanical Rate',
        type: 'Selector',
      }, {
        field: 'share',
        header: 'Share',
        type: 'Selector',
      }, {
        field: 'mechanicalBasisPercentage',
        header: 'Mechanical Basis Percentage',
        type: 'Selector',
      }, {
        field: 'periodName',
        header: 'Period Name',
        type: 'Selector',
      }, {
        field: 'periodId',
        header: 'Period ID',
        type: 'Selector',
      }];
    },
    allInputSales() {
      return [{
        field: 'salesFileId',
        header: 'Sales File ID',
        type: 'Selector',
      }, {
        field: 'releaseId',
        header: 'Release ID',
        type: 'Selector',
      }, {
        field: 'trackId',
        header: 'Track ID',
        type: 'Selector',
      }, {
        field: 'contractId',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'catType',
        header: 'Catalogue Type',
        type: 'Selector',
      }, {
        field: 'source',
        header: 'Source',
        type: 'Selector',
      }, {
        field: 'subSource',
        header: 'Sub Source',
        type: 'Selector',
      }, {
        field: 'status',
        header: 'Status',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Territory',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'foreignId',
        header: 'Sales File Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'originalReleaseTitle',
        header: 'Original Release Title',
        type: 'Selector',
      }, {
        field: 'originalReleaseArtist',
        header: 'Original Release Artist',
        type: 'Selector',
      }, {
        field: 'ppd',
        header: 'PPD',
        type: 'Selector',
      }, {
        field: 'perUnitRate',
        header: 'Per Unit Rate',
        type: 'Selector',
      },
      {
        field: 'homeCurrencyPerUnitRate',
        header: 'Home Currency Per Unit Rate',
        type: 'Selector',
      },
      {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'originalTrackTitle',
        header: 'Original Track Title',
        type: 'Selector',
      }, {
        field: 'originalTrackArtist',
        header: 'Original Track Artist',
        type: 'Selector',
      }, {
        field: 'contractIdentifier',
        header: 'Original Contract ID',
        type: 'Selector',
      }, {
        field: 'distributionChannel',
        header: 'Distribution Channel',
        type: 'Selector',
      }, {
        field: 'configuration',
        header: 'Configuration',
        type: 'Selector',
      }, {
        field: 'priceCategory',
        header: 'Price Category',
        type: 'Selector',
      }, {
        field: 'units',
        header: 'Units',
        type: 'Calculator',
      }, {
        field: 'grossAmount',
        header: 'Gross Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'netAmount',
        header: 'Net Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'originalCurrency',
        header: 'Original Currency',
        type: 'Selector',
      }, {
        field: 'exchangeRate',
        header: 'Exchange Rate',
        type: 'Selector',
      }, {
        field: 'homeCurrencyGrossAmount',
        header: 'Gross Amount',
        type: 'Calculator',
      }, {
        field: 'homeCurrencyNetAmount',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'saleDate',
        header: 'Sale Date',
        type: 'Selector',
      }, {
        field: 'transactionDate',
        header: 'Transaction Date',
        type: 'Selector',
      }, {
        field: 'catNo',
        header: 'Original Cat No',
        type: 'Selector',
      }, {
        field: 'barcode',
        header: 'Original Barcode',
        type: 'Selector',
      }, {
        field: 'isrc',
        header: 'Original ISRC',
        type: 'Selector',
      }, {
        field: 'originalDistributionChannel',
        header: 'Original Distribution Channel',
        type: 'Selector',
      }, {
        field: 'originalConfiguration',
        header: 'Original Configuration',
        type: 'Selector',
      }, {
        field: 'originalPriceCategory',
        header: 'Original Price Category',
        type: 'Selector',
      }, {
        field: 'originalTerritory',
        header: 'Original Territory',
        type: 'Selector',
      },
      {
        field: 'retailPrice',
        header: 'Retail Price',
        type: 'Selector',
      }, {
        field: 'homeCurrencyRetailPrice',
        header: 'Home Currency Retail Price',
        type: 'Selector',
      },
      {
        field: 'targetPeriod',
        header: 'Target Period',
        type: 'Selector',
      }];
    },
    allOutputCosts() {
      return [{
        field: 'contractId',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractName',
        header: 'Contract Name',
        type: 'Selector',
      }, {
        field: 'contractType',
        header: 'Contract Type',
        type: 'Selector',
      }, {
        field: 'contractForeignId',
        header: 'Contract Foreign ID',
        type: 'Selector',
      }, {
        field: 'contractCategories',
        header: 'Contract Categories',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'costId',
        header: 'Cost ID',
        type: 'Selector',
      }, {
        field: 'type',
        header: 'Cost Type',
        type: 'Selector',
      }, {
        field: 'name',
        header: 'Cost Name',
        type: 'Selector',
      }, {
        field: 'date',
        header: 'Cost Date',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Cost Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Cost Territory',
        type: 'Selector',
      }, {
        field: 'amount',
        header: 'Cost Amount',
        type: 'Calculator',
      }, {
        field: 'invoiceNo',
        header: 'Cost Invoice Number',
        type: 'Selector',
      }, {
        field: 'objectPercentage',
        header: 'Participation Rate',
        type: 'Selector',
      }, {
        field: 'rechargeRate',
        header: 'Recharge Rate',
        type: 'Selector',
      }, {
        field: 'calculationOutput',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'periodName',
        header: 'Period Name',
        type: 'Selector',
      }, {
        field: 'periodId',
        header: 'Period ID',
        type: 'Selector',
      }, {
        field: 'periodYear',
        header: 'Period Year',
        type: 'Selector',
      }, {
        field: 'periodAccountingPeriod',
        header: 'Period Accounting Period',
        type: 'Selector',
      }, {
        field: 'periodAccountingPeriodType',
        header: 'Period Accounting Period Type',
        type: 'Selector',
      }, {
        field: 'periodStartDate',
        header: 'Period Start Date',
        type: 'Selector',
      }, {
        field: 'periodEndDate',
        header: 'Period End Date',
        type: 'Selector',
      }, {
        field: 'periodAccountingDate',
        header: 'Period Accounting Date',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'contractCurrencyCalculationOutput',
        header: 'Contract Currency Calculation Output',
        type: 'Calculator',
      }];
    },
    allInputCosts() {
      return [{
        field: '_id',
        header: 'Cost ID',
        type: 'Selector',
      }, {
        field: 'type',
        header: 'Cost Type',
        type: 'Selector',
      }, {
        field: 'name',
        header: 'Cost Name',
        type: 'Selector',
      }, {
        field: 'date',
        header: 'Cost Date',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Cost Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Cost Territory',
        type: 'Selector',
      }, {
        field: 'amount',
        header: 'Cost Amount',
        type: 'Calculator',
      }, {
        field: 'invoiceNo',
        header: 'Cost Invoice Number',
        type: 'Selector',
      }, {
        field: 'contractName',
        header: 'Contract Name',
        type: 'Selector',
      }, {
        field: 'contractType',
        header: 'Contract Type',
        type: 'Selector',
      }, {
        field: 'contractForeignId',
        header: 'Contract Foreign ID',
        type: 'Selector',
      }, {
        field: 'contractCategories',
        header: 'Contract Categories',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }];
    },
    allPublishingInputSales() {
      return [{
        field: 'salesFileId',
        header: 'Income File ID',
        type: 'Selector',
      }, {
        field: 'contractId',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractIdentifier',
        header: 'Original Contract ID',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'source',
        header: 'Source',
        type: 'Selector',
      }, {
        field: 'subSource',
        header: 'Sub Source',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Territory',
        type: 'Selector',
      }, {
        field: 'workId',
        header: 'Work ID',
        type: 'Selector',
      }, {
        field: 'catalogueWorkTitle',
        header: 'Work Title',
        type: 'Selector',
      }, {
        field: 'catalogueWorkComposer',
        header: 'Composers',
        type: 'Selector',
      }, {
        field: 'catalogueWorkForeignId',
        header: 'Work Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueWorkProjectId',
        header: 'Work Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueIdentifier',
        header: 'Work Main Identifier',
        type: 'Selector',
      }, {
        field: 'catalogueTunecode',
        header: 'Work Tunecode',
        type: 'Selector',
      }, {
        field: 'catalogueIswc',
        header: 'Work ISWC',
        type: 'Selector',
      }, {
        field: 'originalWorkTitle',
        header: 'Original Work Title',
        type: 'Selector',
      }, {
        field: 'workIsrcs',
        header: 'Work ISRCs',
        type: 'Selector',
      }, {
        field: 'workCatalogueGroups',
        header: 'Work Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'originalComposers',
        header: 'Original Composers',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'foreignId',
        header: 'Income File Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'originalReleaseTitle',
        header: 'Original Release Title',
        type: 'Selector',
      }, {
        field: 'originalReleaseArtist',
        header: 'Original Release Artist',
        type: 'Selector',
      }, {
        field: 'isrc',
        header: 'Original ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'Track ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'originalTrackTitle',
        header: 'Original Track Title',
        type: 'Selector',
      }, {
        field: 'originalTrackArtist',
        header: 'Original Track Artist',
        type: 'Selector',
      }, {
        field: 'catNo',
        header: 'Original Cat No',
        type: 'Selector',
      }, {
        field: 'barcode',
        header: 'Original Barcode',
        type: 'Selector',
      }, {
        field: 'distributionChannel',
        header: 'Channel',
        type: 'Selector',
      }, {
        field: 'configuration',
        header: 'Configuration',
        type: 'Selector',
      }, {
        field: 'units',
        header: 'Units',
        type: 'Calculator',
      }, {
        field: 'sharePercentage',
        header: 'Share Percentage',
        type: 'Selector',
      }, {
        field: 'grossAmount',
        header: 'Gross Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'netAmount',
        header: 'Net Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'originalCurrency',
        header: 'Original Currency',
        type: 'Selector',
      }, {
        field: 'exchangeRate',
        header: 'Exchange Rate',
        type: 'Selector',
      }, {
        field: 'homeCurrencyGrossAmount',
        header: 'Gross Amount',
        type: 'Calculator',
      }, {
        field: 'homeCurrencyNetAmount',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'saleDate',
        header: 'Sale Date',
        type: 'Selector',
      }, {
        field: 'transactionDate',
        header: 'Transaction Date',
        type: 'Selector',
      }, {
        field: 'originalIdentifier',
        header: 'Original Identifier',
        type: 'Selector',
      }, {
        field: 'iswc',
        header: 'Original ISWC',
        type: 'Selector',
      }, {
        field: 'tunecode',
        header: 'Original Tunecode',
        type: 'Selector',
      }, {
        field: 'originalDistributionChannel',
        header: 'Original Channel',
        type: 'Selector',
      }, {
        field: 'originalConfiguration',
        header: 'Original Configuration',
        type: 'Selector',
      }, {
        field: 'originalTerritory',
        header: 'Original Territory',
        type: 'Selector',
      }, {
        field: 'party1',
        header: 'Party 1',
        type: 'Selector',
      }, {
        field: 'party2',
        header: 'Party 2',
        type: 'Selector',
      }, {
        field: 'party3',
        header: 'Party 3',
        type: 'Selector',
      }, {
        field: 'party4',
        header: 'Party 4',
        type: 'Selector',
      }, {
        field: 'party5',
        header: 'Party 5',
        type: 'Selector',
      }, {
        field: 'episode',
        header: 'Episode',
        type: 'Selector',
      }, {
        field: 'production',
        header: 'Production',
        type: 'Selector',
      }, {
        field: 'dateFrom',
        header: 'Date From',
        type: 'Selector',
      }, {
        field: 'dateTo',
        header: 'Date To',
        type: 'Selector',
      }];
    },
    allPublishingOutputSales() {
      return [{
        field: 'salesFileId',
        header: 'Income File ID',
        type: 'Selector',
      }, {
        field: 'contractId',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractName',
        header: 'Contract Name',
        type: 'Selector',
      }, {
        field: 'contractCurrency',
        header: 'Contract Currency',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'payeeName',
        header: 'Payee Name',
        type: 'Selector',
      }, {
        field: 'payeeForeignId',
        header: 'Payee Foreign ID',
        type: 'Selector',
      }, {
        field: 'payeeProjectId',
        header: 'Payee Project ID',
        type: 'Selector',
      }, {
        field: 'payeeCategories',
        header: 'Payee Categories',
        type: 'Selector',
      }, {
        field: 'source',
        header: 'Source',
        type: 'Selector',
      }, {
        field: 'subSource',
        header: 'Sub Source',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Territory',
        type: 'Selector',
      }, {
        field: 'workId',
        header: 'Work ID',
        type: 'Selector',
      }, {
        field: 'catalogueWorkTitle',
        header: 'Work Title',
        type: 'Selector',
      }, {
        field: 'catalogueWorkComposer',
        header: 'Composers',
        type: 'Selector',
      }, {
        field: 'catalogueWorkForeignId',
        header: 'Work Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueWorkProjectId',
        header: 'Work Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueIdentifier',
        header: 'Work Main Identifier',
        type: 'Selector',
      }, {
        field: 'catalogueTunecode',
        header: 'Work Tunecode',
        type: 'Selector',
      }, {
        field: 'catalogueIswc',
        header: 'Work ISWC',
        type: 'Selector',
      }, {
        field: 'workIsrcs',
        header: 'Work ISRCs',
        type: 'Selector',
      }, {
        field: 'workCatalogueGroups',
        header: 'Work Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'foreignId',
        header: 'Income File Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'distributionChannel',
        header: 'Channel',
        type: 'Selector',
      }, {
        field: 'configuration',
        header: 'Configuration',
        type: 'Selector',
      }, {
        field: 'units',
        header: 'Units',
        type: 'Calculator',
      }, {
        field: 'sharePercentage',
        header: 'Share Percentage',
        type: 'Selector',
      }, {
        field: 'grossAmount',
        header: 'Gross Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'netAmount',
        header: 'Net Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'originalCurrency',
        header: 'Original Currency',
        type: 'Selector',
      }, {
        field: 'exchangeRate',
        header: 'Exchange Rate',
        type: 'Selector',
      }, {
        field: 'homeCurrencyGrossAmount',
        header: 'Gross Amount',
        type: 'Calculator',
      }, {
        field: 'homeCurrencyNetAmount',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'calculationType',
        header: 'Calculation Type',
        type: 'Selector',
      }, {
        field: 'calculationInput',
        header: 'Calculation Input',
        type: 'Calculator',
      }, {
        field: 'objectPercentage',
        header: 'Participation Rate',
        type: 'Selector',
      }, {
        field: 'proRataAmount',
        header: 'Pro Rata',
        type: 'Calculator',
      }, {
        field: 'multiplier',
        header: 'Multiplier',
        type: 'Selector',
      }, {
        field: 'reductionRate',
        header: 'Reduction Rate',
        type: 'Selector',
      }, {
        field: 'royaltyRate',
        header: 'Royalty Rate',
        type: 'Selector',
      }, {
        field: 'unitRate',
        header: 'Unit Rate',
        type: 'Selector',
      }, {
        field: 'calculationOutput',
        header: 'Net Payable',
        type: 'Calculator',
      }, {
        field: 'saleDate',
        header: 'Sale Date',
        type: 'Selector',
      }, {
        field: 'transactionDate',
        header: 'Transaction Date',
        type: 'Selector',
      }, {
        field: 'dateFrom',
        header: 'Date From',
        type: 'Selector',
      }, {
        field: 'dateTo',
        header: 'Date To',
        type: 'Selector',
      }, {
        field: 'contractCurrencyProRataAmount',
        header: 'Contract Currency Pro Rata',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyExchangeRate',
        header: 'Contract Currency Exchange Rate',
        type: 'Selector',
      }, {
        field: 'contractCurrencyGrossAmount',
        header: 'Contract Currency Gross Amount',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyNetAmount',
        header: 'Contract Currency Net Amount',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyCalculationInput',
        header: 'Contract Currency Calculation Input',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyDeduction',
        header: 'Contract Currency Deduction',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyDeductionUnitRate',
        header: 'Contract Currency Deduction Unit Rate',
        type: 'Selector',
      }, {
        field: 'contractCurrencyWithholdingTax',
        header: 'Contract Currency Withholding Tax',
        type: 'Calculator',
      }, {
        field: 'contractCurrencyCalculationOutput',
        header: 'Contract Currency Calculation Output',
        type: 'Calculator',
      }, {
        field: 'periodName',
        header: 'Period Name',
        type: 'Selector',
      }, {
        field: 'periodId',
        header: 'Period ID',
        type: 'Selector',
      }, {
        field: 'periodYear',
        header: 'Period Year',
        type: 'Selector',
      }, {
        field: 'periodAccountingPeriod',
        header: 'Period Accounting Period',
        type: 'Selector',
      }, {
        field: 'periodAccountingPeriodType',
        header: 'Period Accounting Period Type',
        type: 'Selector',
      }, {
        field: 'periodStartDate',
        header: 'Period Start Date',
        type: 'Selector',
      }, {
        field: 'periodEndDate',
        header: 'Period End Date',
        type: 'Selector',
      }, {
        field: 'periodAccountingDate',
        header: 'Period Accounting Date',
        type: 'Selector',
      }, {
        field: 'episode',
        header: 'Episode',
        type: 'Selector',
      }, {
        field: 'production',
        header: 'Production',
        type: 'Selector',
      }];
    },
    allPublishingOutputSalesPayee() {
      return [{
        field: 'salesFileId',
        header: 'Income File ID',
        type: 'Selector',
      }, {
        field: 'catalogueContractIds',
        header: 'Contract ID',
        type: 'Selector',
      }, {
        field: 'contractProjectId',
        header: 'Contract Project ID',
        type: 'Selector',
      }, {
        field: 'source',
        header: 'Source',
        type: 'Selector',
      }, {
        field: 'subSource',
        header: 'Sub Source',
        type: 'Selector',
      }, {
        field: 'description',
        header: 'Description',
        type: 'Selector',
      }, {
        field: 'territory',
        header: 'Territory',
        type: 'Selector',
      }, {
        field: 'workId',
        header: 'Work ID',
        type: 'Selector',
      }, {
        field: 'catalogueWorkTitle',
        header: 'Work Title',
        type: 'Selector',
      }, {
        field: 'catalogueWorkComposer',
        header: 'Composers',
        type: 'Selector',
      }, {
        field: 'catalogueWorkForeignId',
        header: 'Work Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueWorkProjectId',
        header: 'Work Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueIdentifier',
        header: 'Work Main Identifier',
        type: 'Selector',
      }, {
        field: 'catalogueTunecode',
        header: 'Work Tunecode',
        type: 'Selector',
      }, {
        field: 'catalogueIswc',
        header: 'Work ISWC',
        type: 'Selector',
      }, {
        field: 'workCatalogueGroups',
        header: 'Work Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'catalogueBarcode',
        header: 'Barcode',
        type: 'Selector',
      }, {
        field: 'catalogueCatNo',
        header: 'Cat No',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseForeignId',
        header: 'Release Foreign ID',
        type: 'Selector',
      }, {
        field: 'foreignId',
        header: 'Income File Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseProjectId',
        header: 'Release Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseTitle',
        header: 'Release Title',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseVersion',
        header: 'Release Version',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseArtist',
        header: 'Release Artist',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseLabel',
        header: 'Release Label',
        type: 'Selector',
      }, {
        field: 'catalogueReleaseDate',
        header: 'Release Date',
        type: 'Selector',
      }, {
        field: 'releaseCatalogueGroups',
        header: 'Release Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'catalogueIsrc',
        header: 'ISRC',
        type: 'Selector',
      }, {
        field: 'catalogueTrackForeignId',
        header: 'Track Foreign ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackProjectId',
        header: 'Track Project ID',
        type: 'Selector',
      }, {
        field: 'catalogueTrackTitle',
        header: 'Track Title',
        type: 'Selector',
      }, {
        field: 'catalogueTrackVersion',
        header: 'Track Version',
        type: 'Selector',
      }, {
        field: 'catalogueTrackArtist',
        header: 'Track Artist',
        type: 'Selector',
      }, {
        field: 'catalogueTrackLabel',
        header: 'Track Label',
        type: 'Selector',
      }, {
        field: 'trackCatalogueGroups',
        header: 'Track Catalogue Groups',
        type: 'Selector',
      }, {
        field: 'distributionChannel',
        header: 'Channel',
        type: 'Selector',
      }, {
        field: 'configuration',
        header: 'Configuration',
        type: 'Selector',
      }, {
        field: 'units',
        header: 'Units',
        type: 'Calculator',
      }, {
        field: 'grossAmount',
        header: 'Gross Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'netAmount',
        header: 'Net Amount in Currency',
        type: 'Calculator',
      }, {
        field: 'originalCurrency',
        header: 'Original Currency',
        type: 'Selector',
      }, {
        field: 'exchangeRate',
        header: 'Exchange Rate',
        type: 'Selector',
      }, {
        field: 'homeCurrencyGrossAmount',
        header: 'Gross Amount',
        type: 'Calculator',
      }, {
        field: 'homeCurrencyNetAmount',
        header: 'Net Amount',
        type: 'Calculator',
      }, {
        field: 'calculationType',
        header: 'Calculation Type',
        type: 'Selector',
      }, {
        field: 'calculationInput',
        header: 'Calculation Input',
        type: 'Calculator',
      }, {
        field: 'objectPercentage',
        header: 'Participation Rate',
        type: 'Selector',
      }, {
        field: 'royaltyRate',
        header: 'Royalty Rate',
        type: 'Selector',
      }, {
        field: 'unitRate',
        header: 'Unit Rate',
        type: 'Selector',
      }, {
        field: 'calculationOutput',
        header: 'Net Payable',
        type: 'Calculator',
      }, {
        field: 'saleDate',
        header: 'Sale Date',
        type: 'Selector',
      }, {
        field: 'transactionDate',
        header: 'Transaction Date',
        type: 'Selector',
      }, {
        field: 'dateFrom',
        header: 'Date From',
        type: 'Selector',
      }, {
        field: 'dateTo',
        header: 'Date To',
        type: 'Selector',
      }, {
        field: 'episode',
        header: 'Episode',
        type: 'Selector',
      }, {
        field: 'production',
        header: 'Production',
        type: 'Selector',
      }];
    },
  }));
