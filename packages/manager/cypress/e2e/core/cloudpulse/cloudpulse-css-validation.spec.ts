import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import {
  mockCreateCloudPulseJWEToken,
  mockGetCloudPulseDashboard,
  mockCreateCloudPulseMetrics,
  mockGetCloudPulseDashboards,
  mockGetCloudPulseMetricDefinitions,
  mockGetCloudPulseServices,
} from 'support/intercepts/cloudpulse';
import { ui } from 'support/ui';
import { widgetDetails } from 'support/constants/widgets';
import {
  accountFactory,
  cloudPulseMetricsResponseFactory,
  dashboardFactory,
  dashboardMetricFactory,
  databaseFactory,
  linodeFactory,
  regionFactory,
  widgetFactory,
} from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import { mockGetLinodes } from 'support/intercepts/linodes';
import { mockGetUserPreferences } from 'support/intercepts/profile';
import { mockGetRegions } from 'support/intercepts/regions';
import { extendRegion } from 'support/util/regions';
import { Database } from '@linode/api-v4';
import { generateRandomMetricsData } from 'support/util/cloudpulse';
import { mockGetDatabases } from 'support/intercepts/databases';

const timeDurationToSelect = 'Last 24 Hours';

const {
  metrics,
  id,
  serviceType,
  dashboardName,
  region,
  engine,
  clusterName,
  nodeType,
} = widgetDetails.dbaas;

const dashboard = dashboardFactory.build({
  label: dashboardName,
  service_type: serviceType,
  widgets: metrics.map(({ title, yLabel, name, unit }) => {
    return widgetFactory.build({
      label: title,
      y_label: yLabel,
      metric: name,
      unit,
    });
  }),
});

const metricDefinitions = {
  data: metrics.map(({ title, name, unit }) =>
    dashboardMetricFactory.build({
      label: title,
      metric: name,
      unit,
    })
  ),
};

const mockLinode = linodeFactory.build({
  label: clusterName,
  id: 1,
});

const mockAccount = accountFactory.build();
const mockRegion = extendRegion(
  regionFactory.build({
    capabilities: ['Linodes'],
    id: 'us-ord',
    label: 'Chicago, IL',
    country: 'us',
  })
);
const metricsAPIResponsePayload = cloudPulseMetricsResponseFactory.build({
  data: generateRandomMetricsData(timeDurationToSelect, '5 min'),
});

const databaseMock: Database = databaseFactory.build({
  label: clusterName,
  type: engine,
  region: region,
  version: '1',
  status: 'provisioning',
  cluster_size: 1,
  engine: 'mysql',
  hosts: {
    primary: undefined,
    secondary: undefined,
  },
});
const expectedStyles = {
  'background-color': 'rgba(0, 0, 0, 0)',
  'font-size': '14.4px',
  'border-color': 'rgb(105, 105, 112)',
  color: 'rgb(105, 105, 112)',
  height: '25px',
  padding: '4px 4px 4px 0px',
  margin: '0px',
  'border-width': '0px',
  'border-radius': '0px',
  'border-style': 'none',
  display: 'block',
  'text-align': 'start',
  'line-height': '14.4px',
  'font-weight': '400',
  'font-family': 'LatoWeb, sans-serif',
  cursor: 'text',
  visibility: 'visible',
  opacity: '1',
  'box-sizing': 'border-box',
  'z-index': 'auto',
  outline: 'rgb(105, 105, 112) none 0px',
  position: 'static',
  top: 'auto',
  left: 'auto',
};
function validateCssProperties(
  element: Cypress.Chainable,
  styles: { [key: string]: string }
) {
  Object.entries(styles).forEach(([property, value]) => {
    element.should('have.css', property, value);
  });
}

