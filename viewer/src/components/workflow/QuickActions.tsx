import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
} from '@mui/material';
import {
  People as PatientsIcon,
  Assignment as WorklistIcon,
  CalendarToday as FollowUpIcon,
  Visibility as ViewerIcon,
  Description as ReportIcon,
  Dashboard as DashboardIcon,
  Payment as BillingIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface QuickActionsProps {
  excludeActions?: string[];
  position?: {
    bottom?: number;
    right?: number;
  };
}

const QuickActions: React.FC<QuickActionsProps> = ({
  excludeActions = [],
  position = { bottom: 16, right: 16 },
}) => {
  const navigate = useNavigate();

  const actions = [
    { icon: <DashboardIcon />, name: 'Dashboard', path: '/dashboard', key: 'dashboard' },
    { icon: <PatientsIcon />, name: 'Patients', path: '/patients', key: 'patients' },
    { icon: <WorklistIcon />, name: 'Worklist', path: '/worklist', key: 'worklist' },
    { icon: <FollowUpIcon />, name: 'Follow-ups', path: '/followups', key: 'followups' },
    { icon: <ReportIcon />, name: 'Reporting', path: '/reporting', key: 'reporting' },
    { icon: <BillingIcon />, name: 'Billing', path: '/billing', key: 'billing' },
  ].filter(action => !excludeActions.includes(action.key));

  return (
    <SpeedDial
      ariaLabel="Quick Actions"
      sx={{ position: 'fixed', ...position }}
      icon={<SpeedDialIcon />}
    >
      {actions.map((action) => (
        <SpeedDialAction
          key={action.key}
          icon={action.icon}
          tooltipTitle={action.name}
          onClick={() => navigate(action.path)}
        />
      ))}
    </SpeedDial>
  );
};

export default QuickActions;
