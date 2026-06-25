import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_API_KEY || '';
const API_SECRET = process.env.VITE_API_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lat = '-33.8688', lng = '151.2093', radius = '5', fueltype = 'E10' } = req.query;

  const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  const tokenResponse = await fetch(
    'https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials',
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token;

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = now.getUTCHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const timestamp = `${pad(now.getUTCDate())}/${pad(now.getUTCMonth()+1)}/${now.getUTCFullYear()} ${pad(hours12)}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} ${ampm}`;

  const priceResponse = await fetch(
    'https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices/nearby',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'apikey': API_KEY,
        'transactionid': `txn-${Date.now()}`,
        'requesttimestamp': timestamp,
      },
      body: JSON.stringify({
        fueltype: fueltype,
        brand: [],
        latitude: lat,
        longitude: lng,
        radius: radius,
        sortby: 'price',
        sortascending: 'true',
      }),
    }
  );

  const priceData = await priceResponse.json();
  res.status(200).json(priceData);
}