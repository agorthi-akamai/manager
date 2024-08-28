import {
  mockAppendFeatureFlags,
  mockGetFeatureFlagClientstream,
} from 'support/intercepts/feature-flags';
import { makeFeatureFlagData } from 'support/util/feature-flags';
import { Cloudpulse } from 'support/util/CloudpulsePage';
import { TimeUnit } from 'support/constants/TimeEnums';
import { Granularity } from 'support/constants/Granularity';
import { Aggregation } from 'support/constants/Aggregation';
import { TimeRange } from 'support/constants/TimeRange';
import { interceptMetricsRequests } from 'support/intercepts/cloudpulseAPIHandler';


const dashboardName = 'Linode Service I/O Statistics';
const region = 'Chicago, IL';
const actualRelativeTimeDuration = TimeRange.Last24Hours;
const expectedTextsCommonGranularity = [
  Granularity.Auto,
  Granularity.Min1,
  Granularity.Min5,
  Granularity.Hr1,
  Granularity.Day1,
];
const resource = 'test1';
const expectedTextAgg = [Aggregation.Max, Aggregation.Min, Aggregation.Avg];
const expectedTextAggregationCommon = [
  Aggregation.Max,
  Aggregation.Min,
  Aggregation.Avg,
  Aggregation.Sum,
];

const cloudPulsePage = new Cloudpulse();

const SDTestData = [
  {
    name: 'system_disk_OPS_total',
    expectedTextAggregation: expectedTextAggregationCommon,
    expectedTextGranularity: expectedTextsCommonGranularity,
    granularity: Granularity.Hr1,
    aggregation: Aggregation.Max,
  },
  {
    name: 'system_network_io_by_resource',
    expectedTextAggregation: expectedTextAggregationCommon,
    expectedTextGranularity: expectedTextsCommonGranularity,
    granularity: Granularity.Day1,
    aggregation: Aggregation.Sum,
  },
  {
    name: 'system_network_io_by_resource',
    expectedTextAggregation: expectedTextAggregationCommon,
    expectedTextGranularity: expectedTextsCommonGranularity,
    granularity: Granularity.Hr1,
    aggregation: Aggregation.Max,
  },
  {
    name: 'system_memory_usage_by_resource',
    expectedTextAggregation: expectedTextAggregationCommon,
    expectedTextGranularity: expectedTextsCommonGranularity,
    granularity: Granularity.Hr1,
    aggregation: Aggregation.Max,
  },
  {
    name: 'system_cpu_utilization_percent',
    expectedTextAggregation: expectedTextAgg,
    expectedTextGranularity: expectedTextsCommonGranularity,
    granularity: Granularity.Hr1,
    aggregation: Aggregation.Max,
  },
];

describe('Standard Dashboard Test Cases', () => {
  beforeEach(() => {
   cloudPulsePage.navigateToCloudpulse();
  });

  it('should verify cloud view availability when feature flag is set to false', () => {
    cy.visitWithLogin('/linodes');
    mockAppendFeatureFlags({
      aclp: makeFeatureFlagData(false),
    }).as('getFeatureFlags');
    mockGetFeatureFlagClientstream().as('getClientStream');
    cy.findByLabelText('Monitor').should('not.exist');
  });

  it('should set and verify dashboard name', () => {
    cloudPulsePage.selectServiceName(dashboardName);
    cloudPulsePage.assertSelections(dashboardName);
  });
  it('should set and verify time range', () => {
    cloudPulsePage.selectTimeRange(actualRelativeTimeDuration);
    cloudPulsePage.assertSelections(actualRelativeTimeDuration);
  });

  it.only('should set and verify region', () => {
    cloudPulsePage.selectRegion(region);
    cloudPulsePage.assertSelections(region);
  });

  it('should set and verify resource', () => {
    cloudPulsePage.selectRegion(region);
    cloudPulsePage.selectAndVerifyServiceName(resource);
  });
  

   it('should apply global refresh button and verify network calls', () => {
    cloudPulsePage.applyGlobalRefresh();
    interceptMetricsRequests().then((xhrArray) => {
      xhrArray.forEach((xhr: any) => {
        const requestPayload = xhr.request.body;
        const metricIndex = SDTestData.findIndex( (testdata) => testdata.name === requestPayload['metric'] );

        if (metricIndex !== -1) {
          const currentAggregation = requestPayload['aggregate_function'];
          const currentGranularity =
          requestPayload['time_granularity']?.value + requestPayload['time_granularity']?.unit;
          const relativeTimeDurationUnit =requestPayload['relative_time_duration']?.unit;
          if (relativeTimeDurationUnit &&relativeTimeDurationUnit in TimeUnit ) {
            const currentRelativeTimeDuration = 'Last' +
              requestPayload['relative_time_duration']?.value +
              TimeUnit[relativeTimeDurationUnit as keyof typeof TimeUnit];
            SDTestData[metricIndex].aggregation = currentAggregation;
            SDTestData[metricIndex].granularity = currentGranularity;
            assert.equal( currentAggregation, SDTestData[metricIndex].aggregation);
            expect(currentGranularity).to.containIgnoreSpaces(SDTestData[metricIndex].granularity );
            expect(currentRelativeTimeDuration).to.containIgnoreSpaces(actualRelativeTimeDuration);
          } else {
            throw new Error( `Unknown or invalid time unit: ${relativeTimeDurationUnit}`);
          }
        } else {
          throw new Error(`Unknown query: ${requestPayload.query}`);
        }
      });
    });
  });
});
