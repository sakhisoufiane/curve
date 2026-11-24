// Created by Jesli C.
// June 16, 2023
const payeeName = 'Smoke Test Payee ' + Date.now();
// const composerName = 'Smoke Test Composer-' + Date.now();


class globalpageobject {

  // Navigate to Payee Select Page
  ContractMenuClick() { cy.get('#sidebar-contracts > a').click().wait(2000); }
  ContractMenuValidate() { cy.get('#sidebar-contracts > a').should('be.visible').wait(1000); }
  PayeeSubMenuValidate() { cy.get('#sidebar-payees > a').should('be.visible').wait(1000); }
  PayeeSubMenuClick() { cy.get('#sidebar-payees > a').click().wait(2000); }
  // Validate Payee Select Page
  PayeeSearchButtonValidate() { cy.xpath('//a[@id="CUR-RjjfRtuc"]/following::i[@class="pg-search"]') }
  PayeeSearchBarValidation() { cy.get('#CUR-rYmCZlqH').should('be.visible'); }
  PayeeExportButtonValidation(text) { cy.get('#CUR-hzouaqxY').should('be.visible').contains(text); }
  PayeeImportButtonValidation(text) { cy.get('#CUR-rZPDYyzN').should('be.visible').contains(text); }
  PayeeDeleteValidation(text) { cy.get('#CUR-GAGrmAkQ').contains(text).should('be.visible'); }
  PayeeCreateValidation(text) { cy.get('#CUR-jYYixChE').contains(text).should('be.visible'); }
  PayeeCheckboxValidate() { cy.xpath('//div[@id="CUR-AflfMogt"]/following::input[@type="checkbox"][1]').should('be.visible'); }
  
