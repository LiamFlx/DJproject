import React, { ReactNode } from 'react';

interface StudioPanelProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({ title, icon, children }) => {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <h4 className="text-md font-bold mb-3 flex items-center gap-2 text-gray-300">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
};