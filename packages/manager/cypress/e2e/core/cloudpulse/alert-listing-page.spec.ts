/**
 * @file Integration Tests for the CloudPulse DBaaS Alerts Listing Page.
 * This file contains integration tests to verify the functionality and UI elements
 * on the CloudPulse DBaaS Alerts Listing Page.
 */

import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import { accountFactory, alertFactory } from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import type { Flags } from 'src/featureFlags';

import { mockGetAllAlertDefinitions, mockGetCloudPulseServices } from 'support/intercepts/cloudpulse';
import { randomDate } from 'src/utilities/random';
import { formatDate } from 'src/utilities/formatDate';
import { Alert } from '@linode/api-v4';
import { ui } from 'support/ui';

// Define feature flags to enable necessary features for testing
const flags: Partial<Flags> = { aclp: { enabled: true, beta: true } };

// Create a mock account for testing
const mockAccount = accountFactory.build();
const now = new Date();
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
const expectedHeaders = [
  'Alert Name',
  'Service',
  'Status',
  'Last Modified',
  'Created By',
];

// Generate mock alerts for testing
const mockAlerts = [
  alertFactory.build({
    service_type: 'dbaas',
    severity: 1,
    status: 'enabled',
    type: 'system',
    created_by:'user1',
    updated: randomDate(tenDaysAgo, now).toISOString(),
  }),
  alertFactory.build({
    service_type: 'dbaas',
    severity: 0,
    status: 'disabled',
    updated: randomDate(tenDaysAgo, now).toISOString(),
    created_by:'user4',

  }),
  alertFactory.build({
    service_type: 'linode',
    severity: 2,
    status: 'enabled',
    updated: randomDate(tenDaysAgo, now).toISOString(),
    created_by:'user2',
  }),
  alertFactory.build({
    service_type: 'linode',
    severity: 3,
    status: 'disabled',
    type: 'user',
    updated: randomDate(tenDaysAgo, now).toISOString(),
    created_by:'user3',
  }),
];

// Helper function to verify sorting
function verifyTableSorting(columnDataQa: string, sortOrder: 'ascending' | 'descending', expectedValues: number[]) {
  cy.get(`[data-qa-header="${columnDataQa}"]`)
    .should('have.attr', 'aria-sort', sortOrder)
    .click();

  cy.get('[data-qa="alert-table"]')
    .within(() => {
      cy.get('[data-qa-alert-cell]')
        .should(($cells) => {
          // Extract the actual order from the 'data-qa-alert-cell' attribute as numbers
          const actualOrder = $cells.map((_, cell) => parseInt(cell.getAttribute('data-qa-alert-cell')!, 10)).get();

          // Verify the actual order matches the expected order
          expect(actualOrder).to.deep.equal(expectedValues);
        });
    });
}


/**
 * Integration tests for the CloudPulse DBaaS Alerts Listing Page
 */

