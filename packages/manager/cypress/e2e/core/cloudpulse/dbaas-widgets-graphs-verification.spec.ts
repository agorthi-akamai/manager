import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import { accountFactory } from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import { mockGetUserPreferences } from 'support/intercepts/profile';
import { CloudPulseMetricsResponse } from '@linode/api-v4';
import { Interception } from 'cypress/types/net-stubbing';
import { UserPreferences } from '@linode/api-v4/src/profile';
import { formatToolTip } from 'src/features/CloudPulse/Utils/unitConversion';
import { apiMatcher } from 'support/util/intercepts';
import { ui } from 'support/ui';

const MetricType = {
 CPU_USAGE: { value: 'cpu_usage', value1: 'CPU Usage', unit: '%' },
 /* READ_IOPS: { value: 'read_iops', value1: 'Disk I/O Read', unit: 'IOPS' },
  AVAILABLE_DISK: { value: 'available_disk', value1: 'Available Disk Space',unit: 'GB'},
  MEMORY_USAGE: { value: 'memory_usage', value1: 'Memory Usage', unit: '%' },
  AVAILABLE_MEMORY: { value: 'available_memory',value1: 'Available Memory', unit: 'GB'},
  DISK_USAGE: { value: 'disk_usage', value1: 'Disk Space Usage', unit: '%' },
  WRITE_IOPS: { value: 'write_iops', value1: 'Disk I/O Write', unit: 'IOPS' },*/
} as const;

const TimePeriods = {
  LAST_7_DAYS: 'Last 7 Days',
  LAST_12_HOURS: 'Last 12 Hours',
  LAST_24_HOURS: 'Last 24 Hours',
  LAST_30_DAYS: 'Last 30 Days',
  LAST_30_MINUTES: 'Last 30 Minutes',
};

enum TimeUnit {
  HOURS = 'hr',
  DAYS = 'days',
  MINUTES = 'min',
}

enum TimeValue {
  ONE = 1,
  FIVE = 5,
}

enum Aggregation {
  AVG = 'avg',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
}

enum DatabaseEngine {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
}

enum NodeType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

const clusterId = ['13418'];
const nodeId = 'primary-2';
const aggregations: Aggregation = Aggregation.MAX;
const relative_time_duration = TimePeriods.LAST_30_DAYS;
const unit = TimeUnit.DAYS;
const values = TimeValue.ONE;

const userPreferences: Partial<UserPreferences> = {
  aclpPreference: {
    dashboardId: 1,
    region: 'us-east',
    resources: clusterId,
    engine: DatabaseEngine.MYSQL.toLowerCase(),
    node_type: NodeType.PRIMARY.toLowerCase(),
    timeDuration: relative_time_duration,
    widgets: {},
  },
};
let instanceMap = new Map<string, string>();

