// Created by Jesli 
// July 27, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression composer tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.wait(2000);
    cy.selectClientMulti();
    cy.wait(2000);
    // cy.login_dev();  
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })
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
  it('C2007 Validate Composers Create Page Content - Overview', () => {
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
    c.CompoLinkedPublisherFieldType('test')
  });
  it('C2008 Validate Composers Linked to Publisher', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('Composer test')
    c.CompoLinkedPublisherFieldType('test publisher')
    c.CompoLinkedPubSelClick()
    c.CompoSaveClick()
    c.CompoLinkClick()
    // go back to edit page
    c.CompoCreatedClick('Composer test')
    c.CompoLinkedPublisherValidate('test publisher')
    c.CompoDeleteButtonClick()
    c.CompoDeleteModalClick()
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
  it('C3118 Validate Composers Required Fields', () => {
    const c = new globalpageobject();
    c.CatalogueMenuClick()
    c.CompoSubMenuClick()
    // Create on Composer Edit Page
    c.CompoCreateClick()
    c.CompoNameType('A test composer')
    c.CompoSaveClick()
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
    c.FileAttach('smoke-composers-import-label.xlsx')
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
    c.FileAttach('reg composers blank import label.xlsx')
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoImportButtonClick()
    c.FileAttach('smoke-composers-import-label.xlsx')
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
    c.FileAttach('reg composers blank import label.xlsx')
    c.CompoImportButtonModalClick()
    c.NotifBellValidate('1', '1')
    c.NotifMsgValidate('Your Composer Import Has Completed')
    c.CompoFilterButtonClick()
    c.CompoImportButtonClick()
    c.FileAttach('smoke-composers-import-label.xlsx')
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