describe('Improved Dashboard CSS Validation', () => {
  beforeEach(() => {
    mockAppendFeatureFlags({
      aclp: { beta: true, enabled: true },
    });
    mockGetAccount(mockAccount);
    mockGetLinodes([mockLinode]);
    mockGetCloudPulseMetricDefinitions(serviceType, metricDefinitions);
    mockGetCloudPulseDashboards(serviceType, [dashboard]).as('fetchDashboard');
    mockGetCloudPulseServices(serviceType).as('fetchServices');
    mockGetCloudPulseDashboard(id, dashboard);
    mockCreateCloudPulseJWEToken(serviceType);
    mockCreateCloudPulseMetrics(serviceType, metricsAPIResponsePayload).as(
      'getMetrics'
    );
    mockGetRegions([mockRegion]);
    mockGetUserPreferences({});
    mockGetDatabases([databaseMock]).as('getDatabases');
    cy.visitWithLogin('monitor/dashboards');
    cy.viewport(1280, 720);
    cy.wait(['@fetchServices', '@fetchDashboard']);
  });

  it('should validate CSS for the dashboard UI', () => {
    cy.get('[data-testid="placeholder-icon"]')
      .should('exist')
      .and('be.visible')
      .and('have.css', 'height', '128px')
      .and('have.css', 'width', '128px')
      .and('have.css', 'padding', '16px')
      .and('have.css', 'color', 'rgb(0, 176, 80)')
      .should('have.attr', 'fill')
      .and('eq', 'currentColor');

    cy.get('[data-qa-header]')
      .should('exist')
      .and('be.visible')
      .and('have.text', 'Akamai Cloud Pulse')
      .and(($el) => {
        expect($el[0].tagName).to.eq('H1');
      });
    cy.get('[data-qa-header]').should(
      'have.css',
      'color',
      'rgb(105, 105, 112)'
    );

    cy.get(
      '.MuiTypography-root.MuiTypography-h2.css-1vbusvh-MuiTypography-root'
    )
      .should('exist')
      .and('be.visible')
      .and('have.text', 'Select a dashboard and filters to visualize metrics.')
      .and('have.css', 'color', 'rgb(105, 105, 112)');

    ui.autocomplete.findByLabel('Dashboard').then(($dashboard) => {
      const dashboardBottom = $dashboard[0].getBoundingClientRect().bottom;

      ui.autocomplete.findByLabel('Time Range').then(($timeRange) => {
        const timeRangeTop = $timeRange[0].getBoundingClientRect().top;
        const spacing = timeRangeTop - dashboardBottom;
        expect(spacing).to.equal(-25);
      });
    });

    cy.log('I am at dashboardName**********');

    ui.autocomplete.findByLabel('Dashboard').should('be.visible').focus();
    validateCssProperties(
      ui.autocomplete.findByLabel('Dashboard'),
      expectedStyles
    );
    cy.wait(500);

    ui.autocomplete
      .findByLabel('Dashboard')
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('268px');
      });

    ui.autocomplete.findByLabel('Dashboard').type(`${dashboardName}{enter}`);
    validateDropdownIsH3StyleWithBackground(
      'Dashboard',
      dashboardName,
      'rgb(0, 120, 215)',
      'rgb(16, 138, 214)'
    );

    cy.log('I am at Time Range **********');

    ui.autocomplete.findByLabel('Time Range').should('be.visible').focus();
    validateCssProperties(
      ui.autocomplete.findByLabel('Time Range'),
      expectedStyles
    );
    cy.wait(500);
    ui.autocomplete
      .findByLabel('Time Range')
      .clear()
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('226px');
      });

    ui.autocomplete
      .findByLabel('Time Range')
      .type(`${timeDurationToSelect}{enter}`);
    validateDropdownIsH3StyleWithBackground(
      'Time Range',
      timeDurationToSelect,
      'rgb(0, 120, 215)',
      'rgb(16, 138, 214)'
    );
    cy.log('I am at Database Engine **********');
    ui.autocomplete.findByLabel('Database Engine').should('be.visible').focus();
    validateCssProperties(
      ui.autocomplete.findByLabel('Database Engine'),
      expectedStyles
    );
    cy.wait(500);
    ui.autocomplete
      .findByLabel('Database Engine')
      .clear()
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('268px');
      });
    ui.autocomplete.findByLabel('Database Engine').type(`${engine}{enter}`);
    validateDropdownIsH3StyleWithBackground(
      'Database Engine',
      engine,
      'rgb(0, 120, 215)',
      'rgb(16, 138, 214)'
    );
    cy.log('I am at region **********');
    ui.autocomplete.findByLabel('Region').should('be.visible').focus();
    validateCssProperties(
      ui.autocomplete.findByLabel('Region'),
      expectedStyles
    );
    cy.wait(500);
    ui.autocomplete
      .findByLabel('Region')
      .clear()
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('268px');
      });
    ui.autocomplete.findByLabel('Region').type(`${region}{enter}`);
    validateDropdownIsH3StyleWithBackground(
      'Region',
      region,
      'rgb(0, 120, 215)',
      'rgb(16, 138, 214)'
    );

    cy.log('I am at Database Clusters **********');
    ui.autocomplete
      .findByLabel('Database Clusters')
      .should('be.visible')
      .focus();
    validateCssProperties(
      ui.autocomplete.findByLabel('Database Clusters'),
      expectedStyles
    );
    cy.wait(500);
    ui.autocomplete
      .findByLabel('Database Clusters')
      .clear()
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('268px');
      });
    ui.autocomplete
      .findByLabel('Database Clusters')
      .type(`${clusterName}{enter}`);
    cy.log('I am at Node **********');
    ui.autocomplete.findByLabel('Node Type').should('be.visible').focus();
    validateCssProperties(
      ui.autocomplete.findByLabel('Node Type'),
      expectedStyles
    );
    cy.wait(500);
    ui.autocomplete
      .findByLabel('Node Type')
      .clear()
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('268px');
      });
    ui.autocomplete.findByLabel('Node Type').type(`${nodeType}{enter}`);
    validateDropdownIsH3StyleWithBackground(
      'Node Type',
      nodeType,
      'rgb(0, 120, 215)',
      'rgb(16, 138, 214)'
    );
    cy.wait(['@getMetrics', '@getMetrics', '@getMetrics', '@getMetrics']);

    cy.get('.MuiGrid-container')
      .should('exist')
      .then(($el) => {
        const element = $el[0];
        const style = window.getComputedStyle(element);

        const borderColor = style.borderColor;
        const isVisible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';

        expect(borderColor).to.equal('rgb(105, 105, 112)');
        expect(isVisible).to.equal(true);
      });
    cy.get('.MuiGrid-root.MuiGrid-container.MuiGrid-item', { timeout: 10000 })
      .should('exist')

      .then(($el) => {
        const computedStyle = window.getComputedStyle($el[0]);
        expect(computedStyle.marginTop).to.equal('24px');
        expect(computedStyle.marginBottom).to.equal('24px');
        expect(computedStyle.marginLeft).to.equal('24px');
        expect(computedStyle.marginRight).to.equal('24px');
      });
    cy.get('.MuiGrid-root.MuiGrid-container.css-11lq3yg-MuiGrid-root')
      .should('be.visible')
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.width).to.eq(1016);
      });

    ui.button
      .findByAttribute('aria-label', 'Refresh Dashboard Metrics')
      .should('be.visible')
      .then(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.width).to.eq(34);
        const computedStyle = window.getComputedStyle($el[0]);
        expect(computedStyle.marginTop).to.equal('28px');
      });
    cy.get('.MuiTypography-h2')
      .eq(0)
      .invoke('prop', 'tagName')
      .then((tagName) => {
        expect(tagName).to.equal('H2');
      });

    const widgetSelector = `[data-qa-widget='CPU Utilization']`;
    cy.get(widgetSelector)
      .should('be.visible')
      .and('have.css', 'background-color', 'rgb(255, 255, 255)') // Validate background color
      .and('have.css', 'font-size', '14px') // Validate font size
      .and('have.css', 'border-color', 'rgb(105, 105, 112)') // Validate border color
      .and('have.css', 'color', 'rgb(105, 105, 112)')
      .and('have.css', 'width', '1016px')
      .and('have.css', 'height', '555px')
      .and('have.css', 'padding', '17px 24px 24px')
      .and('have.css', 'margin', '0px') // Validate margin
      .and('have.css', 'border-width', '0px') // Validate border width
      .and('have.css', 'border-radius', '0px') // Validate border radius
      .and('have.css', 'border-style', 'none') // Validate border style
      .and('have.css', 'display', 'block') // Validate display type
      .and('have.css', 'text-align', 'start') // Validate text alignment
      .and('have.css', 'line-height', '18px') // Validate line height
      .and('have.css', 'font-weight', '400') // Validate font weight
      .and('have.css', 'font-family', 'LatoWeb, sans-serif') // Validate font family
      .and('have.css', 'cursor', 'auto') // Validate cursor type
      .and('have.css', 'visibility', 'visible') // Validate visibility
      .and('have.css', 'opacity', '1') // Validate opacity
      .and('have.css', 'box-sizing', 'border-box') // Validate box-sizing
      .and('have.css', 'z-index', 'auto') // Validate z-index (if applicable)
      .and('have.css', 'outline', 'rgb(105, 105, 112) none 0px') // Validate outline
      .and('have.css', 'position', 'static') // Validate position type (if applicable)
      .and('have.css', 'top', 'auto') // Validate vertical position (if applicable)
      .and('have.css', 'left', 'auto') // Validate horizontal position (if applicable)
      .within(() => {
        validateCssProperties(
          ui.autocomplete.findByLabel('Select an Aggregate Function'),
          expectedStyles
        );

        ui.button
          .findByAttribute('aria-label', 'Zoom In')
          .should('be.visible')
          .then(($el) => {
            const rect = $el[0].getBoundingClientRect();
            expect(rect.width).to.eq(20);
          });
        cy.log("select an Aggregate Function'");

        ui.autocomplete
          .findByLabel('Select an Aggregate Function')
          .should('be.visible');
        cy.log('Select an Aggregate Function ******************');
        validateCssProperties(
          ui.autocomplete.findByLabel('Select an Aggregate Function'),
          expectedStyles
        );
        ui.autocomplete
          .findByLabel('Select an Aggregate Function')
          .invoke('css', 'width')
          .then((width) => {
            expect(width).to.equal('46px');
          });

        cy.findByTestId('areachart-wrapper')
          .should('be.visible')
          .then(($el) => {
            const rect = $el[0].getBoundingClientRect();
            expect(rect.width).to.eq(936);
          });

        cy.get('tr[data-qa-metric-row="true"]')
          .should('be.visible')
          .then(($el) => {
            const rect = $el[0].getBoundingClientRect();
            expect(rect.width).to.eq(934);
          });
      });
    cy.log('Select an Interval******************');
    ui.autocomplete.findByLabel('Select an Interval').should('be.visible');
    validateCssProperties(
      ui.autocomplete.findByLabel('Select an Interval'),
      expectedStyles
    );
    ui.autocomplete
      .findByLabel('Select an Interval')
      .invoke('css', 'width')
      .then((width) => {
        expect(width).to.equal('46px');
      });

    cy.get(widgetSelector)
      .should('be.visible')
      .within(() => {
        cy.findByTestId('areachart-wrapper')
          .should('be.visible')
          .then(($el) => {
            const rect = $el[0].getBoundingClientRect();
            cy.wait(500);
            cy.log(
              `Graph Dimensions: Width = ${rect.width}, Height = ${rect.height}`
            );
            expect(rect.width).to.eq(936); // Update with your expected width
            expect(rect.height).to.eq(424); // Update with your expected height
            const computedStyle = window.getComputedStyle($el[0]);
            expect(computedStyle.fontSize).to.equal('14px'); // Replace with your H3 font size
            expect(computedStyle.color).to.equal('rgb(105, 105, 112)');
            expect(computedStyle.backgroundColor).to.equal('rgba(0, 0, 0, 0)');
            expect(computedStyle.height).to.equal('424px');
            expect(computedStyle.border).to.equal(
              '0px none rgb(105, 105, 112)'
            );
            expect(computedStyle.fontFamily).to.equal('LatoWeb, sans-serif');
            expect(computedStyle.borderTop).to.equal(
              '0px none rgb(105, 105, 112)'
            );
            expect(computedStyle.fill).to.equal('rgb(0, 0, 0)');
          });
      });
  });

  function validateDropdownIsH3StyleWithBackground(
    label: string,
    optionToSelect: string,
    expectedBackgroundColor: string,
    expectedBackgroundColor1: string
  ) {
    cy.findByLabelText(label)
      .should('be.visible')
      .scrollIntoView()
      .click()
      .then(() => {
        cy.get('[data-testid="autocomplete-popper"]')
          .contains('[role="option"]', optionToSelect)
          .should('have.class', 'Mui-focused')
          .within(() => {
            cy.wait(500);
            cy.contains('[role="option"]', optionToSelect)
              .should('exist')
              .then(($el) => {
                const element = $el[0];
                const computedStyle = window.getComputedStyle(element);

                const fontSize = computedStyle.fontSize;
                expect(fontSize).to.equal('14.4px'); // Replace with your H3 font size

                const fontWeight = computedStyle.fontWeight;
                expect(fontWeight).to.equal('400'); // Replace with your H3 font weight

                const fontColor = computedStyle.color;
                expect(fontColor).to.equal('rgb(255, 255, 255)'); // Replace with your H3 font color

                const backgroundColor = computedStyle.backgroundColor;
                cy.log(`Background Color: ${backgroundColor}`);
                expect(backgroundColor).to.equal(expectedBackgroundColor1); // Expected background color
              });
          });
      });
  }
});
