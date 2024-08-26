import { ResourcePage } from 'src/types';
import Request, { setHeaders, setMethod, setURL } from '../request';
import { Dashboard } from './types';
// import { API_ROOT } from 'src/constants';

// Returns the list of all the dashboards available
export const getDashboards = () =>
  Request<ResourcePage<Dashboard>>(
    setURL(
      `https://blr-lhv95n.bangalore.corp.akamai.com:9000/v4beta/monitor/services/linode/dashboards`
    ),
    setMethod('GET'),
    setHeaders({
      Authorization: 'Bearer vagrant',
    })
  );

export const getDashboardById = (dashboardId: number) =>
  Request<Dashboard>(
    setURL(
      `https://blr-lhv95n.bangalore.corp.akamai.com:9000/v4beta/monitor/dashboards/${encodeURIComponent(
        dashboardId
      )}`
    ),
    setMethod('GET'),
    setHeaders({
      Authorization: 'Bearer vagrant',
    })
  );
