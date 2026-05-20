// Homepage.jsx (Updated with Secure Axios Login Architecture & Session Sync)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Box,
  Button,
  Avatar,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import dowlogo from '../dowlogo.png'; 

const API_BASE_URL = 'http://localhost:3000';

function Homepage() {
  // Initialize user from local storage if session persists
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('azure_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    // Parse response params when backend redirects user back to React app
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const errorParam = urlParams.get('auth_error');

    if (userParam) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('azure_user', JSON.stringify(decodedUser));
        setUser(decodedUser);
        
        // Clean URL query parameters from browser address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse redirected user profile context:', e);
      }
    }

    if (errorParam) {
      alert(`Authentication Failed: ${decodeURIComponent(errorParam)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Request the login url generated on backend server
  const handleLogin = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/login-url`);
      if (response.data && response.data.url) {
        // Redirect browser to interactive secure login window
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to resolve login endpoint URL context:', error);
      alert('Could not initiate authentication routing. Please verify backend state.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('azure_user');
    setUser(null);
    // Force complete window reload to clear app-wide global matching variables across MainLayout
    window.location.reload();
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: '#797777',
        overflow: 'hidden',
      }}
    >
      {/* Gradient Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom right, rgba(0, 0, 0, 0.14), rgba(12, 12, 12, 0.85))',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      
      {/* Background Logo */}
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '80%',
          backgroundImage: `url(${dowlogo})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          opacity: 0.05,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />
      
      <Container maxWidth="lg" sx={{ mt: 4, position: 'relative', zIndex: 10 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          
          {/* Header Authorization Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              📌 EO Catalyst Projection Dashboard
            </Typography>
            
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f0f2f5', px: 2, py: 1, borderRadius: 5 }}>
                <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : <AccountCircleIcon />}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>{user.name}</Typography>
                  <Typography variant="caption" color="textSecondary" display="block">{user.email}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Button size="small" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
                  Logout
                </Button>
              </Box>
            ) : null}
          </Box>

          {!user ? (
            /* Protected Screen View (Unauthenticated State) */
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', my: 4, bgcolor: '#fafafa', borderRadius: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500 }}>
                Access Restricted
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
                Please authenticate using your company Microsoft account to access the catalyst configuration charts and model projection sets.
              </Typography>
              
              <Button
                variant="contained"
                size="large"
                onClick={handleLogin}
                sx={{
                  backgroundColor: '#2f2f2f',
                  color: '#fff',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  boxShadow: 2,
                  '&:hover': { backgroundColor: '#000', boxShadow: 4 }
                }}
                startIcon={
                  <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0H11V11H0V0Z" fill="#F25022"/>
                    <path d="M12 0H23V11H12V0Z" fill="#7FBA00"/>
                    <path d="M0 12H11V23H0V12Z" fill="#00A1F1"/>
                    <path d="M12 12H23V23H12V12Z" fill="#FFB900"/>
                  </svg>
                }
              >
                Sign in with Microsoft
              </Button>
            </Paper>
          ) : (
            /* Dashboard View (Authenticated State) */
            <>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} id="about-app-header">
                  <Typography variant="h6">ℹ️ - About this app</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body1" paragraph>
                      The web app provides projection plots used for the EO catalyst
                      projection tool developed and hosted on the server.
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Dashboard Pages:
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      {/* Model Projection Only Link */}
                      <Paper
                        elevation={4}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textDecoration: 'none',
                          color: 'inherit',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
                        }}
                        component="a"
                        href="/projection"
                      >
                        <Typography variant="h6" gutterBottom>
                          📈 Model Projection Only
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          View EO catalyst model projection data without plant history.
                        </Typography>
                      </Paper>

                      {/* Projection with Plant Data Link */}
                      <Paper
                        elevation={4}
                        sx={{
                          p: 3,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textDecoration: 'none',
                          color: 'inherit',
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
                        }}
                        component="a"
                        href="/projection-with-plant"
                      >
                        <Typography variant="h6" gutterBottom>
                          🏭 Projection with Plant Data
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Compare model projections against historical plant performance.
                        </Typography>
                      </Paper>
                    </Box> 
                  </Box>
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default Homepage;