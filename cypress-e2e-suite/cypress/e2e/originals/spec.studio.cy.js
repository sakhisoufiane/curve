// const baseURL = 'https://dev.curveroyaltysystems.com';
// const baseURL = 'https://staging.curveroyaltysystems.com';
const baseURL = 'http://localhost:8082';

describe('My First Test', () => {
  // it('Does not do much!', () => {
  //   expect(true).to.equal(true)
  // })

  /* ==== Test Created with Cypress Studio ==== */
  // it('rrrr', function() {
  //   /* ==== Generated with Cypress Studio ==== */
  //   cy.visit(baseURL);
  //   cy.get('#CUR-TnIhWZOt').clear('dite@nakedweb.co.uk');
  //   cy.get('#CUR-TnIhWZOt').type('dite@nakedweb.co.uk');
  //   cy.get('#CUR-jMEIMZkK').click();
  //   /* ==== End Cypress Studio ==== */
  // });

  // /* ==== Test Created with Cypress Studio ==== */
  // fails due to sidebar
  // it('login-navigate-text', function() {
  //   /* ==== Generated with Cypress Studio ==== */
  //   cy.visit('http://localhost:8082/login?qa=R4d2fNWthcyw5X8F');
  //   cy.get('#CUR-TnIhWZOt').clear('dite@nakedweb.co.uk');
  //   cy.get('#CUR-TnIhWZOt').type('dite@nakedweb.co.uk');
  //   cy.get('#CUR-jMEIMZkK').clear('monkeyloveA1%');
  //   cy.get('#CUR-jMEIMZkK').type('monkeyloveA1%');
  //   cy.get('#CUR-PSsolVHf').click();
  //   cy.get('#CUR-rVRlrere').should('have.text', '\n            \n              Total Revenue >\n            \n          ');
  //   cy.get('#sidebar-statements > [href="javascript:;"] > .title').click();
  //   cy.get('#sidebar-periods > .go-to').click();
  //   cy.get('#period-0').click();
  //   cy.get('#CUR-TRIZDfAQ').should('have.text', 'Dummy');
  //   /* ==== End Cypress Studio ==== */
  // });

  /* ==== Test Created with Cypress Studio ==== */
  it('test client change', function() {
    /* ==== Generated with Cypress Studio ==== */
    cy.visit(`${baseURL}/login?qa=R4d2fNWthcyw5X8F`);
    cy.get('#CUR-TnIhWZOt').clear().type('dite@nakedweb.co.uk');
    cy.get('#CUR-jMEIMZkK').click();
    cy.get('#CUR-jMEIMZkK').clear().type('\'monkeyloveA1%');
    cy.get('#CUR-PSsolVHf').click();
    cy.get('.alert').should('be.visible');
    cy.get('#CUR-TnIhWZOt').should('be.visible');
    cy.get('#CUR-FDKBQiEX').click();
    cy.get('#CUR-jMEIMZkK').clear().type('monkeyloveA1%');
    cy.get('#CUR-PSsolVHf').click();
    cy.get('#CUR-select-client-selector-main > .ui-select-match > .btn-default > .ui-select-match-text > .ng-binding').click();
    cy.get('.ui-select-choices-row-inner > .ng-binding').click();
    cy.get('#CUR-rVRlrere').should('be.visible');
    cy.get('#CUR-rVRlrere').should('have.text', '\n            \n              Total Revenue >\n            \n          ');
    cy.get('#CUR-qyaJvlhs').should('be.visible');
    cy.get('#CUR-UzLZsFaB').should('be.visible');
    cy.get('#CUR-qyaJvlhs').should('be.visible');
    cy.get('#CUR-UzLZsFaB').should('be.visible');
    cy.get('#logout-button').click();
  });

  it('test change contract', function() {
    cy.visit(`${baseURL}/login?qa=R4d2fNWthcyw5X8F`);
    cy.get('#CUR-TnIhWZOt').clear().type('dite@nakedweb.co.uk');
    cy.get('#CUR-jMEIMZkK').clear().type('monkeyloveA1%');
    cy.get('#CUR-PSsolVHf').click();
    cy.get('#sidebar-contracts > [href="javascript:;"] > .title').click();
    cy.get('#sidebar-contract-submenu > .go-to').click();
    cy.get('#contract-3').click();
    cy.get('#CUR-gaQtKgcB').type('fr');
    cy.get('#CUR-TinbGPNU').click();
    cy.get('#logout-button').click();
  });
})