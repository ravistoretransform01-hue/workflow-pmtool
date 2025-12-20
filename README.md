# Project Manager Application

A comprehensive project management application built with React, TypeScript, Tailwind CSS, and Supabase (via Lovable Cloud). This application provides task management, team collaboration, role-based access control, and AI-powered features.

## 🚀 Features

### Core Features

#### 1. **Task Management System**
- Create, view, update, and track tasks
- Task statuses: To Do, In Progress, Done, Blocked
- Priority levels: Low, Medium, High
- Task assignments to team members
- Deadline tracking and completion dates
- Project association for tasks

#### 2. **Kanban Board with Drag & Drop**
- Visual task organization by status columns
- Drag and drop tasks between columns
- Automatically updates task status when moved
- Scrollable columns for managing large task lists
- Real-time task reordering within columns

#### 3. **AI-Powered Task Suggestions**
- Get intelligent task recommendations using Lovable AI (Google Gemini)
- AI analyzes task context and provides actionable suggestions
- Generates summaries and client-friendly descriptions
- Powered by `google/gemini-2.5-flash` model

#### 4. **Role-Based Access Control**
- **Client**: Create tasks and provide feedback
- **Developer**: Work on assigned tasks and view feedback
- **Team Leader**: Oversee team tasks and manage developers
- **Project Manager**: Full visibility and control over all tasks
- **Admin**: System-wide administration

#### 5. **Team Management Dashboard** (Project Managers & Team Leaders)
- View all developer tasks in one place
- Filter tasks by status (All, To Do, In Progress, Done, Blocked)
- Real-time task statistics and progress tracking
- Visual progress bars for task completion
- Sortable and searchable task tables
- Click any task to view full details

#### 6. **Task Feedback & Rating System**
- Clients can rate completed tasks (1-5 stars)
- Provide detailed feedback on task completion
- Developer ratings automatically calculated
- View aggregated developer performance metrics

#### 7. **Comments System**
- Add comments to tasks for team collaboration
- View comment history with timestamps
- Role-based comment visibility

#### 8. **Developer Performance Tracking**
- Automatic rating aggregation
- Total tasks completed counter
- Average rating calculation
- Performance metrics stored in `developer_ratings` table

### Pages

- **Dashboard** (`/dashboard`) - Overview and task summary
- **Todo Tasks** (`/tasks/todo`) - Kanban board with drag & drop
- **Completed Tasks** (`/tasks/completed`) - Historical task view
- **Ongoing Projects** (`/projects/ongoing`) - Active projects overview
- **Client Feedback** (`/feedback`) - Feedback management
- **Team Management** (`/team`) - Manager-only task oversight (requires Team Leader or Project Manager role)
- **Login/Signup** - Authentication pages

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **AI Integration**: Lovable AI Gateway (Google Gemini 2.5 Flash)
- **Drag & Drop**: @dnd-kit
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Form Handling**: React Hook Form with Zod validation

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- Lovable Cloud account (automatically configured)

### Setup

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Environment Variables**
The `.env` file is automatically configured by Lovable Cloud with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

4. **Start development server**
```bash
npm run dev
# or
bun dev
```

