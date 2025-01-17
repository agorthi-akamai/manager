/**
 * @file Integration Tests for CloudPulse Dbass Dashboard.
 */
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
  profileFactory,
  regionFactory,
  widgetFactory,
} from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import { mockGetProfile, mockGetUserPreferences } from 'support/intercepts/profile';
import { mockGetRegions } from 'support/intercepts/regions';
import { Database } from '@linode/api-v4';
import { generateRandomMetricsData } from 'support/util/cloudpulse';
import { mockGetDatabases } from 'support/intercepts/databases';
import type { Flags } from 'src/featureFlags';
import { Interception } from 'cypress/types/net-stubbing';
import { convertToGmt } from 'src/features/CloudPulse/shared/CloudPulseDateTimeRangePicker';
import { DateTime } from 'luxon';

// Constants for repeated values
const TIMEZONE = 'Asia/Kolkata';
const REGION_ID = 'us-ord';
const REGION_LABEL = 'Chicago, IL';

// Mock region
const mockRegion = regionFactory.build({
  capabilities: ['Managed Databases'],
  id: REGION_ID,
  label: REGION_LABEL,
});

// Feature flags
const flags: Partial<Flags> = {
  aclp: { enabled: true, beta: true },
  aclpResourceTypeMap: [
    {
      dimensionKey: 'LINODE_ID',
      maxResourceSelections: 10,
      serviceType: 'linode',
      supportedRegionIds: '',
    },
    {
      dimensionKey: 'cluster_id',
      maxResourceSelections: 10,
      serviceType: 'dbaas',
      supportedRegionIds: REGION_ID,
    },
  ],
};

const { metrics, id, serviceType, dashboardName, engine, nodeType } = widgetDetails.dbaas;

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

const mockAccount = accountFactory.build();

const metricsAPIResponsePayload = cloudPulseMetricsResponseFactory.build({
  data: generateRandomMetricsData('Last 30 Days', '1 day'),
});
const databaseMock: Database = databaseFactory.build({
  type: engine,
  region: mockRegion.label,
});
const mockProfile = profileFactory.build({ timezone: TIMEZONE });

/**
 * Generates a date in Indian Standard Time (IST) based on a specified number of days offset,
 * hour, and minute. The function also provides individual date components such as day, hour,
 * minute, month, and AM/PM.
 *
 * @param {number} daysOffset - The number of days to adjust from the current date. Positive
 *                               values give a future date, negative values give a past date.
 * @param {number} hour - The hour to set for the resulting date (0-23).
 * @param {number} [minute=0] - The minute to set for the resulting date (0-59). Defaults to 0.
 *
 * @returns {Object} - Returns an object containing:
 *   - `actualDate`: The formatted date and time in IST (YYYY-MM-DD HH:mm).
 *   - `day`: The day of the month as a number.
 *   - `hour`: The hour in the 24-hour format as a number.
 *   - `minute`: The minute of the hour as a number.
 *   - `month`: The month of the year as a number.
 *   - `ampm`: The AM/PM designation of the time (either 'AM' or 'PM').
 */
const getDateRangeInIST = (daysOffset: number, hour: number, minute: number = 0) => {
  const now = DateTime.now().set({ hour, minute }).minus({ days: daysOffset }).setZone(TIMEZONE);
  return {
    actualDate: now.toFormat('yyyy-LL-dd HH:mm'),
    day: now.day,
    hour: now.hour,
    minute: now.minute,
    month: now.month,
    ampm: now.toFormat('a'),
  };
};

describe('Integration Tests for DBaaS Dashboard', () => {
  beforeEach(() => {
    // Mock feature flags and API responses
    mockAppendFeatureFlags(flags);
    mockGetAccount(mockAccount);
    mockGetProfile(mockProfile).as('getProfile');
    mockGetCloudPulseMetricDefinitions(serviceType, metricDefinitions.data);
    mockGetCloudPulseDashboards(serviceType, [dashboard]).as('fetchDashboard');
    mockGetCloudPulseServices(serviceType).as('fetchServices');
    mockGetCloudPulseDashboard(id, dashboard);
    mockCreateCloudPulseJWEToken(serviceType);
    mockCreateCloudPulseMetrics(serviceType, metricsAPIResponsePayload).as('getMetrics');
    mockGetRegions([mockRegion]);
    mockGetUserPreferences({
      aclpPreference: {
        dashboardId: id,
        engine: engine.toLowerCase(),
        resources: ['1'],
        region: mockRegion.id,
      },
    }).as('fetchPreferences');
    mockGetDatabases([databaseMock]).as('getDatabases');

    // Visit the monitor page
    cy.visitWithLogin('monitor');

    // Wait for the preferences and dashboard API calls to complete before proceeding
    cy.wait('@fetchPreferences');
    cy.wait(['@fetchServices', '@fetchDashboard']);
  });

  it('should allow users to select their desired granularity and see the most recent data from the API reflected in the graph', () => {
    // Define start and end dates
    const startDate = getDateRangeInIST(32, 0, 0);
    const endDate = getDateRangeInIST(0, 0, 0);

    // Select custom time range
    ui.autocomplete.findByLabel('Time Range').scrollIntoView().should('be.visible').type('Custom');
    ui.autocompletePopper.findByTitle('Custom').should('be.visible').click();

    // Set start date
    cy.findByPlaceholderText('Select Start Date').should('be.visible').click();
    cy.findByTitle('Previous month').should('be.visible').click();
    cy.findByRole('gridcell', { name: startDate.day.toString() }).should('be.visible').click();
    cy.findByRole('button', { name: 'Apply' }).should('be.visible').click();
    cy.findByPlaceholderText('Select Start Date').should(
      'have.value',
      `${startDate.actualDate} (${mockProfile.timezone})`
    );

    // Set end date
    cy.findByPlaceholderText('Select End Date').should('be.visible').click();
    cy.findByRole('gridcell', { name: endDate.day.toString() }).should('be.visible').click();
    cy.findByRole('button', { name: 'Apply' }).should('be.visible').click();
    cy.findByPlaceholderText('Select End Date').should(
      'have.value',
      `${endDate.actualDate} (${mockProfile.timezone})`
    );

    // Select node type
    ui.autocomplete.findByLabel('Node Type').should('be.visible').type(`${nodeType}{enter}`);

    // Wait for all metrics query requests to resolve
    cy.wait(['@getMetrics', '@getMetrics', '@getMetrics', '@getMetrics']);

    // Verify the metrics request payloads
    cy.get('@getMetrics.all').should('have.length', 4).each((xhr: unknown) => {
      const interception = xhr as Interception;
      const { body: requestPayload } = interception.request;

      expect(requestPayload.absolute_time_duration.start).to.equal(
        convertToGmt(startDate.actualDate.replace(' ', 'T'))
      );

      expect(requestPayload.absolute_time_duration.end).to.equal(
        convertToGmt(endDate.actualDate.replace(' ', 'T'))
      );
    });

    // Select "Last 30 Days" time range
    cy.findByRole('button', { name: 'Presets' }).should('be.visible').click();
    ui.autocomplete.findByLabel('Time Range').should('be.visible').type('Last 30 Days');
    ui.autocompletePopper.findByTitle('Last 30 Days').should('be.visible').click();

    // Wait for all metrics query requests to resolve
    cy.get('@getMetrics.all').should('have.length', 8).invoke('slice', 4).each((xhr: unknown) => {
      const interception = xhr as Interception;
      const { body: requestPayload } = interception.request;
      expect(requestPayload.relative_time_duration.unit).to.equal('days');
      expect(requestPayload.relative_time_duration.value).to.equal(30);
    });
  });
});