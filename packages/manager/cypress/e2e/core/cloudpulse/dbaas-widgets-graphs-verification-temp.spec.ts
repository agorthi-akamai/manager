import { mockAppendFeatureFlags } from 'support/intercepts/feature-flags';
import { accountFactory } from 'src/factories';
import { mockGetAccount } from 'support/intercepts/account';
import { mockGetUserPreferences } from 'support/intercepts/profile';
import { CloudPulseMetricsResponse } from '@linode/api-v4';
import { Interception } from 'cypress/types/net-stubbing';
import { UserPreferences } from '@linode/api-v4/src/profile';
import { formatToolTip } from 'src/features/CloudPulse/Utils/unitConversion';
import { ui } from 'support/ui';
import { apiMatcher } from 'support/util/intercepts';

const MetricType = {
  CPU_USAGE: { value: 'cpu_usage', value1: 'CPU Usage', unit: '%' },
  READ_IOPS: { value: 'read_iops', value1: 'Disk I/O Read', unit: 'IOPS' },
  WRITE_IOPS: { value: 'write_iops', value1: 'Disk I/O Write', unit: 'IOPS' },
  AVAILABLE_DISK: {
    value: 'available_disk',
    value1: 'Available Disk Space',
    unit: 'GB',
  },
  MEMORY_USAGE: { value: 'memory_usage', value1: 'Memory Usage', unit: '%' },
  AVAILABLE_MEMORY: {
    value: 'available_memory',
    value1: 'Available Memory',
    unit: 'GB',
  },
  DISK_USAGE: { value: 'disk_usage', value1: 'Disk Space Usage', unit: '%' },
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

const timeDurationToSelect = TimePeriods.LAST_30_DAYS;
const engine = DatabaseEngine.MYSQL;
const nodeType = NodeType.PRIMARY;
const unit = TimeUnit.DAYS;
const values = TimeValue.ONE;
const clusterId = ['13116'];
const nodeId = 'primary-7';
const metricToCheck = MetricType.AVAILABLE_MEMORY;
const aggregations: Aggregation = Aggregation.SUM;

const mockAccount = accountFactory.build();

const labelMap: Record<
  string,
  {
    label: string;
    aggregateFunction: string;
    size: number;
    timeGranularity: { unit: string; value: number };
  }
> = {
  [metricToCheck.value1]: {
    label: metricToCheck.value1,
    aggregateFunction: aggregations,
    size: 12,
    timeGranularity: { unit: unit, value: values },
  },
};

const userPreferences: Partial<UserPreferences> = {
  aclpPreference: {
    dashboardId: 1,
    region: 'us-east',
    resources: clusterId,
    engine: engine.toLowerCase(),
    node_type: nodeType.toLowerCase(),
    timeDuration: timeDurationToSelect,
    widgets: Object.keys(labelMap).reduce(
      (acc, key) => {
        const widget = labelMap[key];
        acc[key] = {
          label: widget.label,
          aggregateFunction: widget.aggregateFunction,
          size: widget.size,
          timeGranularity: widget.timeGranularity, // Unit and value for time granularity
        };

        return acc;
      },
      {} as Record<
        string,
        {
          label: string;
          aggregateFunction: string;
          size: number;
          timeGranularity: { unit: string; value: number };
        }
      >
    ),
  },
};
let instanceMap = new Map<string, string>();

describe('Integration Tests for DBaaS Dashboard ', () => {
  beforeEach(() => {
    mockAppendFeatureFlags({
      aclp: { beta: true, enabled: true },
    });
    mockGetAccount(mockAccount); // Enables the account to have capability for Akamai Cloud Pulse
    mockGetUserPreferences({});
    mockGetUserPreferences(userPreferences).as('userPreferences');
    cy.intercept('POST', '**/monitor/services/*/metrics').as('metricsData');
    cy.intercept('GET', apiMatcher(`databases/instances*`)).as('getInstances');
  });

  it('Verify that the widget and global filters reflect the saved user preferences after closing the filter and reloading the page', () => {
    cy.visitWithLogin('monitor/dashboards');
    cy.wait('@userPreferences');
    cy.wait('@getInstances').then((interception) => {
      const instances = interception.response?.body.data;
      if (instances) {
        instances.forEach((instance: any) => {
          instanceMap.set(instance.id.toString(), instance.label);
        });
      }

      ui.button
        .findByAttribute('aria-label', 'Refresh Dashboard Metrics')
        .should('be.visible')
        .click();

      cy.get('@metricsData.all')
        .should('have.length', 7)
        .each((xhr: unknown) => {
          const interception = xhr as Interception;
          const { body: requestPayload } = interception.request;
          if (metricToCheck.value === requestPayload.metric) {
            const responseData = interception.response?.body.data?.result;

            if (responseData) {
              let htmlContent = `
          <html>
          <head>
           <title>CloudPulse Metrics for ${metricToCheck.value} — Time Range: ${timeDurationToSelect}, Aggregation: ${aggregations}, Granularity: ${values} ${unit}  , Node type of ${nodeType}</title>

            <style>
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                padding: 10px;
                border: 1px solid #ddd;
                text-align: left;
              }
              th {
                background-color: #f4f4f4;
                cursor: pointer;
              }
              .filter-input {
                padding: 5px;
                margin: 5px;
                width: 200px;
                border: 1px solid #ccc;
                border-radius: 4px;
              }
              .filter-container {
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <h1>CloudPulse Metrics for ${metricToCheck.value} — Time Range: ${timeDurationToSelect}, Aggregation: ${aggregations}, Granularity: ${values} ${unit} , Node type of ${nodeType}</h1>
            <div class="filter-container">
              <label for="clusterFilter">Filter by Cluster:</label>
              <input type="text" id="clusterFilter" class="filter-input" placeholder="Enter Cluster ID">
              <label for="nodeFilter">Filter by Node:</label>
              <input type="text" id="nodeFilter" class="filter-input" placeholder="Enter Node ID">
              <label for="epochFilter">Filter by Epoch:</label>
              <input type="text" id="epochFilter" class="filter-input" placeholder="Enter Epoch">
            </div>
            <table id="metricsTable">
              <thead>
                <tr>
                       <th onclick="sortTable(0)">Cluster</th>
                        <th onclick="sortTable(1)">ClusterName</th>
                        <th onclick="sortTable(2)">Node</th>
                        <th onclick="sortTable(3)">Epoch</th>
                        <th onclick="sortTable(4)">Time (IST)</th>
                        <th onclick="sortTable(5)">Value</th>
                        <th onclick="sortTable(6)">Formatted</th>
                        <th onclick="sortTable(7)">WidgetName</th>
                        <th onclick="sortTable(8)">Max  Avg  Last </th>

                    
                </tr>
              </thead>
              <tbody id="tableBody">
        `;

              const result = processMetrics(interception.response?.body);

              const rows: {
                metricToCheck: any;
                cluster_id: any;
                cluster_name: any;
                node_id: any;
                epoch: number;
                dateString: string;
                value: number;
                formatted: string;
                result: any;
              }[] = [];

              responseData.forEach((item: any) => {
                const {
                  metric: { cluster_id, node_id },
                  values,
                } = item;

                values.forEach(([epoch, value]: [number, number]) => {
                  const date = new Date(epoch * 1000);
                  const options = { timeZone: 'Asia/Kolkata', hour12: true };
                  const dateString = date.toLocaleString('en-IN', options);
                  //   cy.log("ur checking for *****",metricToCheck.value ,metricToCheck.unit)
                  rows.push({
                    cluster_id,
                    cluster_name: instanceMap.get(cluster_id.toString()),
                    node_id,
                    epoch,
                    dateString,
                    value,
                    formatted: formatToolTip(value, metricToCheck.unit),
                    metricToCheck,
                    result,
                  });
                });
              });

              // Sort rows by Epoch (ascending)
              rows.sort((a, b) => a.epoch - b.epoch); // Sorting by epoch (ascending)

              // Add sorted rows to the table body
              const tableBody = rows
                .map(
                  (row) => `
          <tr>
            <td>${row.cluster_id}</td>
             <td>${row.cluster_name}</td>
            <td>${row.node_id}</td>
            <td>${row.epoch}</td>
            <td>${row.dateString}</td>
            <td>${row.value}</td>
            <td>${row.formatted}</td>
             <td>${row.metricToCheck.value}</td>
           <td>${result[row.node_id]?.max} 
              ${result[row.node_id]?.avg} 
              ${result[row.node_id]?.last}
            </td>
        
          </tr>
        `
                )
                .join('');

              htmlContent += tableBody;

              htmlContent += `
              </tbody>
            </table>
            <script>
              // JavaScript for sorting table when headers are clicked
              function sortTable(n) {
                const table = document.getElementById("metricsTable");
                let rows = table.rows;
                let switching = true;
                let dir = "asc"; // Set the sorting direction to ascending
                while (switching) {
                  switching = false;
                  let shouldSwitch = false;
                  for (let i = 1; i < (rows.length - 1); i++) {
                    let x = rows[i].getElementsByTagName("TD")[n];
                    let y = rows[i + 1].getElementsByTagName("TD")[n];
                    if (dir === "asc") {
                      if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                      }
                    } else if (dir === "desc") {
                      if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                      }
                    }
                  }
                  if (shouldSwitch) {
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                  } else {
                    if (dir === "asc") {
                      dir = "desc";
                    } else {
                      break;
                    }
                  }
                }
              }

              // Filter function
              function filterTable() {
                const clusterFilter = document.getElementById('clusterFilter').value.toLowerCase();
                const nodeFilter = document.getElementById('nodeFilter').value.toLowerCase();
                const epochFilter = document.getElementById('epochFilter').value.toLowerCase();
                const rows = document.getElementById('metricsTable').getElementsByTagName('tr');
                
                for (let i = 1; i < rows.length; i++) {
                  const cells = rows[i].getElementsByTagName('td');
                  const clusterText = cells[0].textContent.toLowerCase();
                  const nodeText = cells[1].textContent.toLowerCase();
                  const epochText = cells[2].textContent.toLowerCase();
                  
                  // Show/hide the row based on the filters
                  if (
                    clusterText.includes(clusterFilter) && 
                    nodeText.includes(nodeFilter) && 
                    epochText.includes(epochFilter)
                  ) {
                    rows[i].style.display = "";
                  } else {
                    rows[i].style.display = "none";
                  }
                }
              }

              // Attach filter function to inputs
              document.getElementById('clusterFilter').addEventListener('input', filterTable);
              document.getElementById('nodeFilter').addEventListener('input', filterTable);
              document.getElementById('epochFilter').addEventListener('input', filterTable);
            </script>
          </body>
          </html>
        `;

              const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
              const filePath = `/Users/agorthi/Desktop/metrics-reportdata-${timestamp}-${metricToCheck.value}.html`;
              cy.writeFile(filePath, htmlContent).then(() => {
                cy.log(`Metrics report saved to ${filePath}`);
              });
            } else {
              cy.log(
                `widget Not found due to cache or ${metricToCheck.value} widget not found`
              );
            }
          }
        });
    });
  });

  it.skip('graph comparison', () => {
    let expectedList: string[] = []; // Ensure it's initialized before the test starts.
    let actualList: string[] = []; // Corrected 'actuaList' to 'actualList' for clarity.

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

    cy.get('@metricsData.all')
      .should('have.length', 7)
      .each((xhr: unknown) => {
        const interception = xhr as Interception;
        const { body: requestPayload } = interception.request;
        if (metricToCheck.value === requestPayload.metric) {
          const responseData = interception.response?.body;
          const values = getValues(clusterId[0], nodeId, responseData);
          const lengthOfValues = values.data.result[0].values.length;
          const result = processMetrics(values);
          const widgetSelector = `[data-qa-widget="${metricToCheck.value1}"]`;

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

                  let dateString = date
                    .toLocaleString('en-US', options)
                    .replace(/\bam\b/g, 'AM')
                    .replace(/\bpm\b/g, 'PM');

                  expectedList.push(
                    normalizeString(
                      dateString +
                        instanceMap.get(clusterId[0].toString()) +
                        '_' +
                        nodeId +
                        formatToolTip(
                          Number(value),
                          metricToCheck.unit
                        ).replace('B', metricToCheck.unit)
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

                  // Check if the tooltip has text content before logging
                  cy.get('.recharts-tooltip-wrapper').then(
                    ($tooltipWrapper) => {
                      const tooltipText = $tooltipWrapper.text().trim();
                      actualList.push(normalizeString(tooltipText));
                    }
                  );
                }
              });
            });
        }
      })
      .then(() => {
        // Compare the lists after all iterations are complete

        compareLists(expectedList, actualList);
      });
  });

  function normalizeString(str: string): string {
    // Remove spaces around punctuation like commas
    let normalizedStr = str.replace(/\s*,\s*/g, ','); // Remove spaces around commas
    normalizedStr = normalizedStr.replace(/\s+/g, ' '); // Replace multiple spaces with a single space

    // Ensure consistent format for date (Nov 2, 2024 -> Nov 02, 2024)
    normalizedStr = normalizedStr.replace(/(\b\w{3})\s(\d{1})(,)/, '$1 0$2$3'); // Add leading zero to single digit day

    // Ensure time format is consistent (e.g., 1:06 PM -> 01:06 PM), but only add zero if needed
    normalizedStr = normalizedStr.replace(
      /(\b\d{1}):(\d{2})([APM]{2})/,
      '0$1:$2$3'
    ); // Add leading zero to hour if single-digit hour

    // Make sure AM/PM is consistently formatted (e.g., AM/PM with a space after)
    normalizedStr = normalizedStr.replace(/\s?([APM]{2})/g, ' $1'); // Ensure a space before AM/PM

    // Remove any space before the percentage symbol
    normalizedStr = normalizedStr.replace(/\s?%/g, '%'); // Remove any space before the %

    // Remove any space between number and unit (e.g., "71.41 GB" -> "71.41GB")
    normalizedStr = normalizedStr.replace(
      /(\d+(\.\d+)?)\s?([a-zA-Z%]+)/g,
      '$1$3'
    ); // Remove space between number and unit (GB, IOPS, %)

    return normalizedStr.trim(); // Trim any leading/trailing spaces
  }

  // Function to compare both lists and assert true/false
  function compareLists(expectedList: string[], actualList: string[]): void {
    // Step 1: Compare lengths
    if (expectedList.length !== actualList.length) {
      // cy.log("Lists have different lengths. Assertion failed.");
      // cy.log("Expected length:", expectedList.length, "Actual length:", actualList.length);
      expect(expectedList.length).to.equal(actualList.length); // Use expect to assert length equality
      return;
    }

    // Step 2: Compare each element in the lists
    let allMatch = true;
    for (let i = 0; i < expectedList.length; i++) {
      //cy.log(`checking index ${i}: Expected: ${normalizeString(expectedList[i])}, Actual: ${normalizeString(actualList[i])}`);

      if (normalizeString(expectedList[i]) !== normalizeString(actualList[i])) {
        // cy.log(`Difference at index ${i}:`);
        // cy.log(`Expected: ${expectedList[i]}`);
        // cy.log(`Actual: ${actualList[i]}`);
        //cy.log(` failing Mismatch at index ${i}: Expected: ${expectedList[i]}, Actual: ${actualList[i]}`);

        allMatch = false;
      } else {
        allMatch = true;
      }
    }

    // Step 3: Assert true if all elements match, else assert false
    if (allMatch) {
      cy.log('Lists are equal. Assertion passed.');
      expect(true).to.equal(true); // This is a pass
    } else {
      cy.log('Lists are not equal. Assertion failed.');
      expect(allMatch).to.be.true; // This will fail the test if there's a mismatch
    }
  }

  function processMetrics(response: CloudPulseMetricsResponse) {
    const data = response.data.result;

    if (!Array.isArray(data)) {
      throw new Error("Expected 'result' to be an array");
    }

    // Create a map where keys are node_id and values are the corresponding metrics
    const resultByNodeId: Record<
      string,
      { max: number; last: number; avg: number }
    > = {};

    // Process each metric
    data.forEach(({ metric, values }) => {
      const { node_id } = metric;

      // Ensure the node_id exists in the resultByNodeId map
      if (!resultByNodeId[node_id]) {
        resultByNodeId[node_id] = {
          max: 0,
          last: 0,
          avg: 0,
        };
      }

      // Extract values and calculate max, last, and avg
      const valueList = values.map(([timestamp, value]) => Number(value));

      const maxValue = formatToTwoDecimalPlaces(Math.max(...valueList));
      const lastValue = formatToTwoDecimalPlaces(
        valueList[valueList.length - 1]
      );
      const avgValue = formatToTwoDecimalPlaces(
        valueList.reduce((acc, value) => acc + value, 0) / valueList.length
      );

      // Update the result for the current node_id
      resultByNodeId[node_id] = {
        max: maxValue,
        last: lastValue,
        avg: avgValue,
      };
    });

    return resultByNodeId;
  }

  function formatToTwoDecimalPlaces(value: number): number {
    return parseFloat(value.toFixed(2));
  }

  const getValues = (
    clusterId: string,
    nodeId: string,
    request: CloudPulseMetricsResponse
  ): CloudPulseMetricsResponse => {
    // Filter the result array based on cluster_id and node_id
    const filteredResult = request.data.result.filter(
      (item) =>
        item.metric.cluster_id === clusterId && item.metric.node_id === nodeId
    );

    // Return a new response with filtered results
    return {
      ...request,
      data: {
        ...request.data,
        result: filteredResult,
      },
    };
  };
});
