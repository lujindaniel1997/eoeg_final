import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Button } from '@mui/material';
import MainLayout from './components/MainLayout';
import ProjectionOnly from './pages/ProjectionOnly';
import ProjectionWithPlant from './pages/ProjectionWithPlant';
import Homepage from './pages/Homepage';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#FAFAFA' },
    text: { primary: '#212121' },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#121212' },
    text: { primary: '#E0E0E0' },
  },
});

function App() {
  const [themeVariant, setThemeVariant] = useState('light');
  const currentTheme = themeVariant === 'light' ? lightTheme : darkTheme;


  return (
    
      

      <Routes>
        <Route path="/" element={<Homepage />} />

        
        <Route
          path="/projection"
          element={
            <MainLayout>
              <ProjectionOnly />
            </MainLayout>
          }


        />
        <Route
          path="/projection-with-plant"
          element={
            <MainLayout>
              <ProjectionWithPlant themeVariant={themeVariant} />
            </MainLayout>
          }
        />
      </Routes>
    
  );
}

export default App;
