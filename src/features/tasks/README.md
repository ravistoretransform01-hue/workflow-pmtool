# Tasks API Feature

This feature provides API integration for managing tasks and subtasks in the workload board.

## API Endpoints

### Create Task
- **Method**: POST
- **URL**: `/wp-json/wp-platform/v1/tasks`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "group_id": 27,
  "organization_id": 2,
  "workspace_id": 1,
  "name": "Task Name",
  "description": "Task description",
  "status_id": 1,
  "task_priority_id": 2,
  "due_date": "2025-12-31",
  "estimated_date_from": "2025-12-27 10:00:00",
  "estimated_date_to": "2025-12-27 14:00:00",
  "assigned_to": 1,
  "is_private": 0,
  "parent_id": null,
  "board_id": 35
}
```

### Get Tasks
- **Method**: GET
- **URL**: `/wp-json/wp-platform/v1/tasks?board_id=36`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `board_id` (optional): Filter by board ID
  - `group_id` (optional): Filter by group ID
  - `parent_id` (optional): Filter by parent task ID

### Update Task
- **Method**: PUT
- **URL**: `/wp-json/wp-platform/v1/tasks`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "id": "37",
  "name": "Updated Task Name",
  "description": "Updated description",
  "status_id": 2,
  "task_priority_id": 1
}
```

### Delete Task
- **Method**: DELETE
- **URL**: `/wp-json/wp-platform/v1/tasks`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
```json
{
  "id": "18"
}
```

## Usage

### Import the API
```typescript
import { tasksApi } from "@/features/tasks/api/tasksApi";
```

### Create a Task
```typescript
const newTask = await tasksApi.createTask({
  group_id: 27,
  organization_id: 2,
  workspace_id: 1,
  name: "New Task",
  description: "Task description",
  status_id: 1,
  task_priority_id: 2,
  assigned_to: 1,
});
```

### Get Tasks
```typescript
const tasks = await tasksApi.getTasks({
  board_id: 36,
});
```

### Update a Task
```typescript
const updatedTask = await tasksApi.updateTask({
  id: "37",
  name: "Updated Task Name",
  status_id: 2,
});
```

### Delete a Task
```typescript
await tasksApi.deleteTask("18");
```

## Types

### Task
Main task object returned from the API with all task details including creator, assignee, and status information.

### CreateTaskRequest
Request payload for creating a new task. Required fields: `group_id`, `organization_id`, `workspace_id`, `name`.

### UpdateTaskRequest
Request payload for updating a task. Required field: `id`. Other fields are optional.

### DeleteTaskRequest
Request payload for deleting a task. Required field: `id`.

### GetTasksRequest
Query parameters for fetching tasks. All fields are optional.
