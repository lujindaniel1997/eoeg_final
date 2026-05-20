import React, { useState } from 'react';
import { Box, Grid } from '@mui/material';
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

  
  // ✅ All hooks declared at the top
  const [selectedUser, setSelectedUser] = useState('TestUser');
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
      setSelectedPlants(data);       // Select all plants
    } else {
      setSelectedPlants([data[0]]);  // Keep old behavior
    }
  }
},

  });

  



  // ✅ Conditional rendering after all hooks
  if (isLoadingParams || isLoadingUsers || isLoadingPlantList) {
    return <div>Loading application parameters...</div>;
  }

  const isPlantPage = location.pathname.includes('projection-with-plant');
  const userList = userDict ? Object.keys(userDict) : [];

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

      
      

      <Box
  component="main"
  sx={{ 
    flexGrow: 1, 
    p: 3, 
    width: 'calc(100% - 300px)',
    minWidth: 0 // ✅ CRITICAL: Allows flex containers to compress smoothly on small screens without breaking
  }}
>
  {pageWithProps}
</Box>

      
    </Box>



    
  );
  

  
}



export default MainLayout;
