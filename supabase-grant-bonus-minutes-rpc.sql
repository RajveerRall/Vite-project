-- RPC Function: Grant bonus minutes for answering question
-- This function is called by the Edge Function after validation

CREATE OR REPLACE FUNCTION grant_bonus_minutes_for_question(
  p_session_id text,
  p_answer text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus_seconds integer := 3600; -- 1 hour = 3600 seconds
  v_session_exists boolean;
  v_already_answered boolean;
  v_session_record RECORD;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_id is required');
  END IF;
  
  IF p_answer IS NULL OR TRIM(p_answer) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Answer cannot be empty');
  END IF;
  
  -- Validate session_id format (matches table constraint)
  IF p_session_id !~ '^anon_[0-9]+_[a-z0-9]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid session_id format');
  END IF;
  
  -- Check if session exists
  SELECT EXISTS(
    SELECT 1 FROM anonymous_tts_sessions WHERE session_id = p_session_id
  ) INTO v_session_exists;
  
  IF v_session_exists THEN
    -- Get current session state
    SELECT has_answered_question, bonus_minutes_seconds
    INTO v_session_record
    FROM anonymous_tts_sessions
    WHERE session_id = p_session_id;
    
    -- Check if already answered
    IF v_session_record.has_answered_question THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Question already answered',
        'already_answered', true,
        'existing_bonus_seconds', v_session_record.bonus_minutes_seconds
      );
    END IF;
    
    -- Update existing session with bonus
    UPDATE anonymous_tts_sessions
    SET 
      has_answered_question = true,
      bonus_minutes_seconds = v_bonus_seconds,
      question_answer = TRIM(p_answer),
      last_active_at = now()
    WHERE session_id = p_session_id;
  ELSE
    -- Create new session with bonus (upsert pattern)
    INSERT INTO anonymous_tts_sessions (
      session_id,
      has_answered_question,
      bonus_minutes_seconds,
      question_answer,
      created_at,
      last_active_at
    ) VALUES (
      p_session_id,
      true,
      v_bonus_seconds,
      TRIM(p_answer),
      now(),
      now()
    )
    ON CONFLICT (session_id) DO UPDATE
    SET 
      has_answered_question = true,
      bonus_minutes_seconds = v_bonus_seconds,
      question_answer = TRIM(p_answer),
      last_active_at = now();
  END IF;
  
  -- Store answer in feedback table (allow multiple entries per session for now)
  INSERT INTO user_feedback (session_id, question, answer)
  VALUES (p_session_id, 'Why do you want to listen to your ebooks?', TRIM(p_answer));
  
  RETURN jsonb_build_object(
    'success', true,
    'bonus_minutes', v_bonus_seconds / 60,
    'bonus_seconds', v_bonus_seconds,
    'session_id', p_session_id
  );
END;
$$;

