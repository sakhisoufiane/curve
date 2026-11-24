// Created by Jesli 
// July 06, 2023
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
  it('C2005 Validate Composers on Sidebar', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
  });
  it('C2006 Validate Composers Page Content', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Composer index page Validation
    c.CompoExportButtonValidate()
    c.CompoImportButtonValidate()
    c.CompoDeleteValidate()
    c.CompoCreateValidate()
    c.CompoSearchValidate()
    c.CompoTableHeaderValidate('Name')
    c.CompoTableHeaderValidate('CAE')
    c.CompoTableHeaderValidate('Created')
    c.CompoSearchDuplicateType('test')
    c.CompoShowing25IndexValidate()
    c.ComposerShowAllIndexValidate()
    c.PayeePreviousButtonValidate()
    c.PayeeNextButtonValidate()
    c.PayeePageNumberButtonsValidate()
  });
  it('C2007, C2009 Validate Composers Create Page Content - Overview and Comp Societies', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A Composer Smoke')
    c.CompoForeignIdType('Gelo12345')
    c.CompoFNameType('Gelo')
    c.CompoMNameType('T')
    c.CompoLNameType('Zafra')
    c.CompoCAENumberType('Gelo1243')
    c.CompoControlledCheckboxClick()
    c.CompoNotesFieldType('Test')
    // Societies
    c.CompoMainSocietyClick()
    c.CompoMainSelectionClick('PRS')
    c.CompoMainSocIdentifType('PRS')
    c.CompoMechSocClick()
    c.CompoMechSocSelClick()
    c.CompoMechSocIdentifType('ASCAP')
    c.CompoPerfSocClick()
    c.CompoPerfSocSelClick()
    c.CompoPerfSocIdentifType('BMI')
    c.CompoSyncSocietyClick()
    c.CompoSyncSocSelClick()
    c.CompoSyncSocIdentifType('SOCAN')
    c.CompoAddContractClick()
    c.CompoContractFieldType('Test Gelo 100')
    c.ContractCrossContractSelectGelo100()
    // click add society
    c.CompoAddSocietyClick()
    c.CompoSocietyDropDClick()
    c.CompoSocType('ACAM')
    c.CompoSocietyDropdSelAcamClick()
    c.CompoIdentifierFieldType('test')
    c.CompoMechSocietyDropdClick()
    c.CompoMechSocietyType('ACEMLA')
    c.CompoMechSocietyDropDSelClick()
    c.CompoPerfSocietyDropdClick()
    c.CompoPerfSocType('AACIMH')
    c.CompoPerfSocietyDropdselClick()
    c.CompoSyncSocietyDropdClick()
    c.CompoSyncSocType('ADAVIS')
    c.CompoSyncSocietyDropdselClick()
    // add Agreement
    c.CompoAddAgreementClick()
    c.CompoPublisherFieldType('test')
    c.CompoAgreementTypeDropdClick()
    c.CompoAgreeTypeSelOGClick()
    c.CompoAgreementTypeDropdClick()
    c.CompoAgreeTypeSelOSClick()
    c.CompoTerritoryDropdClick()
    c.CompoTerritoryDropdSelClick()
    c.CompoSocDropdClick()
    c.CompoSocietyType('ATN')
    c.CompoPubSocietyDropdselClick()
    c.CompoAgreementNoType('1')
    c.CompoPubAgreeDeleteButtonClick()

  });
  it('C2007 Validate Composers Create Page Content - Overview', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoTerritoriesTabClick()
    c.CompoTerritoriesHeadValidate()
    c.CompoTerritoryWorldCboxClick()
    c.CompoSelectTerritoryGroupDropD()
  });
  it('C2010 Validate Composers Linked to Contracts', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('Composer test')
    // Enter contract to be linked
    c.CompoAddContractClick()
    c.CompoContractFieldType('Test Gelo 100')
    c.CostsContractsSelClick()
    // save composer
    c.CompoSaveClick()
    c.CompoLinkClick()
    // open created and validate linked contract
    c.CompoCreatedClick('Composer test')
    c.CompoContractValidate('Test Gelo 100')
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
  });
  it('C2012 Validate Composers Adding Identifiers', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A Composer test')
    // add society
    // click add society
    c.CompoAddSocietyClick()
    c.CompoSocietyDropDClick()
    c.CompoSocType('ACAM')
    c.CompoSocietyDropdSelAcamClick()
    c.CompoIdentifierFieldType('test')
    c.CompoMechSocietyDropdClick()
    c.CompoMechSocietyType('ACEMLA')
    c.CompoMechSocietyDropDSelClick()
    c.CompoPerfSocietyDropdClick()
    c.CompoPerfSocType('AACIMH')
    c.CompoPerfSocietyDropdselClick()
    c.CompoSyncSocietyDropdClick()
    c.CompoSyncSocType('ADAVIS')
    c.CompoSyncSocietyDropdselClick()
    c.CompoAddSocietyClick()
    c.CompoAddSocietyClick()
    c.CompoAddSocietyClick()
  });
  it('C2013 Validate Composers Adding Publisher Agreements', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A Composer Smoke')
    c.CompoAddSocietyClick()
    c.CompoAddAgreementClick()
    c.CompoPublisherFieldType('test publisher')
    c.CompoLinkedPubSelClick()
    c.CompoAgreementTypeDropdClick()
    c.CompoAgreeTypeSelOGClick()
    c.CompoAgreementTypeDropdClick()
    c.CompoAgreeTypeSelOSClick()
    c.CompoTerritoryDropdClick()
    c.CompoTerritoryDropdSelClick()
    c.CompoSocDropdClick()
    c.CompoSocietyType('ATN')
    c.CompoPubSocietyDropdselClick()
    c.CompoAgreementNoType('1')
    c.CompoPubAgreeDeleteButtonClick()
    c.CompoAddAgreementClick()
    c.CompoAddAgreementClick()
    c.CompoAddAgreementClick()
    c.CompoAddAgreementClick()
  });
  it('C3118 Validate Composers Required Fields', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoSaveClick()
    // Validate error msg
    c.ContractsDeleteErrorMsgValidate()
    c.CompoNameType('A test composer')
    c.CompoSaveClick()
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
  });
  it('C2014, C2015 Validate Composers Create Function', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Composer index page Validation
    c.CompoExportButtonValidate()
    c.CompoImportButtonValidate()
    c.CompoDeleteValidate()
    c.CompoCreateValidate()
    c.CompoSearchValidate()
    c.CompoNameHeaderValidate()
    c.CompoCAEHeadrValidate()
    c.CompoCreatedHeaderValidate()
    c.CompoSearchDuplicateType('A Composer Smoke')
    c.CompoDeleteDuplicateIfExist()
    c.CompoSearchClear()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A Composer Smoke')
    c.CompoForeignIdType('Gelo12345')
    c.CompoFNameType('Gelo')
    c.CompoMNameType('T')
    c.CompoLNameType('Zafra')
    c.CompoCAENumberType('Gelo1243')
    c.CompoNotesType('This is a test')
    c.CompoMainSocietyClick()
    c.CompoMainSelectionClick('PRS')
    c.CompoMainSocIdentifType('PRS')
    c.CompoMechSocClick()
    c.CompoMechSocSelClick()
    c.CompoMechSocIdentifType('ASCAP')
    c.CompoPerfSocClick()
    c.CompoPerfSocSelClick()
    c.CompoPerfSocIdentifType('BMI')
    c.CompoSyncSocietyClick()
    c.CompoSyncSocSelClick()
    c.CompoSyncSocIdentifType('SOCAN')
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
  it('C2016, C2017, C2021, C2022 Validate Composers Copy and Delete Functions', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A test composer')
    c.CompoSaveClick()
    c.CompoCopyButtonClick()
    c.CompoSaveClick()
    c.CompoCopyButtonClick()
    c.CompoSaveClick()
    c.CompoLinkClick()
    // Search created and copied data
    c.CompoSearchDuplicateType('A test composer')
    c.CompoSelectCheckboxClick()
    c.CompoDeleteIndexClick()
    c.CompoDeleteSelectedIndexClick()
    c.CompoDeleteModalIndexClick()
    c.ComposSelectALLcBoxClick()
    c.CompoDeleteIndexClick()
    c.CompoDeleteSelectedIndexClick()
    c.CompoDeleteModalIndexClick()

    
  });
  it('C2018, C2019	Validate Composers Export Function - All', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Composer index page Validation
    c.CompoExportButtonClick()
    c.NotifBellValidate('1', '1')
    c.PayeeExportNotifValidation('Composers Export Ready')
    c.CompoSearchDuplicateType('A test composer')
    // create compo
    c.CompoCreateClick()
    c.CompoNameType('A test composer')
    c.CompoSaveClick()
    c.CompoLinkClick()
    c.CompoSearchDuplicateType('A test composer')
    c.CompoSelectCheckboxClick()
    c.CompoExportButtonClick()
    c.NotifBellValidate('1', '1')
    c.PayeeExportNotifValidation('Composers Export Ready')
    c.CompoSearchDuplicateType('A test composer')
    c.CompoSelectCheckboxClick()
    c.CompoDeleteIndexClick()
    c.CompoDeleteSelectedIndexClick()
    c.CompoDeleteModalIndexClick()
  });
  it('C2024 Validate Composers Import Function', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Import a Contract with existing contract
    c.CompoImportButtonClick()
    c.FileAttach('smoke-composers-import-publishing.xlsx')
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoCreatedClick('A Composer Smoke')
    // Delete Imporated data
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
  });
  it('C2025 Validate Composers Import Function - Overwrite Blanks Unchecked', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Import a Contract with existing contract
    c.CompoImportButtonClick()
    c.FileAttach('reg composers blank import publishing.xlsx')
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoImportButtonClick()
    c.FileAttach('smoke-composers-import-publishing.xlsx')
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoCreatedClick('A Composer Smoke')
    c.CompoEditFirstNameValidate('test')
    c.CompoEditMiddleNameValidate('test')
    c.CompoEditSurNameValidate('test')
    // Delete Imporated data
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
  });
  it('C2026 Validate Composers Import Function - Overwrite Blanks checked', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Import a Contract with existing contract
    c.CompoImportButtonClick()
    c.FileAttach('reg composers blank import publishing.xlsx')
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoImportButtonClick()
    c.FileAttach('smoke-composers-import-publishing.xlsx')
    c.TracksOverwriteBlanks()
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoCreatedClick('A Composer Smoke')
    c.CompoNameBlankValidate('test')
    c.CompoFnameNameBlankValidate('test')
    c.CompoMnameNameBlankValidate('test')
    c.CompoSurnameBlankValidate('test')
    // Delete Imporated data
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
  });


})