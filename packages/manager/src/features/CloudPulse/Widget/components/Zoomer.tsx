import { useTheme } from '@mui/material/styles';
import * as React from 'react';

import ZoomInMap from 'src/assets/icons/cloudpulse_zoomin.svg';
import ZoomOutMap from 'src/assets/icons/cloudpulse_zoomout.svg';

export interface ZoomIconProperties {
  className?: string;
  handleZoomToggle: (zoomIn: boolean) => void;
  zoomIn: boolean;
}

export const ZoomIcon = React.memo((props: ZoomIconProperties) => {
  const theme = useTheme();

  const handleClick = (needZoomIn: boolean) => {
    props.handleZoomToggle(needZoomIn);
  };

  const ToggleZoomer = () => {
    if (props.zoomIn) {
      return (
        <ZoomInMap
          style={{
            color: theme.color.grey1,
            fontSize: 'x-large',
            height: '22px',
          }}
          data-testid="zoom-in"
          onClick={() => handleClick(false)}
        />
      );
    }

    return (
      <ZoomOutMap
        style={{
          color: theme.color.grey1,
          fontSize: 'x-large',
          height: '22px',
        }}
        data-testid="zoom-out"
        onClick={() => handleClick(true)}
      />
    );
  };

  return <ToggleZoomer />;
});
