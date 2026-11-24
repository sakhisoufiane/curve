import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('publisher regression tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.wait(1000)
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.wait(2000)
    // cy.login_dev();  
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })
  it('C1682 Validate Payee on Sidebar', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    // Validate that Payee is displayed after clicking Contracts on label sidebar
    p.PayeeSubMenuValidate()
  });
  it('C1684 Validate Payee Page Content', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Validate Payee Select Page
    p.PayeeSearchBarValidation()
    p.PayeeSearchButtonValidate()
    p.PayeeExportButtonValidation('Export')
    p.PayeeImportButtonValidation('Import')
    p.PayeeDeleteValidation('Delete')
    p.PayeeCreateValidation('Create')
    // Filter Complete select box
    p.PayeeCompleteDDownValidation()
    p.PayeeFilterButtonValidation('Filter')
    p.PayeeTableHeaderValidation('Name')
    p.PayeeTableHeaderValidation('Categories')
    p.PayeeTableHeaderValidation('Created')
    p.PayeeCompleteDropdClick()
    p.PayeeCompleteDropdSelectionValidate('Complete')
    p.PayeeCompleteDropdSelectionValidate('Incomplete')
    p.PayeeCompleteDropdSelectClick('Complete')
    p.PayeeFilterButtonValidation('Filter')
    p.PayeeTotalCounterValidate()
    p.PayeeCheckboxValidate()
    p.PayeeTableHeaderValidate('Name')
    p.PayeeTableHeaderValidate('Categories')
    p.PayeeTableHeaderValidate('Created')
    p.PayeePageNumberButtonsValidate()
    p.PayeeShowAllButtonValidate()
    p.PayeePreviousButtonValidate()
    p.PayeeNextButtonValidate()
    // Pagination Validation
    p.PayeeShowingPerPageValidate()
    p.PayeeNextButtonValidate()
    p.PayeePreviousButtonValidate()
    p.PayeeShowAllButtonValidate()
    p.PayeePageNumberButtonsValidate()

  });
  it('C1685 Validate Payee Page Content - Overview', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Click create button and validate create page
    p.PayeeCreateButtonClick()
    p.PayeeDeleteButtonValidate()
    p.PayeeCopyButtonValidate()
    p.PayeeSeeFullHistoryLinkValidate()
    p.PayeePageLabelsValidate('Overview')
    p.PayeePageLabelsValidate('Payment Details')
    p.PayeePageLabelsValidate('Tax Info')
    p.PayeePageLabelsValidate('Notes')
    p.PayeePayeeNameType()
    p.PayeeAlternateNameFieldType('this is a test')
    p.PayeeForeignIDFieldType('this is a test')
    p.PayeeProjectIDFieldType('this is a test')
    p.PayeePaymentCurrencyDDClick()
    p.PayeePaymentCurrencyDDSelectionClick()
    p.PayeeCategoriesClick()
    p.PayeeCategoriesSelectionClick()
    p.PayeeContactEmailFieldType('test@curve.com')
    p.PayeeAddressType('this is a test')
    p.PayeeCountryDdownClick()
    p.PayeeCountryDDSelectionClick()
    p.PayeeVATGSTSalesTAXNoFieldType('Test123839')
    p.PayeeTaxWordingFieldType('this is a test')
    p.PayeeSelfBillingTaxRateFieldType('1.2')
    p.PayeeWithHoldingTaxWordingFieldType('this is a test')
    p.PayeeWitholdingTaxRateFieldType('1.6')
    p.PayeeFeesInvoiceTaxRateFieldType('1.8')
    p.PayeeNotesFieldType('this is a test')
    p.PayeeCopyButtonValidate()
    p.PayeeSeeFullHistoryLinkValidate()
  });
  it('C1686 Validate Payee Page Content - Users', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeCreateButtonClick()
    // Go to user Tab
    p.PayeeUserTabClick()
    p.PayeeUserTabHeadersPageValidate('Email')
    p.PayeeUserTabHeadersPageValidate('Created')
    p.PayeeUserTabHeadersPageValidate('Status')
    // Pagination Validation
    p.PayeePageNumberButtonsIndexValidate()
    p.PayeeNextButtonIndexValidate()
    p.PayeePreviousButtonIndexValidate()
    p.PayeeShowAllButtonIndexValidate()
    p.PayeePageNumberButtonsValidate()
    p.PayeeShowingPerPageIndexValidate()
    p.PayeeSeeFullHistoryLinkValidate()
  });
  it('C1687 Validate Payee Page Content - Contracts', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeCreateButtonClick()
    // Go to Contracts Tab
    p.PayeeContractsTabClick()
    p.PayeeContractsTabHeadersValidate('Name')
    p.PayeeContractsTabHeadersValidate('Type')
    p.PayeeContractsTabHeadersValidate('Categories')
    p.PayeeContractsTabHeadersValidate('Created')
    p.PayeeContractsTabCurrentPageValidate()
    p.PayeeContractsTabShowingPerpageValidate()
    p.PayeeContractsTabShowAllValidate()
    p.PayeeContractsTabNextButtonValidate()
    p.PayeeContractsTabPreviousButtonValidate()
    p.PayeeContractsTabCurrentPageValidate()
    p.PayeeContractsTabValidateData('Test Gelo 100')
    p.PayeeContractsTabValidateData('Royalty')
    p.PayeeContractsTabValidateData('Apr 1, 2022')
  });
  it('C1688 Validate Payee Page Content - Analytics', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeCreateButtonClick()
    // Go to Analytics Tab
    p.PayeeAnalyticsTabClick()
    p.PayeeAnalytitcsTabHeaderTotalValidate('Total Revenue')
    p.PayeeAnalytitcsTabHeaderTotalValidate('Total Units')
    p.PayeeAnalyticsTabHeadersValidate('Channels')
    p.PayeeAnalayticsTabFilterClick()
    p.PayeeAnalyticsTabGobuttonValidate()
    p.PayeeAnalyticsTabSelectGraphsValidate('Select Graphs')
    p.PayeeAnalyticsTabHeadersValidate('Configurations')
    p.PayeeAnalyticsTabHeadersValidate('Territories')
    p.PayeeAnalyticsTabHeadersValidate('Sources')
    p.PayeeAnalyticsTabHeadersValidate('Sub Sources')
    p.PayeeAnalyticsTabHeadersValidate('Top Works')

    p.PayeeAnalyticsTabHeadersValidate ('Revenues Over time')
    p.PayeeAnalyticsFilterHeaderValidate('Filter')
    // Filter Validation
    p.PayeeAnalyticsTabGobuttonValidate()
    p.PayeeAnalyticsFieldDropdValidate()
    p.PayeeAnalyticsValueValidate()
    p.PayeeAnalyticsAndAddValidate()
    p.PayeeAnalyticsOrAddValidate()
    p.PayeeAnalyticsaddComparisonValidate()
    // Select Graphs Checkboxes Validation
    p.PayeeAnalyticsSelectGraphsCBValidation('Distribution Channels')
    p.PayeeAnalyticsSelectGraphsCBValidation('Configurations')
    p.PayeeAnalyticsSelectGraphsCBValidation('Territories')
    p.PayeeAnalyticsSelectGraphsCBValidation('Sources')
    p.PayeeAnalyticsSelectGraphsCBValidation('Sub Sources')
    p.PayeeAnalyticsSelectGraphsCBValidation('Top Catalogue')
    p.PayeeAnalyticsSelectGraphsCBValidation('Revenues over time')
    p.PayeeAnalyticsSelectGraphsCBValidation('Average Rates')
    p.PayeeAnalyticsSelectGraphsCBValidation('Contract Breakdown')
  });
  it('C1689 Validate Payee Required fields upon save', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeCreateButtonClick()
    // Click save and validate error message
    p.PayeePayeeSaveClick()
    p.PayeeErrorMessageValidate('The object has not been saved. A Name is required')
    p.PayeePayeeNameType('A 12345')
    p.PayeePayeeSaveClick()
    p.PayeeWarningMsgValidate('This payee has some issues that may affect its ability to report and grant access to royalties for this payee -')
    p.PayeeWarningMsgValidate('Payee should be linked to at least one Contract')
    p.PayeeWarningMsgValidate('A User needs to be assigned in order for someone to have access to this Payee and view its statements. It is ok to wait with creating Users until you are ready to send statements')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1691 Validate Payee Create Function', () => {
    const P = new globalpageobject();
    P.ContractMenuClick()
    P.PayeeSubMenuClick()
    // Click Create Button
    P.PayeeCreateButtonClick()
    // Create Payee
    P.PayeePayeeNameType()
    P.PayeeAlternateNameFieldType('Payee Test')
    P.PayeeForeignIDFieldType('1234567')
    P.PayeeProjectIDFieldType('Payee12345')
    P.PayeePaymentCurrencyDDClick()
    // P.PayeePaymentCurrencyDDSelectionType()
    P.PayeePaymentCurrencyDDSelectionClick()
    P.PayeeCategoriesClick()
    P.PayeeCategoriesSelectionClick()
    P.PayeeContactEmailFieldType('gelo@curve.com')
    P.PayeeAddressType('Test')
    P.PayeeCountryDdownClick()
    P.PayeeCountryDDSelectionClick()
    P.PayeeVATGSTSalesTAXNoFieldType('Test123839')
    P.PayeeTaxWordingFieldType('Test Wording')
    P.PayeeSelfBillingTaxRateFieldType('1.2')
    P.PayeeWithHoldingTaxWordingFieldType('test')
    P.PayeeWitholdingTaxRateFieldType('1.6')
    P.PayeeFeesInvoiceTaxRateFieldType('1.8')
    P.PayeeNotesFieldType('test')
    // Save payee & test response
    P.PayeePayeeSaveClick()
    P.PayeeSuccessMsgValidate()
    // Verify edit page with saved data
    P.PayeeVerifyPayeeNameValidate()
    P.PayeeVerifyAlternateNameValidate('Payee Test')
    // Navigate to select page
    P.PayeePayeesLinkClick()
    // Find and click newly created composer
    P.PayeeNewComposerValidate()
    // Update payee
    P.PayeeUpdatePayeeNameValidate()
    P.PayeeUpdateAlternateNameType('Payee Test Update')
    // Save payee & test response
    P.PayeePayeeSaveClick()
    // Click through delete workflow and verify deletion
    P.PayeePayeeDeleteButtonClick()
    P.PayeePayeeDeleteButtonModalClick()
  });
  it('C17000 Validate Payee Update Function', () => {
    const P = new globalpageobject();
    P.ContractMenuClick()
    P.PayeeSubMenuClick()
    // Validate Payee Select Page
    P.PayeeSearchBarValidation()
    P.PayeeExportButtonValidation('Export')
    P.PayeeImportButtonValidation('Import')
    P.PayeeDeleteValidation('Delete')
    P.PayeeCreateValidation('Create')
    // Filter Complete select box
    P.PayeeCompleteDDownValidation()
    P.PayeeFilterButtonValidation('Filter')
    P.PayeeTableHeaderValidation('Name')
    P.PayeeTableHeaderValidation('Categories')
    P.PayeeTableHeaderValidation('Created')
    // Click Create Button
    P.PayeeCreateButtonClick()
    // Create Payee
    P.PayeePayeeNameType()
    P.PayeeAlternateNameFieldType('Payee Test')
    P.PayeeForeignIDFieldType('1234567')
    P.PayeeProjectIDFieldType('Payee12345')
    P.PayeePaymentCurrencyDDClick()
    // P.PayeePaymentCurrencyDDSelectionType()
    P.PayeePaymentCurrencyDDSelectionClick()
    P.PayeeCategoriesClick()
    P.PayeeCategoriesSelectionClick()
    P.PayeeContactEmailFieldType('gelo@curve.com')
    P.PayeeAddressType('Test')
    P.PayeeCountryDdownClick()
    P.PayeeCountryDDSelectionClick()
    P.PayeeVATGSTSalesTAXNoFieldType('Test123839')
    P.PayeeTaxWordingFieldType('Test Wording')
    P.PayeeSelfBillingTaxRateFieldType('1.2')
    P.PayeeWithHoldingTaxWordingFieldType('test')
    P.PayeeWitholdingTaxRateFieldType('1.6')
    P.PayeeFeesInvoiceTaxRateFieldType('1.8')
    P.PayeeNotesFieldType('test')
    // Save payee & test response
    P.PayeePayeeSaveClick()
    // Verify edit page with saved data
    P.PayeeVerifyPayeeNameValidate()
    P.PayeeVerifyAlternateNameValidate('Payee Test')
    // Navigate to select page
    P.PayeePayeesLinkClick()
    // Find and click newly created composer
    P.PayeeNewComposerValidate()
    // Update payee
    P.PayeeUpdatePayeeNameValidate()
    P.PayeeUpdateAlternateNameType('Payee Test Update')
    P.PayeePayeeDeleteSelectedCategoryClick()
    P.PayeeUpdateCategoriesClick()
    P.PayeeUpdateCategoriesSelectionClick()
    // Save payee & test response
    P.PayeePayeeSaveClick()
    // Click through delete workflow and verify deletion
    P.PayeePayeeDeleteButtonClick()
    P.PayeePayeeDeleteButtonModalClick()
  });
  it('C1690 Validate Payee Copy Function', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // look for test data and click to copy
    p.PayeeSearchbarType('Z Standard')
    p.PayeeSearchResultClick('Z Standard')
    p.PayeeCopyButtonClick()
    p.PayeeCopyNameValidate('Z Standard - Copy')
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeSearchbarType('Z Standard - Copy')
    p.PayeeSearchResultClick('Z Standard - Copy')
    p.PayeeCopyNameValidate('Z Standard - Copy')
    p.PayeeVerifyAlternateNameValidate('zzz payee 2')
    // Delete Copied Payee
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });  
  it('C1692 Validate Payee Page Delete Function', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeCreateButtonClick()
    // Create Payee
    p.PayeePayeeNameType()
    p.PayeeAlternateNameFieldType('Payee Test')
    p.PayeeForeignIDFieldType('1234567')
    p.PayeeProjectIDFieldType('Payee12345')
    p.PayeePaymentCurrencyDDClick()
    // p.PayeePaymentCurrencyDDSelectionType()
    p.PayeePaymentCurrencyDDSelectionClick()
    p.PayeeCategoriesClick()
    p.PayeeCategoriesSelectionClick()
    p.PayeeContactEmailFieldType('gelo@curve.com')
    p.PayeeAddressType('Test')
    p.PayeeCountryDdownClick()
    p.PayeeCountryDDSelectionClick()
    p.PayeeVATGSTSalesTAXNoFieldType('Test123839')
    p.PayeeTaxWordingFieldType('Test Wording')
    p.PayeeSelfBillingTaxRateFieldType('1.2')
    p.PayeeWithHoldingTaxWordingFieldType('test')
    p.PayeeWitholdingTaxRateFieldType('1.6')
    p.PayeeFeesInvoiceTaxRateFieldType('1.8')
    p.PayeeNotesFieldType('test')
    // Save payee & test response
    p.PayeePayeeSaveClick()
    p.PayeeSuccessMsgValidate()
    // Navigate to select page
    p.PayeePayeesLinkClick()
    // Find and click newly created composer
    p.PayeeNewComposerValidate()
    // Update payee
    p.PayeeUpdatePayeeNameValidate()
    p.PayeeUpdateAlternateNameType('Payee Test Update')
    // Save payee & test response
    p.PayeePayeeSaveClick()
    // Click through delete workflow and verify deletion
    p.PayeePayeeDeleteButtonClick()
    p.PayeeDeleteCancelButtonClick('Cancel')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1693 Validate Payee Table Delete Function - Single ', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // look for test data and click to copy
    p.PayeeSearchbarType('Z Standard')
    p.PayeeSearchResultClick('Z Standard')
    p.PayeeCopyButtonClick()
    p.PayeeCopyNameValidate('Z Standard - Copy')
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeSearchbarType('Z Standard - Copy')
    p.PayeeSingleCheckBClick()
    // Delete Copied Payee
    p.PayeeIndexDeleteClick()
    p.PayeeIndexDeleteSelectedClick()
    p.PayeeIndexDeleteSelectedModalClick()
  });
  it('C1694 Validate Payee Table Delete - Multiple ', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // look for test data and click to copy
    p.PayeeSearchbarType('Z Standard')
    p.PayeeSearchResultClick('Z Standard')
    p.PayeeCopyButtonClick()
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeSearchbarType('Z Standard - Copy')
    p.PayeeSearchResultClick('Z Standard')
    p.PayeeCopyButtonClick()
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeSearchbarType('Z Standard - Copy')
    p.PayeeSingleCheckBClick()
    p.PayeeSecondCheckBClick()
    // Delete Copied Payee
    p.PayeeIndexDeleteClick()
    p.PayeeIndexDeleteSelectedClick()
    p.PayeeIndexDeleteSelectedModalClick()
  });
  it('C1697 Validate Payee Export Function - All', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Export Validation
    p.PayeeCheckAllCheckBClick()
    p.PayeeExportClick()
    p.NotifBellValidate('1', '1')
    p.PayeeExportNotifValidation('Payee Export Ready')
  });
  it('C1698 Validate Payee Export Function - Selected', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Export Validation
    p.PayeeSingleCheckBClick()
    p.PayeeExportClick()
    p.NotifBellValidate('1', '1')
    p.PayeeExportNotifValidation('Payee Export Ready')
  });
  it('C1699 Validate Payee Search Function', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // look for test data and click to copy
    p.PayeeSearchbarType('  ')
    p.PayeeSearchbarType('Z Standard')
    p.PayeeSearchResultClick('Z Standard')
  });
  it('C1696 Validate Payee Import Function', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.PayeeModalImportClick()
    p.PayeeNoFilesAttachedValidate('Requires a file to be uploaded')
    p.PayeeDownloadTemplateButtonClick()
    p.FileAttach('Smoke Payee Import.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeSearchIconClick()
    p.PayeeTestDataValidate('A Payee Import')
    p.PayeeCategoryValidate('Cat 1')
    // Delete Import
    p.PayeeDeleteImportedDataClick('A Payee Import')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1704 Validate Payee Import has an ID and it exists', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.PayeeModalImportClick()
    p.PayeeNoFilesAttachedValidate('Requires a file to be uploaded')
    p.PayeeDownloadTemplateButtonClick()
    p.FileAttach('Regression Payee Import error validation.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Errored')
    p.PayeeFilterButtonClick()
    p.PayeeImportClick()
    p.FileAttach('Smoke Payee Import.xlsx')
    p.PayeeModalImportClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeSearchIconClick()
    p.PayeeTestDataValidate('A Payee Import')
    p.PayeeCategoryValidate('Cat 1')
    // Delete Import
    p.PayeeDeleteImportedDataClick('A Payee Import')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1705 Validate Payee Import has an ID and it doesn’t exist', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.PayeeModalImportClick()
    p.PayeeNoFilesAttachedValidate('Requires a file to be uploaded')
    p.FileAttach('Regression Payee Import error validation.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Errored')
    p.PayeeFilterButtonClick()
  });
  it('C1706 Validate Payee Import has no ID and the name matches another in the DB', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.FileAttach('Regression Payee Import overwrite validation Publisher.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeFilterButtonClick()
    p.PayeeTableTestDataValidate('Z Standard')
  });
  it('C1707 Validate Payee Import has no ID and the name doesn’t match another Payee', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.PayeeModalImportClick()
    p.FileAttach('Smoke Payee Import.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeSearchIconClick()
    p.PayeeTestDataValidate('A Payee Import')
    p.PayeeCategoryValidate('Cat 1')
    // Delete Import
    p.PayeeDeleteImportedDataClick('A Payee Import')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1708 Validate Payee Import Categories should exist against the client settings', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.PayeeModalImportClick()
    p.FileAttach('Regression Payee Import error validation.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Errored')
    p.PayeeFilterButtonClick()
    p.PayeeImportClick()
    p.FileAttach('Smoke Payee Import.xlsx')
    p.PayeeModalImportClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeSearchIconClick()
    p.PayeeTestDataValidate('A Payee Import')
    p.PayeeCategoryValidate('Cat 1')
    // Delete Import
    p.PayeeDeleteImportedDataClick('A Payee Import')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1709 Validate Payee Import should update all fields filled in the excel', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.PayeeModalImportClick()
    p.FileAttach('Regression Payee Import error validation.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Errored')
    p.PayeeListofErrorValidate()
    p.PayeeErrorNotifValidate()
    p.PayeeNotifModalCancelClick()
    p.PayeeFilterButtonClick()
    p.PayeeImportClick()
    p.FileAttach('Smoke Payee Import.xlsx')
    p.PayeeModalImportClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeSearchIconClick()
    p.PayeeTestDataValidate('A Payee Import')
    p.PayeeCategoryValidate('Cat 1')
    // Delete Import
    p.PayeeDeleteImportedDataClick('A Payee Import')
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C1710 Validate Payee Import Overwrite Blanks is checked', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.FileAttach('Regression Payee Import overwrite blank publisher.xlsx')
    p.PayeeOverwriteBlankValueClick()
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeFilterButtonClick()
    p.PayeeTableTestDataValidate('Z Standard')
    p.PayeeCreatedClick('Z Standard')
    p.PayeeSwiftCodeValidate()
    p.PayeePayeesLinkClick()
    // Reimport file 
    p.PayeeImportClick()
    p.FileAttach('Regression Payee Import overwrite validation publisher.xlsx')
    p.PayeeOverwriteBlankValueClick()
    p.PayeeModalImportClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeFilterButtonClick()
    p.PayeeTableTestDataValidate('Z Standard')
  });
  it('C1711 Validate Payee Import Overwrite Blanks isn’t checked', () => {
    const p = new globalpageobject();
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeImportClick()
    p.FileAttach('Regression Payee Import not overwrite.xlsx')
    p.PayeeModalImportClick()
    // Validate Imported File
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Payee Import Has Completed')
    p.PayeeFilterButtonClick()
    p.PayeeTableTestDataValidate('Z Standard')
    p.PayeeCreatedClick('Z Standard')
    p.PayeeVerifyPayeeNameEditValidate('Z Standard')
    p.PayeeVerifyAlternateNameValidate('zzz payee 2')
    p.PayeeVerifyPaymentEmailValidate('test@gmail.com')
  });
  it('C3098 Validate Payee Payment Method Details - CSV', () => {
    const p = new globalpageobject();
    // Go to settings and select CSV
    p.CConfigSettingsClick()
    p.CConfigGeneralClick()
    p.SettingsPaymentTabClick()
    p.SettingsPaymentProviderDropdClick()
    p.SettingsPaymentProviderSelectionClick('Standard CSV')
    // Go to Payee page
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Validate Payee Select Page
    p.PayeeSearchBarValidation()
    p.PayeeExportButtonValidation('Export')
    p.PayeeImportButtonValidation('Import')
    p.PayeeDeleteValidation('Delete')
    p.PayeeCreateValidation('Create')
    // Filter Complete select box
    p.PayeeCompleteDDownValidation()
    p.PayeeFilterButtonValidation('Filter')
    p.PayeeTableHeaderValidation('Name')
    p.PayeeTableHeaderValidation('Categories')
    p.PayeeTableHeaderValidation('Created')
    // Click Create Button
    p.PayeeCreateButtonClick()
    // Create Payee
    p.PayeeNameManualType('A Payee Jes')
    p.PayeeAlternateNameFieldType('Payee Test')
    p.PayeeForeignIDFieldType('1234567')
    p.PayeeProjectIDFieldType('Payee12345')
    p.PayeePaymentEmailFieldType('gelo@curve.com')
    p.PayeePaymentCurrencyDDClick()
    // p.PayeePaymentCurrencyDDSelectionType('GBP')
    p.PayeePaymentCurrencyDDSelectionClick()
    p.PayeeBankNameFieldType('LLoyds')
    p.PayeeBankAddressType('This is a test')
    p.PayeeCategoriesClick()
    p.PayeeCategoriesSelectionClick()
    p.PayeeContactEmailFieldType('gelo@curve.com')
    p.PayeeAddressType('Test')
    p.PayeeAccountNoFieldType('123456')
    p.PayeeSortCodeFieldType('123456789')
    p.PayeeIBANFieldType('448877')
    p.PayeeSwiftCodeType('UK2736352')
    p.PayeeCountryDdownClick()
    p.PayeeCountryDDSelectionClick()
    p.PayeeVATGSTSalesTAXNoFieldType('Test123839')
    p.PayeeTaxWordingFieldType('Test Wording')
    p.PayeeSelfBillingTaxRateFieldType('1.2')
    p.PayeeWithHoldingTaxWordingFieldType('test')
    p.PayeeWitholdingTaxRateFieldType('1.6')
    p.PayeeFeesInvoiceTaxRateFieldType('1.8')
    p.PayeeNotesFieldType('test')
    // Save payee & test response
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeCreatedClick('A Payee Jes')
    // Delete created Payee
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
  });
  it('C3099 Validate Payee Payment Method Details - Wise', () => {
    const p = new globalpageobject();
    // Go to settings and select CSV
    p.CConfigSettingsClick()
    p.CConfigGeneralClick()
    p.SettingsPaymentTabClick()
    p.SettingsPaymentProviderDropdClick()
    p.SettingsPaymentProviderSelType('Wise')
    p.SettingsWiseAPIKey('993482f2-9edb-497a-989b-1365ddbf0654')
    p.CConfigSaveButtonClick()
    // Go to Payee page
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Click Create Button
    p.PayeeCreateButtonClick()
    // Create Payee
    p.PayeeFromWiseRadioBClick()
    p.PayeeFromWiseDropdClick()
    p.PayeeNameManualType('A Payee Jes')
    p.PayeeAlternateNameFieldType('Payee Test')
    p.PayeeForeignIDFieldType('1234567')
    p.PayeeProjectIDFieldType('Payee12345')
    p.PayeeCategoriesClick()
    p.PayeeCategoriesSelectionClick()
    p.PayeeContactEmailFieldType('gelo@curve.com')
    p.PayeeAddressType('Test')
    p.PayeeCountryDdownClick()
    p.PayeeCountryDDSelectionClick()
    p.PayeeVATGSTSalesTAXNoFieldType('Test123839')
    p.PayeeTaxWordingFieldType('Test Wording')
    p.PayeeSelfBillingTaxRateFieldType('1.2')
    p.PayeeWithHoldingTaxWordingFieldType('test')
    p.PayeeWitholdingTaxRateFieldType('1.6')
    p.PayeeFeesInvoiceTaxRateFieldType('1.8')
    p.PayeeNotesFieldType('test')
    // Save payee & test response
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeCreatedClick('A Payee Jes')
    // Delete created Payee
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
    // Create and Validate enter payee manually in payment details
    p.PayeeCreateButtonClick()
    p.PayeeNameManualType('A Payee Jes')
    p.PayeeEnterManuallyRadioBClick()
    p.PayeePaymentCurrencyDDClick()
    p.PayeePaymentCurrencyDDSelectionClick()
    p.PayeePaymentMethodDropDClick()
    p.PayeePaymentMethodDropDSelectionClick('IBAN')
    // Shows up if IBAN was selected
    p.PayeeRecipientTypeClick()
    p.PayeeReceipientTypeSelectionClick('Person')
    p.PayeeBankCodeFieldType('this is a test')
    p.PayeeIbanWiseType('11')
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeCreatedClick('A Payee Jes')
    // Delete created payee
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
    // Create a Payee and validate if a Local bank is selected
    p.PayeeCreateButtonClick()
    p.PayeeNameManualType('A Payee Jes')
    p.PayeeEnterManuallyRadioBClick()
    p.PayeePaymentCurrencyDDClick()
    p.PayeePaymentCurrencyDDSelectionClick()
    p.PayeePaymentMethodDropDClick()
    p.PayeePaymentMethodDropDSelectionClick('Local bank account')
    p.PayeeRecipientTypeClick()
    p.PayeeReceipientTypeSelectionClick('Person')
    p.PayeeUkSortCodeField('20')
    p.PayeeAccountNumber('123456')
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeCreatedClick('A Payee Jes')
    // Delete created payee
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
    // Go to settings and select CSV 
    p.CConfigSettingsClick()
    p.CConfigGeneralClick()
    p.SettingsPaymentTabClick()
    p.SettingsPaymentProviderDropdClick()
    p.SettingsPaymentProviderSelType('Standard CSV')
    p.CConfigSaveButtonClick()
  });
  it('C3100 Validate Payee Payment Method Details - Tipalti', () => {
    const p = new globalpageobject();
    // Go to settings and select CSV
    p.CConfigSettingsClick()
    p.CConfigGeneralClick()
    p.SettingsPaymentTabClick()
    p.SettingsPaymentProviderDropdClick()
    p.SettingsPaymentProviderSelType('Tipalti')
    p.SettingsTipaltyPayerNameType('CurveRoyalties')
    p.SettingsTipaltyApiKey('eg9fssEDVIDp7bhmf5exzVILGC7xXXozpoYbHyfkth1yNzPaBQ3XWK/8HlAuAY5D')
    p.SettingsTipaltyIcomeTypeDdClick()
    p.SettingsTipaltyIncomeTypeSelClick()
    p.CConfigSaveButtonClick()
    // Go to Payee page
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    // Click Create Button
    p.PayeeCreateButtonClick()
    // Create Payee
    p.PayeeNameManualType('Test Regress Payee')
    p.PayeePayeeIDType('Test Regress')
    p.PayeePaymentCurrencyDDClick()
    p.PayeePaymentCurrencyDDSelectionClick()
    p.PayeePayeeSaveClick()
    p.PayeePayeesLinkClick()
    p.PayeeCreatedClick('Test Regress Payee')
    // Delete created Payee
    p.PayeePayeeDeleteButtonClick()
    p.PayeePayeeDeleteButtonModalClick()
    // Go to settings and select CSV 
    p.CConfigSettingsClick()
    p.CConfigGeneralClick()
    p.SettingsPaymentTabClick()
    p.SettingsPaymentProviderDropdClick()
    p.SettingsPaymentProviderSelType('Standard CSV')
    p.CConfigSaveButtonClick()
  });
  it('C3450 Validate Payee Associated to User', () => {
    const p = new globalpageobject();
    p.CConfigSettingsClick()
    p.UserMenuClick()
    // create admin user
    p.UserCreateButtonClick()
    p.UserLinkPayeeClick()
    p.UserLinkDropdClick()
    p.UserLinkDropdSelClick()
    p.UserEmailFieldType('test@curve.com')
    p.UserSaveButtonClick()
    // save and validate created admin user on index page
    p.UsersCreatedValidate('test@curve.com')
    // go to payeee and validate test data 'Z Standard'
    p.ContractMenuClick()
    p.PayeeSubMenuClick()
    p.PayeeCreatedClick('Z Standard')
    p.PayeeWarningmessageValidate('A User needs to be assigned in order for someone to have access to this Payee and view its statements. It is ok to wait with creating Users until you are ready to send statements')
    p.CConfigSettingsClick()
    p.UserMenuClick()
    p.UserSearchbarType('test@curve.com')
    p.UserCheckButtonClick()
    p.UserDeleteButtonClick()
    p.UserDeleteModalClick()
  });
})