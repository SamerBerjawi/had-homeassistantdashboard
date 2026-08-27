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

      {/* Main Content Grid: 4-cols mobile / adaptive desktop */}
      <div className="w-full grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 sm:gap-4.5" />
    </div>
  );
}
