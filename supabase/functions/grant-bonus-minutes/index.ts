import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { session_id, answer } = await req.json()

    // Validate inputs
    if (!session_id || typeof session_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'session_id is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return new Response(
        JSON.stringify({ error: 'answer is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate session_id format (matches table constraint: ^anon_[0-9]+_[a-z0-9]+$)
    const sessionIdPattern = /^anon_[0-9]+_[a-z0-9]+$/
    if (!sessionIdPattern.test(session_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid session_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate answer length (prevent abuse)
    const trimmedAnswer = answer.trim()
    if (trimmedAnswer.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Answer must be at least 10 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (trimmedAnswer.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Answer must be less than 2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call RPC function to grant bonus minutes
    const { data, error: rpcError } = await supabase.rpc('grant_bonus_minutes_for_question', {
      p_session_id: session_id,
      p_answer: trimmedAnswer
    })

    if (rpcError) {
      console.error('[Grant Bonus Minutes] RPC error:', rpcError)
      
      // Check if it's an "already answered" error
      if (data?.already_answered) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Question already answered',
            already_answered: true,
            existing_bonus_seconds: data.existing_bonus_seconds
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          error: rpcError.message || 'Failed to grant bonus minutes',
          details: rpcError.details 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data || !data.success) {
      return new Response(
        JSON.stringify({ 
          error: data?.error || 'Failed to grant bonus minutes',
          data 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        bonus_minutes: data.bonus_minutes,
        bonus_seconds: data.bonus_seconds,
        session_id: data.session_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Grant Bonus Minutes] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})



