import React from 'react';

interface ViewProps {
  darkMode?: boolean;
}

export default function SystemView({ darkMode }: ViewProps) {
  return (
    <div className="w-full h-full min-h-[500px] p-6 flex flex-col">
      {/* Blank page canvas ready to build */}
    </div>
  );
}
