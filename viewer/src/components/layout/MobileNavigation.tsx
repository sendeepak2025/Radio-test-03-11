import React from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge
} from '@mui/material';
import {
  Home,
  Search,
  Description,
  Notifications,
  Person
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileNavigationProps {
  notificationCount?: number;
}

export default function MobileNavigation({ notificationCount = 0 }: MobileNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 0;
    if (path.startsWith('/search')) return 1;
    if (path.startsWith('/reports')) return 2;
    if (path.startsWith('/notifications')) return 3;
    if (path.startsWith('/profile')) return 4;
    return 0;
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/dashboard');
        break;
      case 1:
        navigate('/search');
        break;
      case 2:
        navigate('/reports');
        break;
      case 3:
        navigate('/notifications');
        break;
      case 4:
        navigate('/profile');
        break;
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: { xs: 'block', md: 'none' }
      }}
      elevation={3}
    >
      <BottomNavigation value={getActiveTab()} onChange={handleChange} showLabels>
        <BottomNavigationAction label="Home" icon={<Home />} />
        <BottomNavigationAction label="Search" icon={<Search />} />
        <BottomNavigationAction label="Reports" icon={<Description />} />
        <BottomNavigationAction
          label="Alerts"
          icon={
            <Badge badgeContent={notificationCount} color="error">
              <Notifications />
            </Badge>
          }
        />
        <BottomNavigationAction label="Profile" icon={<Person />} />
      </BottomNavigation>
    </Paper>
  );
}
