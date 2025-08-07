-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'start_quantico',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_responses INTEGER NOT NULL DEFAULT 100,
  unique_link_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create responses table
CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_ip TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  sentiment_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for surveys
CREATE POLICY "Users can view their own surveys" 
ON public.surveys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own surveys" 
ON public.surveys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own surveys" 
ON public.surveys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own surveys" 
ON public.surveys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for responses
CREATE POLICY "Survey owners can view responses" 
ON public.responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.surveys 
  WHERE surveys.id = responses.survey_id 
  AND surveys.user_id = auth.uid()
));

CREATE POLICY "Anyone can insert responses to active surveys" 
ON public.responses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.surveys 
  WHERE surveys.id = responses.survey_id 
  AND surveys.is_active = true
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique survey links
CREATE OR REPLACE FUNCTION public.generate_unique_link_id()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance
CREATE INDEX idx_surveys_user_id ON public.surveys(user_id);
CREATE INDEX idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX idx_surveys_unique_link_id ON public.surveys(unique_link_id);