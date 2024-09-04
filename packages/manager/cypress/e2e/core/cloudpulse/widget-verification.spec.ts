
import {
    navigateToCloudpulse,
    selectTimeRange,
    cloudpulseTestData,
    validateWidgetTitle,
    setGranularity,
    setAggregation,
    verifyGranularity,
    verifyAggregation,
    verifyZoomInOut,
    applyGlobalRefresh,

  } from 'support/util/cloudpulse';
  import { widgets } from 'support/constants/widgets';
  import { timeUnit } from 'support/constants/time';
import { interceptMetricsRequests } from 'support/intercepts/cloudpulseAPIHandler';
import { timeRange } from 'support/constants/timerange';
export const actualRelativeTimeDuration = timeRange.Last30Minutes;

   /**
     * This test ensures that widget titles are displayed correctly on the dashboard.
     * This test suite is dedicated to verifying the functionality and display of widgets on the Cloudpulse dashboard.
     *  It includes:
     * Validating that widgets are correctly loaded and displayed.
     * Ensuring that widget titles and data match the expected values.
     * Verifying that widget settings, such as granularity and aggregation, are applied correctly.
      * Testing widget interactions, including zooming and filtering, to ensure proper behavior.
     * Each test ensures that widgets on the dashboard operate correctly and display accurate information.
     */
  
  describe('Dashboard Widget Verification Tests', () => {
    beforeEach(() => {
      navigateToCloudpulse();
     selectTimeRange(actualRelativeTimeDuration);
     
     });
  
     it(`should verify the title of the  widget`, () => {
        cloudpulseTestData.forEach((testData) => {
        validateWidgetTitle(widgets[testData.name]);
      });
    });
    it(`should set available granularity of the all the widget`, () => {
        cloudpulseTestData.forEach((testData) => {
        setGranularity(widgets[testData.name],testData.expectedGranularity);
      });
    });
    it(`should set available aggregation of the all the widget`, () => {
        cloudpulseTestData.forEach((testData) => {
        setAggregation(widgets[testData.name],testData.expectedAggregation);
      });
    });
    it(`should verify available granularity  of the widget`, () => {
        cloudpulseTestData.forEach((testData) => {
       verifyGranularity(widgets[testData.name], testData.expectedGranularityArray);
      });
    });
    
    it(`should verify available Aggregation  of the widget`, () => {
      cloudpulseTestData.forEach((testData) => {
     verifyAggregation(widgets[testData.name], testData.expectedAggregationArray);
    });
  });
  it(`should zoom in and out of  the all the widget`, () => {
    cloudpulseTestData.forEach((testData) => {
      verifyZoomInOut(widgets[testData.name]);
  });
});
it('should apply global refresh button and verify network calls', () => {
  applyGlobalRefresh();
  interceptMetricsRequests().then((xhrArray) => {
    xhrArray.forEach((xhr) => {
         const requestPayload = xhr.request.body;
         const metricIndex = cloudpulseTestData.findIndex( (testdata) => testdata.name === requestPayload['metric'] );
         if (metricIndex !== -1) {
          const currentGranularity =requestPayload['time_granularity']?.value + requestPayload['time_granularity']?.unit;
          const relativeTimeDurationUnit = requestPayload.relative_time_duration.unit.toLowerCase();
          const currentRelativeTimeDuration = 'Last' +requestPayload['relative_time_duration']?.value +
          timeUnit[relativeTimeDurationUnit as keyof typeof timeUnit];
          if (relativeTimeDurationUnit &&relativeTimeDurationUnit in timeUnit ) {
          expect(requestPayload.aggregate_function).to.equal(cloudpulseTestData[metricIndex].expectedAggregation);
          expect(currentRelativeTimeDuration).to.containIgnoreSpaces(actualRelativeTimeDuration);
          expect(currentGranularity).to.containIgnoreSpaces(cloudpulseTestData[metricIndex].expectedGranularity );
          expect(requestPayload['metric']).to.containIgnoreSpaces(cloudpulseTestData[metricIndex].name );
         }
         else {
          throw new Error(`Unknown query: ${requestPayload.query}`);
        }
        }
         
      
    });
  });
});
  });
  