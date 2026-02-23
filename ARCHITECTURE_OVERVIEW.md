# Workload Components Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Workload Views Layer                         │
│  (WorkloadBoard, KanbanView, CalendarView, GanttView, etc.)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Hooks      │  │  Components  │  │  Utilities   │
│   Layer      │  │   Layer      │  │   Layer      │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        ├─ useTaskState  ├─ Cells         ├─ workload-utils
        ├─ usePopover    ├─ Dialogs       ├─ workload-types
        ├─ useTimer      ├─ Sheets        │
        ├─ useColumns    └─ Tables        │
        └─ useFilters                     │
                         │                │
                         └────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   API Layer          │
                    │  (tasksApi, cmsApi)  │
                    └──────────────────────┘
```

## Layer Descriptions

### 1. Hooks Layer (State Management)
**Purpose**: Centralized state management for all views

```
useTaskState()
├── expandedTasks
├── checkedTasks
├── editingTask
├── inlineEditingTaskId
└── Methods: toggleTask, expandTask, startInlineEdit, etc.

usePopoverState()
├── openPopoverId
└── Methods: openPopover, closePopover, togglePopover

useTaskTimer()
├── activeTimerId
├── timerUpdateTrigger
└── Methods: startTimer, stopTimer, switchTimer

useColumnPersistence(boardId)
├── visibleColumns
├── viewTabs
├── columnLabels
└── Methods: toggleColumnVisibility, reorderTabs, updateColumnLabel

useTaskFilters()
├── taskFilters (persons, statuses, priorities, labels, groups)
├── showDoneItemsOnly
└── Methods: addFilter, removeFilter, toggleFilter, clearFilters
```

### 2. Components Layer (UI)

#### Cell Components (`cells/`)
- **PersonPopover.tsx** - Assignee selection with search
- **RatingStars.tsx** - 1-5 star rating component
- **EstimatedDatePicker.tsx** - Date range picker
- **EstimatedTimePicker.tsx** - Time estimation input

#### Existing Components
- **StatusPopoverCell.tsx** - Status selection
- **PriorityPopoverCell.tsx** - Priority selection
- **TimerCell.tsx** - Timer control
- **ProgressBarCell.tsx** - Progress visualization
- **TagsColumnCell.tsx** - Tag management
- **TaskCardDialog.tsx** - Full task details modal
- **CommentsPanelSheet.tsx** - Comments/updates panel
- **TimeTrackingLogDialog.tsx** - Time entry log

### 3. Utilities Layer (Pure Functions)

#### workload-utils.ts
```typescript
// Color generation
stringToHslColor(str, s, l) → string

// Date formatting
formatDateRange(fromDate, toDate) → string

// Time formatting
formatSecondsToTime(seconds) → string
formatTimeDisplay(totalSeconds) → string

// Calculations
calculateGroupProgress(tasks) → { timeSpentSeconds, estimatedTimeSeconds, percentage }

// Parsing
parseEstimatedTime(value) → { hours, minutes }
extractRating(taskData) → number | undefined

// Content rendering
renderFormattedContent(content) → { __html: string }
```

#### workload-types.ts
```typescript
// Core types
Task
TaskGroup
Column
TaskFilters
PopoverState
TaskState
TimerState
ColumnPersistenceState
CMSDataState
PopoverCellProps
SelectionCellProps
```

## Data Flow

### Example: Updating Task Status

```
User clicks Status cell
        │
        ▼
StatusPopoverCell renders
        │
        ▼
User selects new status
        │
        ▼
onStatusChange callback fires
        │
        ▼
WorkloadBoard.onStatusChange()
        │
        ▼
tasksApi.updateTaskStatus()
        │
        ▼
API updates database
        │
        ▼
Component state updates
        │
        ▼
