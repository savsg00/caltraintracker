require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public')); // serves your index.html

app.get('/api/trains', async (req, res) => {
  const stop = req.query.stop;
  const token = process.env.API_511_TOKEN; // grabbed from .env
  
  const url = `https://api.511.org/transit/StopMonitoring?api_key=${token}&agency=CT&stopCode=${stop}&format=json`;
  
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

app.listen(3000, () => console.log('Running at http://localhost:3000'));
