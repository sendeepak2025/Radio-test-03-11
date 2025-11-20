/**
 * Enhanced Scatter Plot Component
 * For correlation analysis (TAT vs Complexity, AI Usage vs Accuracy)
 */

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { Box, Typography } from '@mui/material';

interface ScatterDataPoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
  [key: string]: any;
}

interface EnhancedScatterPlotProps {
  data: ScatterDataPoint[];
  xLabel: string;
  yLabel: string;
  title?: string;
  color?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        {data.name && (
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            {data.name}
          </Typography>
        )}
        <Typography variant="body2">
          {payload[0].name}: {data.x}
        </Typography>
        <Typography variant="body2">
          {payload[0].payload.yLabel || 'Y'}: {data.y}
        </Typography>
        {data.z && (
          <Typography variant="body2">
            Size: {data.z}
          </Typography>
        )}
      </Box>
    );
  }
  return null;
};

export const EnhancedScatterPlot: React.FC<EnhancedScatterPlotProps> = ({
  data,
  xLabel,
  yLabel,
  title,
  color = '#8884d8',
}) => {
  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const enrichedData = data.map(point => ({
    ...point,
    yLabel,
  }));

  return (
    <Box>
      {title && (
        <Typography variant="h6" gutterBottom fontWeight="bold">
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            label={{ value: xLabel, position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
          />
          {enrichedData.some(d => d.z) && <ZAxis type="number" dataKey="z" range={[50, 400]} />}
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Scatter
            name={`${xLabel} vs ${yLabel}`}
            data={enrichedData}
            fill={color}
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default EnhancedScatterPlot;