describe('Graph and Tooltip Validation for DBaaS Dashboard', () => {
  beforeEach(() => {
    mockAppendFeatureFlags({ aclp: { beta: true, enabled: true } });
    mockGetAccount(accountFactory.build());
    mockGetUserPreferences({});
    mockGetUserPreferences(userPreferences).as('userPreferences');
    cy.intercept('POST', '**/monitor/services/*/metrics').as('metricsData');
    cy.intercept('GET', apiMatcher(`databases/instances*`)).as('getInstances');
  });

  const configureUserPreferences = (
    metric: (typeof MetricType)[keyof typeof MetricType]
  ) => {
    const labelMap = {
      [metric.value1]: {
        label: metric.value1,
        aggregateFunction: aggregations,
        size: 12,
        timeGranularity: { unit: unit, value: values },
      },
    };

    userPreferences.aclpPreference.widgets = labelMap;
    mockGetUserPreferences(userPreferences).as('userPreferences');
  };
  Object.values(MetricType).forEach((metric) => {
    it(`should validate graph tooltips for ${metric.value1}`, () => {
      configureUserPreferences(metric);

      let expectedList: string[] = [];
      let actualList: string[] = [];

      cy.visitWithLogin('monitor/dashboards');
      cy.wait('@userPreferences');
      cy.wait('@getInstances').then((interception) => {
        const instances = interception.response?.body.data;
        if (instances) {
          instances.forEach((instance: any) => {
            instanceMap.set(instance.id.toString(), instance.label);
          });
        }
      });
      ui.button
        .findByAttribute('aria-label', 'Refresh Dashboard Metrics')
        .should('be.visible')
        .click();
      cy.wait([ '@metricsData','@metricsData','@metricsData','@metricsData','@metricsData','@metricsData', '@metricsData']);

      cy.get('@metricsData.all')
        .should('have.length', 7)
        .each((xhr: unknown) => {
          const interception = xhr as Interception;
          const { body: requestPayload } = interception.request;
          if (metric.value === requestPayload.metric) {
            const responseData = interception.response?.body;
            if (
              !responseData ||
              !responseData.data ||
              !responseData.data.result
            ) {
              cy.log('Error: Invalid response structure:', JSON.stringify(responseData));
              return;
            }
             const values = getValues(clusterId[0], nodeId, responseData);
            const lengthOfValues = values.data.result[0].values.length;
            const widgetSelector = `[data-qa-widget="${metric.value1}"]`;
            cy.get(widgetSelector)
              .scrollIntoView()
              .within(() => {
                cy.get('tr[data-qa-metric-row="true"]').then(($rows) => {
                  const rowCount = $rows.length;
                  for (let i = 0; i < rowCount; i++) {
                    cy.get('tr[data-qa-metric-row="true"]')
                      .eq(i)
                      .find('button[data-testid="legend-title"]')
                      .then(($button) => {
                        const buttonText = $button.text().trim();
                        if (!buttonText.endsWith(nodeId)) {
                          cy.wrap($button).click();
                        }
                      });
                  }
                });
              });

            cy.get(widgetSelector)
              .scrollIntoView()
              .within(() => {
                values.data.result[0].values.forEach(
                  ([epoch, value]: [number, string]) => {
                    const date = new Date(epoch * 1000);
                    const options: Intl.DateTimeFormatOptions = {
                      timeZone: 'Asia/Kolkata',
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    };

                    const dateString = date
                      .toLocaleString('en-US', options)
                      .replace(/\bam\b/g, 'AM')
                      .replace(/\bpm\b/g, 'PM');

                    expectedList.push(
                      normalizeString(
                        `${dateString}${instanceMap.get(
                          clusterId[0]
                        )}_${nodeId}${formatToolTip(
                          Number(value),
                          metric.unit
                        ).replace('B', metric.unit)}`
                      )
                    );
                  }
                );

                cy.get('circle.recharts-area-dot').each(($dot, index) => {
                  if (lengthOfValues >= index) {
                    cy.wrap($dot).trigger('mouseover', { force: true });
                    cy.get('.recharts-tooltip-wrapper', {
                      timeout: 12000,
                    }).should('be.visible');
                    cy.wait(1000);
                    cy.get('.recharts-tooltip-wrapper').then(
                      ($tooltipWrapper) => {
                        actualList.push(
                          normalizeString($tooltipWrapper.text().trim())
                        );
                      }
                    );
                  }
                });
              });
          }
        })
        .then(() => {
          compareLists(expectedList, actualList);
        });
    });
  });

  function normalizeString(str: string): string {
    return str
      .replace(/\s*,\s*/g, ',')
      .replace(/\s+/g, ' ')
      .replace(/(\b\w{3})\s(\d{1})(,)/, '$1 0$2$3')
      .replace(/(\b\d{1}):(\d{2})([APM]{2})/, '0$1:$2$3')
      .replace(/\s?([APM]{2})/g, ' $1')
      .replace(/\s?%/g, '%')
      .replace(/(\d+(\.\d+)?)\s?([a-zA-Z%]+)/g, '$1$3')
      .trim();
  }

  const compareLists = (expectedList: string[], actualList: string[]): void => {
    expect(expectedList.length).to.equal(
      actualList.length,
      'List lengths do not match'
    );
    expectedList.forEach((item, index) => {
      expect(normalizeString(item)).to.equal(
        normalizeString(actualList[index]),
        `Mismatch at index ${index}`
      );
    });
  };

  const getValues = (
    clusterId: string,
    nodeId: string,
    request: CloudPulseMetricsResponse
  ): CloudPulseMetricsResponse => {
    if (!request || !request.data || !request.data.result) {
      cy.log('Invalid response data structure', request); 
      return { data: { result: [] } } as unknown as CloudPulseMetricsResponse; 
    }

    const filteredResult = request.data.result.filter(
      (item) =>
        item.metric.cluster_id === clusterId && item.metric.node_id === nodeId
    );

    return { ...request, data: { ...request.data, result: filteredResult } };
  };
});
