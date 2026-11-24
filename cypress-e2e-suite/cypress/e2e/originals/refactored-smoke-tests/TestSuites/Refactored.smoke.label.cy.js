// JavaScript source code

import SmokeLabelPageObject from '../PageObjects/smoke.label.page.object.js';
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
    const P = new SmokeLabelPageObject();
    P.LabelSidebarContract()
    P.LabelSidebarPayees()
    // Validate Payee Select Page
    P.LabelSearchBar()
    P.LabelExportButton()
    P.LabelImportButton()
    P.LabelA()
    P.LabelDeleteButton()
    P.LabelCreateButton1()
    // Filter Complete select box
    P.LabelCompleteDD()
    P.LabelFilter()
    P.LabelCheckAllNameRB()
    P.LabelNameHeader()
    P.LabelCategoriesHeader()
    P.LabelCreatedHeader()
    // Click Create Button
    P.LabelCreateButton()
    // Create Payee
    P.LabelPayeeNameTB()
    P.LabelAlternateNameField()
    P.LabelForeignIDField()
    P.LabelProjectIDField()
    P.LabelPaymentEmailField()
    P.LabelPaymentCurrencyDD()
    P.LabelPaymentCurrencyDDSelection()
    P.LabelPaymentCurrencyDDSelection1()
    P.LabelBankNameField()
    P.LabelBankAddressTB()
    P.LabelCategories()
    P.LabelCategoriesSelection()
    P.LabelContactEmailField()
    P.LabelAddressTB()
    P.LabelAccountNoField()
    P.LabelSortCodeField()
    P.LabelIBANField()
    P.LabelSwiftCode()
    P.LabelCountryDD()
    P.LabelCountryDDSelection()
    P.LabelVATGSTSalesTAXNoField()
    P.LabelTaxWordingField()
    P.LabelSelfBillingTaxRateField()
    P.LabelWithHoldingTaxWordingField()
    P.LabelWitholdingTaxRateField()
    P.LabelFeesInvoiceTaxRateField()
    P.LabelNotesField()
    // Save payee & test response
    P.LabelPayeeClickSave()
    // Verify edit page with saved data
    P.LabelVerifyPayeeName()
    P.LabelVerifyAlternateName()
    P.LabelVerifyPaymentEmail()
    // Navigate to select page
    P.LabelClickPayeesLink()
    // Find and click newly created composer
    P.LabelNewComposer()
    // Update payee
    P.LabelUpdatePayeeName()
    P.LabelUpdateAlternateName()
    P.LabelPayeeDeleteSelectedCategory()
    P.LabelUpdateCategories()
    P.LabelUpdateCategoriesSelection()
    // Save payee & test response
    P.LabelUpdateClickSave()
    // Click through delete workflow and verify deletion
    P.LabelPayeeClickDelete()
    P.LabelPayeeDeleteModal()
    P.LabelPayeeClickDeleteModal()

  });

  it('Smoke-Contracts-End2End-CRUD', () => {
    const C = new SmokeLabelPageObject();
    C.LabelContractsMenu()
    C.LabelContractsSubMenu()
    // Page Content Validation
    C.LabelContractSearchBar()
    C.LabelContractDeleteButton()
    C.LabelContractCreateButton()
    C.LabelContractExportButton()
    C.LabelContractsImportContractsButton()
    C.LabelContractsImportTransactions()
    C.LabelContractsExportTransactions()
    C.LabelContractsFilter()
    C.LabelContractsCompleteDD()
    C.LabelContractsCompany()
    C.LabelContractsCategory()
    C.LabelContractsName()
    C.LabelContractsType()
    C.LabelContractsCategories()
    C.LabelContractsCreated()
    // Click Create Button
    C.LabelContractsClickCreate()
    C.LabelContractSelectPayee()
    C.LabelContractsNameField()
    C.LabelContractsStartDate()
    C.LabelContractsStartDateDoneButton()
    C.LabelContractsEndDate()
    C.LabelContractsForeignID()
    C.LabelContractsProjectID()
    // Categories
    C.LabelContractsClickCategoriesDD()
    C.LabelContractsTypeCategoriesDD()
    C.LabelContractsSelectCreator()
    // HomeCurrency
    C.LabelContractsHomeCurrencyDD()
    C.LabelContractsHomeCurrencyDDSelection()
    // Accounting Period
    C.LabelContractsAccountingPeriod()
    C.LabelContractsAccountingPeriodDDSelection()
    // Finances
    C.LabelContractsOpeningBalance()
    C.LabelContractsMinPayout()
    // Contract Type
    C.LabelContractsClickContractType()
    C.LabelContractsClickContractTypeDDSelection()
    // terms page
    C.LabelContractsTermsTab()
    C.LabelContractsSales()
    C.LabelContractsDealTypeDD()
    C.LabelContractsRate()
    C.LabelContractsMultiplier()
    C.LabelContractsReduction()
    // save and validate created data
    C.LabelContractsTermsSave()
    C.LabelContractsValidation1()
    C.LabelContractsValidation2()
    C.LabelContractsValidation3()
    C.LabelContractsClickContractsLink()
    C.LabelContractsCreatedContract()
    C.LabelContractsRoyaltyValidation()
    C.LabelContractsCreatorValidation()
    // Update Contract  
    C.LabelContractsClickCreateContract()
    C.LabelContractsUpdateName()
    C.LabelContractsUpdateProjectID()
    // save and validate updated data
    C.LabelContractsUpdateSave()
    C.LabelContractsUpdateNameValidation()
    C.LabelContractProjectIDValidation()
    // validate on index page
    C.LabelContractsClickContractsLink1()
    C.LabelContractsUpdateContractValidation()
    C.LabelContractsTypeValidation()
    // delete contract on edit page
    C.LabelContractsClickDeleteSelected()
    C.LabelContractsClickDeleteButton()
    C.LabelContractsClickDeleteButtonModal()
  });
  it('Smoke-Mechanical-Contracts-E2E-CRUD', () => {
    // Create Mechanical Contract
    const MC = new SmokeLabelPageObject();
    MC.LabelMechContractsMenu1()
    MC.LabelMechechanicalsSubmenu()
    // Mechanical Page Content Validation
    MC.LabelMechContractsLink()
    MC.LabelMechContractsDelete()
    MC.LabelMechContractsCreate()
    MC.LabelMechExport()
    MC.LabelMechImportContracts()
    MC.LabelMechimportTransactions()
    MC.LabelMechExportTransactions()
    MC.LabelMechSearchBar()
    MC.LabelMechComplete()
    MC.LabelMechCompany1()
    MC.LabelMechCategory()
    MC.LabelMechFilter()
    MC.LabelMechName()
    MC.LabelMechType1()
    MC.LabelMechCategories()
    MC.LabelMechCreated()
    // Create Mechanical Contract
    MC.LabelMechClickCreate()
    MC.LabelMechPayeeField()
    MC.LabelMechPayeeTypeAhead()
    MC.LabelMechCompany()
    MC.LabelMechCompanySelection()
    MC.LabelMechNameField()
    MC.LabelMechStartName()
    MC.LabeMechFilesHeader()
    MC.LabelMechEndDate()
    MC.LabelMechFilesHeader2()
    MC.LabelMechForeignID1()
    MC.LabelMechCategories1
    MC.LabelMechType()
    MC.LabelMechCategoriesDDSelection()
    MC.LabelMechProjectID()
    MC.LabelMechCurrency()
    MC.LabelMechHomeCurrency()
    MC.LabelMechLicenseNumber()
    MC.LabelMechAccountingPeriod()
    MC.LabelMechAccountingPeriodSelection()
    MC.LabelMechOpeningBalance()
    MC.LabelMechMinPayout()
    MC.LabelMechNotes()
    MC.LabelMechTermsTab()
    MC.LabelMechAddTerm()
    MC.LabelMechRate()
    MC.LabelMechTermsSave()
    // Validate Created Data on edit page
    MC.LabelMechSuccessMsg()
    MC.LabelMechVerifyPayee()
    MC.LabelMechVerifyCompany()
    MC.LabelMechVerifyName()
    MC.LabelMechForeignID()
    // Validate Created Data on index page
    MC.LabelClickMechContractsLink()
    MC.LabelMechVerifyCreated()
    MC.LabelMechVerifyType()
    MC.LabelMechVerifyCreator()
    // Update Mechanical Contract on edit page
    MC.LabelMechClickCreated()
    MC.LabelMechUpdateName()
    MC.LabelMechUpdateSave()
    // Validate Updated Data on edit and index page
    MC.LabelMechUpdateSuccessMsg()
    MC.LabelMechVerifyUpdatedName()
    MC.LabelMechContractLink2()
    MC.LabelMechVerifyUpdatedName2()
    // Delete Mechanical Contract
    MC.LabelMechClickDelete()
    MC.LabelMechDelete()
    MC.LabelMechDeleteModal()
  });
  it('Smoke-Composers-End2End-CRUD', () => {
    const C = new SmokeLabelPageObject();
    // Navigate to Composer Select Page
    C.LabelComposersCatalogueMenu()
    C.LabelComposersSubMenu()
    // Validate Composer Select Page
    C.LabelComposersLink()
    C.LabelComposersSearchBar()
    C.LabelComposersSearchIcon()
    C.LabelComposersExportButton()
    C.LabelComposersImportButton()
    C.LabelComposersDeleteButton()
    C.LabelComposersCreateButton()
    C.LabelComposersHeader()
    C.LabelComposersNameHeader()
    C.LabelComposersCaeHeader()
    C.LabelComposersCreated()
    C.LabelComposersPaginationPrev()
    C.LabelComposersPagination1()
    C.LabelComposersPaginationNext()
    C.LabelComposersShowing25()
    C.LabelComposersShowAll()
    // Click Create Button
    C.LabelClickCreateButton()
    // Validate create composer page
    C.LabelComposersOverviewTab()
    C.LabelComposersOverviewHeader()
    C.LabelComposersPartyID()
    C.LabelComposersPartyIdVerify()
    C.LabelComposersNameHeader1()
    C.LabelComposersNameField()
    C.LabelComposersForeignIDHeader()
    C.LabelComposersForeignIDField()
    C.LabelComposersFirstNameHeader()
    C.LabelComposersFirstNameField()
    C.LabelComposersMiddleNameHeader()
    C.LabelComposersMiddleNameField()
    C.LabelComposersSurnameHeader()
    C.LabelComposersSurnameField()
    C.LabelComposersCAEHeader()
    C.LabelComposersCAEField()
    // Enter create composer data
    C.LabelComposersTypeName()
    C.LabelComposersTypeForeignID()
    C.LabelComposersTypeFirstName()
    C.LabelComposersTypeMiddleName()
    C.LabelComposersTypeSurName()
    C.LabelComposersTypeCAE()
    C.LabelComposersCAETypeAhead()
    // Save Composer & test response
    C.LabelComposersSaveButton()
    C.LabelComposersSuccessMessage()
    // Verify composer edit page with saved data 1
    C.LabelComposers1PartyIDVerification()
    C.LabelComposersNameValidation()
    C.LabelComposersNameEditForeignID()
    C.LabelComposersEditFirstName()
    C.LabelComposersEditMiddleName()
    C.LabelComposersEditSurName()
    C.LabelComposersEditCAE()
    C.LabelComposers123Validation()
    // Navigate to composer select page
    C.LabelComposersClickComposerLink()
    // Find and click newly created composer
    C.LabelComposersClickNewCreatedComposer()
    // Update composer data
    C.LabelComposersUpdateComposerName1()
    C.LabelComposersUpdateForeignID()
    C.LabelComposersUpdateFirstName()
    C.LabelComposersUpdateMiddleName()
    C.LabelComposersUpdateSurName()
    C.LabelComposersUpdateCAE()
    C.LabelComposersTypeAheadSelection1()
    // Save Composer & test response
    C.LabelComposersClickSave2()
    C.LabelComposersSuccessfulMessage2()
    // Verify composer edit page with saved data 2
    C.LabelComposersVerifyPartyId2()
    C.LabelComposersVerifyName2()
    C.LabelComposersVerifyForeignID2()
    C.LabelComposersVerifyFirstName2()
    C.LabelComposersVerifyMiddleName2()
    C.LabelComposersVerifySurName2()
    C.LabelComposersVerifyCAE()
    C.LabelComposersVerifyA()
    // Click through delete workflow and verify deletion
    C.LabelComposersClickDelete()
    C.LabelComposersVerifyDeleteModal()
    C.LabelComposersDeleteConfirmation()
    C.LabelComposersDeleteButtonClick()
  });
  it('Smoke-Publisher-End2End-CRUD', () => {
    const P = new SmokeLabelPageObject();
    P.LabelPublishersCatalogueMenu()
    P.LabelPublishersSubMenu()
    // Index Page Content validations
    P.LabelPublishersLink()
    P.LabelPublisherExportButton()
    P.LabelPublishersDelete()
    P.LabelPublishersImport()
    P.LabelPublishersCreate()
    P.LabelPublishersHeader()
    P.LabelPublishersHeaderName()
    P.LabelPublishersCAE()
    P.LabelPublishersCreated()
    P.LabelPublishersShowingPage25()
    P.LabelPublisherShowAll()
    // Input on edit page (create data)
    P.LabelPublishersClickCreate()
    P.LabelPublishersTypeName()
    P.LabelPublishersForeignIDField
    P.LabelPublishersCAEField
    // Save and validate on edit page
    P.LabelPublishersClickSaveButton
    P.LabelPublishersValidateName
    P.LabelPublishersForeignName
    P.LabelPublishersCAENumber
    // Validate data on index page
    P.LabelPublishersClickLink
    P.LabelPublishersValidateCreated
    P.LabelPublishersValidateCAE
    // update data on edit page
    P.LabelPublishersClickCreatedPub
    P.LabelPublishersNameUpdate
    P.LabelPublishersUpdateForeignID
    P.LabelPublishersupdateCAE
    P.LabelPublishersContractUpdate
    P.LabelPublishersContractSelect
    // save and validate updated data on edit page
    P.LabelPublishersUpdateSave
    P.LabelPublisherSuccessMsg
    P.LabelPublishersValidateUpdatedName
    P.LabelPublishersValidateUpdatedForeignID
    P.LabelPublishersValidateUpdatedCAE
    // validate updayed data on index page
    P.LabelPublishersLinkClick2
    P.LabelPublishersValidateUpdated2
    P.LabelPublishersValidateA
    // delete data
    P.LabelPublishersDeleteCreated
    P.LabelPublishersClickDelete
    P.LabelPublishersClickDeleteModal
  });
  it('Smoke-Tracks-E2E-CRUD', () => {
    const T = new SmokeLabelPageObject();
    // Tracks TC
    T.LabelTracksCatalogueMenu()
    T.LabelTracksSubMenu()
    // Page content validation
    T.LabelTracksLink()
    T.LabelTracksSearchBar()
    T.LabelTracksExportButton()
    T.LabelTracksDeleteButton()
    T.LabelTracksCreateButton()
    T.LabelTracksCATGroupField()
    T.LabelTracksContractField()
    T.LabelTracksCreatedAfter()
    T.LabelTracksCreatedBefore()
    T.LabelTracksParticipation()
    T.LabelTracksCompleteDD()
    T.LabelTracksLabelField()
    T.LabelTracksCompanyField()
    T.LabelTracksMechanicalContract()
    T.LabelTracksFilter()
    T.LabelTracksTitleHeader()
    T.LabelTracksVersionHeader()
    T.LabelTracksArtistHeader()
    T.LabelTracksISRCHeader()
    T.LabelTracksCreatedHeader()
    // Create Track
    T.LabelTracksClickCreateButton()
    T.LabelTracksOverviewTab()
    T.LabelTracksTitleField()
    T.LabelTracksVersionField()
    T.LabelTracksArtistField()
    T.LabelTracksForeignID()
    T.LabelTracksProjectID()
    T.LabelTracksCatalogueGroupsClick()
    T.LabelTracksCatalogueGroupsSelection()
    T.LabelTracksISRCType()
    T.LabelTracksLabel()
    T.LabelTracksPline()
    T.LabelTracksDuration()
    T.LabelTracksRightsTab()
    T.LabelTracksAddContract()
    T.LabelTracksContractsSearchField()
    T.LabelTracksContractsSelection()
    // save and validate created data on edit page
    T.LabelTracksClickSaveRights()
    T.LabelTracksValidateTitle()
    T.LabelTracksValidateVersion()
    T.LabelTracksValidateArtist()
    T.LabelTracksValidateForeignID()
    T.LabelTracksValidateProjectID()
    T.LabelTracksRightsTabClick()
    T.LabelTracksContractValidate()
    // validate created data on index page
    T.LabelTracksLinkClick1()
    T.LabelTracksValidateCreatedTitle()
    T.LabelTracksValidateCreatedArtist()
    T.LabelTracksValidateCreatedVersion()
    T.LabelTracksValidateCreatedISRC()
    // Update Tracks on edit page
    T.LabelTracksEditCreated()
    T.LabelTracksEditTitle()
    T.LabelTracksEditVersion()
    T.LabelTracksEditArtist()
    T.LabelTracksEditForeignID()
    T.LabelTracksEditProjectID()
    T.LabelTracksEditProjectIDType()
    // save and validate updated data on edit page
    T.LabelTracksClickEditSave()
    T.LabelTracksValidateUpdatedTitle()
    T.LabelTracksValidateUpdatedVersion()
    T.LabelTracksValidateUpdatedArtist()
    T.LabelTracksValidateUpdatedForeignID()
    T.LabelTracksValidateUpdateedProjectID()
    // validate updtaed data on index page 
    T.LabelTracksLinkClick2()
    T.LabelTracksValidatEditedTitle()
    T.LabelTracksValidatEditedeVersion()
    T.LabelTracksValidateEditedArtist()
    T.LabelTracksValidateISRC()
    // delete track on edit page
    T.LabelTracksClickCreatedTitleDelete()
    T.LabelTrakcsClickDeleteButton()
    T.LabelTracksClickDeleteModalButton()
  });
  it('Smoke-Releases-E2E-CRUD', () => {
    const R = new SmokeLabelPageObject();
    R.LabelReleasesCatalogueMenu()
    // validate index page content
    R.LabelReleasesSubmenu()
    R.LabelReleasesSearchBar()
    R.LabelReleasesBulkUpdateButton()
    R.LabelReleasesExportButton()
    R.LabelReleasesImportButton()
    R.LabelReleasesDeleteButton()
    R.LabelReleasesCreateButton()
    R.LabelReleasesCATGroup()
    R.LabelReleasesContract()
    R.LabelReleasesCreatedAfter()
    R.LabelReleasesCreatedBefore()
    R.LabelReleasesParticipation()
    R.LabelReleasesComplete()
    R.LabelReleasesLabel()
    R.LabelReleasesCompany()
    R.LabelReleasesArtist()
    R.LabelReleasesFormat()
    R.LabelReleasesFilter()
    R.LabelReleasesTableHeader()
    R.LabelReleasesTitleHeader()
    R.LabelReleasesArtistHeader()
    R.LabelReleasesCATNoHeader()
    R.LabelReleasesBarcodeHeader()
    R.LabelReleasesFormatHeader()
    // create on edit page and input fields 
    R.LabelReleasesClickCreate()
    R.LabelReleasesTitleField()
    R.LabelReleasesVersionField()
    R.LabelReleasesClickOutsideVersion()
    R.LabelReleasesInputArtist()
    R.LabelReleasesInputForeignID()
    R.LabelReleasesProjectID()
    R.LabelReleasesDistributionChannel()
    R.LabelReleasesDistributionSelection()
    R.LabelReleasesFormatDD()
    R.LabelReleasesFormatDDSelection()
    R.LabelReleasesPriceCategory()
    R.LabelReleasesPriceCategoryDD()
    R.LabelReleasesMainDealerPrice()
    R.LabelReleasesCatNoField()
    R.LabelReleasesBarCode()
    R.LabelReleasesLabelField()
    R.LabelReleasesReleaseDate()
    R.LabelReleasesReleaseDateType()
    R.LabelReleasesReleaseCatGroups()
    R.LabelReleasesReleaseCatGroupSelection()
    R.LabelReleasesRightsTab()
    R.LabelReleasesAddContract1()
    R.LabelReleasesTypeContract()
    R.LabelReleasesSelection()
    // save and validate created data on edit page
    R.LabelReleasesClickSave()
    R.LabelReleasesValidateCreatedTitle()
    R.LabelReleasesValidateCreatedVersion()
    R.LabelReleasesValidateCreatedArtist()
    R.LabelReleasesValidateCreatedForeignID()
    R.LabelReleasesValidateCreatedProjectID()
    R.LabelReleasesValidateCreatedFormat()
    R.LabelReleasesValidateCreatedPriceCat()
    R.LabelReleasesValidateCreatedMainDealerPrice()
    // validate created data on index page 
    R.LabelReleasesLinkClick()
    R.LabelReleasesValidateTitle()
    R.LabelReleasesValidateArtist()
    R.LabelReleasesValidateCatNo()
    R.LabelReleaseValidateBarCode()
    // update on edit page and input fields
    R.LabelReleasesUpdateCreatedClick()
    R.LabelReleasesUpdateTitle()
    R.LabelReleasesUpdateVersion()
    R.LabelReleasesUpdateArtist()
    R.LabelReleasesUpdateProjectID()
    R.LabelReleasesUpdateCatNo()
    // save and validate updated data on edit page
    R.LabelReleasesUpdateClickSave()
    R.LabelReleaseesValidateUpdatedTitle()
    R.LabelReleasesValidateUpdatedVersion()
    R.LabelReleasesValidateUpdatedArtist()
    R.LabelReleasesValidateUpdatedForeignID()
    R.LabelReleasesValidateUpdatedProjectID()
    // validate updated data on index page
    R.LabelReleasesClickReleasesLink1()
    R.LabelReleasesValidateUpdatedTitle1()
    R.LabelReleasesValidateUpdatedArtist1()
    R.LabelReleaseValidateUpdatedCatNo1()
    R.LabelReleaseValidateUpdatedBarCode1()
    R.LabelReleaseValidateUpdatedFormat1()
    // Delete Release 
    R.LabelReleasesDeleteClickCreated()
    R.LabelReleasesClickDeleteButton()
    R.LabelReleasesClickDeleteModal()
  });
  it('Smoke-Period-E2E-CRUD', () => {
    const PD = new SmokeLabelPageObject();
    PD.LabelPeriodStatementsMenu()
    PD.LabelPeriodSubmenu()
    PD.LabelPeriodCreate()
    // create page
    PD.LabelPeriodNameField()
    PD.LabelPeriodAccountingPeriodTypeDD1()
    PD.LabelPeriodAccountingPeriodTypeDDSelection2()
    PD.LabelPeriodYear()
    PD.LabelPeriodYearDDSelection()
    PD.LabelPeriodAccountingPeriod()
    PD.LabelPeriodAccountingPeriodDDSelection()
    // Start Date
    PD.LabelPeriodStartDateClick()
    PD.LabelPeriodStartDateClick1()
    PD.LabelPeriodStartDateType()
    // End Date
    PD.LabelPeriodEndDateClick()
    PD.LabelPeriodEndDateClick1()
    PD.LabelPeriodEndDateType()
    // Sales Date
    PD.LabelPeriodAccountingDateClick()
    PD.LabelPeriodAccountingDateClick1()
    PD.LabelPeriodAccountingDateType()
    PD.LabelPeriodNextButton()
    // Select Sales
    PD.LabelPeriodSelectAllRB()
    PD.LabelPeriodIncludeSelected()
    PD.LabelPeriodNextButton1()
    // Select Cost
    PD.LabelPeriodClickSelected()
    PD.LabelPeriodIncludeSelected1()
    PD.LabelPeriodCalculate()
    // validate created data on index page
    PD.LabelPeriodOutsideClick()
    PD.LabelPeriodValidateCreatedName()
    PD.LabelPeriodValidateCreatedYear()
    PD.LabelPeriodValidateCreatedPeriod()
    PD.LabelPeriodValidateCreatedStatus()
    // validate created data on period page
    PD.LabelPeriodClickCreated()
    PD.LabelPeriodProcessing('Cleaning Previous Data')
    PD.LabelPeriodProcessing('Updating Catalogue Data')
    PD.LabelPeriodProcessing('Calculating Costs')
    PD.LabelPeriodProcessing('Calculating Sales')
    PD.LabelPeriodProcessing('Flushing Catalogue Data to Output')
    PD.LabelPeriodProcessing('Getting Period Data')
    PD.LabelPeriodProcessing('Creating Period Files')
    PD.LabelPeriodProcessing('Creating Statements')
    PD.LabelPeriodProcessing('Setting Statements Data')
    PD.LabelPeriodProcessing('Creating Statements Files')
    PD.LabelPeriodProcessing('Creating Zip of All Statements')
    PD.LabelPeriodGrossRevenue()
    PD.LabelPeriodNetPayout()
    PD.LabelPeriodGrossCrost()
    PD.LabelPeriodRechargedCosts()
    PD.LabelPeriodInputUnits()
    PD.LabelPeriodInputSalesLines()
    // validate statement created
    PD.LabelPeriodClickStatementsTab()
    PD.LabelPeriodValidateExisting()
    // update on edit page period
    PD.LabelPeriodClickEdit()
    PD.LabelPeriodEditName()
    PD.LabelPeriodEditNext()
    PD.LabelPeriodEditNext1()
    PD.LabelPeriodEditCalculation()
    // validate updated data on period page
    PD.LabelPeriodClickUpdated()
    PD.LabelPeriodProcessing('Cleaning Previous Data')
    PD.LabelPeriodProcessing('Updating Catalogue Data')
    PD.LabelPeriodProcessing('Calculating Costs')
    PD.LabelPeriodProcessing('Calculating Sales')
    PD.LabelPeriodProcessing('Flushing Catalogue Data to Output')
    PD.LabelPeriodProcessing('Getting Period Data')
    PD.LabelPeriodProcessing('Creating Period Files')
    PD.LabelPeriodProcessing('Creating Statements')
    PD.LabelPeriodProcessing('Setting Statements Data')
    PD.LabelPeriodProcessing('Creating Statements Files')
    PD.LabelPeriodProcessing('Creating Zip of All Statements')
    // validate created data on period page
    // PD.LabelPeriodClickCreated()
    // PD.LabelPeriodValidateHeader()
    // validate updated data on index page
    PD.LabelPeriodsClickLink()
    PD.LabelPeriodClickUpdatedIndex()
    PD.LabelPeriodValidateStatus()
    // delete data
    PD.LabelPeriodDeleteClickCreated()
    PD.LabelPeriodClickDeleteButton()
    PD.LabelPeriodClickDeleteModal()
  });
  it('Smoke-Statements-E2E-CRUD', () => {
    const S = new SmokeLabelPageObject();
    S.LabelStatementsMenu()
    S.LabelStatementsSubMenu()
    // index page validation
    S.LabelStatementsSearchBar()
    S.LabelStatementsPeriodDD()
    S.LabelStatementsTypeDD()
    S.LabelStatementsFilter()
    S.LabelStatementsNameHeader()
    S.LabelStatementsGrossSalesHeader()
    S.LabelStatementsCreatedHeader()
    S.LabelStatementsStatusHeader()
    // create statement via period
    S.LabelStatementsClickPeriod()
    S.LabelStatementsPeriodClickCreate()
    S.LabelStatementsNameField()
    S.LabelStatementsAccountingPeriodTypeDD()
    S.LabelStatementsAccountingPeriodTypeDDSelection()
    S.LabelStatementsYear()
    S.LabelStatementsYearDDSelection()
    S.LabelStatementsAccountingPeriod()
    S.LabelStatementsAccountingPeriodDD()
    // date picker
    S.LabelStatementsStartDateType()
    S.LabelStatementsEndDateType()
    S.LabelStatementsAccountingDateType()
    S.LabelStatementsNextButton()
    // selecting sales
    S.LabelStatementCheckAllCB()
    S.LabelStatementsIncludeSelected()
    S.LabelStatementsNextButton1()
    // Select Cost
    S.LabelStatementsClickSelected()
    S.LabelStatementsIncludeSelected1()
    S.LabelStatementsCalculate()
    // Insert condition statement here
    S.LabelPeriodProcessing('Cleaning Previous Data')
    S.LabelPeriodProcessing('Updating Catalogue Data')
    S.LabelPeriodProcessing('Calculating Costs')
    S.LabelPeriodProcessing('Calculating Sales')
    S.LabelPeriodProcessing('Flushing Catalogue Data to Output')
    S.LabelPeriodProcessing('Getting Period Data')
    S.LabelPeriodProcessing('Creating Period Files')
    S.LabelPeriodProcessing('Creating Statements')
    S.LabelPeriodProcessing('Setting Statements Data')
    S.LabelPeriodProcessing('Creating Statements Files')
    S.LabelPeriodProcessing('Creating Zip of All Statements')
    // validate statement in period
    S.LabelStatementsValidateCreated()
    S.LabelStatementsTabLink()
    S.LabelStatementsValidateExisting()
    // validate statement index page
    S.LabelStatementsSubMenuClick()
    S.LabelStatementsSearchBarType()
    S.LabelStatementsSearchIcon()
    S.LabelStatementsCreated()
    // add statement on period
    S.LabelStatementsClickPeriod2()
    S.LabelSatementsClickCreatedPeriod2()
    S.LabelStatementsClickStatementsTab2()
    S.LabelStatementsClickCreateStatements()
    S.LabelStatementsContract()
    S.LabelStatementsContractSelection()
    S.LabelStatementsContractCreate()
    S.LabelStatementsValidateCreatedContract()
    // Validate that Statement is on Statement index page
    S.LabelStatementsClickSatementsSubMenu3()
    S.LabelSatementsSearchCreated()
    S.LabelStatementsClickSearchIcon2()
    S.LabelStatementsValidateSearch()
    S.LabelStatementsClickSearch()
    // Go to Periods and Delete
    S.LabelStatementsGotoPeriod()
    S.LabelStatementsClickSelected1()
    S.LabelStatementsClickDeleteButton()
    S.LabelStatementsClickDeleteModal()
  });
  it('Smoke-Costs-E2E-CRUD', () => {
    const CO = new SmokeLabelPageObject();
    CO.LabelCostsSalesMenu()
    CO.LabelCostsSubMenu()
    // Cost Page Content Validation
    CO.LabelCostsSearchBar()
    CO.LabelCostsExportButton()
    CO.LabelCostsImportButton()
    CO.LabelCostsDeleteButton()
    CO.LabelCostsArchiveButton()
    CO.LabelCostsCreateButton()
    CO.LabelCostsArchiveDD()
    CO.LabelCostsNameHeader()
    CO.LabelCostsAmountHeader()
    CO.LabelCostsDescriptionHeader()
    CO.LabelCostsTargetPeriod()
    CO.LabelCostsTypeHeader()
    CO.LabelCostsCreatedArt()
    CO.LabelCostsReported()
    // Create Cost
    CO.LabelCostsClickCreateButton()
    CO.LabelCostsTypeNameField()
    CO.LabelCostsTypeAmountField()
    CO.LabelCostsDateField()
    CO.LabelCostsClickOutside()
    CO.LabelCostsTypeDD()
    CO.LabelCostsTypeDDSelection()
    CO.LabelCostsTerritorDD()
    CO.LabelCostsTerritoryDDSelection()
    CO.LabelCostsInvoiceNoField()
    CO.LabelCostsTargetPeriodField()
    CO.LabelCostsDescriptionField()
    // save and validate created data
    CO.LabelCostsClickSaveButton()
    CO.LabelCostsValidateName()
    CO.LabelCostsValidateAmount()
    CO.LabelCostsValidateDate()
    CO.LabelCostsValidateType()
    CO.LabelCostsValidateTerritory()
    CO.LabelCostsValidateInvoice()
    CO.LabelCostsValidateTargetPeriod()
    CO.LabelCostsValidateDescription()
    // validate created data on index page
    CO.LabelCostsLink()
    CO.LabelCostsValidatedCreatedName()
    CO.LabelCostsValidateCreatedAmount()
    CO.LabelCostsValidateCreatedDesc()
    CO.LabelCostsValidateCreatedTargetPeriod()
    CO.LabelCostsValidateCreatedType()
    // update data on edit page
    CO.LabelCostsClickCreated()
    CO.LabelCostsEditName()
    CO.LabelCostsEditAmount()
    CO.LabelCostsEditInvoiceNo()
    // validate updated data on edit page
    CO.LabelCostsEditClickSave()
    CO.LabelCostsUpdatedName()
    CO.LabelCostsUpdatedAmount()
    CO.LabelCostsUpadatedInvoiceNo()
    // validate updated data on index page
    CO.LabelCostsClickLink1()
    CO.LabelCostsValidateUpdatedName()
    CO.LabelCoststValidateUpdatedAmount()
    CO.LabelCostsValidateUpdatedDesc()
    // Delete Cost
    CO.LabelCostsDeleteCreated()
    CO.LabelCostsClickDeleteButton()
    CO.LabelCostsClickDeleteModalButton()
  });
  it('Smoke-Sales-Templates-E2E-CRUD', () => {
    const TE = new SmokeLabelPageObject();
    TE.LabelTemplatesSalesMenu()
    TE.LabelTemplatesSubMenu()
    TE.LabelTemplatesCreateButton()
    TE.LabelTemplatesCreateFromNew()
    // Calculation Tab
    TE.LabelTemplatesClickCalculationsTab()
    TE.LabelTemplatesAddCalculation()
    TE.LabelTemplatesWhenDD()
    TE.LabelTemplatesAddCondition()
    TE.LabelTemplatesInputTypeDD()
    TE.LabelTemplatesInputTypeDDSelection()
    TE.LabelTemplatesInputValue()
    TE.LabelTemplatesComparisonDD()
    TE.LabelTemplatesComparisonSelectionDD()
    TE.LabelTemplatesOutputFieldDD()
    TE.LabelTemplatesOutputFieldDDSelection()
    // Overview Tab
    TE.LabelTemplatesClickOverviewTab()
    TE.LabelTemplatesNameField()
    TE.LabelTemplatesSource()
    TE.LabelTemplatesTabNumber()
    TE.LabelTemplatesHeaderRow()
    TE.LabelTemplatesStartingRow()
    TE.LabelTemplatesUploadFile()
    TE.LabelTemplatesClickSaveButton()
    // Setting Example Lines
    TE.LabelTemplates1stField()
    TE.LabelTemplates1stFieldType()
    TE.LabelTemplates1stFieldSelect()
    // 2nd column
    TE.LabelTemplates2ndField()
    TE.LabelTemplates2ndFieldType()
    TE.LabelTemplates22ndFieldSelect()
    // 3rd
    TE.LabelTemplates3rdField()
    TE.LabelTemplates3rdFieldType()
    TE.LabelTemplates3rdFieldSelect()
    // 4th
    TE.LabelTemplates4thField()
    TE.LabelTemplates4thFieldType()
    TE.LabelTemplates4thFieldSelect()
    // 5th
    TE.LabelTemplates5thField()
    TE.LabelTemplates5thFieldType()
    TE.LabelTemplates5thFieldSelect()
    // 6th
    TE.LabelTemplates6thField()
    TE.LabelTemplates6thFieldType()
    TE.LabelTemplates6thFieldSelect()
    // 7th
    TE.LabelTemplates7thField()
    TE.LabelTemplates7thFieldType()
    TE.LabelTemplates7thFieldSelect()
    // 8th
    TE.LabelTemplates8thField()
    TE.LabelTemplates8thFieldType()
    TE.LabelTemplates8thFieldSelect()
    // 9th
    TE.LabelTemplates9thField()
    TE.LabelTemplates9thFieldType()
    TE.LabelTemplates9thFieldSelect()
    // 10th
    TE.LabelTemplates10thField()
    TE.LabelTemplates10thFieldType()
    TE.LabelTemplates10thFieldSelect()
    // 11th
    TE.LabelTemplates11thField()
    TE.LabelTemplates11thFieldType()
    TE.LabelTemplates11thFieldSelect()
    // 12th
    TE.LabelTemplates12thField()
    TE.LabelTemplates12thFieldType()
    TE.LabelTemplates12thFieldSelect()
    TE.LabelTemplatesClickSave2()
    // validate on index page
    TE.LabelTemplatesClickTemplateLink()
    TE.LabelTemplatesValidateCreated()
    TE.LabelTemplatesValidateSource()
    // update template
    TE.LabelTemplatesClickCreated()
    TE.LabelTemplatesUpdateName()
    TE.LabelTemplatesUpdateSource()
    // save and validate on edit page
    TE.LabelTemplatesClickSave3()
    TE.LabelTemplatesValidateEditedName()
    TE.LabelTemplatesValidateEditedSource()
    // validate on index page
    TE.LabelTemplatesClickTemplatesLink2()
    TE.LabelTemplatesValidateEditedName1()
    TE.LabelTemplatesValidateEditedSource1()
    // delete
    TE.LabelTemplatesDeleteCreated()
    TE.LabelTemplatesClickDelete()
    TE.LabelTemplatesClickDeleteModal()
  });
  it('Smoke-Sales-Ingestion-E2E-CRUD', () => {
    const SI = new SmokeLabelPageObject();
    SI.LabelSalesIngestSalesMenu()
    SI.LabelSalesSubMenu()
    // index page content validation
    SI.LabelSalesValidHeader()
    SI.LabelSalesStatusHeader()
    SI.LabelSalesReportedHeader()
    SI.LabelSalesArchived()
    SI.LabelSalesNewHeader()
    SI.LabelSalesFilterHeader()
    SI.LabelSalesExportButton()
    SI.LabelSalesRerunButton()
    SI.LabelSalesDeleteButton()
    SI.LabelSalesArchiveButton()
    SI.LabelSalesCreateButton()
    SI.LabelSalesNameHeader()
    SI.LabeLSalesInvoiceHeader()
    SI.LabelSalesTargetHeader()
    SI.LabelSalesAccountHeader()
    SI.LabelSalesGrossHeader()
    SI.LabelSalesNetHeader()
    SI.LabelSalesInvalidLinesHeader()
    SI.LabelSalesDeleteIfExist()
    // create sales ingestion
    SI.LabelSalesCreate()
    SI.LabelSalesUpload()
    SI.LabelSalesComplete()
    // validate data on index page
    SI.LabelSalesValidateUploaded()
    // sales page
    SI.LabelSalesClickUploadedFile()
    SI.LabelSalesCompleteClick()
    SI.LabelSalesRevalidate()
    // update sales
    SI.LabelSalesUploadedClick()
    SI.LabelSalesTitleHeader()
    SI.LabelSalesEditButton()
    SI.LabelSalesEditName()
    SI.LabelSalesClickSave()
    SI.LabelSalesClickSalesLink()
    SI.LabelSalesValidateEditedName()
    // delete sales
    SI.LabelSalesDeleteUpload()
    SI.LabelSalesDeleteClickEdit()
    SI.LabelSalesClickDeleteButton()
    SI.LabelSalesClickDeleteModal()
  });
  it('Smoke-Configurations-E2E-CRUD', () => {
    const SC = new SmokeLabelPageObject();
    SC.LabelConfigSettings()
    SC.LabelConfigGeneral()
    // configuration page content validation
    SC.LabelConfigTab()
    SC.LabelConfigCurrencyHeader()
    SC.LabelConfigAccountingPeriodTypesHeader()
    SC.LabelConfigDistribChannelsHeader()
    SC.LabelConfigConfigurationsHeader()
    SC.LabelConfigPriceCategoriesHeader()
    SC.LabelConfigCatalogueGroupsHeader()
    SC.LabelConfigCostTypesHeader()
    SC.LabelConfigSourcesHeader()
    SC.LabelConfigPayeeCategoriesHeader()
    SC.LabelConfigCotractCategoriesHeader()
    // configuration page add data
    SC.LabelConfigClickAdd()
    SC.LabelConfigAccountingPeriodNewField()
    SC.LabelConfigAddPriceCategories()
    SC.LabelConfigPriceCategNewField()
    SC.LabelConfigAddCatalogueGroups()
    SC.LabelConfigCatalogueGroups()
    SC.LabelConfigAddSources()
    SC.LabelConfigAddPayeeCategories()
    SC.LabelConfigPayeeCategoriesNewField()
    SC.LabelConfigAddContractCategories()
    SC.LabelConfigContractCategories()
    // Save and validate added data
    SC.LabelConfigClickSaveButton()
    SC.LabelConfigSuccessMessage()
    // added content validation
    SC.LabelConfigAccountingPeriodValidation()
    SC.LabelConfigCatalogueGroupsValidation()
    SC.LabelConfigPayeeCategories()
    SC.LabelConfigContractCategories1()
    // deletion of added data
    SC.LabelConfigDelete2()
    SC.LabelConfigDelete3()
    SC.LabelConfigDelete4()
    SC.LabelConfigDelete6()
    SC.LabelConfigDelete7()
    SC.LabelConfigClickSave1()
    // SC.LabelConfigClickSave2()
  });
  it('Smoke-Users-E2E-CRUD', () => {
    const U = new SmokeLabelPageObject();
    U.LabelUserSettingsMenu()
    U.LabelUserSubmenu()
    // create admin user
    U.LabelUserCreateButton()
    U.LabelUserUserTypeDD()
    U.LabelUserUserTypeDDSelection()
    U.LabelUserEmailField()
    U.LabelUserSaveButton()
    // save and validate created admin user on index page
    U.LabelUserSaveModal()
    U.LabelUsersValidateCreated()
    U.LabelUserValidateAdminTag()
    // delete admin data
    U.LabelUserClickCheckButton()
    U.LabelUserClickDeleteButton()
    U.LabelUserClickDeleteModal()
    // create standard user
    U.LabelUserClickCreate2()
    U.LabelUserEnterEmail()
    // save validate created standard user on index page
    U.LabelUserClickSave2()
    U.LabelUserClickSaveModal2()
    U.LabelValidateCreated()
    // delete standard user 
    U.LabelUserClickCheckButton1()
    U.LabelUserClickDeleteButton1()
    U.LabelUserClickDeleteModal2()
  });
  it('Smoke-Payments-E2E-CRUD', () => {
    const PA = new SmokeLabelPageObject();
    PA.LabelPaymentsMenu()
    // payment groups index page validation
    PA.LabelPaymentsSearchBar()
    PA.LabelPaymentsDeleteButton()
    PA.LabelPaymentsCreateButton()
    PA.LabelPaymentsNameHeader1()
    PA.LabelPaymentsStatusHeader()
    PA.LabelPaymentsCreatedHeader()
    // payment index page validation
    PA.LabelPaymentsClickCreate()
    PA.LabelPaymentsOverviewHeader()
    PA.LabelPaymentsNameHeader()
    PA.LabelPaymentsSaveButton()
    PA.LabelPaymentsPayeeHeader()
    PA.LabelPaymentsNameHeader2()
    PA.LabelPaymentsCurrencyHeader()
    PA.LabelPaymentsAmountHeader()
    PA.LabelPaymentsStatusHeader1()
    // Add Payment
    PA.LabelPaymentsEnterName()
    PA.LabelPaymentsClickSave()
    PA.LabelPaymentsClickCreate1()
    PA.LabelPaymentsEnterName1()
    PA.LabelPaymentsEnterAmount()
    PA.LabelPaymentsPayee()
    PA.LabelPaymentsPayeeTypeAdvance()
    PA.LabelPaymentsPayeeClickSave()
    // Validate Created Data
    PA.LabelPaymentsValidatePayee()
    PA.LabelPaymentsValidateName()
    PA.LabelPaymentsValidateCurrency()
    PA.LabelPaymentsValidateAmount()
    PA.LabelPaymentsValidateStatus()
    // Update Payment
    PA.LabelPaymentsClickCreated()
    PA.LabelPaymentsUpdateName()
    PA.LabelPaymentsUpdateAmount()
    PA.LabelPaymentsClickSave2()
    PA.LabelPaymentsGroupsLink()
    // Validate Updated Data
    PA.LabelPaymentsUpdatedPayee()
    PA.LabelPaymentsUpdatedName()
    PA.LabelPaymentsUpdatedCurrency()
    PA.LabelPaymentsUpdatedAmount()
    // delete payment
    PA.LabelPaymentsClickCreated1()
    PA.LabelPaymentsClickDelete()
    PA.LabelPaymentsClickDeleteModal()
    // delete payment groups
    PA.LabelPaymentsClickDeleteGroup()
    PA.LabelPaymentsClickDeleteGroupModal()










  })
})