UI re-renders with new status
```

### Example: Using Hooks in a View

```typescript
// In KanbanView component
function KanbanView({ boardId }) {
  // Initialize hooks
  const taskState = useTaskState();
  const popoverState = usePopoverState();
  const timerState = useTaskTimer();
  const columnState = useColumnPersistence(boardId);
  const filterState = useTaskFilters();

  // Use hook state and methods
  const handleTaskClick = (taskId) => {
    taskState.toggleTask(taskId);
  };

  const handleStatusChange = async (taskId, statusId) => {
    await tasksApi.updateTaskStatus(taskId, statusId);
    // UI updates automatically
  };

  // Render with extracted components
  return (
    <div>
      {tasks.map(task => (
        <KanbanCard
          key={task.id}
          task={task}
          onStatusChange={handleStatusChange}
          // Pass popover state
          openPopoverId={popoverState.openPopoverId}
          setOpenPopoverId={popoverState.setOpenPopoverId}
        />
      ))}
    </div>
  );
}
```

## Reusability Matrix

| Component/Hook | Table | Kanban | Calendar | Gantt | Timeline |
|---|---|---|---|---|---|
| useTaskState | ✅ | ✅ | ✅ | ✅ | ✅ |
| usePopoverState | ✅ | ✅ | ✅ | ✅ | ✅ |
| useTaskTimer | ✅ | ✅ | ✅ | ✅ | ✅ |
| useColumnPersistence | ✅ | ✅ | ✅ | ✅ | ✅ |
| useTaskFilters | ✅ | ✅ | ✅ | ✅ | ✅ |
| PersonPopover | ✅ | ✅ | ✅ | ✅ | ✅ |
| RatingStars | ✅ | ✅ | ✅ | ✅ | ✅ |
| EstimatedDatePicker | ✅ | ✅ | ✅ | ✅ | ✅ |
| EstimatedTimePicker | ✅ | ✅ | ✅ | ✅ | ✅ |
| Utility Functions | ✅ | ✅ | ✅ | ✅ | ✅ |

## Performance Considerations

### Memoization
- All hook methods use `useCallback` to prevent unnecessary re-renders
- Components use `React.memo` where appropriate

### State Management
- Hooks use local state (useState) for simplicity
- No global state management needed (yet)
- Can be upgraded to Redux/Zustand if needed

### localStorage
- Column visibility persisted automatically
- Tab order persisted automatically
- No additional API calls for persistence

### Rendering
- Cell components only re-render when their props change
- Popover state is centralized to prevent multiple popovers opening
- Timer updates use a trigger mechanism to avoid constant re-renders

## Extension Points

### Adding a New View
1. Import hooks: `useTaskState`, `usePopoverState`, `useTaskTimer`, etc.
2. Import components: `PersonPopover`, `RatingStars`, etc.
3. Import utilities: `formatDateRange`, `formatSecondsToTime`, etc.
4. Implement view-specific layout
5. Use hooks for state management
6. Use components for UI elements

### Adding a New Cell Type
1. Create component in `cells/` directory
2. Export from `cells/index.ts`
3. Add to `getWorkloadColumns()` in WorkloadColumns.tsx
4. Use existing hooks and utilities as needed

### Adding a New Utility Function
1. Add to `utils/workload-utils.ts`
2. Export from `utils/index.ts`
3. Use in components or hooks

## Testing Strategy

### Unit Tests
- Test each hook independently
- Test utility functions with various inputs
- Test cell components in isolation

### Integration Tests
- Test WorkloadColumns with all cell components
- Test hooks working together
- Test state persistence

### E2E Tests
- Test complete user workflows
- Test across different views
- Test data consistency

## Future Improvements

1. **Global State Management**
   - Consider Redux/Zustand for complex state
   - Centralize CMS data fetching

2. **Component Library**
   - Extract common patterns into reusable components
   - Create component documentation

3. **Performance Optimization**
   - Implement virtual scrolling for large task lists
   - Add pagination for better performance

4. **Accessibility**
   - Add ARIA labels to all components
   - Ensure keyboard navigation works
   - Test with screen readers

5. **Internationalization**
   - Extract strings to i18n
   - Support multiple languages

## Conclusion

The refactored architecture provides a solid foundation for building multiple views while maintaining code reusability, testability, and maintainability. The separation of concerns between hooks (state), components (UI), and utilities (logic) makes it easy to understand and extend the codebase.
