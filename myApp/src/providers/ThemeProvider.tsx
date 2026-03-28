import React from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // You can add theme context or logic here later
  return <div className="theme-provider">{children}</div>;
};