5. **Access the application**
Open [http://localhost:8080](http://localhost:8080) in your browser

## 🗄️ Database Schema

### Tables

#### `tasks`
- Core task information (title, description, status, priority)
- Assignment tracking (assigned_to, created_by)
- Timestamps (created_at, updated_at, completed_at, deadline)
- Project association

#### `task_comments`
- User comments on tasks
- Timestamps and user tracking

#### `task_feedback`
- Client feedback on completed tasks
- Rating system (1-5 stars)
- Linked to tasks and developers

#### `developer_ratings`
- Aggregated developer performance metrics
- Average rating calculation
- Total tasks completed
- Auto-updated via database trigger

#### `user_roles`
- Role-based access control
- Supports: client, developer, team_leader, project_manager, admin
- Multiple roles per user allowed

### Database Functions

- `update_developer_rating()` - Automatically updates developer ratings when feedback is added
- `update_updated_at_column()` - Updates timestamps on task modifications
- `has_role(_user_id, _role)` - Security definer function for role checking
- `is_manager(_user_id)` - Checks if user is a manager (team_leader, project_manager, or admin)

### Row Level Security (RLS)

All tables have RLS policies enforcing:
- Users can only view/edit their own tasks
- Managers can view/edit all tasks
- Clients can provide feedback on completed tasks
- Developers receive feedback on their tasks

## 🔐 Authentication

- Email/password authentication
- Auto-confirm email signups (enabled for development)
- Session persistence with localStorage
- Protected routes with automatic redirects

## 🤖 AI Features

### Task Suggestions Edge Function
**Location**: `supabase/functions/task-ai-suggestions/index.ts`

**Features**:
- Analyzes task context and generates actionable suggestions
- Creates client-friendly summaries
- Uses structured output with tool calling
- Handles rate limiting (429) and payment errors (402)

**Models Available**:
- `google/gemini-2.5-flash` (default)
- `google/gemini-2.5-pro`
- `openai/gpt-5`
- And more via Lovable AI Gateway

## 🎨 Design System

- **Dark Theme**: Navy/slate background with bright blue accents
- **Sidebar Navigation**: Collapsible black sidebar with white icons
- **Semantic Tokens**: All colors defined in `index.css` and `tailwind.config.ts`
- **Component Library**: shadcn/ui components with custom styling
- **Responsive**: Mobile-first design with responsive breakpoints

## 🚢 Deployment

### Frontend Deployment
1. Click the **Publish** button in Lovable editor (top right on desktop)
2. Click **Update** in the publish dialog to deploy changes
3. Your app will be live at `yourproject.lovable.app`

### Backend Deployment
- Edge functions deploy automatically when code is pushed
- Database migrations require approval in Lovable interface
- No manual deployment needed for backend changes

## 📱 Usage

### For Developers
1. Sign up and receive tasks from project managers
2. Update task status via drag & drop Kanban board
3. Add comments for collaboration
4. Mark tasks as complete

### For Clients
1. Create tasks for developers
2. Track task progress
3. Provide feedback and ratings on completed tasks

### For Managers (Team Leaders/Project Managers)
1. Navigate to **Team Management** page
2. View all team tasks across projects
3. Filter by status and priority
4. Monitor team performance metrics
5. Access detailed task information with one click

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Key Directories

```
src/
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── AppSidebar.tsx
│   ├── DashboardHeader.tsx
│   └── TaskDetailDialog.tsx
├── pages/             # Route pages
├── integrations/      # Supabase client (auto-generated)
├── hooks/             # Custom React hooks
└── lib/               # Utility functions

supabase/
├── functions/         # Edge functions
│   └── task-ai-suggestions/
└── migrations/        # Database migrations
```

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control with security definer functions
- Authenticated routes with session validation
- API keys stored securely in Supabase secrets
- No sensitive data exposed to client

## 📊 Performance

- Optimized with React Query for caching
- Lazy loading for components
- Efficient database queries with indexed columns
- Edge functions for serverless scaling

## 🐛 Troubleshooting

### Can't see data
- Check RLS policies are configured correctly
- Ensure user is authenticated
- Verify user has appropriate role assigned

### AI features not working
- Check Lovable AI is enabled in project settings
- Verify `LOVABLE_API_KEY` is configured
- Check for rate limiting (429) or payment errors (402)

### Tasks not updating
- Clear browser cache
- Check console for errors
- Verify Supabase connection

## 📄 Project Info

**Lovable Project URL**: https://lovable.dev/projects/d26404cf-fd9b-4075-8da6-dda55ed73632

## 🤝 Support

For issues or questions:
- Check [Lovable Documentation](https://docs.lovable.dev/)
- Join [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- Contact support@lovable.dev

---

Built with ❤️ using [Lovable](https://lovable.dev)
