import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Tabs,
  Tab,
  Badge,
  Typography
} from '@mui/material';
import {
  Close,
  RateReview,
  Psychology,
  People
} from '@mui/icons-material';
import PeerReviewPanel from './PeerReviewPanel';
import ConsultationPanel from './ConsultationPanel';
import PresenceIndicators from './PresenceIndicators';
import { useCollaboration } from '../../hooks/useCollaboration';

interface CollaborationHubProps {
  reportId: string;
  open: boolean;
  onClose: () => void;
}

export default function CollaborationHub({ reportId, open, onClose }: CollaborationHubProps) {
  const [activeTab, setActiveTab] = useState(0);
  
  const {
    connected,
    activeUsers
  } = useCollaboration({
    reportId,
    enabled: open
  });

  const currentUserId = localStorage.getItem('userId') || '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Collaboration</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Connection status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: connected ? 'success.main' : 'error.main'
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {connected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>

            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab
              icon={<RateReview />}
              label="Peer Review"
              iconPosition="start"
            />
            <Tab
              icon={<Psychology />}
              label="Consultations"
              iconPosition="start"
            />
            <Tab
              icon={
                <Badge badgeContent={activeUsers.length} color="primary">
                  <People />
                </Badge>
              }
              label="Active Users"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <PeerReviewPanel
            reportId={reportId}
            open={true}
            onClose={() => {}}
          />
        )}

        {activeTab === 1 && (
          <ConsultationPanel
            reportId={reportId}
            open={true}
            onClose={() => {}}
          />
        )}

        {activeTab === 2 && (
          <Box>
            {activeUsers.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No other users currently active on this report
              </Typography>
            ) : (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Active Users ({activeUsers.length})
                </Typography>
                
                <PresenceIndicators
                  activeUsers={activeUsers}
                  currentUserId={currentUserId}
                  showCursors={false}
                  maxDisplay={20}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
