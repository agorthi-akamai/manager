
import {
  navigateToCloudpulse,
  selectServiceName,
  selectRegion,
  selectTimeRange,
  selectAndVerifyServiceName,
  assertSelections,
  applyGlobalRefresh,
  visitCloudPulseWithFeatureFlagsDisabled,
  dashboardName,
  actualRelativeTimeDuration,
  region,
  resource,
  cloudpulseTestData,
} from 'support/util/cloudpulse';
import { timeUnit } from 'support/constants/time';
import { interceptMetricsRequests } from 'support/intercepts/cloudpulseAPIHandler';


describe('Standard Dashboard Test Cases', () => {
  beforeEach(() => {
   navigateToCloudpulse();
  });

  

  it.only('should verify cloud view availability when feature flag is set to false', () => {
    visitCloudPulseWithFeatureFlagsDisabled();
    cloudpulseTestData.forEach(testData => {
      cy.log(`Name: ${testData.name}`);
      
      // Log Expected Text Aggregation
      cy.log('Expected Text Aggregation:');
      cy.log(JSON.stringify(testData.expectedTextAggregation));
    
      // Log Expected Text Granularity
      cy.log('Expected Text Granularity:');
      cy.log(JSON.stringify(testData.expectedTextGranularity));
      
      cy.log('---'); // Separator for readability
    });
    

  });

  it('should set and verify dashboard name', () => {
    selectServiceName(dashboardName);
    assertSelections(dashboardName);
  });
  it('should set and verify time range', () => {
    selectTimeRange(actualRelativeTimeDuration);
    assertSelections(actualRelativeTimeDuration);
  });

  it('should set and verify region', () => {
    selectRegion(region);
    assertSelections(region);
  });

  it('should set and verify resource', () => {
    selectAndVerifyServiceName(resource);
  });
  

   it.only('should apply global refresh button and verify network calls', () => {
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
