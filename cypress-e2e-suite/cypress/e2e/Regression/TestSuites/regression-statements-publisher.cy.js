// Created by Jesli 
// Aug 18, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression statements publisher tests', () => {
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
  it('C2100	Validate Statements on Sidebar', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
  })
  it('C3120	Validate Statements Page Content (Publisher Client)', () => {
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
    p.StatementsTableHeaderValidate('Net Sales')
    p.StatementsTableHeaderValidate('Created')
    p.StatementsTableHeaderValidate('Status')
    p.StatementsTypeDDClick()
    p.StatementsTypeDdSelMechValidate()
    p.StatementsTypeDdSelStandardValidate()
    p.StatementsContractField('Test Gelo 100')
    p.TracksContractIndexSelClick()
    p.PayeePreviousButtonValidate()
    p.PayeeNextButtonValidate()
    p.PayeePageNumberButtonsValidate()
    p.StatementsShowingPerPageValidate()
    p.StatementsShowAllLinkValidate()
    p.StatementsTotalValidate()
  });  
  it('C2102 Validate Statements Creation via Period', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.PeriodSubmenuClick()
    p.PeriodSearchDuplicateType('A Period Test')
    p.PeriodDeleteDuplicateIfExist()
    p.PeriodSearchClear()
    // create page
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
    p.PeriodStartDateType('01/07/2023')
    // End Date
    p.PeriodEndDateClick()
    p.PeriodEndDateClick()
    p.PeriodEndDateType('31/12/2024')
    // Sales Date
    p.PeriodAccountingDateClick()
    p.PeriodAccountingDateClick()
    p.PeriodAccountingDateType('31/12/2024')
    p.PeriodNextButtonClick()
    // Select Sales
    p.PeriodSelectAllRBClick()
    p.PeriodIncludeSelectedClick()
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
    p.PeriodGrossRevenueValidate()
    p.PeriodNetPayoutValidate()
    p.PeriodInputUnitsValidate()
    // Statements Tab Validation
    // Create Statement
    p.PeriodsStatementsTabClick()
    p.PeriodCreateStatementButtonClick()
    p.PeriodStatementContractFieldType('Test Gelo 100')
    p.CostsContractsSelClick()
    p.PeriodsStatementCreateButtonClick()
    p.ContractsDeleteErrorMsgValidate()
    p.PeriodStatementContractFieldType('Test Gelo 3')
    p.CostsContractsSelTestGelo3Click()
    // p.PeriodsStatementCreateButtonClick()
    p.PeriodsStatementCreateButtonClick()
    p.PeriodsStatementPaySelectedValidate()
    p.PeriodsStatementExportValidate()
    p.PeriodsStatementSendDropdClick()
    p.PeriodsSendAllValidate()
    p.PeriodsSendSelectedValidate()
    p.PeriodsPublishDropdClick()
    p.PeriodsPublishAllClick()
    p.PeriodsPublisSelectedClick()
    p.PeriodsPublishUnpublishAllClick()
    p.PeriodsPublishUnpublishSelectedClick()
    p.PayeeNextButtonValidate()
    p.PayeePreviousButtonValidate()
    p.PeriodsStatementShowAllValidate()
    p.PeriodsShowing100PerPageValidate()
    p.PeriodsTableHeaderValidate('Name')
    p.PeriodsTableHeaderValidate('Gross Sales')
    p.PeriodsTableHeaderValidate('Net Sales')
    p.PeriodsTableHeaderValidate('Status')
    // click created statement
    p.PeriodsCreatedStatementClick('2023 - H1: Test Gelo 3')
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
    p.PeriodSubmenuClick()
    // Delete period
    p.PeriodSearchDuplicateType('A Period Test')
    p.PeriodDeleteDuplicateIfExist()
  }) 
  it('C2103 Validate Statements View Page Content - Overview', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.PayeePageLabelsValidate('Channels')
    p.PayeePageLabelsValidate('Configurations')
    p.PayeePageLabelsValidate('Territories')
    p.PayeePageLabelsValidate('Sources')
    p.PayeePageLabelsValidate('Sub Sources')
    p.PayeePageLabelsValidate('Top Works')
    p.PayeePageLabelsValidate('Top Tracks')
    // validate upper portion
    p.StatementsOpeningBalancePubValidate()
    p.StatementsGrossRevenuePubValidate()
    p.StatementsNetRevenuePubValidate()
    p.StatementsClosingBalancePubValidate()
  });
  it('C3119 Validate Statements View Page Content - Included Income', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.StatementsIncludedIncomeTabClick()
    p.StatementsIncludedSalesTableHeaderValidate('Name')
    p.StatementsIncludedSalesTableHeaderValidate('Invoice')
    p.StatementsIncludedSalesTableHeaderValidate('Target')
    p.StatementsIncludedSalesTableHeaderValidate('Account')
    p.StatementsIncludedSalesTableHeaderValidate('Gross')
    p.StatementsIncludedSalesTableHeaderValidate('Net')
    p.StatementsIncludedSalesTableHeaderValidate('Unmapped Lines')
    p.PayeePreviousButtonValidate()
    p.PayeeNextButtonValidate()
    p.PayeePageNumberButtonsIndexValidate()
  });
  it('C2106 Validate Statements View Page Content - Sales', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.StatementsIncomeTabClick()
    p.StatementsSalesFilterButtonClick()
    p.StatementsWorkFieldType('test')
    p.StatementsTerritoryFieldType('World')
    p.StatementsTerritoryDropdSelClick()
    p.StatementsChannelFieldType('test')
    p.StatementsConfigurationType('Television')
    p.StatementsConfigTypeSelPubClick()
   
    p.PayeePreviousButtonValidate()
    p.PayeeNextButtonValidate()
    p.PayeePageNumberButtonsIndexValidate()
    p.StatementsSourceFieldType('test')
    p.StatementsSubSourceFieldType('test')
    
    // Validate table header
    // p.StatementsSalesTableValidate('Cat type')
    p.StatementsSalesTableValidate('Channel')
    p.StatementsSalesTableValidate('Configuration')
    p.StatementsSalesTableValidate('Source')
    p.StatementsSalesTableValidate('Subsource')
    p.StatementsSalesTableValidate('Territory')
    p.StatementsSalesTableValidate('Title')
    p.StatementsSalesTableValidate('Composers')
    p.StatementsSalesTableValidate('Production')
    p.StatementsSalesTableValidate('Barcode')
    p.StatementsSalesTableValidate('Cat no')
    p.StatementsSalesTableValidate('ISRC')
    p.StatementsSalesTableValidate('Description')
    p.StatementsSalesTableValidate('Episode')
    p.StatementsSalesTableValidate('Identifier')
    p.StatementsSalesTableValidate('ISWC')
    p.StatementsSalesTableValidate('Tunecode')
    p.StatementsSalesTableValidate('Units')
    p.StatementsSalesTableValidate('Ex Rate')
    p.StatementsSalesTableValidate('Units')
    p.StatementsSalesTableValidate('Gross')
    p.StatementsSalesTableValidate('Net')
    p.StatementsSalesTableValidate('Royalty')
    

  });
  it('C2107 Validate Statements View Page Content - Communication', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.StatementsCommunicationTabClick()
    p.StatementCommunicationHeaderValidate('Date')
    p.StatementCommunicationHeaderValidate('Email')
  });
  it('C2108 Validate Statements Sales Filter', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.StatementsIncomeTabClick()
    p.StatementsWorkFieldType('Brazil')
    p.StatementsWorkDropdSelClick()
    p.StatementsWorkFieldType('test')
    p.StatementsTerritoryFieldType('World')
    p.StatementsTerritoryDropdSelClick()
    p.StatementsChannelFieldType('test')
    p.StatementsConfigurationType('Television')
    p.StatementsConfigTypeSelPubClick()
    p.StatementsSalesFilterButtonClick()
  });
  it('C2110 Validate Statements Reprocess Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    p.StatementsReprocessButtonClick()
    p.StatementsReprocessModalClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // lock period
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
    p.StatementsGrossRevenuePubValidate()
    // go back to period and lock 
  });
  it('C2111 Validate Statements Publish Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    p.StatementsPublishButtonClick()
    p.StatementsUnpublishButtonClick()  
  });
  it('C3123 Validate Statements Download Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    p.StatementsDownloadDropdClick()
    p.StatementsDownloadAllSelValidate()
    p.StatementsPDFSelValidate()
    p.StatementsStatementOfAcctSelValidate()
    p.StatementsAllIncomeValidate() 
  });
  it('C2113 Validate Statements Search Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsSearchBarType('2023 - H1: Test Gelo 100')
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // go back to period and lock 
  });
  it('C2114 Validate Statements Filter Function - Period', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsSearchBarType('2023 - H1: Test Gelo 100')
    p.StatementsPeriodDDType('zzz Locked')
    p.StatementsPeriodDDSelClick()
    p.StatementsFilterClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
  });
  it('C2115	Validate Statements Filter Function - Type ', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsSearchBarType('2023 - H1: Test Gelo 100')
    p.StatementsPeriodDDType('zzz Locked')
    p.StatementsTypeDDClick()
    p.StatementsTypeDdSelMechClick()
    p.StatementsFilterClick()
    p.StatementsCreatedNotExistValidate('2023 - H1: Test Gelo 100')
    p.StatementsTypeDDClick()
    p.StatementsTypeDdSelStandardClick()
    p.StatementsFilterClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
  });
  it('C2116	Validate Statements Filter Function - Contract', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsContractField('Test Gelo 100')
    p.TracksContractIndexSelClick()
    p.StatementsFilterClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
  });
})