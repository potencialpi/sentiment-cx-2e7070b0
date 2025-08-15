-- Enable RLS on public_surveys table
ALTER TABLE public.public_surveys ENABLE ROW LEVEL SECURITY;

-- Policy to allow public read access to active surveys with unique links
CREATE POLICY "Public can view active surveys with links" 
ON public.public_surveys 
FOR SELECT 
USING (status = 'active' AND unique_link IS NOT NULL AND unique_link != '');

-- Policy to allow survey owners to view their own surveys in the public view
CREATE POLICY "Survey owners can view their surveys in public view" 
ON public.public_surveys 
FOR SELECT 
USING (id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

-- Restrict all other operations (INSERT, UPDATE, DELETE) to prevent data manipulation
-- No policies for INSERT/UPDATE/DELETE means these operations are completely blocked