-- Create questions table to store survey questions and their options
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'rating', 'single_choice', 'multiple_choice')),
  question_order INTEGER NOT NULL DEFAULT 1,
  options JSONB DEFAULT NULL, -- Store options for choice questions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create policies for questions
CREATE POLICY "Users can view questions from their surveys" 
ON public.questions 
FOR SELECT 
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create questions for their surveys" 
ON public.questions 
FOR INSERT 
WITH CHECK (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update questions from their surveys" 
ON public.questions 
FOR UPDATE 
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete questions from their surveys" 
ON public.questions 
FOR DELETE 
USING (survey_id IN (
  SELECT id FROM public.surveys WHERE user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update responses table to store individual question responses
CREATE TABLE IF NOT EXISTS public.question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_rating INTEGER,
  answer_choices JSONB DEFAULT NULL, -- For multiple choice answers
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for question_responses
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for question_responses
CREATE POLICY "Anyone can insert question responses" 
ON public.question_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view responses to their questions" 
ON public.question_responses 
FOR SELECT 
USING (question_id IN (
  SELECT q.id FROM public.questions q
  JOIN public.surveys s ON q.survey_id = s.id
  WHERE s.user_id = auth.uid()
));