  // Filter Complete select box
  PayeeCompleteDDownValidation() { cy.xpath('//label[@id="CUR-ihpIsdkx"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  PayeeFilterButtonValidation(text) { cy.get('#CUR-qJVOIKBD').contains(text); }
  PayeeTableHeaderValidation(text) { cy.xpath('//div[@id="CUR-AflfMogt"]/following::th').contains(text).should('be.visible'); }
  PayeeCompleteDropdClick() { cy.xpath('//label[@id="CUR-ihpIsdkx"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  PayeeCompleteDropdSelectionValidate(text) { cy.xpath('//span[@id="CUR-MLKJBiyg"]').contains(text); }
  PayeeCompleteDropdSelectClick(text) { cy.xpath('//span[@id="CUR-MLKJBiyg"]').contains(text).click().wait(2000); }
  PayeeTotalCounterValidate() { cy.get('#CUR-YRiLUTPy').should('be.visible'); }

  
  // Click Create Button
  PayeeCreateButtonClick() { cy.get('#CUR-jYYixChE').click().wait(2000); }

  // Create Payee
  PayeePayeeNameType() { cy.get('#CUR-vNACcVKV').should('be.visible').clear().type(payeeName); }
  PayeeNameManualType(text) { cy.get('#CUR-vNACcVKV').should('be.visible').clear().type(text); }
  PayeeAlternateNameFieldType(text) { cy.get('#CUR-CJyhlJZW').should('be.visible').clear().type(text); }
  PayeeForeignIDFieldType(number) { cy.get('#CUR-GRdOwpVU').should('be.visible').clear().type(number); }
  PayeeProjectIDFieldType(text) { cy.get('#CUR-projectId-input').should('be.visible').clear().type(text); }
  PayeePaymentEmailFieldType(text) { cy.get('#CUR-MnQDkMSC').should('be.visible').clear().type(text); }
  PayeePaymentCurrencyDDClick() { cy.xpath('//label[contains(text(),"Payment Currency")]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PayeePaymentCurrencyDDSelectionType(text) { cy.xpath('//label[contains(text(),"Payment Currency")]/following::span[@tabindex="-1"][1]').clear().type(text); }
  PayeePaymentCurrencyDDSelectionClick() { cy.xpath('//span[contains(text(),"British Pound Sterling")]').click({ force: true }); }
  PayeeBankNameFieldType(text) { cy.get('#CUR-yyhcuPTu').should('be.visible').clear().type(text); }
  PayeeBankAddressType(text) { cy.xpath('//label[@id="CUR-odOoZFVb"]/following::textarea[@aria-invalid="false"]').should('be.visible').clear().type(text); }
  PayeeCategoriesClick() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::input[@type="search"][1]').should('be.visible').click().wait(3000); }
  PayeeCategoriesSelectionClick() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[contains(text(),"Cat 1")]').click(); }
  PayeeContactEmailFieldType(text) { cy.get('#CUR-NaYgFDcA').should('be.visible').clear().type(text); }
  PayeeAddressType(text) { cy.xpath('//label[@id="CUR-ZZTwxZXs"]/following::textarea[@aria-invalid="false"][1]').should('be.visible').clear().type(text); }
  PayeeAccountNoFieldType(number) { cy.get('#CUR-xJpyMOcS').should('be.visible').clear().type(number); }
  PayeeSortCodeFieldType(number) { cy.get('#CUR-XVRkUxZq').should('be.visible').clear().type(number); }
  PayeeIBANFieldType(number) { cy.get('#CUR-xbtHjbhy').should('be.visible').clear().type(number); }
  PayeeSwiftCodeType(text) { cy.get('#CUR-RVHhAHbs').should('be.visible').clear().type(text); }
  PayeeCountryDdownClick() { cy.xpath('//label[@id="CUR-GUNMwXuz"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PayeeCountryDDSelectionClick() { cy.xpath('//label[@id="CUR-GUNMwXuz"]/following::span[contains(text(),"World")][1]').click({ force: true }); }
  PayeeVATGSTSalesTAXNoFieldType(text) { cy.get('#CUR-MuenDpiw').should('be.visible').clear().type(text); }
  PayeeTaxWordingFieldType(text) { cy.get('#CUR-qMPSYmVs').should('be.visible').clear().type(text); }
  PayeeSelfBillingTaxRateFieldType(number) { cy.get('#CUR-viqCfpXo').should('be.visible').clear().type(number); }
  PayeeWithHoldingTaxWordingFieldType(text) { cy.get('#CUR-uEYmidLa').should('be.visible').clear().type(text); }
  PayeeWitholdingTaxRateFieldType(number) { cy.get('#CUR-vhAOhxOf').should('be.visible').clear().type(number); }
  PayeeFeesInvoiceTaxRateFieldType(number) { cy.get('#CUR-QiMJZhFy').should('be.visible').clear().type(number); }
  PayeeNotesFieldType(text) { cy.xpath('//div[@id="CUR-CzvuAESR"]/following::textarea[@aria-invalid="false"][1]').should('be.visible').clear().type(text); }
  PayeeDeleteButtonValidate() { cy.get('#CUR-DkcbEfDr').should('be.visible'); }
  PayeeCopyButtonValidate() { cy.get('#CUR-pUrJnkLb').should('be.visible'); }
  PayeeSeeFullHistoryLinkValidate() { cy.xpath('//a[@ng-click="modelHistory()"]').should('be.visible').wait(2000); }
  PayeePageLabelsValidate(text) { cy.xpath('//div[@class="panel-title"]').contains(text).should('be.visible'); }
  // User Tab page Validation
  PayeeUserTabClick() { cy.get('#CUR-ezshOabu').should('be.visible').click().wait(2000); }
  PayeeUserTabHeadersPageValidate(text) { cy.get('#CUR-OtfroCKy').contains(text).should('be.visible'); }
  PayeeTableHeaderValidate(text) { cy.xpath('//div[@id="CUR-AflfMogt"]/following::th[@ng-style]').contains(text).should('be.visible'); }
  // Elements for Index Page
  PayeePageNumberButtonsValidate() { cy.xpath('//span[@class="ng-binding current"]').should('be.visible'); }
  PayeeShowAllButtonValidate() { cy.get('#CUR-qLYbeezu').should('be.visible'); }
  PayeePreviousButtonValidate() { cy.xpath('//span[@aria-label="Previous"]').should('be.visible'); }
  PayeeNextButtonValidate() { cy.xpath('//span[@aria-label="Next"]').should('be.visible'); }
  PayeeShowingPerPageValidate() { cy.get('#CUR-kEjRSHhR').should('be.visible'); }
  // Elements for Edit page
  PayeePageNumberButtonsIndexValidate() { cy.xpath('//span[@class="ng-binding current"]').should('be.visible'); }
  PayeeShowAllButtonIndexValidate() { cy.xpath('//button[@id="CUR-DkcbEfDr"]/following::a[@id="CUR-tkPcREVg"]').should('be.visible'); }
  PayeePreviousButtonIndexValidate() { cy.xpath('//span[@id="CUR-ezshOabu"]/following::span[@aria-label="Previous"][2]').should('be.visible'); }
  PayeeNextButtonIndexValidate() { cy.xpath('//span[@id="CUR-ezshOabu"]/following::span[@aria-label="Next"][2]').should('be.visible'); }
  PayeeShowingPerPageIndexValidate() { cy.xpath('//button[@id="CUR-DkcbEfDr"]/following::span[contains(text(),"Showing 25 Per Page")][2]').should('be.visible'); }
  PayeeWarningMsgValidate(text) { cy.get('#CUR-LXpnnkMj').contains(text).should('be.visible').wait(1000); }
  PayeeSwiftCodeValidate() { cy.get('#CUR-RVHhAHbs').should('have.value', '1'); }
  // Payee Contracts Tab page
  PayeeContractsTabClick() { cy.get('#CUR-ySaZEDxG').should('be.visible').click().wait(2000); }
  PayeeContractsTabHeadersValidate(text) { cy.xpath('//span[@id="CUR-ySaZEDxG"]/following::th').contains(text).should('be.visible'); }
  PayeeContractsTabShowingPerpageValidate() { cy.xpath('//span[@id="CUR-ySaZEDxG"]/following::span[@id="CUR-LtbhAice"]').should('be.visible'); }
  PayeeContractsTabShowAllValidate() { cy.xpath('//span[@id="CUR-ySaZEDxG"]/following::a[@id="CUR-WWDmuSAk"]').should('be.visible'); }
  PayeeContractsTabNextButtonValidate() { cy.xpath('//span[@id="CUR-ezshOabu"]/following::span[@aria-label="Next"][1]').should('be.visible'); }
  PayeeContractsTabPreviousButtonValidate() { cy.xpath('//span[@id="CUR-ezshOabu"]/following::span[@aria-label="Previous"][1]').should('be.visible'); }
  PayeeContractsTabCurrentPageValidate() { cy.xpath('//span[@id="CUR-ySaZEDxG"]/following::span[@ng-click="changePage({ page: page })"][1]').should('be.visible'); }
  PayeeContractsTabValidateData(text) { cy.get('#CUR-kgcqScUD').contains(text).first().should('be.visible').wait(2000); }

  // Copy Payee
  PayeeSearchbarType(text) { cy.get('#CUR-rYmCZlqH').should('be.visible').clear().type(text).type('{enter}').wait(5000); }
  PayeeSearchResultClick(text) { cy.xpath('//div[@id="CUR-AflfMogt"]/following::a').contains(text).first().should('be.visible').click().wait(2000); }
  PayeeCopyButtonClick() { cy.get('#CUR-pUrJnkLb').should('be.visible').click().wait(4000); }
  PayeeCopyNameValidate(text) { cy.get('#CUR-vNACcVKV').should('have.value', text).should('be.visible'); }

  // Import Payee
  PayeeImportClick() { cy.get('#CUR-rZPDYyzN').click().wait(2000); }
  PayeeNoFilesAttachedValidate(text) { cy.xpath('//li[@class="ng-binding ng-scope"]').should('be.visible').contains(text); }
  FileAttach(file) { cy.get('input[type=file]').attachFile(file).wait(5000); }
  PayeeOverwriteBlankValueClick() { cy.xpath('//h5[contains(text(),"Import Payees")]/following::input[@type="checkbox"]').should('be.visible').click().wait(2000); }
  PayeeModalImportClick() { cy.get('#CUR-QbvHbKWR').click().wait(5000); }
  PayeeDownloadTemplateButtonClick() { cy.get('#CUR-rgAXWcpf').should('be.visible').click(); }
  PayeeCreatedClick(text) { cy.get('#CUR-tgyUimhn').contains(text).should('be.visible').click().wait(2000); }
  // Validate Imported File
  NotifBellValidate(text, value) { cy.xpath('//div[@ng-click="showNotifications()"]').contains(text).should('have.text', value).wait(1000).click().wait(3000); }
  NotifMsgValidate(text) { cy.xpath('//div[@ng-click="showNotifications()"]/following::a[@class="ng-binding ng-scope"][1]').contains(text).should('be.visible').wait(2000); }
  PayeeListofErrorValidate() { cy.xpath('//div[@ng-click="showNotifications()"]/following::i[@class="fa fa-eye"][1]').should('be.visible').click().wait(2000); }
  PayeeErrorNotifValidate() { cy.xpath('//h5[contains(text(),"Your Payee Import Has Errored")]').should('be.visible'); }
  PayeeNotifModalCancelClick() { cy.xpath('//h5[contains(text(),"Your Payee Import Has Errored")]/following::button[1]').should('be.visible').click().wait(2000) }
  PayeeSearchIconClick() { cy.get('#CUR-bpBBggvy').click().wait(5000); }
  PayeeTestDataValidate(text) { cy.get('#CUR-CsnuAETh a').contains(text).should('be.visible'); }
  PayeeCategoryValidate(text) { cy.get ('#CUR-CsnuAETh span').contains(text).should('be.visible'); }
  // Delete Import
  PayeeDeleteImportedDataClick(test) { cy.get('#CUR-CsnuAETh a').contains(test).click().wait(2000); }
  PayeeTableTestDataValidate(text) { cy.get('#CUR-tgyUimhn').contains(text).should('be.visible'); }

  // Validate Linked payee user
  PayeeWarningmessageValidate(text) { cy.get('#CUR-LXpnnkMj').contains(text).should('not.exist'); }



  // Payee Analytics Tab
  PayeeAnalyticsTabClick() { cy.get('#CUR-uhQVGoJz').should('be.visible').click().wait(2000); }
  PayeeAnalyticsTabHeadersValidate(text) { cy.xpath('//div[@class="panel-title ng-binding"]').contains(text).should('be.visible'); }
  PayeeAnalytitcsTabHeaderTotalValidate(text) { cy.xpath('//div[@class="panel-title text-white"]').contains(text).should('be.visible'); }
  PayeeAnalyticsTabSelectGraphsValidate(text) { cy.xpath('//div[@class="panel-title"]').contains(text).should('be.visible'); }
  // Filter Validation
  PayeeAnalyticsFilterHeaderValidate(text) { cy.xpath('//span[@id="CUR-uhQVGoJz"]/following::div[contains(text(),"Filter")][2]').contains(text).should('be.visible'); }
  PayeeAnalayticsTabFilterClick() { cy.xpath('//div[@class="panel-heading p-b-15"]').should('be.visible').click().wait(2000); }
  PayeeAnalyticsTabGobuttonValidate() { cy.xpath('//button[@data-ng-click="getAnalyticsData()"]').should('be.visible'); }
  PayeeAnalyticsFieldDropdValidate() { cy.xpath('//span[@id="CUR-uhQVGoJz"]/following::span[@tabindex="-1"][3]').should('be.visible'); }
  PayeeAnalyticsValueValidate() { cy.xpath('//span[@id="CUR-uhQVGoJz"]/following::input[@disabled="disabled"]').should('be.visible'); }
  PayeeAnalyticsAndAddValidate() { cy.xpath('//button[@data-ng-click="addFilterRow(filterBlock)"]').should('be.visible'); }
  PayeeAnalyticsOrAddValidate() { cy.xpath('//button[@data-ng-click="addFilterBlock(filters)"]').should('be.visible'); }
  PayeeAnalyticsaddComparisonValidate() { cy.xpath('//button[@data-ng-click="addComparisonFilter()"]').should('be.visible').wait(2000); }
  // Select Graphs Checkboxes Validation
  PayeeAnalyticsSelectGraphsCBValidation(text) { cy.xpath('//label[@class="ng-binding"]').contains(text).should('be.visible'); }

  // Delete Multiple and single Payee 
  PayeeSingleCheckBClick() { cy.xpath('//input[@id="item-select-0"]').should('be.visible').click().wait(1000) }
  PayeeSecondCheckBClick() { cy.xpath('//input[@id="item-select-1"]').should('be.visible').click().wait(1000) }
  PayeeIndexDeleteClick() { cy.get('#CUR-GAGrmAkQ').should('be.visible').click().wait(2000); }
  PayeeIndexDeleteSelectedClick() { cy.get('#CUR-nOMWcuIZ').should('be.visible').click().wait(2000); }
  PayeeIndexDeleteSelectedModalClick() { cy.get('#CUR-nUQQWfRu').should('be.visible').click().wait(2000); }

  // Export Validation
  PayeeCheckAllCheckBClick() { cy.xpath('//input[@class="select-all"]').should('be.visible').click().wait(1000) }
  PayeeExportClick() { cy.get('#CUR-hzouaqxY').should('be.visible').click().wait(2000); }
  PayeeExportNotifValidation(text) { cy.xpath('//a[@class="ng-binding ng-scope"]').contains(text).first().should('be.visible'); }
  PayeeExportDownloadClick() { cy.xpath('//div[@class="fa fa-bell"]/following::i[@class="fa fa-download"][1]').should('be.visible').click().wait(5000); }
  PayeeFilterButtonClick() { cy.get('#CUR-qJVOIKBD').should('be.visible').click().wait(2000); }

  // Wise Validation
  PayeeFromWiseRadioBClick() { cy.xpath('//div[contains(text(),"Payment Details")]/following::input[@id="CUR-NsquPQGI"][1]').should('be.visible').click().wait(3000); }
  PayeeFromWiseDropdClick() { cy.xpath('//div[contains(text(),"Payment Details")]/following::span[@tabindex="-1"][1]').click().wait(4000); }
  PayeeEnterManuallyRadioBClick() { cy.xpath('//div[contains(text(),"Payment Details")]/following::input[@id="CUR-NsquPQGI"][2]').should('be.visible').click().wait(3000); }
  PayeePaymentMethodDropDClick() { cy.xpath('//label[contains(text(),"Payment Method")]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PayeePaymentMethodDropDSelectionClick(text) { cy.xpath('//label[contains(text(),"Payment Method")]/following::span[@id="CUR-RNOARqAv"]').contains(text).should('be.visible').click().wait(2000); }
  PayeeUkSortCodeField(text) { cy.xpath('//a[@id="CUR-jbbBXmfV"]/following::input[@id="CUR-bkQidsCi"][1]').clear().type(text); }
  PayeeAccountNumber(text) { cy.xpath('//a[@id="CUR-jbbBXmfV"]/following::input[@id="CUR-bkQidsCi"][2]').clear().type(text); }

  // Tipalti Validation
  PayeePayeeIDType(text) { cy.xpath('//div[contains(text(),"Payment Details")]/following::input[@id="CUR-BDfZmCTD"]').should('be.visible').clear().type(text); }
  // Shows up if IBAN was selected
  PayeeRecipientTypeClick() { cy.xpath('//label[contains(text(),"Recipient type")]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PayeeReceipientTypeSelectionClick(text) { cy.get('#CUR-hgogIuQD').contains(text).should('be.visible').click().wait(2000); }
  PayeeBankCodeFieldType(text) { cy.xpath('//a[@id="CUR-jbbBXmfV"]/following::input[@id="CUR-bkQidsCi"][1]').clear().type(text); }
  PayeeIbanWiseType(text) { cy.xpath('//a[@id="CUR-jbbBXmfV"]/following::input[@id="CUR-bkQidsCi"][2]').clear().type(text); }

  // Tipalty Validation



  // Save payee & test response
  PayeePayeeSaveClick() { cy.get('#CUR-dJtpHGja').click(); } // click save
  PayeeSuccessMsgValidate() { cy.xpath('//div[@class="alert alert-success"]').should('be.visible'); }
  PayeeErrorMessageValidate(text) { cy.xpath('//div[@class="alert alert-error"]').contains(text).should('be.visible'); }
  // Verify edit page with saved data
  PayeeVerifyPayeeNameValidate() { cy.get('#CUR-vNACcVKV').should('have.value', payeeName); }
  PayeeVerifyAlternateNameValidate(text) { cy.get('#CUR-CJyhlJZW').should('have.value', text); }
  PayeeVerifyPaymentEmailValidate(text) { cy.get('#CUR-MnQDkMSC').should('have.value', text).wait(3000); }
  PayeeVerifyPayeeNameEditValidate(text) { cy.get('#CUR-vNACcVKV').should('have.value', text); } 
  // Navigate to select page
  PayeePayeesLinkClick() { cy.get('#CUR-jbbBXmfV').click(); }
  // Find and click newly created composer
  PayeeNewComposerValidate() { cy.selectScreenFind(payeeName); }
  // Update payee
  PayeeUpdatePayeeNameValidate() { cy.get('#CUR-vNACcVKV').clear().clear().type(payeeName + ' Changed'); }
  PayeeUpdateAlternateNameType(text) { cy.get('#CUR-CJyhlJZW').clear().clear().type(text); }
  PayeePayeeDeleteSelectedCategoryClick() { cy.xpath('//span[@class="close ui-select-match-close"]').click().wait(2000); }
  PayeeUpdateCategoriesClick() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::input[@type="search"][1]').click().wait(3000); }
  PayeeUpdateCategoriesSelectionClick() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  // Save payee & test response
  // Click through delete workflow and verify deletion
  PayeeDeleteCancelButtonClick(text) { cy.xpath('//h5[contains(text(),"Delete Payee")]/following::button[@id="CUR-GlIEbmwZ"]').should('be.visible').contains(text).first().click().wait(2000); }
  PayeePayeeDeleteButtonClick() { cy.get('#CUR-DkcbEfDr').contains('Delete').should('be.visible').click().wait(2000) }
  PayeePayeeDeleteButtonModalClick() { cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click({ force: true }).wait(10000); }
  Testing() { cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click().wait(2000); }
  LogoutWait() {
    cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
      if ($logout.is(':visible')) {
        cy.log('Logout button is found').wait(30000);
      } else {
        cy.xpath('//a[@id=\'logout-button\']').wait(30000);

      }
    })

  }

  // Contracts TC
  ContractsMenuClick() { cy.get('#sidebar-contracts > a').click().wait(2000); }
  ContractsSubMenuClick() { cy.get('#sidebar-contract-submenu > a').should('be.visible').click().wait(2000); }
  // Page Content Validation
  ContractSearchBarValidate() { cy.get('#CUR-rmJHDCfY').should('be.visible'); }
  ContractsSearchBarButtonValidate() { cy.get('#CUR-cvqKuYKK').should('be.visible'); }
  ContractDeleteButtonValidate() { cy.get('#CUR-IPEEOupo').should('be.visible'); }
  ContractCreateButtonValidate() { cy.get('#CUR-UDpJJUhA').should('be.visible'); }
  ContractExportButtonValidate() { cy.get('#CUR-GqETKmnj').should('be.visible'); }
  ContractsImportContractsButtonValidate() { cy.get('#CUR-xqVjxuMZ').should('be.visible'); }
  ContractsImportTransactionsValidate() { cy.get('#CUR-SOZjjcnO').should('be.visible'); }
  ContractsExportTransactionsValidate() { cy.get('#CUR-VmJCQpXn').should('be.visible'); }
  ContractsFilterValidate(text) { cy.get('#CUR-uGIsUwPG').should('be.visible').contains(text); }
  ContractsCompleteDDownValidate() { cy.get('#CUR-UBJcRsgF .ui-select-match').should('be.visible'); }
  ContractsCompleteDDownClick() { cy.xpath ('//label[@id="CUR-JnbARxvG"]/following::span[@tabindex="-1"]').should('be.visible').click().wait(2000); }
  ContractsCompleteDdownSelValidate() { cy.xpath('//label[@id="CUR-JnbARxvG"]/following::span[contains(text(),"Complete")]').should('be.visible'); }
  ContractsCompleteDdownSelIcompleteValidate() { cy.xpath('//label[@id="CUR-JnbARxvG"]/following::span[contains(text(),"Incomplete")]'); }
  ContractsCompanyValidate() { cy.xpath('//label[contains(text(),"Company")]/following::input[@type="search"][1]').should('be.visible'); }
  ContractsCategoryValidate() { cy.xpath('//label[contains(text(),"Category")]/following::input[@type="search"][1]').should('be.visible'); }
  ContractsTableValidate(text) { cy.xpath('//div[@id="CUR-gEuGkPVD"]/following::th').contains(text).should('be.visible'); }
  ContractsSearchDuplicateType(text) { cy.get('#CUR-rmJHDCfY').should('be.visible').click().clear().type(text).type('{enter}').wait(5000); }
  ContractsSearchClear() { cy.get('#CUR-rmJHDCfY').clear().type('{enter}').wait(2000); }
  ContractClickCreated(text) { cy.get('#CUR-hgXZltem').should('be.visible').contains(text).click().wait(2000); }
  ContractsCreatedIndexNotExistValidate(text) { cy.get('#CUR-hgXZltem').contains(text).should('not.exist').wait(2000); }

  //
  // Insert Condition statement here to delete if there's an existing duplicate data
  //
  ContractDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($body.text().includes('A Smoke Contract')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-hgXZltem').contains('A Smoke Contract').click().wait(2000);
      cy.get('#CUR-EDDJtFXV').click().wait(1000) // delete button
      cy.get('#CUR-SIepMXur').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Smoke Contract Update')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-hgXZltem').contains('A Smoke Contract Update').click().wait(2000);
      cy.get('#CUR-EDDJtFXV').click().wait(1000) // delete button
      cy.get('#CUR-SIepMXur').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Smoke Contract', 'A Smoke Contract Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  ContractsTotalValidate() { cy.get('#CUR-lVywEzGZ').should('be.visible'); }
  ContractsCheckBValidate() { cy.get('#CUR-yjgnVbsQ').should('be.visible'); }
  ContractsIndexShowingPerPageValidate() { cy.get('#CUR-kJnQehmj').should('be.visible'); }
  ContractsIndexShowAllValidate() { cy.get('#CUR-aqJLAuLp').should('be.visible'); }
  ContractsIndexPreviousValidate() { cy.xpath('//span[@aria-label="Previous"]').should('be.visible'); }
  ContractsIndexNextValidate() { cy.xpath('//span[@aria-label="Next"]').should('be.visible'); }
  ContractCurrentPageValidate() { cy.xpath('//span[@aria-label="Previous"]/following::span[@role="button"][1]').should('be.visible'); }
  // Click Create Button
  ContractsCreateClick() { cy.get('#CUR-UDpJJUhA').click().wait(10000); }
  ContractSelectPayee() { cy.typeAheadSelection('stan', 'Z Standard', '#CUR-eahYeMnc'); }
  ContractsNameFieldType(text) { cy.get('#CUR-tYltRUcS').type(text); }
  ContractsStartDateType(number) { cy.get('#CUR-dyWxzodj').clear().type(number); }
  ContractsStartDateDoneButtonClick() { cy.xpath('//button[contains(text(),"Done")]').click().wait(1000); }
  ContractsEndDateType(text) { cy.get('#CUR-HCfjjYNb').clear().type(text); }
  ContractsForeignIDType(text) { cy.get('#CUR-gaQtKgcB').clear().type(text); }
  ContractsProjectIDType(text) { cy.get('#CUR-projectId-input').clear().type(text); }
  ContractsCopyValidate() { cy.get('#CUR-eGbNFkgv').should('be.visible'); }
  ContractsEditSeeFullHistoryValidate() { cy.get('#CUR-jKsgeiLz').should('be.visible'); }
  ContractsOverviewHeaderValidate(text) { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::div[@class="panel-title"]').contains(text).should('be.visible'); }
  ContractsActiveCheckboxValidate() { cy.xpath('//input[@type="checkbox" and @id="CUR-WPOpLNjX"]').should('be.visible'); }
  ContractsFileTextValidate() { cy.xpath('//p[contains(text(),"Please save the contract before uploading files")]').should('be.visible'); }
  ContractsOpeningBalanceValidate() { cy.xpath('//div[contains(text(),"Finances")]/following::input[@id="CUR-XAgXnZFz"]').should('be.visible'); }
  ContractsMinPayoutValidate() { cy.xpath('//div[contains(text(),"Finances")]/following::input[@id="CUR-pLtIIIAd"]').should('be.visible'); }
  ContractsGenerateSelfBillingInvoiceValidate() { cy.xpath('//div[contains(text(),"Finances")]/following::input[@id="CUR-NbVBVKni"]').should('be.visible'); }
  ContractsGenerateFeesInvoiceValidate() { cy.xpath('//div[contains(text(),"Finances")]/following::input[@id="CUR-DFqUjlRE"]').should('be.visible'); }
  ContractsDeductWithholdingTaxValidate() { cy.xpath('//div[contains(text(),"Finances")]/following::input[@id="CUR-GCVloQPW"]').should('be.visible'); }
  ContractsLabelsAddButtonValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-BZAXogGG"]').should('be.visible'); }
  ContractsFlushContractCatalogueValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-YVsMCCxn"]').should('be.visible'); }
  ContractsLabelsAddButtonClick() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-BZAXogGG"]').should('be.visible').click().wait(2000); }
  ContractsLabelsDeleteValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-ZVsmIelu"]').should('be.visible'); }
  ContractsGenerateAutoPaymentCboxValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@id="CUR-XTiyvqea"]').should('be.visible'); }
  ContractsPaymentConditionValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-doBDJZIS"]').should('be.visible'); }
  ContractsPaymentConditionClick() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-doBDJZIS"]').should('be.visible').click().wait(2000); }
  ContractsPaymentConditionContractValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@tooltip-animation="true"][2]').should('be.visible'); }
  ContractsPaymentConditionWhenValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::span[@tabindex="-1"][5]').should('be.visible'); }
  ContractsCrossContractValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-mlpOrjUr"]').should('be.visible'); }
  ContractsCrossContractClick() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-mlpOrjUr"]').should('be.visible').click().wait(5000); }
  ContractsCrossContractWhenValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::span[@tabindex="-1"][6]').should('be.visible'); }
  ContractsCrossContractProcessValidate() { cy.xpath('//label[contains(text(),"Process")]').should('be.visible'); }
  ContractsCrossContractContractValidate() { cy.xpath('//input[@id="CUR-payee-select-field"]/following::input[@type="text" and @aria-expanded="false"]').should('be.visible'); }
  ContractsCrossContractPercentageValidate() { cy.xpath('//label[contains(text(),"%")]').should('be.visible'); }
  ContractsCrossContractOnlyrunCboxValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@type="checkbox"][7]').should('be.visible'); }
  ContractsCrossContractDeleteButtonValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::i[@class="fa fa-trash"][3]').should('be.visible'); }
  ContractSummaryStatementCBoxValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@id="CUR-GucJbFFj"]').should('be.visible'); }
  ContractCrossContractType(text) { cy.xpath('//input[@id="CUR-payee-select-field"]/following::input[@type="text" and @aria-expanded="false"]').should('be.visible').type(text).wait(2000); }
  ContractCrossContractSelectGelo100() { cy.xpath('//a[@title="Test Gelo 100"]').should('be.visible').click().wait(1000); }

  // Add Society
  CompoAddSocietyClick() { cy.get('#CUR-JBVHZMOm').should('be.visible').click().wait(2000); }
  // for publisher
  ContractsPaymentConditionPublisherValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-doBDJZIS"]').should('be.visible'); }
  ContractsPaymentConditionPubClick() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-doBDJZIS"]').should('be.visible').click().wait(2000); }
  ContractsGenAutoPaymentPubValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@type="text" and @ng-model="getterSetter"][2]').should('be.visible'); }
  ContractsPaymentCrossContractPubValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-mlpOrjUr"]').should('be.visible'); }
  ContractsPaymentCrossContractPubClick() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::button[@id="CUR-mlpOrjUr"]').should('be.visible').click().wait(2000); }
  ContractsTotalAssocStatementsCbValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@id="CUR-GucJbFFj"]').should('be.visible'); }
  ContractAutoPaymentContractValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@type="text" and @ng-model="getterSetter"][2]').should('be.visible'); }
  ContractAutoPayWhenValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::span[@tabindex="-1"][5]').should('be.visible'); }
  ContractCrossContractWhenValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::span[@tabindex="-1"][6]').should('be.visible'); }
  ContractCrossContractProcessValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::span[@tabindex="-1"][7]').should('be.visible'); }
  ContractCrossContractContractValidate() { cy.xpath('//span[@id="CUR-rPYOwINA"]/following::input[@type="text" and @ng-model="getterSetter"][3]').should('be.visible'); }

  // Categories
  ContractsClickCategoriesDdownClick() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').click().wait(2000); }
  ContractsTypeCategoriesDdClick() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').type('Premium').wait(1000); }
  ContractsSelectCreatorClick() { cy.get('#CUR-nxGGltrV span').contains('Premium').click().wait(2000); }
  ContractsTypeCategoriesDdCreatorClick() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').type('Creator').wait(1000); }
  ContractsSelectCreatorCreatorClick() { cy.get('#CUR-nxGGltrV span').contains('Creator').click().wait(2000); }
  // HomeCurrency
  ContractsHomeCurrencyDDClick() { cy.xpath('//label[@id="CUR-tXdmkGHf"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  ContractsHomeCurrencyDDSelectionClick() { cy.xpath('//label[@id="CUR-tXdmkGHf"]/following::span[@id="CUR-LQcCzhiE"][1]').click({ force: true }); }
  // Accounting Period
  ContractsAccountingPeriodClick() { cy.xpath('//label[@id="CUR-KuWObaYW"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  ContractsAccountingPeriodDDSelectionClick() { cy.xpath('//span[@id="CUR-BcAglvFK" and text()="Yearly"]').click(); }
  ContractsAcctgPeriodHalfYearlySelClick() { cy.xpath('//span[@id="CUR-BcAglvFK" and text()="Half-Yearly"]').should('be.visible').click().wait(1000); }
  ContractsAcctgPeriodMonthlySelClick() { cy.xpath('//span[@id="CUR-BcAglvFK" and text()="Monthly"]').should('be.visible').click().wait(1000); }
  // Finances
  ContractsOpeningBalanceType() { cy.get('#CUR-XAgXnZFz').type('50'); }
  ContractsMinPayoutType() { cy.get('#CUR-pLtIIIAd').type('10'); }
  // Contract Type
  ContractsClickContractTypeClick() { cy.get('#CUR-lCgBDBVK').click().wait(1000); }
  ContractsClickContractTypeDDSelectionClick() { cy.get('#CUR-lCgBDBVK span').contains('Royalty').click(); }
  // terms page
  ContractsTermsTabClick() { cy.get('#CUR-aXNqZBBZ').click().wait(3000); }
  ContractsIncomeClick() { cy.get('#CUR-idpDiiuB').click(); }
  ContractsDealTypeDDSelect() { cy.xpath('//div[@id="CUR-KhIBBHQC"]/following::select[@aria-invalid="false"][6]').select('string:Gross Receipts').wait(2000); }
  ContractsRateType(number) { cy.xpath('//label[contains(text(),"Cat Group")]/following::input[@type="text"][2]').type(number); }
  LabelContractsTermsTabClick() { cy.get('#CUR-aXNqZBBZ').click().wait(3000); }
  LabelContractsSalesClick() { cy.get('#CUR-rjmQDouq').click().wait(2000); }
  LabelContractsDealTypeDDSelect() { cy.xpath('//div[@id="CUR-MWHEIZHC"]/following::select[@ng-model="sale.type"]').select('string:Gross Receipts').wait(2000); }
  LabelContractsRateType(number) { cy.xpath('//label[contains(text(),"Cat Group")]/following::input[@type="text"][2]').type(number); }
  LabelContractsMultiplierType(number) { cy.xpath('//div[@id="CUR-MWHEIZHC"]/following::input[@type="text"][3]').type(number); }
  LabelContractsReductionType(number) { cy.xpath('//div[@id="CUR-MWHEIZHC"]/following::input[@type="text"][4]').type(number); }

  // Terms Tab Validation
  // Sales
  ContractsTermsHeadersValidate(text) { cy.get('#CUR-sQPHJJzR').contains(text).should('be.visible'); }
  ContractsAddSalesButtonClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::button[@id="CUR-rjmQDouq"]').should('be.visible').click().wait(2000); }

  ContractSalesCatTypeDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.catType"]').should('be.visible'); }
  ContractSalesCatGroupDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.catalogueGroup"]').should('be.visible'); }
  ContractSalesTerritoryDdownValidate() { cy.xpath('//label[contains(text(),"Territory")]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  ContractSalesChannelDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.channel"]').should('be.visible'); }
  ContractSalesConfigDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.configuration"]').should('be.visible'); }
  ContractSalesPriceCategoryValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.priceCategory"]').should('be.visible'); }
  ContractSalesSourceValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.source"]').should('be.visible'); }
  ContractSalesDealTypeValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.type"]').should('be.visible'); }
  ContractSalesRateValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="sale.rate"]').should('be.visible'); }
  ContractSalesMultiplierValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="sale.multiplier"]').should('be.visible'); }
  ContractSalesReductionValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="sale.reductionRate"]').should('be.visible'); }
  ContractSalesReserveValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="sale.reserve"]').should('be.visible'); }
  ContractSalesCatTypeDdownNotExistValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.catType"]').should('not.exist'); }
  
  ContractSalesDeleteClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  // Deductions
  ContractsDeductionsButtonClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::button[@id="CUR-tPohcINI"]').should('be.visible').click().wait(2000); }
  ContractDeductionTypeValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.deductionBasis"]').should('be.visible'); }
  ContractRateValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="sale.rate"]').should('be.visible'); }
  ContractBasisValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="sale.deductionBasis"]').should('be.visible'); }
  // Mechanaical Deduction Validate
  ContractTermButtonClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::button[@id="CUR-myKPsVJI"]').should('be.visible').click().wait(2000); }
  ContractMechDCatTypeDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.catType"]').should('be.visible'); }
  ContractMechDCatGroupDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.catalogueGroup"]').should('be.visible'); }
  ContractMechDChannelDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.channel"]').should('be.visible'); }
  ContractMechDConfigDdownValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.configuration"]').should('be.visible'); }
  ContractMechDPriceCategoryValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.priceCategory"]').should('be.visible'); }
  ContractMechDSourceValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.source"]').should('be.visible'); }
  ContractMechDBasisValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.type"]').should('be.visible'); }
  ContractMechDDeductionTypeValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.deductionType"]').should('be.visible'); }
  ContractMechDRateBasisValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="term.rateBasis"]').should('be.visible'); }
  ContractMechDRateValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="term.rate"]').should('be.visible'); }
  ContractMechDReserveValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="term.reserve"]').should('be.visible'); }
  ContractMechDCurrencyValidate() { cy.xpath('//label[contains(text(),"Territory")]/following::span[@tabindex="-1"][2]').should('be.visible'); }
  // Withholding Tax Deductions
  ContractWithholdTaxButtonClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::button[@id="CUR-yOMlaBJs"]').should('be.visible').click().wait(2000); }
  // Cost
  ContractCostsClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::button[@id="CUR-QbdLopnT"]').should('be.visible').click().wait(2000); }
  ContractCostTypeValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::select[@ng-model="cost.type"]').should('be.visible'); }
  ContractCostRateValidate() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::input[@ng-model="cost.rate"]').should('be.visible'); }
  ContractCostTableValidate(text) { cy.xpath('//span[@id="CUR-WatIkiaG"]/following::div[@id="CUR-TGHeNyuk"]').contains(text).should('be.visible'); }

  // for Publisher
  ContractsAddIncomeButtonClick() { cy.xpath('//span[@id="CUR-aXNqZBBZ"]/following::button[@id="CUR-idpDiiuB"]').should('be.visible').click().wait(2000); }

  // Reserves Validation
  ContractsReservesTabClick() { cy.get('#CUR-XZpvsqAT').should('be.visible').click().wait(2000); }
  ContractsAddReserveButtonClick() { cy.xpath('//a[@id="CUR-XZpvsqAT"]/following::button[@id="CUR-OuSPJsjs"]').click().wait(2000); }
  ContractsReservePeriodTextFieldValidate() { cy.xpath('//a[@id="CUR-XZpvsqAT"]/following::input[@ng-model="reserve.rate"]').should('be.visible'); }
  ContractsReserveDeleteButtonClick() { cy.xpath('//label[contains(text(),"Period 1")]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  ContractsReserveBasisDropdValidate() { cy.xpath('//div[@id="CUR-RaRrOqko"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  ContractReserveBasisDropdSelPreValidate() { cy.xpath('//div[@id="CUR-RaRrOqko"]/following::span[@id="CUR-SMwHCtPG"][1]').should('be.visible'); }
  ContractReserveBasisDropdSelPostValidate() { cy.xpath('//div[@id="CUR-RaRrOqko"]/following::span[@id="CUR-SMwHCtPG"][2]').should('be.visible'); }
 
  // Escalation Tab
  ContractsEscalationTabClick() { cy.get('#CUR-jzWfyYYX').should('be.visible').click().wait(2000); }
  ContractsAddEscalationClick() { cy.xpath('//span[@id="CUR-jzWfyYYX"]/following::button[@id="CUR-ebnZWinU"]').should('be.visible').click().wait(2000); }
  ContractEscalationTrackingNameValidate() { cy.xpath('//input[@ng-model="escalation.name"]').should('be.visible'); }
  ContractsEscUnitsValidate() { cy.xpath('//input[@ng-model="escalation.units"]').should('be.visible'); }
  ContractsEscGrossAmountsValidate() { cy.xpath('//input[@ng-model="escalation.gross"]').should('be.visible'); }
  ContractsEscNetAmountValidate() { cy.xpath('//input[@ng-model="escalation.net"]').should('be.visible'); }
  ContractsEscDeleteButtonClick() { cy.xpath('//input[@ng-model="escalation.net"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  ContractsEscEquivalentClick() { cy.xpath('//span[@id="CUR-jzWfyYYX"]/following::button[@id="CUR-zegkwIzq"]').should('be.visible').click().wait(2000); }
  ContractEscEqValidate() { cy.xpath('//label[contains(text(),"Configuration")]/following::select[1]').should('be.visible'); }
  ContractEscEqAmountValidate() { cy.xpath('//label[contains(text(),"Amount")]/following::input[@type="number"]').should('be.visible'); }

  // Catalogues Tab
  ContractsCatalogueTabClick() { cy.get('#CUR-OAwbLlyG').should('be.visible').click().wait(2000); }
  ContractSCatReleasesTabClick() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::span[@id="CUR-KhjVHefC"]').should('be.visible').click().wait(2000); }
  ContractsCatReleasesTableValidate(text) { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::div[@id="CUR-lYTENfvp"]').contains(text).should('be.visible'); }
  ContractSCatTracksTabClick() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::span[@id="CUR-qtdOXpJP"]').should('be.visible').click().wait(2000); }
  ContractsCatReleaseTablePubValidate(text) { cy.xpath('//div[@id="CUR-wpGcxvSf"]').contains(text).should('be.visible'); }
  ContractsCatShowing25perpagepUBValidate() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::span[@id="CUR-dDGDPpzN"][1]').should('be.visible'); }
  ContractsCatShowAllPubValidate() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::a[@id="CUR-gUCHLhhu"][1]').should('be.visible'); }
  ContractsCatTracksShowing25Validate() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::span[@id="CUR-yOOdZxzp"][1]').should('be.visible'); }
  ContractsCatTracksShowAllValidate() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::a[@id="CUR-hbJjllXG"][1]').should('be.visible'); }
  ContractsCatReleaseShowing25Validate() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::SPAN[@id="CUR-YogPQztN"][1]').should('be.visible'); }
  ContractsCatReleaseShowAllValidate() { cy.xpath('//span[@id="CUR-OAwbLlyG"]/following::a[@id="CUR-WKJQVort"][1]').should('be.visible'); }
  

  // Costs Tab
  ContractsCostTabClick() { cy.get('#CUR-WatIkiaG').should('be.visible').click().wait(2000); }
  ContractsHeadersValidate(text) { cy.xpath('//span[@id="CUR-WatIkiaG"]/following::th').contains(text).should('be.visible'); }

  // Transactions Tab
  ContractsTransactionsTabClick() { cy.get('#CUR-qqDowGnR').should('be.visible').click().wait(2000); }
  ContractsTransactionsCreateClick() { cy.xpath('//span[@id="CUR-qqDowGnR"]/following::a[@id="CUR-bMVuVPHT"]').should('be.visible').click().wait(5000); }
  ContractsTransactionsHeaderValidate(text) { cy.xpath('//span[@id="CUR-qqDowGnR"]/following::div[@id="CUR-sDYXbohL"]').contains(text).should('be.visible'); }
  ContractsTransactionsContractLinkClick() { cy.get('#CUR-xqwHwZAC').should('be.visible').click().wait(2000); }
  ContractsTransactionHeaderValidate() { cy.xpath('//span[@id="CUR-qqDowGnR"]/following::div[@id="CUR-XLYOTIgo"]').should('be.visible'); }
  ContractsFutureTransactionHeaderValidate() { cy.xpath('//span[@id="CUR-qqDowGnR"]/following::h4[@id="CUR-GsnSyvdh"]').should('be.visible'); }
  ContractsFutureTransactHeadersValidate(text) { cy.get('#CUR-lZLrBVIm').contains(text).should('be.visible'); }
  // create page validation
  ContractsTransactionsOverviewHeaderValidate() { cy.get('#CUR-MyTDqWBl').should('be.visible'); }
  ContractsTransactionsNameValidate() { cy.get('#CUR-rOAQPZdZ').should('be.visible'); }
  ContractsTransactionsTypeClick() { cy.xpath('//input[@id="CUR-rOAQPZdZ"]/following::span[@tabindex="-1"]').should('be.visible').click().wait(2000); }
  ContractsTransactionTypeSelPaymtValidate() { cy.xpath('//span[text()="Payment"]').should('be.visible'); }
  ContractsTransactionTypeSelRoyalValidate() { cy.xpath('//span[text()="Royalties"]').should('be.visible'); }
  ContractsTransactionTypeSelAdvanceValidate() { cy.xpath('//span[text()="Advance"]').should('be.visible'); }
  ContractsTransactionTypeSelWithheldValidate() { cy.xpath('//span[text()="Reserve Withheld"]').should('be.visible'); }
  ContractsTransactionTypeSelReleasedValidate() { cy.xpath('//span[text()="Reserve Released"]').should('be.visible'); }
  ContractsTransactionTypeSelOtherValidate() { cy.xpath('//span[text()="Other"]').should('be.visible'); }
  ContractsTransactionsDateValidate() { cy.get('#CUR-PXQpTyqN').should('be.visible'); }
  ContractsTransactionsAmountValidate() { cy.xpath('//input[@id="CUR-PXQpTyqN"]/following::input[@id="CUR-ArcmuGxY"][1]').should('be.visible'); }
  ContractsTransactionsInvoiceValidate() { cy.xpath('//input[@id="CUR-PXQpTyqN"]/following::input[@id="CUR-ArcmuGxY"][2]').should('be.visible'); }
  ContractsTransactionsReserveReleaseCboxValidate() { cy.get('#CUR-RFQojTMa').should('be.visible'); }
  ContractsTransactionsReserveTakenCboxValidate() { cy.get('#CUR-NLeuCPAH').should('be.visible'); }
  ContractsTransactionsDescriptionValidate() { cy.xpath('//input[@id="CUR-rOAQPZdZ"]/following::textarea[1]').should('be.visible'); }



  
  // Aliases
  ContractsAliasesTabClick() { cy.get('#CUR-ULXukNjy').should('be.visible').click().wait(2000); }
  ContractsAddAliasClick() { cy.xpath('//span[@id="CUR-ULXukNjy"]/following::button[@id="CUR-KJinihGR"]').should('be.visible').click().wait(3000); }
  ContractAliasDeleteButtonClick() { cy.xpath('//span[@id="CUR-ULXukNjy"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(3000); }

  // Analytics
  ContractsAnalyticsTabClick() { cy.get('#CUR-pszzGMAW').should('be.visible').click().wait(2000); }
  ContractsAnalyticsFilterClick() { cy.xpath('//div[@class="panel-heading p-b-15"]').should('be.visible').click().wait(2000); }
  ContractsAnalyticsFilterHeaderValidate() { cy.xpath('//div[text()="Filter"]').should('be.visible'); }
  ContractsAnalyticsFieldDropdValidate() { cy.xpath('//div[text()="Filter"]/following::span[@tabindex="-1"]').should('be.visible'); }
  ContractsAnalyticsFieldValueValidate() { cy.xpath('//div[text()="Filter"]/following::input[@type="text"][2]').should('be.visible'); }
  ContractsAnalyticsAndButtonValidate() { cy.xpath('//div[text()="Filter"]/following::button[@data-ng-click="addFilterRow(filterBlock)"]').should('be.visible'); }
  ContractsAnalyticsOrButtonValidate() { cy.xpath('//div[text()="Filter"]/following::button[@data-ng-click="addFilterBlock(filters)"]').should('be.visible'); }
  ContractsAnalyticsComparisonrButtonValidate() { cy.xpath('//div[text()="Filter"]/following::button[@data-ng-click="addComparisonFilter()"]').should('be.visible'); }
  ContractsAnalyticsSelectGraphCboxValidate(text) { cy.xpath('//div[text()="Filter"]/following::label[@class="ng-binding"]').contains(text).should('be.visible'); }
  ContractsAnalyticsGoButtonValidate() { cy.xpath('//div[text()="Filter"]/following::button[@data-ng-click="getAnalyticsData()"]').should('be.visible'); }
  ContractsAnalyticsHeadersValidate(text) { cy.xpath('//div[@class="panel-title ng-binding"]').contains(text).should('be.visible'); }
  ContractsNotSaveValidation() { cy.xpath('//p[text()="Please save the contract before uploading files"]').should('be.visible'); }
  
  


  // Contracts Export Import
  ContractsExportButtonClick() { cy.get('#CUR-GqETKmnj').should('be.visible').click().wait(2000); }
  ContractsSelectTestData() { cy.xpath('//a[text()="Test Gelo 100"]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  ContractsImportContractsButtonClick() { cy.get('#CUR-xqVjxuMZ').should('be.visible').click().wait(2000); }
  ContractsImportButtonModalClick() { cy.get('#CUR-PfMsRKsg').should('be.visible').click().wait(5000); }
  ContractsFilterButtonClick() { cy.get('#CUR-uGIsUwPG').should('be.visible').click().wait(2000); }
  ContractsOverwriteBlankCheckbClick() { cy.get('#overwriteblanks').should('be.visible').click().wait(2000); }
  ContractsImportErrorValidate(text) { cy.xpath('//li[@class="ng-binding ng-scope"]').contains(text).should('be.visible'); }
  ContractNotifCancelButtonClick() { cy.xpath('//h5[contains(text(),"Your Contract Import Has Errored")]/following::button[1]').should('be.visible').click().wait(2000); }
  ContractNotifCancelButtonForPubClick() { cy.xpath('//h5[contains(text(),"Your Publisher Contract Import Has Errored")]/following::button[1]').should('be.visible').click().wait(2000); }

  // Delete on index page
  ContractsDeleteButtonIndexClick() { cy.get('#CUR-IPEEOupo').should('be.visible').click().wait(2000); }
  ContractsDeleteButtonSelectedIndexClick() { cy.get('#CUR-DQFudFGo').should('be.visible').click().wait(2000); }
  ContractsDeleteButtonSelectedIndexModalClick() { cy.get('#CUR-TGtlAOyD').should('be.visible').click(); }
  ContractsCopyButtonClick() { cy.get('#CUR-eGbNFkgv').should('be.visible').click().wait(2000); }
  ContractsSelectedCheckbClick() { cy.xpath('//a[text()="A multiple data"]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  ContractsDeleteErrorMsgValidate() { cy.xpath('//div[@class="alert alert-error"]').should('be.visible'); }
  ContractsCheckAllButtonClick() { cy.get('#CUR-yjgnVbsQ').should('be.visible').click().wait(2000); }

  
  // save and validate created data  
  ContractsTermsSaveClick() { cy.get('#CUR-TinbGPNU').click().wait(5000); }
  ContractsCreatedNameValidate(text) { cy.get('#CUR-tYltRUcS').should('have.value', text); }
  ContractsCreatedProjectIDValidate(text) { cy.get('#CUR-projectId-input').should('have.value', text); }
  ContractsValidationfieldValidate(text) { cy.get('#CUR-XanMLNZY').should('have.text', text); }
  ContractsForeignIDValidate(text) { cy.get('#CUR-gaQtKgcB').should('have.value', text); }
  ContractsAccountingPeriodValidate(text) { cy.get('#CUR-qaxHFwWK').should('have.text', text); }
  // validate on index page
  ContractsClickContractsLinkClick() { cy.get('#CUR-wOfZbPpM').click().wait(3000); }
  ContractsCreatedContractValidate(text) { cy.get('#CUR-EcVRXuaF a').contains(text).should('be.visible'); }
  ContractsRoyaltyValidationValidate(text) { cy.get('#CUR-EcVRXuaF span').contains(text).first().should('be.visible'); }
  ContractsCreatorValidationValidate(text) { cy.get('#CUR-EcVRXuaF span').contains(text).should('be.visible'); }
  // Update Contract  
  ContractsClickCreateContractClick() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').click().wait(1000); }
  ContractsUpdateNameType(text) { cy.get('#CUR-tYltRUcS').clear().type(text); }
  ContractsUpdateProjectIDType(text) { cy.get('#CUR-projectId-input').clear().type(text); }
  // save and validate updated data 
  ContractsUpdateSaveClick() { cy.get('#CUR-TinbGPNU').click().wait(5000); }
  ContractsUpdateNameValidate(text) { cy.get('#CUR-tYltRUcS').should('have.value', text); }
  ContractProjectIDValidate() { cy.get('#CUR-projectId-input').should('have.value', 'C123457'); }
  // validate on index page
  ContractsUpdateContractValidate() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').should('be.visible'); }
  ContractsTypeValidate(text) { cy.get('#CUR-EcVRXuaF span').contains(text).first().should('be.visible'); }
  // delete contract on edit page
  ContractsClickDeleteSelected() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract Update').click().wait(1000); }
  ContractsClickDeleteButtonClick() { cy.get('#CUR-EDDJtFXV').click().wait(2000); }
  ContractsClickDeleteButtonModalClick() { cy.get('#CUR-SIepMXur').click().wait(10000); }

  AnalyticsFilterValidateIfExpanded() { cy.xpath('//div[@class="panel-title" and contains(text(),"Filter")]/following::i[1]').then(($body) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($body.hasClass('pull-right glyphicon glyphicon-chevron-right')) {
      cy.log('Filter is not expanded')
      cy.xpath('//div[@class="panel-heading p-b-15"]').click().wait(2000);
      cy.wait(5000)

    } else {
      cy.log('Filter is already expanded')
      cy.wait(3000)
    }
  }) }

  

  // RELEASE TC

  CatalogueMenuClick() { cy.get('#sidebar-catalogue > a').click({ force: true }).wait(2000); }
  ReleasesSubmenuClick() { cy.get('#sidebar-releases > a').click().wait(2000); }
  // validate index page content
  ReleasesSearchBarValidate() { cy.get('#CUR-cFpKxgfD').should('be.visible'); }
  ReleasesBulkUpdateButtonValidate() { cy.get('#CUR-cBzPNSYL').should('be.visible'); }
  ReleasesExportButtonValidate() { cy.get('#CUR-TCRcrdqE').should('be.visible'); }
  ReleasesImportButtonValidate() { cy.get('#CUR-zWopaSgP').should('be.visible'); }
  ReleasesDeleteButtonValidate() { cy.get('#CUR-qIHIFTHv').should('be.visible'); }
  ReleasesCreateButtonValidate() { cy.get('#CUR-wACALinu').should('be.visible'); }
  ReleasesCATGroupValidate() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::input[@type="search"][1]') }
  ReleasesContractValidate() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::input[@type="search"][2]') }
  ReleasesCreatedAfterValidate() { cy.get('#CUR-hrSUzIbD').should('be.visible'); }
  ReleasesCreatedBeforeValidate() { cy.get('#CUR-qonjDtEo').should('be.visible'); }
  ReleasesParticipationValidate() { cy.xpath('//input[@type="number"]') }
  ReleasesCompleteValidate() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::span[@tabindex="-1"][1]') }
  ReleasesLabelValidate() { cy.get('#CUR-filter-label-textbox').should('be.visible'); }
  ReleasesCompanyValidate() { cy.get('#CUR-filter-company-select').should('be.visible'); }
  ReleasesArtistValidate() { cy.get('#CUR-filter-distributionChannel-select').should('be.visible'); }
  ReleaseDistribChannelValidate() { cy.get('#CUR-filter-distributionChannel-select').should('be.visible'); }
  ReleasesFormatValidate() { cy.get('#CUR-filter-format-select').should('be.visible'); }
  ReleasesFilterValidate() { cy.get('#CUR-nVfWuehA').should('be.visible'); }
  ReleasesTableHeaderValidate() { cy.get('#CUR-HZtPrtxX').should('be.visible'); }
  ReleasesTitleHeaderValidate() { cy.get('#CUR-VtMGALPT th').contains('Title').should('be.visible'); }
  ReleasesArtistHeaderValidate() { cy.get('#CUR-VtMGALPT th').contains('Artist').should('be.visible'); }
  ReleasesCATNoHeaderValidate() { cy.get('#CUR-VtMGALPT th').contains('Cat No').should('be.visible'); }
  ReleasesBarcodeHeaderValidate() { cy.get('#CUR-VtMGALPT th').contains('Barcode').should('be.visible'); }
  ReleasesFormatHeaderValidate() { cy.get('#CUR-VtMGALPT th').contains('Format').should('be.visible'); }
  ReleasesCompleteDropdClick() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  ReleasesCompleteDropdSelValidate() { cy.xpath('//span[text()="Complete"]').should('be.visible').click().wait(2000); }
  ReleasesCompleteDropdSelIncValidate() { cy.xpath('//span[text()="Incomplete"]').should('be.visible').wait(2000); }
  ReleasesTableHeadersValidate(text) { cy.get('#CUR-VtMGALPT th').contains(text).should('be.visible'); }
  ReleasesSearchDuplicateType(text) { cy.get('#CUR-cFpKxgfD').should('be.visible').click().type(text).type('{enter}').wait(5000); }
  ReleasesSearchClear() { cy.get('#CUR-cFpKxgfD').clear().type('{enter}').wait(2000); }
  ReleasesShowing25PerPageValidate() { cy.get('#CUR-SSuEqzVV').should('be.visible'); }
  ReleasesTotalValidate() { cy.get('#CUR-cwjXRdrA').should('be.visible'); }
  ReleasesShowAllValidate() { cy.get('#CUR-inBvwqZt').should('be.visible'); }

  // Insert Condition statement here to delete if there's an existing duplicate data
  ReleaseDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($body.text().includes('A Release Smoke')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-DkMzAgJM').contains('A Release Smoke').click().wait(2000);
      cy.get('#CUR-IORvSKtL').click().wait(1000) // delete button
      cy.get('#CUR-NOYiTdFv').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Release Smoke Update')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-DkMzAgJM').contains('A Release Smoke Update').click().wait(2000);
      cy.get('#CUR-IORvSKtL').click().wait(1000) // delete button
      cy.get('#CUR-bcgdhSSZ').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Release Smoke', 'A Release Smoke Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  // create on edit page and input fields 
  ReleasesClickCreateClick() { cy.get('#CUR-wACALinu').click({ force: true }); }
  ReleasesTitleFieldType(text) { cy.get('#CUR-jJwVtlIr').clear().type(text); }
  ReleasesVersionFieldType(text) { cy.get('#CUR-bhQcVumh').clear().type(text); }
  ReleasesClickOutsideVersionClick() { cy.get('#CUR-rsNOsbpf').click(); }
  ReleasesInputArtistType(text) { cy.get('#CUR-fzTwggPi').clear().type(text); }
  ReleasesInputForeignIDType(text) { cy.get('#CUR-gjpsiQTF').clear().type(text); }
  ReleasesProjectIDType(text) { cy.get('#CUR-projectId-input').clear().type(text); }
  ReleasesDistributionChannelClick() { cy.get('#CUR-VBAWXqzd').click().wait(1000); }
  ReleasesDistributionSelectionClick() { cy.xpath('//span[@id="CUR-oDYKgzAp" and contains(text(),"Digital")]').click({ force: true }) }
  ReleasesFormatDDClick() { cy.get('#CUR-FjplwIxU').click().wait(1000); }
  ReleasesFormatDDSelectionClick(text) { cy.get('#CUR-FjplwIxU span').contains(text).click(); }
  ReleasesPriceCategoryClick() { cy.get('#CUR-AjGvMDtA').click().wait(1000); }
  ReleasesPriceCategoryDDClick() { cy.get('#CUR-AjGvMDtA span').contains('Full Price').click(); }
  ReleasesMainDealerPriceType(text) { cy.get('#CUR-YIiKGOHt').clear().type(text); }
  ReleasesCatNoFieldType(text) { cy.get('#CUR-LsLPGmQZ').clear().type(text); }
  ReleasesBarCodeType(text) { cy.get('#CUR-QkNcjbSR').clear().type(text); }
  ReleasesLabelFieldType(text) { cy.get('#CUR-SEeQyaaO').clear().type(text); }
  ReleasesReleaseDateClick() { cy.get('#CUR-rJbBtFhO').click({ force: true }); }
  ReleasesReleaseDateType(text) { cy.get('#CUR-rJbBtFhO').clear().type(text); }
  ReleasesReleaseCatGroupsClick() { cy.get('#CUR-gnUaOjad').click().wait(1000); }
  ReleasesReleaseCatGroupSelectionClick() { cy.get('#CUR-gnUaOjad span').contains('CAT 1').click(); }
  ReleasesCatGroupSelectionClick(text) { cy.get('#CUR-gnUaOjad span').contains(text).click().wait(2000); }
  ReleasesRightsTabClick() { cy.get('#CUR-MxSnludE').click().wait(1000); }
  ReleasesAddContractClick() { cy.get('#CUR-LkJBDvYJ').click({ force: true }).wait(3000); }
  // LabelReleasesTypeContract1() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').type('test gelo 100', { force: true }).wait(1000); }
  ReleasesContractType(text) { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').clear().type(text).wait(1000); }
  ReleasesSelectionClick() { cy.xpath('//a[@title="Test Gelo 100"]').contains('Test Gelo 100').click(); }
  ReleasesCopyButtonClick() { cy.get('#CUR-OynZjgii').should('be.visible').click().wait(2000); }
  

  // Create Page Validation
  ReleasesHeadersValidate(text) { cy.xpath('//div[@class="panel-title"]').contains(text).should('be.visible'); }
  ReleasesMPCSFieldValidate() { cy.get('#CUR-hdwTarwt').should('be.visible'); }
  ReleasesMPCSCBoxValidate() { cy.get('#CUR-IzAAYhgX').should('be.visible'); }
  ReleasesCatalogueGroupsClick() { cy.xpath('//div[@id="CUR-WOCyOatY"]/following::input[@type="search"][1]').should('be.visible').click().wait(2000); }
  // Price Category
  ReleasesAddPriceCatClick() { cy.get('#CUR-KRPlJcpQ').should('be.visible').click().wait(2000); }
  ReleasePriceCatDdownValidate() { cy.xpath('//label[@id="CUR-ifQDEzbI"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  ReleaseTerritoryDdownValidate() { cy.xpath('//label[@id="CUR-xhJGEpUi"]/following::span[@tabindex="-1"][2]').should('be.visible'); }
  ReleasesCurrencyDdownValidate() { cy.xpath('//label[@id="CUR-ovTvEeJT"]/following::span[@tabindex="-1"][3]').should('be.visible'); }
  ReleasesDealerPriceDdownValidate() { cy.xpath('//label[@id="CUR-ovTvEeJT"]/following::input[@type="number"][1]').should('be.visible'); }
  ReleasesPriceCatdeletebutton() { cy.xpath('//div[@id="CUR-yPzhFtTg"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }

  ReleasesSpecDealrPriceCatDdownClick() { cy.xpath('//label[@id="CUR-ifQDEzbI"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  ReleasesSpecDealrPriceCatDdownSelClick(text) { cy.xpath('//div[@id="CUR-mbSJTMga"]/following::span[@class="ng-binding ng-scope"]').contains(text).should('be.visible'); }
  ReleasesSpecDealrTerritoryDdownClick() { cy.xpath('//label[@id="CUR-xhJGEpUi"]/following::span[@tabindex="-1"][2]').should('be.visible').click().wait(2000); }
  ReleasesSpecDealerTerritoryDdownSelValidate(text) { cy.xpath('//label[@id="CUR-xhJGEpUi"]/following::span[@class="country ng-binding ng-scope"]').contains(text).should('be.visible'); }

  // Price Cat headers
  ReleasesPriceCategoryHeader(text) { cy.get('#CUR-mbSJTMga').contains(text).should('be.visible'); }
  ReleasesCurrencyDdownClick() { cy.xpath('//label[@id="CUR-ovTvEeJT"]/following::span[@tabindex="-1"][3]').should('be.visible').click().wait(2000); }
  ReleasesSpecDealrCurrencyClick() { cy.xpath('//label[@id="CUR-ovTvEeJT"]/following::span[@tabindex="-1"][3]').should('be.visible').click().wait(2000); }
  ReleasesSpecDealrCurrencyType(text) { cy.xpath('//label[@id="CUR-JXfayDSN"]/following::input[@type="search"][3]').should('be.visible').clear().type(text).type('{enter}').wait(2000); }


  // Releases Tracks button
  ReleasesAddTracksButtonValidate() { cy.get('#CUR-AyhTUlVQ').should('be.visible'); }
  ReleasesRemoveButtonValidate() { cy.get('#CUR-dwAhXVEL').should('be.visible'); }
  ReleasesTracksTableValidate(text) { cy.xpath('//div[@id="CUR-MuKtAyDL"]/following::th').contains(text).should('be.visible'); }
  
  // Releases Rights Tab
  ReleasesSalesReturnsHeaderValidate() { cy.get('#CUR-ZPgbrEHw').should('be.visible'); }
  ReleasesCostsHeaderValidate() { cy.get('#CUR-xmtOPtte').should('be.visible'); }
  ReleasesSalesReturnsAddContractClick() { cy.get('#CUR-LkJBDvYJ').should('be.visible').click().wait(2000); }
  ReleasesSalesProRataFromTracksValidate() { cy.get('#CUR-qcnYocuP').should('be.visible'); }
  ReleasesCostsAddContractValidate() { cy.get('#CUR-WAMQMaqe').should('be.visible').click().wait(2000); }
  ReleasesCostCopyFromSalesValidate() { cy.get('#CUR-guTqJhKI').should('be.visible'); }
  ReleasesSalesReturnContractFieldType(text) { cy.xpath('//div[@id="CUR-ZPgbrEHw"]/following::input[@type="text"][1]').should('be.visible').clear().type(text); }
  ReleasesSalesReturnsContractSelClick() { cy.xpath('//strong[text()="Test Gelo 100"]').should('be.visible').click().wait(2000); }
  ReleasesCostsContractFieldType(text) { cy.xpath('//div[@id="CUR-xmtOPtte"]/following::input[1]').should('be.visible').clear().type(text); }
  ReleasesSalesReturnContractFieldValidate(text) { cy.xpath('//div[@id="CUR-ZPgbrEHw"]/following::input[@type="text"][1]').should('have.value', text); }
  ReleasesSalesDeleteClick() { cy.xpath('//div[@id="CUR-ZPgbrEHw"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  ReleasesCostsContractFieldValidate(text) { cy.xpath('//div[@id="CUR-xmtOPtte"]/following::input[1]').should('be.visible').should('have.value', text); }

  // Releases Aliases Tab
  ReleasesAliasesTabClick() { cy.get('#CUR-wrAqCHMY').should('be.visible').click().wait(2000); }
  ReleasesAddAliasClick() { cy.get('#CUR-TLBSPUfe').should('be.visible').click().wait(2000); }
  ReleasesAliasFormValidate() { cy.xpath('//div[@id="CUR-IjTFrpIW"]/following::input[1]').should('be.visible').click().wait(2000); }
  ReleasesAliasDeleteClick() { cy.xpath('//div[@id="CUR-IjTFrpIW"]/following::button[@class="btn btn-danger"]').should('be.visible').click().wait(2000); }
  ReleasesAliasSeeFullHistoryValidate() { cy.xpath('//a[text()="See Full History"]').should('be.visible'); }
  ReleasesLastUpdatedValidate() { cy.get('#CUR-CEWeJiXp').should('be.visible'); }

  // Releases Mechanicals Tab
  ReleasesMechanicalsTabClick() { cy.get('#CUR-kwdSFnIv').should('be.visible').click().wait(2000); }
  ReleasesMechanicalTabHeadersValidate(text) { cy.xpath('//div[@class="panel-title"]').contains(text).should('be.visible'); }
  ReleasesTrackCapValidate() { cy.get('#CUR-twKGgWdl').should('be.visible'); }
  ReleasesControlledCompoCheckBValidate() { cy.get('#CUR-twKGgWdl').should('be.visible').click().wait(2000); }
  ReleasesLoadMechFromTracksValidate() { cy.get('#CUR-PczmBtzQ').should('be.visible'); }
  ReleasesSeeFullHistoryValidate() { cy.xpath('//a[text()="See Full History"]').should('be.visible'); }
  ReleasesMechanicalsAddReleasesClick() { cy.get('#CUR-QNgwCOLY').should('be.visible').click().wait(2000); }
  ReleasesMechanicalsComposersFieldType(text) { cy.xpath('//label[@id="CUR-JpIAeiet"]/following::input[@type="text"][1]').should('be.visible').click().clear().type(text).wait(2000); }
  ReleasesMechComposersTypeAheadClick() { cy.xpath('//strong[text()="test gelo"]').should('be.visible').click().wait(2000); }
  ReleasesMechanicalsPublisherFieldType(text) { cy.xpath('//label[@id="CUR-JpIAeiet"]/following::input[@type="text"][2]').should('be.visible').click().clear().type(text).wait(2000); }
  ReleasesMechPublisherTypeAheadClick() { cy.xpath('//strong[text()="test publisher"]').should('be.visible').click().wait(2000); }
  ReleasesMechanicalsContractFieldType(text) { cy.xpath('//label[@id="CUR-JpIAeiet"]/following::input[@type="text"][3]').should('be.visible').click().clear().type(text).wait(2000); }
  ReleasesMechContractTypeAheadClick() { cy.xpath('//a[@title="Gelo Test"]').should('be.visible').click().wait(2000); }
  ReleasesMechDeleteButtonClick() { cy.xpath('//label[@id="CUR-JpIAeiet"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click(); }
  ReleasesOverviewTabClick() { cy.get('#CUR-yMSzyccc').should('be.visible').click().wait(2000); }


  // Release Analytics
  ReleasesAnalyticsTabClick() { cy.get('#CUR-YonjhAmS').should('be.visible').click().wait(5000); }

  // Release Catalogue dropdown validation
  ReleasesReleaseCatGroupSelectionValidate(text) { cy.get('#CUR-gnUaOjad span').contains(text).should('be.visible'); }

  // Linking a Tracks
  ReleasesAddTracksButtonClick() { cy.get('#CUR-AyhTUlVQ').should('be.visible').click().wait(2000); }
  ReleasesAddTracksSearchType(text) { cy.xpath('//input[@id="CUR-gNdYUNxq"]').should('be.visible').type(text).type('{enter}').wait(2000); }
  ReleasesAddTracksSearchedValueCheckbClick() { cy.xpath('//span[text()="T2"]/preceding::input[@ng-model="row.selected"]').should('be.visible').click().wait(2000); }
  ReleasesDoneButtonClick() { cy.get('#CUR-kqrzRRwb').should('be.visible').click().wait(2000); }
  ReleasesSelectedButtonClick() { cy.get('#CUR-zmgfjqaB').should('be.visible').click().wait(2000); }
  ReleasesTracksAddedValidate(text) { cy.get('#CUR-TjktCPmI').contains(text).should('be.visible'); }
  ReleasesCboxClick() { cy.xpath('//a[text()="T2"]/preceding::input[@id="CUR-mmpdeJwx"]').should('be.visible').click(); }
  ReleasesRemoveButtonClick() { cy.get('#CUR-dwAhXVEL').should('be.visible').click().wait(2000); }
  ReleasesRemoveModalClick() { cy.get('#CUR-FPRMTZzk').should('be.visible').click().wait(2000); }

  // Required fields

  ReleaseNewReleaseClick() { cy.xpath('//i[text()="New Release"]').should('be.visible').click().wait(2000); }

  // Filter Function on index
  ReleasesFilterButtonIndexClick() { cy.get('#CUR-nVfWuehA').should('be.visible').click().wait(2000); }
  ReleasesCatGroupIndexType(text) { cy.xpath('//label[@id="CUR-hcNPVXPV"]/following::input[@type="search"][1]').should('be.visible').clear().type(text) }
  ReleasesCatgroupSelClick(text) { cy.xpath('//span[@class="ui-select-choices-row-inner"]').should('be.visible').contains(text).click().wait(2000); }
  ReleaseContractIndexType(text) { cy.xpath('//label[@id="CUR-DnXnadpr"]/following::input[@type="search"][1]').should('be.visible').clear().type(text) }
  ReleasesContractIndexSelClick(text) { cy.xpath('//span[@class="ui-select-highlight"]').should('be.visible').contains(text).click().wait(2000); }
  ReleasesCreatedAfterIndexType(text) { cy.get('#CUR-hrSUzIbD').should('be.visible').click().wait(1000).click().type(text).wait(2000); } 
  ReleasesCreatedAfterDoneIndexClick() { cy.xpath('//label[@id="CUR-xfAUtSIv"]/following::button[text()="Done"]').should('be.visible').click().wait(2000); }
  ReleasesCreatedBeforeIndexType(text) { cy.get('#CUR-qonjDtEo').should('be.visible').click().wait(1000).click().type(text).wait(2000); }
  ReleasesParticipationIndexType(text) { cy.xpath('//label[@id="CUR-KxgnvDyb"]/following::input[@type="number"]').should('be.visible').click().clear().type(text).wait(2000); }
  // Release export
  ReleaseExportButtonClick() { cy.get('#CUR-TCRcrdqE').should('be.visible').click().wait(2000); }
  ReleaseExportCombinedClick() { cy.get('#CUR-ZwGULIxs').should('be.visible').click().wait(2000); }
  ReleaseExportSeparateClick() { cy.get('#CUR-JoRfdxXR').should('be.visible').click().wait(2000); }
  ReleaseSelectSearchedCboxClick() { cy.xpath('//a[text()="A reg export test"]/preceding::tr/following::input[@type="checkbox"][1]').should('be.visible').click().wait(2000); }

  // Bulk Update
  ReleasesBulkUpdateButtonClick() { cy.xpath('//a[@class="btn dropdown-toggle w-xs-100-p"]').should('be.visible').click().wait(2000); }
  ReleasesProRataContractsClick() { cy.get('#CUR-MmoNgIbb').should('be.visible').click().wait(2000); }
  ReleasesProRataContractsModalClick() { cy.get('#CUR-pKlIxAPX').should('be.visible').click().wait(2000); }
  ReleasesCancelProRataModalClick() { cy.get('#CUR-BVfAoeHb').should('be.visible').click().wait(2000); }
  ReleasesInheritMechanicalsClick() { cy.get('#CUR-kZfckpKc').should('be.visible').click().wait(2000); } 
  ReleasesCancelInheritMechanicalsClick() { cy.get('#CUR-yaQPQrPR').should('be.visible').click().wait(2000); } 
  ReleasesInhertMechanicalsModalClick() { cy.get('#CUR-RfOzdOlp').should('be.visible').click().wait(2000); }

  // Release Import 
  ReleaseImportButtonClick() { cy.get('#CUR-zWopaSgP').should('be.visible').click().wait(2000); }
  ReleaseDownloadTemplateValidate() { cy.get('#CUR-JIbEHkDz').should('be.visible'); }
  ReleaseImportButtonModalClick() { cy.get('#CUR-RjvsbDlF').should('be.visible').click().wait(2000); }
  ReleaseCTableValidation(text) { cy.get('#CUR-VtMGALPT span').contains(text).first().should('be.visible'); }
  ReleaseCImportTypeSelClick() {  cy.xpath('//span[contains(text(),"Combined")]').click().wait(1000); }
  ReleaseCImportTypeClick() { cy.get('#CUR-sIIioKZr').click().wait(2000); }
  ReleaseOverwriteBlankCboxClick() { cy.xpath('//h5[@id="CUR-NDoWieZa"]/following::input[@type="checkbox"]').should('be.visible').click().wait(2000); }
  ReleasesCreatedUpdatedVersionValidate(text) { cy.get('#CUR-bhQcVumh').contains(text).should('not.exist'); }












  // save and validate created data on edit page
  ReleasesSaveClick() { cy.get('#CUR-NVcvbMbM').click().wait(2000); }
  ReleasesCreatedTitleValidate(text) { cy.get('#CUR-jJwVtlIr').should('have.value', text); }
  ReleasesCreatedVersionValidate(text) { cy.get('#CUR-bhQcVumh').should('have.value', text); }
  ReleasesCreatedArtistValidate(text) { cy.get('#CUR-fzTwggPi').should('have.value', text); }
  ReleasesCreatedForeignIDValidate(text) { cy.get('#CUR-gjpsiQTF').should('have.value', text); }
  ReleasesCreatedProjectIDValidate(text) { cy.get('#CUR-projectId-input').should('have.value', text); }
  ReleasesCreatedFormatValidate(text) { cy.get('#CUR-EOPFqKqU').should('have.text', text); }
  ReleasesCreatedPriceCatValidate(text) { cy.get('#CUR-LjBshnBd').should('have.text', text); }
  ReleasesCreatedMainDealerPriceValidate(text) { cy.get('#CUR-YIiKGOHt').should('have.value', text); }
  // validate created data on index page 
  ReleasesLinkClick() { cy.get('#CUR-NVopGmjV').click().wait(8000); }
  ReleasesTitleValidate(text) { cy.get('#CUR-VtMGALPT a').contains(text).should('be.visible'); }
  ReleasesValidateArtistValidate(text) { cy.get('#CUR-VtMGALPT span').contains(text).should('be.visible'); }
  ReleasesCatNoValidate(text) { cy.get('#CUR-VtMGALPT span').contains(text).should('be.visible'); }
  ReleaseBarCodeValidate(text) { cy.get('#CUR-VtMGALPT span').contains(text).should('be.visible'); }
  // update on edit page and input fields
  ReleasesUpdateCreatedClick(text) { cy.get('#CUR-VtMGALPT a').contains(text).click(); }
  ReleasesUpdateTitleType() { cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke Update'); }
  ReleasesUpdateVersionType(text) { cy.get('#CUR-bhQcVumh').clear().type(text); }
  ReleasesUpdateArtistType() { cy.get('#CUR-fzTwggPi').clear().type('gelo09876'); }
  ReleasesUpdateProjectIDType() { cy.get('#CUR-projectId-input').clear().type('Smoke12098'); }
  ReleasesUpdateCatNoType() { cy.get('#CUR-LsLPGmQZ').clear().type('SMOKE0987'); } 
  // save and validate updated data on edit page
  ReleasesUpdateSaveClick() { cy.get('#CUR-NVcvbMbM').click().wait(2000); }
  ReleaseesUpdatedTitleValidate() { cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke Update'); }
  ReleasesUpdatedVersionValidate() { cy.get('#CUR-bhQcVumh').should('have.value', 'v0987'); }
  ReleasesUpdatedArtistValidate() { cy.get('#CUR-fzTwggPi').should('have.value', 'gelo09876'); }
  ReleasesUpdatedForeignIDValidate() { cy.get('#CUR-gjpsiQTF').should('have.value', 'test12345'); }
  ReleasesUpdatedProjectIDValidate() { cy.get('#CUR-projectId-input').should('have.value', 'Smoke12098'); }
  // validate updated data on index page
  ReleasesReleasesLink1Click() { cy.get('#CUR-NVopGmjV').click().wait(8000); }
  ReleasesUpdatedTitle1Validate() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').should('be.visible'); }
  ReleasesUpdatedArtist1Validate() { cy.get('#CUR-VtMGALPT span').contains('gelo09876').should('be.visible'); }
  ReleaseUpdatedCatNo1Validate() { cy.get('#CUR-VtMGALPT span').contains('gelo09876').should('be.visible'); }
  ReleaseUpdatedBarCode1Validate() { cy.get('#CUR-VtMGALPT span').contains('12345098751').should('be.visible'); }
  ReleaseUpdatedFormat1Validate() { cy.get('#CUR-VtMGALPT span').contains('CD').should('be.visible'); }
  // Delete Release 
  ReleasesDeleteCreatedClick(text) { cy.get('#CUR-VtMGALPT a').contains(text).click(); }
  ReleasesDeleteButtonClick() { cy.get('#CUR-IORvSKtL').click().wait(2000); }
  ReleasesClickDeleteModalClick() { cy.get('#CUR-NOYiTdFv').click().wait(1000); }
  ReleasesDeleteButtonIndexClick() { cy.get('#CUR-qIHIFTHv').should('be.visible').click().wait(2000); }
  ReleasesDeleteSelectedIndexClick() { cy.get('#CUR-BzpsFdGR').should('be.visible').click().wait(2000); }
  ReleasesDeleteModalIndexClick() { cy.get('#CUR-gdHpFsJh').should('be.visible').click().wait(8000); }
  ReleasesCheckAllCBIndexClick() { cy.xpath('//input[@class="select-all"]').should('be.visible').click().wait(2000); }
  ReleasesConfirmDeleteDataValidate(text) { cy.get('#CUR-VtMGALPT').contains(text).should('not.exist'); }




  // MECHANICAL TEST CASE

  
  MechSubMenuClick() { cy.get('#sidebar-mechanicals > a').click({ force: true }).wait(2000); }
  // Index Page Validation
  MechContractsLinkValidate() { cy.get('#CUR-nAjCXYYG').should('have.text', 'Mechanical Contracts'); }
  MechContractsDeleteValidate() { cy.get('#CUR-IPEEOupo').should('be.visible'); }
  MechContractsCreateValidate() { cy.get('#CUR-UDpJJUhA').should('be.enabled'); }
  MechExporButtontValidate() { cy.get('#CUR-GqETKmnj').should('be.visible'); }
  MechImportContractsButtonValidate() { cy.get('#CUR-xqVjxuMZ').should('be.visible'); }
  MechimportTransactionsButtonValidate() { cy.get('#CUR-SOZjjcnO').should('be.visible'); }
  MechExportTransactionsButtonValidate() { cy.get('#CUR-VmJCQpXn').should('be.visible'); }
  MechSearchBarValidate() { cy.get('#CUR-rmJHDCfY').should('be.visible'); }
  MechCompleteDDValidate() { cy.xpath('//label[@id="CUR-JnbARxvG"]/following::span[@tabindex="-1"]').should('be.visible'); } // Complete
  MechCompanyFieldValidate() { cy.xpath('//label[@id="contract-company-search-label"]/following::input[@type="search"][1]').should('be.visible'); } // Company
  MechCategoryFieldValidate() { cy.xpath('//label[@id="contract-contractCategories-search-label"]/following::input[@type="search"][1]').should('be.visible'); } // Category
  MechFilterButtonValidate() { cy.get('#CUR-uGIsUwPG').should('be.visible'); } // Filter
  MechNameHeaderValidate() { cy.get('.sorting_asc').should('have.text', 'Name'); }
  MechTypeHeaderValidate() { cy.get('#CUR-FmLOyUsD th').contains('Type').should('be.visible'); }
  MechCategoriesHeaderValidate() { cy.get('#CUR-FmLOyUsD th').contains('Categories').should('be.visible'); }
  MechCreatedHeaderValidate() { cy.get('#CUR-FmLOyUsD th').contains('Created').should('be.visible'); }
  // Create Mechanical Contract
  MechCreateButtonClick() { cy.get('#CUR-UDpJJUhA').click().wait(1000); }
  MechPayeeFieldType(text) { cy.get('#CUR-payee-select-field').clear().type(text).wait(3000); }
  MechPayeeTypeAheadClick(text) { cy.get('#CUR-eahYeMnc a').contains(text).first().click(); }
  MechCompanyClick() { cy.get('#CUR-GcRTTdNA').click().wait(1000); }
  MechCompanySelectionClick(text) { cy.xpath('//label[@id="CUR-aytJgykW"]/following::span[@class="ui-select-choices-row-inner"][1]').contains(text).click(); }
  MechNameFieldType(text) { cy.get('#CUR-tYltRUcS').clear().type(text); }
  MechStartNameType() { cy.get('#CUR-dyWxzodj').click().clear().type('01/01/2022'); }
  MechFilesHeaderClick() { cy.get('#CUR-TgDcnQlg').click(); }
  MechEndDateType() { cy.get('#CUR-HCfjjYNb').click().clear().type('01/01/2023'); }
  MechForeignIDType(text) { cy.get('#CUR-gaQtKgcB').clear().type(text); }
  MechCategoriesClick() { cy.get('.input-xs').click(); }
  MechCategoriesType() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').type('Creator').wait(1000); }
  MechCategoriesDDSelectionClick() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::span[contains(text(),"Creator")]').contains('Creator').click({ force: true }); }
  MechProjectIDType() { cy.get('#CUR-projectId-input').clear().type('AMS10928272'); }
  MechCurrencyClick() { cy.get('#CUR-isvSrjLA').click().wait(1000); }
  MechHomeCurrencyClick() { cy.get('#CUR-isvSrjLA span span').contains('Home Currency').click(); }
  MechLicenseNumberType() { cy.get('#CUR-oaTCKDBN').clear().type('123456'); }
  MechAccountingPeriodClick() { cy.get('#CUR-ZxtyZCPP').click().wait(1000); }
  MechAccountingPeriodSelectionClick() { cy.xpath('//label[@id="CUR-KuWObaYW"]/following::span[contains(text(),"Yearly")][1]').click(); }
  MechOpeningBalanceType() { cy.get('#CUR-XAgXnZFz').clear().type('50'); }
  MechMinPayoutType() { cy.get('#CUR-pLtIIIAd').clear().type('10'); }
  MechNotesType() { cy.get('#CUR-BIaDTDYH > .form-control').click(); }
  MechTermsTabClick() { cy.get('#CUR-aXNqZBBZ').click(); }
  MechAddTermClick() { cy.get('#CUR-XYgdzizn').click().wait(3000); }
  MechRateType() { cy.xpath('//label[contains(text(),"Rate %")]/following::input[@type="text"][1]').clear().type('100'); }
  MechSaveClick() { cy.get('#CUR-TinbGPNU').click().wait(2000); } // save
  // Validate Created Data on edit page
  MechCreatedPayeeValidate() { cy.get('#CUR-payee-select-field').should('have.value', 'zzz payee 2').wait(2000); }
  MechCreatedCompanyValidate(text) { cy.xpath('//label[@id="CUR-aytJgykW"]/following::span[@tabindex="-1"][1]').contains(text).should('be.visible'); }
  MechCreatedNameEditValidate(text) { cy.get('#CUR-tYltRUcS').should('have.value', text); }
  MechCreatedForeignIDEditValidate() { cy.get('#CUR-gaQtKgcB').should('have.value', 'AM129203028'); }
  // Validate Created Data on index page
  MechContractsLinkClick() { cy.get('#CUR-ekDjaNNY').click().wait(2000); }
  MechCreatedNameIndexValidate(text) { cy.get('#CUR-EcVRXuaF a').contains(text).should('be.visible'); }
  MechTableContentsIndexValidate(text) { cy.get('#CUR-EcVRXuaF span').contains(text).should('be.visible'); }
  // Update Mechanical Contract on edit page
  MechCreatedClick(text) { cy.get('#CUR-EcVRXuaF a').contains(text).click().wait(2000); }
  // Validate Updated Data on edit and index pages
  // Delete Mechanical Contract
  MechDeleteButtonClick() { cy.get('#CUR-EDDJtFXV').click(); }
  MechDeleteModalButtonClick() { cy.get('#CUR-SIepMXur').click().wait(2000); }






  // COMPOSER TC
  
  CompoSubMenuClick() { cy.get('#sidebar-composers > a').click().wait(3000); }
  // Composer index page Validation
  CompoExportButtonValidate() { cy.get('#CUR-uUKVnFba').should('be.visible'); }
  CompoImportButtonValidate() { cy.get('#CUR-eTaahVPO').should('be.visible'); }
  CompoDeleteValidate() { cy.get('#CUR-FuVciLZH').should('be.visible'); }
  CompoCreateValidate() { cy.get('#CUR-KSqmmqMO').should('be.visible'); }
  CompoSearchValidate() { cy.get('#CUR-ucZUtjNV').should('be.visible'); }
  CompoNameHeaderValidate() { cy.get('#CUR-OuUVLroh th').contains('Name').should('be.visible'); }
  CompoCAEHeadrValidate() { cy.get('#CUR-OuUVLroh th').contains('CAE').should('be.visible'); }
  CompoCreatedHeaderValidate() { cy.get('#CUR-OuUVLroh th').contains('Created').should('be.visible'); }
  CompoTableHeaderValidate(text) { cy.get('#CUR-OuUVLroh th').contains(text).should('be.visible'); }
  CompoShowing25IndexValidate() { cy.get('#CUR-LqwYOLQU').should('be.visible'); }
  ComposerShowAllIndexValidate() { cy.get('#CUR-LEYMBPSy').should('be.visible'); }
  CompoExportButtonClick() { cy.get('#CUR-uUKVnFba').should('be.visible').click().wait(2000); }
  CompoSelectCheckboxClick() { cy.xpath('//a[text()="A test composer"]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  ComposSelectALLcBoxClick() { cy.xpath('//input[@class="select-all"]').should('be.visible').click().wait(2000); }
  CompoSearchDuplicateType(text) { cy.get('#CUR-ucZUtjNV').should('be.visible').click().clear().type(text).type('{enter}').wait(5000); }
  CompoSearchClear() { cy.get('#CUR-ucZUtjNV').clear().type('{enter}').wait(2000); }
  // Insert Condition statement here to delete if there's an existing duplicate
  CompoDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($body.text().includes('A Composer Smoke')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-JRVeYQuw').contains('A Composer Smoke').click().wait(2000);
      cy.get('#CUR-JaWdFtZJ').click().wait(1000) // delete button
      cy.get('#CUR-bcgdhSSZ').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Composer Smoke Update')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-JRVeYQuw').contains('A Composer Smoke Update').click().wait(2000);
      cy.get('#CUR-JaWdFtZJ').click().wait(1000) // delete button
      cy.get('#CUR-bcgdhSSZ').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Composer Smoke', 'A Composer Smoke Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  // Create on Composer Edit Page
  CompoCreateClick() { cy.get('#CUR-KSqmmqMO').click(); }
  CompoNameType(text) { cy.get('#CUR-xsBQITjy').clear().type(text); }
  CompoForeignIdType(text) { cy.get('#CUR-PznCFrfI').type(text); }
  CompoFNameType(text) { cy.get('#CUR-TegBJoBK').type(text); }
  CompoMNameType(text) { cy.get('#CUR-DrmeRXPD').type(text); }
  CompoLNameType(text) { cy.get('#CUR-JRzrthyU').type(text); }
  CompoCAENumberType(text) { cy.get('#CUR-BbMNJqNK').clear().type(text); }
  CompoNotesType(text) { cy.get('#CUR-CDkYswGc').type(text); }
  CompoMainSocietyClick() { cy.xpath('//label[@id="CUR-APHDmvLu"]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  CompoMainSelectionClick(text) { cy.get('#CUR-UGpikDDg span').contains(text).click(); }
  CompoMainSocIdentifType(text) { cy.get('#CUR-sioshbFW').type(text); }
  CompoMechSocClick() { cy.xpath('//label[contains(text(),"Mechanical Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); } 
  CompoMechSocSelClick() { cy.xpath('//span[contains(text(),"ASCAP")]').click({ force: true }) }
  CompoMechSocIdentifType(text) { cy.get('#CUR-uOsxyaYM').type(text); }
  CompoPerfSocClick() { cy.xpath('//label[contains(text(),"Performance Society")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  CompoPerfSocSelClick() { cy.xpath('//span[contains(text(),"BMI")]').click({ force: true }); }
  CompoPerfSocIdentifType(text) { cy.get('#CUR-qRIrDLBk').type(text); }
  CompoSyncSocietyClick() { cy.xpath('//label[contains(text(),"Sync Society")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  CompoSyncSocSelClick() { cy.xpath('//span[contains(text(),"SOCAN")]').click({ force: true }).wait(1000); }
  CompoSyncSocIdentifType(text) { cy.get('#CUR-meFMQkiN').type(text); }
  CompoCopyButtonClick() { cy.get('#CUR-wVdTBZzv').should('be.visible').click().wait(2000); }
  CompoControlledCheckboxClick() { cy.get('#CUR-bIzbXVOO').should('be.visible').click().wait(2000); }
  CompoNotesFieldType(text) { cy.xpath('//div[@id="CUR-yRwCQdba"]/following::textarea').should('be.visible').clear().type(text).wait(2000); }
  CompoLinkedPublisherFieldType(text) { cy.xpath('//div[@id="CUR-ArKxAfuA"]/following::input[@type="text"]').clear().type(text).wait(2000); }
  CompoLinkedPubSelClick() { cy.xpath('//a[@title="test publisher"]').should('be.visible').click().wait(2000); }
  CompoLinkedPublisherValidate(text) { cy.xpath('//div[@id="CUR-ArKxAfuA"]/following::input[@type="text"]').should('have.value', text).should('be.visible'); }
  CompoAddContractClick() { cy.get('#CUR-lfFWztwl').should('be.visible').click().wait(2000); }
  CompoContractFieldType(text) { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"]').should('be.visible').click().clear().type(text).wait(2000); }
  CompoContractValidate(text) { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"]').should('have.value', text).should('be.visible'); }
  CompoImportButtonClick() { cy.get('#CUR-eTaahVPO').should('be.visible').click().wait(2000); }
  CompoImportButtonModalClick() { cy.get('#CUR-SogplsAK').should('be.visible').click().wait(2000); }
  CompoFilterButtonClick() { cy.get('#CUR-xRrQkQuq').should('be.visible').click().wait(2000); }
  CompoNameBlankValidate(text) { cy.get('#CUR-xsBQITjy').contains(text).should('not.exist'); }
  CompoFnameNameBlankValidate(text) { cy.get('#CUR-TegBJoBK').contains(text).should('not.exist'); }
  CompoMnameNameBlankValidate(text) { cy.get('#CUR-DrmeRXPD').contains(text).should('not.exist'); }
  CompoSurnameBlankValidate(text) { cy.get('#CUR-JRzrthyU').contains(text).should('not.exist'); }
  CompoSaveClick() { cy.get('#CUR-rExQKhmY').click(); } // Save

  


  // Territories Tab
  CompoTerritoriesTabClick() { cy.get('#CUR-upfjEgpr').should('be.visible').click().wait(2000); }
  CompoTerritoriesHeadValidate() { cy.get('#CUR-MCJSryWi').should('be.visible'); }
  CompoTerritoryWorldCboxClick() { cy.xpath('//input[@ng-model="world"]').should('be.visible').click().wait(2000); }
  CompoSelectTerritoryGroupDropD() { cy.xpath('//div[@id="CUR-MCJSryWi"]/following::select').should('be.visible'); }
  

  // Identifiers 
  CompoSocietyDropDClick() { cy.xpath('//label[text()="Society"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  CompoSocType(text) { cy.xpath('//label[text()="Society"]/following::input[@type="search" and @aria-hidden="false"][1]').click().type(text).wait(2000); }
  CompoSocietyDropdSelClick() { cy.xpath('//span[text()="PRS"]').should('be.visible').click().wait(2000); }
  CompoSocietyDropdSelAcamClick() { cy.xpath('//span[text()="ACAM"]').should('be.visible').click().wait(2000); }
  CompoIdentifierFieldType(text) { cy.xpath('//input[@ng-model="identifier.identifier"]').click().clear().type(text).wait(2000); }
  CompoMechSocietyDropdClick() { cy.xpath('//label[text()="Society"]/following::span[@tabindex="-1"][2]').should('be.visible').click().wait(2000); }
  CompoMechSocietyType(text) { cy.xpath('//label[text()="Society"]/following::input[@type="search"][2]').click().type(text).wait(2000); }
  CompoMechSocietyDropDSelClick() { cy.xpath('//span[text()="ACEMLA"]').should('be.visible').click().wait(2000); }
  CompoPerfSocietyDropdClick() { cy.xpath('//label[text()="Society"]/following::span[@tabindex="-1"][3]').should('be.visible').click().wait(2000); }
  CompoPerfSocType(text) { cy.xpath('//label[text()="Society"]/following::input[@type="search"][3]').should('be.visible').click().type(text).wait(2000); }
  CompoPerfSocietyDropdselClick() { cy.xpath('//span[text()="AACIMH"]').should('be.visible').click().wait(2000); }
  CompoSyncSocietyDropdClick() { cy.xpath('//label[text()="Society"]/following::span[@tabindex="-1"][4]').should('be.visible').click().wait(2000); }
  CompoSyncSocType(text) { cy.xpath('//label[text()="Society"]/following::input[@type="search"][4]').should('be.visible').click().type(text).wait(2000); }
  CompoSocietyType(text) { cy.xpath('//label[text()="Society"]/following::input[@type="search"][7]').should('be.visible').click().type(text).wait(2000); }
  CompoSyncSocietyDropdselClick() { cy.xpath('//span[text()="ADAVIS"]').should('be.visible').click().wait(2000); }
  CompoPubSocietyDropdselClick() { cy.xpath('//span[text()="ATN"]').should('be.visible').click().wait(2000); }

  // Publisher Agreements
  CompoAddAgreementClick() { cy.get('#CUR-YenxNkou').should('be.visible').click().wait(2000); }
  CompoPublisherFieldType(text) { cy.xpath('//label[text()="Publisher"]/following::input[1]').should('be.visible').click().clear().type(text).wait(2000); }
  CompoAgreementTypeDropdClick() { cy.xpath('//label[text()="Publisher"]/following::span[1]').should('be.visible').click().wait(2000); }
  CompoAgreeTypeSelOGClick() { cy.xpath('//span[text()="Original General"]').should('be.visible').click().wait(2000); }
  CompoAgreeTypeSelOSClick() { cy.xpath('//span[text()="Original Specific"]').should('be.visible').click().wait(2000); }
  CompoTerritoryDropdClick() { cy.xpath('//label[text()="Publisher"]/following::span[@tabindex="-1"][2]').should('be.visible').click().wait(2000); }
  CompoTerritoryDropdSelClick() { cy.xpath('//span[text()="World"]').should('be.visible').click().wait(2000); }
  CompoSocDropdClick() { cy.xpath('//label[text()="Publisher"]/following::span[@tabindex="-1"][3]').should('be.visible').click().wait(2000); }
  CompoAgreementNoType(text) { cy.xpath('//div[@id="CUR-qszsLMXc"]/following::input[@ng-model="agreement.agreementNo"]').should('be.visible').click().clear().type(text); }
  CompoPubAgreeDeleteButtonClick() { cy.xpath('//div[@id="CUR-qszsLMXc"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); } 


  // Edit Page data validation
  CompoNameEditValidate(text) { cy.get('#CUR-xsBQITjy').should('have.value', text); }
  CompoCAEEditValidate(text) { cy.get('#CUR-BbMNJqNK').should('have.value', text); }
  CompoForeignIDEditValidate(text) { cy.get('#CUR-PznCFrfI').should('have.value', text); }
  CompoPartyIDValidate() { cy.get('#CUR-nbiKXCsP').should('be.visible').should('be.disabled'); }
  CompoEditFirstNameValidate(text) { cy.get('#CUR-TegBJoBK').should('have.value', text); }
  CompoEditMiddleNameValidate(text) { cy.get('#CUR-DrmeRXPD').should('have.value', text); }
  CompoEditSurNameValidate(text) { cy.get('#CUR-JRzrthyU').should('have.value', text); }
  CompoEditCAEValidate(text) { cy.get('#CUR-BbMNJqNK').should('have.value', text); }
  // Index Page data validation
  CompoLinkClick() { cy.get('#CUR-NycXRuxX').click().wait(2000); }
  CompoCreatedValidate() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::a[contains(text(),"A Composer Smoke")]').should('be.visible'); }
  CompoCreatedCAEValidate(text) { cy.get('#CUR-OuUVLroh span').contains(text).should('be.visible'); }
  // Updated edit page Composer
  CompoCreatedClick(text) { cy.get('#CUR-OuUVLroh a').contains(text).click(); }
  // Validate Updated Data
  CompoUpdatedValidate() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::a[contains(text(),"A Composer Smoke Update")]').should('be.visible'); }
  // Delete Composer
  CompoDeleteCreatedClick() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::a[contains(text(),"A Composer Smoke Update")]').click().wait(2000); }
  CompoDeleteButtonClick() { cy.get('#CUR-JaWdFtZJ').click().wait(2000); }
  CompoDeleteModalClick() { cy.get('#CUR-bcgdhSSZ').click().wait(2000); }

  // Delete Index
  CompoDeleteIndexClick() { cy.get('#CUR-FuVciLZH').should('be.visible').click().wait(2000); }
  CompoDeleteSelectedIndexClick() { cy.get('#CUR-YYhfFWWy').should('be.visible').click().wait(2000); }
  CompoDeleteModalIndexClick() { cy.get('#CUR-XzraYyAZ').should('be.visible').click().wait(2000); }

  // Works TC
  WorksSubMenuClick() { cy.get('#sidebar-works > a').click({ force: true }).wait(2000); }
  // Works Page content validation
  WorksSearchBarValidate() { cy.get('#CUR-LIaJGJGY').should('be.visible'); }
  // WorksSearchBarValidate() { cy.get('#CUR-UGPXLwcU').should('be.visible'); }
  // WorksBulkUpdateButtonValidate() { cy.get('#CUR-NnJJRmNQ').should('be.visible'); }
  WorksBulkDropdClick() { cy.get('#CUR-IKhDGVOd').should('be.visible'); }
  WorksBulkDropdValidate() { cy.get('#CUR-IKhDGVOd').should('be.visible').click().wait(2000); }
  WorksFlushContractsToWorksValidate() { cy.get('#CUR-LIDfLWXR').should('be.visible'); }
  WorksBulkApproveValidate() { cy.get('#CUR-FDypAttR').should('be.visible'); }
  WorksBulkApproveClick() { cy.get('#CUR-FDypAttR').should('be.visible').click().wait(2000); }
  WorksBulkHoldValidate() { cy.get('#CUR-ULafEIFU').should('be.visible'); }
  WorksBulkHoldClick() { cy.get('#CUR-ULafEIFU').should('be.visible').click().wait(2000); }
  WorksBulkResumeValidate() { cy.get('#CUR-ZfVzGWrD').should('be.visible'); }
  WorksBulkResumeClick() { cy.get('#CUR-ZfVzGWrD').should('be.visible').click().wait(2000); }
  WorksBulkUpdateDeliveryStatusClick() { cy.get('#CUR-cmaKeYLl').should('be.visible').click().wait(2000); }
  WorksBulkStatusDropdClick() { cy.xpath('//label[@id="CUR-uPTrqbeK"]/following::span[1]').should('be.visible').click().wait(2000); }
  WorksBulkStatusDropDSelValidate() { cy.xpath('//span[text()="Mark Accepted"]').should('be.visible'); }
  WorksBulkStatusDropDSelClick() { cy.xpath('//span[text()="Mark Delivered"]').should('be.visible').click().wait(2000); }
  WorksUpdateDeliveryStatusCheckboxClick() { cy.xpath('//h5[@id="CUR-CxAEZNpa"]/following::input[@type="checkbox"][1]').should('be.visible').click().wait(2000); }
  WorksUpdateDeliveryStatusUpdateClick() { cy.get('#CUR-XZkeNiJy').should('be.visible').click().wait(2000); }
  WorksDelvryTabStatusValidate() { cy.xpath('//th[text()="Status"]/following::div[text()="D"]').should('be.visible'); }
  WorksBulkUpdateDeliveryValidate() { cy.get('#CUR-cmaKeYLl').should('be.visible'); }
  WorksDeliverButtonValidate() { cy.get('#CUR-WBvbTQGx').should('be.visible'); }
  WorksDeliverButtonClick() { cy.get('#CUR-WBvbTQGx').should('be.visible').should('be.visible').click().wait(2000); }
  WorksDeliveryModalDropdClick() { cy.xpath('//h5[@id="CUR-addToDelivery-add-h5"]/following::span[1]').should('be.visible').click().wait(2000); }
  WorksDeliveryDropdSelClick() { cy.xpath('//h5[@id="CUR-addToDelivery-add-h5"]/following::span[text()="Z Test Deliveries"]').click().wait(2000); }
  WorksDeliveryModalAddClick() { cy.get('#CUR-addToDelivery-addToDelivery').click().wait(2000); }
  WorksDeliveryCreatedLinkedWorksValidate() { cy.xpath('//span[text()="A Work Smoke"]').should('be.visible'); }
  WorksDeliveryDeleteLinkedWorksClick() { cy.xpath('//span[@class="close ui-select-match-close"]').should('be.visible').click().wait(2000); }
  // WorksDeliverButtonValidate() { cy.get('#CUR-EQmlyZrK').should('be.visible'); }
  // WorksExportButtonValidate() { cy.get('#CUR-fqGIIWLl').should('be.visible'); }
  WorksExportButtonValidate() { cy.get('#CUR-zeUNEPTF').should('be.visible'); }
  WorksExportButtonCick() { cy.get('#CUR-zeUNEPTF').should('be.visible').click().wait(2000); }
  WorksImportButtonValidate() { cy.get('#CUR-iANFXSjF').should('be.visible'); }
  // WorksImportButtonValidate() { cy.get('#CUR-EXKAKmlJ').should('be.visible'); }
  // WorksDeleteButtonValidate() { cy.get('#CUR-HAmSUhwK').should('be.visible'); }
  WorksDeleteButtonValidate() { cy.get('#CUR-VkYSXqHf').should('be.visible'); }




  WorksErrorPromptIndexValidate() { cy.xpath('//div[@class="alert alert-warning"]').should('be.visible'); }

  WorksFirstCheckboxClick() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::input[@id="item-select-0"][1]').should('be.visible').click().wait(2000) }
  WorksContractFieldType(text) { cy.xpath('//label[@id="CUR-lRrKPRGs"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  // WorksCreateValidate() { cy.get('#CUR-KAaEpThj').should('be.visible'); }
  WorksCreateValidate() { cy.get('#CUR-wrgSKrHw').should('be.visible'); }
  WorksCatGroupValidate() { cy.xpath('//a[@id="CUR-wrgSKrHw"]/following::input[@type="search"][1]').should('be.visible'); }
  WorksCatGroupIndexType(text) { cy.xpath('//a[@id="CUR-wrgSKrHw"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  WorksCreateAfterValidate() { cy.get('#CUR-PtNnuxFK').should('be.enabled'); }
  WorksCreateAfterType(text) { cy.get('#CUR-PtNnuxFK').should('be.enabled').type(text).wait(2000); }
  WorksCreatedAfterDoneClick() { cy.xpath('//label[@id="CUR-nswRrcLh"]/following::button[text()="Done"]').should('be.visible').click().wait(2000); }
  // WorksCreateAfterValidate() { cy.get('#CUR-WXUZHcuG').should('be.enabled'); }
  // WorksCreatedBeforeValidate() { cy.get('#CUR-BnuXKbhL').should('be.enabled'); }
  WorksCreatedBeforeValidate() { cy.get('#CUR-nztGOLws').should('be.enabled'); }
  WorksCreatedBeforeType(text) { cy.get('#CUR-nztGOLws').should('be.enabled').type(text).wait(2000); }
  WorksComposerFieldValidate() { cy.xpath('//label[@id="CUR-JTKhnUon"]/following::input[@type="search"][1]').should('be.enabled'); }
  WorksComposerFieldType(text) { cy.xpath('//label[@id="CUR-JTKhnUon"]/following::input[@type="search"][1]').should('be.enabled').type(text).wait(2000); }
  WorksPublisherFieldValidate() { cy.xpath('//label[@id="CUR-AZqHQhwn"]/following::input[@type="search"][1]').should('be.visible'); }
  WorksPublisherFieldType(text) { cy.xpath('//label[@id="CUR-AZqHQhwn"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  WokrsStatusDropdClick() { cy.xpath('//label[@id="CUR-FMrNoJTR"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  WorksStatusDropdSelOnholdValidate() { cy.xpath('//span[text()="On Hold"]').should('be.visible'); }
  WorksStatusDropdSelReady4ApprvalValidate() { cy.xpath('//span[text()="Ready for Approval"]').should('be.visible'); }
  WorksStatusDropdSelInvalidValidate() { cy.xpath('//span[text()="Invalid"]').should('be.visible'); }
  WorksStatusDropdSelClick() { cy.xpath('//span[text()="Approved"]').should('be.visible').click().wait(2000); }
  WorksTotalCounterValidate() { cy.get('#CUR-ViswpLVG').should('be.visible'); }
  WorksShowAllValidate() { cy.get('#CUR-aVZqSylk').should('be.visible'); }
  WorksShowing25PerPageValidate() { cy.get('#CUR-oiiJLkIx').should('be.visible'); }
  WorksValidDDValidate() { cy.xpath('//label[@id="CUR-dUAImXqt"]/following::span[@tabindex="-1"]').should('be.visible'); }
  WorksParticipationValidate() { cy.xpath('//label[@id="CUR-dzwxzODQ"]/following::input[@type="number"][1]').should('be.visible'); }
  WorksParticipationType(text) { cy.xpath('//label[@id="CUR-dzwxzODQ"]/following::input[@type="number"][1]').should('be.visible').type(text).wait(2000); }
  WorksOwnershipValidate() { cy.xpath('//label[@id="CUR-BsjEvpOq"]/following::input[@type="number"][1]').should('be.visible'); }
  WorksOwnershipType(text) { cy.xpath('//label[@id="CUR-BsjEvpOq"]/following::input[@type="number"][1]').should('be.visible').type(text).wait(2000); }
  WorksFilterButtonValidate() { cy.get('#CUR-OPOcSCUz').should('be.visible'); }
  WorksFilterButtonClick() { cy.get('#CUR-OPOcSCUz').should('be.visible').should('be.visible').click().wait(2000); }
  WorksTitleHeaderValidate() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::th[@role="button"][1]').should('have.text', 'Title'); }
  WorksComposerHeaderValidate() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::th[@role="button"][2]').should('have.text', 'Composer'); }
  WorksMainIdentifHeaderValidate() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::th[@role="button"][3]').should('be.visible'); }
  WorksCreatedHeaderValidate() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::th[@role="button"][4]').should('have.text', 'Created'); } 
  WorksOwnershipHeaderValidate() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::th[@role="button"][5]').should('have.text', 'Ownership'); }
  WorksSearchDuplicateType(text) { cy.get('#CUR-LIaJGJGY').should('be.visible').click().clear().type(text).type('{enter}').wait(5000); }
  WorksSearchClear() { cy.get('#CUR-LIaJGJGY').clear().type('{enter}').wait(2000); }
  WorksSearchIconButtonClick() { cy.get('#CUR-TDcqiadQ').should('be.visible').click().wait(2000); }
  WorkskTableHeadValidate(text) { cy.get('#CUR-QJScNMSt').contains(text).click().wait(2000); }

  //
  // Insert Condition statement here to delete if there's an existing duplicate data
  //
  WorksDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
  // synchronously ask for the body's text
  // and do something based on whether it includes
  // another string
    if ($body.text().includes('A Work Smoke')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-QJScNMSt a').contains('A Work Smoke').click().wait(2000);
      cy.get('#CUR-XJkFoQlq').click().wait(1000) // delete button
      cy.get('#CUR-AzjXhskq').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Work Smoke Update')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-QJScNMSt a').contains('A Work Smoke Update').click().wait(2000);
      cy.get('#CUR-XJkFoQlq').click().wait(1000) // delete button
      cy.get('#CUR-AzjXhskq').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Work Smoke', 'A Work Smoke Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible').wait(1000);
    }
  }) }
  // Create a Work
  WorksCreateClick() { cy.get('#CUR-wrgSKrHw').click().wait(2000); }
  WorksTitleType(text) { cy.get('#CUR-lsTRMbuJ').clear().type(text); }
  WorksAddAltTitleClick() { cy.get('#CUR-qxneCfJR').click().wait(1000); }
  WorksCopyButtonClick() {  cy.get('#CUR-iRaFdRnb').should('be.visible').click().wait(2000); }
  WorksAltTitleFieldType(text) { cy.xpath('//label[@id="CUR-vLICvQZe"]/following::input[@type="text"][1]').clear().type(text); }
  WorksLanguageOvrvwDDClick() { cy.xpath('//label[@id="CUR-sWfTWOUN"]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  WorksLanguageOvrvwSelectionClick() { cy.xpath('//span[contains(text(),"English")]').click(); }
  WorksCategoryClick() { cy.xpath('//label[@id="CUR-FamUVQWa"]/following::select[@aria-invalid="false"][1]').select('string:Pop'); }
  WorksCategoryJazzClick() { cy.xpath('//label[@id="CUR-FamUVQWa"]/following::select[@aria-invalid="false"][1]').select('string:Jazz'); }
  WorksCategoryClassicalClick() { cy.xpath('//label[@id="CUR-FamUVQWa"]/following::select[@aria-invalid="false"][1]').select('string:Classical'); }
  WorksCategoryUndefinedClick() { cy.xpath('//label[@id="CUR-FamUVQWa"]/following::select[@aria-invalid="false"][1]').select('string:Classical'); }
  WorksLanguageConfigDDClick() { cy.xpath('//label[@id="CUR-ekpzyKQr"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  WorksLanguageConfigSelectionClick() { cy.xpath('//span[@id="CUR-qLoefOVU" and contains(text(),"English")]').click({ force: true }); }
  WorksCompositeTypeSelect() { cy.xpath('//label[@id="CUR-ISpsJBCk"]/following::select[@aria-invalid="false"][1]').select('string:None'); }
  WorksWorkVersionSelect() { cy.xpath('//label[@id="CUR-ljxFbnWk"]/following::select[@aria-invalid="false"][1]').select('string:Original Work'); }
  WorksWorkVersionModificationSelect() { cy.xpath('//label[@id="CUR-ljxFbnWk"]/following::select[@aria-invalid="false"][1]').select('string:Modification'); }
  WorksComposerType(text) { cy.get('#CUR-VJwHBmur').clear().type(text).wait(1000); }
  WorksForeignIDType() { cy.get('#CUR-dxyDcLit').type('AWS1029283'); }
  WorksProjectIDType() { cy.get('#CUR-projectId-input').type('WS098765'); }
  WorksMainIdentifierType(text) { cy.get('#CUR-rgfRlRyx').should('be.visible').clear().type(text); }
  WorksPriorityValidate() { cy.get('#CUR-tqUrMpoj').should('be.visible'); }
  WorksProductionLibrary() { cy.get('#CUR-mUNsBIzL').should('be.visible'); }
  WorksCatGroupsType(text) { cy.xpath('//div[@id="CUR-ySPXtFMJ"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  WorksISWCType(text) { cy.get('#CUR-nXHdjIIM').should('be.visible').clear().type(text).wait(2000); }
  WorksTuneCodeType(text) { cy.get('#CUR-qPZMALXT').should('be.visible').clear().type(text).wait(2000); }
  WorksTuneCopyrightDateType(text) { cy.get('#CUR-uledeJqA').should('be.visible').clear().type(text).wait(2000); }
  WorksCopyrightDateDoneClick() { cy.xpath('//label[@id="CUR-OBJzFCId"]/following::button[text()="Done"]').should('be.visible').click().wait(2000); }
  WorksLabelCopyType(text) { cy.get('#CUR-sutvPwvD').should('be.visible').clear().type(text).wait(2000); }
  WorksNotesType(text) { cy.xpath('//textarea[@ng-model="work.notes"]').should('be.visible').clear().type(text).wait(2000); }
  WorksAddPerformerClick() { cy.get('#CUR-fxkwFcoo').should('be.visible').click().wait(2000); }
  WorksPerformerFieldType(text) { cy.get('#CUR-tKPkwkCG').should('be.visible').clear().type(text).wait(2000); }
  WorksPerformerDeleteClick() { cy.get('#CUR-JPKWXYsV').should('be.visible').click().wait(2000); }
  WorksAddTrackClick() { cy.get('#CUR-gkLAXzRq').should('be.visible').click().wait(2000); }
  WorksApproveButtonClick() { cy.get('#CUR-kzDgNIqq').should('be.visible').click().wait(2000); }
  WorksOverviewTabClick() { cy.get('#CUR-rLmyvJFq').should('be.visible').click().wait(2000); }
  WorksSignificantModalOkClick() { cy.get('#CUR-zsjwsTMB').should('be.visible').click().wait(2000); }

  // works import
  WorksImportButtonClick() { cy.get('#CUR-iANFXSjF').should('be.visible').click().wait(2000); }
  WorksImportModalClick() { cy.get('#CUR-BwJGXXxF').should('be.visible').click().wait(10000); }
  WorksSearchIconClick() { cy.get('#CUR-FJnQAzwW').should('be.visible').click().wait(2000); }
  WorksImportedDataValidate(text) { cy.get('#CUR-QJScNMSt').contains(text).should('be.visible'); }

  // add track
  WorksAddTrackFieldType(text) { cy.xpath('//label[@id="CUR-SEJPurhw"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }
  WorksAddTrackDeleteButtonClick() { cy.xpath('//label[@id="CUR-SEJPurhw"]/following::i[1]').should('be.visible').click().wait(2000); }
  // create track
  WorksCreateTrackClick() { cy.get('#CUR-dasroqdV').should('be.visible').click().wait(2000); }
  WorksTrackTitleType(text) { cy.get('#CUR-wsselkFN').should('be.visible').clear().type(text).wait(2000); }
  WorksTrackVersionType(text) { cy.get('#CUR-xLFAqKcu').should('be.visible').clear().type(text).wait(2000); }
  WorksTrackArtistType(text) { cy.get('#CUR-wuJDWSKl').should('be.visible').clear().type(text).wait(2000); }
  WorksTrackForeignIDType(text) { cy.get('#CUR-pXzRueWL').should('be.visible').clear().type(text).wait(2000); }
  WorksTracksProjectIDType(text) { cy.get('#CUR-create-track-projectId-input').should('be.visible').clear().type(text).wait(2000); }
  WorksTracksISRCType(text) { cy.get('#CUR-RQrQPMPg').should('be.visible').clear().type(text).wait(2000); }
  WorksTracksCancelButtonClick() {  cy.get('#CUR-wBKxRJrH').should('be.visible').click().wait(2000); }
  WorksTracksCreateButtonValidate() { cy.get('#CUR-kQZYMKLd').should('be.visible'); }

  // Button on the upper right sife of edit page
  WorksApproveButtonValidate() { cy.xpath('//a[@id="CUR-oOdualDT"]/following::button[1]').should('be.visible'); }
  WorkHoldValidate() { cy.xpath('//a[@id="CUR-oOdualDT"]/following::button[2]').should('be.visible'); }
  WorksCopyValidate() { cy.xpath('//a[@id="CUR-oOdualDT"]/following::button[4]').should('be.visible'); }
  // Adding territory
  WorksTerritoriesTabClick() { cy.get('#CUR-fNRPquyE').should('be.visible').click().wait(2000); }
  WorksWorldCheck() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[1]').check(); }
  WorksAfricaContinent() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[@ng-model="continents.africa"]').should('be.visible').check(); }
  WorksAmericasContinent() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[@ng-model="continents.americas"]').should('be.visible').check(); }
  WorksAsiaContinent() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[@ng-model="continents.asia"]').should('be.visible').check(); }
  WorksEuropeContinent() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[@ng-model="continents.europe"]').should('be.visible').check(); }
  WorksOceaniaContinent() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[@ng-model="continents.oceania"]').should('be.visible').check(); }
  // Adding IP Chain
  WorksIPChainTabClick() { cy.get('#CUR-gsehYTpY').click(); }
  WorksAddTerritoryClick() { cy.get('#CUR-BsaeqULR').click().wait(1000); }
  // IP Chain
  WorksAddPubClick() { cy.xpath('//label[contains(text(),"Territory")]/following::button[contains(text(),"+ Pub")][1]').click({ force: true }).wait(3000); }
  WorksAddCompValidate() { cy.xpath('//label[contains(text(),"Territory")]/following::button[contains(text(),"+ Comp")][1]').should('be.visible'); }
  WorksAddPubDeleteClick() { cy.xpath('//label[text()="Territory"]/following::i[@class="fa fa-trash"][1]').click({ force: true }).wait(3000); }
  WorksPubSearchType() { cy.xpath('//label[contains(text(),"Publisher")]/following::input[1]').clear().type('publisher 2').wait(1000); }
  WorksPubSelectClick() { cy.get('#CUR-iudiqUJH strong').contains('publisher 2').click().wait(2000); }
  WorksCategorySelect() { cy.xpath('//label[contains(text(),"Publisher")]/following::select[1]').select('string:Admin').wait(2000); }
  WorksCategoryOriginalSelect() { cy.xpath('//label[contains(text(),"Publisher")]/following::select[1]').select('string:Original Publisher').wait(2000); }
  WorksOwnMechValidate() { cy.xpath('//label[contains(text(),"Own Mech.")]/following::input[@type="number"][1]').should('be.visible'); }
  WorksOwnPerfValidate() { cy.xpath('//label[contains(text(),"Own Perf.")]/following::input[1]').should('be.visible'); }
  WorksOwnMechType() { cy.xpath('//label[contains(text(),"Own Mech.")]/following::input[@type="number"][1]').type('100').wait(2000); }
  WorksOwnPerfType() { cy.xpath('//label[contains(text(),"Own Perf.")]/following::input[1]').type('50').wait(2000); }
  // Composer
  WorksAddCompClick() { cy.xpath('//label[contains(text(),"Territory")]/following::button[contains(text(),"+ Comp")][1]').click().wait(1000); }
  WorksCompSearchType() { cy.xpath('//label[contains(text(),"Publisher")]/following::input[@type="text"][2]').type('composer 2').wait(1000); }
  WorksCompSelectClick() { cy.xpath('//strong[contains(text(),"composer")]').contains('composer 2').click().wait(1000); }
  WorksCategoryDDSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Arranger').wait(2000); }
  WorksCheckBoxCheck() { cy.xpath('//label[contains(text(),"Territory")]/following::input[@type="checkbox"][2]').check().wait(2000); }
  WorksOwnPerfComposerType() { cy.xpath('//label[contains(text(),"Territory")]/following::input[@type="number"][6]').type('50').wait(200); }
  WorksColPerfComposerType() { cy.xpath('//label[contains(text(),"Territory")]/following::input[@type="number"][8]').type('50').wait(1000); }

  // If Modification is selected
  WorksArrangementTypeValidate() { cy.xpath('//label[@id="CUR-ayZtfmLK"]/following::select[1]').should('be.visible'); }
  WorksLyricAdaptationValidate() { cy.xpath('//label[@id="CUR-SlpVQsqw"]/following::select[1]').should('be.visible'); }
  WorksOriginalWorkTitleValidate(text) { cy.get('#CUR-DKemxKkk').should('be.visible').clear().type(text); }
  WorksISWCValidate(text) { cy.get('#CUR-KurEAWvK').should('be.visible').clear().type(text); }
  WorksOriginalWorkSourceValidate(text) { cy.get('#CUR-hbDYiyhh').should('be.visible').clear().type(text); }
  WorksOriginalWritersLnameValidate(text) { cy.get('#CUR-lvmwtYnS').should('be.visible').clear().type(text); }
  WorksOriginalWritersFnameValidate(text) { cy.get('#CUR-kpDrkOiF').should('be.visible').clear().type(text); }

  WorskAddCompChainClick() { cy.xpath('//label[contains(text(),"Territory")]/following::button[contains(text(),"+ Comp")][2]').click().wait(2000); }
  WorksCategoryDDLyricsAndMusicSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Lyrics and Music').wait(2000); }
  WorksCategoryDDMusicSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Music').wait(2000); }
  WorksCategoryDDLyricsSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Lyrics').wait(2000); }
  WorksCategoryDDSubArrangerSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Sub Arranger').wait(2000); }
  WorksCategoryAdapterDDSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Adapter').wait(2000); }
  WorksCategorySubAuthorDDSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Sub Author').wait(2000); }
  WorksCategoryTranslatorDDSelect() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Translator').wait(2000); }
  WorksErrorValidate() { cy.get('#CUR-yFLMJTrb').should('not.exist'); }
  WorksIndexStatusValidate() { cy.xpath('//a[text()="A Work Smoke"]/following::i[@class="fa fa-circle text-success ng-scope"][1]').should('be.visible'); }

  // Rights Tab
  WorksRightsTabClick() { cy.get('#CUR-GgIbObuD').should('be.visible').click().wait(2000); }
  WorksAddContractPariticipationRightsClick() { cy.get('#CUR-ZHChZZPz').should('be.visible').click().wait(2000); }
  WorksAddSubContractClick() { cy.xpath('//label[text()="Contract"]/following::button[@ng-click="addChild(contract)"][1]').should('be.visible').click().wait(2000); }
  WorksAddSubConFieldType(text) { cy.xpath('//h3[@id="CUR-MeNmQplX"]/following::input[@type="text"][2]').type(text).wait(2000); }
  WorksParticipationRatesDeleteButtonClick() { cy.xpath('//h3[@id="CUR-MeNmQplX"]/following::button[1]').should('be.visible').click().wait(2000); }
  WorksSpecificParticipationRatesAddContractClick() { cy.get('#CUR-udOHiZkn').should('be.visible').click().wait(2000); } 

  WorksSPRContractFieldType(text) { cy.xpath('//div[@id="CUR-OZmdZsom"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }
  WorksSPRDistribChannelDropdClick() { cy.xpath('//label[text()="Distribution Channel"]/following::select[1]').should('be.visible').select('string:Performance').wait(2000); }
  WorksSPRSourceType(text) { cy.xpath('//label[text()="Source"]/following::input[@ng-if="edit"][1]').should('be.visible').clear().type(text).wait(2000); }
  WorksTerritorySPRClick() { cy.xpath('//label[text()="Territory"]/following::span[1]').should('be.visible').click().wait(2000); }
  WorksTerritoryDdSelClick() { cy.xpath('//label[text()="Territory"]/following::span[text()="World"]').should('be.visible').click().wait(2000); }
  WorksSPRRateType(text) { cy.xpath('//label[text()="Territory"]/following::input[@type="number"]').should('be.visible').clear().type(text).wait(2000); }

  // Alias tab
  WorksAliasesTab() { cy.get('#CUR-JfnPfyOr').should('be.visible').click().wait(2000); }
  WorksAddIdentifierClick() { cy.get('#CUR-NoVvHnsF').should('be.visible').click().wait(2000); }
  WorksAliasesSocietyDropdClick() { cy.xpath('//label[text()="Society"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  WorksAliasIdentifierType(text) { cy.xpath('//label[text()="Identifier"]/following::input[@aria-invalid="false"][1]').should('be.visible').clear().type(text).wait(2000); }
  WorksAliasesDeleteClick() { cy.xpath('//a[@id="CUR-JfnPfyOr"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  WorksAddAliasButtonClick() { cy.get('#CUR-ATDJmTdE').should('be.visible').click().wait(2000); }
  WorksAliasesFieldType(text) { cy.xpath('//div[@id="CUR-xDwBWXqI"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }

  // deliveries tab
  WokrsDlvrsTabClick() { cy.get('#CUR-gKfOzctv').should('be.visible').click().wait(2000); }
  WorksDlvrsTableHeaderValidate(text) { cy.get('#CUR-EZQKTLdY').contains(text).should('be.visible'); }
  WorksDlvrsDropdForceDeliverySelect() { cy.xpath('//span[@id="CUR-gKfOzctv"]/following::select[@ng-disabled][5]').should('be.visible').select('string:Force Delivery').wait(2000); }
  WorksDlvrsDropdHoldSelect() { cy.xpath('//span[@id="CUR-gKfOzctv"]/following::select[@ng-disabled][5]').should('be.visible').select('string:Hold').wait(2000); }
  WorksDlvrsDropdResumeSelect() { cy.xpath('//span[@id="CUR-gKfOzctv"]/following::select[@ng-disabled][5]').should('be.visible').select('string:Resume').wait(2000); }
  WorksDlvrsDropdMarkedDeliveredSelect() { cy.xpath('//span[@id="CUR-gKfOzctv"]/following::select[@ng-disabled][5]').should('be.visible').select('string:Mark Delivered').wait(2000); }
  WorksDlvrsDropdMarkedAcceptedSelect() { cy.xpath('//span[@id="CUR-gKfOzctv"]/following::select[@ng-disabled][5]').should('be.visible').select('string:Mark Accepted').wait(2000); }
  WorksDlvrsUpdateStatusDropdClick() { cy.xpath('//div[@id="CUR-WKJwTLaL"]/following::select[@ng-disabled][3]').should('be.visible').select('string:Force Delivery').wait(2000); }

  // Analytics tab
  WorksAnalyticsTabClick() { cy.get('#CUR-QgdgsLCo').should('be.visible').click().wait(2000); }
  WorksSaveClick() { cy.get('#CUR-krbtirMF').click().wait(5000); }
  // Validate Created Data
  WorksLinkClick() { cy.get('#CUR-zUiMHZJq').click().wait(3000); }
  // WorksCreatedValidate(text) { cy.get('#CUR-KHaNLiQh a').contains(text).should('be.visible'); }
  WorksCreatedValidate(text) { cy.get('#CUR-QJScNMSt a').contains(text).should('be.visible'); }
  // WorksComposerValidate(text) { cy.get('#CUR-KHaNLiQh span').contains(text).should('be.visible'); }
  WorksComposerValidate(text) { cy.get('#CUR-QJScNMSt span').contains(text).should('be.visible'); }
  // Update Edit page Works
  // WorkskCreatedClick(text) { cy.get('#CUR-KHaNLiQh a').contains(text).click().wait(2000); }
  WorkskCreatedClick(text) { cy.get('#CUR-QJScNMSt a').contains(text).click().wait(2000); }
  // Validated Updated Data
  WorksValidateUpdatedTitle() { cy.get('#CUR-lsTRMbuJ').should('have.value', 'A Work Smoke Update'); }
  WorksValidateUpdatedComposer() { cy.get('#CUR-VJwHBmur').should('have.value', 'Zafra'); }
  WorksValidateUpdatedMainID() { cy.get('#CUR-rgfRlRyx').should('have.value', 'BB00099998'); }
  // Validate Index Page
  // Delete Works
  WorksDeleteButtonClick() { cy.get('#CUR-XJkFoQlq').click().wait(1000); }
  WorksDeleteButtonModalClick() { cy.get('#CUR-AzjXhskq').click().wait(3000); }
  WorksDeleteSpecificClick() { cy.xpath('//a[text()="A Work Smoke"]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  WorksDeleteIndexClick() { cy.get('#CUR-VkYSXqHf').should('be.visible').click().wait(2000); }
  WorksDeleteSelectedIndexClick() { cy.get('#CUR-IOsRcqvB').should('be.visible').click().wait(2000); }
  WorksDeleteModalIndexClick() { cy.get('#CUR-RDTTPxdK').should('be.visible').click().wait(2000); }
  WorksIndexCheckboxClick() { cy.xpath('//div[@id="CUR-CjytYyTr"]/following::input[@type="checkbox"][1]').should('be.visible').click().wait(2000); }


  // 
  // Tracks TC
  // 
  TracksSubMenuClick() { cy.get('#sidebar-tracks > a').click().wait(2000); }
  // Page content validation
  TracksLinkValidate() { cy.get('#CUR-EbAPTKvy').should('be.visible'); }
  TracksSearchBarValidate() { cy.get('#CUR-KcppnpIT').should('be.visible'); }
  TracksExportButtonValidate() { cy.get('#CUR-FOxFDCYV').should('be.visible'); }
  TracksImportButtonValidate() { cy.get('#CUR-qPFhbvpu').should('be.visible'); }
  TracksDeleteButtonValidate() { cy.get('#CUR-DsaOOCyn').should('be.visible'); }
  TracksCreateButtonValidate() { cy.get('#CUR-ImZPJRMB').should('be.visible'); }
  TracksCATGroupFieldValidate() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][1]').should('be.visible'); }
  TracksContractFieldValidate() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][2]').should('be.visible'); }
  TracksCreatedAfterValidate() { cy.get('#CUR-DbLvGukz').should('be.visible'); }
  TracksCreatedBeforeValidate() { cy.get('#CUR-rfxIOvip').should('be.visible'); }
  TracksParticipationValidate() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="number"]').should('be.visible'); }
  TracksCompleteDDValidate() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::span[@aria-label="Select box activate"][1]').should('be.visible'); }
  TracksCompleteDDClick() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::span[@aria-label="Select box activate"][1]').should('be.visible').click().wait(2000); }
  TracksCompleteDDSelCompleteValidate() { cy.xpath('//span[@id="CUR-khHSApJw" and text()="Complete"]').should('be.visible'); }
  TracksCompleteDDSelIncompleteValidate() { cy.xpath('//span[@id="CUR-khHSApJw" and text()="Incomplete"]').should('be.visible'); }
  TracksLabelFieldValidate() { cy.get('#CUR-filter-label-textbox').should('be.visible'); }
  TracksCompanyFieldValidate() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][4]').should('be.visible'); } 
  TracksMechanicalContractValidate() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][5]').should('be.visible'); }
  TracksFilterValidate() { cy.get('#CUR-uiaJvCvp').should('be.visible'); }
  TracksExportCombinedValidate() { cy.get('#CUR-XkotFdoA').should('be.visible'); }
  TracksExportSeparatedValidate() { cy.get('#CUR-dxxQKpWR').should('be.visible'); }
  TracksTotalCounterValidate() { cy.get('#CUR-WbNMDqca').should('be.visible'); }
  TracksPageNumberButtons() { cy.xpath('//span[@class="ng-binding current"]').should('be.visible'); }
  TracksShowAllButtonValidate() { cy.get('#CUR-vwHHqbfX').should('be.visible'); }
  TracksShowingPerPageValidate() { cy.get('#CUR-QGHXvlVN').should('be.visible'); } 
  TracksTableHeaderValidate(text) { cy.get('#CUR-MSfnkrEY th').contains(text).should('be.visible'); }
  TracksSearchDuplicateType(text) { cy.get('#CUR-KcppnpIT').should('be.visible').click().clear().type(text).type('{enter}').wait(5000); }
  TracksSearchClear() { cy.get('#CUR-KcppnpIT').clear().type('{enter}').wait(2000); }
  TracksCopyButtonClick() { cy.get('#CUR-fwdGaDkq').should('be.visible').click().wait(2000); }
  TrackDeleteCreatedCboxClick() { cy.xpath('//a[text()="A test track"]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  TracksDeleteAllCboxClick() { cy.xpath('//input[@class="select-all"]').should('be.visible').click().wait(2000); }

  //
  // Insert Condition statement here to delete if there's an existing duplicate data
  //
  TracksDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
  // synchronously ask for the body's text
  // and do something based on whether it includes
  // another string
    if ($body.text().includes('A Tracks Smoke')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-hcfplJdv').contains('A Tracks Smoke').click().wait(2000);
      cy.get('#CUR-YLCMDySu').click().wait(1000) // delete button
      cy.get('#CUR-tOCyBdOF').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Tracks Smoke Update')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-hcfplJdv').contains('A Tracks Smoke Update').click().wait(2000);
      cy.get('#CUR-YLCMDySu').click().wait(1000) // delete button
      cy.get('#CUR-tOCyBdOF').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Tracks Smoke', 'A Tracks Smoke Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  // Create Track
  TracksOverViewHeaderValidate() { cy.get('#CUR-kfioMgkq').should('be.visible'); }
  TracksCatalogueGroupsValidate() { cy.get('#CUR-ruBJVzaq').should('be.visible'); }
  TracksDefaultReleaseHeaderValidate() { cy.get('#CUR-GTmhSZgW').should('be.visible'); }
  TracksReleaseSpecificForeignIDsHeaderValidate() { cy.get('#CUR-PBVuVgAX').should('be.visible'); }
  TracksDefaultReleaseFieldType(text) { cy.get('#release-map-to-').clear().type(text).wait(2000); }
  TracksAddForeignIDClick() { cy.get('#CUR-tcfIPPpP').should('be.visible').click().wait(2000); }
  TracksCreateButtonClick() { cy.get('#CUR-ImZPJRMB').click({ force: true }).wait(1000); }
  TracksOverviewTabValidate() { cy.get('#CUR-BpKgzLNW').should('be.visible'); }
  TracksTitleFieldType(text) { cy.get('#CUR-aJwaQxhr').clear().type(text); }
  TracksVersionFieldType(text) { cy.get('#CUR-kQslEfhD').clear().type(text); }
  TracksArtistFieldType(text) { cy.get('#CUR-MbNpDepo').clear().type(text); }
  TracksForeignIDType(text) { cy.get('#CUR-YwEVxbHr').clear().type(text); }
  TracksProjectIDType(text) { cy.get('#CUR-projectId-input').clear().type(text); }
  TracksCatalogueGroupsClick() { cy.xpath('//input[@id="CUR-aJwaQxhr"]/following::input[@type="search"][1]').click({ force: true }).wait(2000) }
  TracksCatalogueGroupsSelectionClick() { cy.get('#CUR-vcYOVxje span').contains('CAT 1').click().wait(2000); }
  TracksCatGroupsSelClick(text) { cy.get('#CUR-vcYOVxje span').contains(text).click().wait(2000); }
  TracksISRCType(text) { cy.get('#CUR-cOegSfmz').clear().type(text); }
  TracksLabelType(text) { cy.get('#CUR-XGvXfkQh').clear().type(text); }
  TracksPlineType(text) { cy.get('#CUR-FALBZvqH').clear().type(text); }
  TracksDurationType(text) { cy.get('#CUR-egOoZEpB').clear().type(text); }
  TracksRightsTabClick() { cy.get('#CUR-gXGXUiea').click().wait(2000); }
  TracksAddContractClick() { cy.get('#CUR-lwiBgRup').click().wait(2000); }
  TracksCreatedAfterType(text) { cy.get('#CUR-DbLvGukz').click().click().clear().type(text).wait(2000); }

  // Rights Tab Page
  // LabelTracksContractsSearchField1() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').click({ force: true }).type('Test Gelo 100',{ force: true }).wait(2000); }
  TracksContractsSearchFieldType() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').clear().type('Test Gelo 100').wait(2000); }
  TracksContractsSelectionClick() { cy.xpath('//strong[contains(text(),"Test Gelo 100")]').click({ force: true }) }
  TracksSalesReturnsHeaderValidate() { cy.get('#CUR-zYOSftEP').should('be.visible'); }
  TracksRightsCostsHeadersValidate() { cy.get('#CUR-WsjuoIut').should('be.visible'); }
  TracksReleaseSpecificSalesValidate() { cy.get('#CUR-sqNBmMng').should('be.visible'); }
  TracksSalesReturnDeleteButtonClick() { cy.xpath('//div[@id="CUR-zYOSftEP"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  // Costs
  TracksRightsCostsAddContractClick() { cy.get('#CUR-OATHYilB').should('be.visible').click().wait(2000); }
  TracksRightsContractFieldType(text) { cy.xpath('//label[text()="Contract"]/following::input[1]').should('be.visible').click().wait(2000).clear().type(text); }
  TracksRightsRatetFieldType(text) { cy.xpath('//label[text()="Rate"]/following::input[1]').should('be.visible').click().wait(2000).clear().type(text); }
  TracksRightsDeleteButtonClick() { cy.xpath('//div[@id="CUR-WsjuoIut"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  TracksCopyFromSalesClick() { cy.get('#CUR-BcOUjdbs').should('be.visible').click().wait(2000); }
  // RELEASE SPECIFIC SALES/RETURNS
  TracksRightsReleaseSpecSalesContractClick() { cy.get('#CUR-jrmjEQaJ').should('be.visible').click().wait(2000); }
  TracksRightsReleaseFieldType(text) { cy.xpath('//div[@id="CUR-sqNBmMng"]/following::input[@id="release-map-to-"]').should('be.visible').click().clear().type(text).wait(2000); }
  TracksRightsRelSpecSalesContractFieldType(text) { cy.xpath('//div[@id="CUR-sqNBmMng"]/following::input[@typeahead-min-length="3"][2]').should('be.visible').click().clear().type(text).wait(2000);  }
  TracksRightsRateFieldType(text) { cy.xpath('//label[text()="Rate"]/following::input[@type="number"]').should('be.visible').click().clear().type(text).wait(2000);  }
  TracksRightsRelSpecSalesReturnDeleteClick() { cy.xpath('//label[text()="Rate"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000);  }


  // RELEASE SPECIFIC FOREIGN IDS
  TracksRelSpecForeignSel() { cy.xpath('//a[@title="A test release - gelo12345 - TEST1001 - CD"]').should('be.visible').click().wait(2000); }
  TracksRelSpecForeignSelPublisherClick() { cy.xpath('//a[@title="A test release - gelo12345 - TEST1001 - Television"]').should('be.visible').click().wait(2000); }
  TracksRelSpecReleaseFieldType(text) { cy.xpath('//label[text()="Release"]/following::input[@id="release-map-to-"][1]').should('be.visible').click().clear().type(text).wait(2000); }
  TracksRelSpecForeignIDType(text) { cy.xpath('//label[text()="Release"]/following::input[@type="text"][2]').should('be.visible').click().clear().type(text).wait(2000); }
  TracksRelSpecReleaseFieldValidate(text) { cy.xpath('//label[text()="Release"]/following::input[@id="release-map-to-"]').should('have.value', text); }





  // Aliases
  TracksAliasesTabClick() { cy.get('#CUR-PlqNkNEc').should('be.visible').click().wait(2000); }
  TracksAddAliasButtonClick() { cy.get('#CUR-itvZqDuE').should('be.visible').click().wait(2000); }
  TracksAliasesDeleteButtonClick() { cy.xpath('//div[@id="CUR-pxHiFvYF"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  TracksAliasesFieldType(text) { cy.xpath('//div[@id="CUR-pxHiFvYF"]/following::input[@type="text"][1]').should('be.visible').type(text).wait(2000); }

  // Mechanicals
  TracksMechanicalsTabClick() { cy.get('#CUR-AlBKIGVm').should('be.visible').click().wait(2000); }
  TracksMechanicalsBasisHeadersValidate() { cy.get('#CUR-pGVyXTdN').should('be.visible'); }
  TracksMechanicalsLicensesHeadersValidate() { cy.get('#CUR-yKxBcaZn').should('be.visible'); }
  TracksMechanicalBasisDropdClick() { cy.xpath('//label[@id="CUR-JrPYRgbZ"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  TracksMechanicalSaleDateClick() { cy.xpath('//span[text()="Sale Date"]').should('be.visible').click().wait(2000); }
  TracksMechanicalCustomClick() { cy.xpath('//span[text()="Custom"]').should('be.visible').click().wait(2000); }
  TracksCustomUSStatutoryDateType(text) { cy.get('#CUR-ijTEtiQw').should('be.visible').click().clear().type(text).wait(2000); }
  TracksCustomCanadianStatutoryDateType(text) { cy.get('#CUR-QoJCFXhB').should('be.visible').click().clear().type(text).wait(2000); }
  TracksReportMechanicalsCboxClick() { cy.get('#CUR-JSwZEJMp').should('be.visible').click().wait(2000); }
  TracksAddMechanicalsLicensesClick() { cy.get('#CUR-FOECOCHF').should('be.visible').click().wait(2000); }
  TracksMechanicalsComposerType(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][1]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksMechanicalsPublisherType(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][2]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksMechanicalsContractType(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][3]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksContCboxClick() { cy.xpath('//input[@ng-model="license.controlled"]').should('be.visible').click().wait(2000); }
  TracksMechanicalsLicenseNumber(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][4]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksMechanicalRateType(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][5]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksMechanicalShareType(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][6]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksMechanicalOverRideType(text) { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::input[@type="text"][7]').should('be.visible').click().wait(2000).clear().type(text).wait(2000); }
  TracksMechLicensesDeleteClick() { cy.xpath('//div[@id="CUR-yKxBcaZn"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  TracksMechComposerSelClick() { cy.xpath('//a[@title="test gelo"]').should('be.visible').click().wait(2000); }
  TracksMechContractSelClick() { cy.xpath('//a[@title="Gelo Test"]').should('be.visible').click().wait(2000); }


  // Releases
  TracksReleasesTabClick() { cy.get('#CUR-IqtkAHcl').should('be.visible').click().wait(2000); }
  TracksReleasesHeaderValidate() { cy.get('#CUR-gyelmPbY').should('be.visible'); }
  TracksReleasesTableHeaderValidate(text) { cy.get('#CUR-aOvhYNDr').contains(text).should('be.visible'); }
  TracksLinkedReleaseValidate(text) { cy.get('#CUR-kfvTZJWh').contains(text).should('be.visible').wait(2000); }

  // Analytics
  TracksAnalyticsTabClick() { cy.get('#CUR-XCPvsoAc').should('be.visible').click().wait(2000); }

  // Filter Index
  TracksCatGroupindexType(text) { cy.xpath('//label[@id="CUR-xbJagQMh"]/following::input[@type="search"][1]').should('be.visible').click().clear().type(text).wait(2000); }
  TracksCatGroupindexSelClick() { cy.xpath('//span[contains(text(),"CAT 1")]').should('be.visible').click().wait(2000); }
  TracksFilterButtonIndexClick() { cy.get('#CUR-uiaJvCvp').should('be.visible').click().wait(2000); }
  
  TracksContractIndexType(text) { cy.xpath('//label[@id="CUR-atMbAdIP"]/following::input[@type="search"][1]').should('be.visible').click().clear().type(text).wait(2000); }
  TracksContractIndexSelClick() { cy.xpath('//span[text()="Test Gelo 100"]').should('be.visible').click().wait(2000); }
  TracksCreatedAfterDoneClick() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::button[text()="Done"]').should('be.visible').click().wait(2000); }

  TracksCreatedBeforeType(text) { cy.get('#CUR-rfxIOvip').should('be.visible').click().click().clear().type(text).wait(2000); }
  TracksParticipationType(text) { cy.xpath('//label[@id="CUR-mHEnrSly"]/following::input[@type="number"][1]').click().clear().type(text).wait(2000); }

  // Export 
  TracksExportButtonClick() { cy.get('#CUR-FOxFDCYV').should('be.visible').click().wait(2000); }
  TracksExportCombinedButtonClick() { cy.get('#CUR-XkotFdoA').should('be.visible').click().wait(2000); }
  TracksExportSeparatedButtonClick() { cy.get('#CUR-dxxQKpWR').should('be.visible').click().wait(2000); }

  // Import
  TracksImportButtonClick() { cy.get('#CUR-qPFhbvpu').should('be.visible').click().wait(2000); }
  TracksImportTypeCombinedClick() { cy.xpath('//label[@id="CUR-USlHmlGO"]/following::span[@class="ui-select-choices-row-inner"][1]').should('be.visible').click().wait(2000); }
  TracksImportModalClick() { cy.get('#CUR-UmIZyIbK').should('be.visible').click().wait(2000); }
  TracksImportTypeSeparatedClick() { cy.xpath('//label[@id="CUR-USlHmlGO"]/following::span[@class="ui-select-choices-row-inner"][2]').should('be.visible').click().wait(2000); }
  TracksTableValidate(text) { cy.get('#CUR-MSfnkrEY span').contains(text).first().should('be.visible'); }
  TracksOverwriteBlanks() { cy.xpath('//input[@ng-model="overwriteBlanks"]').should('be.visible').click().wait(2000); }
  TracksImportTypeButton() { cy.xpath('//h5[@id="CUR-zBkMiZdz"]/following::span[@aria-label="Select box activate"]').should('be.visible').click().wait(2000); }
  TracksVersionBlankValidate(text) { cy.get('#CUR-kQslEfhD').contains(text).should('not.exist'); }

  TracksDuplicateISRCValidate() { cy.xpath('//div[@class="alert alert-error"]').contains('The object has not been saved. ISRC is required to be unique').should('be.visible'); }
 











  // save and validate created data on edit page
  TracksSaveClick() { cy.get('#CUR-UaNimHCt').click({ force: true }).wait(1000); } // Save Button
  TracksTitleValidate(text) { cy.get('#CUR-aJwaQxhr').should('have.value', text); } 
  TracksVersionValidate(text) { cy.get('#CUR-kQslEfhD').should('have.value', text); }
  TracksArtistValidate(text) { cy.get('#CUR-MbNpDepo').should('have.value', text); }
  TracksForeignIDValidate(text) { cy.get('#CUR-YwEVxbHr').should('have.value', text); }
  TracksProjectIDValidate(text) { cy.get('#CUR-projectId-input').should('have.value', text); }
  // Go to Rights Tab
  TracksContractValidate() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').should('have.value', 'Test Gelo 100'); }
  // validate created data on index page 
  TracksLinkClick() { cy.get('#CUR-MwPfmXzd').click().wait(2000); }
  TracksCreatedTitleValidate(text) { cy.get('#CUR-MSfnkrEY a').contains(text).should('be.visible'); }
  TracksCreatedDetailsValidate(text) { cy.get('#CUR-MSfnkrEY span').contains(text).should('be.visible'); }
  // Update Tracks on edit page
  TracksEditCreatedClick(text) { cy.get('#CUR-MSfnkrEY a').contains(text).click({ force: true }).wait(2000); }
  // save and validate updated data on edit page
  // validate updtaed data on index page 
  // delete track on edit page
  TracksCreatedTitleDeleteClick() { cy.get('#CUR-MSfnkrEY a').contains().click(); }
  TrasDeleteButtonClick() { cy.get('#CUR-YLCMDySu').click().wait(2000); }
  TracksDeleteModalButtonClick() { cy.get('#CUR-tOCyBdOF').click().wait(2000); }


  // Tracks index delete
  TracksDeleteIndexClick() { cy.get('#CUR-DsaOOCyn').should('be.visible').click().wait(2000); }
  TracksDeleteSelectedIndexClick() { cy.get('#CUR-VMQFfaSG').should('be.visible').click().wait(2000); }
  TracksDeleteModalIndexClick() { cy.get('#CUR-fvVkbFqX').should('be.visible').click().wait(2000); }
  TracksDeleteCheckAllModalIndexClick() { cy.xpath('//input[@class="select-all"]').should('be.visible').click().wait(2000); }


  // PUBLISHERS TC
  
  PublishersSubMenuClick() { cy.get('#sidebar-publishers > a').click().wait(2000); }
  // Index Page Content validations
  PublishersLinkValidate() { cy.get('#CUR-WPeTuqhB').should('be.visible'); }
  PublisherExportButtonValidate() { cy.get('#CUR-qSMNNTsL').should('be.visible'); }
  PublishersDeleteValidate() { cy.get('#CUR-cUnwntgQ').should('be.visible'); }
  PublishersImportValidate() { cy.get('#CUR-cRnLChHq').should('be.visible'); }
  PublishersCreateValidate() { cy.get('#CUR-gzVjvyDf').should('be.enabled'); }
  PublishersHeaderValidate() { cy.get('#CUR-IdTyYZVz').should('be.visible'); }
  PublishersHeaderNameValidate() { cy.xpath('//div[@id="CUR-IdTyYZVz"]/following::th[@tabindex="0"][1]').contains('Name').should('be.visible'); }
  PublishersCAEValidate() { cy.xpath('//div[@id="CUR-IdTyYZVz"]/following::th[@tabindex="0"][2]').contains('CAE').should('be.visible'); }
  PublishersCreatedHeaderValidate() { cy.xpath('//div[@id="CUR-IdTyYZVz"]/following::th[@tabindex="0"][3]').contains('Created').should('be.visible'); }
  PublishersShowingPage25Validate() { cy.get('#CUR-UyCYXogv').should('be.visible'); }
  PublisherShowAllValidate() { cy.get('#CUR-ZlQYpBSV').should('be.visible'); }
  PublisherSearchDuplicateType(text) { cy.get('#CUR-JnoepRFN').should('be.visible').click().clear().type(text).type('{enter}').wait(5000); }
  PublisherSearchClear() { cy.get('#CUR-JnoepRFN').clear().type('{enter}').wait(2000); }
  PublisherTotalValidate() { cy.get('#CUR-DFbNUokU').should('be.visible').click().wait(2000); }
  PublisherFilterButtonClick() { cy.get('#CUR-HiCNhUSw').should('be.visible').click().wait(2000); }
  PublisherCheckAllRbClick() { cy.xpath('//input[@ng-checked="selectAllChecked"]').should('be.visible').click().wait(2000); }
  PublisherCheckSelectedCboxClick() { cy.xpath('//a[text()="reg pub"]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }

  // linked contract for label
  PublisherLinkedContractLabelType(text) { cy.xpath('//label[text()="Contract"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }
  PublisherContractLabelSelClick() { cy.xpath('//strong[text()="Gelo Test"]').should('be.visible').click().wait(2000); }
  PublisherLinkedContractLabelValidate(text) { cy.xpath('//label[text()="Contract"]/following::input[1]').should('have.value', text).should('be.visible').wait(2000); }
  // Linked contracts
  PublisherAddContractButtonClick() { cy.get('#CUR-HsRqENlo').should('be.visible').click(); }
  PublisherLinkedContractFieldType(text) { cy.xpath('//div[@id="CUR-xjPKJBxJ"]/following::input[@type="text"][1]').should('be.visible').click().wait(2000).clear().type(text); }
  PublisherLinkedContractsDeleteClick() { cy.xpath('//div[@id="CUR-xjPKJBxJ"]/following::i[@class="fa fa-trash"][1]').should('be.visible').click().wait(2000); }
  // Add Society
  PublisherAddSocClick() { cy.get('#CUR-TybPpuFN').should('be.visible').click().wait(2000); }
  PublisherSocietyDropdownClick() { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::span[@tabindex=-"1"][1]').should('be.visible').click().wait(2000); }
  PublisherSocietyDdType(text) { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::input[@type="search"][1]').click().clear().type(text); }
  PublisherSocietyDropdSelClick() { cy.xpath('//span[text()="ADDAF"]').should('be.visible').click().wait(2000); }
  PublisherIdentifierType(text) { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::input[@ng-model="identifier.identifier"]').should('be.visible').clear().type(text); }
  PublisherIdentifierName(text) { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::input[@ng-model="identifier.publisherName"]').should('be.visible').clear().type(text); }

  PublisherMechSocClick() { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::span[@tabindex=-"1"][2]').should('be.visible').click().wait(2000); }
  PublisherMechScoType(text) { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::input[@type="search"][2]').click().clear().type(text); }
  PublisherMechSocDropdSelClick() { cy.xpath('//span[text()="ABRAMUS"]').should('be.visible').click().wait(2000); }

  PublisherPerfSocDropdClick() { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::span[@tabindex=-"1"][3]').should('be.visible').click().wait(2000); }
  PublisherPerfSocType(text) { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::input[@type="search"][3]').click().clear().type(text); }
  PublisherPerfSocDropdSelClick() { cy.xpath('//span[text()="ADAGP"]').should('be.visible').click().wait(2000); }

  PublisherSyncSocDropdClick() { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::span[@tabindex=-"1"][4]').should('be.visible').click().wait(2000); }
  PublisherSyncSocType(text) { cy.xpath('//div[@id="CUR-rvuRLedr"]/following::input[@type="search"][4]').click().clear().type(text); }
  PublisherSyncSocDropdSelClick() { cy.xpath('//span[text()="AMUS"]').should('be.visible').click().wait(2000); }

  // Add Agreement
  PublisherAddAgreementButtonClick() { cy.get('#CUR-tFKUgIMN').should('be.visible').click().wait(2000); }
  PublisherAgreementFieldType(text) { cy.xpath('//label[text()="Publisher"]/following::input[@ng-model="getterSetter"][1]').should('be.visible').clear().type(text).wait(2000); }
  PublisherAgreementDropdSelcClick() { cy.xpath('//a[@title="test publisher"]').should('be.visible').click().wait(2000); }

  PublisherAgreementTypeDropdClick() { cy.xpath('//label[text()="Publisher"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PublisherAgreementTypeDropdSelGeneralClick() { cy.xpath('//span[text()="Subpublishing General"]').should('be.visible').click().wait(2000); }
  PublisherAgreementTypeDropdSelSpecificClick() { cy.xpath('//span[text()="Subpublishing Specific"]').should('be.visible').click().wait(2000); }

  PublisherTerritoryDropdClick() { cy.xpath('//label[text()="Publisher"]/following::span[@tabindex="-1"][2]').should('be.visible').click().wait(2000); }

  PublisherAgreementSocietyDropDClick() { cy.xpath('//label[text()="Publisher"]/following::span[@tabindex="-1"][3]').should('be.visible').click().wait(2000); }
  PublisherAgreementSocType(text) { cy.xpath('//label[text()="Publisher"]/following::input[@type="search"][3]').click().clear().type(text); }
  PublisherAgreeementSocSelClick() { cy.xpath('//span[text()="ANACIM"]').should('be.visible').click().wait(2000); }

  PublisherAgreementNoType(text) { cy.xpath('//input[@ng-model="agreement.agreementNo"]').should('be.visible').clear().type(text).wait(2000); }

  // Territory
  PublishetTerritoryTabClick() { cy.get('#CUR-nSEtkEbf').should('be.visible').click().wait(2000); }
  PublisherTerritoryHeaderValidate() { cy.get('#CUR-yWaCOWxW').should('be.visible'); }
  PublisherWorldCheckbClick() { cy.xpath('//input[@ng-change="selectOrDeselectWorld()"]').should('be.visible').click().wait(2000); }
  PublisherAfricaCboxClick() { cy.xpath('//input[@ng-model="continents.africa"]').should('be.visible').click().wait(2000); }
  PublisherAmericaCboxClick() { cy.xpath('//input[@ng-model="continents.americas"]').should('be.visible').click().wait(2000); }
  PublisherAsiaCboxClick() { cy.xpath('//input[@ng-model="continents.asia"]').should('be.visible').click().wait(2000); }
  PublisherEuropeCboxClick() { cy.xpath('//input[@ng-model="continents.europe"]').should('be.visible').click().wait(2000); }
  PublisherOceaniaCboxClick() { cy.xpath('//input[@ng-model="continents.oceania"]').should('be.visible').click().wait(2000); }

  // Export
  PublisherExportButtonClick() { cy.get('#CUR-qSMNNTsL').should('be.visible').click().wait(2000); }
  


  PublisherDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
  // synchronously ask for the body's text
  // and do something based on whether it includes
  // another string
    if ($body.text().includes('A Publisher Smoke')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-EYYXEMQS').contains('A Publisher Smoke').click().wait(2000);
      cy.get('#CUR-mvVYCWXR').click().wait(1000) // delete button
      cy.get('#CUR-LnaBreyR').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Publisher Smoke Update')) {
      cy.log('Found Duplicate Test Data')
      cy.get('#CUR-EYYXEMQS').contains('A Publisher Smoke Update').click().wait(2000);
      cy.get('#CUR-mvVYCWXR').click().wait(1000) // delete button
      cy.get('#CUR-LnaBreyR').click().wait(1000) // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Publisher Smoke', 'A Publisher Smoke Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  
  // Input on edit page (create data)
  PublishersCreateClick() { cy.get('#CUR-gzVjvyDf').click(); }
  PublishersNameType(text) { cy.get('#CUR-uwDhIFdL').clear().type(text); }
  PublishersForeignIDFieldType(text) { cy.get('#CUR-jBtFftsd').clear().type(text); }
  PublishersCAEFieldType(text) { cy.get('#CUR-YGFKkpxE').clear().type(text); }
  PublishersNotesType(text) { cy.get('#CUR-FQUAyOOe').type(text); }
  PublishersMainSocClick() { cy.xpath('//label[contains(text(),"Main Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersMainSocSelClick() { cy.xpath('//label[contains(text(),"Main Society")]/following::span[contains(text(),"PRS")][1]').click({ force: true }) }
  PublishersMainSocIdentifType(text) { cy.get('#CUR-qxmuYAKg').type(text); }
  PublishersMechSocClick() { cy.xpath('//label[contains(text(),"Mechanical Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersMecgSocSelClick() { cy.xpath('//span[contains(text(),"ASCAP")]').click({ force: true }) }
  PublishersMechSocIdentifType(text) { cy.get('#CUR-eFOUNyYv').type(text); }
  PublishersPerfSocClick() { cy.xpath('//label[contains(text(),"Performance Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersPerfSocSelClick() { cy.xpath('//span[contains(text(),"BMI")]').click({ force: true }); }
  PublishersPerfSocIdentifType(text) { cy.get('#CUR-kyQBlQUX').type(text); }
  PublishersSyncSocClickClick() { cy.xpath('//label[contains(text(),"Sync Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersSyncSocSelClick() { cy.xpath('//span[contains(text(),"SOCAN")]').click({ force: true }).wait(1000); }
  PublishersSyncSocIdentifType(text) { cy.get('#CUR-XmoSHHoD').type(text); }
  PublishersFilterButtonValidate() { cy.get('#CUR-HiCNhUSw').should('be.visible').click().wait(2000); }
  PublishersExportButtonValidate() { cy.get('#CUR-qSMNNTsL').should('be.visible'); }
  // Save and validate on edit page
  PublishersSaveButtonClick() { cy.get('#CUR-dWTsVAEi').click().wait(1000); }
  PublishersCopyButtonClick() { cy.get('#CUR-ucwjCVbP').should('be.visible').click().wait(2000); }
  PublishersValidateName(text) { cy.get('#CUR-uwDhIFdL').should('have.value', text); }
  PublishersForeignName(text) { cy.get('#CUR-jBtFftsd').should('have.value', text); }
  PublishersCAENumber(text) { cy.get('#CUR-YGFKkpxE').should('have.value', text); }
  // Validate data on index page
  PublishersLinkClick() { cy.get('#CUR-kftJkCAH').click().wait(2000); }
  PublishersCreatedValidate(text) { cy.get('#CUR-UBgtBBTg a').contains(text).should('be.visible'); }
  PublishersValidateCAE(text) { cy.get('#CUR-UBgtBBTg span').contains(text).should('be.visible'); }
  // update data on edit page
  PublishersCreatedPubClick(text) { cy.get('#CUR-UBgtBBTg a').contains(text).click().wait(2000); }
  // save and validate updated data on edit page
  // validate updayed data on index page
  // delete data
  PublishersDeleteCreatedClick() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').click({ force: true }).wait(1000); }
  PublishersDeleteButtonClick() { cy.get('#CUR-mvVYCWXR').click().wait(1000); }
  PublishersDeleteButtonModalClick() { cy.get('#CUR-LnaBreyR').click().wait(2000); }

  // Delete index
  PublishersDeleteButtonIndexClick() { cy.get('#CUR-cUnwntgQ').click().wait(2000); }
  PublisherDeleteSelectedIndexClick() { cy.get('#CUR-qukxgPfg').click().wait(2000); }
  PublishersDeleteButtonModalIndexClick() { cy.get('#CUR-CjxlqYCI').click().wait(2000); }

  // Import
  PublisherImportButtonClick() { cy.get('#CUR-cRnLChHq').should('be.visible').click().wait(2000); }
  PublisherImportModalClick() { cy.get('#CUR-dwTjiytw').click().wait(3000); }
  PublisherImportOverwriteBlankCboxClick() { cy.xpath('//input[@ng-model="overwriteBlanks"]').should('be.visible').click().wait(2000); }
  PublisherCAEEmptyValidate(text) { cy.get('#CUR-YGFKkpxE').contains(text).should('not.exist'); }

  // PERIODS TC
  StatementsMenuClick() { cy.get('#sidebar-statements > a').click({ force: true }).wait(2000); }
  PeriodSubmenuClick() { cy.get('#sidebar-periods > a').click().wait(2000); }
  StatementsCreatedClick(text) { cy.get('#CUR-dcGrXiyq').contains(text).should('be.visible').click().wait(2000); }
  StatementsCreatedNotExistValidate(text) { cy.get('#CUR-dcGrXiyq').contains(text).should('not.exist'); }



  StatementDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
  // synchronously ask for the body's text
  // and do something based on whether it includes
  // another string
    if ($body.text().includes('A Statement Smoke')) {
      cy.xpath('//a[contains(text(),"A Statement Smoke")]/../preceding-sibling::td/input').click({ force: true }).wait(2000);
      cy.get('#CUR-knYbtmzh').click().wait(1000); // delete button
      cy.get('#CUR-bsqGxjeL').click().wait(1000); // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Statement Smoke Update')) {
      cy.log('Found Duplicate Test Data');
      cy.xpath('//a[contains(text(),"A Statement Smoke Update")]/../preceding-sibling::td/input').click({ force: true }).wait(2000);
      cy.get('#CUR-knYbtmzh').click().wait(1000); // delete button
      cy.get('#CUR-bsqGxjeL').click().wait(1000); // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Period Test', 'A Period Test Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible').wait(5000);
    }
  }) }
  PeriodSearchDuplicateType(text) { cy.get('#CUR-GnwMOudf').should('be.visible').click().clear().type(text).type('{enter}').wait(5000); }
  PeriodSearchClear() { cy.get('#CUR-GnwMOudf').clear().type('{enter}').wait(2000); }

  PeriodDeleteDuplicateIfExist() { cy.get('body').then(($body) => {
  // synchronously ask for the body's text
  // and do something based on whether it includes
  // another string
    if ($body.text().includes('A Period Test')) {
      cy.xpath('//a[contains(text(),"A Period Test")]/../preceding-sibling::td/input').click({ force: true }).wait(2000);
      cy.get('#CUR-knYbtmzh').click().wait(1000); // delete button
      cy.get('#CUR-bsqGxjeL').click().wait(1000); // delete button in modal
      cy.wait(5000)

    } else if ($body.text().includes('A Period Test Update')) {
      cy.log('Found Duplicate Test Data');
      cy.xpath('//a[contains(text(),"A Period Test Update")]/../preceding-sibling::td/input').click({ force: true }).wait(2000);
      cy.get('#CUR-knYbtmzh').click().wait(1000); // delete button
      cy.get('#CUR-bsqGxjeL').click().wait(1000); // delete button in modal
      cy.wait(5000)

    } else if (!$body.text().includes('A Period Test', 'A Period Test Update')) {
      // nope not here
      cy.log('No Duplicate Files is visible').wait(5000);
    }
  }) }
  PeriodCreateClick() { cy.get('#CUR-gYxIZkCO').click({ force: true }).wait(1000); }
  // create page
  PeriodNameFieldType(text) { cy.xpath('//input[@type="text" and @ng-model="period.name"]').clear().type(text); }
  PeriodTypeDropdClick() { cy.xpath('//label[text()="Name"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PeriodTypeSelStandardEditClick() { cy.xpath('//label[text()="Name"]/following::span[@class="ui-select-choices-row-inner"][1]').should('be.visible').click().wait(2000); }
  PeriodTypeSelMechanicalEditClick() { cy.xpath('//label[text()="Name"]/following::span[@class="ui-select-choices-row-inner"][2]').should('be.visible').click().wait(2000); }
  PeriodTypeSelMCPSEditClick() { cy.xpath('//label[text()="Name"]/following::span[@class="ui-select-choices-row-inner"][3]').should('be.visible').click().wait(2000); }
  PeriodAccountingPeriodTypeDDClick() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@tabindex="-1"][1]').wait(1000).click(); }
  // LabelPeriodAccountingPeriodTypeDD() { cy.get(':nth-child(3) > .ui-select-container > .ui-select-match > .btn-default').wait(3000).click(); }
  // LabelPeriodAccountingPeriodTypeDDSelection1() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::div[@id="ui-select-choices-row-2-0"]').click({ force: true }); }
  PeriodAccountingPeriodTypeDDSelectionClick() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }).wait(1000); }
  PeriodAccountingPeriodTypeDDSelectionH1Click() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][2]').click({ force: true }).wait(1000); }
  PeriodAccountingPeriodTypeDDSelectionH2Click() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][3]').click({ force: true }).wait(1000); }
  PeriodYearClick() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000) }
  PeriodYearDDSelection() { cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][2]').click({ force: true }) }
  PeriodAccountingPeriodClick() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][2]').click().wait(1000) }
  // LabelPeriodAccountingPeriod() { cy.get('//label[contains(text(),"Year")]/following::span[contains(text(),"H1")]').click({ force: true }).wait(3000); }
  PeriodAccountingPeriodDDSelectionClick() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@class="ui-select-choices-row-inner"][2]').click().wait(2000); }
  // Start Date
  PeriodStartDateClick() { cy.xpath('//input[@is-open="startDatePopup"]').click().wait(1000); }
  PeriodStartDateType(text) { cy.xpath('//input[@is-open="startDatePopup"]').type(text); }
  // End Date
  PeriodEndDateClick() { cy.xpath('//input[@is-open="endDatePopup"]').click().wait(1000); }
  PeriodEndDateType(text) { cy.xpath('//input[@is-open="endDatePopup"]').type(text); }
  // Sales Date
  PeriodAccountingDateClick() { cy.xpath('//input[@is-open="accountingDatePopup"]').click().wait(1000); }
  PeriodAccountingDateType(text) { cy.xpath('//input[@is-open="accountingDatePopup"]').type(text); }
  PeriodNextButtonClick() { cy.xpath('//a[@ng-click="validateSetup()"]').click().wait(10000); }
  // Select Sales
  // LabelPeriodSelectAllRB1() { cy.xpath('//button[@ng-click="filterExcludedSales()"]/following::input[@ng-click="selectAll(excludedSalesFiles)"]').click(); }
  PeriodSelectAllRBClick() { cy.xpath('//input[@ng-click="selectAll(excludedSalesFiles)"]').click({ froce: true }); }
  LabelPeriodNextButton() { cy.xpath('//a[contains(text(),"Next")]').click().wait(3000); }
  PeriodIncludeSelectedClick() { cy.xpath('//button[@ng-click="includeSelectedSales()"]').click().wait(3000); }
  PeriodCalcClick() { cy.xpath('//a[contains(text(),"Calculate")]').click({ force: true }).wait(2000); }

  // Periods Download
  

  // Exchange Rates
  // From
  PeriodExchangeRatesFromDropdClick() { cy.xpath('//label[text()="From"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PeriodExchangeRatesFromDropdType(text) { cy.xpath('//label[text()="To"]/following::input[@type="search"][1]').should('be.visible').click().clear().type(text).wait(2000); }
  PeriodExhangeeRatesFromDropdSelClick() { cy.xpath('//span[text()="ARS"]').should('be.visible').click().wait(2000); }
  // To
  PeriodExchangeRatesToDropdClick() { cy.xpath('//label[text()="To"]/following::span[@tabindex="-1"][2]').should('be.visible').click().wait(2000); }
  PeriodExchangeRatesToDropdType(text) { cy.xpath('//label[text()="To"]/following::input[@type="search"][2]').should('be.visible').click().clear().type(text).wait(2000); }
  PeriodExhangeeRatesToDropdSelClick() { cy.xpath('//span[text()="Home Currency"]').should('be.visible').click().wait(2000); }
  // Rates
  PeriodExchangeRatesRateFieldType(text) { cy.xpath('//label[text()="To"]/following::input[@type="number"][1]').should('be.visible').click().clear().type(text).wait(2000); }
  PeriodsExchangeRatesDeleteClick() { cy.xpath('//label[text()="To"]/following::button[@class="btn btn-danger"][1]').should('be.visible').click().wait(2000); }
  PeriodsAddExchangeRateClick() { cy.xpath('//button[@ng-click="addExchangeRate()"]').should('be.visible').click().wait(2000); }
  // Next Button
  PeriodEditLinkClick() { cy.get('#CUR-NnIVQcah').should('be.visible').click().wait(2000); }
  PeriodsEditLinkClick() { cy.get('#CUR-SJoHJluH').should('be.visible').click().wait(2000); }
  ScrollToTop() { cy.scrollTo('top'); }
  ScrollToBottom() { cy.scrollTo('Bottom'); }

  // Included sales
  PeriodIncludedSalesTableValidate(text) { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::div[@class="table-responsive overflow-x-hidden"][1]').contains(text).should('be.visible'); }
  PeriodExcludedSalesTableValidate(text) { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::div[@class="table-responsive overflow-x-hidden"][2]').contains(text).should('be.visible'); }
  PeriodIncludedSalesTableNotExistValidate(text) { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::div[@class="table-responsive overflow-x-hidden"][1]').contains(text).should('not.exist'); }
  PeriodExcludedSalesTableNotExistValidate(text) { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::div[@class="table-responsive overflow-x-hidden"][2]').contains(text).should('not.exist'); }
  PeriodIncludedSalesBackButtonValidate() { cy.xpath('//a[@class="btn btn-default pull-right"]').should('be.visible'); }
  PeriodIncludedSalesCurrentPageValidation() { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::span[@class="ng-binding current"][1]').should('be.visible'); }
  PeriodIncludedSalesNextPaginationClick() { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::span[@aria-label="Next"][1]').should('be.visible').click().wait(2000); }
  PeriodIncludedSalesPreviousPaginationClick() { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::span[@aria-label="Previous"][1]').should('be.visible').click().wait(2000); }
  PeriodIncludedSelectedExcludeSelectedButtonClick() { cy.xpath('//button[@ng-click="excludeSelectedSales()"]').should('be.visible').click().wait(2000); }
  PeriodIncludedSelectedExcludeAllButtonClick() { cy.xpath('//button[@ng-click="excludeAllSales()"]').should('be.visible').click().wait(2000); }
  PeriodIncludedSalesAllCheckbox() { cy.xpath('//input[@ng-click="selectAll(includedSalesFiles)"]').should('be.visible').click().wait(2000); }
  
  
  // Excluded
  PeriodIncludeFilteredButtonClick() { cy.xpath('//button[@ng-click="includeFilteredSales()"]').should('be.visible').click().wait(5000); }
  PeriodExcludedSalesCurrentPageValidation() { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::span[@class="ng-binding current"][2]').should('be.visible'); }
  PeriodeXcludedSalesNextPaginationClick() { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::span[@aria-label="Next"][2]').should('be.visible').click().wait(2000); }
  PeriodExcludedSalesPreviousPaginationClick() { cy.xpath('//a[@id="CUR-sgGdwIvJ"]/following::span[@aria-label="Previous"][2]').should('be.visible').click().wait(2000); }
  PeriodExcludedNameType(text) { cy.xpath('//label[text()="Name"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }
  PeriodExcludedTargetPeriod(text) { cy.xpath('//input[@ng-model="salesFilter.targetPeriod"]').should('be.visible').clear().type(text).wait(2000); }
  PeriodExcludedCostTargetPeriod(text) { cy.xpath('//input[@ng-model="costsFilter.targetPeriod"]').should('be.visible').clear().type(text).wait(2000); }
  PeriodExcludedReportedDropdClick() { cy.xpath('//label[text()="Reported"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PeriodExcludedReportedDropdSelCompleteClick() { cy.xpath('//span[text()="Complete"]').should('be.visible').click().wait(2000); }
  PeriodExcludedReportedDropdSelPartiallyCompleteClick() { cy.xpath('//span[text()="Partially Complete"]').should('be.visible').click().wait(2000); }
  PeriodExcludedReportedDropdSelUnreportedClick() { cy.xpath('//span[text()="Unreported"]').should('be.visible').click().wait(2000); }
  PeriodExcludedTargetPeriodCostsType(text) { cy.xpath('//input[@ng-model="costsFilter.targetPeriod"]').should('be.visible').clear().type(text).wait(2000); }
  
  // Created After
  PeriodExcludedCreatedAfterType(text) { cy.xpath('//label[text()="Created after"]/following::input[@type="text"][1]').should('be.visible').clear().type(text).wait(2000); }
  PeriodExcludedCreatedBeforeType(text) { cy.xpath('//label[text()="Created after"]/following::input[@type="text"][2]').should('be.visible').clear().type(text).wait(2000); }
  PeriodArchivedDropdClick() { cy.xpath('//label[text()="Archived"]/following::span[1]').should('be.visible').click().wait(2000); }
  PeriodArchivedDropdSelArchievedClick() { cy.xpath('//label[text()="Archived"]/following::span[text()="Archived"]').should('be.visible').click().wait(2000); }
  PeriodArchivedDropdSelUnarchievedClick() { cy.xpath('//label[text()="Archived"]/following::span[text()="Unarchived"]').should('be.visible').click().wait(2000); }
  PeriodsIncludedFilterButtonClick() { cy.xpath('//button[@ng-click="filterExcludedSales()"]').should('be.visible').click().wait(5000); }
  PeriodArchivedDropdSelArchievedSelectedClick() { cy.xpath('//span[@id="CUR-DItnnxMW"]/following::a[@ng-click="archiveSelectedSalesFiles()"]').should('be.visible').click().wait(1000); }
  // Error Required field validation
  PeriodsRequiredFieldsValidate(text) { cy.xpath('//div[@role="alert"]').contains(text).should('be.visible'); }
  // 
  // for Label Client
  // 
  // Select Sales
  // Select Cost
  LabelPeriodSelectedClick() { cy.xpath('//button[@ng-click="filterExcludedCosts()"]/following::input[@id="cost-select-"][1]').click({ force: true }); }
  LabelPeriodIncludeSelectedClick() { cy.xpath('//button[@class="btn btn-success pull-right ng-scope"]').click({ force: true }).wait(10000); }
  PeriodsCostsIncludedCostsHeaderValidate(text) { cy.xpath('//div[@class="panel panel-default"]').contains(text).should('be.visible'); }
  PeriodsCostsExcludeSelectedButtonClick() { cy.xpath('//button[@ng-click="excludeSelectedCosts()"]').should('be.visible').click().wait(2000); }
  PeriodsCostsExcludeAllButtonClick() { cy.xpath('//button[@ng-click="excludeAllCosts()"]').should('be.visible').click().wait(2000); }
  PeriodCostIncludedExcludeSelected() { cy.xpath('//button[@ng-click="excludeSelectedCosts()"]').should('be.visible').click().wait(2000); }
  PeriodCostExcludeCheckAllcboxClick() { cy.xpath('//input[@ng-click="selectAll(excludedCosts)"]').should('be.visible').click().wait(2000); }
  PeriodCostFilterButtonClick() { cy.xpath('//button[@ng-click="filterExcludedCosts()"]').should('be.visible').click().wait(2000); }
  PeriodCostIncludedCheckboxAllClick() { cy.xpath('//input[@ng-click="selectAll(includedCosts)"]').should('be.visible').click().wait(2000); }
  // cost excluded
  PeriodCostExcludedIncludeSelectedClick() { cy.xpath('//button[@ng-click="includeSelectedCosts()"]').should('be.visible').click().wait(2000); }
  PeriodCostExcludeIncludeFilteredClick() { cy.xpath('//button[@ng-click="includeFilteredCosts()"]').should('be.visible').click().wait(2000); } 
  
  // Index
  PeriodsIndexStatusSetupValidate() { cy.xpath('//a[text()="A Period Test"]/following::span[text()="Setup"]').should('be.visible'); }
  // Created periods validation
  PeriodsCreatedValidation(text) { cy.xpath('//div[@class="panel-title"]').contains(text).should('be.visible'); }
  PeriodsChannelsHeaderValidate() { cy.xpath('//div[@class="panel-title" and contains(text(),"Channels")]').should('be.visible'); }
  PeriodsOverviewTabClick() { cy.get('#CUR-MqlpPueK').should('be.visible').click().wait(2000); }
  PeriodsIncludedSalesTabClick() { cy.get('#CUR-rDOeIwcX').should('be.visible').click().wait(2000); }
  PeriodsIncludedCostsTabClick() { cy.get('#CUR-MSynfZHR').should('be.visible').click().wait(2000); }
  PeriodsSalesTabClick() { cy.get('#CUR-zuUobHLT').should('be.visible').click().wait(2000); }
  PeriodsStatementsTabClick() { cy.get('#CUR-yJluSXBB').should('be.visible').click().wait(2000); }
  PeriodsIncomeTabClick() { cy.get('#CUR-tbyCIePR').should('be.visible').click().wait(2000); }
  PeriodIncludeIncomeTabClick() { cy.get('#CUR-DItnnxMW').should('be.visible').click().wait(2000); }
  PeriodsIncludedIncomeSalesSampleCheckbClick() { cy.xpath('//a[contains(text(),"Sales Sample")]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  PeriodsIncludedIncomeSalesSampleCheckbLabelClick() { cy.xpath('//a[contains(text(),"Sales Test Single Tab")]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  PeriodsStatementsTestGelo9CboxClick() { cy.xpath('//a[contains(text(),"Test Gelo 9")]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  PeriodsStatementCheckAllClick() { cy.xpath('//a[@id="CUR-yJluSXBB"]/following::input[@class="select-all"][3]').should('be.visible').click().wait(2000); }
  // QA Report Tab
  PeriodQAReportTabClick() { cy.get('#CUR-oNisoaLx').should('be.visible').click().wait(2000); }
  PeriodsFullCompleteHeaderValidate() { cy.xpath('//span[@id="CUR-fAlYCvRl"]/following::span[@class="ng-binding"][1]').should('be.visible'); }
  PeriodsInitialCompleteHeaderValidate() { cy.xpath('//span[@id="CUR-fAlYCvRl"]/following::span[@class="ng-binding"][2]').should('be.visible'); }
  PeriodsFullCompleteLastRunValidate() { cy.xpath('//span[@id="CUR-fAlYCvRl"]/following::p[@id="CUR-SjOWeYDG"][1]').should('be.visible'); }
  PeriodsInitialCompleteLastRunValidate() { cy.xpath('//span[@id="CUR-fAlYCvRl"]/following::p[@id="CUR-SjOWeYDG"][2]').should('be.visible'); }
  PeriodsQAReportBoxValidate(text) { cy.xpath('//span[@id="CUR-fAlYCvRl"]/following::pre[@class="ng-binding"][1]').contains(text).should('be.visible'); }
  PeriodsReporcessFullButtonClick() { cy.get('#CUR-gObgfhMC').should('be.visible').click().wait(2000); }
  PeriodFullPeriodRecalculationFieldType() { cy.xpath('//input[@ng-change="validationFeedback()"]').should('be.visible').type('Force Full').wait(2000); }
  PeriodReprocessFullClick() { cy.xpath('//button[@ng-click="runMethod()"]').should('be.visible').click().wait(2000); }

  // Period Included Sales Tab Page
  PeriodIncludedSalesValidate(text) { cy.get('#CUR-YwPFHlUg').contains(text).should('be.visible'); }
  PeriodIncludedExportButtonValidate() { cy.get('#CUR-btvxAeyL').should('be.visible'); }
  PeriodIncludedExportButtonClick() { cy.get('#CUR-btvxAeyL').should('be.visible').click().wait(2000); }
  PeriodIncludedArchiveDropdClick() { cy.get('#CUR-uzFFKzsl').should('be.visible').click().wait(2000); }
  PeriodIncludedArchivedDropdSelArhiveClick() { cy.get('#CUR-YTIljyoV').should('be.visible').click().wait(2000); }
  PeriodIncludedArchivedDropdSelArhiveFullyClick() { cy.get('#CUR-lnVadsIC').should('be.visible').click().wait(2000); }
  PeriodIncludedArchivedDropdSelSelectedClick() { cy.get('#CUR-PkzIxuuq').should('be.visible').click().wait(2000); }

  // Included Costs
  PeriodIncludedCostsTableValidate(text) { cy.get('#CUR-cnpEkuUe').contains(text).should('be.visible'); }
  PeriodIncludedCostsExportValidate() { cy.get('#CUR-YKvTIiWH').should('be.visible'); }
  PeriodIncludedCostsExportClick() { cy.get('#CUR-YKvTIiWH').should('be.visible').click().wait(2000); }
  PeriodIncludedCostsArchiveDropdValidate() { cy.get('#CUR-PrvlDakM').should('be.visible'); }
  PeriodIncludedCostsArchiveDropdClick() { cy.get('#CUR-PrvlDakM').should('be.visible').click().wait(2000); }
  PeriodIncludedCostsReportedValidate() { cy.xpath('//span[@id="CUR-jNUEATzr"]/following::th[@class="hidden-xs sorting" and @role="button"][9]').should('be.visible'); }
  PeriodIncludedCostsCheckAllCheckbClick() { cy.get('#CUR-UcIvgamd').should('be.visible').click().wait(2000); }
  PeriodsIncludedCostBRISampleCheckbLabelClick() { cy.xpath('//a[contains(text(),"Cost Search test BR1209")]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  PeriodsCostsArchiveSelectedDropdSelClick() { cy.get('#CUR-ZrYBPpTT').should('be.visible').click().wait(2000); }
  
  // Statement Tab
  PeriodCreateStatementButtonClick() { cy.get('#CUR-FYPxzvoA').should('be.visible').click().wait(5000); }
  PeriodStatementContractFieldType(text) { cy.xpath('//h5[@id="CUR-nkWQDGPh"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }
  PeriodsStatementCreateButtonClick() { cy.get('#CUR-nqObrHgU').should('be.visible').click().wait(2000); }
  PeriodsStatementPaySelectedValidate() { cy.get('#CUR-bPEhsWSX').should('be.visible'); }
  PeriodsStatementPaySelectedClick() { cy.get('#CUR-bPEhsWSX').should('be.visible').click().wait(2000); }
  PeriodsStatementExportValidate() { cy.get('#CUR-LXqxGZsA').should('be.visible'); }
  PeriodsStatementExportClick() { cy.get('#CUR-LXqxGZsA').should('be.visible').click().wait(2000); }
  PeriodsStatementSendDropdClick() { cy.get('#CUR-QbmPlnpc').should('be.visible').click().wait(2000); }
  PeriodsSendAllValidate() { cy.get('#CUR-yBgrYEyW').should('be.visible'); }
  PeriodsSendSelectedValidate() { cy.get('#CUR-mnaICYQj').should('be.visible').click().wait(2000); }
  PeriodsPublishDropdClick() { cy.get('#CUR-SjKQzqKl').should('be.visible').click().wait(2000); }
  PeriodsPublishAllClick() { cy.get('#CUR-NNlNGVFw').should('be.visible'); }
  PeriodsPublisSelectedClick() { cy.get('#CUR-vLhYpxJE').should('be.visible'); }
  PeriodsPublishUnpublishAllClick() { cy.get('#CUR-gGdEwhma').should('be.visible'); }
  PeriodsPublishUnpublishSelectedClick() { cy.get('#CUR-vVykeHfy').should('be.visible'); }
  PeriodsStatementShowAllValidate() { cy.get('#CUR-qWrgBSAV').should('be.visible'); }
  PeriodsShowing100PerPageValidate() { cy.get('#CUR-nhiLcxYB').should('be.visible'); }
  PeriodsStatementCancelModalButtonClick() { cy.get('#CUR-bSVAXMgs').should('be.visible').click().wait(2000); }

  // Reprocess
  PeriodsReprocessButtonClick() { cy.get('#CUR-pgvxbjUc').should('be.visible').click().wait(2000); }
  PeriodsReprocessModalClick() { cy.xpath('//h5[@id="CUR-wJIaToYh"]/following::button[@id="CUR-KuOgSWJo" and @ng-click="runCalculation()"]').should('be.visible').click().wait(2000); }

  // Statement processing loading page
  StatementPeriodProcessingLoad(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Statement is processing')
      cy.xpath('//h3[@id="CUR-uHpAwhNk"]').contains(status).should('be.visible').wait(60000);

    } else {
      cy.log('All elements are completed');
      
    }
  }) } 
  // wait until loading gets finished
  PeriodsPeriodProcessingReprocess(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Period is processing')
      cy.xpath('//h3[@id="CUR-AkesVxMP"]').contains(status).should('be.visible').wait(60000);
      cy.get('#CUR-cxqkIWfA').click().wait(2000);
      cy.get('#CUR-FpasAYSv a').contains('zzz Locked').should('be.visible').click().wait(2000); 

    } else {
      cy.log('All elements are completed');
      
    }
  }) } 
  
  // wait until loading gets finished
  PeriodsPeriodProcessingLoad(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Period is processing')
      cy.xpath('//h3[@id="CUR-AkesVxMP"]').contains(status).should('be.visible').wait(60000);
      cy.get('#CUR-cxqkIWfA').click().wait(2000);
      cy.get('#CUR-FpasAYSv a').contains('A Period Test').should('be.visible').click().wait(2000); 

    } else {
      cy.log('All elements are completed');
      
    }
  }) } 


  // wait until loading gets finished
  StatementsPeriodProcessingLoad(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Period is processing')
      cy.xpath('//h3[@id="CUR-AkesVxMP"]').contains(status).should('be.visible').wait(60000);
      cy.get('#CUR-cxqkIWfA').click().wait(2000);
      cy.get('#CUR-FpasAYSv a').contains('A Statement Smoke').should('be.visible').click().wait(2000);
    } else {
      cy.log('All elements are completed');
      
    }
  }) } 

  // validate created data on index page
  PeriodOutsideClick() { cy.get('#CUR-juUorLcH').click(); }
  PeriodCreatedNameValidate(text) { cy.get('#CUR-FpasAYSv a').contains(text).should('be.visible'); }
  PeriodTableCreatedValidate(text) { cy.get('#CUR-FpasAYSv td').contains(text).first().should('be.visible'); }
  
  // validate created data on period page
  PeriodClickCreated(text) { cy.get('#CUR-FpasAYSv a').contains(text).click().wait(6000); }
  // Insert conditional statement here

  StatementsPeriodProcessing(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Period is processing')
      cy.xpath('//span[@class="complete ng-binding ng-scope"]').contains(status).should('be.visible').wait(1000);
    } else {
      cy.log('Wait all elements to complete').wait(30000)
      
    }
  }) } 
  // LabelPeriodWaitAfterClick() { cy.get('#CUR-AkesVxMP'); }
  PeriodGrossRevenueValidate() { cy.get('#CUR-ZJRXUPwP').contains('Gross Revenue').should('be.visible'); }
  PeriodNetPayoutValidate() { cy.get('#CUR-dseIvKpY').contains('Net Payout').should('be.visible'); }
  PeriodInputUnitsValidate() { cy.get('#CUR-tTpIJdmf').contains('Input Units').should('be.visible'); }

  // Download Function
  PeriodsDownloadDropdClick() { cy.get('#CUR-uFAfLJsO').should('be.visible').click().wait(2000); }
  // publisher
  PeriodsDownloadDropdSelAllStatementsClick() { cy.get('#CUR-UlKnYCNc').should('be.visible').click().wait(2000); }
  PeriodsDownloadDropdSelAllIncomeClick() { cy.get('#CUR-EGgtHwwq').should('be.visible').click().wait(2000); }
  PeriodsDownloadDropdSelUnreportedSalesClick() { cy.get('#CUR-WzVVAkpV').should('be.visible') }
  PeriodsDownloadDropdSelSuspenseReportClick() { cy.get('#CUR-VKaOrVQn').should('be.visible') }

  // Label
  PeriodDownloadDropsSelAllSalesClick() { cy.get('#CUR-TmGuJmiN').should('be.visible').click().wait(2000); }
  PeriodDownloadDropsSelAllCostsClick() { cy.get('#CUR-qknMiLUU').should('be.visible').click().wait(2000); }
  PeriodDownloadDropsSelUnreportedSalesValidate() { cy.get('#CUR-WzVVAkpV').should('be.visible'); }
  PeriodDownloadDropsSelUnreportedCostsValidate() { cy.get('#CUR-WlLltKaq').should('be.visible'); }






  //
  // for label valiadtion
  //
  LabelPeriodGrossRevenueValidate() { cy.get('#CUR-tXTGsrcQ').contains('Gross Revenue >').should('be.visible'); }
  LabelPeriodNetPayoutValidate() { cy.get('#CUR-bxPoRhTC').contains('Net Payout >').should('be.visible'); }
  LabelPeriodGrossCrostValidate() { cy.get('#CUR-XHVnixfn').contains('Gross Costs >').should('be.visible'); }
  LabelPeriodRechargedCostsValidate() { cy.get('#CUR-hSDHlghB').contains('Recharged Costs >').should('be.visible'); }
  LabelPeriodInputUnitsValidate() { cy.get('#CUR-XjZWWqsL').contains('Input Units >').should('be.visible'); }
  LabelPeriodInputSalesLinesValidate() { cy.get('#CUR-RYQoItzw').contains('Input Sales Lines >').should('be.visible'); }
  PeriodsUnlockButtonClick() { cy.get('#CUR-GMSFKLBa').should('be.visible').click().wait(2000); }
  PeriodUnlockPeriodModalClick() { cy.get('#CUR-DIutUqyX').should('be.visible').click().wait(5000); }
  PeriodLockPeriodClick() { cy.get('#CUR-xsDHVljW').should('be.visible').click().wait(2000); }
  
  // update on edit page period
  PeriodEditClick() { cy.get('#CUR-HLUNTSif').click().wait(5000); }
  // validate updated data on period page
  PeriodCreatedClick(text) { cy.get('#CUR-iXFdMjLD a').contains(text).first().click().wait(2000); }
  PeriodHeaderValidate() { cy.get('#CUR-TRIZDfAQ').should('be.visible'); }
  // validate updated data on index page
  PeriodsLinkClick() { cy.get('#CUR-cxqkIWfA').click().wait(3000); }
  PeriodValidateStatus(text) { cy.get('#CUR-FpasAYSv span').contains(text).should('be.visible'); }
  // delete data

  PeriodDeleteSmokeTestDataCheckBClick() { cy.xpath('//a[contains(text(),"A Period Test")]/../preceding-sibling::td/input').should('be.visible').click().wait(2000); }
  PeriodDeleteClickCreated() { cy.get('#period-select-0').check().wait(2000); }
  PeriodDeleteButtonClick() { cy.get('#CUR-knYbtmzh').click().wait(2000); }
  PeriodDeleteModalClick() { cy.get('#CUR-bsqGxjeL').click({ force: true }).wait(5000); }

  // Period Index
  PeriodSearchFilterButtonClick() { cy.get('#CUR-TxFFYZkq').should('be.visible').click().wait(2000); }
  PeriodFilterButtonClick() { cy.get('#CUR-jhJPPLlZ').should('be.visible').click().wait(2000); }
  PeriodLinkIndexValidate() { cy.get('#CUR-XPIXmeoM').should('be.visible'); }
  PeriodDeleteButtonValidate() { cy.get('#CUR-knYbtmzh').should('be.visible'); }
  PeriodCreateButtonValidate() { cy.get('#CUR-gYxIZkCO').should('be.visible'); }
  PeriodAccountingPeriodIndexClick() { cy.xpath('//label[@id="CUR-SnOKuwaC"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PeriodAccountingPeriodIndexType(text) { cy.xpath('//label[@id="CUR-SnOKuwaC"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  PeriodAccountingPeriodIndexSelClick() { cy.xpath('//div[text()="Y1"]').should('be.visible').click().wait(2000); }
  PeriodAccountingPeriodIndexSelh1Click() { cy.xpath('//div[text()="H1"]').should('be.visible').click().wait(2000); }
  PeriodYearIndexDropdClick() { cy.xpath('//label[@id="CUR-wfCMkfKT"]/following::span[1]').should('be.visible').click().wait(2000); }
  PeriodYearIndexDropdType(text) { cy.xpath('//label[@id="CUR-wfCMkfKT"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  PeriodYearSelClick() { cy.xpath('//div[text()="2023"]').should('be.visible').click().wait(2000); }
  PeriodTypeIndexDropdClick() { cy.xpath('//label[@id="CUR-tGQIKFhQ"]/following::span[1]').should('be.visible').click().wait(2000); }
  PeriodTypeIndexDropdType(text) { cy.xpath('//label[@id="CUR-tGQIKFhQ"]/following::input[1]').should('be.visible').type(text).wait(2000); }
  PeriodTypeSelStandardClick() { cy.xpath('//div[text()="Standard"]').should('be.visible').click().wait(2000); }
  PeriodTypeSelMechanicalClick() { cy.xpath('//div[text()="Mechanical"]').should('be.visible').click().wait(2000); }
  PeriodTypeSelMCPSClick() { cy.xpath('//div[text()="MCPS"]').should('be.visible').click().wait(2000); }
  PeriodsCheckboxAllClick() { cy.get('#CUR-ygEYzrHP').should('be.visible').click().wait(2000); }
  PeriodsTableHeadersValidate(text) { cy.get('#CUR-epoSWqSv').contains(text).should('be.visible').should('be.visible'); }
  PeriodsShowing25PerPageValidate() { cy.get('#CUR-gFGgldQd').should('be.visible'); }
  PeriodsShowAllValidate() { cy.get('#CUR-iavAzfbC').should('be.visible'); }
  PeriodsTotalValidate() { cy.get('#CUR-nSpuSgTb').should('be.visible'); }
  PeriodsIncomTabTotalValidate() { cy.get('#CUR-YWftyBgd').should('be.visible'); }

  // Sales Tab
  PeriodsSalesReleaseField(text) { cy.xpath('//label[@id="CUR-TmZuNete"]/following::input[@type="search"][1]').should('be.visible').clear().type(text).wait(2000); }
  PeriodsSalesTracksField(text) { cy.xpath('//label[@id="CUR-TmZuNete"]/following::input[@type="search"][2]').should('be.visible').clear().type(text).wait(2000); }
  PeriodsSalesTracksSelClick() { cy.xpath('//span[text()="ISRC001 - T1"]').should('be.visible').click().wait(2000); }
  PeriodsSalesCatTypeDropdClick() { cy.xpath('//label[@id="CUR-TmZuNete"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  PeriodsSalesCatTypeDropdSelReleaseClick() { cy.xpath('//span[@id="CUR-fzZIssZc" and text()="Release"]').should('be.visible').click().wait(2000); }
  PeriodsSalesCatTypeDropdSelTrackClick() { cy.xpath('//span[@id="CUR-fzZIssZc" and text()="Track"]').should('be.visible').click().wait(2000); }
  PeriodsSalesCatTypeDropdSelContractClick() { cy.xpath('//span[@id="CUR-fzZIssZc" and text()="Contract"]').should('be.visible').click().wait(2000); }
  PeriodsSalesChannelDropdClick() { cy.xpath('//label[@id="CUR-OcYHXNKr"]/following::input[@type="search"][1]').should('be.visible').click().wait(2000); }
  PeriodsSalesChannelDropdSelPhysClick() { cy.xpath('//label[@id="CUR-OcYHXNKr"]/following::span[contains(text(),"Physical")]').should('be.visible').click().wait(2000); }
  PeriodsSalesChannelDropdSelClick() { cy.xpath('//label[@id="CUR-OcYHXNKr"]/following::span[contains(text(),"Digital")]').should('be.visible').click().wait(2000); }
  PeriodsSalesConfigurationDropDClick() { cy.xpath('//label[@id="CUR-dplszBzR"]/following::input[@type="search"][1]').should('be.visible').click().wait(2000); }
  PeriodsSalesConfigDropdSelClick() { cy.xpath('//label[@id="CUR-OcYHXNKr"]/following::span[contains(text(),"CD")]').should('be.visible').click().wait(2000); }
  PeriodsSalesConfigDropdSelTVClick() { cy.xpath('//label[@id="CUR-OcYHXNKr"]/following::span[contains(text(),"Television")]').should('be.visible').click().wait(2000); }
  PeriodsSalesTerritoryDropdClick() { cy.xpath('//label[@id="CUR-KfupYEGS"]/following::input[@type="search"][1]').should('be.visible').click().wait(2000); }
  PeriodsSalesTerritoryDropdSelClick() { cy.xpath('//span[@id="CUR-neqBNSAR" and contains(text(),"World")]').should('be.visible').click().wait(2000); }
  PeriodsSourceFieldType(text) { cy.get('#CUR-vALiwPOD').should('be.visible').clear().type(text).wait(2000); }
  PeriodsSubSourceFieldType(text) { cy.get('#CUR-YVZVNUjg').should('be.visible').clear().type(text).wait(2000); }
  PeriodsSalesFilterButtonClick() { cy.get('#CUR-qvqmkuKn').should('be.visible').click().wait(2000); }
  PeriodsSalesTotalValidate() { cy.get('#CUR-YWftyBgd').should('be.visible').click().wait(2000); }
  PeriodsTableHeaderValidate(text) { cy.get('#CUR-bXUsftEO').contains(text).should('be.visible'); }
  PeriodsCreatedStatementClick(text) { cy.get('#CUR-bXUsftEO').contains(text).should('be.visible').click().wait(5000); }

  
  PeriodsSalesHeaderValidate(text) { cy.get('#CUR-XZfSvlqr').contains(text).should('be.visible'); }
  PeriodsSalesHeaderNotExistValidate(text) { cy.get('#CUR-XZfSvlqr').contains(text).should('not.exist'); }
  PeriodsTrackCloseSelectedClick() { cy.xpath('//label[@id="CUR-wuKyfhli"]/following::span[@ng-hide="$select.disabled"]').should('be.visible').click().wait(2000); }

  // Income Tab
  PeriodsIncomeWorkFieldType(text) { cy.xpath('//label[@id="CUR-npHtmIpl"]/following::input[@type="search"][1]').should('be.visible').clear().type(text).wait(2000); }
  // 
  // Statements TC
  //
  StatementsSubMenuClick() { cy.get('#sidebar-statements-submenu > a').click().wait(2000); }
  // index page validation
  StatementsSearchBarValidate() { cy.get('#CUR-WBKJWKoQ').should('be.visible'); }
  StatementsPeriodDDType(text) { cy.xpath('//label[@id="CUR-cRIQfQMq"]/following::span[@tabindex="-1"][1]').should('be.visible').type(text).wait(2000); }
  StatementsPeriodDDSelClick() { cy.xpath('//label[@id="CUR-cRIQfQMq"]/following::div[@id="CUR-TiSQWTUm"][1]').click().wait(2000); }
  StatementsPeriodDDValidate() { cy.xpath('//label[@id="CUR-cRIQfQMq"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  StatementsTypeDDValidate() { cy.xpath('//label[@id="CUR-MQMEexwv"]/following::span[@tabindex="-1"]').should('be.visible'); }
  StatementsFilterValidate() { cy.get('#CUR-NsfLNPuP').should('be.visible'); }
  StatementsFilterClick() { cy.get('#CUR-NsfLNPuP').should('be.visible').click().wait(2000); }
  StatementsTableHeaderValidate(text) { cy.get('#CUR-YxdjgveE th').contains(text).should('be.visible'); }
  StatementsContractField(text) { cy.xpath('//label[@id="CUR-zjAnqLqN"]/following::input[1]').should('be.visible').clear().type(text).wait(2000); }

  StatementsTypeDDClick() { cy.xpath('//label[@id="CUR-MQMEexwv"]/following::span[@tabindex="-1"]').should('be.visible').click().wait(2000); }
  StatementsTypeDdSelMechValidate() { cy.xpath('//div[text()="Mechanical"]').should('be.visible'); }
  StatementsTypeDdSelStandardValidate() { cy.xpath('//div[text()="Standard"]').should('be.visible'); }
  StatementsTypeDdSelMechClick() { cy.xpath('//div[text()="Mechanical"]').should('be.visible').click().wait(2000); }
  StatementsTypeDdSelStandardClick() { cy.xpath('//div[text()="Standard"]').should('be.visible').click().wait(2000); }

  StatementsShowingPerPageValidate() { cy.get('#CUR-HferKigm').should('be.visible'); }
  StatementsShowAllLinkValidate() { cy.get('#CUR-BneZSGMe').should('be.visible'); }
  StatementsTotalValidate() { cy.get('#CUR-CtXcbdVb').should('be.visible'); }
  // create statement via period
  StatementsAccountingPeriodTypeDD() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@tabindex="-1"][1]').click().wait(3000); }
  StatementsAccountingPeriodTypeDDSelection() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  StatementsAccountPeriodTypeDDSelClick() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][4]').click(); }
  StatementsYear() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(3000) }
  StatementsYearDDSelectionClick() { cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  StatementsAccountingPeriod() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][2]').click(); }
  StatementsAccountingPeriodDDType() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  // date picker
  StatementsStartDateType() { cy.xpath('//input[@is-open="startDatePopup"]').click({ force: true }).clear().type('01/07/2022'); }
  StatementsEndDateType() { cy.xpath('//input[@is-open="endDatePopup"]').click({ force: true }).clear().type('31/12/2022'); }
  StatementsAccountingDateType() { cy.xpath('//input[@is-open="accountingDatePopup"]').click({ force: true }).clear().type('31/12/2022'); }
  StatementsNextButton() { cy.xpath('//a[contains(text(),"Next")]').click({ force: true }).wait(25000); }
  // selecting sales
  StatementCheckAllCB() { cy.xpath('//input[@ng-click="selectAll(excludedSalesFiles)"]').click({ force: true }).wait(2000); }
  StatementsIncludeSelected() { cy.xpath('//button[@ng-click="includeSelectedSales()"]').click().wait(3000); }
  StatementsNextButton1() { cy.xpath('//a[contains(text(),"Next")]').click().wait(3000); }
  // Select Cost
  StatementsClickSelected() { cy.xpath('//button[@ng-click="filterExcludedCosts()"]/following::input[@id="cost-select-"][1]').click({ force: true }); }
  StatementsIncludeSelected1() { cy.get('.btn-success').click().wait(10000); }
  StatementsCalculate() { cy.xpath('//a[contains(text(),"Calculate")]').click().wait(10000); }
  
  // validate statement in period
  StatementsPeriodCreatedClick(text) { cy.get('#CUR-ilajBlTY a').contains(text).click().wait(5000); }
  StatementsTabLinkClick() { cy.get('#CUR-wkHjTyNE').click().wait(2000); }
  StatementsValidateExisting(text) { cy.get('#CUR-IxnzJpGe a').contains(text).should('be.visible'); }
  // validate statement index page
  StatementsSearchBarType(text) { cy.get('#CUR-WBKJWKoQ').clear().type(text).type('{enter}').wait(2000); }
  StatementsSearchIconClick() { cy.get('#CUR-bzBwwprg').click().wait(1000); }
  StatementsValidateCreated(text) { cy.get('#CUR-bkUowpSN a').contains(text).should('be.visible'); }
  // add statement on period
  StatementsStatementsTabClick() { cy.get('#CUR-yJluSXBB').click().wait(1000); }
  StatementsCreateStatementsClick() { cy.get('#CUR-FYPxzvoA').click().wait(2000); }
  StatementsContract(text) { cy.xpath('//input[@ng-model="getterSetter"]').clear().type(text).wait(3000); }
  StatementsSelectionforPublisherClick() { cy.xpath('//strong[contains(text(),"Contract Test")]').click({ force: true }).wait(2000); }
  StatementsContractSelectionClick() { cy.xpath('//strong[contains(text(),"Test Gelo 6")]').click({ force: true }).wait(2000); }
  StatementsContractCreateClick() { cy.get('#CUR-nqObrHgU').click().wait(3000); }
  StatementsCreatedContractValidate(text) { cy.get('#CUR-IxnzJpGe a').contains(text).should('be.visible'); }
  // Validate that Statement is on Statement index page
  StatementsSearchValidate(text) { cy.get('#CUR-bDVEURjD a').contains(text).should('be.visible'); }
  StatementsSearchClick() { cy.get('#CUR-VFrbmBtF').click(); }
  // Go to Periods and Delete

  // Overview statements
  // label
  StatementsGrossRevenueValidate() { cy.get('#CUR-YzCfSXVw').should('be.visible'); }
  StatementsGrossCostsValidate() { cy.get('#CUR-qXNuLtkK').should('be.visible'); }
  StatementsReservesWithHeldValidate() { cy.get('#CUR-SiviRPBn').should('be.visible'); }
  StatementsOpeningBalanceValidate() { cy.get('#CUR-ySORnFhU').should('be.visible'); }
  StatementsNetRevenueValidate() { cy.get('#CUR-URmdaxyZ').should('be.visible'); }
  StatementsRechargedCostsValidate() { cy.get('#CUR-iYawQlLZ').should('be.visible'); }
  StatementsReservedReleasedValidate() { cy.get('#CUR-KNKKSrZb').should('be.visible'); }
  StatementsClosingBalanceValidate() { cy.get('#CUR-wFsUoeyS').should('be.visible'); }

  // publisher
  StatementsOpeningBalancePubValidate() { cy.get('#CUR-mujSCwnz').should('be.visible'); }
  StatementsGrossRevenuePubValidate() { cy.get('#CUR-kqpVKIzM').should('be.visible'); }
  StatementsNetRevenuePubValidate() { cy.get('#CUR-eqOOxrrI').should('be.visible'); }
  StatementsClosingBalancePubValidate() { cy.get('#CUR-RELntrCq').should('be.visible'); }

  // sTATEMENT Included Sales
  StatementsIncludedSalesTabClick() { cy.get('#CUR-AjNorMvO').should('be.visible').click().wait(2000); }
  StatementsIncludedCostsTabClick() { cy.get('#CUR-GBcIElID').should('be.visible').click().wait(2000); }
  StatementsIncludedIncomeTabClick() { cy.get('#CUR-taParOTt').should('be.visible').click().wait(2000); }
  StatementsIncludedSalesTableHeaderValidate(text) { cy.get('#CUR-mPMxhqHU').contains(text).should('be.visible'); }
  StatementsIncludedCostTableHeaderValidate(text) { cy.get('#CUR-oQWMSAYq').contains(text).should('be.visible'); }

  // Sales Statements
  StatementsSalesTabClick() { cy.get('#CUR-sgvlgyzY').should('be.visible').click().wait(2000); }
  StatementsReleaseFieldType(text) { cy.xpath('//label[@id="CUR-vpoEdXks"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  StatementsTrackFieldType(text) { cy.xpath('//label[@id="CUR-nxTwwdKz"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  StatementsChannelFieldType(text) { cy.xpath('//label[@id="CUR-KsqZCrkv"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  StatementsConfigurationType(text) { cy.xpath('//label[@id="CUR-TndNnueT"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  StatementsConfigTypeSelClick() { cy.xpath('//span[contains(text(),"CD")]').should('be.visible').click().wait(2000); }
  StatementsConfigTypeSelPubClick() { cy.xpath('//span[contains(text(),"Television")]').should('be.visible').click().wait(2000); }
  StatementsTerritoryFieldType(text) { cy.xpath('//label[@id="CUR-wsNnryxH"]/following::input[@type="search"][1]').should('be.visible').type(text).wait(2000); }
  StatementsTerritoryDropdSelClick() { cy.xpath('//span[text()="World"]').should('be.visible').click().wait(2000); }
  StatementsSourceFieldType(text) { cy.get('#CUR-YWqFholy').should('be.visible').clear().type(text).wait(2000); }
  StatementsSubSourceFieldType(text) { cy.get('#CUR-ZipgrERR').should('be.visible').clear().type(text).wait(2000); }
  StatementsCatTypeDropdClick() { cy.xpath('//label[@id="CUR-RPiWeOAr"]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  StatementsCatTypeDropdSelReleaseClick() { cy.xpath('//span[text()="Release"]').should('be.visible').click().wait(2000); }
  StatementsSalesFilterButtonClick() { cy.get('#CUR-EOJjIlqQ').should('be.visible').click().wait(2000); }
  StatementsSalesTableValidate(text) { cy.get('#CUR-eUcquUHb').contains(text).should('be.visible'); }
  StatementsIncomeTableValidate(text) { cy.get('#CUR-zuymYLmw').contains(text).should('be.visible'); }
  // Income
  StatementsIncomeTabClick() { cy.get('#CUR-XULjGwlr').should('be.visible').click().wait(2000); }
  StatementsWorkFieldType(text) { cy.xpath('//label[@id="CUR-BNmqnCyq"]/following::input[@type="search"][1]').should('be.visible').clear().type(text).wait(2000); }
  StatementsWorkDropdSelClick() { cy.xpath('//span[text()="Test Work Brazil - "]').should('be.visible').click().wait(2000); }
  // Communication
  StatementsCommunicationTabClick() { cy.get('#CUR-gRqqKGYU').should('be.visible').click().wait(2000); }
  StatementCommunicationHeaderValidate(text) { cy.get('#CUR-RYsTMHaJ').contains(text).should('be.visible'); }

  StatementsReprocessButtonClick() { cy.get('#CUR-FmOQNQRY').should('be.visible').click().wait(2000); }
  StatementsReprocessModalClick() { cy.get('#CUR-jcwyIHlo').should('be.visible').click().wait(2000); }

  StatementsPublishButtonClick() { cy.get('#CUR-cPMrKcIc').should('be.visible').click().wait(5000); }
  StatementsUnpublishButtonClick() { cy.get('#CUR-CWUmpRiI').should('be.visible').click().wait(2000); }

  // Download statements
  StatementsDownloadDropdClick() { cy.get('#CUR-Uyxfadtv').should('be.visible').click().wait(2000); }
  StatementsDownloadAllSelValidate() { cy.get('#CUR-sQsgxXyW').should('be.visible'); }
  StatementsPDFSelValidate() { cy.get('#CUR-sQsgxXyW').should('be.visible'); }
  StatementsStatementOfAcctSelValidate() { cy.get('#CUR-aFgrlkNh').should('be.visible'); }
  StatementsSelfBillingNoticeValidate() { cy.get('#CUR-QayDRyTD').should('be.visible'); }
  StatementsAllSalesCSVValidate() { cy.get('#CUR-ZqdLYMrN').should('be.visible'); }
  StatementsAllCostsCSVValidate() { cy.get('#CUR-igDwdvnR').should('be.visible'); }
  StatementsAllIncomeValidate() { cy.get('#CUR-ALfyipnW').should('be.visible'); }
  //
  // Costs TC
  //
  CostsSalesMenuClick() { cy.get('#sidebar-sales-files > a').click().wait(1000); }
  CostsSubMenuClick() { cy.get('#sidebar-costs > a').click().wait(1000); }
  // Cost Page Content Validation
  CostsSearchBarValidate() { cy.get('#CUR-SSvIUIOD').should('be.visible'); }
  CostsExportButtonValidate() { cy.get('#CUR-AROTYiOp').should('be.visible'); }
  CostsImportButtonValidate() { cy.get('#CUR-Wyuhdneo').should('be.visible'); }
  CostsDeleteButtonValidate() { cy.get('#CUR-YacstJXY').should('be.visible'); }
  CostsArchiveButtonValidate() { cy.get('#CUR-AipxbKdB').should('be.visible'); }
  CostsCreateButtonValidate() { cy.get('#CUR-PmBsPhdG').should('be.visible'); }
  CostsArchiveDDValidate() { cy.get('#CUR-bSMhGqpM').should('be.visible'); }
  CostsNameHeaderValidate() { cy.get('#CUR-cAZqlMux th').contains('Name').should('be.visible'); }
  CostsAmountHeaderValidate() { cy.get('#CUR-cAZqlMux th').contains('Amount').should('be.visible'); }
  CostsDescriptionHeaderValidate() { cy.get('#CUR-cAZqlMux th').contains('Description').should('be.visible'); }
  CostsTargetPeriodValidate() { cy.get('#CUR-cAZqlMux th').contains('Target Period').should('be.visible'); }
  CostsTypeHeaderValidate() { cy.get('#CUR-cAZqlMux th').contains('Type').should('be.visible'); }
  CostsCreatedArtValidate() { cy.get('#CUR-cAZqlMux th').contains('Created At').should('be.visible'); }
  CostsReportedValidate() { cy.get('#CUR-cAZqlMux th').contains('Reported').should('be.visible'); }
  CostsArchivedDropdIndexClick() { cy.xpath('//label[@id="CUR-VxkxOrNN"]/following::span[@tabindex="-1"]').should('be.visible').click().wait(2000); }
  CostsArchivedDropdSelIndexClick() { cy.xpath('//label[@id="CUR-VxkxOrNN"]/following::span[@class="ui-select-choices-row-inner"][1]').should('be.visible').click().wait(2000); }
  CostsFilterButtonIndexClick() { cy.get('#CUR-paGvTGuG').should('be.visible').click().wait(2000); }
  // Create Cost
  CostsCreateButtonClick() { cy.get('#CUR-PmBsPhdG').click().wait(1000); }
  CostsNameFieldType(text) { cy.get('#CUR-fapHAIUM').clear().type(text); }
  CostsAmountFieldType(text) { cy.get('#CUR-QQbgsijo').clear().type(text); }
  CostsDateFieldType(text) { cy.get('#CUR-hvMRPWrI').click().type(text); }
  CostsOutsideClick() { cy.get('#CUR-wuFoOJlb').click(); }
  CostsTypeDDClick() { cy.xpath('//label[@id="CUR-igslSkzc"]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  CostsTypeDDSelectionClick() { cy.get('#CUR-byDkVIRe span').contains('Artwork').click(); }
  CostsTerritoryDDClick() { cy.xpath('//label[@id="CUR-PLwTdZoJ"]/following::span[@tabindex="-1"]').click().wait(1000); }
  CostsTerritoryDDSelectionClick() { cy.get('#CUR-ZBPyVsQy span').contains('World').click(); }
  CostsInvoiceNoFieldType(text) { cy.get('#CUR-vMuHEYmk').clear().type(text); }
  CostsTargetPeriodFieldType(text) { cy.get('#CUR-jrgAFiXF').type(text); }
  CostsDescriptionFieldType(text) { cy.get('#CUR-dPyhOWpT').type(text); }
  CostsContractsType(text) { cy.xpath('//div[@id="CUR-OguTrmtn"]/following::input[@type="text"][3]').should('be.visible').type(text).wait(3000); }
  CostsContractsFieldType(text) { cy.xpath('//label[@id="CUR-ieyhkgSk"]/following::input[1]').should('be.visible').type(text).wait(3000); }
  CostsContractsSelClick() { cy.xpath('//strong[text()="Test Gelo 100"]').should('be.visible').click().wait(1000); }
  CostsContractsSelTestGelo9Click() { cy.xpath('//strong[text()="Test Gelo 9"]').should('be.visible').click().wait(1000); }
  CostsContractsSelTestGelo3Click() { cy.xpath('//strong[text()="Test Gelo 3"]').should('be.visible').click().wait(1000); }
  CostsUnarchivedClick() { cy.get('#CUR-DfkTWCsQ').should('be.visible').click().wait(2000); }
  // save and validate created data
  CostsSaveButtonClick() { cy.get('#CUR-xMDvxoWP').click().wait(2000); }
  CostsNameValidate(text) { cy.get('#CUR-fapHAIUM').should('have.value', text); }
  CostsAmountValidate(text) { cy.get('#CUR-QQbgsijo').should('have.value', text); }
  CostsDateValidate(text) { cy.get('#CUR-hvMRPWrI').should('have.value', text); }
  CostsTypeValidate(text) { cy.get('#CUR-byDkVIRe span').contains(text).should('be.visible'); }
  CostsTerritoryValidate(text) { cy.get('#CUR-UcUcyYTp').should('have.text', text); }
  CostsInvoiceValidate(text) { cy.get('#CUR-vMuHEYmk').should('have.value', text); }
  CostsTargetPeriodCreatedValidate(text) { cy.get('#CUR-jrgAFiXF').should('have.value', text); }
  CostsDescriptionValidate(text) { cy.get('#CUR-dPyhOWpT').should('have.value', text); }
  // validate created data on index page
  CostsLinkClick() { cy.get('#CUR-ZSOjMzJH').click().wait(1000); }
  CostsCreatedNameValidate(text) { cy.get('#CUR-hyXIbMwu a').contains(text).should('be.visible'); }
  CostsCreatedDetailsTableValidate(text) { cy.get('#CUR-hyXIbMwu td').contains(text).should('be.visible'); }
  
  // update data on edit page
  CostsCreatedClick(text) { cy.get('#CUR-hyXIbMwu a').contains(text).click().wait(2000); }
  // validate updated data on edit page
  // validate updated data on index page
  // Delete Cost
  CostsClickDeleteButton() { cy.get('#CUR-cpHMoyZc').click().wait(2000); }
  CostsClickDeleteModalButton() { cy.get('#CUR-zqfkAkIc').click({ force: true }).wait(2000); }

  CostSearchbarType(text) { cy.get('#CUR-SSvIUIOD').should('be.visible').type(text).type('{enter}').wait(5000); }



  //
  // Templates TC
  //
  TemplatesSubMenuClick() { cy.get('#sidebar-templates > a').click().wait(2000); }
  TemplatesCreateButtonClick() { cy.xpath('//button[@id="CUR-RYumwoor"]/following::a[@data-toggle="dropdown"]').click().wait(2000); }
  TemplatesCreateFromNewClick() { cy.get('#CUR-tHSGHnBz').click().wait(2000); }
  // Calculation Tab
  TemplatesCalculationsTabClick() { cy.get('#CUR-xxVHzJFg').click().wait(2000); }
  TemplatesAddCalculationClick() { cy.get('#CUR-NJDqEPhR').click().wait(2000); }
  TemplatesWhenDDSelect() { cy.xpath('//label[contains(text(),"When")]/following::select[@ng-model="calculation.conditionType"]').select('string:Any'); }
  TemplatesAddConditionClick() { cy.xpath('//label[contains(text(),"When")]/following::button[@ng-click="addCondition()"]').click().wait(5000); }
  // TemplatesInputeTypeDD1() { cy.xpath('//label[contains(text(),"When")]/following::span[@tabindex="-1" and @role="button"][1]').click().wait(1000); }
  // TemplatesInputTypeDDSelection1() { cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  TemplatesInputTypeDDClick() { cy.xpath('//label[contains(text(),"When")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  TemplatesInputTypeDDSelectionClick() { cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  TemplatesInputValueType() { cy.xpath('//label[contains(text(),"When")]/following::input[@type="number"]').clear().type('1'); }
  TemplatesComparisonDDClick() { cy.xpath('//label[contains(text(),"Comparison")]/following::span[@tabindex="-1"][2]').click().wait(1000); }
  TemplatesComparisonSelectionDDClick() { cy.xpath('//span[contains(text(),"Is Blank")]').click({ force: true }); }
  TemplatesOutputFieldDDClick() { cy.xpath('//label[contains(text(),"Output Field")]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  TemplatesOutputFieldDDSelectionClick() { cy.xpath('//label[contains(text(),"Output Field")]/following::span[contains(text(),"Skip Row")]').click({ force: true }); }
  // Overview Tab
  TemplatesClickOverviewTabClick() { cy.get('#CUR-EtCgEaNp').click().wait(1000); }
  TemplatesNameFieldType(text) { cy.get('#CUR-lDUnDkZE').clear().type(text); }
  TemplatesSourceType(text) { cy.get('#CUR-DVIVtmuI').clear().type(text); }
  TemplatesTabNumberType(text) { cy.get('#CUR-GHphjaeq').clear().type(text); }
  TemplatesHeaderRowType(text) { cy.get('#CUR-SeOCdrpE').clear().type(text); }
  TemplatesStartingRowType(text) { cy.get('#CUR-qXfqrZTK').clear().type(text); }
  TemplatesUploadFileAttach(text) { cy.get('input[type=file]').attachFile(text); }
  TemplatesSaveButtonClick() { cy.get('#CUR-MVMxRkBl').click().wait(8000); } // Save Button
  // Setting Example Lines
  Templates1stFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][1]').click(); }
  Templates1stFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][1]').type('sale date').wait(1000); }
  TemplatesFieldSelectClick(text) { cy.get('#CUR-bMXYoMFH').contains(text).click(); }

  Templates2ndFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][2]').click(); }
  Templates2ndFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][2]').type('source').wait(1000); }

  Templates3rdFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][3]').click(); }
  Templates3rdFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][3]').type('sub source').wait(1000); }
  

  Templates4thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][4]').click(); }
  Templates4thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][4]').type('territory').wait(1000); }

  Templates5thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][5]').click(); }
  Templates5thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][5]').type('distribution').wait(1000); }
  

  Templates6thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][6]').click(); }
  Templates6thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][6]').type('configuration').wait(1000); }
  

  Templates7thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][7]').click(); }
  Templates7thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][7]').type('isrc').wait(1000); }
  

  Templates8thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][8]').click(); }
  Templates8thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][8]').type('units').wait(1000); }

  Templates9thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][9]').click(); }
  Templates9thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][9]').type('gross').wait(1000); }

  Templates10thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][10]').click(); }
  Templates10thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][10]').type('net amount').wait(1000); }


  Templates11thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][11]').click(); }
  Templates11thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][11]').type('per unit rate').wait(1000); }

  Templates12thFieldClick() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][12]').click(); }
  Templates12thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][12]').type('transaction date').wait(1000); }

  // validate on index page
  TemplatesTemplateLinkClick() { cy.get('#CUR-pOyCFpuZ').click().wait(4000); }
  TemplatesValidateCreated(text) { cy.get('#CUR-WNCyYxcz a').contains(text).should('be.visible'); }
  TemplatesValidateSource(text) { cy.get('#CUR-WNCyYxcz span').contains(text).should('be.visible'); }
  // update template
  TemplatesCreatedClick(text) { cy.get('#CUR-WNCyYxcz a').contains(text).click(); }
  // save and validate on edit page
  TemplatesEditedNameValidate() { cy.get('#CUR-lDUnDkZE').should('have.value', 'A Template Smoke Update'); }
  TemplatesEditedSourceValidate() { cy.get('#CUR-DVIVtmuI').should('have.value', 'STA'); }
  // validate on index page
  // delete
  TemplatesDeleteClick() { cy.get('#CUR-mZEcFCVq').click().wait(2000); }
  TemplatesDeleteModalClick() { cy.get('#CUR-GWPyNhGt').click().wait(2000); }

  //
  // SALES INGESTION TC
  //
  SalesIncomeMenu() { cy.xpath('//span[@class="title ng-scope"]').click({ force: true }).wait(5000); }
  SalesIncomeSubmenu() { cy.xpath('//a[@class="go-to ng-scope"]').click(); }
  // index page content validation
  SalesArchivedDropdIndexClick() { cy.get('#CUR-TlvgVJPX').should('be.visible').click().wait(2000); }
  SalesArchivedDropdSelArchivedClick() { cy.xpath('//span[@id="CUR-TlvgVJPX"]/following::span[text()="Archived"]').should('be.visible').click().wait(2000); }
  SalesValidHeaderValidate(text) { cy.get('#CUR-FHufgwGM').should('have.text', text); }
  SalesStatusHeaderValidate(text) { cy.get('#CUR-vwBFXAWO').should('have.text', text); }
  SalesReportedValidate(text) { cy.get('#CUR-sSeLfdFL').should('have.text', text); }
  SalesArhivedValidate(text) { cy.get('#CUR-gTNhalNj').should('have.text', text); }
  SalesNewValidate(text) { cy.get('#CUR-ZYheIwqI').should('have.text', text); }
  SalesFilterValidate() { cy.get('#CUR-NlTTzTrO').should('be.visible'); }
  SalesFilterClick() { cy.get('#CUR-NlTTzTrO').should('be.visible').click().wait(2000); }
  SalesExportValidate() { cy.get('#CUR-ivKvGcQl').should('be.visible'); }
  SalesRerunValidate() { cy.get('#CUR-nBTrboeS').should('be.visible'); }
  SalesDeleteValidate() { cy.get('#CUR-riqaSlSH').should('be.visible'); }
  SalesArchiveButtonValidate() { cy.get('#CUR-ofnmYZwF').should('be.visible'); }
  SalesCreateValidate() { cy.get('#CUR-PNdYcPxE').should('be.visible'); }
  SalesTableHeaderValidate(text) { cy.get('#CUR-yprfVOlM th').contains(text).should('be.visible'); }
  SalesnvoiceHeader() { cy.get('#CUR-yprfVOlM th').contains().should('be.visible'); }
  SalesTargetHeader() { cy.get('#CUR-yprfVOlM th').contains().should('be.visible'); }
  SalesAccountHeader() { cy.get('#CUR-yprfVOlM th').contains().should('be.visible'); }
  SalesGrossHeader() { cy.get('#CUR-yprfVOlM th').contains().should('be.visible'); }
  SalesNetHeader() { cy.get('#CUR-yprfVOlM th').contains().should('be.visible'); }
  SalesInvalidLinesHeader() { cy.get('#CUR-yprfVOlM th').contains().should('be.visible').wait(5000); }
  SalesDeleteIfExist() { cy.get('body').then(($body) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($body.text().includes('smoke-sales-publishing')) {
      // yup found it
      cy.log('Found Duplicate Test Data')
      cy.xpath('//a[@title="smoke-sales-publishing"]/preceding::tr/following::input[@id="sales-file-select-2"]').click()
      cy.get('#CUR-riqaSlSH').click() // delete button
      cy.get('#CUR-LIkCBbfT').click() // delete button in modal
      cy.wait(5000)

    } else {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  SalesCreateClick() { cy.get('#CUR-PNdYcPxE').click().wait(2000); }
  SalesChooseFileAttach(file) { cy.xpath('//input[@type="file"]').attachFile(file).wait(8000); }
  SalesCompleteButtonClick() { cy.get('#CUR-aEbJeVnL').click({ force: true }).wait(5000); }
  // validate data on index page
  SalesUploadedFileValidate(text) { cy.get('#CUR-RKtAMVsX a').contains(text).should('be.visible'); }
  SalesAcctNoValidate(text) { cy.get('#CUR-RKtAMVsX td').contains(text).should('be.visible'); }
  // sales page
  SalesUnarchiveButtonClick() { cy.get('#CUR-wnFLBLtC').should('be.visible').click().wait(1000); }
  SalesUploadedClick(text) { cy.get('#CUR-RKtAMVsX a').contains(text).click().wait(60000); }
  SalesNextButtonClick() { cy.get('#CUR-oTFHNCxq').should('be.visible').click().wait(2000); }
  // SalesCompleteClick() { cy.get('#CUR-tSDxRqMQ').should('be.visible').click({ force: true }).wait(2000); }
  SalesCompleteClick(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Complete Modal is Visible')
      cy.get('#CUR-tSDxRqMQ').should('be.visible').click({ force: true }).wait(2000);
    } else {
      cy.log('Complete modal is not visible').wait(2000)
      
    }
  }) } 


  SalesCompleteModal() { cy.get('#CUR-tSDxRqMQ').then(($button) => {
    // If the button is visible, click it
    if ($button.is(':visible')) {
      cy.wrap($button).click();
      cy.log('Modal is visible')
    } else {
      cy.log('Modal is not Visible')
      // Proceed with your desired actions
    }
  });
  }
  SalesRevalidateClick() { cy.get('#CUR-DUdWDnqe').click(60000); }
  // update sales
  SalesHeaderValidate() { cy.get('#CUR-CormnEei').should('be.visible'); }
  SalesEditClick() { cy.get('#CUR-JntuUeyO').click().wait(3000); }
  SalesUpdateNameType(text) { cy.get('#CUR-uOyLTZEv').clear().clear().type(text); }
  SalesSaveClick() { cy.get('#CUR-VcrTkCcj').click().wait(2000); }
  SalesSalesLinkClick() { cy.get('#CUR-QkoCHvTt').click().wait(2000); }
  // delete sales
  SalesDeleteClick() { cy.get('#CUR-dYQCkJmQ').click().wait(5000); }
  SalesDeleteModalClick() { cy.get('#CUR-alQhgDPu').click().wait(5000); }

  
  //
  // DELIVERIES TC
  //
  DlvrsMenuClick() { cy.get('#sidebar-deliveries > a').click().wait(2000); }
  DlvrsSubmenuClick() { cy.get('#sidebar-deliveries-submenu > a').click().wait(2000); }
  DlrvrsSettingsSubMenuClick() { cy.xpath('//a[@class="go-to" and text()="Delivery Settings"]').should('be.visible').click().wait(2000); }
  DlvrsAutoApproveWorksCBClick() { cy.get('#CUR-div-panel-body-fg-input-AutoApprove').should('be.visible').click().wait(2000); }
  DlvrsSettingsSaveClick() { cy.get('#CUR-vMNgWhNh').should('be.visible').click().wait(2000); }
  // Page content validation
  DlvrsTabClick() { cy.get('#CUR-sgPcDTAr').should('be.visible').click().wait(2000); }
  // DlvrsSearchValidate() { cy.get('#CUR-izubuMLP').should('be.visible'); }
  // DlvrsDeleteValidate() { cy.get('#CUR-hJlVPICP').should('be.visible'); }
  // DlvrsCreateValidate() { cy.get('#CUR-AQqGZbDe').should('be.visible'); }
  DlvrsSearchValidate() { cy.get('#CUR-jYfDqoiQ').should('be.visible'); }
  DlvrsDeleteValidate() { cy.get('#CUR-HzNjZERp').should('be.visible'); }
  DlvrsCreateValidate() { cy.get('#CUR-acVnDniV').should('be.visible'); }
  DlvrsHeadersValidate(text) { cy.get('#CUR-sQjLABkr th').contains(text).should('be.visible'); }
  // Create Delivery
  DlvrsCreateButtonClick() { cy.get('#CUR-acVnDniV').click().wait(2000); }
  DlvrsNameType(text) { cy.get('#CUR-ioaJMTae').clear().type(text); }
  DlvrsRcvngPartyClick() { cy.xpath('//label[@id="CUR-ULwnVkqB"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsRcvngPTSelClick() { cy.xpath('//label[@id="CUR-ULwnVkqB"]/following::span[contains(text(),"PRS")][1]').click({ force: true }); }
  DlvrsTerritoryClick() { cy.xpath('//label[@id="CUR-XBQGThHp"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsTerritorySelClick() { cy.xpath('//label[@id="CUR-XBQGThHp"]/following::span[contains(text(),"World")]').click({ force: true }); }
  DlvrsDeliveryPartnerClick() { cy.xpath('//label[@id="CUR-FvVSACYr"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsDeliveryPartnerSelClick() { cy.get('#CUR-cKgGPuta').click({ force: true }); }
  DlvrsOutputFormatClick() { cy.xpath('//label[@id="CUR-EeTXCCzS"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsOutputFormatSelClick() { cy.xpath('//label[@id="CUR-EeTXCCzS"]/following::span[@id="CUR-VMPwQrzc"][1]').click({ force: true }); }
  DlvrsIncludesTerritoryClick() { cy.xpath('//label[@id="CUR-bsDkdooQ"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsIncTrtrySelClick() { cy.xpath('//label[@id="CUR-bsDkdooQ"]/following::span[contains(text(),"World")]').click({ force: true }); }
  DlvrsNotDelvrdClick() { cy.xpath('//label[@id="CUR-qksaMXjb"]//following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsNotDlvrdSelClick() { cy.xpath('//label[@id="CUR-qksaMXjb"]//following::span[contains(text(),"BMI")]').click({ force: true }); }
  DlvrsClickSaveClick() { cy.get('#CUR-lqyqHcFC').should('be.visible').click().wait(10000); }
  // Validate created data
  DlvryDlvryLinkClick() { cy.get('#CUR-wPSDAvKb').click().wait(8000); }
  DlvrsedNameValidate(text) { cy.get('#CUR-ZVCnsWYo a').contains(text).should('be.visible'); }
  DlvrsTableValidate(text) { cy.get('#CUR-ZVCnsWYo span').contains(text).should('be.visible'); }
  // Update Delivery
  DlvrsCreatedClick(text) { cy.get('#CUR-ZVCnsWYo a').contains(text).click().wait(12000); }
  // Validate updated data index page
  DlvryUpdatedNameValidate(text) { cy.xpath('//a[contains(text(),"A Delivery Smoke Update")]').contains(text).should('be.visible'); }
  // Delete data 
  DlvryDeleteCreatedClick() { cy.xpath('//a[contains(text(),"A Delivery Smoke Update")]').click().wait(10000); }
  DlvryDeleteButtonClick() { cy.get('#CUR-tRfCZRkf').click().wait(2000); }
  DlvryDeleteModalClick() { cy.get('#CUR-IcExkQDi').click().wait(2000); }




  // 
  // PAYMENTS TC
  //
  PPaymentsMenuClick() { cy.get('#sidebar-payments > a').click().wait(2000); }
  // payment groups index page validation
  PPaymentsSearchBarValidate() { cy.get('#CUR-HojkyIsW').should('be.visible'); }
  PPaymentsDeleteButtonValidate() { cy.get('#CUR-kXoADWjR').should('be.visible'); }
  PPaymentsCreateButtonValidate() { cy.get('#CUR-INWUtDqr').should('be.visible'); }
  PPaymentsHeadersValidate(text) { cy.get('#CUR-oTADdvMB th').contains(text).should('be.visible'); }
  PPaymentsDeleteButtonIndexClick() { cy.get('#CUR-kXoADWjR').should('be.visible').click(2000); }
  PPaymentDeleteModalIndexClick() { cy.get('#CUR-WTFkrtrD').should('be.visible').click(2000); }
  // payment index page validation
  PPaymentsCreateClick() { cy.get('#CUR-INWUtDqr').click().wait(1000); }
  PPaymentsOverviewHeaderValidate(text) { cy.get('#CUR-EnfXLjHD').contains(text).should('be.visible'); }
  PPaymentsNameHeaderValidate() { cy.get('#CUR-XBVbaFCZ').contains('Name').should('be.visible'); }
  PPaymentsSaveButtonValidate() { cy.get('#CUR-LzsfBxoh').should('be.visible'); }
  PPaymentsPayeeHeaderValidate(text) { cy.xpath('//th[contains(text(),"Payee")]').contains(text).should('be.visible'); }
  PPaymentsNameFieldHeader(text) { cy.xpath('//th[contains(text(),"Name")]').contains(text).should('be.visible'); }
  PPaymentsCurrencyHeaderValidate(text) { cy.xpath('//th[contains(text(),"Currency")]').contains(text).should('be.visible'); }
  PPaymentsAmountHeaderValidate(text) { cy.xpath('//th[contains(text(),"Amount")]').contains(text).should('be.visible'); }
  PPaymentsStatusHeaderValidate(text) { cy.xpath('//th[contains(text(),"Status")]').contains(text).should('be.visible'); }
  // Add Payment
  PPaymentsEnterNameType(text) { cy.get('#CUR-eAKxeLbd').clear().type(text); }
  PPaymentsSaveClick() { cy.get('#CUR-LzsfBxoh').click().wait(1000); }
  PPaymentsCreateEditClick() { cy.get('#CUR-sovaMLmn').click().wait(2000); }
  PPaymentsEnterNameEditType(text) { cy.get('#CUR-XHhdnPOg').clear().type(text); }
  PPaymentsEnterAmountType(text) { cy.get('#CUR-eFDNZivS').type(text); }
  PPaymentsPayeeType(text) { cy.get('#CUR-payee-select-field').type(text).wait(2000); }
  PPaymentsPayeeAdvanceType(text) { cy.xpath('//strong[contains(text(),"Z Standard")]').contains(text).click({ force: true }); }
  PPaymentsPayeeSaveClick() { cy.get('#CUR-vzLwJXME').click().wait(2000); }
  PPaymentGroupsLinkClick() { cy.get('#CUR-APMxylHa').should('be.visible').click().wait(2000); }
  PPaymentCreatedPaymentGroupsClick(text) { cy.get('#CUR-WDxgdqfq').contains(text).should('be.visible').click().wait(2000); }
  // Validate Created Data
  PPaymentsPayeeValidate(text) { cy.xpath('//a[contains(text(),"Z Standard")]').contains(text).should('be.visible'); }
  PPaymentsValidateName(text) { cy.xpath('//td[contains(text(),"A Smoke Payment")]').contains(text).should('be.visible'); }
  PPaymentsValidateCurrency(text) { cy.xpath('//td[contains(text(),"GBP")]').contains(text).should('be.visible'); }
  PPaymentsValidateAmount(number) { cy.get('#CUR-BAKorZom td').contains(number).should('be.visible'); }
  PPaymentsValidateStatus(text) { cy.xpath('//span[contains(text(),"Pending")]').contains(text).should('be.visible'); }
  // Update Payment
  PPaymentsCreatedClick() { cy.xpath('//a[contains(text(),"Z Standard")]').contains('Z Standard').click(); }
  PPaymentsGroupsLinkClick() { cy.get('#CUR-nwSFNGwm').click(); }
  // Validate Updated Data
  PPaymentsUpdatedNameValidate(text) { cy.xpath('//td[contains(text(),"A Payment Smoke Updated")]').contains(text).should('be.visible'); }
  // delete payment
  PPaymentsDeleteButtonClick() { cy.get('#CUR-fjzEPjoB').click().wait(2000); }
  PPaymentsDeleteModalButtonClick() { cy.get('#CUR-OSFxsxNc').click().wait(2000); }
  // delete payment groups
  PPaymentsDeleteGroupClick() { cy.get('#CUR-cwYxrxYN').click().wait(2000); }
  PPaymentsDeleteGroupModalClick() { cy.get('#CUR-kcQIXvUd').click().wait(2000); }

  // 
  // CONFIG TC
  //
  // 
  CConfigSettingsClick() { cy.get('#sidebar-settings > a').wait(2000).click(); }
  CConfigGeneralClick() { cy.get('#sidebar-settings-general > a').wait(2000).click(); }
  ConfigImportsClick() { cy.xpath('//a[text()="Imports"]').click().wait(2000); }
  ConfigImportsCreateClick() { cy.get('#CUR-JqtYgYOW').should('be.visible').click().wait(2000); }
  ConfigImportsDeleteImport() { cy.get('#CUR-RtvJHZzy').should('be.visible').click().wait(2000); }
  // configuration page content validation
  CConfigTabClick() { cy.get('#CUR-zfwLctsq').wait(2000).click(); }
  CConfigCurrencyHeaderValidate() { cy.get('#CUR-RUMGcfIR').contains('Currency').should('be.visible'); }
  CConfigAccountingPeriodTypesHeaderValidate() { cy.get('#CUR-SygJfpJW').contains('Accounting Period Types').should('be.visible'); }
  CConfigDistribChannelsHeaderValidate() { cy.get('#CUR-WiTwKpln').contains('Distribution Channels').should('be.visible'); }
  CConfigConfigurationsHeaderValidate() { cy.get('#CUR-NcIEqMey').contains('Configurations').should('be.visible'); }
  CConfigCatalogueGroupsHeaderValidate() { cy.get('#CUR-JtjtHBvs').contains('Catalogue Groups').should('be.visible'); }
  CConfigSourcesHeaderValidate() { cy.get('#CUR-dBjmMSky').contains('Sources').should('be.visible'); }
  CConfigPayeeCategoriesHeaderValidate() { cy.get('#CUR-FhiBtVul').contains('Payee Categories').should('be.visible'); }
  CConfigContractCategoriesHeaderValidate() { cy.get('#CUR-uIpxoudN').contains('Contract Categories').should('be.visible'); }
  LabelConfigPriceCategoriesHeader() { cy.get('#CUR-zazhWYra').contains('Price Categories').should('be.visible'); }
  LabelConfigCostTypesHeader() { cy.get('#CUR-xgAYmZKX').contains('Cost Types').should('be.visible'); }
  
  // Import
  SettingImportNameFieldType(text) { cy.xpath('//label[text()="Name"]/following::input[1]').should('be.visible').clear().type(text); }
  SettingImportFromSystemClick() { cy.xpath('//label[text()="From System"]/following::span[@tabindex="-1"]').should('be.visible').click().wait(2000);  }
  SettingImpoRTFromSystemSelCWRClick() { cy.xpath('//span[text()="CWR"]').should('be.visible').click().wait(2000);  }
  SettingSignificantUpateOkModalClick() { cy.get('#CUR-ICUTeSoj').should('be.visible').click().wait(2000);  }
  SettingFilesNextButtonClick() { cy.xpath('//a[@ng-click="validateFilesStep(form)"]').should('be.visible').click().wait(2000); }
  SettingIngestButtonClick() { cy.xpath('//a[@ng-click="ingest()"]').should('be.visible').click().wait(2000); }
  SettingImportDeleteButtonClick() { cy.get('#CUR-RtvJHZzy').should('be.visible').click().wait(2000); }
  SettingImportDeleteModalClick() { cy.get('#CUR-OvliGFEF').should('be.visible').click().wait(2000); }

  // configuration page add data
  // for Publisher
  CConfigAddClick() { cy.get('#CUR-UXciuPMi').click().wait(3000); }
  CConfigAccountingPeriodNewFieldType() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@ng-model="type.name" and @type="text"][5]').type('Smoke test'); }
  CConfigAddCatalogueGroupsClick() { cy.get('#CUR-KIJKDlFj').click().wait(3000); }
  CConfigCatalogueGroupsType() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][4]').type('Smoke test'); }
  CConfigAddPayeeCategoriesClick() { cy.get('#CUR-GLPJtuem').click().wait(3000); }
  CConfigPayeeCategoriesNewFieldType() { cy.xpath('//div[@id="CUR-uXxvxmvN"]/following::input[@type="text"][4]').type('Smoke test'); }
  CConfigAddContractCategoriesClick() { cy.get('#CUR-gVVhjIam').click().wait(3000); }
  CConfigContractCategoriesType() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').type('Smoke test'); }

  // for Label
  // configuration page add data
  LabelConfigAccountingPeriodNewFieldClick() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@ng-model="type.name" and @type="text"][5]').type('Smoke test'); }
  LabelConfigAddPriceCategoriesClick() { cy.get('#CUR-nFeigaBb').click().wait(1000); }
  LabelConfigPriceCategNewFieldType() { cy.xpath('//div[@id="CUR-zazhWYra"]/following::input[@type="text"][4]').type('Smoke test'); }
  LabelConfigAddCatalogueGroupsClick() { cy.get('#CUR-KIJKDlFj').click().wait(1000); }
  LabelConfigCatalogueGroupsType() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][5]').type('Smoke test'); }
  LabelConfigAddSourcesClick() { cy.get('#CUR-VkmnVCYN').click().wait(1000); }
  LabelConfigAddPayeeCategoriesClick() { cy.get('#CUR-GLPJtuem').click().wait(1000); }
  LabelConfigPayeeCategoriesNewFieldType() { cy.xpath('//div[@id="CUR-uXxvxmvN"]/following::input[@type="text"][5]').type('Smoke test'); }
  LabelConfigAddContractCategoriesClick() { cy.get('#CUR-gVVhjIam').click().wait(1000); }
  LabelConfigContractCategoriesType() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').type('Smoke test'); }
  // added content validation label
  LabelConfigAccountingPeriodValidate(text) { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@type="text"][5]').should('have.value', text); }
  LabelConfigCatalogueGroupsValidate(text) { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][5]').should('have.value', text); }
  LabelConfigPayeeValidate(text) { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::input[@type="text"][5]').should('have.value', text); }
  LabelConfigContractCategoriesValidate(text) { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').should('have.value', text); }
  // deletion of added data label
  ConfigAccountingPeriodDeleteClick() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::button[5]').click().wait(3000); }
  ConfigPriceCategoriesDeleteClick() { cy.xpath('//div[@id="CUR-zazhWYra"]/following::button[4]').click().wait(3000); }
  ConfigCatalogueGroupsClick() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::button[5]').click().wait(3000); }
  ConfigDeleteSourcesClick() { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::button[5]').click().wait(3000); }
  ConfigDeleteContractCategoriesClick() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::button[4]').click().wait(3000); }

  // Save and validate added data
  CConfigSaveButtonClick() { cy.get('#CUR-XbCaWLaC').click().wait(1000); } // Save Button 
  // added content validation
  CConfigAccountingPeriodValidate(text) { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@type="text"][5]').should('have.value', text); }
  CConfigCatalogueGroupsValidate(text) { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][4]').should('have.value', text); }
  CConfigPayeeCategoriesValidate(text) { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::input[@type="text"][4]').should('have.value', text); }
  CConfigContractCategoriesValidate(text) { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').should('have.value', text); }
  // deletion of added data
  CConfigCurrencyDeleteClick() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::button[5]').click().wait(3000); }
  CConfigAccountingPeriodTypesDeleteClick() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::button[4]').click().wait(3000); }
  CConfigPayeeCategoriesDeleteClick() { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::button[4]').click().wait(3000); }
  CConfigContractCategoriesDeleteClick() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::button[4]').click().wait(3000); }

  CConfigSaveClick() { cy.get('#CUR-tVJNiQMy').click().wait(2000); }
  // Payments Tab
  SettingsPaymentTabClick() { cy.get('#CUR-fOteRkzp').should('be.visible').click().wait(2000); }

  // Wise
  SettingsPaymentProviderDropdClick() { cy.xpath('//div[contains(text(),"Payments Configuration")]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(3000); }
  SettingsPaymentProviderSelectionClick(text) { cy.get('#CUR-nEZjUnwF').should('be.visible').contains(text).click().wait(2000); }
  SettingsPaymentProviderSelType(text) { cy.xpath('//label[contains(text(),"Payment Provider")]/following::input[@type="search"][1]').click().clear().type(text).type('{enter}').wait(2000); }
  SettingsWiseAPIKey(text) { cy.xpath('//label[contains(text(),"Payment Provider")]/following::input[@id="CUR-bHDULcWu"]').clear().type(text).wait(2000); }

  // Tipalty
  SettingsTipaltyPayerNameType(text) { cy.xpath('//label[contains(text(),"Payment Provider")]/following::input[@id="CUR-AGstpXhd"]').should('be.visible').clear().type(text); }
  SettingsTipaltyApiKey(text) { cy.xpath('//label[contains(text(),"Payment Provider")]/following::input[@id="CUR-FqAdahSw"]').should('be.visible').clear().type(text); }
  SettingsTipaltyIcomeTypeDdClick() { cy.xpath('//label[contains(text(),"Income Type")]/following::span[@tabindex="-1"][1]').should('be.visible').click().wait(2000); }
  SettingsTipaltyIncomeTypeSelClick() { cy.xpath('//span[@id="CUR-WeCzlqMK" and contains(text(),"Royalties - Patents")]').should('be.visible').click().wait(2000); }
  




  

  // COMPLETED Testing Users Create, Read, Update and Delete Functions
  // Users TC
  UserMenuClick() { cy.get('#sidebar-users > a').click().wait(2000); }
  // create admin user
  UserCreateButtonClick() { cy.get('#CUR-MEXvNKZp').click().wait(2000); } // Create Button 
  UserUserTypeDDClick() { cy.xpath('//label[@id="CUR-rCWHNKVr"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  UserUserTypeDDSelectionClick() { cy.xpath('//label[@id="CUR-rCWHNKVr"]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  UserEmailFieldType(text) { cy.get('#CUR-uDjOsHCe').clear().type(text); }
  UserSaveButtonClick() { cy.get('#CUR-RxSOwcRN').click().wait(1000); } // Save Button

  // save and validate created admin user on index page
  UserSaveModalClick() { cy.get('#CUR-xQRKRMjR').click().wait(1000); }
  UsersCreatedValidate(text) { cy.get('#CUR-AArHwreX a').contains(text).should('be.visible'); }
  UserAdminTagValidate(text) { cy.get('#CUR-AArHwreX span').contains(text).should('be.visible'); }
  // delete admin data
  UserCheckButtonClick() { cy.get('#user-select-0').check(); }
  UserDeleteButtonClick() { cy.get('#CUR-RWlxftDS').click(); }
  UserDeleteModalClick() { cy.get('#CUR-qmXpxFpo').click(); }
  // create standard user
  UserStandardCreateButtonClick() { cy.get('#CUR-MEXvNKZp').click(); }
  // save validate created standard user on index page
  // delete standard user
  // link payee
  UserLinkPayeeClick() { cy.xpath('//a[@id="CUR-QxsUimtF"]/following::button[@id="CUR-aZYIjHVs"]').should('be.visible').click().wait(2000); }
  UserLinkDropdClick() { cy.xpath('//label[contains(text(),"Payees")]/following::span[@tabindex="-1"]').should('be.visible').click().wait(2000); }
  UserLinkDropdSelClick() { cy.xpath('//span[contains(text(),"Z Standard")]').should('be.visible').click().wait(2000); }

  UserSearchbarType(text) { cy.get('#CUR-nPGReBdA').should('be.visible').type(text).type('{enter}').wait(5000); }

  
  



  //
  // UED FOR SELECTING CLIENT FROM LABEL TO PUBLISHER
  //
  ClientPublisherSelect() { cy.selectClientMulti('Gelo Publisher For New Features').wait(2000); }

















}
export default globalpageobject;