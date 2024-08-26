// import { API_ROOT } from 'src/constants';
import Request, { setData, setHeaders, setMethod, setURL } from '../request';
import { JWEToken, JWETokenPayLoad, MetricDefinitions } from './types';
import { ResourcePage as Page } from 'src/types';

export const getMetricDefinitionsByServiceType = (serviceType: string) => {
  return Request<Page<MetricDefinitions>>(
    setURL(
      `https://blr-lhv95n.bangalore.corp.akamai.com:9000/v4beta/monitor/services/${encodeURIComponent(
        serviceType
      )}/metric-definitions`
    ),
    setMethod('GET'),
    setHeaders({
      Authorization: 'Bearer vagrant',
    })
  );
};

export const getJWEToken = (data: JWETokenPayLoad, serviceType: string) =>
  Request<JWEToken>(
    setURL(
      `https://blr-lhv95n.bangalore.corp.akamai.com:9000/v4beta/monitor/services/${encodeURIComponent(
        serviceType
      )}/token`
    ),
    setMethod('POST'),
    setData(data),
    setHeaders({
      Authorization: 'Bearer mlishuser',
    })
  );
