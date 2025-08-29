-- CRITICAL SECURITY FIX: Remove anonymous read access to checkout_sessions table
-- This table contains sensitive customer payment data that should NOT be publicly accessible

-- Drop the dangerous anonymous read policy
DROP POLICY IF EXISTS "Anon can read checkout sessions" ON public.checkout_sessions;

-- Ensure only authenticated users can read their own sessions by email
-- (this policy already exists but we're being explicit about security)
DROP POLICY IF EXISTS "Users can read their own checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Users can read their own checkout sessions" 
ON public.checkout_sessions 
FOR SELECT 
USING (auth.email() = email);

-- Service role maintains full access for backend operations (payment processing)
-- (this policy already exists but we're ensuring it's properly configured)
DROP POLICY IF EXISTS "Service role can manage checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Service role can manage checkout sessions" 
ON public.checkout_sessions 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Ensure public insert is still allowed for checkout creation
-- (this policy already exists but we're being explicit)
DROP POLICY IF EXISTS "allow_public_insert_checkout_sessions" ON public.checkout_sessions;
CREATE POLICY "allow_public_insert_checkout_sessions" 
ON public.checkout_sessions 
FOR INSERT 
WITH CHECK (true);

-- Add a comment documenting the security requirements
COMMENT ON TABLE public.checkout_sessions IS 'Contains sensitive payment data. Access restricted to: 1) Users can only read their own sessions (by email), 2) Service role for backend operations, 3) Public insert allowed for checkout creation only.';

-- Log this security fix with proper JSONB format
INSERT INTO public.audit_log (event_type, table_name, details) 
VALUES ('SECURITY_FIX', 'checkout_sessions', 
  jsonb_build_object(
    'action', 'removed_anonymous_read_access',
    'reason', 'prevent_data_theft', 
    'timestamp', now()
  )
);