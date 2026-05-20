import React from 'react';
import {
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Box,
  Link,
} from '@mui/material';
import ExpandMoreIcon  from '@mui/icons-material/ExpandMore';
import dowlogo from '../dowlogo.png'; // Import the image file

function Homepage() {
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
      
  
      

     
    <Container maxWidth='lg' sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>



<Typography variant="h3" component="h1" gutterBottom>
          📌 EO Catalyst Projection Dashboard
        </Typography>
 
        {/* This is the MUI equivalent of st.expander */}
        <Accordion >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="about-app-content"
            id="about-app-header"
          >
            <Typography variant="h6">ℹ️ - About this app</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body1" paragraph>
                The web app provides projection plots used for the EO catalyst
                projection tool developed and hosted on server:
                <br />
                
        
             
  <strong>Dashboard Pages:</strong>
</Typography>

<Box
  sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
    gap: 2,
    mt: 2,
  }}
>
  {/* Model Projection */}
  <Paper
    elevation={4}
    sx={{
      p: 3,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 8,
      },
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

  {/* Projection with Plant Data */}
  <Paper
    elevation={4}
    sx={{
      p: 3,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 8,
      },
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
</Box> </Box>

          </AccordionDetails>
        </Accordion>
      </Paper>
    </Container>

    </Box>
  );
}



export default Homepage;