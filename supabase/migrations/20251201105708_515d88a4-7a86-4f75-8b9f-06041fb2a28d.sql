-- Create role enum
CREATE TYPE public.app_role AS ENUM ('client', 'developer', 'team_leader', 'project_manager', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is manager (project_manager or team_leader)
CREATE OR REPLACE FUNCTION public.is_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('project_manager', 'team_leader', 'admin')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update tasks table RLS policies to allow managers to see all tasks
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.tasks;

CREATE POLICY "Users can view their tasks or managers can view all"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = assigned_to 
  OR auth.uid() = created_by 
  OR public.is_manager(auth.uid())
);

-- Allow managers to update any task
CREATE POLICY "Managers can update all tasks"
ON public.tasks
FOR UPDATE
USING (public.is_manager(auth.uid()));

-- Update task_comments RLS to allow managers to view all comments
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;

CREATE POLICY "Users can view comments or managers can view all"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_to = auth.uid() OR tasks.created_by = auth.uid())
  )
  OR public.is_manager(auth.uid())
);

-- Update task_feedback RLS to allow managers to view all feedback
DROP POLICY IF EXISTS "Users can view feedback on their tasks" ON public.task_feedback;

CREATE POLICY "Users can view their feedback or managers can view all"
ON public.task_feedback
FOR SELECT
USING (
  auth.uid() = developer_id 
  OR auth.uid() = client_id 
  OR public.is_manager(auth.uid())
);