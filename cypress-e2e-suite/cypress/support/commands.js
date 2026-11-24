// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// const { email } = current.context;

// Review session state options https://www.cypress.io/blog/2021/08/04/authenticate-faster-in-tests-cy-session-command/

// Impot file extension
import 'cypress-file-upload';
require('cypress-xpath');


const baseURL = Cypress.env('baseUrl'); // 'http://localhost:8082';
// const composerName = 'smokey1300 Composer-' + Date.now()

Cypress.Commands.add('login', (username, password) => {
  username = (username) ? username : Cypress.env('default_login_email');
  password = (password) ? password : Cypress.env('default_login_password');
  cy.visit(`${baseURL}/login?qa=${Cypress.env('qa_mode_code')}`);
  cy.get('#CUR-TnIhWZOt').clear().type(username); 
  cy.get('#CUR-jMEIMZkK').clear().type(password); 
  cy.get('#CUR-PSsolVHf').click();
  cy.get('#sidebar').should('be.visible');
});

Cypress.Commands.add('typeAheadSelection', (search, find, selector) => {
  // @todo !! Why does this only work on first two in dropdown
  selector = selector ? selector + ' ' : '';
  cy.get(selector + '.row > .form-group > .form-control').clear().type(search).wait(500);

  // cy.get('.row > .form-group > .form-control').as('btn').clear();
  // cy.get('@btn').type(search).wait(500);

  // cy.get('.uib-typeahead-match a',{includeShadowDom:true}).contains(find).click().pause();
  // cy.find('.uib-typeahead-match > .ng-binding').contains(find).click().pause();
  // cy.get('.uib-typeahead-match').contains(find).click().pause()
  cy.get('.uib-typeahead-match').find('a').contains(find).click();
});

Cypress.Commands.add('selectScreenFind', (searchText) => {
  cy.get('.table-selectable .ng-scope').contains(searchText).should('be.visible').click();
});

// Use when logging in with a user who only has access to multiple clients
Cypress.Commands.add('selectClientMulti', (client) => {
  client = (client) ? client : Cypress.env('default_client');
  cy.get('#CUR-select-client-selector-main > .ui-select-match > .btn-default').click();
  cy.get('.ui-select-choices-row-inner > .ng-binding').contains(client).click();
});

// Use when logging in with a user who only has access to one client
// DEPRECATED NOT NECESSARY - just dont select client
// Combi nwith selectClientMulti by checking elements present then act accordingly 
Cypress.Commands.add('selectClientSingle', () => {
  cy.get('#CUR-select-client-selector-main > .ui-select-match > .btn-default > .ui-select-match-text > .ng-binding').click();
  cy.get('.ui-select-choices-row-inner > .ng-binding').click();
});

Cypress.Commands.add('logout', () => {
  cy.get('#logout-button').click();
  // cy.get('#CUR-PSsolVHf').should('be.visible'); // If any test fails then the afterEach fails on this step and kills the run ???
});
