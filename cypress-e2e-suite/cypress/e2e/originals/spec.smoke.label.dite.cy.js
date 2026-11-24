describe.skip('Label Smoke Tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    // cy.selectClientSingle();
    cy.selectClientMulti();
  })

  afterEach(() => {
    cy.logout();
  })

  it.skip('TEST-TEMPLATE', () => {
    
  });


  it.skip('Gelo-Demo', () => {
    cy.get('#sidebar-contracts > [href="javascript:;"] > .title').click();
    cy.get('#sidebar-payees > .go-to').click();
    cy.get('#item-link-0').click();
    cy.get('#CUR-vNACcVKV').clear().type('Dite Browning');
    cy.get('#CUR-dJtpHGja').click();
    cy.get('.pgn > .alert').should('be.visible');
    cy.get('#CUR-GDeQOECg').should('have.text', 'Dite Browning');
  });

  // this test  saves two composers instead of editing!!!!
  it('Gelo-Demo2', () => {
    /* ==== Generated with Cypress Studio ==== */
    // cy.wait(3001);
    cy.get('#sidebar-catalogue > [href="javascript:;"] > .title').click();
    // cy.wait(3001);
    cy.get('#sidebar-composers > .go-to').click();
    cy.get('#CUR-NGqqjbFT').should('have.text', 'Composers');
    cy.get('#CUR-ucZUtjNV').should('be.visible');
    cy.get('#CUR-xRrQkQuq > .pg-search').should('be.visible');
    cy.get('#CUR-uUKVnFba').should('be.visible');
    cy.get('#CUR-uUKVnFba').should('have.text', ' Export');
    cy.get('#CUR-eTaahVPO').should('be.visible');
    cy.get('#CUR-eTaahVPO').should('have.text', ' Import');
    cy.get('#CUR-FuVciLZH').should('be.visible');
    cy.get('#CUR-KSqmmqMO').should('be.visible');
    cy.get('#CUR-KSqmmqMO').should('have.text', ' Create');
    cy.get('#CUR-BHqUuhJj').should('be.visible');
    cy.get('.sorting_asc').should('be.visible');
    cy.get('.sorting_asc').should('have.text', 'Name');
    cy.get('thead > tr > :nth-child(3)').should('be.visible');
    cy.get('thead > tr > :nth-child(3)').should('have.text', 'CAE');
    cy.get('thead > tr > :nth-child(4)').should('be.visible');
    cy.get('thead > tr > :nth-child(4)').should('have.text', 'Created');
    cy.get('.pagination > :nth-child(1) > span').should('be.visible');
    cy.get('.pagination > :nth-child(1) > span').should('have.text', '«');
    cy.get('.pagination > .ng-scope > .ng-binding').should('be.visible');
    cy.get('.pagination > .ng-scope > .ng-binding').should('have.text', '1');
    cy.get('.pagination > :nth-child(3) > span').should('be.visible');
    cy.get('.pagination > :nth-child(3) > span').should('have.text', '»');
    cy.get('#CUR-LqwYOLQU').should('be.visible');
    cy.get('#CUR-LqwYOLQU').should('have.text', 'Showing 25 Per Page  |');
    cy.get('#CUR-LEYMBPSy').should('be.visible');
    cy.get('#CUR-LEYMBPSy').should('have.text', 'Show All');
    // cy.wait(3001);
    cy.get('#CUR-KSqmmqMO').click();
    cy.get('#CUR-pVNhgltH').should('be.visible');
    cy.get('#CUR-pVNhgltH').should('have.text', 'Overview');
    // cy.wait(3001);
    cy.get('#CUR-smkapbFG').click();
    cy.get('#CUR-smkapbFG').should('be.visible');
    cy.get('#CUR-RZmpjwQE').should('be.visible');
    cy.get('#CUR-RZmpjwQE').should('have.text', 'Party ID ×The unique identifier assigned by Curve for use within CWR deliveries');
    cy.get('#CUR-nbiKXCsP').should('be.visible');
    cy.get('#CUR-nbiKXCsP').should('be.disabled');
    cy.get('#CUR-KtaROuOK').should('have.text', 'Name');
    cy.get('#CUR-xsBQITjy').should('be.visible');
    cy.get('#CUR-ifHNbXNd').should('have.text', 'Foreign ID ×Used for integrating into other systems, such as accounting systems');
    cy.get('#CUR-PznCFrfI').should('be.visible');
    cy.get('#CUR-HZHuhJGz').should('have.text', 'First Name');
    cy.get('#CUR-TegBJoBK').should('be.visible');
    cy.get('#CUR-eUymJsSE').should('be.visible');
    cy.get('#CUR-xsBQITjy').clear('S');
    cy.get('#CUR-xsBQITjy').type('smokey1300 Composer');
    cy.get('#CUR-PznCFrfI').clear('1');
    cy.get('#CUR-PznCFrfI').type('111');
    cy.get('#CUR-TegBJoBK').clear('S');
    cy.get('#CUR-TegBJoBK').type('Smoke');
    cy.get('#CUR-JRzrthyU').clear('C');
    cy.get('#CUR-JRzrthyU').type('Composer');
    cy.get('#CUR-DrmeRXPD').clear('B');
    cy.get('#CUR-DrmeRXPD').type('B');
    cy.get('#CUR-BbMNJqNK').clear('1');
    cy.get('#CUR-BbMNJqNK').type('123');
    cy.get('.row > .form-group > .form-control').clear('p');
    cy.get('.row > .form-group > .form-control').type('pub');
    cy.wait(5000);
    cy.get('.uib-typeahead-match > .ng-binding').contains('Test Publisher 1').click();
    // cy.wait(3001);
    cy.get('#CUR-rExQKhmY').click();
    cy.get('.alert').should('be.visible');
    cy.get('#CUR-nbiKXCsP').should('be.disabled');
    // cy.wait(3001);
    cy.get('#CUR-smkapbFG').click();
    cy.get('#CUR-xsBQITjy').should('have.value', 'smokey1300 Composer');
    cy.get('#CUR-PznCFrfI').should('have.value', '111');
    cy.get('#CUR-TegBJoBK').should('have.value', 'Smoke');
    // cy.wait(3001);
    cy.get('#CUR-DrmeRXPD').click();
    cy.get('#CUR-DrmeRXPD').should('have.value', 'B');
    cy.get('#CUR-JRzrthyU').should('have.value', 'Composer');
    cy.get('#CUR-BbMNJqNK').should('have.value', '123');
    cy.wait(2000);
    cy.get('.row > .form-group > .form-control').should('have.value', 'Test Publisher 1');
    // cy.wait(3001);
    cy.get('#CUR-NycXRuxX').click();
    cy.get('#item-link-1').should('be.visible');
    cy.get('.table > tbody > :nth-child(2) > :nth-child(3)').should('be.visible');
    // cy.wait(3001);
    cy.get('#item-link-1').click();


    cy.get('.table-selectable > .ng-scope').contains('smokey1300 Composer').click();


    cy.get('#CUR-xsBQITjy').clear().type('smokey1300 Composer Changed');
    // cy.wait(3001);
    cy.get('.fixed-header').click();
    cy.get('#CUR-PznCFrfI').clear();
    cy.get('#CUR-PznCFrfI').type('222');
    cy.get('#CUR-TegBJoBK').clear().type('Smoker');
    // cy.wait(3001);
    cy.get('#CUR-kTGHniLy').click();
    cy.get('#CUR-DrmeRXPD').clear();
    cy.get('#CUR-DrmeRXPD').type('C');
    cy.get('#CUR-JRzrthyU').clear('Composer ');
    cy.get('#CUR-JRzrthyU').type('Composer Changed');
    cy.get('#CUR-BbMNJqNK').clear('1234');
    cy.get('#CUR-BbMNJqNK').type('1234');
    // cy.wait(3001);
    cy.get('#CUR-rExQKhmY').click();
    cy.wait(3001);
    cy.get('#CUR-kXiikaLS').click();
    cy.get('#CUR-nbiKXCsP').should('be.disabled');
    cy.get('#CUR-xsBQITjy').should('have.value', 'smokey1300 Composer Changed');
    cy.get('#CUR-PznCFrfI').should('have.value', '222');
    cy.get('#CUR-TegBJoBK').should('have.value', 'Smoker');
    cy.get('#CUR-DrmeRXPD').should('have.value', 'C');
    cy.get('#CUR-JRzrthyU').should('have.value', 'Composer Changed');
    cy.get('#CUR-BbMNJqNK').should('have.value', '1234');
    cy.wait(5000);
    cy.get('.row > .form-group > .form-control').should('have.value', 'Test Publisher 1');
    // cy.wait(3001);
    cy.get('#CUR-JaWdFtZJ').click();
    cy.get('#CUR-mtUbndiF').should('be.visible');
    cy.get('#CUR-gicTyKvK > p').should('have.text', 'Are you sure you want to delete this composer? This cannot be undone.');
    cy.get('#CUR-bcgdhSSZ').should('have.text', '\n               Delete');
    // cy.wait(3001);
    cy.get('#CUR-bcgdhSSZ').click();
    cy.get('.alert').should('be.visible');
    /* ==== End Cypress Studio ==== */
  });


  it.skip('Gelo-Demo3', () => {
    
  });


  it.skip('Gelo-Demo4', () => {
    
  });

  it.skip('should find and explore a sales file', () => {
    cy.get('#sidebar-sales-files > [href="javascript:;"] > .title').click();
    cy.get('#sidebar-sales-file-submenu > .go-to').click();
    cy.get('#sales-file-0').click();
    cy.get('#CUR-CormnEei').should('be.visible');
  });

  it.skip('should find a contract and change the foreign ID', () => {
    cy.get('#sidebar-contracts > [href="javascript:;"] > .title').click();
    cy.get('#sidebar-contract-submenu > .go-to').click();
    cy.get('#contract-3').click();
    cy.get('#CUR-gaQtKgcB').clear().type('FID');
    cy.get('#CUR-TinbGPNU').click();
    cy.get('.pgn > .alert').should('have.text', '×CloseContract successfully saved');
  });

  // it.skip('Select client...', function() {
  //   cy.get('#CUR-select-client-selector-main > .ui-select-match > .btn-default > .ui-select-match-text > .ng-binding').click();
  //   cy.get('#CUR-select-client-selector-main > .ui-select-match > .btn-default > .ui-select-match-text > .ng-binding').click();
  //   cy.get('.ui-select-choices-row-inner > .ng-binding').click();
  // });

  // it.skip('ffff', function() {
  //   /* ==== Generated with Cypress Studio ==== */
  //   cy.get('#sidebar-contracts > [href="javascript:;"] > .title').click();
  //   cy.get('#sidebar-contract-submenu > .go-to').click();
  //   cy.get('#CUR-GqETKmnj').click();
  //   cy.get('#CUR-WiefkIiA').click();
  //   cy.get('#CUR-xqVjxuMZ').click();
  //   cy.get('#CUR-cWwZoemV').click();
  //   cy.get('#CUR-CRXtzZiQ').click();
  //   cy.get('.badge').click();
  //   cy.get('.read-false > .col-md-12 > .rIcon > .fa').click();
  //   cy.get('.read-false > .col-md-12 > .rIcon > .fa').click();
  //   cy.get('#notification-counter > .fa').click();
  //   cy.get('#notification-counter > .fa').click();
  //   cy.get('[style=""] > .col-md-12 > .rIcon > .fa').click();
  //   /* ==== End Cypress Studio ==== */
  // });

  /* ==== Test Created with Cypress Studio ==== */
  // it.skip('select publisher multiple', function() {
  //   /* ==== Generated with Cypress Studio ==== */
  //   cy.get('#sidebar-catalogue > [href="javascript:;"] > .title').click();
  //   cy.get('#sidebar-composers > .go-to').click();
  //   cy.get('#CUR-KSqmmqMO').click();
  //   cy.get('.row > .form-group > .form-control').clear('p').type('pub');
  //   cy.wait(2000);
  //   cy.get('.uib-typeahead-match > .ng-binding').contains('Test Publisher 1').click();
  //   // cy.get('.ui-select-choices-row-inner > .ng-binding').contains(client).click();
  //   /* ==== End Cypress Studio ==== */
  // });

  /* ==== Test Created with Cypress Studio ==== */
  // this test never saves two composers
  it('altpub', function() {
    /* ==== Generated with Cypress Studio ==== */
    cy.get('#sidebar-catalogue > [href="javascript:;"] > .title').click();
    cy.get('#sidebar-composers > .go-to').click();
    cy.get('#CUR-KSqmmqMO').click();
    cy.get('#CUR-xsBQITjy').clear('A');
    cy.get('#CUR-xsBQITjy').type('A1');
    cy.get('#CUR-PznCFrfI').clear('1');
    cy.get('#CUR-PznCFrfI').type('123');
    cy.get('#CUR-TegBJoBK').clear('A');
    cy.get('#CUR-TegBJoBK').type('A');
    cy.get('#CUR-DrmeRXPD').clear('a');
    cy.get('#CUR-DrmeRXPD').type('a');
    cy.get('#CUR-JRzrthyU').clear('1');
    cy.get('#CUR-JRzrthyU').type('1');
    cy.get('#CUR-BbMNJqNK').clear('32');
    cy.get('#CUR-BbMNJqNK').type('321');
    cy.get('.row > .form-group > .form-control').clear('p');
    cy.get('.row > .form-group > .form-control').type('pub');
    cy.wait(2000);
    cy.get('.uib-typeahead-match > .ng-binding').contains('Test Publisher 1').click();
    cy.get('#CUR-rExQKhmY').click();
    cy.get('.pgn > .alert').should('be.visible');
    cy.get('#CUR-NycXRuxX').click();
    cy.get('#item-link-1').should('have.text', 'A1');
    cy.get('#item-link-1').click();
    cy.get('#CUR-xsBQITjy').clear('A12');
    cy.get('#CUR-xsBQITjy').type('A1222');
    cy.get('#CUR-rExQKhmY').click();
    /* ==== End Cypress Studio ==== */
    /* ==== Generated with Cypress Studio ==== */
    cy.get('#CUR-JaWdFtZJ').click();
    cy.get('#CUR-bcgdhSSZ').click();
    /* ==== End Cypress Studio ==== */
  });
})