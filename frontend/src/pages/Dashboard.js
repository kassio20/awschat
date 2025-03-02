import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'EC2', cost: 300 },
  { name: 'S3', cost: 200 },
  { name: 'RDS', cost: 250 },
  { name: 'Lambda', cost: 100 },
];

function Dashboard() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            AWS Resource Usage
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Active Services
          </Typography>
          <Typography variant="body1">
            EC2 Instances: 5 running
          </Typography>
          <Typography variant="body1">
            S3 Buckets: 3 active
          </Typography>
          <Typography variant="body1">
            RDS Instances: 2 running
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Cost Overview
          </Typography>
          <Typography variant="body1">
            Current Month: $850
          </Typography>
          <Typography variant="body1">
            Previous Month: $780
          </Typography>
          <Typography variant="body1" color="primary">
            Projected: $900
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default Dashboard;
