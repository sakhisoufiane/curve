// Created by Jesli 
// August 25, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression composer tests', () => {
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
  });
  it('C1962 Validate Works on Sidebar', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
  });
  it('C1963 Validate Works Page Content', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Works Page content validation
    w.WorksSearchBarValidate()
    w.WorksBulkDropdClick()
    w.WorksBulkDropdValidate()
    w.WorksFlushContractsToWorksValidate()
    w.WorksBulkApproveValidate()
    w.WorksBulkHoldValidate()
    w.WorksBulkResumeValidate()
    w.WorksBulkUpdateDeliveryValidate()
    w.WorksDeliverButtonValidate()
    w.WorksExportButtonValidate()
    w.WorksImportButtonValidate()
    w.WorksDeleteButtonValidate()
    w.WorksCreateValidate()
    w.WorksCatGroupValidate()
    w.WorksCatGroupIndexType('CAT 1')
    w.TracksCatGroupindexSelClick()
    w.WorksContractFieldType('Test Gelo 100')
    w.TracksContractIndexSelClick()
    w.WorksCreateAfterValidate()
    w.WorksCreateAfterType('04/01/2021')
    w.WorksCreatedAfterDoneClick()
    w.WorksCreatedBeforeValidate()
    w.WorksCreatedBeforeType('01/12/2024')
    w.WorksCreatedAfterDoneClick()
    w.WorksComposerFieldValidate()
    w.WorksComposerFieldType('test')
    w.WorksPublisherFieldValidate()
    w.WorksPublisherFieldType('test')
    // w.WorksValidDDValidate()
    w.WokrsStatusDropdClick()
    w.WorksStatusDropdSelOnholdValidate()
    w.WorksStatusDropdSelReady4ApprvalValidate()
    w.WorksStatusDropdSelInvalidValidate()
    w.WorksStatusDropdSelClick()
    w.WorksTotalCounterValidate()
    w.WorksShowAllValidate()
    w.WorksShowing25PerPageValidate()
    w.PayeeNextButtonValidate()
    w.PayeePreviousButtonValidate()
    w.PayeePageNumberButtonsIndexValidate()
    w.WorksParticipationValidate()
    w.WorksParticipationType('1')
    w.WorksOwnershipValidate()
    w.WorksOwnershipType('test')
    w.WorksFilterButtonValidate()
    w.WorksTitleHeaderValidate()
    w.WorksComposerHeaderValidate()
    w.WorksMainIdentifHeaderValidate()
    w.WorksCreatedHeaderValidate()
    w.WorksOwnershipHeaderValidate()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorkskTableHeadValidate('Title')
    w.WorkskTableHeadValidate('Composer')
    w.WorkskTableHeadValidate('Main identifier')
    w.WorkskTableHeadValidate('Created')
    w.WorkskTableHeadValidate('Ownership')
    w.WorkskTableHeadValidate('Participation')
    w.WorkskTableHeadValidate('Status')
  });
  it('C1964	Validate Works Create Page Content - Overview', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Create a Work
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    w.WorksAddAltTitleClick()
    w.WorksAltTitleFieldType('A Work Smoke test')
    w.WorksLanguageOvrvwDDClick()
    w.WorksLanguageOvrvwSelectionClick()
    w.WorksCategoryClick()
    w.WorksCategoryJazzClick()
    w.WorksCategoryClassicalClick()
    w.WorksCategoryUndefinedClick()
    w.WorksLanguageConfigDDClick()
    w.WorksLanguageConfigSelectionClick()
    w.WorksCompositeTypeSelect()
    w.WorksWorkVersionSelect()
    w.WorksWorkVersionModificationSelect()
    w.WorksComposerType('Gelo')
    w.WorksForeignIDType()
    w.WorksProjectIDType()
    w.WorksMainIdentifierType('W01928192')
    w.WorksPriorityValidate()
    w.WorksProductionLibrary()
    w.WorksCatGroupsType('CAT 1')
    w.WorksISWCType('test')
    w.WorksTuneCodeType('test')
    w.WorksTuneCopyrightDateType('02/05/2022')
    w.WorksCopyrightDateDoneClick()
    w.WorksLabelCopyType('text')
    w.WorksNotesType('test')
    // Upper right side of edit page validate
    w.WorksApproveButtonValidate()
    w.WorkHoldValidate()
    w.WorksCopyValidate()
    // add performer
    w.WorksAddPerformerClick()
    w.WorksPerformerFieldType('test')
    w.WorksPerformerDeleteClick()
    // add track
    w.WorksAddTrackClick()
    w.WorksAddTrackFieldType('test')
    w.WorksAddTrackDeleteButtonClick()
    // create track
    w.WorksCreateTrackClick()
    w.WorksTrackTitleType('test')
    w.WorksTrackVersionType('123')
    w.WorksTrackArtistType('test')
    w.WorksTrackForeignIDType('test')
    w.WorksTracksProjectIDType('test')
    w.WorksTracksISRCType('test')
    w.WorksTracksCancelButtonClick()
    w.WorksCreateTrackClick()
    w.WorksTracksCreateButtonValidate()
    w.WorksTracksCancelButtonClick()
  });
  it('C1965 Validate Works Create Page Content - Territories', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Create a Work
    w.WorksCreateClick()
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksOceaniaContinent()
  });
  it('C1966, C3102, C3103 Validate Works Create Page Content - IP Chain ', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to territory tab
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAfricaContinent()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksEuropeContinent()
    w.WorksOceaniaContinent()
    // go to ip chain tab
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddCompValidate()
    w.WorksAddPubClick()
    w.WorksAddPubDeleteClick()
    w.WorksAddTerritoryClick()
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategoryOriginalSelect()
    w.WorksOwnMechValidate()
    w.WorksOwnPerfValidate()
    // w.WorksOwnMechType()
    // w.WorksOwnPerfType()
    // Composer
    w.WorskAddCompChainClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    // save works
    w.WorksSaveClick()
    w.WorksErrorValidate()
    w.WorksTerritoriesTabClick()
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  });
  it('C1967, C1977 Validate Works Create Page Content - Rights', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to rights tab
    w.WorksRightsTabClick()
    w.WorksAddContractPariticipationRightsClick()
    w.TracksRightsContractFieldType('test gelo 100')
    w.ContractCrossContractSelectGelo100()
    w.WorksAddSubContractClick()
    w.WorksAddSubConFieldType('gelo test')
    w.TracksMechContractSelClick()
    w.WorksParticipationRatesDeleteButtonClick()
    w.WorksSpecificParticipationRatesAddContractClick()
    w.WorksSPRContractFieldType('Test Gelo 100')
    w.ContractCrossContractSelectGelo100()
    w.WorksSPRDistribChannelDropdClick()
    w.WorksSPRSourceType('test')
    w.WorksTerritorySPRClick()
    w.WorksTerritoryDdSelClick()
    w.WorksSPRRateType('100')
    w.WorksParticipationRatesDeleteButtonClick()
  });
  it('C1968, C1978, C1979 Validate Works Create Page Content - Aliases', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to Alias tab
    w.WorksAliasesTab()
    w.WorksAddIdentifierClick()
    w.WorksAliasesSocietyDropdClick()
    w.CompoSocietyDropdSelClick()
    w.WorksAliasIdentifierType('PRS')
    w.WorksAliasesDeleteClick()
    w.WorksAddAliasButtonClick()
    w.WorksAliasesFieldType('aaa')
    w.WorksAliasesDeleteClick()
  });
  it('C1969 Validate Works Create Page Content - Deliveries', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to Dlvries tab
    w.WokrsDlvrsTabClick()
    w.WorksDlvrsTableHeaderValidate('Partner')
    w.WorksDlvrsTableHeaderValidate('ID')
    w.WorksDlvrsTableHeaderValidate('Original')
    w.WorksDlvrsTableHeaderValidate('Last')
    w.WorksDlvrsTableHeaderValidate('Last Ack')
    w.WorksDlvrsTableHeaderValidate('Status')
    w.WorksDlvrsDropdForceDeliverySelect()
    w.WorksDlvrsDropdHoldSelect()
    w.WorksDlvrsDropdResumeSelect()
    w.WorksDlvrsDropdMarkedDeliveredSelect()
    w.WorksDlvrsDropdMarkedAcceptedSelect()

  });
  it('C1970 Validate Works Create Page Content - Analytics', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorkskCreatedClick('C Regression Link')
    w.WorksAnalyticsTabClick()
    w.AnalyticsFilterValidateIfExpanded()
    w.ContractsAnalyticsFieldDropdValidate()
    w.ContractsAnalyticsFieldValueValidate()
    w.ContractsAnalyticsAndButtonValidate()
    w.ContractsAnalyticsOrButtonValidate()
    w.ContractsAnalyticsComparisonrButtonValidate()
    w.ContractsAnalyticsGoButtonValidate()
    w.PayeeAnalyticsSelectGraphsCBValidation('Distribution Channels')
    w.PayeeAnalyticsSelectGraphsCBValidation('Configurations')
    // w.PayeeAnalyticsSelectGraphsCBValidation('Territories')
    w.PayeeAnalyticsSelectGraphsCBValidation('Sources')
    w.PayeeAnalyticsSelectGraphsCBValidation('Sub Sources')
    w.PayeeAnalyticsSelectGraphsCBValidation('Revenues over time')
    w.PayeeAnalyticsSelectGraphsCBValidation('Average Rates')
    w.PayeeAnalyticsSelectGraphsCBValidation('Contract Breakdown')

  });
  it('C1971	Validate Works Modification Content when Work Version set to Modification', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Create a Work
    w.WorksCreateClick()
    w.WorksWorkVersionModificationSelect()
    w.WorksArrangementTypeValidate()
    w.WorksLyricAdaptationValidate()
    w.WorksOriginalWorkTitleValidate('test')
    w.WorksISWCValidate('test')
    w.WorksOriginalWritersLnameValidate('test')
    w.WorksOriginalWritersFnameValidate('test')
  });
  it('C1973	Validate Works Adding Catalogue Groups', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Create a Work
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    w.WorksCatGroupsType('CAT 1')
    w.TracksCatGroupindexSelClick()
  });
  it('C1974, C1975, C1976	Validate Works Adding Performers', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Create a Work
    w.WorksCreateClick()
    // add performer
    w.WorksAddPerformerClick()
    w.WorksPerformerFieldType('test')
    w.WorksPerformerDeleteClick()
    // add track
    w.WorksAddTrackClick()
    w.WorksAddTrackFieldType('test')
    w.WorksAddTrackDeleteButtonClick()
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategorySelect()
    w.WorksOwnMechType()
    w.WorksOwnPerfType()
    // Composer
    w.WorksAddCompClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCategoryDDLyricsAndMusicSelect()
    w.WorksCategoryDDMusicSelect()
    w.WorksCategoryDDLyricsSelect()
    w.WorksCategoryDDSubArrangerSelect()
    w.WorksCategoryAdapterDDSelect()
    w.WorksCategorySubAuthorDDSelect()
    w.WorksCategoryTranslatorDDSelect()
  });
  it('C1981 Validate Works Required Fields', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Create a Work
    w.WorksCreateClick()
    w.WorksSaveClick()

  });
  it('C1982,C1983,C1985,C2000 Validate Works Create Function ', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Works Page content validation
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    // Create a Work
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    w.WorksAddAltTitleClick()
    w.WorksAltTitleFieldType('A Work Smoke test')
    w.WorksLanguageOvrvwDDClick()
    w.WorksLanguageOvrvwSelectionClick()
    w.WorksCategoryClick()
    w.WorksLanguageConfigDDClick()
    w.WorksLanguageConfigSelectionClick()
    w.WorksCompositeTypeSelect()
    w.WorksWorkVersionSelect()
    w.WorksComposerType('Gelo')
    w.WorksForeignIDType()
    w.WorksProjectIDType()
    w.WorksMainIdentifierType('W01928192')
    // Adding territory
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    // Adding IP Chain
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategorySelect()
    w.WorksOwnMechType()
    w.WorksOwnPerfType()
    // Composer
    w.WorksAddCompClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    w.WorksSaveClick()
    // Validate Created Data
    w.WorksLinkClick()
    w.WorksCreatedValidate('A Work Smoke')
    w.WorksComposerValidate('Gelo')
    w.WorksComposerValidate('W01928192')
    // Update Edit page Works
    w.WorkskCreatedClick('A Work Smoke')
    w.WorksTitleType('A Work Smoke Update')
    w.WorksComposerType('Zafra')
    w.WorksMainIdentifierType('BB00099998')
    w.WorksSaveClick()
    // Validated Updated Data
    w.WorksValidateUpdatedTitle()
    w.WorksValidateUpdatedComposer()
    w.WorksValidateUpdatedMainID()
    w.WorksLinkClick()
    // Validate Index Page
    w.WorksCreatedValidate('A Work Smoke Update')
    w.WorksComposerValidate('Zafra')
    w.WorksComposerValidate('BB00099998')
    // Delete Works
    w.WorkskCreatedClick('A Work Smoke Update')
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  });
  it('C1984, C1998, C1999 Validate Works Copy and delete Function', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Works Page content validation
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    // Go to create and validate copy function
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    w.WorksSaveClick()
    w.WorksCopyButtonClick()
    w.WorksSaveClick()
    w.WorksCopyButtonClick()
    w.WorksSaveClick()
    w.WorksLinkClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteSpecificClick()
    w.WorksDeleteIndexClick()
    w.WorksDeleteSelectedIndexClick()
    w.WorksDeleteModalIndexClick()
    w.WorksIndexCheckboxClick()
    w.WorksDeleteIndexClick()
    w.WorksDeleteSelectedIndexClick()
    w.WorksDeleteModalIndexClick()

  });
  it('C1986, C1987, C1988, C1989 ,C1990, C1991,C1992, C1993 C1994 Validate Filter Function', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // Works Page content validation
    w.WorksSearchBarValidate()
    w.WorksBulkDropdClick()
    w.WorksBulkDropdValidate()
    w.WorksFlushContractsToWorksValidate()
    w.WorksBulkApproveValidate()
    w.WorksBulkHoldValidate()
    w.WorksBulkResumeValidate()
    w.WorksBulkUpdateDeliveryValidate()
    w.WorksDeliverButtonValidate()
    w.WorksExportButtonValidate()
    w.WorksImportButtonValidate()
    w.WorksDeleteButtonValidate()
    w.WorksCreateValidate()
    w.WorksCatGroupValidate()
    w.WorksCatGroupIndexType('CAT 1')
    w.TracksCatGroupindexSelClick()
    w.WorksContractFieldType('Test Gelo 100')
    w.TracksContractIndexSelClick()
    w.WorksCreateAfterValidate()
    w.WorksCreateAfterType('04/01/2021')
    w.WorksCreatedAfterDoneClick()
    w.WorksCreatedBeforeValidate()
    w.WorksCreatedBeforeType('01/12/2024')
    w.WorksCreatedAfterDoneClick()
    w.WorksComposerFieldValidate()
    w.WorksComposerFieldType('test')
    w.WorksPublisherFieldValidate()
    w.WorksPublisherFieldType('test')
    // w.WorksValidDDValidate()
    w.WokrsStatusDropdClick()
    w.WorksStatusDropdSelOnholdValidate()
    w.WorksStatusDropdSelReady4ApprvalValidate()
    w.WorksStatusDropdSelInvalidValidate()
    w.WorksStatusDropdSelClick()
    w.WorksTotalCounterValidate()
    w.WorksShowAllValidate()
    w.WorksShowing25PerPageValidate()
    w.PayeeNextButtonValidate()
    w.PayeePreviousButtonValidate()
    w.PayeePageNumberButtonsIndexValidate()
    w.WorksParticipationValidate()
    w.WorksParticipationType('1')
    w.WorksOwnershipValidate()
    w.WorksOwnershipType('test')
    w.WorksFilterButtonValidate()
    w.WorksTitleHeaderValidate()
    w.WorksComposerHeaderValidate()
    w.WorksMainIdentifHeaderValidate()
    w.WorksCreatedHeaderValidate()
    w.WorksOwnershipHeaderValidate()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorkskTableHeadValidate('Title')
    w.WorkskTableHeadValidate('Composer')
    w.WorkskTableHeadValidate('Main identifier')
    w.WorkskTableHeadValidate('Created')
    w.WorkskTableHeadValidate('Ownership')
    w.WorkskTableHeadValidate('Participation')
    w.WorkskTableHeadValidate('Status')
  });
  it('C1996 C1995 Validate Works Export Function', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // click export
    w.WorksExportButtonCick()
    w.NotifBellValidate('1', '1')
    w.PayeeExportNotifValidation('Works Export Ready')
    w.WorksFirstCheckboxClick()
    w.WorksExportButtonCick()
    w.NotifBellValidate('1', '1')
    w.PayeeExportNotifValidation('Works Export Ready')
  });
  it('C2003, C2002	Validate Works Import Function - Overwrite Blanks Unchecked', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // import data on composer
    w.WorksImportButtonClick()
    w.FileAttach('smoke-works-import.xlsx')
    w.WorksImportModalClick()
    // validate notifications
    w.NotifBellValidate('1', '1')
    w.NotifMsgValidate('Your Work Import Has Completed')
    w.WorksFilterButtonClick()
    // import data on composer
    w.WorksImportButtonClick()
    w.FileAttach('works-import-reg.xlsx')
    w.WorksImportModalClick()
    // validate notifications
    w.NotifBellValidate('1', '1')
    w.NotifMsgValidate('Your Work Import Has Completed')
    // validate on index page
    w.WorksImportedDataValidate('A Work Smoke')
    w.WorksImportedDataValidate('zzz composer 2')
    w.WorksImportedDataValidate('W12345')
    // delete imported data
    w.WorkskCreatedClick('A Work Smoke')
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  }); 
  it('C2004	Validate Works Import Function - Overwrite Blanks checked', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    // import data on composer
    w.WorksImportButtonClick()
    w.FileAttach('smoke-works-import.xlsx')
    w.WorksImportModalClick()
    // validate notifications
    w.NotifBellValidate('1', '1')
    w.NotifMsgValidate('Your Work Import Has Completed')
    w.WorksFilterButtonClick()
    // import data on composer
    w.WorksImportButtonClick()
    w.FileAttach('works-import-reg.xlsx')
    w.TracksOverwriteBlanks()
    w.WorksImportModalClick()
    // validate notifications
    w.NotifBellValidate('1', '1')
    w.NotifMsgValidate('Your Work Import Has Completed')
    // delete imported data
    w.WorkskCreatedClick('A Work Smoke')
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  }); 
  it('C3763 Validate Works Significant Update', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to territory tab
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAfricaContinent()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksEuropeContinent()
    w.WorksOceaniaContinent()
    // go to ip chain tab
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddCompValidate()
    w.WorksAddPubClick()
    w.WorksAddPubDeleteClick()
    w.WorksAddTerritoryClick()
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategoryOriginalSelect()
    w.WorksOwnMechValidate()
    w.WorksOwnPerfValidate()
    // w.WorksOwnMechType()
    // w.WorksOwnPerfType()
    // Composer
    w.WorskAddCompChainClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    // save works
    w.WorksSaveClick()
    w.WorksErrorValidate()
    w.WorksTerritoriesTabClick()
    // update title
    w.WorksApproveButtonClick()
    w.WorksOverviewTabClick()
    w.WorksTitleType('A Work Smokes')
    w.WorksSaveClick()
    w.WorksSignificantModalOkClick()
    // delete works
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  });
  it('C3762 Validate Works Multiple Approval & Hold/Resume', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to territory tab
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAfricaContinent()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksEuropeContinent()
    w.WorksOceaniaContinent()
    // go to ip chain tab
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddCompValidate()
    w.WorksAddPubClick()
    w.WorksAddPubDeleteClick()
    w.WorksAddTerritoryClick()
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategoryOriginalSelect()
    w.WorksOwnMechValidate()
    w.WorksOwnPerfValidate()
    // w.WorksOwnMechType()
    // w.WorksOwnPerfType()
    // Composer
    w.WorskAddCompChainClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    // save works
    w.WorksSaveClick()
    w.WorksErrorValidate()
    // go to link
    w.WorksLinkClick()
    w.WorksDeleteSpecificClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkHoldClick()
    w.WorksDeleteSpecificClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkHoldClick()
    w.WorksErrorPromptIndexValidate()
    w.WorksDeleteSpecificClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkResumeClick()
    w.WorksDeleteSpecificClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkResumeClick()
    w.WorksErrorPromptIndexValidate()
    w.WorksDeleteSpecificClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkApproveClick()
    w.WorksDeleteSpecificClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkApproveClick()
    w.WorksErrorPromptIndexValidate()
    w.WorksDeleteSpecificClick()
    w.WorksDeleteIndexClick()
    w.WorksDeleteSelectedIndexClick()
    w.WorksDeleteModalIndexClick()
    

    
  });
  it('C1997 Validate Works Deliver Function', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to territory tab
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAfricaContinent()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksEuropeContinent()
    w.WorksOceaniaContinent()
    // go to ip chain tab
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddCompValidate()
    w.WorksAddPubClick()
    w.WorksAddPubDeleteClick()
    w.WorksAddTerritoryClick()
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategoryOriginalSelect()
    w.WorksOwnMechValidate()
    w.WorksOwnPerfValidate()
    // w.WorksOwnMechType()
    // w.WorksOwnPerfType()
    // Composer
    w.WorskAddCompChainClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    // save works
    w.WorksSaveClick()
    w.WorksErrorValidate()
    // go to link
    w.WorksLinkClick()
    w.WorksDeleteSpecificClick()
    w.WorksDeliverButtonClick()
    w.WorksDeliveryModalDropdClick()
    w.WorksDeliveryDropdSelClick()
    w.WorksDeliveryModalAddClick()
    w.WorksDeliveryCreatedLinkedWorksValidate()
    w.WorksDeliveryDeleteLinkedWorksClick()
    w.DlvrsClickSaveClick()
    // Go back to Works Sub Menu
    w.WorksSubMenuClick()
    w.WorkskCreatedClick('A Work Smoke')
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  });
  it('C1980 Validate Works Update Delivery Status', () => {
    const w = new globalpageobject();
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to territory tab
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAfricaContinent()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksEuropeContinent()
    w.WorksOceaniaContinent()
    // go to ip chain tab
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddCompValidate()
    w.WorksAddPubClick()
    w.WorksAddPubDeleteClick()
    w.WorksAddTerritoryClick()
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategoryOriginalSelect()
    w.WorksOwnMechValidate()
    w.WorksOwnPerfValidate()
    // w.WorksOwnMechType()
    // w.WorksOwnPerfType()
    // Composer
    w.WorskAddCompChainClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    // save works
    w.WorksSaveClick()
    w.WorksErrorValidate()
    w.WokrsDlvrsTabClick()
    w.WorksDlvrsUpdateStatusDropdClick()
    w.WorksLinkClick()
    w.WorksBulkDropdValidate()
    w.WorksBulkUpdateDeliveryStatusClick()
    w.WorksBulkStatusDropdClick()
    w.WorksBulkStatusDropDSelValidate()
    w.WorksBulkStatusDropDSelClick()
    w.WorksUpdateDeliveryStatusCheckboxClick()
    w.WorksUpdateDeliveryStatusUpdateClick()
    w.WorkskCreatedClick('A Work Smoke')
    w.WokrsDlvrsTabClick()
    w.WorksDelvryTabStatusValidate()
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
  });
  it('C3764 Validate Works Automatic Approval', () => {
    const w = new globalpageobject();
    w.DlvrsMenuClick()
    w.DlvrsSubmenuClick()
    w.DlrvrsSettingsSubMenuClick()
    w.DlvrsAutoApproveWorksCBClick()
    w.DlvrsSettingsSaveClick()
    // go to works
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
    w.WorksSearchClear()
    w.WorksCreateClick()
    w.WorksTitleType('A Work Smoke')
    // go to territory tab
    w.WorksTerritoriesTabClick()
    w.WorksWorldCheck()
    w.WorksAfricaContinent()
    w.WorksAmericasContinent()
    w.WorksAsiaContinent()
    w.WorksEuropeContinent()
    w.WorksOceaniaContinent()
    // go to ip chain tab
    w.WorksIPChainTabClick()
    w.WorksAddTerritoryClick()
    // IP Chain
    w.WorksAddCompValidate()
    w.WorksAddPubClick()
    w.WorksAddPubDeleteClick()
    w.WorksAddTerritoryClick()
    w.WorksAddPubClick()
    w.WorksPubSearchType()
    w.WorksPubSelectClick()
    w.WorksCategoryOriginalSelect()
    w.WorksOwnMechValidate()
    w.WorksOwnPerfValidate()
    // w.WorksOwnMechType()
    // w.WorksOwnPerfType()
    // Composer
    w.WorskAddCompChainClick()
    w.WorksCompSearchType()
    w.WorksCompSelectClick()
    w.WorksCategoryDDSelect()
    w.WorksCheckBoxCheck()
    w.WorksOwnPerfComposerType()
    w.WorksColPerfComposerType()
    // save works
    w.WorksSaveClick()
    w.WorksErrorValidate()
    w.WorksLinkClick()
    w.WorksIndexStatusValidate()
    // go back to dlvry tab
    w.DlvrsMenuClick()
    w.DlvrsSubmenuClick()
    w.DlrvrsSettingsSubMenuClick()
    w.DlvrsAutoApproveWorksCBClick()
    w.DlvrsSettingsSaveClick()
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorksSearchDuplicateType('A Work Smoke')
    w.WorksDeleteDuplicateIfExist()
  })
  it('C3764 Validate Works Automatic Approval', () => {
    const w = new globalpageobject();
    w.CConfigSettingsClick()
    w.ConfigImportsClick()
    // create import
    w.ConfigImportsCreateClick()
    w.SettingImportNameFieldType('A Work Smoke')
    w.SettingImportFromSystemClick()
    w.SettingImpoRTFromSystemSelCWRClick()
    w.PeriodNextButtonClick()
    w.SettingSignificantUpateOkModalClick()
    // uplaod a file
    w.FileAttach('CWR-Test-Import.V22')
    w.SettingFilesNextButtonClick()
    w.CompoTerritoryWorldCboxClick()
    w.SettingIngestButtonClick()
    w.NotifBellValidate('1', '1')
    w.NotifMsgValidate('CWR Bulk import completed')
    // go to works page
    w.CatalogueMenuClick()
    w.WorksSubMenuClick()
    w.WorkskCreatedClick('A CWR WORK IMPORT TEST')
    // Delete imported works
    w.WorksDeleteButtonClick()
    w.WorksDeleteButtonModalClick()
    // go back to settings to delete the import data
    w.CConfigSettingsClick()
    w.ConfigImportsClick()
    w.WorksDeleteSpecificClick()
    w.SettingImportDeleteButtonClick()
    w.SettingImportDeleteModalClick()




  });

})

