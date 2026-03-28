import { ThemeProvider } from "./providers/ThemeProvider";
import { AuthProvider } from "./providers/AuthProvider";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <AuthProvider><ThemeProvider><App appName="myApp" /></ThemeProvider></AuthProvider>
  </React.StrictMode>);