-- Add phone_number column to checkout_sessions table
ALTER TABLE public.checkout_sessions 
ADD COLUMN phone_number text NOT NULL DEFAULT '';

-- Update the default to be empty string for new records
ALTER TABLE public.checkout_sessions 
ALTER COLUMN phone_number DROP DEFAULT;