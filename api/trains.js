const fetch = require('node-fetch');

export default async function handler(req, res) {
  const { nbId, sbId } = req.query;

  if (!nbId) {
    return res.status(400).json({ error: 'Missing nbId parameter' });
  }

  const token = process.env.API_511_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'API_511_TOKEN not set in Vercel environment variables' });
  }

  async function fetchStop(id) {
    const url = `https://api.511.org/transit/StopMonitoring?api_key=${token}&agency=CT&stopCode=${id}&format=json`;
    const r    = await fetch(url);
    if (!r.ok) throw new Error(`511 returned ${r.status} for stop ${id}`);
    const text = await r.text();
    const data = JSON.parse(text.replace(/^\uFEFF/, ''));
    return data?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit || [];
  }

  try {
    const [nb, sb] = await Promise.all([
      fetchStop(nbId),
      sbId ? fetchStop(sbId) : Promise.resolve([])
    ]);

    res.json({
      visits: [
        ...nb.map(v => ({ ...v, _direction: 'NB' })),
        ...sb.map(v => ({ ...v, _direction: 'SB' })),
      ]
    });

  } catch (err) {
    console.error('511 fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
}