# Workload Components - Quick Reference Guide

## Import Paths

### Hooks
```typescript
import {
  useTaskState,
  usePopoverState,
  useTaskTimer,
  useColumnPersistence,
  useTaskFilters,
} from '@/shared/components/workload/hooks';
```

### Cell Components
```typescript
import {
  PersonPopover,
  RatingStars,
  EstimatedDatePicker,
  EstimatedTimePicker,
} from '@/shared/components/workload/cells';
```

### Utilities & Types
```typescript
import {
  stringToHslColor,
  formatDateRange,
  formatSecondsToTime,
  calculateGroupProgress,
  parseEstimatedTime,
  extractRating,
  formatTimeDisplay,
  renderFormattedContent,
  type Task,
  type TaskGroup,
  type Column,
  type TaskFilters,
} from '@/shared/components/workload/utils';
```

## Common Usage Patterns

### Using useTaskState Hook
```typescript
const taskState = useTaskState();

// Access state
taskState.expandedTasks;
taskState.checkedTasks;
taskState.editingTask;
taskState.inlineEditingTaskId;

// Use methods
taskState.toggleTask(taskId);
taskState.expandTask(taskId);
taskState.startInlineEdit(taskId, taskName);
taskState.checkTask(taskId);
```

### Using usePopoverState Hook
```typescript
const popoverState = usePopoverState();

// Access state
popoverState.openPopoverId;

// Use methods
popoverState.openPopover('status-123');
popoverState.closePopover();
popoverState.togglePopover('priority-456');
popoverState.isPopoverOpen('rating-789');
```

### Using useTaskTimer Hook
```typescript
const timerState = useTaskTimer();

// Access state
timerState.activeTimerId;
timerState.timerUpdateTrigger;

// Use methods
timerState.startTimer(taskId);
timerState.stopTimer();
timerState.switchTimer(newTaskId);
timerState.isTimerRunning(taskId);
timerState.triggerTimerUpdate();
```

### Using useColumnPersistence Hook
```typescript
const columnState = useColumnPersistence(boardId);

// Access state
columnState.visibleColumns;
columnState.viewTabs;
columnState.columnLabels;

// Use methods
columnState.toggleColumnVisibility('status');
columnState.showColumn('priority');
columnState.hideColumn('tags');
columnState.isColumnVisible('timer');
columnState.reorderTabs(newTabOrder);
columnState.updateColumnLabel('status', 'Task Status');
columnState.getColumnLabel('status', 'Status');
```

### Using useTaskFilters Hook
```typescript
const filterState = useTaskFilters();

// Access state
filterState.taskFilters;
filterState.showDoneItemsOnly;
filterState.openFilterDropdowns;

// Use methods
filterState.addFilter('statuses', 'done');
filterState.removeFilter('statuses', 'done');
filterState.toggleFilter('persons', 'user-123');
filterState.clearFilters();
filterState.clearFilterType('statuses');
filterState.hasActiveFilters();
filterState.toggleFilterDropdown('statuses');
```

### Using PersonPopover Component
```typescript
<PersonPopover
  task={task}
  members={members}
  selectedMemberIds={task.assigned_to_ids}
  popoverId={`person-${task.id}`}
  openPopoverId={popoverState.openPopoverId}
  setOpenPopoverId={popoverState.setOpenPopoverId}
  onPersonChange={(taskId, memberIds) => {
    // Handle person change
  }}
/>
```

### Using RatingStars Component
```typescript
<RatingStars
  task={task}
  rating={task.rating || 0}
  ratingCount={task.ratingCount}
  popoverId={`rating-${task.id}`}
  openPopoverId={popoverState.openPopoverId}
  setOpenPopoverId={popoverState.setOpenPopoverId}
  onRatingChange={(taskId, rating) => {
    // Handle rating change
  }}
  hasAssignee={task.assigned_to_ids?.length > 0}
  isDone={task.status === 'Done'}
/>
```

### Using EstimatedDatePicker Component
```typescript
<EstimatedDatePicker
  task={task}
  estimatedDate={task.estimatedDate || '-'}
  estimatedDateEnd={null}
  popoverId={`estimatedDate-${task.id}`}
  openPopoverId={popoverState.openPopoverId}
  setOpenPopoverId={popoverState.setOpenPopoverId}
  onEstimatedDateChange={(taskId, fromDate, toDate) => {
    // Handle date change
  }}
/>
```

### Using EstimatedTimePicker Component
```typescript
<EstimatedTimePicker
  task={task}
  estimatedHours={task.estimatedHours || '-'}
  hasEstimatedDate={task.estimatedDate && task.estimatedDate !== '-'}
  popoverId={`estimatedTime-${task.id}`}
  openPopoverId={popoverState.openPopoverId}
  setOpenPopoverId={popoverState.setOpenPopoverId}
  onEstimatedTimeChange={(taskId, hours) => {
    // Handle time change
  }}
/>
```

## Utility Functions

### stringToHslColor
```typescript
const color = stringToHslColor('John Doe');
// Returns: "hsl(45 70% 55%)"
```

### formatDateRange
```typescript
const range = formatDateRange('2026-01-15', '2026-01-19');
// Returns: "Jan 15 - 19"

const range2 = formatDateRange('2025-12-31', '2026-01-08');
// Returns: "Dec 31, '25 – Jan 8, '26"
```

