import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // Verify secret key
  const secret = req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  // Get all active alerts from database
  // Get all active alerts from database
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_active', true)

  if (error) return res.status(500).json({ error: error.message })
  if (!alerts || alerts.length === 0) return res.status(200).json({ message: 'No active alerts' })

  let emailsSent = 0

  for (const alert of alerts) {
    // Get current price for this station
    const API_KEY = process.env.VITE_API_KEY || ''
    const API_SECRET = process.env.VITE_API_SECRET || ''

    const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')
    const tokenRes = await fetch(
      'https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials',
      {
        method: 'GET',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      }
    )
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const hours = now.getUTCHours()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    const timestamp = `${pad(now.getUTCDate())}/${pad(now.getUTCMonth() + 1)}/${now.getUTCFullYear()} ${pad(hours12)}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} ${ampm}`

    const priceRes = await fetch(
      `https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices/station/${alert.station_code}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
          'apikey': API_KEY,
          'transactionid': `txn-${Date.now()}`,
          'requesttimestamp': timestamp,
        },
      }
    )

    const priceData = await priceRes.json()
    const prices = priceData.prices || []
    const match = prices.find((p: any) => p.fueltype === alert.fuel_type)

    if (!match) continue

    const currentPrice = match.price
    const alreadyNotified = alert.last_notified !== null

    // Price is below threshold and we haven't notified yet
    if (currentPrice <= alert.threshold_price && !alreadyNotified) {
      await resend.emails.send({
        from: 'FuelFinder NSW <alerts@fuelfinder.com.au>',
        to: alert.email,
        subject: `Price alert: ${alert.station_name} is now ${currentPrice}¢/L`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Price dropped at your saved station</h2>
            <p><strong>${alert.station_name}</strong> is now selling ${alert.fuel_type} at <strong style="color: #16a34a;">${currentPrice}¢/L</strong></p>
            <p>Your alert was set for below <strong>${alert.threshold_price}¢/L</strong></p>
            <p style="color: #64748b; font-size: 13px;">${alert.station_address}</p>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alert.station_address)}" 
               style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1d4ed8; color: white; text-decoration: none; border-radius: 8px;">
              Get directions
            </a>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">FuelFinder NSW · You're receiving this because you set a price alert.</p>
          </div>
        `,
      })

      // Mark alert as notified
      await supabase
        .from('alerts')
        .update({ last_notified: new Date().toISOString() })
        .eq('id', alert.id)

      emailsSent++
    }

    // Price went back above threshold — reset so we can notify again next time
    if (currentPrice > alert.threshold_price && alreadyNotified) {
      await supabase
        .from('alerts')
        .update({ last_notified: null })
        .eq('id', alert.id)
    }
  }

  return res.status(200).json({ message: `Checked ${alerts.length} alerts, sent ${emailsSent} emails` })
}