# Phase 2: Refactor WorkloadBoard & Implement Kanban View

## Overview
Phase 2 focuses on refactoring the monolithic WorkloadBoard component and implementing the Kanban view using the extracted hooks and components from Phase 1.

## Phase 2 Goals

1. ✅ Refactor WorkloadBoard.tsx to use extracted hooks
2. ✅ Split WorkloadBoard into smaller, focused components
3. ✅ Implement Kanban view with card-based layout
4. ✅ Ensure all existing functionality works in both views
5. ✅ Add unit tests for new components

## Current State

**WorkloadBoard.tsx**: 5317 lines
- 50+ state variables
- Complex group/task management logic
- API orchestration for multiple endpoints
- Column persistence logic mixed with UI
- Drag-and-drop implementation
- All concerns mixed together

## Phase 2 Tasks

### Task 1: Refactor WorkloadBoard to Use Hooks
**Estimated Time**: 2-3 hours

#### 1.1 Replace Local State with Hooks
```typescript
// Before
const [expandedTasks, setExpandedTasks] = useState({});
const [checkedTasks, setCheckedTasks] = useState({});
const [editingTask, setEditingTask] = useState(null);
const [inlineEditingTaskId, setInlineEditingTaskId] = useState(null);

// After
const taskState = useTaskState();
// Access: taskState.expandedTasks, taskState.toggleTask(), etc.
```

#### 1.2 Replace Popover State with Hook
```typescript
// Before
const [openPopoverId, setOpenPopoverId] = useState(null);

// After
const popoverState = usePopoverState();
// Access: popoverState.openPopoverId, popoverState.openPopover(), etc.
```

#### 1.3 Replace Timer State with Hook
```typescript
// Before
const [activeTimerId, setActiveTimerId] = useState(null);
const [timerUpdateTrigger, setTimerUpdateTrigger] = useState(0);

// After
const timerState = useTaskTimer();
// Access: timerState.activeTimerId, timerState.startTimer(), etc.
```

#### 1.4 Replace Column State with Hook
```typescript
// Before
const [visibleColumns, setVisibleColumns] = useState({...});
const [viewTabs, setViewTabs] = useState([...]);

// After
const columnState = useColumnPersistence(boardId);
// Access: columnState.visibleColumns, columnState.toggleColumnVisibility(), etc.
```

#### 1.5 Replace Filter State with Hook
```typescript
// Before
const [taskFilters, setTaskFilters] = useState({...});
const [showDoneItemsOnly, setShowDoneItemsOnly] = useState(false);

// After
const filterState = useTaskFilters();
// Access: filterState.taskFilters, filterState.addFilter(), etc.
```

**Deliverable**: WorkloadBoard.tsx using all 5 hooks, reduced to ~2000 lines

### Task 2: Split WorkloadBoard into Smaller Components
**Estimated Time**: 2-3 hours

#### 2.1 Create GroupList Component
**File**: `src/shared/components/workload/components/GroupList.tsx`

Responsibilities:
- Render groups and their tasks
- Handle group expansion/collapse
- Handle task expansion/collapse
- Render task rows with all columns

Props:
```typescript
interface GroupListProps {
  groups: TaskGroup[];
  expandedGroups: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  onGroupToggle: (groupId: string) => void;
  onTaskToggle: (taskId: string) => void;
  // ... other props
}
```

#### 2.2 Create FilterBar Component
**File**: `src/shared/components/workload/components/FilterBar.tsx`

Responsibilities:
- Render filter UI
- Handle filter changes
- Show active filters
- Clear filters

Props:
```typescript
interface FilterBarProps {
  taskFilters: TaskFilters;
  onFilterChange: (filterType: string, value: string) => void;
  onClearFilters: () => void;
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  // ... other props
}
```

#### 2.3 Create ColumnHeader Component
**File**: `src/shared/components/workload/components/ColumnHeader.tsx`

Responsibilities:
- Render column headers
- Handle column drag-and-drop
- Handle column resizing
- Handle column visibility toggle
- Handle column label editing

Props:
```typescript
interface ColumnHeaderProps {
  columns: Column[];
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (columnId: string) => void;
  onColumnReorder: (columns: Column[]) => void;
  onColumnResize: (columnId: string, newWidth: string) => void;
  onColumnLabelChange: (columnId: string, newLabel: string) => void;
}
```

