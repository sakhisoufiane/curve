// Created by Jesli 
// July 31, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression publisher tests', () => {
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
  it('C2027	Validate Publishers on Sidebar', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
  });
  it('C2028	Validate Publishers Page Content', () => {
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
    p.PublisherTotalValidate()
    p.PublishersFilterButtonValidate()
    p.PublishersExportButtonValidate()
  });
  it('C2029	Validate Publishers Create Page Content - Overview', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Go to Create page
    p.PublishersCreateClick()
    p.PublishersNameType('A Publisher Smoke')
    p.PublishersForeignIDFieldType('1245678')
    p.PublishersCAEFieldType('098765')
    p.PublishersNotesType('This is a Test')
    p.PublishersMainSocClick()
    p.PublishersMainSocSelClick()
    p.PublishersMainSocIdentifType('PRS')
    p.PublishersMechSocClick()
    p.PublishersMecgSocSelClick()
    p.PublishersMechSocIdentifType('ASCAP')
    p.PublishersPerfSocClick()
    p.PublishersPerfSocSelClick()
    p.PublishersPerfSocIdentifType('BMI')
    p.PublishersSyncSocClickClick()
    p.PublishersSyncSocSelClick()
    p.PublishersSyncSocIdentifType('SOCAN')
    // Add Contract
    p.PublisherAddContractButtonClick()
    p.PublisherLinkedContractFieldType('Test Gelo 100')
    p.CostsContractsSelClick()
    // Delete Soc
    p.PublisherLinkedContractsDeleteClick()
    // Add Society
    p.PublisherAddSocClick()
    p.PublisherSocietyDropdownClick()
    p.PublisherSocietyDdType('ADDAF')
    p.PublisherSocietyDropdSelClick()
    p.PublisherIdentifierType('test')
    p.PublisherIdentifierName('test')
    p.PublisherMechSocClick()
    p.PublisherMechScoType('ABRAMUS')
    p.PublisherMechSocDropdSelClick()
    p.PublisherPerfSocDropdClick()
    p.PublisherPerfSocType('ADAGP')
    p.PublisherPerfSocDropdSelClick()
    p.PublisherSyncSocDropdClick()
    p.PublisherSyncSocType('AMUS')
    p.PublisherSyncSocDropdSelClick()
    // DELETE Soc
    p.PublisherLinkedContractsDeleteClick()
    // Add Agreement
    p.PublisherAddAgreementButtonClick()
    p.PublisherAgreementFieldType('Test Publisher')
    p.PublisherAgreementDropdSelcClick()
    p.PublisherAgreementTypeDropdClick()
    p.PublisherAgreementTypeDropdSelGeneralClick()
    p.PublisherAgreementTypeDropdClick()
    p.PublisherAgreementTypeDropdSelSpecificClick()
    p.PublisherTerritoryDropdClick()
    p.CompoTerritoryDropdSelClick()
    p.PublisherAgreementSocietyDropDClick()
    p.PublisherAgreementSocType('ANACIM')
    p.PublisherAgreeementSocSelClick()
    p.PublisherAgreementNoType('1')
    p.PublisherLinkedContractsDeleteClick()
  });
  it('C2030	Validate Publishers Create Page Content - Territories', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Go to Create page and territory tab
    p.PublishersCreateClick()
    p.PublishetTerritoryTabClick()
    p.PublisherTerritoryHeaderValidate()
    p.PublisherWorldCheckbClick()
    p.PublisherAfricaCboxClick()
    p.PublisherAmericaCboxClick()
    p.PublisherAsiaCboxClick()
    p.PublisherEuropeCboxClick()
    p.PublisherOceaniaCboxClick()
  });
  it('C2033 Validate Publishers Linked to Contracts (Publisher Client)', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Go to Create page
    p.PublishersCreateClick()
    // Add Contract
    p.PublisherAddContractButtonClick()
    p.PublisherLinkedContractFieldType('Test Gelo 100')
    p.CostsContractsSelClick()
    p.PublisherLinkedContractLabelValidate('Test Gelo 100')
  });
  it('C2032	Validate Publishers Societies', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Go to Create page
    p.PublishersCreateClick()
    p.PublishersMainSocClick()
    p.PublishersMainSocSelClick()
    p.PublishersMainSocIdentifType('PRS')
    p.PublishersMechSocClick()
    p.PublishersMecgSocSelClick()
    p.PublishersMechSocIdentifType('ASCAP')
    p.PublishersPerfSocClick()
    p.PublishersPerfSocSelClick()
    p.PublishersPerfSocIdentifType('BMI')
    p.PublishersSyncSocClickClick()
    p.PublishersSyncSocSelClick()
    p.PublishersSyncSocIdentifType('SOCAN')
  });
  it('C2034	Validate Publishers Adding Identifiers', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Go to Create page
    p.PublishersCreateClick()
    // Add Society
    p.PublisherAddSocClick()
    p.PublisherSocietyDropdownClick()
    p.PublisherSocietyDdType('ADDAF')
    p.PublisherSocietyDropdSelClick()
    p.PublisherIdentifierType('test')
    p.PublisherIdentifierName('test')
    p.PublisherMechSocClick()
    p.PublisherMechScoType('ABRAMUS')
    p.PublisherMechSocDropdSelClick()
    p.PublisherPerfSocDropdClick()
    p.PublisherPerfSocType('ADAGP')
    p.PublisherPerfSocDropdSelClick()
    p.PublisherSyncSocDropdClick()
    p.PublisherSyncSocType('AMUS')
    p.PublisherSyncSocDropdSelClick()
  });
  it('C2035	Validate Publishers Adding Sub-Publisher Agreements', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Go to Create page
    p.PublishersCreateClick()
    // Add Agreement
    p.PublisherAddAgreementButtonClick()
    p.PublisherAgreementFieldType('Test Publisher')
    p.PublisherAgreementDropdSelcClick()
    p.PublisherAgreementTypeDropdClick()
    p.PublisherAgreementTypeDropdSelGeneralClick()
    p.PublisherAgreementTypeDropdClick()
    p.PublisherAgreementTypeDropdSelSpecificClick()
    p.PublisherTerritoryDropdClick()
    p.CompoTerritoryDropdSelClick()
    p.PublisherAgreementSocietyDropDClick()
    p.PublisherAgreementSocType('ANACIM')
    p.PublisherAgreeementSocSelClick()
    p.PublisherAgreementNoType('1')
    p.PublisherLinkedContractsDeleteClick()
  });
  it('C3117 Validate Publishers Required Fields', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page required fields
    p.PublishersCreateClick()
    p.PublishersSaveButtonClick()
    // validate error message pop up
    p.ContractsDeleteErrorMsgValidate()
    p.PublishersNameType('test publish')
    // delete publisher
    p.PublishersSaveButtonClick()
    p.PublishersLinkClick()
    p.PublishersCreatedPubClick('test publish')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2036 Validate Publishers Create Function', () => {
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
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    p.PublisherDeleteDuplicateIfExist()
    p.PublisherSearchClear()
    // Input on edit page (create data)
    p.PublishersCreateClick()
    p.PublishersNameType('A Publisher Smoke')
    p.PublishersForeignIDFieldType('1245678')
    p.PublishersCAEFieldType('098765')
    p.PublishersNotesType('This is a Test')
    p.PublishersMainSocClick()
    p.PublishersMainSocSelClick()
    p.PublishersMainSocIdentifType('PRS')
    p.PublishersMechSocClick()
    p.PublishersMecgSocSelClick()
    p.PublishersMechSocIdentifType('ASCAP')
    p.PublishersPerfSocClick()
    p.PublishersPerfSocSelClick()
    p.PublishersPerfSocIdentifType('BMI')
    p.PublishersSyncSocClickClick()
    p.PublishersSyncSocSelClick()
    p.PublishersSyncSocIdentifType('SOCAN')
    // Save and validate on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke')
    p.PublishersForeignName('1245678')
    p.PublishersCAENumber('098765')
    // Validate data on index page
    p.PublishersLinkClick()
    p.PublishersCreatedValidate('A Publisher Smoke')
    p.PublishersValidateCAE('098765')
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
  it('C2037 Validate Publishers Update Function', () => {
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
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    p.PublisherDeleteDuplicateIfExist()
    p.PublisherSearchClear()
    // Input on edit page (create data)
    p.PublishersCreateClick()
    p.PublishersNameType('A Publisher Smoke')
    p.PublishersForeignIDFieldType('1245678')
    p.PublishersCAEFieldType('098765')
    p.PublishersNotesType('This is a Test')
    p.PublishersMainSocClick()
    p.PublishersMainSocSelClick()
    p.PublishersMainSocIdentifType('PRS')
    p.PublishersMechSocClick()
    p.PublishersMecgSocSelClick()
    p.PublishersMechSocIdentifType('ASCAP')
    p.PublishersPerfSocClick()
    p.PublishersPerfSocSelClick()
    p.PublishersPerfSocIdentifType('BMI')
    p.PublishersSyncSocClickClick()
    p.PublishersSyncSocSelClick()
    p.PublishersSyncSocIdentifType('SOCAN')
    // Save and validate on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke')
    p.PublishersForeignName('1245678')
    p.PublishersCAENumber('098765')
    // Validate data on index page
    p.PublishersLinkClick()
    p.PublishersCreatedValidate('A Publisher Smoke')
    p.PublishersValidateCAE('098765')
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
  it('C2038	Validate Publishers Copy Function', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckAllRbClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2039	Validate Publishers Search Function', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckAllRbClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2044 Validate Publishers Delete Function - Selected', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckSelectedCboxClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2042	Validate Publishers Delete Function - Edit Page', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page required fields
    p.PublishersCreateClick()
    p.PublishersSaveButtonClick()
    // validate error message pop up
    p.ContractsDeleteErrorMsgValidate()
    p.PublishersNameType('test publish')
    // delete publisher
    p.PublishersSaveButtonClick()
    p.PublishersLinkClick()
    p.PublishersCreatedPubClick('test publish')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2043	Validate Publishers Delete Function - All', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckAllRbClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2040	Validate Publishers Export Function - All', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Validate export
    p.PublisherExportButtonClick()
    p.NotifBellValidate('1', '1')
    p.PayeeExportNotifValidation('Publishers Export Ready')
  });
  it('C2041 Validate Publishers Export Function - Selected	', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherCheckSelectedCboxClick()
    p.PublisherExportButtonClick()
    p.NotifBellValidate('1', '1')
    p.PayeeExportNotifValidation('Publishers Export Ready')
    // Delete publsiher
    p.PublishersCreatedPubClick('reg pub')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2042 Validate Publishers Delete Function - Edit Page', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page required fields
    p.PublishersCreateClick()
    p.PublishersSaveButtonClick()
    // validate error message pop up
    p.ContractsDeleteErrorMsgValidate()
    p.PublishersNameType('test publish')
    // delete publisher
    p.PublishersSaveButtonClick()
    p.PublishersLinkClick()
    p.PublishersCreatedPubClick('test publish')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2046	Validate Publishers Import Function Only', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate Import error
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-label.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Errored')
    p.PublisherFilterButtonClick()
    // validate valid import
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-publishing.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    // Delete imported publisher
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2047	Validate Publishers Import Function - Overwrite Blanks Unchecked', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate import valid
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-publishing.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // re import to overwrite existing
    p.PublisherImportButtonClick()
    p.FileAttach('reg publisher publishing overwrite blank.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // search overwriten data
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    // Delete imported publisher
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersCAENumber('MNH1231')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2048	Validate Publishers Import Function - Overwrite Blanks Checked', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate import valid
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-publishing.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // re import to overwrite existing
    p.PublisherImportButtonClick()
    p.FileAttach('reg publisher publishing overwrite blank.xlsx')
    p.PublisherImportOverwriteBlankCboxClick()
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // search overwriten data
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    // Delete imported publisher
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublisherCAEEmptyValidate('MNH1231')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
})
