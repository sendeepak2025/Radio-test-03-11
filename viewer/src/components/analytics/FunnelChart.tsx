/**
 * Funnel Chart Component for Report Workflow Analysis
 * Visualizes progression through report stages
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface FunnelStage {
  name: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  width?: number;
  height?: number;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ 
  data, 
  width = 600, 
  height = 400 
}) => {
  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const stages = data.length;
  const stageHeight = (height - (stages + 1) * 10) / stages;

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        {data.map((stage, index) => {
          const widthRatio = stage.value / maxValue;
          const trapezoidWidth = width * 0.8 * widthRatio;
          const leftMargin = (width - trapezoidWidth) / 2;
          const y = index * (stageHeight + 10);

          const nextWidthRatio = index < data.length - 1 
            ? data[index + 1].value / maxValue 
            : widthRatio;
          const nextTrapezoidWidth = width * 0.8 * nextWidthRatio;
          const nextLeftMargin = (width - nextTrapezoidWidth) / 2;

          const points = [
            `${leftMargin},${y}`,
            `${leftMargin + trapezoidWidth},${y}`,
            `${nextLeftMargin + nextTrapezoidWidth},${y + stageHeight}`,
            `${nextLeftMargin},${y + stageHeight}`,
          ].join(' ');

          const percentage = ((stage.value / (data[0]?.value || 1)) * 100).toFixed(1);
          const dropoff = index > 0 
            ? ((data[index - 1].value - stage.value) / data[index - 1].value * 100).toFixed(1)
            : 0;

          return (
            <g key={index}>
              {/* Trapezoid */}
              <polygon
                points={points}
                fill={stage.color}
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              />

              {/* Stage name and value */}
              <text
                x={width / 2}
                y={y + stageHeight / 2 - 10}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#fff"
              >
                {stage.name}
              </text>
              <text
                x={width / 2}
                y={y + stageHeight / 2 + 10}
                textAnchor="middle"
                fontSize="18"
                fontWeight="bold"
                fill="#fff"
              >
                {stage.value.toLocaleString()}
              </text>
              <text
                x={width / 2}
                y={y + stageHeight / 2 + 30}
                textAnchor="middle"
                fontSize="12"
                fill="#fff"
              >
                {percentage}% of total
              </text>

              {/* Dropoff indicator */}
              {index > 0 && parseFloat(dropoff as string) > 0 && (
                <text
                  x={width - 10}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="11"
                  fill="#f44336"
                  fontWeight="bold"
                >
                  -{dropoff}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

export default FunnelChart;
