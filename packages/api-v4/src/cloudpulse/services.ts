import Request, { setData, setHeaders, setMethod, setURL } from '../request';
import {
  JWEToken,
  JWETokenPayLoad,
  MetricDefinitions,
  ServiceTypesList,
} from './types';
import { ResourcePage as Page } from 'src/types';

export const getMetricDefinitionsByServiceType = (serviceType: string) => {
  return Request<Page<MetricDefinitions>>(
    setURL(
      `https://blr-lhvm1i.bangalore.corp.akamai.com:9000/v4beta/monitor/services/${encodeURIComponent(
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
      `https://blr-lhvm1i.bangalore.corp.akamai.com:9000/v4beta/monitor/services/${encodeURIComponent(
        serviceType
      )}/token`
    ),
    setMethod('POST'),
    serviceType === 'dbaas' ? setData({ ...data, resource_ids: [11145] }) : setData(data),
    setHeaders({
      Authorization: `Bearer mlishuser`,
    })
  );



// Returns the list of service types available
export const getCloudPulseServiceTypes = () =>
  Request<ServiceTypesList>(
    setURL(
      `https://blr-lhvm1i.bangalore.corp.akamai.com:9000/v4beta/monitor/services`
    ),
    setMethod('GET'),
    setHeaders({
      Authorization: 'Bearer vagrant',
    })
  );