#### 2.4 Create TaskTable Component
**File**: `src/shared/components/workload/components/TaskTable.tsx`

Responsibilities:
- Render main table
- Render column headers
- Render task rows
- Handle scrolling
- Handle drag-and-drop

Props:
```typescript
interface TaskTableProps {
  groups: TaskGroup[];
  columns: Column[];
  visibleColumns: Record<string, boolean>;
  expandedGroups: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  // ... other props
}
```

**Deliverable**: 4 new components, WorkloadBoard simplified to orchestrator

### Task 3: Implement Kanban View
**Estimated Time**: 3-4 hours

#### 3.1 Create KanbanView Component
**File**: `src/pages/boards/KanbanView.tsx`

Structure:
```typescript
function KanbanView({ boardId, boardName, workspaceId, workspaceName }) {
  // Initialize hooks
  const taskState = useTaskState();
  const popoverState = usePopoverState();
  const timerState = useTaskTimer();
  const columnState = useColumnPersistence(boardId);
  const filterState = useTaskFilters();

  // Fetch data
  const [groups, setGroups] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [members, setMembers] = useState([]);

  // Render Kanban board
  return (
    <div className="kanban-board">
      {statuses.map(status => (
        <KanbanColumn
          key={status.id}
          status={status}
          tasks={getTasksByStatus(status.id)}
          // ... other props
        />
      ))}
    </div>
  );
}
```

#### 3.2 Create KanbanColumn Component
**File**: `src/shared/components/workload/components/KanbanColumn.tsx`

Responsibilities:
- Render column for a status
- Render cards for tasks
- Handle drag-and-drop between columns
- Show task count

Props:
```typescript
interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  onTaskMove: (taskId: string, newStatusId: string) => void;
  // ... other props
}
```

#### 3.3 Create KanbanCard Component
**File**: `src/shared/components/workload/components/KanbanCard.tsx`

Responsibilities:
- Render task card
- Show task name, priority, assignee, due date
- Handle click to open task details
- Handle drag-and-drop

Props:
```typescript
interface KanbanCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, newStatusId: string) => void;
  // ... other props
}
```

#### 3.4 Create KanbanCardDialog Component
**File**: `src/shared/components/workload/components/KanbanCardDialog.tsx`

Responsibilities:
- Show task details in modal
- Allow inline editing
- Show comments
- Show time tracking

Props:
```typescript
interface KanbanCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  // ... other props
}
```

**Deliverable**: Fully functional Kanban view with drag-and-drop

### Task 4: Add Unit Tests
**Estimated Time**: 2-3 hours

#### 4.1 Test Hooks
- `useTaskState.test.ts`
- `usePopoverState.test.ts`
- `useTaskTimer.test.ts`
- `useColumnPersistence.test.ts`
- `useTaskFilters.test.ts`

#### 4.2 Test Utilities
- `workload-utils.test.ts`

#### 4.3 Test Components
- `GroupList.test.tsx`
- `FilterBar.test.tsx`
- `ColumnHeader.test.tsx`
- `TaskTable.test.tsx`
- `KanbanColumn.test.tsx`
- `KanbanCard.test.tsx`

**Deliverable**: Comprehensive test coverage

### Task 5: Integration Testing
**Estimated Time**: 1-2 hours

#### 5.1 Test WorkloadBoard
- Verify all functionality works with hooks
- Verify state persistence
- Verify API calls

#### 5.2 Test Kanban View
- Verify drag-and-drop works
- Verify task updates
- Verify filters work

#### 5.3 Test Both Views
- Verify switching between views works
- Verify data consistency
- Verify no breaking changes

**Deliverable**: All integration tests passing

## File Structure After Phase 2

