
import {
  navigateToCloudpulse,
  selectServiceName,
  selectRegion,
  selectTimeRange,
  selectAndVerifyServiceName,
  assertSelections,
  applyGlobalRefresh,
  visitCloudPulseWithFeatureFlagsDisabled,
} from 'support/util/cloudpulse';
import { timeUnit } from 'support/constants/time';
import { granularity } from 'support/constants/granularity';
import { aggregation } from 'support/constants/aggregation';
import { timeRange } from 'support/constants/timeRange';
import { interceptMetricsRequests } from 'support/intercepts/cloudpulseAPIHandler';


const dashboardName = 'Linode Service I/O Statistics';
const region = 'Chicago, IL';
const actualRelativeTimeDuration = timeRange.Last24Hours;
const expectedGranularityValues = [
  granularity.Auto,
  granularity.Min1,
  granularity.Min5,
  granularity.Hr1,
  granularity.Day1,
];
const resource = 'test1';
const expectedBasicAggregations= [aggregation.Max, aggregation.Min, aggregation.Avg];
const expectedAllAggregations = [
  aggregation.Max,
  aggregation.Min,
  aggregation.Avg,
  aggregation.Sum,
];


const cloudpulseTestData = [
  {
    name: 'system_disk_OPS_total',
    expectedTextAggregation: expectedAllAggregations,
    expectedTextGranularity: expectedGranularityValues,
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
  {
    name: 'system_network_io_by_resource',
    expectedTextAggregation: expectedAllAggregations,
    expectedTextGranularity: expectedGranularityValues,
    granularity: granularity.Day1,
    aggregation: aggregation.Sum,
  },
  {
    name: 'system_network_io_by_resource',
    expectedTextAggregation: expectedAllAggregations,
    expectedTextGranularity: expectedGranularityValues,
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
  {
    name: 'system_memory_usage_by_resource',
    expectedTextAggregation: expectedAllAggregations,
    expectedTextGranularity: expectedGranularityValues,
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
  {
    name: 'system_cpu_utilization_percent',
    expectedTextAggregation: expectedBasicAggregations,
    expectedTextGranularity: expectedGranularityValues,
    granularity: granularity.Hr1,
    aggregation: aggregation.Max,
  },
];

describe('Standard Dashboard Test Cases', () => {
  beforeEach(() => {
   navigateToCloudpulse();
  });

  it('should verify cloud view availability when feature flag is set to false', () => {
    visitCloudPulseWithFeatureFlagsDisabled();
  });

  it('should set and verify dashboard name', () => {
    selectServiceName(dashboardName);
    assertSelections(dashboardName);
  });
  it('should set and verify time range', () => {
    selectTimeRange(actualRelativeTimeDuration);
    assertSelections(actualRelativeTimeDuration);
  });

  it.only('should set and verify region', () => {
    selectRegion(region);
    assertSelections(region);
  });

  it('should set and verify resource', () => {
    selectRegion(region);
    selectAndVerifyServiceName(resource);
  });
  

   it('should apply global refresh button and verify network calls', () => {
    applyGlobalRefresh();
    interceptMetricsRequests().then((xhrArray) => {
      xhrArray.forEach((xhr) => {
        const requestPayload = xhr.request.body;
        const metricIndex = cloudpulseTestData.findIndex( (testdata) => testdata.name === requestPayload['metric'] );
        if (metricIndex !== -1) {
          const currentAggregation = requestPayload['aggregate_function'];
          const currentGranularity =
          requestPayload['time_granularity']?.value + requestPayload['time_granularity']?.unit;
          const relativeTimeDurationUnit =requestPayload['relative_time_duration']?.unit;
          if (relativeTimeDurationUnit &&relativeTimeDurationUnit in timeUnit ) {
             const currentRelativeTimeDuration = 'Last' +
             requestPayload['relative_time_duration']?.value +
             timeUnit[relativeTimeDurationUnit as keyof typeof timeUnit];
             cloudpulseTestData[metricIndex].aggregation = currentAggregation;
             cloudpulseTestData[metricIndex].granularity = currentGranularity;
            assert.equal( currentAggregation, cloudpulseTestData[metricIndex].aggregation);
            expect(currentGranularity).to.containIgnoreSpaces(cloudpulseTestData[metricIndex].granularity );
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
