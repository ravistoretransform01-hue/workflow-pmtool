-- Create time tracking sessions table
CREATE TABLE public.time_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create screenshots table
CREATE TABLE public.task_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.time_tracking_sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  screenshot_url TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_tracking_sessions
CREATE POLICY "Users can view their own tracking sessions"
ON public.time_tracking_sessions
FOR SELECT
USING (auth.uid() = user_id OR public.is_manager(auth.uid()));

CREATE POLICY "Users can create their own tracking sessions"
ON public.time_tracking_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking sessions"
ON public.time_tracking_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking sessions"
ON public.time_tracking_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for task_screenshots
CREATE POLICY "Users can view their own screenshots or managers can view all"
ON public.task_screenshots
FOR SELECT
USING (auth.uid() = user_id OR public.is_manager(auth.uid()));

CREATE POLICY "Users can create their own screenshots"
ON public.task_screenshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenshots"
ON public.task_screenshots
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_time_tracking_task_user ON public.time_tracking_sessions(task_id, user_id);
CREATE INDEX idx_screenshots_session ON public.task_screenshots(session_id);
CREATE INDEX idx_screenshots_task ON public.task_screenshots(task_id);