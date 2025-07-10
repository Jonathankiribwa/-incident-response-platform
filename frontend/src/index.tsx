import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useState } from 'react';

const getDesignTokens = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          primary: { main: '#42a5f5' },
          secondary: { main: '#7e57c2' },
          background: { default: '#f5f7fa', paper: '#fff' },
        }
      : {
          primary: { main: '#90caf9' },
          secondary: { main: '#ce93d8' },
          background: { default: '#121212', paper: '#1e1e1e' },
        }),
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: 'Inter, Roboto, Arial, sans-serif' },
});

const ThemedApp = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = createTheme(getDesignTokens(mode));
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
      {/* Add a floating button or menu for theme toggle in the layout if needed */}
    </ThemeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<ThemedApp />); 