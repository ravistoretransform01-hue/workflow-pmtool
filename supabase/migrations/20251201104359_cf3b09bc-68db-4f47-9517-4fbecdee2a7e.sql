-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_summary TEXT,
  project_id UUID,
  project_name TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'inProgress', 'review', 'done')),
  deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task feedback table
CREATE TABLE public.task_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create developer ratings aggregate table
CREATE TABLE public.developer_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_ratings INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.tasks FOR SELECT
USING (auth.uid() = assigned_to OR auth.uid() = created_by);

CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their assigned tasks"
ON public.tasks FOR UPDATE
USING (auth.uid() = assigned_to OR auth.uid() = created_by);

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on their tasks"
ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create comments on their tasks"
ON public.task_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  )
);

-- RLS Policies for task_feedback
CREATE POLICY "Users can view feedback on their tasks"
ON public.task_feedback FOR SELECT
USING (auth.uid() = developer_id OR auth.uid() = client_id);

CREATE POLICY "Clients can create feedback for completed tasks"
ON public.task_feedback FOR INSERT
WITH CHECK (
  auth.uid() = client_id AND
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_feedback.task_id
    AND tasks.status = 'done'
    AND tasks.created_by = auth.uid()
  )
);

-- RLS Policies for developer_ratings
CREATE POLICY "Everyone can view developer ratings"
ON public.developer_ratings FOR SELECT
USING (true);

-- Function to update developer ratings
CREATE OR REPLACE FUNCTION public.update_developer_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.developer_ratings (developer_id, total_ratings, average_rating, total_tasks_completed)
  VALUES (
    NEW.developer_id,
    1,
    NEW.rating,
    (SELECT COUNT(*) FROM public.tasks WHERE assigned_to = NEW.developer_id AND status = 'done')
  )
  ON CONFLICT (developer_id) DO UPDATE
  SET
    total_ratings = developer_ratings.total_ratings + 1,
    average_rating = (developer_ratings.average_rating * developer_ratings.total_ratings + NEW.rating) / (developer_ratings.total_ratings + 1),
    total_tasks_completed = (SELECT COUNT(*) FROM public.tasks WHERE assigned_to = NEW.developer_id AND status = 'done'),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger to update developer ratings when feedback is added
CREATE TRIGGER update_developer_rating_trigger
AFTER INSERT ON public.task_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_developer_rating();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();