describe('Integration Tests for Dbaas Alert Listing Page', () => {
  beforeEach(() => {
    // Set up feature flags and mock account before each test
    mockAppendFeatureFlags(flags);
    mockGetAccount(mockAccount);
    
    mockGetCloudPulseServices('linode', 'dbaas');
    // Mock API response for alert definitions
    mockGetAllAlertDefinitions(mockAlerts).as('getAlertDefinitionsList');

    // Visit the alerts definitions page with login
    cy.visitWithLogin('/monitor/alerts/definitions');

    // Wait for the mock API response
    cy.wait('@getAlertDefinitionsList');
  });

  /**
   * Function to check the details of an alert.
   * @param {Alert} alert - The alert object to check.
   */
  const checkAlertDetails = (alert: Alert) => {
    cy.get(`[data-qa-alert-cell="${alert.id}"]`).within(() => {

        cy.findByText( alert.service_type)
        .should('be.visible')
        .should('have.text', alert.service_type); 

       cy.findByText(new RegExp(alert.status, 'i'))
        .should('be.visible')
        .should('have.text',
          alert.status === 'enabled' ? 'Enabled' : 'Disabled'
        );
        cy.findByText(alert.label)
        .should('be.visible')
        .should('have.text', alert.label);
      
      cy.findByText(formatDate(alert.updated, { format: 'yyyy-MM-dd HH:mm' }))
        .should('be.visible')
        .should('have.text',formatDate(alert.updated, { format: 'yyyy-MM-dd HH:mm' })
        );
      cy.findByText(alert.created_by)
        .should('be.visible')
        .should('have.text', alert.created_by);

      cy.get(`[data-qa-alert-action-cell="alert_${alert.id}"]`)
        .find('button')
        .should('be.visible')
        .click();

        cy.get(`a[aria-label="${alert.label}"]`)
        .should('be.visible')
        .and('have.attr', 'href', `/monitor/alerts/definitions/detail/dbaas/${alert.id}`);

    });
     cy.get('[data-qa-action-menu-item="Show Details"]').should('be.visible');
  
    cy.get('body').click(); //

    };


    it('should verify sorting for multiple columns in ascending and descending order', () => {
      verifyTableSorting('label', 'ascending', [4, 3, 2, 1]);
      verifyTableSorting('label', 'descending', [1, 2, 3, 4]);
      verifyTableSorting('status', 'ascending', [1, 3, 2, 4]);
      verifyTableSorting('status', 'descending', [2, 4, 1, 3]);
      verifyTableSorting('service_type', 'ascending', [4, 3, 2, 1]);
      verifyTableSorting('service_type', 'descending', [2, 1, 4, 3]);
      verifyTableSorting('created_by', 'ascending', [2, 4, 3, 1]);
      verifyTableSorting('created_by', 'descending', [1, 3, 4, 2]);
    });

    it('should validate the UI elements, headers, alert details, and search functionality', () => {
      // Check that the "Create Alert" button is visible
      ui.buttonGroup
        .findButtonByTitle('Create Alert')
        .should('be.visible');
  
      // Validate the headers of the alert listing page
      cy.get('[data-qa="alert-table"]').within(() => {
        expectedHeaders.forEach((headerText) => {
          cy.findByText(headerText).should('have.text', headerText);
        });
      });
  
      // Check each alert's details
      mockAlerts.forEach((alert) => {
        checkAlertDetails(alert);
      });
  
    });

    it('should search and filter alerts by name, service, and status, and clear filters', () => {

      //  Search by alert name and validate the results
      cy.findByPlaceholderText('Search for Alerts')
        .should('be.visible')
        .should('not.be.disabled')
        .type(mockAlerts[0].label);
    
      cy.get('[data-qa="alert-table"]')
        .should('have.length', 1)
        .find(`[data-qa-alert-cell="${mockAlerts[0].id}"]`).within(() => {
          cy.findByText(mockAlerts[0].label)
            .should('have.text', mockAlerts[0].label);
        });
    
      //  Clear previous search by alert name
      cy.get('[data-qa-filter="alert-search"]')
        .within(() => {
          cy.get('input[data-testid="textfield-input"]').click().clear();
        });
    
      //  Clear the search by service filter and search by service type
      cy.get('[data-qa-filter="alert-service-filter"]')
        .should('be.visible')
        .within(() => {
          ui.button
            .findByAttribute('aria-label', 'Clear')
            .should('be.visible')
            .scrollIntoView()
            .click();
        });
    
      cy.findByPlaceholderText('Select a Service')
        .should('be.visible')
        .type(`${mockAlerts[0].service_type}{enter}`);
    
      // Clicks the currently focused element

      cy.focused().click();
    
      cy.get('[data-qa="alert-table"]')
        .find('[data-qa-alert-cell]')
        .should('have.length', 2);
    
      cy.get(`[data-qa-alert-cell="${mockAlerts[0].id}"]`)
        .should('be.visible');
      cy.get(`[data-qa-alert-cell="${mockAlerts[1].id}"]`)
        .should('be.visible');
    
      //  Clear search by alert status filter and search by alert status
      cy.get('[data-qa-filter="alert-status-filter"]')
        .should('be.visible')
        .within(() => {
          ui.button
            .findByAttribute('aria-label', 'Clear')
            .should('be.visible')
            .scrollIntoView()
            .click();
        });
    
      cy.findByPlaceholderText('Select a Status')
        .should('be.visible')
        .type('Enabled{enter}');
    
      //  Assert the search results for alert status
      cy.get('[data-qa="alert-table"]')
        .find('[data-qa-alert-cell]')
        .should('have.length', 1);
    
     // Clicks the currently focused element
       cy.focused().click();
    
      cy.get(`[data-qa-alert-cell="${mockAlerts[0].id}"]`)
        .should('be.visible');
    });
    

 
  });
