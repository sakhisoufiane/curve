// describe('empty spec', () => {
//   it('passes', () => {
//     cy.visit('https://example.cypress.io')
//   })
// })
// describe('My First Test', () => {
//   it('Does not do much!', () => {
//     expect(true).to.equal(true)
//   })
// })

// describe('My First Test', () => {
//   it('Does not do much!', () => {
//     expect(true).to.equal(false)
//   })
// })
// describe('My First Test', () => {
//   it('Visits the Kitchen Sink', () => {
//     cy.visit('https://example.cypress.io')
//     cy.contains('type')
//     cy.contains('type').click()
//   })
// })
describe('Login Curve', () => {
  it('Logs in the user', () => {
    cy.visit('http://localhost:8082/login?qa=R4d2fNWthcyw5X8F');
    // cy.get('#CUR-TnIhWZOt').click();
    // cy.contains('#CUR-TnIhWZOt').click()

    // Get an input, type into it and verify
    // that the value has been updated
    cy.get('#CUR-TnIhWZOt')
      .type('dite@nakedweb.co.uk')
      .should('have.value', 'dite@nakedweb.co.uk')

    cy.get('#CUR-jMEIMZkK')
      .type('monkeyloveA1%')
      .should('have.value', 'monkeyloveA1%')

    // cy.get('#CUR-TnIhWZOt').click();

    cy.get('#login-form').submit();
    cy.url().should('contains', 'http://localhost:8082/');

    // cy.visit('https://dev.curveroyaltysystems.com/#/periods');

    // cy.contains('5. Curve Demo Sales File C')
    cy.contains('5. Curve Demo Sales File C').click()
    cy.contains('Sales Demo')
    cy.contains('Exchange Rates')
    // cy.get('#sidebar-statements-submenu').click();
  })

  // it('Logs in the user again', () => {
  //   cy.visit('https://dev.curveroyaltysystems.com/login?qa=R4d2fNWthcyw5X8F');
  //   // cy.get('#CUR-TnIhWZOt').click();
  //   // cy.contains('#CUR-TnIhWZOt').click()

  //   // Get an input, type into it and verify
  //   // that the value has been updated
  //   cy.get('#CUR-TnIhWZOt')
  //     .type('dite@nakedweb.co.uk')
  //     .should('have.value', 'dite@nakedweb.co.uk')

  //   cy.get('#CUR-jMEIMZkK')
  //     .type('monkeyloveA1%')
  //     .should('have.value', 'monkeyloveA1%')

  //   //cy.get('#CUR-TnIhWZOt').click();

  //   cy.get('#login-form').submit();
  //   cy.url().should('contains', 'https://dev.curveroyaltysystems.com/');

  //   cy.visit('https://dev.curveroyaltysystems.com/#/periods');
  //   //cy.get('#sidebar-statements-submenu').click();
  // })
})