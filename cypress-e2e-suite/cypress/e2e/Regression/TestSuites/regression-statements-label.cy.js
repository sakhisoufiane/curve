// Created by Jesli 
// Aug 18, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression statements label tests', () => {
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
  it('C2100	Validate Statements on Sidebar', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
  })
  it('C2101	Validate Statements Page Content', () => {
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
    p.StatementsTableHeaderValidate('Gross Costs')
    p.StatementsTableHeaderValidate('Net Costs')
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
  })
  it('C2102 Validate Statements Creation via Period', () => {
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
    p.LabelPeriodNextButton()
    p.PeriodEditLinkClick()
    p.PeriodsIndexStatusSetupValidate()
    p.PeriodClickCreated('A Period Test')
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
    p.PeriodsStatementsTabClick()
    // Create Statement
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
    p.PeriodsPublishUnpublishSelectedClick()
    p.PayeeNextButtonValidate()
    p.PayeePreviousButtonValidate()
    p.PeriodsStatementShowAllValidate()
    p.PeriodsShowing100PerPageValidate()
    p.PeriodsTableHeaderValidate('Name')
    p.PeriodsTableHeaderValidate('Gross Sales')
    p.PeriodsTableHeaderValidate('Net Sales')
    p.PeriodsTableHeaderValidate('Status')
    p.PeriodsCreatedStatementClick('2023 - H1: Test Gelo 3')
    
    // Delete period
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
  });
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
    p.PayeePageLabelsValidate('Costs')
    p.PayeePageLabelsValidate('Top Releases')
    p.PayeePageLabelsValidate('Top Tracks')
    // validate upper portion
    p.StatementsGrossRevenueValidate()
    p.StatementsGrossCostsValidate()
    p.StatementsReservesWithHeldValidate()
    p.StatementsOpeningBalanceValidate()
    p.StatementsNetRevenueValidate()
    p.StatementsRechargedCostsValidate()
    p.StatementsReservedReleasedValidate()
    p.StatementsClosingBalanceValidate()

  });
  it('C2104 Validate Statements View Page Content - Included Sales', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.StatementsIncludedSalesTabClick()
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
  it('C2105 Validate Statements View Page Content - Included Costs', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    // open existing statement
    p.StatementsIncludedCostsTabClick()
    p.StatementsIncludedCostTableHeaderValidate('Name')
    p.StatementsIncludedCostTableHeaderValidate('Amount')
    p.StatementsIncludedCostTableHeaderValidate('Description')
    p.StatementsIncludedCostTableHeaderValidate('Period')
    p.StatementsIncludedCostTableHeaderValidate('Type')
    p.StatementsIncludedCostTableHeaderValidate('Created')
    p.StatementsIncludedCostTableHeaderValidate('Reported')
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
    p.StatementsSalesTabClick()
    p.StatementsSalesFilterButtonClick()
    p.StatementsReleaseFieldType('test')
    p.StatementsTrackFieldType('test')
    p.StatementsChannelFieldType('test')
    p.StatementsConfigurationType('CD')
    p.StatementsConfigTypeSelClick()
    p.StatementsTerritoryFieldType('World')
    p.StatementsTerritoryDropdSelClick()
    p.PayeePreviousButtonValidate()
    p.PayeeNextButtonValidate()
    p.PayeePageNumberButtonsIndexValidate()
    p.StatementsSourceFieldType('test')
    p.StatementsSubSourceFieldType('test')
    p.StatementsCatTypeDropdClick()
    p.StatementsCatTypeDropdSelReleaseClick()
    // Validate table header
    p.StatementsSalesTableValidate('Sale date')
    p.StatementsSalesTableValidate('Transaction date')
    p.StatementsSalesTableValidate('Cat type')
    p.StatementsSalesTableValidate('Release title')
    p.StatementsSalesTableValidate('Release artist')
    p.StatementsSalesTableValidate('Barcode')
    p.StatementsSalesTableValidate('Cat no')
    p.StatementsSalesTableValidate('Track title')
    p.StatementsSalesTableValidate('Track artist')
    p.StatementsSalesTableValidate('ISRC')
    p.StatementsSalesTableValidate('Dist Channel')
    p.StatementsSalesTableValidate('Configuration')
    p.StatementsSalesTableValidate('Price cat')
    p.StatementsSalesTableValidate('Source')
    p.StatementsSalesTableValidate('Subsource')
    p.StatementsSalesTableValidate('Territory')
    p.StatementsSalesTableValidate('Units')
    p.StatementsSalesTableValidate('Original currency')
    p.StatementsSalesTableValidate('Ex Rate')
    p.StatementsSalesTableValidate('Unit Rate')
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
    p.StatementsSalesTabClick()
    p.StatementsReleaseFieldType('test')
    p.StatementsTrackFieldType('test')
    p.StatementsChannelFieldType('test')
    p.StatementsConfigurationType('CD')
    p.StatementsConfigTypeSelClick()
    p.StatementsTerritoryFieldType('World')
    p.StatementsTerritoryDropdSelClick()
    p.PayeePreviousButtonValidate()
    p.PayeeNextButtonValidate()
    p.PayeePageNumberButtonsIndexValidate()
    p.StatementsSourceFieldType('test')
    p.StatementsSubSourceFieldType('test')
    p.StatementsCatTypeDropdClick()
    p.StatementsCatTypeDropdSelReleaseClick()
    p.StatementsSalesFilterButtonClick()
  });
  it('C2110 Validate Statements Reprocess Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.PeriodSubmenuClick()
    // create page
    p.PeriodClickCreated('zzz Locked')
    // unlock period
    p.PeriodsUnlockButtonClick()
    p.PeriodUnlockPeriodModalClick()
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
    p.StatementsGrossRevenueValidate()
    // go back to period and lock 
    p.PeriodSubmenuClick()
    p.PeriodCreatedClick('zzz Locked')
    p.PeriodLockPeriodClick()
    
  });
  it('C2111 Validate Statements Publish Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    p.PeriodSubmenuClick()
    // create page
    p.PeriodClickCreated('zzz Locked')
    // unlock period
    p.PeriodsUnlockButtonClick()
    p.PeriodUnlockPeriodModalClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    p.StatementsPublishButtonClick()
    p.StatementsUnpublishButtonClick()
    // go back to period and lock 
    p.PeriodSubmenuClick()
    p.PeriodCreatedClick('zzz Locked')
    p.PeriodLockPeriodClick()
    
  });
  it('C3123 Validate Statements Download Function', () => {
    const p = new globalpageobject();
    p.StatementsMenuClick()
    // go to statement
    p.StatementsSubMenuClick()
    p.StatementsCreatedClick('2023 - H1: Test Gelo 100')
    p.StatementsDownloadDropdClick()
    p.StatementsDownloadAllSelValidate()
    p.StatementsStatementOfAcctSelValidate()
    p.StatementsPDFSelValidate()
    p.StatementsSelfBillingNoticeValidate()
    p.StatementsAllSalesCSVValidate()
    p.StatementsAllCostsCSVValidate()
    // go back to period and lock 
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