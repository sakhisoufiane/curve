// Created by Jesli 
// July 06, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression contracts tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.wait(2000);
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.wait(2000);
    // cy.login_dev();  
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })
  it('C1715 Validate Contract on Sidebar', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
  });
  it('C1716 Validate Contract Page Content', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Page Content Validation
    C.ContractSearchBarValidate()
    C.ContractDeleteButtonValidate()
    C.ContractCreateButtonValidate()
    C.ContractExportButtonValidate()
    C.ContractsImportContractsButtonValidate()
    C.ContractsImportTransactionsValidate()
    C.ContractsExportTransactionsValidate()
    C.ContractsFilterValidate('Filter')
    C.ContractsCompleteDDownClick()
    C.ContractsCompleteDdownSelValidate()
    C.ContractsCompleteDdownSelIcompleteValidate()
    C.ContractsCompanyValidate()
    C.ContractsCategoryValidate()
    C.ContractsTableValidate('Name')
    C.ContractsTableValidate('Type')
    C.ContractsTableValidate('Categories')
    C.ContractsTableValidate('Created')
    C.ContractsTableValidate('Status')
    C.ContractsTotalValidate()
    C.ContractsCheckBValidate()
    C.ContractsIndexShowingPerPageValidate()
    C.ContractsIndexShowAllValidate()
    C.ContractsIndexPreviousValidate()
    C.ContractsIndexNextValidate()
    C.ContractCurrentPageValidate()
  });
  it('C1727 Contract Create Functions', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Page Content Validation
    C.ContractSearchBarValidate()
    C.ContractDeleteButtonValidate()
    C.ContractCreateButtonValidate()
    C.ContractExportButtonValidate()
    C.ContractsImportContractsButtonValidate()
    C.ContractsImportTransactionsValidate()
    C.ContractsExportTransactionsValidate()
    C.ContractsFilterValidate('Filter')
    C.ContractsCompleteDDownValidate()
    C.ContractsCompanyValidate()
    C.ContractsCategoryValidate()
    C.ContractsTableValidate('Name')
    C.ContractsTableValidate('Type')
    C.ContractsTableValidate('Categories')
    C.ContractsTableValidate('Created')
    // Click Create Button
    C.ContractsCreateClick()
    C.ContractSelectPayee()
    C.ContractsNameFieldType('A Smoke Contract')
    C.ContractsStartDateType('01/02/2023')
    C.ContractsStartDateDoneButtonClick()
    C.ContractsEndDateType('01/02/2023')
    C.ContractsForeignIDType('Gelo12345')
    C.ContractsProjectIDType('Contract12345')
    // Categories
    C.ContractsClickCategoriesDdownClick()
    C.ContractsTypeCategoriesDdClick()
    C.ContractsSelectCreatorClick()
    // HomeCurrency
    C.ContractsHomeCurrencyDDClick()
    C.ContractsHomeCurrencyDDSelectionClick()
    // Accounting Period
    C.ContractsAccountingPeriodClick()
    C.ContractsAccountingPeriodDDSelectionClick()
    // Finances
    C.ContractsOpeningBalanceType()
    C.ContractsMinPayoutType()
    // Contract Type
    // C.PublishContractsClickContractType()
    // C.PublishContractsClickContractTypeDDSelection()
    // terms page
    C.ContractsTermsTabClick()
    C.ContractsIncomeClick()
    C.ContractsDealTypeDDSelect()
    C.ContractsRateType('100')
    // C.PublishContractsMultiplier()
    // C.PublishContractsReduction()
    // save and validate created data  
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('A Smoke Contract')
    C.ContractsCreatedProjectIDValidate('Contract12345')
    C.ContractsValidationfieldValidate('Royalty')
    // validate on index page
    C.ContractsClickContractsLinkClick()
    C.ContractsCreatedContractValidate('A Smoke Contract')
    C.ContractsRoyaltyValidationValidate('Royalty')
    C.ContractsCreatorValidationValidate('Premium')
    // Update Contract  
    C.ContractsClickCreateContractClick()
    C.ContractsUpdateNameType('A Smoke Contract Update')
    C.ContractsUpdateProjectIDType('C123457')
    // save and validate updated data 
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('A Smoke Contract Update')
    C.ContractsCreatedProjectIDValidate('C123457')
    // validate on index page
    C.ContractsClickContractsLinkClick()
    C.ContractsCreatedContractValidate('A Smoke Contract Update')
    C.ContractsTypeValidate('Royalty')
    // delete contract on edit page
    C.ContractsClickDeleteSelected()
    C.ContractsClickDeleteButtonClick()
    C.ContractsClickDeleteButtonModalClick()
  });
  it('C1717 Validate Contract Create Page Content - Overview', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Page Content Validation
    C.ContractSearchBarValidate()
    C.ContractDeleteButtonValidate()
    C.ContractCreateButtonValidate()
    C.ContractExportButtonValidate()
    C.ContractsImportContractsButtonValidate()
    C.ContractsImportTransactionsValidate()
    C.ContractsExportTransactionsValidate()
    C.ContractsFilterValidate('Filter')
    C.ContractsCompleteDDownValidate()
    C.ContractsCompanyValidate()
    C.ContractsCategoryValidate()
    C.ContractsTableValidate('Name')
    C.ContractsTableValidate('Type')
    C.ContractsTableValidate('Categories')
    C.ContractsTableValidate('Created')
    // Click Create Button
    C.ContractsCreateClick()
    C.ContractSelectPayee()
    C.ContractsNameFieldType('A regression Contract')
    C.ContractsStartDateType('01/02/2023')
    C.ContractsStartDateDoneButtonClick()
    C.ContractsEndDateType('01/02/2023')
    C.ContractsForeignIDType('Gelo12345')
    C.ContractsProjectIDType('Contract12345')
    C.ContractsCopyValidate()
    C.ContractsEditSeeFullHistoryValidate()
    C.ContractsOverviewHeaderValidate('Overview')
    C.ContractsOverviewHeaderValidate('Files')
    C.ContractsOverviewHeaderValidate('Notes')
    C.ContractsOverviewHeaderValidate('Contract Details')
    C.ContractsOverviewHeaderValidate('Finances')
    C.ContractsOverviewHeaderValidate('Auto Payment')
    C.ContractsOverviewHeaderValidate('Cross Contract')
    C.ContractsOverviewHeaderValidate('Summary Statement')
    C.ContractsActiveCheckboxValidate()
    C.ContractsFileTextValidate()
    C.ContractsOpeningBalanceValidate()
    C.ContractsMinPayoutValidate()
    
    // Categories
    C.ContractsClickCategoriesDdownClick()
    C.ContractsTypeCategoriesDdClick()
    C.ContractsSelectCreatorClick()
    // HomeCurrency
    C.ContractsHomeCurrencyDDClick()
    C.ContractsHomeCurrencyDDSelectionClick()
    // Accounting Period
    C.ContractsAccountingPeriodClick()
    C.ContractsAccountingPeriodDDSelectionClick()
    // Finances
    C.ContractsOpeningBalanceType()
    C.ContractsMinPayoutType()
    // save and validate created data
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('A regression Contract')
    C.ContractsCreatedProjectIDValidate('Contract12345')
    C.ContractsValidationfieldValidate('Royalty')
    C.ContractsGenerateSelfBillingInvoiceValidate()
    C.ContractsDeductWithholdingTaxValidate()
    C.ContractsGenerateAutoPaymentCboxValidate()
    C.ContractsPaymentConditionPublisherValidate()
    C.ContractsPaymentConditionPubClick()
    C.ContractAutoPaymentContractValidate()
    C.ContractAutoPayWhenValidate()
    C.ContractsGenAutoPaymentPubValidate()
    C.ContractsPaymentCrossContractPubValidate()
    C.ContractsPaymentCrossContractPubClick()
    C.ContractCrossContractWhenValidate()
    C.ContractCrossContractProcessValidate()
    C.ContractCrossContractContractValidate()
    C.ContractsTotalAssocStatementsCbValidate()
  });
  it('C1754 Validate Contract Delete function - On Page', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Search for created data
    C.ContractsSearchDuplicateType('A regression Contract')
    C.ContractClickCreated('A regression Contract')
    C.ContractsClickDeleteButtonClick()
    C.ContractsClickDeleteButtonModalClick()
  });
  it('C1718 Validate Contract Create Page Content - Terms', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Create Page and Terms Tab Content Validation
    C.ContractsCreateClick()
    C.ContractsNameFieldType('Test')
    C.ContractsTermsTabClick()
    C.ContractsAddIncomeButtonClick()
    // Validate Sales Content
    C.ContractSalesCatTypeDdownValidate()
    C.ContractSalesCatGroupDdownValidate()
    C.ContractSalesTerritoryDdownValidate()
    C.ContractSalesChannelDdownValidate()
    C.ContractSalesConfigDdownValidate()
    C.ContractSalesSourceValidate()
    C.ContractSalesDealTypeValidate()
    C.ContractSalesRateValidate()
    C.ContractSalesReductionValidate()
    C.ContractSalesDeleteClick()
    // Validate Deductions
    C.ContractsDeductionsButtonClick()

    C.ContractSalesCatTypeDdownValidate()
    C.ContractSalesCatGroupDdownValidate()
    C.ContractSalesTerritoryDdownValidate()
    C.ContractSalesChannelDdownValidate()
    C.ContractSalesConfigDdownValidate()
    C.ContractSalesSourceValidate()
    C.ContractDeductionTypeValidate()
    C.ContractRateValidate()
    C.ContractBasisValidate()
    // Delete
    C.ContractSalesDeleteClick()
    // Withholding Tax Deductions
    C.ContractWithholdTaxButtonClick()
    C.ContractSalesCatTypeDdownValidate()
    C.ContractSalesCatGroupDdownValidate()
    C.ContractSalesTerritoryDdownValidate()
    C.ContractSalesChannelDdownValidate()
    C.ContractSalesConfigDdownValidate()
    C.ContractSalesPriceCategoryValidate()
    C.ContractSalesSourceValidate()
    C.ContractSalesDealTypeValidate()
    C.ContractBasisValidate()
    C.ContractRateValidate()
    C.ContractSalesDeleteClick()
  });
  it('C1720 Validate Contract Create Page Content - Escalations', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Create Page and Escalation Tab Content Validation
    C.ContractsCreateClick()
    C.ContractsNameFieldType('Test')
    // Escalation Tracking
    C.ContractsEscalationTabClick()
    C.ContractsAddEscalationClick()
    C.ContractEscalationTrackingNameValidate()
    C.ContractsEscUnitsValidate()
    C.ContractsEscGrossAmountsValidate()
    C.ContractsEscNetAmountValidate()
    C.ContractsEscDeleteButtonClick()
    C.ContractsEscEquivalentClick()
    C.ContractEscEqValidate()
    C.ContractEscEqAmountValidate()
  });
  it('C1721 Validate Contract Create Page Content - Catalogue', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Create Page and Catalogue Tab Content Validation
    C.ContractsCreateClick()
    C.ContractsCatalogueTabClick()
    C.ContractsCatReleaseTablePubValidate('Title')
    C.ContractsCatReleaseTablePubValidate('Composer')
    C.ContractsCatReleaseTablePubValidate('Share')
    C.ContractsCatReleaseTablePubValidate('identifier')
    C.ContractsCatShowing25perpagepUBValidate()
    C.ContractsCatShowAllPubValidate()
  });
  it('C1723 Validate Contract Create Page Content - Transactions', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Create Page and Costs Tab Content Validation
    c.ContractsCreateClick()
    c.ContractsTransactionsTabClick()
    c.ContractsTransactionsCreateClick()
    c.ContractsTransactionsContractLinkClick()
    // Go back to Transaction Tab
    // Transaction Validate
    c.ContractsSubMenuClick()
    c.ContractsCreateClick()
    c.ContractsTransactionsTabClick()
    c.ContractsTransactionsHeaderValidate('Date')
    c.ContractsTransactionsHeaderValidate('Name')
    c.ContractsTransactionsHeaderValidate('Type')
    c.ContractsTransactionsHeaderValidate('Invoice No.')
    c.ContractsTransactionsHeaderValidate('Amount')
    c.ContractsTransactionsHeaderValidate('Balance')
    c.ContractsTransactionHeaderValidate()
    // Future Transactions Validate
    c.ContractsFutureTransactionHeaderValidate()
    c.ContractsFutureTransactHeadersValidate('Date')
    c.ContractsFutureTransactHeadersValidate('Name')
    c.ContractsFutureTransactHeadersValidate('Type')
    c.ContractsFutureTransactHeadersValidate('Amount')
    c.ContractsFutureTransactHeadersValidate('Balance')
  });
  it('C1724 Validate Contract Create Page Content - Aliases', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Create Page and alias Tab Content Validation
    c.ContractsCreateClick()
    c.ContractsAliasesTabClick()
    c.ContractsAddAliasClick()
    c.ContractAliasDeleteButtonClick()
    c.ContractsAddAliasClick()
    c.ContractsAddAliasClick()
  });
  it('C1725 Validate Contract Create Page Content - Analytics', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Create Page and Analytics Tab Content Validation
    c.ContractsCreateClick()
    c.ContractsAnalyticsTabClick()
    c.ContractsAnalyticsFilterClick()
    c.ContractsAnalyticsFilterHeaderValidate()
    c.ContractsAnalyticsFieldDropdValidate()
    c.ContractsAnalyticsFieldValueValidate()
    c.ContractsAnalyticsAndButtonValidate()
    c.ContractsAnalyticsOrButtonValidate()
    c.ContractsAnalyticsComparisonrButtonValidate()
    c.ContractsAnalyticsSelectGraphCboxValidate('Distribution Channels')
    c.ContractsAnalyticsSelectGraphCboxValidate('Configurations')
    c.ContractsAnalyticsSelectGraphCboxValidate('Territories')
    c.ContractsAnalyticsSelectGraphCboxValidate('Sources')
    c.ContractsAnalyticsSelectGraphCboxValidate('Sub Sources')
    c.ContractsAnalyticsSelectGraphCboxValidate('Top Catalogue')
    c.ContractsAnalyticsSelectGraphCboxValidate('Revenues over time')
    c.ContractsAnalyticsSelectGraphCboxValidate('Average Rates')
    c.ContractsAnalyticsSelectGraphCboxValidate('Contract Breakdown')
    c.ContractsAnalyticsGoButtonValidate()
    c.ContractsAnalyticsHeadersValidate('Channels')
    c.ContractsAnalyticsHeadersValidate('Configurations')
    c.ContractsAnalyticsHeadersValidate('Territories')
    c.ContractsAnalyticsHeadersValidate('Sources')
    c.ContractsAnalyticsHeadersValidate('Sub Sources')
    c.ContractsAnalyticsHeadersValidate('Revenues Over time')
    c.ContractsAnalyticsHeadersValidate('Top Works')
  });
  it('C1729 Validate Contract Transactions Create Function', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Create Page and Transaction Tab Content Validation
    c.ContractsCreateClick()
    c.ContractsTransactionsTabClick()
    c.ContractsTransactionsCreateClick()
    c.ContractsTransactionsOverviewHeaderValidate()
    c.ContractsTransactionsNameValidate()
    c.ContractsTransactionsTypeClick()
    c.ContractsTransactionTypeSelPaymtValidate()
    c.ContractsTransactionTypeSelRoyalValidate()
    c.ContractsTransactionTypeSelAdvanceValidate()
    c.ContractsTransactionTypeSelOtherValidate()
    c.ContractsTransactionsDateValidate()
    c.ContractsTransactionsAmountValidate()
    c.ContractsTransactionsInvoiceValidate()
    c.ContractsTransactionsDescriptionValidate()
  });
  it('C1726 Validate Contract Required Fields', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Create Page and Validation of required fields
    c.ContractsCreateClick()
    c.ContractsTermsSaveClick()
    c.ContractsNotSaveValidation()
  });
  it('C1727 Validate Contract Create Function', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Page Content Validation
    // Click Create Button
    C.ContractsCreateClick()
    C.ContractsNameFieldType('AAA Contract')
    // save and validate created data
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('AAA Contract')
    // validate on index page
    C.ContractsClickContractsLinkClick()
    C.ContractsCreatedContractValidate('AAA Contract')
    // delete contract on edit page
    C.ContractClickCreated('AAA Contract')
    C.ContractsClickDeleteButtonClick()
    C.ContractsClickDeleteButtonModalClick()
  });
  it('C1728,C1730 Validate Contract Update Function', () => {
    const C = new globalpageobject();
    C.ContractsMenuClick()
    C.ContractsSubMenuClick()
    // Page Content Validation
    C.ContractSearchBarValidate()
    C.ContractDeleteButtonValidate()
    C.ContractCreateButtonValidate()
    C.ContractExportButtonValidate()
    C.ContractsImportContractsButtonValidate()
    C.ContractsImportTransactionsValidate()
    C.ContractsExportTransactionsValidate()
    C.ContractsFilterValidate('Filter')
    C.ContractsCompleteDDownValidate()
    C.ContractsCompanyValidate()
    C.ContractsCategoryValidate()
    C.ContractsTableValidate('Name')
    C.ContractsTableValidate('Type')
    C.ContractsTableValidate('Categories')
    C.ContractsTableValidate('Created')
    C.ContractsSearchDuplicateType('A Smoke Contract')
    C.ContractDeleteDuplicateIfExist()
    C.ContractsSearchClear()
    // Click Create Button
    C.ContractsCreateClick()
    C.ContractSelectPayee()
    C.ContractsNameFieldType('A Smoke Contract')
    C.ContractsStartDateType('01/02/2023')
    C.ContractsStartDateDoneButtonClick()
    C.ContractsEndDateType('01/02/2023')
    C.ContractsForeignIDType('Gelo12345')
    C.ContractsProjectIDType('Contract12345')
    // Categories
    C.ContractsClickCategoriesDdownClick()
    C.ContractsTypeCategoriesDdClick()
    C.ContractsSelectCreatorClick()
    // HomeCurrency
    C.ContractsHomeCurrencyDDClick()
    C.ContractsHomeCurrencyDDSelectionClick()
    // Accounting Period
    C.ContractsAccountingPeriodClick()
    C.ContractsAccountingPeriodDDSelectionClick()
    // Finances
    C.ContractsOpeningBalanceType()
    C.ContractsMinPayoutType()
    // Contract Type
    // terms page
    C.ContractsTermsTabClick()
    C.ContractsIncomeClick()
    C.ContractsDealTypeDDSelect()
    C.ContractsRateType('100')
    // save and validate created data  
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('A Smoke Contract')
    C.ContractsCreatedProjectIDValidate('Contract12345')
    C.ContractsValidationfieldValidate('Royalty')
    // validate on index page
    C.ContractsClickContractsLinkClick()
    C.ContractsCreatedContractValidate('A Smoke Contract')
    C.ContractsRoyaltyValidationValidate('Royalty')
    C.ContractsCreatorValidationValidate('Premium')
    // Update Contract  
    C.ContractsClickCreateContractClick()
    C.ContractsUpdateNameType('A Smoke Contract Update')
    C.ContractsUpdateProjectIDType('C123457')
    // save and validate updated data 
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('A Smoke Contract Update')
    C.ContractsCreatedProjectIDValidate('C123457')
    // validate on index page
    C.ContractsClickContractsLinkClick()
    C.ContractsCreatedContractValidate('A Smoke Contract Update')
    C.ContractsTypeValidate('Royalty')
    // delete contract on edit page
    C.ContractsClickDeleteSelected()
    C.ContractsClickDeleteButtonClick()
    C.ContractsClickDeleteButtonModalClick()
  });
  it('C1731 Validate Contract Linked to Tracks', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.TracksSubMenuClick()
    // Create Tracks to link in contract
    c.TracksCreateButtonClick()
    c.TracksOverviewTabValidate()
    c.TracksTitleFieldType('A tracks regression')
    // Go to rights tab
    c.TracksRightsTabClick()
    c.TracksAddContractClick()
    c.TracksContractsSearchFieldType()
    c.TracksContractsSelectionClick()
    c.TracksSaveClick()
    // Go to Contracts to validate the linked tracks
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    c.ContractsSearchDuplicateType('Test Gelo 100')
    c.ContractClickCreated('Test Gelo 100')
    c.ContractsCatalogueTabClick()
    c.CatalogueMenuClick()
    c.TracksSubMenuClick()
    c.TracksEditCreatedClick('A tracks regression')
    c.TrasDeleteButtonClick()
    c.TracksDeleteModalButtonClick()
  });
  it('C1732 Validate Contract Linked to Release', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    // validate index page content
    c.ReleasesSubmenuClick()
    c.ReleasesClickCreateClick()
    c.ReleasesTitleFieldType('A regression release')
    c.ReleasesRightsTabClick()
    c.ReleasesAddContractClick()
    c.ReleasesContractType('test gelo 100')
    c.ReleasesSelectionClick()
    c.ReleasesSaveClick()
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    c.ContractsSearchDuplicateType('Test Gelo 100')
    c.ContractClickCreated('Test Gelo 100')
    c.ContractsCatalogueTabClick()
    // go back to release and delete created data
    c.CatalogueMenuClick()
    c.ReleasesSubmenuClick()
    c.ReleasesSearchDuplicateType('A regression release')
    c.ReleasesDeleteCreatedClick('A regression release')
    c.ReleasesDeleteButtonClick()
    c.ReleasesClickDeleteModalClick()
  });
  it('C1734 Validate Contract Linked to Cross Contract', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Create contract
    c.ContractsCreateClick()
    c.ContractsNameFieldType('AAA Contract')
    c.ContractSelectPayee()
    c.ContractsStartDateType('01/02/2023')
    c.ContractsStartDateDoneButtonClick()
    c.ContractsEndDateType('01/02/2023')
    c.ContractsForeignIDType('Gelo12345')
    c.ContractsProjectIDType('Contract12345')
    c.ContractsAccountingPeriodClick()
    // Select Half yearly
    c.ContractsAcctgPeriodHalfYearlySelClick()
    c.ContractsCrossContractClick()
    c.ContractCrossContractType('Test Gelo 100')
    c.ContractCrossContractSelectGelo100()
    // Save contract
    c.ContractsTermsSaveClick()
    c.ContractsAccountingPeriodClick()
    c.ContractsAcctgPeriodMonthlySelClick()
    c.ContractsTermsSaveClick()
    c.ContractsClickDeleteButtonClick()
    c.ContractsClickDeleteButtonModalClick()
  });
  it('C1736 Validate Contract Export Function - All', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Click Export Button
    c.ContractsExportButtonClick()
    c.NotifBellValidate('1', '1')
    c.PayeeExportNotifValidation('Contracts Export Ready')
  });
  it('C1747 Validate Contract Export Function - Selected', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Click Export Button
    c.ContractsSearchDuplicateType('Test')
    c.ContractsSelectTestData()
    c.ContractsExportButtonClick()
    c.NotifBellValidate('1', '1')
    c.PayeeExportNotifValidation('Contracts Export Ready')
  });
  it('C1737 Validate Contract Import file with ID and ID Exist on system', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression Contracts Publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('Test Gelo 3')
    c.ContractsCreatedNameValidate('Test Gelo 3')
  });
  it('C1738 Validate Contract Import file with ID and ID do not Exist on system', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression not exist publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('A new data')
    c.ContractsCreatedNameValidate('A new data')
    c.ContractsCreatedProjectIDValidate('pi12345')
    c.ContractsForeignIDValidate('fi12345')
    c.ContractsAccountingPeriodValidate('Yearly')
    // delete newly imported data
    c.ContractsClickDeleteButtonClick()
    c.ContractsClickDeleteButtonModalClick()
  });
  it('C1739 Validate Contract Import file without ID and name Existing on system', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression contracts without id publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('Test Gelo 100')
    c.ContractsCreatedNameValidate('Test Gelo 100')
    c.ContractsAccountingPeriodValidate('Monthly')
  });
  it('C1740 Validate Contract Import file without ID and name not Existing on system', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression id not exist publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('A id not exist')
    c.ContractsCreatedNameValidate('A id not exist')  
    c.ContractsCreatedProjectIDValidate('pi12345')
    c.ContractsForeignIDValidate('fi12345')
    c.ContractsAccountingPeriodValidate('Yearly')
    // delete newly imported data
    c.ContractsClickDeleteButtonClick()
    c.ContractsClickDeleteButtonModalClick()
  });
  it('C1742,C1743,C1744,C1745,C1748,C1749,C1750 Validate Contract Import with Tab details', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('A multi publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('A multiple data')
    c.ContractsCreatedNameValidate('A multiple data')
    c.ContractsCreatedProjectIDValidate('pi12345')
    c.ContractsForeignIDValidate('fi12345')
    c.ContractsAccountingPeriodValidate('Monthly')
    // delete newly imported data
    c.ContractsClickDeleteButtonClick()
    c.ContractsClickDeleteButtonModalClick()
  });
  it('C1751 Validate Contract Import when Overwrite Blanks is checked', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression contracts overwrte blank is checked publisher.xlsx')
    c.ContractsOverwriteBlankCheckbClick()
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('Test Gelo 3')
    c.ContractsCreatedNameValidate('Test Gelo 3')
    c.ContractsCreatedProjectIDValidate('pi12345')
    c.ContractsForeignIDValidate('fi12345')
    c.ContractsClickContractsLinkClick()
    // Import the original content of the test data
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression Contracts Publisher.xlsx')
    c.ContractsOverwriteBlankCheckbClick()
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
  });
  it('C1752 Validate Contract Import when Overwrite Blanks is not checked', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('Regression contracts publisher blank is unchecked.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('Test Gelo 4')
    c.ContractsCreatedNameValidate('Test Gelo 4')
    c.ContractsCreatedProjectIDValidate('pi12345')
    c.ContractsForeignIDValidate('fi12345')
    c.ContractsClickContractsLinkClick()
  });
  it('C1753 Validate Contract Import Values Matching Other tabs', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract with existing contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('A multi publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractsImportContractsButtonClick()
    c.FileAttach('reg contracts clear terms publisher.xlsx')
    c.ContractsOverwriteBlankCheckbClick()
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('A multiple data')
    c.ContractsTermsTabClick()
    c.ContractSalesCatTypeDdownNotExistValidate()
    // delete import
    c.ContractsClickDeleteButtonClick()
    c.ContractsClickDeleteButtonModalClick()
  });
  it('C1772 Validate Contract Import with File Error', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract that will throw an error
    c.ContractsImportContractsButtonClick()
    c.FileAttach('reg contracts with error.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Errored')
    c.PayeeListofErrorValidate()
    c.ContractsImportErrorValidate('It appears the template does not match')
    c.ContractNotifCancelButtonForPubClick()
    c.ContractsFilterButtonClick()
    c.ContractsCreatedIndexNotExistValidate('error data')
  });
  it('C1755, C1756, C1758 Validate Contract Delete Function', () => {
    const c = new globalpageobject();
    c.ContractsMenuClick()
    c.ContractsSubMenuClick()
    // Import a Contract and copy contract
    c.ContractsImportContractsButtonClick()
    c.FileAttach('A multi publisher.xlsx')
    c.ContractsImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Publisher Contract Import Has Completed')
    c.ContractsFilterButtonClick()
    c.ContractClickCreated('A multiple data')
    c.ContractsCopyButtonClick()
    c.ContractsTermsSaveClick()
    c.ContractsCopyButtonClick()
    c.ContractsTermsSaveClick()
    c.ContractsCopyButtonClick()
    c.ContractsTermsSaveClick()
    c.ContractsClickContractsLinkClick()
    // Search created contract and delete
    c.ContractsSearchDuplicateType('A multiple data')
    c.ContractsDeleteButtonIndexClick()
    c.ContractsDeleteButtonSelectedIndexClick()
    c.ContractsDeleteButtonSelectedIndexModalClick()
    c.ContractsDeleteErrorMsgValidate()
    c.ContractsSelectedCheckbClick()
    c.ContractsDeleteButtonIndexClick()
    c.ContractsDeleteButtonSelectedIndexClick()
    c.ContractsDeleteButtonSelectedIndexModalClick()
    c.ContractsCheckAllButtonClick()
    c.ContractsDeleteButtonIndexClick()
    c.ContractsDeleteButtonSelectedIndexClick()
    c.ContractsDeleteButtonSelectedIndexModalClick()
  });
})