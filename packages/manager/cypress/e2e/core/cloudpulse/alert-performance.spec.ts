import { mockGetAccount } from 'support/intercepts/account';
import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import { ui } from 'support/ui';
import { apiMatcher } from 'support/util/intercepts';
import { randomLabel } from 'support/util/random';

import { accountFactory } from 'src/factories';

import type { Flags } from 'src/featureFlags';

const flags: Partial<Flags> = { aclp: { beta: true, enabled: true } };

beforeEach(() => {
  mockAppendFeatureFlags(flags);
  const mockAccount = accountFactory.build();
  mockGetAccount(mockAccount);
});

describe('Alert App Performance Test', () => {
  it.only('should measure page load time of the Alert Listing page', () => {
    // Intercept API request that loads alerts
    cy.intercept('GET', apiMatcher('/monitor/alert-definitions*')).as(
      'getAlerts'
    );

    // Visit the page
    cy.visitWithLogin('/alerts/definitions');

    // Wait for API response to complete
    cy.wait('@getAlerts');

    // Wait for table to become visible (without hardcoded timeout)
    cy.get('[data-qa="alert-table"]')
      .should('be.visible')
      .within(() => {
        // Then wait for at least one alert row inside the table
        cy.get('[data-qa-alert-cell]').should('be.visible');
      });

    // Measure performance metrics
    cy.window().then((win) => {
      const [navigationEntry] = win.performance.getEntriesByType(
        'navigation'
      ) as PerformanceNavigationTiming[];

      if (!navigationEntry) {
        throw new Error('Navigation timing data not available');
      }

      // Declare the performance metrics
      const pageLoadTime =
        navigationEntry.loadEventEnd - navigationEntry.startTime;
      const domLoadTime =
        navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime;

      /*
        🚀 Page Load Time → Total time taken for the page to fully load, including all resources.
        📜 DOM Load Time → Time taken for the browser to parse and load the HTML (DOM).
        🎨 First Paint Time → Time until the first pixel is painted on the screen.
      */

      cy.log(
        `🚀 Page Load Time (Total time taken for the page to fully load, including all resources): ${pageLoadTime} ms`
      );
      cy.log(
        `📜 DOM Load Time (Time taken for the browser to parse and load the HTML): ${domLoadTime} ms`
      );
    });
  });

  it('should measure time taken to enable an alert', () => {
    // Intercept the API request for enabling/disabling alerts
    cy.intercept('PUT', '**/alert-definitions/**').as('changeStatus');

    // Visit the alerts definitions page
    cy.visitWithLogin('/alerts/definitions');

    // Wait for the alert table and at least one row
    cy.get('[data-qa="alert-table"]')
      .should('be.visible')
      .within(() => {
        cy.get('[data-qa-alert-cell]').should('be.visible');
      });

    // Filter by "Enabled" status
    cy.findByPlaceholderText('Select a Status')
      .should('be.visible')
      .type('Enabled{enter}');

    // Click on the first action menu
    cy.get('[aria-label^="Action menu for Alert"]')
      .first()
      .should('be.visible')
      .click();

    // Capture performance BEFORE clicking "Disable"
    cy.window().then((win) => {
      const beforeAction = win.performance.now();

      // Click the "Disable" button
      ui.actionMenuItem.findByTitle('Disable').should('be.visible').click();

      // Wait for confirmation toast instead of API response
      ui.toast.assertMessage('It can take a few minutes to apply the changes');

      // Capture performance AFTER toast message appears
      cy.window().then((win) => {
        const afterAction = win.performance.now();
        const enableAlertTime = afterAction - beforeAction;

        cy.log(`⏳ Time taken to enable the alert: ${enableAlertTime} ms`);
      });
    });
  });

  interface MetricDetails {
    aggregationType: string;
    dataField: string;
    operator: string;
    ruleIndex: number;
    threshold: string;
  }

  /**
   * Fills metric details in the form.
   * @param ruleIndex - The index of the rule to fill.
   * @param dataField - The metric's data field (e.g., "CPU Utilization").
   * @param aggregationType - The aggregation type (e.g., "Average").
   * @param operator - The operator (e.g., ">=", "==").
   * @param threshold - The threshold value for the metric.
   */
  const fillMetricDetailsForSpecificRule = ({
    aggregationType,
    dataField,
    operator,
    ruleIndex,
    threshold,
  }: MetricDetails) => {
    cy.get(`[data-testid="rule_criteria.rules.${ruleIndex}-id"]`).within(() => {
      // Fill Data Field
      ui.autocomplete
        .findByLabel('Data Field')
        .should('be.visible')
        .type(dataField);

      ui.autocompletePopper.findByTitle(dataField).should('be.visible').click();

      // Validate Aggregation Type
      ui.autocomplete
        .findByLabel('Aggregation Type')
        .should('be.visible')
        .type(aggregationType);

      ui.autocompletePopper
        .findByTitle(aggregationType)
        .should('be.visible')
        .click();

      // Fill Operator
      ui.autocomplete
        .findByLabel('Operator')
        .should('be.visible')
        .type(operator);

      ui.autocompletePopper.findByTitle(operator).should('be.visible').click();

      // Fill Threshold
      cy.get('[data-qa-threshold]').should('be.visible').clear();
      cy.get('[data-qa-threshold]').should('be.visible').type(threshold);
    });
  };

  it('should measure time taken to create a new alert', () => {
    cy.intercept('POST', '/monitor/services/dbaas/alert-definitions').as(
      'creteAlert'
    );
    cy.visitWithLogin('/alerts/definitions/create');

    const customLabel = 'perf test' + randomLabel();
    // Enter Name and Description
    cy.findByPlaceholderText('Enter a Name')
      .should('be.visible')
      .type(customLabel);

    cy.findByPlaceholderText('Enter a Description')
      .should('be.visible')
      .type('This is a test alert');

    // Select Service
    ui.autocomplete
      .findByLabel('Service')
      .should('be.visible')
      .type('Databases');
    ui.autocompletePopper.findByTitle('Databases').should('be.visible').click();
    // Select Severity
    ui.autocomplete.findByLabel('Severity').should('be.visible').type('Severe');
    ui.autocompletePopper.findByTitle('Severe').should('be.visible').click();

    // Fill metric details for the first rule
    const cpuUsageMetricDetails = {
      aggregationType: 'Average',
      dataField: 'CPU Usage',
      operator: '=',
      ruleIndex: 0,
      threshold: '1000',
    };

    fillMetricDetailsForSpecificRule(cpuUsageMetricDetails);

    // Add metrics
    cy.findByRole('button', { name: 'Add metric' })
      .should('be.visible')
      .click();

    ui.buttonGroup
      .findButtonByTitle('Add dimension filter')
      .should('be.visible')
      .click();

    ui.autocomplete
      .findByLabel('Data Field')
      .eq(1)
      .should('be.visible')
      .clear();

    ui.autocomplete
      .findByLabel('Data Field')
      .eq(1)
      .should('be.visible')
      .type('Node Type');

    cy.findByText('Node Type').should('be.visible').click();

    ui.autocomplete.findByLabel('Operator').eq(1).should('be.visible').clear();

    ui.autocomplete.findByLabel('Operator').eq(1).type('Equal');

    cy.findByText('Equal').should('be.visible').click();

    ui.autocomplete.findByLabel('Value').should('be.visible').type('Primary');

    cy.findByText('Primary').should('be.visible').click();

    // Fill metric details for the second rule

    const memoryUsageMetricDetails = {
      aggregationType: 'Average',
      dataField: 'Memory Usage',
      operator: '=',
      ruleIndex: 1,
      threshold: '1000',
    };

    fillMetricDetailsForSpecificRule(memoryUsageMetricDetails);
    // Set evaluation period
    ui.autocomplete
      .findByLabel('Evaluation Period')
      .should('be.visible')
      .type('5 min');
    ui.autocompletePopper.findByTitle('5 min').should('be.visible').click();

    // Set polling interval
    ui.autocomplete
      .findByLabel('Polling Interval')
      .should('be.visible')
      .type('5 min');
    ui.autocompletePopper.findByTitle('5 min').should('be.visible').click();

    // Set trigger occurrences
    cy.get('[data-qa-trigger-occurrences]').should('be.visible').clear();

    cy.get('[data-qa-trigger-occurrences]').should('be.visible').type('5');

    // Add notification channel
    ui.buttonGroup.find().contains('Add notification channel').click();

    ui.autocomplete.findByLabel('Type').should('be.visible').type('Email');
    ui.autocompletePopper.findByTitle('Email').should('be.visible').click();

    ui.autocomplete
      .findByLabel('Channel')
      .should('be.visible')
      .type('Read-Write Channel');

    ui.autocompletePopper
      .findByTitle('Read-Write Channel')
      .should('be.visible')
      .click();

    // Add channel
    ui.drawer
      .findByTitle('Add Notification Channel')
      .should('be.visible')
      .within(() => {
        ui.buttonGroup
          .findButtonByTitle('Add channel')
          .should('be.visible')
          .click();
      });
    // Click on submit button
    ui.buttonGroup
      .find()
      .find('button')
      .filter('[type="submit"]')
      .should('be.visible')
      .should('be.enabled')
      .click();

    const startTime = Date.now();
    cy.log(`startTime time: ${startTime} seconds`);

    /* cy.findByPlaceholderText('Search for Alerts').type(customLabel);
    cy.findByText(customLabel)
      .should('be.visible')
      .then(() => {
        const endTime = Date.now();
        const loadTime = (endTime - startTime) / 1000;
       // cy.log(`endTime time:   ${startTime}    ${endTime} seconds`);
        cy.log(`Time taken to create and display alert  ${startTime}    ${endTime} : ${loadTime} seconds`);*/
    cy.wait('@creteAlert').then(() => {
      const endTime = Date.now();
      const loadTime = (endTime - startTime) / 1000; // Time in seconds

      // Log the start time, end time, and the time taken for the POST request
      cy.log(`Start Time: ${startTime} ms`);
      cy.log(`End Time: ${endTime} ms`);
      cy.log(`Time taken for the request to complete: ${loadTime} seconds`);
    });
  });
});
