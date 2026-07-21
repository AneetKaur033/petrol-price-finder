import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { email, station_code, station_name, station_address, fuel_type, threshold_price } = req.body

    if (!email || !station_code || !station_name || !fuel_type || !threshold_price) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { error } = await supabase
      .from('alerts')
      .insert({
        email,
        station_code,
        station_name,
        station_address,
        fuel_type,
        threshold_price,
      })

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}