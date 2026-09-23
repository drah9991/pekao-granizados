-- ============================================
-- RATE LIMITING FOR AUTHENTICATION
-- Protects against brute force attacks
-- ============================================

-- Create table to track login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempt_time TIMESTAMPTZ DEFAULT NOW(),
  successful BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_time ON public.login_attempts(attempt_time DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to check if account is locked (5 failed attempts in 15 minutes)
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  -- Count failed login attempts in the last 15 minutes
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE email = user_email
    AND successful = FALSE
    AND attempt_time > NOW() - INTERVAL '15 minutes';

  -- Account is locked if 5 or more failed attempts
  RETURN failed_count >= 5;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  user_email TEXT,
  user_ip TEXT DEFAULT NULL,
  was_successful BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, ip_address, successful)
  VALUES (user_email, user_ip, was_successful);

  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function to get remaining lockout time
CREATE OR REPLACE FUNCTION public.get_lockout_remaining_time(user_email TEXT)
RETURNS INTERVAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_attempt_time TIMESTAMPTZ;
  lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Get the time of the most recent failed attempt
  SELECT MAX(attempt_time) INTO last_attempt_time
  FROM public.login_attempts
  WHERE email = user_email
    AND successful = FALSE
    AND attempt_time > NOW() - lockout_duration;

  IF last_attempt_time IS NULL THEN
    RETURN INTERVAL '0';
  END IF;

  -- Calculate remaining time
  RETURN lockout_duration - (NOW() - last_attempt_time);
END;
$$;

-- Function to clear login attempts (for successful login or manual unlock)
CREATE OR REPLACE FUNCTION public.clear_login_attempts(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE email = user_email
    AND attempt_time > NOW() - INTERVAL '15 minutes';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_account_locked TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_lockout_remaining_time TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.clear_login_attempts TO authenticated;

COMMENT ON TABLE public.login_attempts IS 'Tracks login attempts for rate limiting and brute force protection';
COMMENT ON FUNCTION public.is_account_locked IS 'Checks if an account is locked due to too many failed login attempts';
COMMENT ON FUNCTION public.record_login_attempt IS 'Records a login attempt (successful or failed)';
COMMENT ON FUNCTION public.get_lockout_remaining_time IS 'Returns remaining lockout time for a locked account';
COMMENT ON FUNCTION public.clear_login_attempts IS 'Clears recent login attempts for an email';
