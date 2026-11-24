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

  // APPROVAL : Testing Payees Create, Read, Update and Delete Functions
  it('Smoke-Payees-E2E-CRUD', () => {
    // Set up variables
    const payeeName = 'Smoke Test Payee ' + Date.now();
    cy.fixture('condition.json').then(user => {

      // Navigate to Payee Select Page
      cy.get('#sidebar-contracts > a').click();
      cy.get('#sidebar-payees > a').click();

      // Validate Payee Select Page
      cy.get('#CUR-rYmCZlqH').should('be.visible');
      cy.get('#CUR-hzouaqxY').should('be.visible').contains('Export');
      cy.get('#CUR-rZPDYyzN').should('be.visible').contains('Import');
      cy.get('#CUR-mQhwuDIu').should('be.visible');
      cy.get('#CUR-GAGrmAkQ').should('be.visible').contains('Delete');
      cy.get('#CUR-jYYixChE').should('be.visible').contains('Create');

      cy.get('#CUR-IeGyJWlD .ui-select-match').should('be.visible'); // Filter Complete select box
      cy.get('#CUR-qJVOIKBD').should('be.visible').contains('Filter');
      cy.get('thead > tr > th').contains('Name').should('be.visible');
      cy.get('thead > tr > th').contains('Categories').should('be.visible');
      cy.get('thead > tr > th').contains('Created').should('be.visible');

      // Click Create Button
      cy.get('#CUR-jYYixChE').click();

      // Create Payee
      cy.get('#CUR-vNACcVKV').clear().type(payeeName);
      cy.get('#CUR-CJyhlJZW').clear().type('Payee Test');
      cy.get('#CUR-GRdOwpVU').clear().type('1234567');
      cy.get('#CUR-projectId-input').clear().type('Payee12345');
      cy.get('#CUR-MnQDkMSC').clear().type('gelo@curve.com');
      cy.get('#CUR-LGVopfOj > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#CUR-LGVopfOj > .ui-select-container > .ui-select-search').clear().type('GBP');
      cy.get('#CUR-hKtsGkio').click();
      cy.get('#CUR-yyhcuPTu').clear().type('LLoyds');
      cy.get('#CUR-fjfsuHQg > .form-control').click();
      cy.get('.ui-select-container > :nth-child(1) > .ui-select-search').click();
      cy.wait(500);
      cy.get('#ui-select-choices-row-4-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-NaYgFDcA').clear().type('gelo@curve.com');
      cy.get('#CUR-GfnUxdBv > .form-control').click();
      cy.get('#CUR-xJpyMOcS').clear().type('123456');
      cy.get('#CUR-XVRkUxZq').clear().type('123456789');
      cy.get('#CUR-xbtHjbhy').clear().type('448877');
      cy.get('#CUR-RVHhAHbs').clear().type('UK2736352');
      cy.get('#CUR-FScRJsWN > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.wait(500);
      cy.get(':nth-child(1) > #ui-select-choices-row-5-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-MuenDpiw').clear().type('Test123839');
      cy.get('#CUR-qMPSYmVs').clear().type('Test Wording');
      cy.get('#CUR-viqCfpXo').clear().type('1.2');
      cy.get('#CUR-uEYmidLa').clear().type('test');
      cy.get('#CUR-vhAOhxOf').clear().type('1.6');
      cy.get('#CUR-QiMJZhFy').clear().type('1.8');
      cy.get('#CUR-aOdlBPEr > .form-control').click();

      // Save payee & test response
      cy.get('#CUR-dJtpHGja').click(); // Click Save
      cy.get('.pgn > .alert').should('be.visible').contains('Payee successfully created');
      // cy.wait(3000);

      // Verify edit page with saved data
      cy.get('#CUR-vNACcVKV').should('have.value', payeeName);
      cy.get('#CUR-CJyhlJZW').should('have.value', 'Payee Test');
      cy.get('#CUR-MnQDkMSC').should('have.value', 'gelo@curve.com');

      // Navigate to select page
      cy.get('#CUR-jbbBXmfV').click();

      // Find and click newly created composer
      cy.selectScreenFind(payeeName);

      // Update payee
      cy.get('#CUR-vNACcVKV').clear().clear().type(payeeName + ' Changed');
      cy.get('#CUR-CJyhlJZW').clear().clear().type('Payee Test Update');
      cy.get('.ui-select-match-item > .close').click();
      cy.get('.ui-select-container > :nth-child(1) > .ui-select-search').click();
      cy.wait(1000);
      cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[@class="ui-select-choices-row-inner"][1]').click();

      // Save payee & test response
      cy.get('#CUR-dJtpHGja').click();
      // cy.get('.alert-success').should('be.visible').contains('Payee successfully saved');

      // Click through delete workflow and verify deletion
      cy.get('#CUR-DkcbEfDr').contains('Delete').click();
      cy.get('#CUR-KccMBFTd').should('be.visible');
      cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click().wait(2000);
      // cy.get('.alert-success').should('be.visible').contains('Payee successfully deleted'); 
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Contracts Create, Read, Update and Delete Functions
  it('Smoke-Contracts-End2End-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      // Set up variables
      // const name = 'Smoke Test Contract ' + Date.now();

      cy.get('#sidebar-contracts > a').click();
      cy.get('#sidebar-contract-submenu > a').click();

      // Page Content Validation
      cy.get('#CUR-rmJHDCfY').should('be.visible');
      cy.get('#CUR-IPEEOupo').should('be.visible');
      cy.get('#CUR-UDpJJUhA').should('be.visible');
      cy.get('#CUR-GqETKmnj').should('be.visible');
      cy.get('#CUR-xqVjxuMZ').should('be.visible');
      cy.get('#CUR-SOZjjcnO').should('be.visible');
      cy.get('#CUR-VmJCQpXn').should('be.visible');
      cy.get('#CUR-uGIsUwPG').should('be.visible');

      cy.get('#CUR-UBJcRsgF .ui-select-match').should('be.visible');
      cy.get('#contract-company-search-select .ui-select-search').should('be.visible');
      cy.get('#contract-contractCategories-search-select .ui-select-search').should('be.visible');

      cy.get('#CUR-uGIsUwPG').should('be.visible').contains('Filter');
      cy.get('thead > tr > th').contains('Name').should('be.visible');
      cy.get('thead > tr > th').contains('Type').should('be.visible');
      cy.get('thead > tr > th').contains('Categories').should('be.visible');
      cy.get('thead > tr > th').contains('Created').should('be.visible');

      // Click Create Button
      cy.get('#CUR-UDpJJUhA').click();
      cy.typeAheadSelection('stan', 'Z Standard', '#CUR-eahYeMnc');
      cy.get('#CUR-tYltRUcS').type('A Smoke Contract');
      cy.get('#CUR-dyWxzodj').clear().type('01/02/2023');
      cy.get('.uib-button-bar .uib-close').click().wait(1000);
      cy.get('#CUR-HCfjjYNb').clear().type('01/02/2023');
      cy.get('#CUR-gaQtKgcB').clear().type('Gelo12345');
      cy.get('#CUR-projectId-input').clear().type('Contract12345');

      // Categories
      cy.get('.input-xs').click();
      cy.get('.input-xs').type('Creator').wait(1000);
      cy.get('#CUR-nxGGltrV span').contains('Creator').click();
      // Homecurrency
      cy.get('#CUR-isvSrjLA > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#ui-select-choices-row-11-0 > .ui-select-choices-row-inner > #CUR-LQcCzhiE').contains('Home Currency').click();
      // Accounting Period
      cy.get('#CUR-ZxtyZCPP > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#ui-select-choices-row-6-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-XAgXnZFz').type('50');
      cy.get('#CUR-pLtIIIAd').type('10');
      // Contract Type
      cy.get('#CUR-lCgBDBVK').click().wait(1000);
      cy.get('#CUR-lCgBDBVK span').contains('Royalty').click();
      // terms page
      cy.get('#CUR-aXNqZBBZ').click().wait(3000);
      cy.get('#CUR-rjmQDouq').click();
      cy.get(':nth-child(1) > .row.ng-scope > :nth-child(1) > .form-control').select('string:Gross Receipts');
      cy.get('.row.ng-scope > :nth-child(2) > .form-control').type('100');
      cy.get('[ng-if="clientType != \'Publisher\' && !deduction && !withholding && features && features.complexSalesTerms"] > .form-control').type('1');
      cy.get('[ng-if="!deduction && !withholding && features && features.complexSalesTerms"] > .form-control').type('1');

      // save and validate created data  
      cy.get('#CUR-TinbGPNU').click().wait(5000);
      cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract');
      cy.get('#CUR-projectId-input').should('have.value', 'Contract12345');
      cy.get('#CUR-XanMLNZY').should('have.text', 'Royalty');

      // validate on index page
      cy.get('#CUR-wOfZbPpM').click().wait(3000);
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Creator').should('be.visible');

      // Update Contract    
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').click().wait(1000);
      cy.get('#CUR-tYltRUcS').clear().type('A Smoke Contract update');
      cy.get('#CUR-projectId-input').clear().type('C123457');

      // save and validate updated data  
      cy.get('#CUR-TinbGPNU').click();
      cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract update');
      cy.get('#CUR-projectId-input').should('have.value', 'C123457');

      // validate on index page
      cy.get('#CUR-wOfZbPpM').click().wait(3000);
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible');

      // delete contract on edit page
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').click().wait(1000);
      cy.get('#CUR-EDDJtFXV').click();
      cy.get('#CUR-SIepMXur').click().wait(1000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Mechanical Contracts Create, Read, Update and Delete Functions
  it('Smoke-Mechanical-Contracts-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-contracts > a').click();
      cy.get('#sidebar-mechanicals > a').click();

      // Mechanical Page Content Validation
      cy.get('#CUR-nAjCXYYG').should('have.text', 'Mechanical Contracts');
      cy.get('#CUR-IPEEOupo').should('be.visible');
      cy.get('#CUR-UDpJJUhA').should('be.enabled');
      cy.get('#CUR-GqETKmnj').should('be.visible');
      cy.get('#CUR-xqVjxuMZ').should('be.visible');
      cy.get('#CUR-SOZjjcnO').should('be.visible');
      cy.get('#CUR-VmJCQpXn').should('be.visible');
      cy.get('#CUR-rmJHDCfY').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible'); // Complete
      cy.get('#contract-company-search-select > :nth-child(1) > .ui-select-search').should('be.visible'); // Company
      cy.get('#contract-contractCategories-search-select > :nth-child(1) > .ui-select-search').should('be.visible'); // Category
      cy.get('#CUR-uGIsUwPG').should('be.visible'); // Filter
      cy.get('.sorting_asc').should('have.text', 'Name');
      cy.get('#CUR-FmLOyUsD th').contains('Type').should('be.visible');
      cy.get('#CUR-FmLOyUsD th').contains('Categories').should('be.visible');
      cy.get('#CUR-FmLOyUsD th').contains('Created').should('be.visible');
      // @gelo - not in staging
      // cy.get('#CUR-FmLOyUsD th').contains('Status').should('be.visible');

      // Create Mechanical Contract
      cy.get('#CUR-UDpJJUhA').click().wait(1000);
      cy.get('#CUR-payee-select-field').clear().type('payee 2').wait(1000);
      cy.get('#CUR-eahYeMnc a').contains('zzz payee 2').first().click();
      cy.get('#CUR-GcRTTdNA').click().wait(1000);
      cy.get('#CUR-GcRTTdNA span span').contains('Test Pixel 1').click();
      cy.get('#CUR-tYltRUcS').clear().type('A Mechanical Smoke');
      cy.get('#CUR-dyWxzodj').click().clear().type('01/01/2022');
      cy.get('#CUR-TgDcnQlg').click();
      cy.get('#CUR-HCfjjYNb').click().clear().type('01/01/2023');
      cy.get('#CUR-TgDcnQlg').click();
      cy.get('#CUR-gaQtKgcB').clear().type('AM129203028');
      cy.get('.input-xs').click();
      cy.get('.input-xs').type('Creator').wait(1000);
      cy.get('#CUR-nxGGltrV div ul div span span').contains('Creator').click();
      cy.get('#CUR-projectId-input').clear().type('AMS10928272');
      cy.get('#CUR-isvSrjLA').click().wait(1000);
      cy.get('#CUR-isvSrjLA span span').contains('Home Currency').click();
      cy.get('#CUR-oaTCKDBN').clear().type('123456');
      cy.get('#CUR-ZxtyZCPP').click().wait(1000);
      cy.get('#CUR-ZxtyZCPP div ul li div span span').contains('Yearly').first().click();
      cy.get('#CUR-XAgXnZFz').clear().type('50');
      cy.get('#CUR-pLtIIIAd').clear().type('10');
      cy.get('#CUR-BIaDTDYH > .form-control').click();
      cy.get('#CUR-aXNqZBBZ').click();
      cy.get('#CUR-XYgdzizn').click();
      cy.get('contract-mechanical-contract-row .contract-terms > :nth-child(1) > :nth-child(2) > :nth-child(3) > input').clear().type('100');
      cy.get('#CUR-TinbGPNU').click().wait(2000); // Save Button

      // Validate Created Data on edit page
      cy.get('.alert-success').should('be.visible').contains('Contract successfully created');
      cy.get('#CUR-payee-select-field').should('have.value', 'zzz payee 2');
      cy.get('#CUR-GcRTTdNA > .ui-select-container > .ui-select-match > .btn-default').contains('Test Pixel 1').should('be.visible');
      cy.get('#CUR-tYltRUcS').should('have.value', 'A Mechanical Smoke');
      cy.get('#CUR-gaQtKgcB').should('have.value', 'AM129203028');
      // Validate Created Data on index page
      cy.get('#CUR-ekDjaNNY').click().wait(2000);
      cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke').should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Mechanical').first().should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Creator').should('be.visible');


      // Update Mechanical Contract on edit page
      cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke').click();
      cy.get('#CUR-tYltRUcS').clear().type('A Mechanical Smoke Update');
      cy.get('#CUR-TinbGPNU').click().wait(2000); // Save Button

      // Validate Updated Data on edit and index page
      cy.get('.alert-success').should('be.visible').contains('Contract successfully saved');
      cy.get('#CUR-tYltRUcS').should('have.value', 'A Mechanical Smoke Update');
      cy.get('#CUR-ekDjaNNY').click().wait(2000);
      cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke Update').should('be.visible');

      // Delete Mechanical Contract
      cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke Update').click();
      cy.get('#CUR-EDDJtFXV').click();
      cy.get('#CUR-SIepMXur').click().wait(2000);
      cy.get('.alert-success').should('be.visible').contains('Contract successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETE : Testing Composers Create, Read, Update and Delete Functions
  it('Smoke-Composers-End2End-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      // Set up variables
      const composerName = 'Smoke Test Composer-' + Date.now();

      // Navigate to Composer Select Page
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-composers > a').click();

      // Validate Composer Select Page
      cy.get('#CUR-NGqqjbFT').should('have.text', 'Composers');
      cy.get('#CUR-ucZUtjNV').should('be.visible');
      cy.get('#CUR-xRrQkQuq > .pg-search').should('be.visible');
      cy.get('#CUR-uUKVnFba').should('be.visible').should('have.text', ' Export');
      cy.get('#CUR-eTaahVPO').should('be.visible').should('have.text', ' Import');
      cy.get('#CUR-FuVciLZH').should('be.visible').contains('Delete');
      cy.get('#CUR-KSqmmqMO').should('be.visible').should('have.text', ' Create');
      cy.get('#CUR-BHqUuhJj').should('be.visible').contains('Composers');
      cy.get('.sorting_asc').should('be.visible').should('have.text', 'Name');
      cy.get('thead > tr > :nth-child(3)').should('be.visible').should('have.text', 'CAE');
      cy.get('thead > tr > :nth-child(4)').should('be.visible').should('have.text', 'Created');
      cy.get('.pagination > :nth-child(1) > span').should('be.visible').should('have.text', '«');
      cy.get('.pagination > .ng-scope > .ng-binding').should('be.visible').should('have.text', '1');
      cy.get('.pagination > :nth-child(3) > span').should('be.visible').should('have.text', '»');
      cy.get('#CUR-LqwYOLQU').should('be.visible').should('have.text', 'Showing 25 Per Page  |');
      cy.get('#CUR-LEYMBPSy').should('be.visible').should('have.text', 'Show All');

      // Click Create Button
      cy.get('#CUR-KSqmmqMO').click();

      // Validate create composer page
      cy.get('#CUR-pVNhgltH').should('be.visible').should('have.text', 'Overview');
      cy.get('#CUR-smkapbFG').should('be.visible').contains('Overview');
      cy.get('#CUR-RZmpjwQE').should('be.visible').contains('Party ID');
      cy.get('#CUR-nbiKXCsP').should('be.visible').should('be.disabled');
      cy.get('#CUR-KtaROuOK').should('be.visible').should('have.text', 'Name');
      cy.get('#CUR-xsBQITjy').should('be.visible');
      cy.get('#CUR-ifHNbXNd').should('be.visible').contains('Foreign ID');
      cy.get('#CUR-PznCFrfI').should('be.visible');
      cy.get('#CUR-HZHuhJGz').should('be.visible').should('have.text', 'First Name');
      cy.get('#CUR-TegBJoBK').should('be.visible');
      cy.get('#CUR-eUymJsSE').should('be.visible').should('have.text', 'Middle Names');
      cy.get('#CUR-DrmeRXPD').should('be.visible');
      cy.get('#CUR-XlURFkkQ').should('be.visible').should('have.text', 'Surname');
      cy.get('#CUR-JRzrthyU').should('be.visible');
      cy.get('#CUR-TrDBODzi').should('be.visible').should('have.text', 'CAE Number');
      cy.get('#CUR-BbMNJqNK').should('be.visible');
      cy.get('publisher-select-field').should('be.visible');

      // Enter create composer data
      cy.get('#CUR-xsBQITjy').clear().type(composerName);
      cy.get('#CUR-PznCFrfI').clear().type('111');
      cy.get('#CUR-TegBJoBK').clear().type('Smoke');
      cy.get('#CUR-DrmeRXPD').clear().type('B');
      cy.get('#CUR-JRzrthyU').clear().type('Composer');
      cy.get('#CUR-BbMNJqNK').clear().type('123');
      cy.typeAheadSelection('tes', 'test publisher');

      // Save Composer & test response
      cy.get('#CUR-rExQKhmY').click();
      cy.get('.alert-success').should('be.visible').contains('composer successfully created');

      // Verify composer edit page with saved data 1
      cy.get('#CUR-nbiKXCsP').should('be.visible').should('be.disabled');
      cy.get('#CUR-xsBQITjy').should('have.value', composerName);
      cy.get('#CUR-PznCFrfI').should('have.value', '111');
      cy.get('#CUR-TegBJoBK').should('have.value', 'Smoke');
      cy.get('#CUR-DrmeRXPD').should('have.value', 'B');
      cy.get('#CUR-JRzrthyU').should('have.value', 'Composer');
      cy.get('#CUR-BbMNJqNK').should('have.value', '123');
      cy.get('.row > .form-group > .form-control').should('have.value', 'test publisher');

      // Navigate to composer select page
      cy.get('#CUR-NycXRuxX').click();

      // Find and click newly created composer
      cy.selectScreenFind(composerName);

      // Update composer data
      cy.get('#CUR-xsBQITjy').clear().type(composerName + ' Changed');
      cy.get('#CUR-PznCFrfI').clear().type('222');
      cy.get('#CUR-TegBJoBK').clear().type('Smoke Changed');
      cy.get('#CUR-DrmeRXPD').clear().type('C');
      cy.get('#CUR-JRzrthyU').clear().type('Composer Changed');
      cy.get('#CUR-BbMNJqNK').clear().type('321');
      cy.typeAheadSelection('lin', 'Linking to Publisher'); // @todo !! Why does this only work on first two in dropdown

      // Save Composer & test response
      cy.get('#CUR-rExQKhmY').click();
      cy.get('.alert-success').should('be.visible').contains('Composer successfully saved');

      // Verify composer edit page with saved data 2
      cy.get('#CUR-nbiKXCsP').should('be.disabled');
      cy.get('#CUR-xsBQITjy').should('have.value', composerName + ' Changed');
      cy.get('#CUR-PznCFrfI').should('have.value', '222');
      cy.get('#CUR-TegBJoBK').should('have.value', 'Smoke Changed');
      cy.get('#CUR-DrmeRXPD').should('have.value', 'C');
      cy.get('#CUR-JRzrthyU').should('have.value', 'Composer Changed');
      cy.get('#CUR-BbMNJqNK').should('have.value', '321');
      cy.get('.row > .form-group > .form-control').should('have.value', 'Linking to Publisher');

      // Click through delete workflow and verify deletion
      cy.get('#CUR-JaWdFtZJ').contains('Delete').click();
      cy.get('#CUR-mtUbndiF').should('be.visible');
      cy.get('#CUR-gicTyKvK > p').should('have.text', 'Are you sure you want to delete this composer? This cannot be undone.');
      cy.get('#CUR-bcgdhSSZ').contains('Delete').click().wait(2000);
      cy.get('.alert-success').should('be.visible').contains('Composer successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Publishers Create, Read, Update and Delete Functions
  it('Smoke-Publisher-End2End-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-publishers > a').click();

      // Index Page Content validations
      cy.get('#CUR-WPeTuqhB').should('be.visible');
      cy.get('#CUR-qSMNNTsL').should('be.visible');
      cy.get('#CUR-cUnwntgQ').should('be.visible');
      cy.get('#CUR-cRnLChHq > .fa').should('be.visible');
      cy.get('#CUR-gzVjvyDf').should('be.enabled');
      cy.get('#CUR-IdTyYZVz').should('be.visible');
      cy.get('#CUR-UBgtBBTg th').contains('Name').should('be.visible');
      cy.get('#CUR-UBgtBBTg th').contains('CAE').should('be.visible');
      cy.get('#CUR-UBgtBBTg th').contains('Created').should('be.visible');
      cy.get('#CUR-UyCYXogv').should('be.visible');
      cy.get('#CUR-ZlQYpBSV').should('be.visible');

      // Input on edit page (create data)
      cy.get('#CUR-gzVjvyDf').click();
      cy.get('#CUR-uwDhIFdL').type('A Publisher Smoke');
      cy.get('#CUR-jBtFftsd').type('1245678');
      cy.get('#CUR-YGFKkpxE').type('098765');

      // Save and validate on edit page
      cy.get('#CUR-dWTsVAEi').click().wait(1000);
      // cy.get('.pgn > .alert').should('be.visible');
      // cy.get('.pgn > .alert').should('have.text', '×Closepublisher successfully created');
      // cy.get('.alert-success').should('be.visible').contains('Publisher successfully created');
      cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke');
      cy.get('#CUR-jBtFftsd').should('have.value', '1245678');
      cy.get('#CUR-YGFKkpxE').should('have.value', '098765');

      // Validate data on index page
      cy.get('#CUR-kftJkCAH').click();
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').should('be.visible');
      cy.get('#CUR-UBgtBBTg span').contains('098765').should('be.visible');

      // update data on edit page
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').click();
      cy.get('#CUR-uwDhIFdL').clear().type('A Publisher Smoke Update');
      cy.get('#CUR-jBtFftsd').clear().type('ABC1245678');
      cy.get('#CUR-YGFKkpxE').clear().type('ABC098765');
      cy.get('#CUR-INFEeFLF input').type('Gelo Test').wait(1000);
      cy.get('#CUR-INFEeFLF strong').contains('Gelo Test').click();

      // save and validate updated data on edit page
      cy.get('#CUR-dWTsVAEi').click().wait(1000);
      // cy.get('.pgn > .alert').should('be.visible');
      // cy.get('.pgn > .alert').should('have.text', '×ClosePublisher successfully saved');
      cy.get('.alert-success').should('be.visible').contains('Publisher successfully saved');
      cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke Update');
      cy.get('#CUR-jBtFftsd').should('have.value', 'ABC1245678');
      cy.get('#CUR-YGFKkpxE').should('have.value', 'ABC098765');

      // validate updated data on index page
      cy.get('#CUR-kftJkCAH').click();
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').should('be.visible');
      cy.get('#CUR-UBgtBBTg span').contains('ABC098765').should('be.visible');

      // delete data
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').click();
      cy.get('#CUR-mvVYCWXR').click();
      cy.get('#CUR-LnaBreyR').click();
      // cy.get('.alert').should('be.visible');
      // cy.get('.alert').should('have.text', '×ClosePublisher successfully deleted');
      // cy.get('.alert-success').should('be.visible').contains('Publisher successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Tracks Create, Read, Update and Delete Functions
  it('Smoke-Tracks-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-tracks > a').click();

      // Page content validation
      cy.get('#CUR-EbAPTKvy').should('be.visible');
      cy.get('#CUR-KcppnpIT').should('be.visible');
      cy.get('#CUR-FOxFDCYV').should('be.visible');
      cy.get('#CUR-qPFhbvpu').should('be.visible');
      cy.get('#CUR-DsaOOCyn').should('be.visible');
      cy.get('#CUR-ImZPJRMB').should('be.visible');
      cy.get('#CUR-kEbZqEXE > .ui-select-container').should('be.visible');
      cy.get('#CUR-xLpjbxhT > .ui-select-container > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#CUR-DbLvGukz').should('be.visible');
      cy.get('#CUR-rfxIOvip').should('be.visible');
      cy.get('.col-xs-9 > .form-control').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-filter-label-textbox').should('be.visible');
      cy.get('#CUR-filter-company-select > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#CUR-filter-artist-textbox').should('be.enabled');
      cy.get('#CUR-filter-mechnicalContracts-select > :nth-child(1)').should('be.visible');
      cy.get('#CUR-uiaJvCvp').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Title').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Version').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Artist').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('ISRC').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Created').should('be.visible');

      // Create Track
      cy.get('#CUR-ImZPJRMB').click();
      cy.wait(1000);
      cy.get('#CUR-BpKgzLNW').should('be.visible');
      cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke');
      cy.get('#CUR-kQslEfhD').clear().type('v123');
      cy.get('#CUR-MbNpDepo').clear().type('Gelo');
      cy.get('#CUR-YwEVxbHr').clear().type('Tracks12345');
      cy.get('#CUR-projectId-input').clear().type('Tracks12345');
      cy.get('.input-xs').click().wait(2000); // Catalogue Groups
      cy.get('#CUR-vcYOVxje span').contains('CAT 1').click();
      cy.get('#CUR-cOegSfmz').clear().type('Smoke001');
      cy.get('#CUR-XGvXfkQh').clear().type('GeloTest');
      cy.get('#CUR-FALBZvqH').clear().type('1234');
      cy.get('#CUR-egOoZEpB').clear().type('120');
      cy.get('#CUR-gXGXUiea').click();
      cy.get('#CUR-lwiBgRup').click();
      // cy.get('contract-select-field.ng-isolate-scope > .row > .form-group > .form-control').clear().type('Test Gelo 100');
      cy.get('contract-select-field.ng-isolate-scope > .row > .form-group > input').clear().type('Test Gelo 100').wait(2000);
      cy.get('.ng-binding > strong').click();


      // save and validate created data on edit page
      cy.get('#CUR-UaNimHCt').click().wait(1000); // Save Button
      // cy.get('.alert-success').should('be.visible').contains('Track successfully created');
      cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke');
      cy.get('#CUR-kQslEfhD').should('have.value', 'v123');
      cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo');
      cy.get('#CUR-YwEVxbHr').should('have.value', 'Tracks12345');
      cy.get('#CUR-projectId-input').should('have.value', 'Tracks12345');
      cy.get('#CUR-HtCcvMVh').click(); // Go to Rights Tab
      cy.get('contract-select-field.ng-isolate-scope > .row > .form-group > .form-control').should('have.value', 'Test Gelo 100');

      // validate created data on index page
      cy.get('#CUR-MwPfmXzd').click().wait(2000); // Go back to index page
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('v123').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('Gelo').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('Smoke001').should('be.visible');

      // Update Tracks on edit page
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').click();
      cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke Update');
      cy.get('#CUR-kQslEfhD').clear().type('v1236789');
      cy.get('#CUR-MbNpDepo').clear().type('Gelo1234');
      cy.get('#CUR-YwEVxbHr').clear().type('098765');
      cy.get('#CUR-projectId-input').clear('T');
      cy.get('#CUR-projectId-input').type('T09876');

      // save and validate updated data on edit page
      cy.get('#CUR-UaNimHCt').click().wait(1000); // Save Button
      // cy.get('.alert-success').should('be.visible').contains('Track successfully saved');
      cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke Update');
      cy.get('#CUR-kQslEfhD').should('have.value', 'v1236789');
      cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo1234');
      cy.get('#CUR-YwEVxbHr').should('have.value', '098765');
      cy.get('#CUR-projectId-input').should('have.value', 'T09876');

      // validate updtaed data on index page     
      cy.get('#CUR-MwPfmXzd').click().wait(1000);// Go back to index page
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('v1236789').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('Gelo1234').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('Smoke001').should('be.visible');

      // delete track on edit page
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').click();
      cy.get('#CUR-YLCMDySu').click();
      cy.get('#CUR-tOCyBdOF').click();
      // cy.get('.alert-success').should('be.visible').contains('Track successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Releases Create, Read, Update and Delete Functions
  it('Smoke-Releases-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-releases > a').click();

      // validate index page content
      cy.get('#CUR-cFpKxgfD').should('be.visible');
      cy.get('#CUR-cBzPNSYL').should('be.visible');
      cy.get('#CUR-TCRcrdqE').should('be.visible');
      cy.get('#CUR-zWopaSgP').should('be.visible');
      cy.get('#CUR-qIHIFTHv').should('be.visible');
      cy.get('#CUR-wACALinu').should('be.visible');
      cy.get('#CUR-nsurszij').should('be.visible');
      cy.get('#CUR-boTNxWbt').should('be.visible');
      cy.get('#CUR-hrSUzIbD').should('be.visible');
      cy.get('#CUR-qonjDtEo').should('be.visible');
      cy.get('.col-xs-9 > .form-control').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-filter-label-textbox').should('be.visible');
      cy.get('#CUR-filter-company-select').should('be.visible');
      cy.get('#CUR-filter-artist-textbox').should('be.visible');
      cy.get('#CUR-filter-distributionChannel-select').should('be.visible');
      cy.get('#CUR-filter-format-select').should('be.visible');
      cy.get('#CUR-nVfWuehA').should('be.visible');
      cy.get('#CUR-HZtPrtxX').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Title').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Artist').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Cat No').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Barcode').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Format').should('be.visible');

      // create on edit page and input fields 
      cy.get('#CUR-wACALinu').click();
      cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke ');
      cy.get('#CUR-bhQcVumh').clear().type('v123');
      cy.get('#CUR-rsNOsbpf').click();
      cy.get('#CUR-fzTwggPi').clear().type('gelo12345');
      cy.get('#CUR-gjpsiQTF').clear().type('test12345');
      cy.get('#CUR-projectId-input').clear().type('ProID12345');
      cy.get('#CUR-VBAWXqzd').click().wait(1000);
      cy.get('#CUR-VBAWXqzd span').contains('Digital').click();
      cy.get('#CUR-FjplwIxU').click().wait(1000);
      cy.get('#CUR-FjplwIxU span').contains('CD').click();
      cy.get('#CUR-AjGvMDtA').click().wait(1000);
      cy.get('#CUR-AjGvMDtA span').contains('Full Price').click();
      cy.get('#CUR-YIiKGOHt').clear().type('123');
      cy.get('#CUR-LsLPGmQZ').clear().type('TEST1001');
      cy.get('#CUR-QkNcjbSR').clear().type('12345098751');
      cy.get('#CUR-SEeQyaaO').clear().type('test smoke');
      cy.get('#CUR-rJbBtFhO').click();
      cy.get('#CUR-rJbBtFhO').clear().type('01/02/2023');
      cy.get('#CUR-gnUaOjad').click().wait(1000);
      cy.get('#CUR-gnUaOjad span').contains('CAT 1').click();
      cy.get('#CUR-MxSnludE').click().wait(1000); // Click Rights Tab
      cy.get('#CUR-LkJBDvYJ').click();
      cy.get('contract-select-field.ng-isolate-scope > .row > .form-group > input').clear().type('test gelo 100').wait(1000);
      cy.get('#CUR-sMJILcqb strong').contains('Test Gelo 100').click();

      // save and validate created data on edit page
      cy.get('#CUR-NVcvbMbM').click().wait(2000); // Save Button
      // cy.get('.alert-success').should('be.visible').contains('Release successfully created');
      cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke');
      cy.get('#CUR-bhQcVumh').should('have.value', 'v123');
      cy.get('#CUR-fzTwggPi').should('have.value', 'gelo12345');
      cy.get('#CUR-gjpsiQTF').should('have.value', 'test12345');
      cy.get('#CUR-projectId-input').should('have.value', 'ProID12345');
      cy.get('#CUR-EOPFqKqU').should('have.text', 'CD');
      cy.get('#CUR-LjBshnBd').should('have.text', 'Full Price');
      cy.get('#CUR-YIiKGOHt').should('have.value', '123');

      // validate created data on index page    
      cy.get('#CUR-NVopGmjV').click().wait(8000);
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('gelo12345').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('TEST1001').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('12345098751').should('be.visible');

      // update on edit page and input fields
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click();
      cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke Update');
      cy.get('#CUR-bhQcVumh').clear().type('v0987');
      cy.get('#CUR-fzTwggPi').clear().type('gelo09876');
      cy.get('#CUR-projectId-input').clear().type('Smoke12098');
      cy.get('#CUR-LsLPGmQZ').clear().type('SMOKE0987');

      // save and validate updated data on edit page
      cy.get('#CUR-NVcvbMbM').click().wait(2000); // Save button
      // cy.get('.alert-success').should('be.visible').contains('Release successfully saved');
      cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke Update');
      cy.get('#CUR-bhQcVumh').should('have.value', 'v0987');
      cy.get('#CUR-fzTwggPi').should('have.value', 'gelo09876');
      cy.get('#CUR-gjpsiQTF').should('have.value', 'test12345');
      cy.get('#CUR-projectId-input').should('have.value', 'Smoke12098');

      // validate updated data on index page
      cy.get('#CUR-NVopGmjV').click().wait(8000);
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('gelo09876').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('SMOKE0987').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('12345098751').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('CD').should('be.visible');

      // Delete Release 
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').click();
      cy.get('#CUR-IORvSKtL').click();
      cy.get('#CUR-NOYiTdFv').click().wait(1000);
      // cy.get('.alert-success').should('be.visible').contains('Release successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Period Create, Read, Update and Delete Functions
  it('Smoke-Period-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-statements > a').click();
      cy.get('#sidebar-periods > a').click();
      cy.get('#CUR-gYxIZkCO').click();

      // create page
      cy.get(':nth-child(2) > .col-xs-12 > :nth-child(1) > .form-control').clear().type('A Period Test');
      cy.get(':nth-child(3) > .ui-select-container > .ui-select-match > .btn-default').wait(3000).click(); // Accounting Period Type
      cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); // Accounting Type DD
      cy.get(':nth-child(4) > .ui-select-container > .ui-select-match > .btn-default').click().wait(3000); // Year
      cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][2]').click(); // Year Selection
      cy.get(':nth-child(5) > .ui-select-container > .ui-select-match > .btn-default').click().wait(3000); // Accounting Period
      cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][2]').click().wait(2000); // Accounting period selection

      // Start Date
      cy.get('.form-group:nth-child(6) .form-control').click();
      cy.get('.form-group:nth-child(6) .form-control').click();
      cy.get('.form-group:nth-child(6) .form-control').type('01/07/2022');
      // End Date
      cy.get('.form-group:nth-child(7) .form-control').click();
      cy.get('.form-group:nth-child(7) .form-control').click();
      cy.get('.form-group:nth-child(7) .form-control').type('31/12/2022');
      // Sales Date
      cy.get('.form-group:nth-child(8) .form-control').click();
      cy.get('.form-group:nth-child(8) .form-control').click();
      cy.get('.form-group:nth-child(8) .form-control').type('31/12/2022');

      cy.get('.row.m-t-20 > .col-xs-12 > .btn').click(); // Click Next

      // Select Sales
      cy.get('.table-responsive:nth-child(5) .select-all').click();
      cy.get('.btn-success').click();
      cy.wait(3000);
      cy.get('.row.m-t-20 > .col-xs-12 > .btn').contains('Next').click();// Click Next
      cy.wait(3000);

      // Select Cost
      cy.get('.ng-scope:nth-child(1) > .v-align-middle > #cost-select-').click();
      cy.get('.btn-success').click().wait(10000);
      cy.get('.col-xs-12 > .btn-primary').click().wait(10000); // Click Calculate

      // validate created data on index page
      cy.get('#CUR-juUorLcH').click();
      cy.get('#CUR-FpasAYSv a').contains('A Period Test').should('be.visible');
      cy.get('#CUR-FpasAYSv td').contains('2023').first().should('be.visible');
      cy.get('#CUR-FpasAYSv td').contains('H1').should('be.visible');
      cy.get('#CUR-FpasAYSv span').contains('Processing').should('be.visible');

      // validate created data on period page
      cy.get('#CUR-FpasAYSv a').contains('A Period Test').click()
      cy.get('#CUR-AkesVxMP').then(($Gross) => {

        if ($Gross.is(':visible')) {
          cy.get('#CUR-AkesVxMP').should('be.visible').wait(user.time);
          cy.log('Validating Element')
        } else {
          cy.get('#CUR-AkesVxMP').should('be.visible').wait(user.time)

        }
      })
      // .wait(70000);
      cy.get('#CUR-tXTGsrcQ').contains('Gross Revenue >').should('be.visible');
      cy.get('#CUR-bxPoRhTC').contains('Net Payout >').should('be.visible');
      cy.get('#CUR-XHVnixfn').contains('Gross Costs >').should('be.visible');
      cy.get('#CUR-hSDHlghB').contains('Recharged Costs >').should('be.visible');
      cy.get('#CUR-XjZWWqsL').contains('Input Units >').should('be.visible');
      cy.get('#CUR-RYQoItzw').contains('Input Sales Lines >').should('be.visible');

      // validate statement created
      cy.get('#CUR-wkHjTyNE').click().wait(5000);
      cy.get('#CUR-HNSDHMbl a').contains('2023 - H1: Test Gelo 100').should('be.visible');

      // update on edit page period
      cy.get('#CUR-HLUNTSif').click().wait(5000);
      cy.get(':nth-child(2) > .col-xs-12 > :nth-child(1) > .form-control').click().clear().type('A Period Test Update');
      cy.get('.row.m-t-20 > .col-xs-12 > .btn').click();
      cy.get(':nth-child(3) > .col-xs-12 > .btn-complete').click();
      cy.get('.col-xs-12 > .btn-primary').click();

      // validate updated data on period page
      cy.get('#CUR-FpasAYSv a').contains('A Period Test Update').click()
      cy.get('#CUR-TRIZDfAQ').then(($update) => {

        if ($update.is(':visible')) {
          cy.log('Processing Button is still Visible').wait(user.time);
        } else {
          cy.get('#CUR-TRIZDfAQ').should('be.visible').wait(user.time);

        }
      })


      // validate updated data on index page
      cy.get('#CUR-cxqkIWfA').click().wait(3000);
      cy.get('#CUR-FpasAYSv a').contains('A Period Test Update').should('be.visible');
      cy.get('#CUR-FpasAYSv span').contains('Complete').should('be.visible');

      // delete data
      cy.get('#period-select-0').check();
      cy.get('#CUR-knYbtmzh').click();
      cy.get('#CUR-bsqGxjeL').click().wait(5000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Statement Create, Read, Update and Delete Functions
  it('Smoke-Statements-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-statements > a').click();
      cy.get('#sidebar-statements-submenu > a').click();

      // index page validation
      cy.get('#CUR-WBKJWKoQ').should('be.visible');
      cy.get('#CUR-OvtHLYJe').should('be.visible');
      cy.get('#CUR-DqaNLEOm').should('be.visible');
      cy.get('#CUR-NsfLNPuP').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Name').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Gross Sales').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Sales').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Created').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Status').should('be.visible');

      // create statement via period
      cy.get('#sidebar-periods > a').click();
      cy.get('#CUR-gYxIZkCO').click();
      cy.get(':nth-child(2) > .col-xs-12 > :nth-child(1) > .form-control').type('A Statement Smoke'); // Name
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="btn btn-default form-control ui-select-toggle"][2]').click(); // Accounting Period Type
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="ui-select-choices-row-inner"][1]').click(); // Accounting Period Type DD Selection
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="btn btn-default form-control ui-select-toggle"][3]').click(); // Year
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="ui-select-choices-row-inner"][1]').click(); // Year DD
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="btn btn-default form-control ui-select-toggle"][4]').click(); // Accounting Period
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="ui-select-choices-row-inner"][1]').click(); //  Accounting Period DD selection
      // date picker
      cy.get('.form-group:nth-child(6) .form-control').click().clear().type('01/07/2022');
      cy.get('.form-group:nth-child(7) .form-control').click().clear().type('31/12/2022');
      cy.get('.form-group:nth-child(8) .form-control').click().clear().type('31/12/2022');
      cy.get('.row.m-t-20 > .col-xs-12 > .btn').click(); // Click Next
      // selecting sales
      cy.get('.table-responsive:nth-child(5) .select-all').click();
      cy.get('.btn-success').click().wait(3000);
      cy.get('.row.m-t-20 > .col-xs-12 > .btn').contains('Next').click().wait(3000);// Click Next
      // Select Cost
      cy.get('.ng-scope:nth-child(1) > .v-align-middle > #cost-select-').click();
      cy.get('.btn-success').click().wait(3000);
      cy.get('.col-xs-12 > .btn-primary').click().wait(3000); // Click Calculate

      // validate statement in period
      cy.get('#CUR-ilajBlTY a').contains('A Statement Smoke').click().then(($statement) => {

        if ($statement.is(':visible')) {
          cy.log('Processing Button is still Visible').wait(user.time);
        } else {
          cy.get('#CUR-ilajBlTY a').should('be.visible').click().wait(user.time);

        }
      })
      cy.get('#CUR-wkHjTyNE').click().wait(2000);
      cy.get('#CUR-IxnzJpGe a').contains('2024 - Y1: Test Gelo 100').should('be.visible');

      // validate statement index page
      cy.get('#sidebar-statements-submenu > a').click();
      cy.get('#CUR-WBKJWKoQ').clear().type('Test Gelo 100');
      cy.get('#CUR-bzBwwprg').click();
      cy.get('#CUR-bkUowpSN a').contains('2024 - Y1: Test Gelo 100').should('be.visible');

      // add statement on period
      cy.get('#sidebar-periods > a').click();
      cy.get('#CUR-ilajBlTY a').contains('A Statement Smoke').click();
      cy.get('#CUR-yJluSXBB').click();
      cy.get('#CUR-FYPxzvoA').click();
      cy.get('.row > .form-group > .form-control').clear().type('test gelo 6').wait(1000);
      cy.get('.ng-binding > strong').click();
      cy.get('#CUR-nqObrHgU').click().wait(3000);
      cy.get('#CUR-IxnzJpGe a').contains('2024 - Y1: Test Gelo 6').should('be.visible');
      cy.get('#CUR-IxnzJpGe a').contains('2024 - Y1: Test Gelo 6').click().then(($2024) => {

        if ($2024.is(':visible')) {
          cy.log('Processing Button is still Visible').wait(user.time);
        } else {
          cy.get('#CUR-IxnzJpGe a').should('be.visible').click().wait(user.time);

        }
      })
      // Validate that Statement is on Statement index page 
      cy.get('#sidebar-statements-submenu > a').click();
      cy.get('#CUR-WBKJWKoQ').clear().type('Gelo 6');
      cy.get('#CUR-bzBwwprg').click();
      cy.get('#CUR-bDVEURjD a').contains('2024 - Y1: Test Gelo 6').should('be.visible');
      cy.get('#CUR-VFrbmBtF').click();


      // Go to Periods and Delete
      cy.get('#sidebar-periods > a').click();
      cy.get('#period-select-0').check();
      cy.get('#CUR-knYbtmzh').click();
      cy.get('#CUR-bsqGxjeL').click().wait(20000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Costs Create, Read, Update and Delete Functions
  it('Smoke-Costs-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-sales-files > a').click();
      cy.get('#sidebar-costs > a').click();

      // Cost Page Content Validation
      cy.get('#CUR-SSvIUIOD').should('be.visible');
      cy.get('#CUR-AROTYiOp').should('be.visible');
      cy.get('#CUR-Wyuhdneo').should('be.visible');
      cy.get('#CUR-YacstJXY').should('be.visible');
      cy.get('#CUR-AipxbKdB').should('be.visible');
      cy.get('#CUR-PmBsPhdG').should('be.visible');
      cy.get('#CUR-bSMhGqpM').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Name').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Amount').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Description').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Target Period').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Type').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Created At').should('be.visible');
      cy.get('#CUR-cAZqlMux th').contains('Reported').should('be.visible');

      // Create Cost
      cy.get('#CUR-PmBsPhdG').click();
      cy.get('#CUR-fapHAIUM').type('A Cost Smoke');
      cy.get('#CUR-QQbgsijo').type('123');
      cy.get('#CUR-hvMRPWrI').click();
      cy.get('#CUR-hvMRPWrI').type('11/11/2022');
      cy.get('#CUR-wuFoOJlb').click();
      cy.get('#CUR-byDkVIRe > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-byDkVIRe span').contains('Artwork').click();
      cy.get('#CUR-ZBPyVsQy > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-ZBPyVsQy span').contains('World').click();
      cy.get('#CUR-vMuHEYmk').type('12345');
      cy.get('#CUR-jrgAFiXF').type('test');
      cy.get('#CUR-dPyhOWpT').type('this is a test');

      // save and validate created data
      cy.get('#CUR-xMDvxoWP').click();// Save Button
      // cy.get('.pgn > .alert').should('be.visible');
      // cy.get('.pgn > .alert').should('have.text', '×CloseCost successfully created');
      cy.get('#CUR-fapHAIUM').should('have.value', 'A Cost Smoke');
      cy.get('#CUR-QQbgsijo').should('have.value', '123');
      cy.get('#CUR-hvMRPWrI').should('have.value', '11/11/2022');
      cy.get('#CUR-byDkVIRe span').contains('Artwork').should('be.visible');
      cy.get('#CUR-UcUcyYTp').should('have.text', 'World');
      cy.get('#CUR-vMuHEYmk').should('have.value', '12345');
      cy.get('#CUR-jrgAFiXF').should('have.value', 'test');
      cy.get('#CUR-dPyhOWpT').should('have.value', 'this is a test');

      // validate created data on index page
      cy.get('#CUR-ZSOjMzJH').click();
      cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke').should('be.visible');
      cy.get('#CUR-hyXIbMwu td').contains('123').should('be.visible');
      cy.get('#CUR-hyXIbMwu td').contains('this is a test').should('be.visible');
      cy.get('#CUR-hyXIbMwu td').contains('test').should('be.visible');
      cy.get('#CUR-hyXIbMwu td').contains('Artwork').should('be.visible');

      // update data on edit page
      cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke').click();
      cy.get('#CUR-fapHAIUM').clear().type('A Cost Smoke update');
      cy.get('#CUR-QQbgsijo').clear().type('55');
      cy.get('#CUR-vMuHEYmk').clear().type('09876');

      // validate updated data on edit page
      cy.get('#CUR-xMDvxoWP').click();// Save Button
      // cy.get('.pgn > .alert').should('be.visible');
      // cy.get('.pgn > .alert').should('have.text', '×CloseCost successfully saved');
      cy.get('#CUR-fapHAIUM').should('have.value', 'A Cost Smoke update');
      cy.get('#CUR-QQbgsijo').should('have.value', '55');
      cy.get('#CUR-vMuHEYmk').should('have.value', '09876');

      // validate updated data on index page
      cy.get('#CUR-ZSOjMzJH').click();
      cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke update').should('be.visible');
      cy.get('#CUR-hyXIbMwu td').contains('55').should('be.visible');
      cy.get('#CUR-hyXIbMwu td').contains('test').should('be.visible');

      // Delete Cost
      cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke update').click();
      cy.get('#CUR-cpHMoyZc').click();
      cy.get('#CUR-zqfkAkIc').click();
      // cy.get('.pgn > .alert').should('be.visible');
      // cy.get('.pgn > .alert').should('have.text', '×CloseCost successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Sales Templates Create, Read, Update and Delete Functions
  it('Smoke-Sales-Templates-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-sales-files > a').click();
      cy.get('#sidebar-templates > a').click();


      cy.get('#CUR-kiMpkCSP > .btn').click();
      cy.get('#CUR-tHSGHnBz').click();

      // Calculation Tab
      cy.get('#CUR-xxVHzJFg').click();
      cy.get('#CUR-NJDqEPhR').click();
      cy.get('.col-sm-4 > .form-group > .form-control').select('string:Any');
      cy.get('.panel-body > .btn').click();
      cy.get('.ng-isolate-scope > .row > :nth-child(1) > .form-group > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#ui-select-choices-row-11-0 > .ui-select-choices-row-inner').click();
      cy.get('.ng-isolate-scope > .row > :nth-child(2) > .form-group > .form-control').clear('1');
      cy.get('.ng-isolate-scope > .row > :nth-child(2) > .form-group > .form-control').type('1');
      cy.get('.ng-isolate-scope > .row > :nth-child(3) > .form-group > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-12-8 > .ui-select-choices-row-inner').click();
      cy.get(':nth-child(5) > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-9-0 > .ui-select-choices-row-inner').click();


      cy.get('#CUR-EtCgEaNp').click();
      cy.get('#CUR-lDUnDkZE').type('A Template Smoke');
      cy.get('#CUR-DVIVtmuI').type('ATS');
      cy.get('#CUR-GHphjaeq').type('1');
      cy.get('#CUR-SeOCdrpE').type('1');
      cy.get('#CUR-qXfqrZTK').type('2');
      cy.get('input[type=file]').attachFile('smoke-sales-template.xlsx');
      cy.get('#CUR-MVMxRkBl').click().wait(8000); // Save Button

      // Setting Example Lines
      cy.get(':nth-child(2) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(2) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('sale date').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Sale Date').click();

      cy.get(':nth-child(3) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(3) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('source').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Source').first().click();

      cy.get(':nth-child(4) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(4) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('sub source').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Sub Source').click();

      cy.get(':nth-child(5) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(5) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('territory').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Territory').click();

      cy.get(':nth-child(6) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(6) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('distribution').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Distribution Channel').click();

      cy.get(':nth-child(7) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(7) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('configuration').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Configuration').click();

      cy.get(':nth-child(8) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(8) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('isrc').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('ISRC').click();

      cy.get(':nth-child(9) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(9) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('units').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Units').last().click();

      cy.get(':nth-child(10) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(10) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('gross').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Gross Amount').first().click();

      cy.get(':nth-child(11) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(11) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('net amount').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Net Amount').first().click();

      cy.get(':nth-child(12) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(12) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('per unit rate').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Per Unit Rate').click();

      cy.get(':nth-child(13) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(13) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('transaction date').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Transaction Date').click();

      cy.get('#CUR-MVMxRkBl').click().wait(2000); // Save Button

      // validate on index page
      cy.get('#CUR-pOyCFpuZ').click().wait(4000);
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').should('be.visible');
      cy.get('#CUR-WNCyYxcz span').contains('ATS').should('be.visible');

      // update template
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').click();
      cy.get('#CUR-lDUnDkZE').clear().type('A Template Smoke Update');
      cy.get('#CUR-DVIVtmuI').clear().type('STA');

      // save and validate on edit page
      cy.get('#CUR-MVMxRkBl').click().wait(2000);
      cy.get('#CUR-lDUnDkZE').should('have.value', 'A Template Smoke Update');
      cy.get('#CUR-DVIVtmuI').should('have.value', 'STA');

      // validate on index page
      cy.get('#CUR-pOyCFpuZ').click().wait(2000);
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').should('be.visible');
      cy.get('#CUR-WNCyYxcz span').contains('STA').should('be.visible');

      // delete
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').click().wait(2000);
      cy.get('#CUR-mZEcFCVq').click();
      cy.get('#CUR-GWPyNhGt').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Sales Ingestion Create, Read, Update and Delete Functions
  it('Smoke-Sales-Ingestion-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-sales-files > a').click();
      cy.get('#sidebar-sales-file-submenu > a').click();

      // index page content validation
      cy.get('#CUR-FHufgwGM').should('have.text', 'Valid');
      cy.get('#CUR-vwBFXAWO').should('have.text', 'Status');
      cy.get('#CUR-sSeLfdFL').should('have.text', 'Reported');
      cy.get('#CUR-gTNhalNj').should('have.text', 'Archived');
      cy.get('#CUR-ZYheIwqI').should('have.text', 'New');
      cy.get('#CUR-NlTTzTrO').should('be.visible');
      cy.get('#CUR-ivKvGcQl').should('be.visible');
      cy.get('#CUR-nBTrboeS').should('be.visible');
      cy.get('#CUR-riqaSlSH').should('be.visible');
      cy.get('#CUR-ofnmYZwF').should('be.visible');
      cy.get('#CUR-PNdYcPxE').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Name').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Invoice').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Target').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Account').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Gross').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Net').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Invalid Lines').should('be.visible');

      // create sales ingestion
      cy.get('#CUR-PNdYcPxE').click();
      cy.get('input[type=file]').attachFile('smoke-sales-publishing.xlsx');
      cy.wait(5000);
      cy.get('#CUR-aEbJeVnL').click();

      // validate data on index page
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').should('be.visible');
      // cy.get('#CUR-RKtAMVsX td').contains('456').should('be.visible');

      // sales page

      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click().then(($publishing) => {

        if ($publishing.is(':visible')) {
          cy.log('Processing Button is still Visible').wait(user.time);
        } else {
          cy.get('#CUR-RKtAMVsX a').should('be.visible').wait(user.time);

        }
      })
      cy.get('#CUR-tSDxRqMQ').click().wait(2000);
      cy.get('#CUR-DUdWDnqe').click().wait(5000);

      // update sales
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click().then(($sales) => {

        if ($sales.is(':visible')) {
          cy.log('Processing Button is still Visible').wait(user.time);
        } else {
          cy.get('#CUR-RKtAMVsX a').should('be.visible').wait(user.time);

        }
      })


      cy.get('#CUR-CormnEei').should('be.visible');
      cy.get('#CUR-JntuUeyO').click();
      cy.get('#CUR-uOyLTZEv').clear().type('smoke-sales-publishing testing');
      cy.get('#CUR-VcrTkCcj').click();

      cy.get('#CUR-QkoCHvTt').click().wait(2000);
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').should('be.visible').wait(5000);

      // delete sales
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').click().wait(5000);
      cy.get('#CUR-JntuUeyO').click().wait(5000);
      cy.get('#CUR-dYQCkJmQ').click().wait(5000);
      cy.get('#CUR-alQhgDPu').click().wait(5000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Configurations Create, Read, Update and Delete Functions
  it('Smoke-Configurations-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-settings > a').click();
      cy.get('#sidebar-settings-general > a').click();

      // configuration page content validation
      cy.get('#CUR-zfwLctsq').click();
      cy.get('#CUR-RUMGcfIR').contains('Currency').should('be.visible');
      cy.get('#CUR-SygJfpJW').contains('Accounting Period Types').should('be.visible');
      cy.get('#CUR-WiTwKpln').contains('Distribution Channels').should('be.visible');
      cy.get('#CUR-NcIEqMey').contains('Configurations').should('be.visible');
      cy.get('#CUR-zazhWYra').contains('Price Categories').should('be.visible');
      cy.get('#CUR-JtjtHBvs').contains('Catalogue Groups').should('be.visible');
      cy.get('#CUR-xgAYmZKX').contains('Cost Types').should('be.visible');
      cy.get('#CUR-dBjmMSky').contains('Sources').should('be.visible');
      cy.get('#CUR-FhiBtVul').contains('Payee Categories').should('be.visible');
      cy.get('#CUR-uIpxoudN').contains('Contract Categories').should('be.visible');

      // configuration page add data
      cy.get('#CUR-UXciuPMi').click().wait(1000);
      cy.get('[ng-repeat="type in displayAccountingPeriodTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-vanqVexK').click().wait(1000);
      cy.get('[ng-repeat="channel in displayDistributionChannels track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-nFeigaBb').click().wait(1000);
      cy.get('[ng-repeat="category in displayPriceCategories track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-PVapdTUI').click().wait(1000);
      cy.get('[ng-repeat="configuration in displayConfigurations track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-KIJKDlFj').click().wait(1000);
      cy.get('[ng-repeat="group in displayCatalogueGroups track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-VkmnVCYN').click().wait(1000);
      cy.get('[ng-repeat="source in displaySources track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-VBIPGqzW').click().wait(1000);
      cy.get('[ng-repeat="type in displayCostTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');

      cy.get('#CUR-GLPJtuem').click().wait(1000);
      cy.get('[ng-repeat="type in displayPayeeTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke Test');

      cy.get('#CUR-gVVhjIam').click().wait(1000);
      cy.get('[ng-repeat="type in displayContractTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').type('Smoke test');


      // Save and validate added data
      cy.get('#CUR-XbCaWLaC').click().wait(1000); // Save Button
      cy.get('.alert').should('be.visible');
      cy.get('.alert').should('have.text', '×CloseSettings successfully saved');

      // added content validation
      cy.get('[ng-repeat="type in displayAccountingPeriodTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="channel in displayDistributionChannels track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="category in displayPriceCategories track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="configuration in displayConfigurations track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="group in displayCatalogueGroups track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="source in displaySources track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="type in displayCostTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="type in displayPayeeTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke Test');
      cy.get('[ng-repeat="type in displayContractTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');



      // deletion of added data
      cy.get('[ng-repeat="type in displayPayeeTypes track by $index"][style=""] > .row > .col-xs-4 > .btn > .fa').click();
      cy.get('[ng-repeat="type in displayContractTypes track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="type in displayCostTypes track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="source in displaySources track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="group in displayCatalogueGroups track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="configuration in displayConfigurations track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="channel in displayDistributionChannels track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="category in displayPriceCategories track by $index"][style=""] > .row > .col-xs-4 > .btn > .fa').click();
      cy.get('[ng-repeat="type in displayAccountingPeriodTypes track by $index"][style=""] > .row > .col-xs-4 > .btn').click();


      cy.get('#CUR-XbCaWLaC').click();
      cy.get('#CUR-tVJNiQMy').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Users Create, Read, Update and Delete Functions
  it('Smoke-Users-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-settings > a').click();
      cy.get('#sidebar-users > a').click();

      // create admin user
      cy.get('#CUR-MEXvNKZp').click(); // Create Button
      cy.get('#CUR-NfuxyaRV > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-3-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com');
      cy.get('#CUR-RxSOwcRN').click(); // Save Button

      // save and validate created admin user on index page
      cy.get('#CUR-xQRKRMjR').click().wait(1000); // Save Button on Modal
      // cy.get('.alert-success').should('be.visible').contains('User successfully created and invite sent to their email');
      cy.get('#CUR-AArHwreX a').contains('aausertest@curve.com').should('be.visible');
      cy.get('#CUR-AArHwreX span').contains('Admin').should('be.visible');

      // delete admin data
      cy.get('#user-select-0').check();
      cy.get('#CUR-RWlxftDS').click();
      cy.get('#CUR-qmXpxFpo').click();

      // create standard user
      cy.get('#CUR-MEXvNKZp').click();
      cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com');

      // save validate created standard user on index page
      cy.get('#CUR-RxSOwcRN').click(); // Save Button
      cy.get('#CUR-xQRKRMjR').click().wait(1000); // Save Button on Modal
      // cy.get('.alert-success').should('be.visible').contains('User successfully created and invite sent to their email');
      cy.get('#CUR-AArHwreX a').contains('aausertest@curve.com').should('be.visible');

      // delete standard user     
      cy.get('#user-select-0').check();
      cy.get('#CUR-RWlxftDS').click();
      cy.get('#CUR-qmXpxFpo').click().wait(2000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })

  });

  // COMPLETED Testing Payments Create, Read, Update and Delete Functions
  it('Smoke-Payments-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-payments > a').click();

      // payment groups index page validation
      cy.get('#CUR-HojkyIsW').should('be.visible');
      cy.get('#CUR-kXoADWjR').should('be.visible');
      cy.get('#CUR-INWUtDqr').should('be.visible');
      cy.get('#CUR-oTADdvMB th').contains('Name').should('be.visible');
      cy.get('#CUR-oTADdvMB th').contains('Status').should('be.visible');
      cy.get('#CUR-oTADdvMB th').contains('Created').should('be.visible');

      // payment index page validation
      cy.get('#CUR-INWUtDqr').click();
      cy.get('#CUR-EnfXLjHD').contains('Overview').should('be.visible');
      cy.get('#CUR-XBVbaFCZ').contains('Name').should('be.visible');
      cy.get('#CUR-LzsfBxoh').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Payee').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Name').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Currency').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Amount').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Status').should('be.visible');

      // Add Payment
      cy.get('#CUR-eAKxeLbd').type('A Smoke Test');
      cy.get('#CUR-LzsfBxoh').click();
      cy.get('#CUR-sovaMLmn').click();
      cy.get('#CUR-XHhdnPOg').type('A Smoke Payment');
      cy.get('#CUR-eFDNZivS').type('0123');
      cy.get('#CUR-payee-select-field').type('z standard').wait(2000);
      cy.get('#CUR-hqUJePRw a').contains('Z Standard').click();
      cy.get('#CUR-vzLwJXME').click().wait(2000);

      // Validate Created Data
      cy.get('#CUR-BAKorZom a').contains('Z Standard').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('A Smoke Payment').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('GBP').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('123.00').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('Pending').should('be.visible');

      // Update Payment
      cy.get('#CUR-BAKorZom a').contains('Z Standard').click();
      cy.get('#CUR-XHhdnPOg').clear().type('A Payment Smoke Updated');
      cy.get('#CUR-eFDNZivS').clear().type('121');
      cy.get('#CUR-vzLwJXME').click();
      cy.get('#CUR-nwSFNGwm').click();

      // Validate Updated Data
      cy.get('#CUR-BAKorZom a').contains('Z Standard').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('A Payment Smoke Updated').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('GBP').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('121.00').should('be.visible');

      // delete payment
      cy.get('#CUR-BAKorZom a').contains('Z Standard').click();
      cy.get('#CUR-fjzEPjoB').click();
      cy.get('#CUR-OSFxsxNc').click();


      // delete payment groups
      cy.get('#CUR-cwYxrxYN').click();
      cy.get('#CUR-kcQIXvUd').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {

        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });
})
