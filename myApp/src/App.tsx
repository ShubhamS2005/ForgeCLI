import React from 'react';

interface AppProps {
  appName: string;
}

const App: React.FC<AppProps> = ({ appName }) => {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🚀 Welcome to {appName}</h1>
      <p>Created by {"shubh"} in {"2026"}</p>
      <p>Your ForgeCLI React app is ready!</p>
    </div>
  );
};

export default App;