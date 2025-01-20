/**
 * @file Integration Tests for the CloudPulse DBaaS Alerts Listing Page.
 * This file contains integration tests to verify the functionality and UI elements
 * on the CloudPulse DBaaS Alerts Listing Page.
 */

import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import { accountFactory, alertFactory } from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import type { Flags } from 'src/featureFlags';

import { mockGetAllAlertDefinitions } from 'support/intercepts/cloudpulse';
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
    entity_ids: ['1', '2'],
    updated: randomDate(tenDaysAgo, now).toISOString(),
  }),
  alertFactory.build({
    service_type: 'dbaas',
    severity: 0,
    status: 'disabled',
    type: 'custom',
    entity_ids: ['1', '2'],
    updated: randomDate(tenDaysAgo, now).toISOString(),
  }),
  alertFactory.build({
    service_type: 'linode',
    severity: 2,
    status: 'enabled',
    type: 'default',
    entity_ids: ['3', '4'],
    updated: randomDate(tenDaysAgo, now).toISOString(),
  }),
  alertFactory.build({
    service_type: 'linode',
    severity: 3,
    status: 'disabled',
    type: 'user',
    entity_ids: ['3', '4'],
    updated: randomDate(tenDaysAgo, now).toISOString(),
  }),
];

/**
 * Integration tests for the CloudPulse DBaaS Alerts Listing Page
 */

describe('Integration Tests for Dbaas Alert Listing Page', () => {
  beforeEach(() => {
    // Set up feature flags and mock account before each test
    mockAppendFeatureFlags(flags);
    mockGetAccount(mockAccount);

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
      cy.findByText(alert.service_type)
        .should('be.visible')
        .should('have.text', alert.service_type);
      cy.findByText(new RegExp(alert.status, 'i'))
        .should('be.visible')
        .should(
          'have.text',
          alert.status === 'enabled' ? 'Enabled' : 'Disabled'
        );
      cy.findByText(alert.label).should('be.visible');
      cy.findByText(formatDate(alert.updated, { format: 'yyyy-MM-dd HH:mm' }))
        .should('be.visible')
        .should(
          'have.text',
          formatDate(alert.updated, { format: 'yyyy-MM-dd HH:mm' })
        );
      cy.findByText(alert.created_by)
        .should('be.visible')
        .should('have.text', alert.created_by);
      cy.get(`[data-qa-alert-action-cell="alert_${alert.id}"]`)
        .find('button')
        .should('be.visible')
        .click({ force: true });
    });
  };

  it('Listing page validation', () => {
    // Check if the "Create" button is visible on the page
    cy.get('button[data-testid="button"]')
      .contains('Create')
      .should('be.visible');

    // sorting using headers of the listing page
    cy.get('[data-qa-sorting="alertName"]')
      .should('be.visible')
      .should('have.text', 'Alert Name');

    cy.get('[data-qa-sorting="service"]')
      .should('be.visible')
      .should('have.text', 'Service');

    cy.get('[data-qa-sorting="status"]')
      .should('be.visible')
      .should('have.text', 'Status');

    cy.get('[data-qa-sorting="lastModified"]')
      .should('be.visible')
      .should('have.text', 'Last Modified');

    cy.get('[data-qa-sorting="createdBy"]')
      .should('be.visible')
      .should('have.text', 'Created By');


    // validating Headers of the listing page
    cy.get('[data-qa="alert-table"]').within(() => {
      expectedHeaders.forEach((headerText) => {
        cy.findByText(headerText).should('have.text', headerText);
      });
    });

    // Validate the details of each mock alert
    mockAlerts.forEach((alert) => {
      checkAlertDetails(alert);
      cy.get('[data-qa-action-menu-item="Show Details"]').should('be.visible');
    });
  });
});
