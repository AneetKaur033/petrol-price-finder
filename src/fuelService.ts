const API_KEY = import.meta.env.VITE_API_KEY;
const API_SECRET = import.meta.env.VITE_API_SECRET;

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${API_KEY}:${API_SECRET}`);
  
  const response = await fetch(
    'https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials',
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  return data.access_token;
}

export async function getPricesNearby(lat: number, lng: number, radius: number = 5) {
  const token = await getAccessToken();

  const response = await fetch(
    'https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices/nearby',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        lat,
        lng,
        radius,
        fueltype: 'E10',
        brand: '',
        size: 10,
        sortby: 'Price',
        ascending: 'true',
      }),
    }
  );

  const data = await response.json();
  return data;
}