### formatSecondsToTime
```typescript
const time = formatSecondsToTime(9000);
// Returns: "2h 30m"

const time2 = formatSecondsToTime(1800);
// Returns: "30m"
```

### calculateGroupProgress
```typescript
const progress = calculateGroupProgress(tasks);
// Returns: { timeSpentSeconds: 3600, estimatedTimeSeconds: 7200, percentage: 50 }
```

### parseEstimatedTime
```typescript
const parsed = parseEstimatedTime('02h 30m');
// Returns: { hours: '02', minutes: '30' }

const parsed2 = parseEstimatedTime('2.5');
// Returns: { hours: '2', minutes: '30' }
```

### extractRating
```typescript
const rating = extractRating(task);
// Returns: 4 (or undefined if no rating)
```

### formatTimeDisplay
```typescript
const display = formatTimeDisplay(9045);
// Returns: "2h 30m"
```

### renderFormattedContent
```typescript
const html = renderFormattedContent('**Bold** and _italic_ text');
// Returns: { __html: '<strong>Bold</strong> and <em>italic</em> text' }
```

## Type Definitions

### Task
```typescript
interface Task {
  id: string;
  name: string;
  description?: string;
  status?: string;
  status_id?: string;
  priority?: string;
  priority_id?: string;
  estimatedDate?: string;
  estimatedHours?: string | number;
  person?: string;
  assigned_to_id?: string | number;
  assigned_to_ids?: string[];
  timeSpent?: string;
  tracked_time_seconds?: number;
  rating?: number;
  ratingCount?: number;
  ratings?: Array<{...}>;
  label_id?: string;
  group_id?: string;
  tags?: Array<{...}>;
  subitems?: Task[];
}
```

### Column
```typescript
interface Column {
  id: string;
  label: string;
  width: string;
  align: 'left' | 'center';
  fixed?: boolean;
  collapsed?: boolean;
  render: (task: Task, isSubitem?: boolean) => React.ReactNode;
}
```

### TaskFilters
```typescript
interface TaskFilters {
  persons: Set<string>;
  statuses: Set<string>;
  priorities: Set<string>;
  labels: Set<string>;
  groups: Set<string>;
}
```

## Common Patterns

### Complete View Setup
```typescript
import { useTaskState, usePopoverState, useTaskTimer, useColumnPersistence, useTaskFilters } from '@/shared/components/workload/hooks';
import { PersonPopover, RatingStars, EstimatedDatePicker, EstimatedTimePicker } from '@/shared/components/workload/cells';
import { formatDateRange, formatSecondsToTime } from '@/shared/components/workload/utils';

function MyView({ boardId, tasks }) {
  const taskState = useTaskState();
  const popoverState = usePopoverState();
  const timerState = useTaskTimer();
  const columnState = useColumnPersistence(boardId);
  const filterState = useTaskFilters();

  return (
    <div>
      {/* Your view implementation */}
    </div>
  );
}
```

### Handling Task Updates
```typescript
const handleStatusChange = async (taskId, statusId) => {
  try {
    await tasksApi.updateTaskStatus(taskId, statusId);
    // State updates automatically
  } catch (error) {
    toast.error('Failed to update status');
  }
};
```

### Formatting Display Values
```typescript
const displayDate = formatDateRange(task.estimatedDate);
const displayTime = formatSecondsToTime(task.tracked_time_seconds);
const displayColor = stringToHslColor(task.person);
```

## Debugging Tips

### Check Hook State
```typescript
debugLog('Task State:', taskState);
debugLog('Popover State:', popoverState);
debugLog('Timer State:', timerState);
debugLog('Column State:', columnState);
debugLog('Filter State:', filterState);
```

### Verify localStorage
```typescript
// Check column visibility
debugLog(localStorage.getItem(`board-visible-columns-${boardId}`));

// Check tab order
debugLog(localStorage.getItem(`board-tabs-${boardId}`));
```

### Test Utility Functions
```typescript
// Test color generation
debugLog(stringToHslColor('Test'));

// Test date formatting
debugLog(formatDateRange('2026-01-15', '2026-01-19'));

// Test time formatting
debugLog(formatSecondsToTime(9000));
```

## Performance Tips

1. **Use useCallback** - Memoize callbacks to prevent unnecessary re-renders
2. **Use React.memo** - Memoize components that receive many props
3. **Avoid inline functions** - Define functions outside render
4. **Use key prop** - Always provide unique keys in lists
5. **Lazy load** - Consider code splitting for large views

## Common Issues & Solutions

### Issue: Popover not closing
**Solution**: Ensure `setOpenPopoverId` is called with `null`

### Issue: Timer not updating
**Solution**: Call `triggerTimerUpdate()` to force re-render

### Issue: Column visibility not persisting
**Solution**: Check localStorage is enabled and not full

### Issue: Filters not working
**Solution**: Verify filter state is being passed to filter logic

### Issue: Type errors with Task
**Solution**: Use optional chaining (`task.status_id?.`) for optional fields

## Resources

- **Architecture Overview**: See `ARCHITECTURE_OVERVIEW.md`
- **Refactoring Summary**: See `REFACTORING_SUMMARY.md`
- **Refactoring Plan**: See `REFACTORING_PLAN.md`
- **Source Code**: `src/shared/components/workload/`
