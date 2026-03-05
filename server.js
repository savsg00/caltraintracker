require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Helper — fetch one stop from 511 and return MonitoredStopVisit array
async function fetchStop(token, stopId) {
  const url = `https://api.511.org/transit/StopMonitoring?api_key=${token}&agency=CT&stopCode=${stopId}&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`511 returned ${response.status} for stop ${stopId}`);
  const text    = await response.text();
  const cleaned = text.replace(/^\uFEFF/, '');
  const data    = JSON.parse(cleaned);
  return data?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit || [];
}

// ── /api/trains?nbId=70201&sbId=70202
// Fetches both platforms (northbound + southbound) and merges results
app.get('/api/trains', async (req, res) => {
  const { nbId, sbId } = req.query;

  if (!nbId) return res.status(400).json({ error: 'Missing nbId parameter' });

  const token = process.env.API_511_TOKEN;
  if (!token)  return res.status(500).json({ error: 'API_511_TOKEN not set in .env' });

  try {
    // Fetch both directions in parallel
    const [nbVisits, sbVisits] = await Promise.all([
      fetchStop(token, nbId),
      sbId ? fetchStop(token, sbId) : Promise.resolve([])
    ]);

    // Tag each visit with its direction
    const nb = nbVisits.map(v => ({ ...v, _direction: 'NB' }));
    const sb = sbVisits.map(v => ({ ...v, _direction: 'SB' }));

    res.json({ visits: [...nb, ...sb] });

  } catch (err) {
    console.error('Error fetching from 511:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Caltrain Tracker running at http://localhost:${PORT}`);
});