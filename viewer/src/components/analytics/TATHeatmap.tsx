/**
 * Heatmap Component for Turnaround Time Analysis
 * Visualizes TAT by day of week and hour of day
 */

import React from 'react';
import { Box, Typography, Tooltip as MuiTooltip } from '@mui/material';

interface HeatmapProps {
  data: Array<{
    day: string;
    hour: number;
    value: number;
  }>;
  width?: number;
  height?: number;
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hours = Array.from({ length: 24 }, (_, i) => i);

const getColorForValue = (value: number, min: number, max: number): string => {
  if (value === 0) return '#f0f0f0';
  
  const normalizedValue = (value - min) / (max - min);
  
  if (normalizedValue < 0.2) return '#4caf50';
  if (normalizedValue < 0.4) return '#8bc34a';
  if (normalizedValue < 0.6) return '#ffeb3b';
  if (normalizedValue < 0.8) return '#ff9800';
  return '#f44336';
};

export const TATHeatmap: React.FC<HeatmapProps> = ({ data, width = 900, height = 300 }) => {
  const cellWidth = width / 24;
  const cellHeight = height / 7;

  const dataMap = new Map<string, number>();
  data.forEach(item => {
    const key = `${item.day}-${item.hour}`;
    dataMap.set(key, item.value);
  });

  const values = Array.from(dataMap.values());
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);

  return (
    <Box>
      <svg width={width} height={height + 60}>
        {/* Hour labels (top) */}
        {hours.map(hour => (
          <text
            key={`hour-${hour}`}
            x={hour * cellWidth + cellWidth / 2}
            y={15}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {hour}:00
          </text>
        ))}

        {/* Day labels (left) */}
        {days.map((day, dayIndex) => (
          <text
            key={`day-${day}`}
            x={-10}
            y={30 + dayIndex * cellHeight + cellHeight / 2}
            textAnchor="end"
            fontSize="12"
            fill="#666"
            dominantBaseline="middle"
          >
            {day.substring(0, 3)}
          </text>
        ))}

        {/* Heatmap cells */}
        {days.map((day, dayIndex) =>
          hours.map(hour => {
            const key = `${day}-${hour}`;
            const value = dataMap.get(key) || 0;
            const color = getColorForValue(value, min, max);

            return (
              <MuiTooltip
                key={key}
                title={
                  <Box>
                    <Typography variant="body2">{day}</Typography>
                    <Typography variant="body2">{hour}:00 - {hour + 1}:00</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {value > 0 ? `${value.toFixed(1)} min` : 'No data'}
                    </Typography>
                  </Box>
                }
                arrow
              >
                <rect
                  x={hour * cellWidth}
                  y={30 + dayIndex * cellHeight}
                  width={cellWidth - 2}
                  height={cellHeight - 2}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                />
              </MuiTooltip>
            );
          })
        )}

        {/* Legend */}
        <g transform={`translate(0, ${height + 35})`}>
          <text x={0} y={10} fontSize="11" fill="#666">Fast</text>
          <rect x={40} y={0} width={150} height={15} fill="url(#gradient)" />
          <text x={200} y={10} fontSize="11" fill="#666">Slow</text>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4caf50" />
              <stop offset="25%" stopColor="#8bc34a" />
              <stop offset="50%" stopColor="#ffeb3b" />
              <stop offset="75%" stopColor="#ff9800" />
              <stop offset="100%" stopColor="#f44336" />
            </linearGradient>
          </defs>
        </g>
      </svg>
    </Box>
  );
};

export default TATHeatmap;
