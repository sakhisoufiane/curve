// JavaScript source code

import globalpageobject from '../page-objects/smoke.global.pageobject.js';
describe('Label Smoke Tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.selectClientMulti();
    // cy.login_dev();  
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })

  it('Smoke-Payees-E2E-CRUD', () => {
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
    P.PayeePaymentEmailFieldType('gelo@curve.com')
    P.PayeePaymentCurrencyDDClick()
    // P.PayeePaymentCurrencyDDSelectionType('GBP')
    P.PayeePaymentCurrencyDDSelectionClick()
    P.PayeeBankNameFieldType('LLoyds')
    P.PayeeBankAddressType('This is a test')
    P.PayeeCategoriesClick()
    P.PayeeCategoriesSelectionClick()
    P.PayeeContactEmailFieldType('gelo@curve.com')
    P.PayeeAddressType('Test')
    P.PayeeAccountNoFieldType('123456')
    P.PayeeSortCodeFieldType('123456789')
    P.PayeeIBANFieldType('448877')
    P.PayeeSwiftCodeType('UK2736352')
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
    P.PayeeVerifyPaymentEmailValidate('gelo@curve.com')
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

  it('Smoke-Contracts-End2End-CRUD', () => {
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
    C.ContractsTypeCategoriesDdCreatorClick()
    C.ContractsSelectCreatorCreatorClick()
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
    C.ContractsClickContractTypeClick()
    C.ContractsClickContractTypeDDSelectionClick()
    // terms page
    C.LabelContractsTermsTabClick()
    C.LabelContractsSalesClick()
    C.LabelContractsDealTypeDDSelect()
    C.LabelContractsRateType('100')
    C.LabelContractsMultiplierType('1')
    C.LabelContractsReductionType('1')
    // save and validate created data
    C.ContractsTermsSaveClick()
    C.ContractsCreatedNameValidate('A Smoke Contract')
    C.ContractsCreatedProjectIDValidate('Contract12345')
    C.ContractsValidationfieldValidate('Royalty')
    // validate on index page
    C.ContractsClickContractsLinkClick()
    C.ContractsCreatedContractValidate('A Smoke Contract')
    C.ContractsRoyaltyValidationValidate('Royalty')
    C.ContractsCreatorValidationValidate('Creator')
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

  it('Smoke-Releases-E2E-CRUD', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    r.ReleasesSearchBarValidate()
    r.ReleasesBulkUpdateButtonValidate()
    r.ReleasesExportButtonValidate()
    r.ReleasesImportButtonValidate()
    r.ReleasesDeleteButtonValidate()
    r.ReleasesCreateButtonValidate()
    r.ReleasesCATGroupValidate()
    r.ReleasesContractValidate()
    r.ReleasesCreatedAfterValidate()
    r.ReleasesCreatedBeforeValidate()
    r.ReleasesParticipationValidate()
    r.ReleasesCompleteValidate()
    r.ReleasesLabelValidate()
    r.ReleasesCompanyValidate()
    r.ReleasesArtistValidate()
    r.ReleasesFormatValidate()
    r.ReleasesFilterValidate()
    r.ReleasesTableHeaderValidate()
    r.ReleasesTitleHeaderValidate()
    r.ReleasesArtistHeaderValidate()
    r.ReleasesCATNoHeaderValidate()
    r.ReleasesBarcodeHeaderValidate()
    r.ReleasesFormatHeaderValidate()
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A Release Smoke')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesCreatedTitleValidate('A Release Smoke')
    r.ReleasesCreatedVersionValidate('v123')
    r.ReleasesCreatedArtistValidate('gelo12345')
    r.ReleasesCreatedForeignIDValidate('test12345')
    r.ReleasesCreatedProjectIDValidate('ProID12345')
    r.ReleasesCreatedFormatValidate('CD')
    r.ReleasesCreatedPriceCatValidate('Full Price')
    r.ReleasesCreatedMainDealerPriceValidate('123')
    // validate created data on index page 
    r.ReleasesLinkClick()
    r.ReleasesTitleValidate('A Release Smoke')
    r.ReleasesValidateArtistValidate('gelo12345')
    r.ReleasesCatNoValidate('TEST1001')
    r.ReleaseBarCodeValidate('12345098751')
    // update on edit page and input fields
    r.ReleasesUpdateCreatedClick('A Release Smoke')
    r.ReleasesTitleFieldType('A Release Smoke Update')
    r.ReleasesVersionFieldType('v0987')
    r.ReleasesInputArtistType('gelo09876')
    r.ReleasesProjectIDType('Smoke12098')
    r.ReleasesCatNoFieldType('SMOKE0987')
    // save and validate updated data on edit page
    r.ReleasesSaveClick()
    r.ReleasesCreatedTitleValidate('A Release Smoke Update')
    r.ReleasesCreatedVersionValidate('v0987')
    r.ReleasesCreatedArtistValidate('gelo09876')
    r.ReleasesCreatedForeignIDValidate('test12345')
    r.ReleasesCreatedProjectIDValidate('Smoke12098')
    // validate updated data on index page
    r.ReleasesLinkClick()
    r.ReleasesTitleValidate('A Release Smoke Update')
    r.ReleasesValidateArtistValidate('gelo09876')
    r.ReleasesCatNoValidate('gelo09876')
    r.ReleaseBarCodeValidate('12345098751')
    r.ReleasesFormatHeaderValidate('CD')
    // Delete Release 
    r.ReleasesDeleteCreatedClick('A Release Smoke Update')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('Smoke-Mechanical-E2E-CRUD', () => {
    const m = new globalpageobject();
    m.CatalogueMenuClick()
    m.MechSubMenuClick()
    // Index Page Validation
    m.MechContractsLinkValidate()
    m.MechContractsDeleteValidate()
    m.MechContractsCreateValidate()
    m.MechExporButtontValidate()
    m.MechImportContractsButtonValidate()
    m.MechimportTransactionsButtonValidate()
    m.MechExportTransactionsButtonValidate()
    m.MechSearchBarValidate()
    m.MechCompleteDDValidate()
    m.MechCompanyFieldValidate()
    m.MechCategoryFieldValidate()
    m.MechFilterButtonValidate()
    m.MechNameHeaderValidate()
    m.MechTypeHeaderValidate()
    m.MechCategoriesHeaderValidate()
    m.MechCreatedHeaderValidate()
    // Create Mechanical Contract
    m.MechCreateButtonClick()
    m.MechPayeeFieldType('payee 2')
    m.MechPayeeTypeAheadClick('zzz payee 2')
    m.MechCompanyClick()
    m.MechCompanySelectionClick('Test Pixel 1')
    m.MechNameFieldType('A Mechanical Smoke')
    m.MechStartNameType()
    m.MechFilesHeaderClick()
    m.MechEndDateType()
    m.MechFilesHeaderClick()
    m.MechForeignIDType('AM129203028')
    m.MechCategoriesClick()
    m.MechCategoriesType()
    m.MechCategoriesDDSelectionClick()
    m.MechProjectIDType()
    m.MechCurrencyClick()
    m.MechHomeCurrencyClick()
    m.MechLicenseNumberType()
    m.MechAccountingPeriodClick()
    m.MechAccountingPeriodSelectionClick()
    m.MechOpeningBalanceType()
    m.MechMinPayoutType()
    m.MechNotesType()
    m.MechTermsTabClick()
    m.MechAddTermClick()
    m.MechRateType()
    m.MechSaveClick()
    // Validate Created Data on edit page
    m.MechCreatedPayeeValidate()
    m.MechCreatedCompanyValidate('Test Pixel 1')
    m.MechCreatedNameEditValidate('A Mechanical Smoke')
    m.MechCreatedForeignIDEditValidate()
    // Validate Created Data on index page
    m.MechContractsLinkClick()
    m.MechCreatedNameIndexValidate('A Mechanical Smoke')
    m.MechTableContentsIndexValidate('Mechanical')
    m.MechTableContentsIndexValidate('Creator')
    // Update Mechanical Contract on edit page
    m.MechCreatedClick('A Mechanical Smoke')
    m.MechNameFieldType('A Mechanical Smoke Update')
    m.MechSaveClick()
    // Validate Updated Data on edit and index page
    m.MechCreatedNameEditValidate('A Mechanical Smoke Update')
    m.MechContractsLinkClick()
    m.MechCreatedNameIndexValidate('A Mechanical Smoke Update')
    // Delete Mechanical Contract
    m.MechCreatedClick('A Mechanical Smoke Update')
    m.MechDeleteButtonClick()
    m.MechDeleteModalButtonClick()
  });
  it('Smoke-Composers-End2End-CRUD', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Composer index page Validation
    c.CompoExportButtonValidate
    c.CompoImportButtonValidate
    c.CompoDeleteValidate
    c.CompoCreateValidate
    c.CompoSearchValidate
    c.CompoNameHeaderValidate
    c.CompoCAEHeadrValidate
    c.CompoCreatedHeaderValidate
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A Composer Smoke')
    c.CompoForeignIdType('Gelo12345')
    c.CompoFNameType('Gelo')
    c.CompoMNameType('T')
    c.CompoLNameType('Zafra')
    c.CompoCAENumberType('Gelo1243')
    c.CompoSaveClick()
    // Edit Page data validation
    c.CompoNameEditValidate('A Composer Smoke')
    c.CompoCAEEditValidate('Gelo1243')
    c.CompoForeignIDEditValidate('Gelo12345')
    // Index Page data validation
    c.CompoLinkClick()
    c.CompoCreatedValidate()
    c.CompoCreatedCAEValidate('Gelo1243')
    // Updated edit page Composer
    c.CompoCreatedClick('A Composer Smoke')
    c.CompoNameType('A Composer Smoke Update')
    c.CompoCAENumberType('Smoke1234')
    c.CompoSaveClick()
    // Validate Edit Page
    c.CompoEditFirstNameValidate('Gelo')
    c.CompoEditMiddleNameValidate('T')
    c.CompoEditSurNameValidate('Zafra')
    c.CompoEditCAEValidate('Smoke1234')
    // Validate Updated Data
    c.CompoLinkClick()
    c.CompoCreatedCAEValidate('Smoke1234')
    // Delete Composer
    c.CompoDeleteCreatedClick()
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
  });
  it('Smoke-Tracks-E2E-CRUD', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    t.TracksLinkValidate()
    t.TracksSearchBarValidate()
    t.TracksExportButtonValidate()
    t.TracksDeleteButtonValidate()
    t.TracksCreateButtonValidate()
    t.TracksCATGroupFieldValidate()
    t.TracksCreatedAfterValidate()
    t.TracksCreatedBeforeValidate()
    t.TracksCompleteDDValidate()
    t.TracksLabelFieldValidate()
    t.TracksMechanicalContractValidate()
    t.TracksCompanyFieldValidate()
    t.TracksContractFieldValidate()
    t.TracksParticipationValidate()
    t.TracksFilterValidate()
    t.TracksTableHeaderValidate('Title')
    t.TracksTableHeaderValidate('Version')
    t.TracksTableHeaderValidate('Artist')
    t.TracksTableHeaderValidate('ISRC')
    t.TracksTableHeaderValidate('Created')
    // Create Track
    t.TracksCreateButtonClick()
    t.TracksOverviewTabValidate()
    t.TracksTitleFieldType('A Tracks Smoke')
    t.TracksVersionFieldType('v123')
    t.TracksArtistFieldType('Gelo')
    t.TracksForeignIDType('Tracks12345')
    t.TracksProjectIDType('Tracks12345')
    t.TracksCatalogueGroupsClick()
    t.TracksCatalogueGroupsSelectionClick()
    t.TracksISRCType('Smoke001')
    t.TracksLabelType('GeloTest')
    t.TracksPlineType('1234')
    t.TracksDurationType('120')
    t.TracksRightsTabClick()
    t.TracksAddContractClick()
    t.TracksContractsSearchFieldType()
    t.TracksContractsSelectionClick()
    t.TracksSaveClick()
    // save and validate created data on edit page
    t.TracksTitleValidate('A Tracks Smoke')
    t.TracksVersionValidate('v123')
    t.TracksArtistValidate('Gelo')
    t.TracksForeignIDValidate('Tracks12345')
    t.TracksProjectIDValidate('Tracks12345')
    // Go to Rights Tab
    t.TracksRightsTabClick()
    t.TracksContractValidate()
    // validate created data on index page 
    t.TracksLinkClick()
    t.TracksCreatedTitleValidate('A Tracks Smoke')
    t.TracksCreatedDetailsValidate('Gelo')
    t.TracksCreatedDetailsValidate('v123')
    t.TracksCreatedDetailsValidate('Smoke001')
    // Update Tracks on edit page
    t.TracksEditCreatedClick('A Tracks Smoke')
    t.TracksTitleFieldType('A Tracks Smoke Update')
    t.TracksVersionFieldType('v1236789')
    t.TracksArtistFieldType('Gelo1234')
    t.TracksForeignIDType('098765')
    t.TracksProjectIDType('T09876')
    t.TracksSaveClick()
    // save and validate updated data on edit page
    t.TracksVersionValidate('v1236789')
    t.TracksForeignIDValidate('098765')
    t.TracksProjectIDValidate('T09876')
    t.TracksArtistValidate('Gelo1234')
    // validate updtaed data on index page 
    t.TracksLinkClick()
    t.TracksCreatedTitleValidate('A Tracks Smoke Update')
    t.TracksCreatedDetailsValidate('v1236789')
    t.TracksCreatedDetailsValidate('Gelo1234')
    t.TracksCreatedDetailsValidate('Smoke001')
    // delete track on edit page
    t.TracksEditCreatedClick('A Tracks Smoke Update')
    t.TrasDeleteButtonClick()
    t.TracksDeleteModalButtonClick()
  });
  it('Smoke-Publisher-End2End-CRUD', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Index Page Content validations
    p.PublishersLinkValidate()
    p.PublisherExportButtonValidate()
    p.PublishersDeleteValidate()
    p.PublishersImportValidate()
    p.PublishersCreateValidate()
    p.PublishersHeaderValidate()
    p.PublishersHeaderNameValidate()
    p.PublishersCAEValidate()
    p.PublishersCreatedHeaderValidate()
    p.PublishersShowingPage25Validate()
    p.PublisherShowAllValidate()
    // Input on edit page (create data)
    p.PublishersCreateClick()
    p.PublishersNameType('A Publisher Smoke')
    p.PublishersForeignIDFieldType('1245678')
    p.PublishersCAEFieldType('098766')
    // Save and validate on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke')
    p.PublishersForeignName('1245678')
    p.PublishersCAENumber('098766')
    // Validate data on index page
    p.PublishersLinkClick()
    p.PublishersCreatedValidate('A Publisher Smoke')
    p.PublishersValidateCAE('098766')
    // update data on edit page
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersNameType('A Publisher Smoke Update')
    p.PublishersForeignIDFieldType('ABC1245678')
    p.PublishersCAEFieldType('ABC098765')
    // save and validate updated data on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke Update')
    p.PublishersForeignName('ABC1245678')
    p.PublishersCAENumber('ABC098765')
    p.PublishersLinkClick()
    // validate updayed data on index page
    p.PublishersCreatedValidate('A Publisher Smoke Update')
    p.PublishersValidateCAE('ABC098765')
    // delete data
    p.PublishersDeleteCreatedClick()
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('Smoke-Periods-E2E-CRUD', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.PeriodSubmenuClick()
    // create page
    p.PeriodSearchDuplicateType('A Period Test')
    p.PeriodDeleteDuplicateIfExist()
    p.PeriodSearchClear()
    p.PeriodCreateClick()
    p.PeriodNameFieldType('A Period Test')
    p.PeriodAccountingPeriodTypeDDClick()
    p.PeriodAccountingPeriodTypeDDSelectionClick()
    p.PeriodYearClick()
    p.PeriodYearDDSelection()
    p.PeriodAccountingPeriodClick()
    p.PeriodAccountingPeriodDDSelectionClick()
    // Start Date
    p.PeriodStartDateClick()
    p.PeriodStartDateClick()
    p.PeriodStartDateType('01/07/2022')
    // End Date
    p.PeriodEndDateClick()
    p.PeriodEndDateClick()
    p.PeriodEndDateType('31/12/2022')
    // Sales Date
    p.PeriodAccountingDateClick()
    p.PeriodAccountingDateClick()
    p.PeriodAccountingDateType('31/12/2022')
    p.PeriodNextButtonClick()
    // Select Sales
    p.PeriodSelectAllRBClick()
    p.PeriodIncludeSelectedClick()
    p.LabelPeriodNextButton()
    // Costs
    p.LabelPeriodSelectedClick()
    p.LabelPeriodIncludeSelectedClick()
    p.PeriodCalcClick()
    // validate created data on index page
    p.PeriodOutsideClick()
    p.PeriodCreatedNameValidate('A Period Test')
    p.PeriodTableCreatedValidate('2023')
    p.PeriodTableCreatedValidate('H1')
    p.PeriodOutsideClick()
    p.PeriodClickCreated('A Period Test')
    // Insert Condition Statement here
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.LabelPeriodGrossRevenueValidate()
    p.LabelPeriodNetPayoutValidate()
    p.LabelPeriodGrossCrostValidate()
    p.LabelPeriodRechargedCostsValidate()
    p.LabelPeriodInputUnitsValidate()
    p.LabelPeriodInputSalesLinesValidate()
    // update on edit page period
    p.PeriodEditClick()
    p.PeriodNameFieldType('A Period Test Update')
    p.PeriodNextButtonClick()
    p.LabelPeriodNextButton()
    p.PeriodCalcClick()
    // validate updated data on period page
    p.PeriodCreatedClick('A Period Test Update')
    // Insert Condition Statement here
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodsPeriodProcessingLoad('Period is Processing...')
    p.PeriodHeaderValidate()
    // validate updated data on index page
    p.PeriodsLinkClick()
    p.PeriodCreatedNameValidate('A Period Test Update')
    p.PeriodValidateStatus('Complete')
    // delete data
    p.PeriodDeleteClickCreated()
    p.PeriodDeleteButtonClick()
    p.PeriodDeleteModalClick()
  });
  it('Smoke-Statements-E2E-CRUD', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    // index page validation
    p.StatementsSearchBarValidate()
    p.StatementsPeriodDDValidate()
    p.StatementsTypeDDValidate()
    p.StatementsFilterValidate()
    p.StatementsTableHeaderValidate('Name')
    p.StatementsTableHeaderValidate('Gross Sales')
    p.StatementsTableHeaderValidate('Created')
    p.StatementsTableHeaderValidate('Status')
    // create statement via period
    p.PeriodSubmenuClick()
    p.PeriodSearchDuplicateType('A Statement Smoke')
    p.StatementDeleteDuplicateIfExist()
    p.PeriodSearchClear()
    p.PeriodCreateClick()
    p.PeriodNameFieldType('A Statement Smoke')
    p.PeriodAccountingPeriodTypeDDClick()
    p.PeriodAccountingPeriodTypeDDSelectionClick()
    p.PeriodYearClick()
    p.StatementsYearDDSelectionClick()
    p.PeriodAccountingPeriodClick()
    p.StatementsAccountingPeriodDDType()
    // Start Date
    p.PeriodStartDateClick()
    p.PeriodStartDateClick()
    p.PeriodStartDateType('01/07/2022')
    // End Date
    p.PeriodEndDateClick()
    p.PeriodEndDateClick()
    p.PeriodEndDateType('31/12/2022')
    // Sales Date
    p.PeriodAccountingDateClick()
    p.PeriodAccountingDateClick()
    p.PeriodAccountingDateType('31/12/2022')
    p.PeriodNextButtonClick()
    // Select Sales
    p.PeriodSelectAllRBClick()
    p.PeriodIncludeSelectedClick()
    p.LabelPeriodNextButton()
    // Costs
    p.LabelPeriodSelectedClick()
    p.LabelPeriodIncludeSelectedClick()
    p.PeriodCalcClick()
    // validate created data on index page
    p.PeriodOutsideClick()
    p.PeriodCreatedNameValidate('A Statement Smoke')
    p.PeriodTableCreatedValidate('2024')
    p.PeriodTableCreatedValidate('Y1')
    p.PeriodOutsideClick()
    // validate statement in period
    p.StatementsPeriodCreatedClick('A Statement Smoke')
    // Insert Condition Statement here
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.StatementsPeriodProcessingLoad('Period is Processing...')
    p.LabelPeriodGrossRevenueValidate()
    p.LabelPeriodNetPayoutValidate()
    p.LabelPeriodGrossCrostValidate()
    p.LabelPeriodRechargedCostsValidate()
    p.LabelPeriodInputUnitsValidate()
    p.LabelPeriodInputSalesLinesValidate()
    p.StatementsTabLinkClick()
    p.StatementsValidateExisting('2024 - Y1: Test Gelo 100')
    // validate statement index page
    p.StatementsSubMenuClick()
    p.StatementsSearchBarType('Test Gelo 100')
    p.StatementsSearchIconClick()
    p.StatementsValidateCreated('2024 - Y1: Test Gelo 100')
    // add statement on period
    p.PeriodSubmenuClick()
    p.StatementsPeriodCreatedClick('A Statement Smoke')
    p.StatementsStatementsTabClick()
    p.StatementsCreateStatementsClick()
    p.StatementsContract('test gelo 6')
    p.StatementsContractSelectionClick()
    p.StatementsContractCreateClick()
    p.StatementsCreatedContractValidate('2024 - Y1: Test Gelo 6')
    p.PeriodsCreatedStatementClick('2024 - Y1: Test Gelo 6')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    p.StatementPeriodProcessingLoad('Statement is Processing...')
    // Validate that Statement is on Statement index page
    p.StatementsSubMenuClick()
    p.StatementsSearchBarType('Gelo 6')
    p.StatementsSearchIconClick()
    p.StatementsSearchValidate('2024 - Y1: Test Gelo 6')
    p.StatementsSearchClick()
    // Go to Periods and Delete
    p.PeriodSubmenuClick()
    p.PeriodDeleteClickCreated()
    p.PeriodDeleteButtonClick()
    p.PeriodDeleteModalClick()
  });
  it('Smoke-Costs-E2E-CRUD', () => {
    const c = new globalpageobject();
    c.CostsSalesMenuClick()
    c.CostsSubMenuClick()
    // Cost Page Content Validation
    c.CostsSearchBarValidate()
    c.CostsExportButtonValidate()
    c.CostsImportButtonValidate()
    c.CostsDeleteButtonValidate()
    c.CostsArchiveButtonValidate()
    c.CostsCreateButtonValidate()
    c.CostsArchiveDDValidate()
    c.CostsNameHeaderValidate()
    c.CostsAmountHeaderValidate()
    c.CostsDescriptionHeaderValidate()
    c.CostsTargetPeriodValidate()
    c.CostsTypeHeaderValidate()
    c.CostsCreatedArtValidate()
    c.CostsReportedValidate()
    // Create Cost
    c.CostsCreateButtonClick()
    c.CostsNameFieldType('A Cost Smoke')
    c.CostsAmountFieldType('123')
    c.CostsDateFieldType('11/11/2022')
    c.CostsOutsideClick()
    c.CostsTypeDDClick()
    c.CostsTypeDDSelectionClick()
    c.CostsTerritoryDDClick()
    c.CostsTerritoryDDSelectionClick()
    c.CostsInvoiceNoFieldType('12345')
    c.CostsTargetPeriodFieldType('test')
    c.CostsDescriptionFieldType('this is a test')
    c.CostsSaveButtonClick()
    // save and validate created data
    c.CostsNameValidate('A Cost Smoke')
    c.CostsAmountValidate('123')
    c.CostsDateValidate('11/11/2022')
    c.CostsTypeValidate('Artwork')
    c.CostsTerritoryValidate('World')
    c.CostsInvoiceValidate('12345')
    c.CostsTargetPeriodCreatedValidate('test')
    c.CostsDescriptionValidate('this is a test')
    // validate created data on index page
    c.CostsLinkClick()
    c.CostsCreatedNameValidate('A Cost Smoke')
    c.CostsCreatedDetailsTableValidate('123')
    c.CostsCreatedDetailsTableValidate('this is a test')
    c.CostsCreatedDetailsTableValidate('test')
    c.CostsCreatedDetailsTableValidate('Artwork')
    // update data on edit page
    c.CostsCreatedClick('A Cost Smoke')
    c.CostsNameFieldType('A Cost Smoke update')
    c.CostsAmountFieldType('55')
    c.CostsInvoiceNoFieldType('09876')
    // validate updated data on edit page
    c.CostsSaveButtonClick()
    c.CostsNameValidate('A Cost Smoke update')
    c.CostsAmountValidate('55')
    c.CostsInvoiceValidate('09876')
    c.CostsLinkClick()
    // validate updated data on index page
    c.CostsCreatedNameValidate('A Cost Smoke update')
    c.CostsCreatedDetailsTableValidate('55')
    c.CostsCreatedDetailsTableValidate('test')
    // Delete Cost
    c.CostsCreatedClick('A Cost Smoke update')
    c.CostsClickDeleteButton()
    c.CostsClickDeleteModalButton()
  });
  it('Smoke-Sales-Templates-E2E-CRUD', () => {
    const t = new globalpageobject();
    t.CostsSalesMenuClick()
    t.TemplatesSubMenuClick()
    t.TemplatesCreateButtonClick()
    t.TemplatesCreateFromNewClick()
    // Calculation Tab
    t.TemplatesCalculationsTabClick()
    t.TemplatesAddCalculationClick()
    t.TemplatesWhenDDSelect()
    t.TemplatesAddConditionClick()
    t.TemplatesInputTypeDDClick()
    t.TemplatesInputTypeDDSelectionClick()
    t.TemplatesInputValueType()
    t.TemplatesComparisonDDClick()
    t.TemplatesComparisonSelectionDDClick()
    t.TemplatesOutputFieldDDClick()
    t.TemplatesOutputFieldDDSelectionClick()
    // Overview Tab
    t.TemplatesClickOverviewTabClick()
    t.TemplatesNameFieldType('A Template Smoke')
    t.TemplatesSourceType('ATS')
    t.TemplatesTabNumberType('1')
    t.TemplatesHeaderRowType('1')
    t.TemplatesStartingRowType('2')
    t.TemplatesUploadFileAttach('smoke-sales-template.xlsx')
    t.TemplatesSaveButtonClick() // Save Button
    // Setting Example Lines
    t.Templates1stFieldClick()
    t.Templates1stFieldType()
    t.TemplatesFieldSelectClick('Sale Date')
    // 2nd column
    t.Templates2ndFieldClick()
    t.Templates2ndFieldType()
    t.TemplatesFieldSelectClick('Source')
    // 3rd
    t.Templates3rdFieldClick()
    t.Templates3rdFieldType()
    t.TemplatesFieldSelectClick('Sub Source')
    // 4th
    t.Templates4thFieldClick()
    t.Templates4thFieldType()
    t.TemplatesFieldSelectClick('Territory')
    // 5th
    t.Templates5thFieldClick()
    t.Templates5thFieldType()
    t.TemplatesFieldSelectClick('Distribution Channel')
    // 6th
    t.Templates6thFieldClick()
    t.Templates6thFieldType()
    t.TemplatesFieldSelectClick('Configuration')
    // 7th
    t.Templates7thFieldClick()
    t.Templates7thFieldType()
    t.TemplatesFieldSelectClick('ISRC')
    // 8th
    t.Templates8thFieldClick()
    t.Templates8thFieldType()
    t.TemplatesFieldSelectClick('Units')
    // 9th
    t.Templates9thFieldClick()
    t.Templates9thFieldType()
    t.TemplatesFieldSelectClick('Gross Amount')
    // 10th
    t.Templates10thFieldClick()
    t.Templates10thFieldType()
    t.TemplatesFieldSelectClick('Net Amount')
    // 11th
    t.Templates11thFieldClick()
    t.Templates11thFieldType()
    t.TemplatesFieldSelectClick('Per Unit Rate')
    // 12th
    t.Templates12thFieldClick()
    t.Templates12thFieldType()
    t.TemplatesFieldSelectClick('Transaction Date')
    t.TemplatesSaveButtonClick()
    // validate on index page
    t.TemplatesTemplateLinkClick()
    t.TemplatesValidateCreated('A Template Smoke')
    t.TemplatesValidateSource('ATS')
    // update template
    t.TemplatesCreatedClick('A Template Smoke')
    t.TemplatesNameFieldType('A Template Smoke Update')
    t.TemplatesSourceType('STA')
    // save and validate on edit page
    t.TemplatesSaveButtonClick()
    t.TemplatesEditedNameValidate()
    t.TemplatesEditedSourceValidate()
    // validate on index page
    t.TemplatesTemplateLinkClick()
    t.TemplatesValidateCreated('A Template Smoke Update')
    t.TemplatesValidateSource('STA')
    // delete
    t.TemplatesCreatedClick('A Template Smoke Update')
    t.TemplatesDeleteClick()
    t.TemplatesDeleteModalClick()
  });
  it('Smoke-Sales-Ingestion-E2E-CRUD', () => {
    const s = new globalpageobject();
    s.SalesIncomeMenu()
    s.SalesIncomeSubmenu()
    // index page content validation
    s.SalesValidHeaderValidate('Valid')
    s.SalesStatusHeaderValidate('Status')
    s.SalesReportedValidate('Reported')
    s.SalesArhivedValidate('Archived')
    s.SalesNewValidate('New')
    s.SalesFilterValidate()
    s.SalesExportValidate()
    s.SalesRerunValidate()
    s.SalesDeleteValidate()
    s.SalesArchiveButtonValidate()
    s.SalesCreateValidate()
    s.SalesTableHeaderValidate('Name')
    s.SalesTableHeaderValidate('Invoice')
    s.SalesTableHeaderValidate('Target')
    s.SalesTableHeaderValidate('Account')
    s.SalesTableHeaderValidate('Gross')
    s.SalesTableHeaderValidate('Net')
    s.SalesTableHeaderValidate('Invalid Lines')
    // enter condition statement here
    s.SalesDeleteIfExist()
    //
    s.SalesCreateClick()
    s.SalesChooseFileAttach('smoke-sales-publishing.xlsx')
    s.SalesCompleteButtonClick()
    // validate data on index page
    s.SalesUploadedFileValidate('smoke-sales-publishing')
    s.SalesAcctNoValidate('456')
    // sales page
    s.SalesUploadedClick('smoke-sales-publishing')
    // s.SalesCompleteClick()
    s.SalesCompleteModal()
    s.SalesRevalidateClick()
    // update sales
    s.SalesUploadedFileValidate('smoke-sales-publishing')
    s.SalesUploadedClick('smoke-sales-publishing')
    s.SalesHeaderValidate()
    s.SalesEditClick()
    s.SalesUpdateNameType('smoke-sales-publishing testing')
    s.SalesSaveClick()
    s.SalesSalesLinkClick()
    s.SalesUploadedFileValidate('smoke-sales-publishing testing')
    // delete sales
    s.SalesUploadedClick('smoke-sales-publishing testing')
    s.SalesEditClick()
    s.SalesDeleteClick()
    s.SalesDeleteModalClick()
  });
  it('Smoke-Payments-E2E-CRUD', () => {
    const p = new globalpageobject();
    p.PPaymentsMenuClick()
    // payment groups index page validation
    p.PPaymentsSearchBarValidate()
    p.PPaymentsDeleteButtonValidate()
    p.PPaymentsCreateButtonValidate()
    p.PPaymentsHeadersValidate('Name')
    p.PPaymentsHeadersValidate('Status')
    p.PPaymentsHeadersValidate('Created')
    // payment index page validation
    p.PPaymentsCreateClick()
    p.PPaymentsOverviewHeaderValidate('Overview')
    p.PPaymentsNameHeaderValidate()
    p.PPaymentsSaveButtonValidate()
    p.PPaymentsPayeeHeaderValidate('Payee')
    p.PPaymentsNameFieldHeader('Name')
    p.PPaymentsCurrencyHeaderValidate('Currency')
    p.PPaymentsAmountHeaderValidate('Amount')
    p.PPaymentsStatusHeaderValidate('Status')
    // Add Payment
    p.PPaymentsEnterNameType('A Smoke Test')
    p.PPaymentsSaveClick()
    p.PPaymentsCreateEditClick()
    p.PPaymentsEnterNameEditType('A Smoke Payment')
    p.PPaymentsEnterAmountType('0123')
    p.PPaymentsPayeeType('z standard')
    p.PPaymentsPayeeAdvanceType('Z Standard')
    p.PPaymentsPayeeSaveClick()
    // Validate Created Data
    p.PPaymentsPayeeValidate('Z Standard')
    p.PPaymentsValidateName('A Smoke Payment')
    p.PPaymentsValidateCurrency('GBP')
    p.PPaymentsValidateAmount('123.00')
    p.PPaymentsValidateStatus('Pending')
    // Update Payment
    p.PPaymentGroupsLinkClick()
    p.PPaymentCreatedPaymentGroupsClick('A Smoke Test')
    p.PPaymentsCreatedClick()
    p.PPaymentsEnterNameEditType('A Payment Smoke Updated')
    p.PPaymentsEnterAmountType('121')
    p.PPaymentsPayeeSaveClick()
    p.PPaymentsGroupsLinkClick()
    // Validate Updated Data
    p.PPaymentsPayeeValidate('Z Standard')
    p.PPaymentsUpdatedNameValidate('A Payment Smoke Updated')
    p.PPaymentsValidateCurrency('GBP')
    p.PPaymentsValidateAmount('121')
    // delete payment
    p.PPaymentGroupsLinkClick()
    p.PPaymentCreatedPaymentGroupsClick('A Smoke Test')
    p.PPaymentsCreatedClick()
    p.PPaymentsDeleteButtonClick()
    p.PPaymentsDeleteModalButtonClick()
    // delete payment groups
    p.PPaymentsDeleteGroupClick()
    p.PPaymentsDeleteGroupModalClick()
  });
  it('Smoke-Configurations-E2E-CRUD', () => {
    const SC = new globalpageobject();
    SC.CConfigSettingsClick()
    SC.CConfigGeneralClick()
    // configuration page content validation
    SC.CConfigTabClick()
    SC.CConfigCurrencyHeaderValidate()
    SC.CConfigAccountingPeriodTypesHeaderValidate()
    SC.CConfigDistribChannelsHeaderValidate()
    SC.CConfigConfigurationsHeaderValidate()
    SC.LabelConfigPriceCategoriesHeader()
    SC.LabelConfigCostTypesHeader()
    // configuration page add data
    SC.CConfigAddClick()
    SC.LabelConfigAccountingPeriodNewFieldClick()
    SC.LabelConfigAddPriceCategoriesClick()
    SC.LabelConfigPriceCategNewFieldType()
    SC.LabelConfigAddCatalogueGroupsClick()
    SC.LabelConfigCatalogueGroupsType()
    SC.LabelConfigAddSourcesClick()
    SC.LabelConfigAddPayeeCategoriesClick()
    SC.LabelConfigPayeeCategoriesNewFieldType()
    SC.LabelConfigAddContractCategoriesClick()
    SC.LabelConfigContractCategoriesType()
    // Save and validate added data
    SC.CConfigSaveButtonClick()
    // added content validation
    SC.LabelConfigAccountingPeriodValidate('Smoke test')
    SC.LabelConfigCatalogueGroupsValidate('Smoke test')
    SC.LabelConfigPayeeValidate('Smoke test')
    SC.LabelConfigContractCategoriesValidate('Smoke test')
    // deletion of added data
    SC.ConfigAccountingPeriodDeleteClick()
    SC.ConfigPriceCategoriesDeleteClick()
    SC.ConfigCatalogueGroupsClick()
    SC.ConfigDeleteSourcesClick()
    SC.ConfigDeleteContractCategoriesClick()
    SC.CConfigSaveButtonClick()
    // SC.CConfigSaveClick()
  });
  it('Smoke-Users-E2E-CRUD', () => {
    const U = new globalpageobject();
    U.CConfigSettingsClick()
    U.UserMenuClick()
    // create admin user
    U.UserCreateButtonClick()
    U.UserUserTypeDDClick()
    U.UserUserTypeDDSelectionClick()
    U.UserEmailFieldType('aausertest@curve.com')
    U.UserSaveButtonClick()
    // save and validate created admin user on index page
    U.UserSaveModalClick()
    U.UsersCreatedValidate('aausertest@curve.com')
    U.UserAdminTagValidate('Admin')
    // delete admin data
    U.UserCheckButtonClick()
    U.UserDeleteButtonClick()
    U.UserDeleteModalClick()
    // create standard user
    U.UserStandardCreateButtonClick()
    U.UserEmailFieldType('aausertest@curve.com')
    // save validate created standard user on index page
    U.UserSaveButtonClick()
    U.UserSaveModalClick()
    U.UsersCreatedValidate('aausertest@curve.com')
    // delete standard user 
    U.UserCheckButtonClick()
    U.UserDeleteButtonClick()
    U.UserDeleteModalClick()
  });
})













 