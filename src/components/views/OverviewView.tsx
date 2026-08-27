import React from 'react';
import OverviewHeader from '../overview/OverviewHeader';

interface ViewProps {
  darkMode?: boolean;
}

export default function OverviewView({ darkMode = true }: ViewProps) {
  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Top Header Section: Badges & Overview Tiles */}
      <OverviewHeader darkMode={darkMode} />

      {/* Main Content Area placeholder */}
      <div className="w-full flex-1" />
    </div>
  );
}

