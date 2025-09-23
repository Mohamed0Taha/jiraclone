import React, { useMemo } from 'react';
import MicroAppWrapper from '../components/MicroAppWrapper';
import SlidesRDE from './slides/SlidesRDE';

export default function SlidesApp({ projectId, viewName }) {
  
  const defaultValue = useMemo(() => ({
    // SlidesRDE will store slides data and active index
    slides: [{
      id: Date.now().toString(),
      name: 'Slide 1',
      objects: { version: '3.6.6', objects: [] },
      background: '#ffffff'
    }],
    activeIndex: 0,
  }), []);
  
  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="Slides"
      defaultValue={defaultValue}
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => (
        <SlidesRDE state={state || defaultValue} setState={setState} />
      )}
    </MicroAppWrapper>
  );
}
