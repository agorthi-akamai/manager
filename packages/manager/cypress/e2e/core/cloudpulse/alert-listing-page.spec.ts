/**
 * @file Integration Tests for the CloudPulse DBaaS Alerts Listing Page.
 *
 */
import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import { accountFactory, alertFactory } from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import type { Flags } from 'src/featureFlags';

import { mockGetAllAlertDefinitions } from 'support/intercepts/cloudpulse';
import { randomDate } from 'src/utilities/random';
import { formatDate } from 'src/utilities/formatDate';
import { ui } from 'support/ui';
import { button } from 'support/ui/buttons';

const flags: Partial<Flags> = { aclp: { enabled: true, beta: true } };

const mockAccount = accountFactory.build();
const now = new Date();
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

const mockAlertDbaas = alertFactory.build({
  service_type: 'dbaas',
  severity: 1,
  status: 'enabled',
  type: 'system',
  entity_ids: ['1', '2'],
  updated:randomDate(tenDaysAgo, now).toISOString(),
});
const mockAlertDbaasExtended = alertFactory.build({
  service_type: 'dbaas',
  severity: 0,
  status: 'disabled',
  type: 'custom',
  entity_ids: ['1', '2'],
  updated:randomDate(tenDaysAgo, now).toISOString(),
});
const mockAlertLinode = alertFactory.build({
  service_type: 'linode',
  severity: 2,
  status: 'enabled',
  type: 'default',
  entity_ids: ['3', '4'],
  updated:randomDate(tenDaysAgo, now).toISOString(),
});
const  mockAlertLinodeExtended = alertFactory.build({
  service_type: 'linode',
  severity: 3,
  status: 'disabled',
  type: 'user',
  entity_ids: ['3', '4'],
  updated:randomDate(tenDaysAgo, now).toISOString(),
});

/**
 * Integration tests for the CloudPulse DBaaS Alerts Listing Page
 */

