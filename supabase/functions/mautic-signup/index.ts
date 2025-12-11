import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

// --- CONFIGURATION ---
// These values must be set as Supabase secrets:
// supabase secrets set MAUTIC_URL=https://mautic.yoread.com
// supabase secrets set MAUTIC_USER=mautic_db
// supabase secrets set MAUTIC_PW=mautic_password
// supabase secrets set MAUTIC_SEGMENT_ID=1
// supabase secrets set MAUTIC_WELCOME_EMAIL_ID=1

const MAUTIC_URL = Deno.env.get('MAUTIC_URL')
const MAUTIC_USER = Deno.env.get('MAUTIC_USER')
const MAUTIC_PW = Deno.env.get('MAUTIC_PW')
const MAUTIC_SEGMENT_ID = Deno.env.get('MAUTIC_SEGMENT_ID')
const MAUTIC_WELCOME_EMAIL_ID = Deno.env.get('MAUTIC_WELCOME_EMAIL_ID') || '1'

if (!MAUTIC_URL || !MAUTIC_USER || !MAUTIC_PW || !MAUTIC_SEGMENT_ID) {
  throw new Error('Missing required Mautic configuration. Please set MAUTIC_URL, MAUTIC_USER, MAUTIC_PW, and MAUTIC_SEGMENT_ID as Supabase secrets.')
}

const SEGMENT_ID = parseInt(MAUTIC_SEGMENT_ID, 10)
const EMAIL_ID = parseInt(MAUTIC_WELCOME_EMAIL_ID, 10)
// ---------------------

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 1. Parse Supabase Webhook Data
    const payload = await req.json()
    const record = payload.record // 'record' holds the new user data

    // Safety check: Is there an email?
    if (!record || !record.email) {
      return new Response(
        JSON.stringify({ error: 'No email found in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Mautic] New Signup Detected: ${record.email}`)

    // 2. Extract Name (Supabase stores metadata in a JSON object)
    const meta = record.raw_user_meta_data || {}
    const firstName = meta.first_name || meta.name || 'Friend'
    const lastName = meta.last_name || meta.lastname || ''

    // 3. Prepare Mautic Authentication (Basic Auth)
    const authString = btoa(`${MAUTIC_USER}:${MAUTIC_PW}`)
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    }

    // 4. Create Contact in Mautic
    const createRes = await fetch(`${MAUTIC_URL}/api/contacts/new`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        email: record.email,
        firstname: firstName,
        lastname: lastName,
        overwriteWithBlank: true
      })
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('[Mautic] Failed to create contact:', errorText)
      throw new Error(`Mautic API error: ${createRes.status} - ${errorText}`)
    }

    const mauticData = await createRes.json()

    // Check if Mautic gave us an ID back
    const contactId = mauticData.contact?.id
    if (!contactId) {
      console.error('[Mautic] Response:', mauticData)
      throw new Error('Failed to create Mautic contact - no ID returned')
    }

    console.log(`[Mautic] Contact created with ID: ${contactId}`)

    // 5. Add to the Welcome Segment
    const segmentRes = await fetch(`${MAUTIC_URL}/api/segments/${SEGMENT_ID}/contact/${contactId}/add`, {
      method: 'POST',
      headers: headers
    })

    if (!segmentRes.ok) {
      const errorText = await segmentRes.text()
      console.error(`[Mautic] Segment Error (${segmentRes.status}):`, errorText)
    } else {
      console.log(`[Mautic] Contact ${contactId} added to segment ${SEGMENT_ID}`)
    }

    // 6. Send Welcome Email Directly via API
    // Mautic API format: POST /api/emails/{id}/send with contactId in body
    const emailRes = await fetch(`${MAUTIC_URL}/api/emails/${EMAIL_ID}/send`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        contactId: contactId
      })
    })

    if (!emailRes.ok) {
      const errorText = await emailRes.text()
      console.error(`[Mautic] Email Send Error (${emailRes.status}):`, errorText)
      // Try alternative endpoint format if first one fails
      const altEmailRes = await fetch(`${MAUTIC_URL}/api/contacts/${contactId}/email/${EMAIL_ID}/send`, {
        method: 'POST',
        headers: headers
      })
      
      if (!altEmailRes.ok) {
        const altErrorText = await altEmailRes.text()
        console.error(`[Mautic] Alternative Email Send Error (${altEmailRes.status}):`, altErrorText)
      } else {
        const altEmailData = await altEmailRes.json()
        console.log(`[Mautic] Welcome email sent via alternative endpoint to contact ${contactId}:`, altEmailData)
      }
    } else {
      const emailData = await emailRes.json()
      console.log(`[Mautic] Welcome email sent to contact ${contactId}:`, emailData)
    }

    console.log(`[Mautic] Success! User ${record.email} added to Mautic ID ${contactId}, Segment ${SEGMENT_ID}, and welcome email sent`)

    return new Response(
      JSON.stringify({ success: true, id: contactId, emailSent: emailRes.ok }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Mautic] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

