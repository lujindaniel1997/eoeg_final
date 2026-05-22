// MainLayout.jsx (Updated with Global Authentication Guard)
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const API_BASE_URL = 'http://localhost:3000';

const fetchParams = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/params`);
  return data;
};

const fetchUsers = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/api/users`);
  return data;
};

const fetchPlantList = async (all_plants, user) => {
  const { data } = await axios.get(
    `${API_BASE_URL}/api/plant-list?all_plants=${all_plants}&user=${user}`
  );
  return data;
};

function MainLayout({ children, themeVariant, setThemeVariant }) {
  // 1. Core Authentication Check
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('azure_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Listen for login updates if they land on a callback query parameter string
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    if (userParam) {
      try {
        const decodedUser = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('azure_user', JSON.stringify(decodedUser));
        setUser(decodedUser);
      } catch (e) {
        console.error('Failed to sync user across layout container:', e);
      }
    }
  }, []);


const [selectedUser, setSelectedUser] = useState('');

useEffect(() => {
  if (user?.mappedUser) {
    setSelectedUser(user.mappedUser);
  }
}, [user]);


useEffect(() => {
  if (!user?.mappedUser) {
    setSelectedUser('TestUser'); // fallback
  }
}, [user]);




  const [plotUnits, setPlotUnits] = useState({
    TST_label: 'Top Shell Temperature',
    CE_label: 'Selectivity',
    Temp_Unit: 'C',
    Pres_Unit: 'psia',
    MassFlow_Unit: 'kg/s',
    WorkRate_Unit: 'lb/h/ft3',
    cumEO_unit: 'klb/ft3',
  });
  const [ifGauge, setIfGauge] = useState(false);
  const [atmp, setAtmp] = useState(14.7);
  const [cumEOBase, setCumEOBase] = useState('Cat Based');
  const [useAllPlants, setUseAllPlants] = useState(true);
  const [selectedPlants, setSelectedPlants] = useState([]);

  const location = useLocation();

  const { data: params, isLoading: isLoadingParams } = useQuery({
    queryKey: ['params'],
    queryFn: fetchParams,
    staleTime: Infinity,
  });

  const { data: userDict, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 60,
  });

  const { data: plantList, isLoading: isLoadingPlantList } = useQuery({
    queryKey: ['plantList', useAllPlants, selectedUser],
    queryFn: () => fetchPlantList(useAllPlants, selectedUser),
    onSuccess: (data) => {
      if (data && data.length > 0 && selectedPlants.length === 0) {
        if (useAllPlants) {
          setSelectedPlants(data);       
        } else {
          setSelectedPlants([data[0]]);  
        }
      }
    },
  });

  if (isLoadingParams || isLoadingUsers || isLoadingPlantList) {
    return <div>Loading application parameters...</div>;
  }

  const isPlantPage = location.pathname.includes('projection-with-plant');
  const userList = userDict ? Object.keys(userDict) : [];

  // 2. Authentication Guard Trigger Action
  // If user is not logged in, and they aren't already sitting on the Homepage root "/"
  if (!user && location.pathname !== '/') {
    const handleRedirectToHomeLogin = () => {
      window.location.href = '/';
    };

    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', bgcolor: '#797777', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm">
          <Paper elevation={4} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              Authentication Required
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You must login using your secure company account before viewing model analytics or plant trends.
            </Typography>
            <Button variant="contained" color="primary" onClick={handleRedirectToHomeLogin} sx={{ mt: 2, textTransform: 'none' }}>
              Go to Sign-In Page
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const pageWithProps = React.cloneElement(children, {
    selectedUser,
    plotUnits,
    ifGauge,
    atmp,
    cumEOBase,
    params,
    userDict,
    useAllPlants,
    selectedPlants,
    plantList,
    tableName: useAllPlants
      ? 'plant_data_new'
      : selectedUser === 'TestUser'
      ? 'plant_data_test'
      : `plant_data_${selectedUser}`,
  });

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar navigation context list is only shown to authenticated corporate sessions */}
      {user && (
        <AppSidebar
          userList={userList}
          params={params}
          selectedUser={selectedUser}
          plotUnits={plotUnits}
          ifGauge={ifGauge}
          atmp={atmp}
          cumEOBase={cumEOBase}
          onUserChange={setSelectedUser}
          onPlotUnitsChange={setPlotUnits}
          onIfGaugeChange={setIfGauge}
          onAtmpChange={setAtmp}
          onCumEOBaseChange={setCumEOBase}
          isPlantPage={isPlantPage}
          plantList={plantList || []}
          useAllPlants={useAllPlants}
          selectedPlants={selectedPlants}
          onSetUseAllPlants={setUseAllPlants}
          onSetSelectedPlants={setSelectedPlants}
        />
      )}

      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: user ? 3 : 0, // Clean separation spacing if sidebar is absent
          width: user ? 'calc(100% - 300px)' : '100%',
          minWidth: 0 
        }}
      >
        {pageWithProps}
      </Box>
    </Box>
  );
}

export default MainLayout;
