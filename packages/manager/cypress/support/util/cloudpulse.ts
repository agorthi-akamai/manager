import { ui } from 'support/ui';
import {
  mockAppendFeatureFlags,
  mockGetFeatureFlagClientstream,
} from 'support/intercepts/feature-flags';
import { makeFeatureFlagData } from 'support/util/feature-flags';
import 'cypress-wait-until';
import { granularity } from 'support/constants/granularity';
import { aggregation,aggregationConfig } from 'support/constants/aggregation';
import { timeRange } from 'support/constants/timeRange';



export const dashboardName = 'Linode Service I/O Statistics';
export const region = 'Chicago, IL';
export const actualRelativeTimeDuration = timeRange.Last24Hours;

export const resource = 'test1';


export const cloudpulseTestData = [
  {
    name: 'system_disk_OPS_total',
    expectedTextAggregation: aggregationConfig.all,
    expectedTextGranularity: Object.values(granularity),
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
  {
    name: 'system_network_io_by_resource',
    expectedTextAggregation: aggregationConfig.all,
    expectedTextGranularity:Object.values(granularity),
    granularity: granularity.Day1,
    aggregation: aggregation.Sum,
  },
  {
    name: 'system_network_io_by_resource',
    expectedTextAggregation: aggregationConfig.all,
    expectedTextGranularity: Object.values(granularity),
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
  {
    name: 'system_memory_usage_by_resource',
    expectedTextAggregation: aggregationConfig.all,
    expectedTextGranularity: Object.values(granularity),
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
  {
    name: 'system_cpu_utilization_percent',
    expectedTextAggregation: aggregationConfig.basic,
    expectedTextGranularity: Object.values(granularity),
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
];

export const navigateToCloudpulse = () => {
  mockAppendFeatureFlags({ aclp: makeFeatureFlagData(true) }).as(
    'getFeatureFlags'
  );
  mockGetFeatureFlagClientstream().as('getClientStream');
  cy.visitWithLogin('/monitor/cloudpulse', {
    onLoad: (contentWindow: Window) => {
      if (contentWindow.document.readyState !== 'complete') {
        throw new Error('Page did not load completely');
      }
    },
    timeout: 5000,
  });
  cy.wait(['@getFeatureFlags', '@getClientStream']);
  cy.url().should('include', '/monitor/cloudpulse');
};
export const visitCloudPulseWithFeatureFlagsDisabled = () => {
  cy.visitWithLogin('/linodes');
    mockAppendFeatureFlags({
      aclp: makeFeatureFlagData(false),
    }).as('getFeatureFlags');
    mockGetFeatureFlagClientstream().as('getClientStream');
    cy.findByLabelText('Monitor').should('not.exist');
};

export const selectServiceName = (serviceName: string) => {
  ui.autocomplete.findByPlaceholderCustom('Select Dashboard').click().clear();
  ui.autocompletePopper.findByTitle(serviceName).should('be.visible').click();
};

export const selectRegion = (region: string) => {
  ui.regionSelect.find().should('be.visible').click().type(region).click();
};

export const selectTimeRange = (timeRange: string) => {
  ui.autocomplete.findByTestId('cloudpulse-time-duration').click();
  ui.autocompletePopper.findByTitle(timeRange).click();
};

export const selectAndVerifyServiceName = (service: string) => {
  const resourceInput = cy.findByPlaceholderText('Select Resources');
  resourceInput.click();
  cy.get('li[role="option"]').each(($el) => {
    const itemText = $el.text().trim();
    const ariaSelected = $el.attr('aria-selected');
    if (itemText === service && ariaSelected === 'true') {
      cy.log(`${service} is already selected, no need to click.`);
    } else if (itemText === service && ariaSelected === 'false') {
      resourceInput.click().type(`${service}{enter}`);
      expect(itemText).to.equal(service);
    }
    cy.get('body').click(0, 0);
  });
};

export const assertSelections = (expectedOptions: string) => {
  expect(cy.get(`[value*='${expectedOptions}']`), expectedOptions);
};

export const applyGlobalRefresh = () => {
  cy.get('[data-test-id="ReloadIcon"]', { timeout: 10000 })
    .should('exist')
    .should('be.visible')
    .then(($icon) => {
      cy.wrap($icon).scrollIntoView();
      cy.wrap($icon).click();
    });
};