```
src/shared/components/workload/
├── utils/
│   ├── workload-utils.ts
│   ├── workload-types.ts
│   └── index.ts
├── hooks/
│   ├── useTaskState.ts
│   ├── usePopoverState.ts
│   ├── useTaskTimer.ts
│   ├── useColumnPersistence.ts
│   ├── useTaskFilters.ts
│   └── index.ts
├── cells/
│   ├── PersonPopover.tsx
│   ├── RatingStars.tsx
│   ├── EstimatedDatePicker.tsx
│   ├── EstimatedTimePicker.tsx
│   └── index.ts
├── components/
│   ├── GroupList.tsx
│   ├── FilterBar.tsx
│   ├── ColumnHeader.tsx
│   ├── TaskTable.tsx
│   ├── KanbanColumn.tsx
│   ├── KanbanCard.tsx
│   ├── KanbanCardDialog.tsx
│   └── index.ts
├── WorkloadBoard.tsx (refactored)
├── WorkloadColumns.tsx (refactored)
└── index.ts

src/pages/boards/
├── WorkloadBoardPage.tsx (existing)
└── KanbanView.tsx (new)
```

## Implementation Checklist

### Refactor WorkloadBoard
- [ ] Replace expandedTasks state with useTaskState
- [ ] Replace checkedTasks state with useTaskState
- [ ] Replace editingTask state with useTaskState
- [ ] Replace inlineEditingTaskId state with useTaskState
- [ ] Replace openPopoverId state with usePopoverState
- [ ] Replace activeTimerId state with useTaskTimer
- [ ] Replace timerUpdateTrigger state with useTaskTimer
- [ ] Replace visibleColumns state with useColumnPersistence
- [ ] Replace viewTabs state with useColumnPersistence
- [ ] Replace taskFilters state with useTaskFilters
- [ ] Replace showDoneItemsOnly state with useTaskFilters
- [ ] Test all functionality still works

### Split Components
- [ ] Create GroupList component
- [ ] Create FilterBar component
- [ ] Create ColumnHeader component
- [ ] Create TaskTable component
- [ ] Update WorkloadBoard to use new components
- [ ] Test all components work together

### Implement Kanban View
- [ ] Create KanbanView page component
- [ ] Create KanbanColumn component
- [ ] Create KanbanCard component
- [ ] Create KanbanCardDialog component
- [ ] Implement drag-and-drop
- [ ] Implement task updates
- [ ] Implement filters
- [ ] Test all functionality

### Add Tests
- [ ] Write hook tests
- [ ] Write utility tests
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Achieve 80%+ code coverage

## Success Criteria

✅ WorkloadBoard refactored to use all 5 hooks
✅ WorkloadBoard split into 4 smaller components
✅ Kanban view fully functional with drag-and-drop
✅ All existing functionality preserved
✅ No breaking changes
✅ 80%+ test coverage
✅ Zero TypeScript errors
✅ Performance maintained or improved

## Timeline

| Task | Estimated Time | Status |
|------|---|---|
| Refactor WorkloadBoard | 2-3 hours | ⏳ Not Started |
| Split Components | 2-3 hours | ⏳ Not Started |
| Implement Kanban View | 3-4 hours | ⏳ Not Started |
| Add Unit Tests | 2-3 hours | ⏳ Not Started |
| Integration Testing | 1-2 hours | ⏳ Not Started |
| **Total** | **10-15 hours** | ⏳ Not Started |

## Dependencies

- Phase 1 must be complete ✅
- All hooks must be working ✅
- All extracted components must be working ✅
- All utilities must be working ✅

## Risks & Mitigations

| Risk | Mitigation |
|------|---|
| Breaking existing functionality | Comprehensive testing, feature parity checks |
| Performance degradation | Performance profiling, optimization if needed |
| Complex drag-and-drop | Use proven library (dnd-kit already in use) |
| State management complexity | Use hooks to simplify state |
| Large component files | Split into smaller components |

## Next Steps After Phase 2

- Phase 3: Implement Calendar view
- Phase 4: Implement Gantt view
- Phase 5: Implement Timeline view
- Phase 6: Performance optimization and polish

## Notes

- All Phase 1 work is complete and ready to use
- Kanban view will reuse 80% of existing logic
- No new dependencies needed
- Existing drag-and-drop library (dnd-kit) can be reused
- All extracted components are production-ready

---

**Phase 2 Status**: Ready to Start
**Estimated Duration**: 10-15 hours
**Complexity**: Medium
**Risk Level**: Low (Phase 1 provides solid foundation)