describe('Integration Tests for Dbaas Alert Listing Page', () => {
  beforeEach(() => {
    mockAppendFeatureFlags(flags);
    mockGetAccount(mockAccount);

    mockGetAllAlertDefinitions([mockAlertDbaas,mockAlertLinode,mockAlertDbaasExtended,mockAlertLinodeExtended]).as('getAlertDefinitionsList');
    

    cy.visitWithLogin('/monitor/alerts/definitions');

    cy.wait('@getAlertDefinitionsList');

  });

  it('Lisiting page validation', () => {

    // check avalible buton in listing page

    // ui.button.findByTitle("Create").should("be.visible");

      // Verify that the listing displays the DBaaS service type with the status set to 'Enabled'.
 
    cy.get(`[data-qa-alert-cell="${mockAlertDbaas.id}"]`).within(() => {
      // Assert each field inside the alert cell
        cy.findByText(mockAlertDbaas.service_type)
          .should('be.visible')
          .should('have.text',mockAlertDbaas.service_type)

        cy.findByText(new RegExp(mockAlertDbaas.status, 'i'))
        .should('be.visible')
        .should('have.text','Enabled')
        cy.findByText(mockAlertDbaas.label)
          .should('be.visible');
        cy.findByText(formatDate(mockAlertDbaas.updated, { format: 'yyyy-MM-dd HH:mm' }))
         .should('be.visible')
         .should('have.text',formatDate(mockAlertDbaas.updated, { format: 'yyyy-MM-dd HH:mm' }))

        cy.findByText(mockAlertDbaas.created_by)
        .should('be.visible')
        .should('have.text',mockAlertDbaas.created_by)
   
        // Click the action button
        cy.get(`[data-qa-alert-action-cell="alert_${mockAlertDbaas.id}"]`)
          .find('button')
         .should('be.visible')
         .click({ force: true });
 
      });
   
          // Verify that the listing displays the Linode service type with the status set to 'Enabled'.

      // Assert "Show Details" is visible
      cy.get('[data-qa-action-menu-item="Show Details"]')
        .should('be.visible')
 
        cy.get(`[data-qa-alert-action-cell="alert_${mockAlertDbaas.id}"]`)
        .find('button')
       .should('be.visible')
       .click({ force: true });


       cy.get(`[data-qa-alert-cell="${mockAlertLinode.id}"]`).within(() => {
        // Assert each field inside the alert cell
          cy.findByText(mockAlertLinode.service_type)
            .should('be.visible')
            .should('have.text',mockAlertLinode.service_type)
  
          cy.findByText(new RegExp(mockAlertLinode.status, 'i'))
          .should('be.visible')
          .should('have.text','Enabled')
          cy.findByText(mockAlertLinode.label)
            .should('be.visible');
          cy.findByText(formatDate(mockAlertLinode.updated, { format: 'yyyy-MM-dd HH:mm' }))
           .should('be.visible')
           .should('have.text',formatDate(mockAlertLinode.updated, { format: 'yyyy-MM-dd HH:mm' }))
  
          cy.findByText(mockAlertLinode.created_by)
          .should('be.visible')
          .should('have.text',mockAlertLinode.created_by)
     
          // Click the action button
          cy.get(`[data-qa-alert-action-cell="alert_${mockAlertLinode.id}"]`)
            .find('button')
           .should('be.visible')
           .click({ force: true });
   
        });
     
        // Assert "Show Details" is visible
        cy.get('[data-qa-action-menu-item="Show Details"]')
          .should('be.visible')
   
          cy.get(`[data-qa-alert-action-cell="alert_${mockAlertLinode.id}"]`)
          .find('button')
         .should('be.visible')
         .click({ force: true });

    
    // Verify that the listing displays the DBaaS service type with the status set to 'Disabled'.
 
    cy.get(`[data-qa-alert-cell="${mockAlertDbaasExtended.id}"]`).within(() => {
        // Assert each field inside the alert cell
          cy.findByText(mockAlertDbaasExtended.service_type)
            .should('be.visible')
            .should('have.text',mockAlertDbaasExtended.service_type)
  
          cy.findByText(new RegExp(mockAlertDbaasExtended.status, 'i'))
          .should('be.visible')
          .should('have.text','Disabled')
          cy.findByText(mockAlertDbaasExtended.label)
            .should('be.visible');
          cy.findByText(formatDate(mockAlertDbaasExtended.updated, { format: 'yyyy-MM-dd HH:mm' }))
           .should('be.visible')
           .should('have.text',formatDate(mockAlertDbaasExtended.updated, { format: 'yyyy-MM-dd HH:mm' }))
  
          cy.findByText(mockAlertDbaasExtended.created_by)
          .should('be.visible')
          .should('have.text',mockAlertDbaasExtended.created_by)
     
          // Click the action button
          cy.get(`[data-qa-alert-action-cell="alert_${mockAlertDbaasExtended.id}"]`)
            .find('button')
           .should('be.visible')
           .click({ force: true });
   
        });
       
        // Assert "Show Details" is visible
        cy.get('[data-qa-action-menu-item="Show Details"]')
          .should('be.visible')
   
          cy.get(`[data-qa-alert-action-cell="alert_${mockAlertDbaasExtended.id}"]`)
          .find('button')
         .should('be.visible')
         .click({ force: true });



     // Verify that the listing displays the Linode service type with the status set to 'Disabled'.
 
      cy.get(`[data-qa-alert-cell="${mockAlertLinodeExtended.id}"]`).within(() => {
        // Assert each field inside the alert cell
          cy.findByText(mockAlertLinodeExtended.service_type)
            .should('be.visible')
            .should('have.text',mockAlertLinodeExtended.service_type)
  
          cy.findByText(new RegExp(mockAlertLinodeExtended.status, 'i'))
          .should('be.visible')
          .should('have.text','Disabled')
          cy.findByText(mockAlertLinodeExtended.label)
            .should('be.visible');
          cy.findByText(formatDate(mockAlertLinodeExtended.updated, { format: 'yyyy-MM-dd HH:mm' }))
           .should('be.visible')
           .should('have.text',formatDate(mockAlertLinodeExtended.updated, { format: 'yyyy-MM-dd HH:mm' }))
  
          cy.findByText(mockAlertLinodeExtended.created_by)
          .should('be.visible')
          .should('have.text',mockAlertLinodeExtended.created_by)
     
          // Click the action button
          cy.get(`[data-qa-alert-action-cell="alert_${mockAlertLinodeExtended.id}"]`)
            .find('button')
           .should('be.visible')
           .click({ force: true });
   
        });
       
        // Assert "Show Details" is visible
        cy.get('[data-qa-action-menu-item="Show Details"]')
          .should('be.visible')
      
       });
   
  });
