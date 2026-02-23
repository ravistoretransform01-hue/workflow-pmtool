# Workload Components Refactoring Plan

## Goal
Prepare the codebase for Kanban view by extracting reusable logic, components, and utilities from WorkloadBoard and WorkloadColumns.

## Current State
- **WorkloadBoard.tsx**: 5317 lines - monolithic orchestrator
- **WorkloadColumns.tsx**: 1414 lines - column definitions with inline components
- **Issue**: Tightly coupled logic, difficult to reuse across views

## Refactoring Strategy

### Phase 1: Extract Custom Hooks (Highest Priority)
These hooks will be reusable across all views (Table, Kanban, Calendar, etc.)

1. **useTaskState.ts** - Task UI state management
   - expandedTasks, checkedTasks, editingTask, inlineEditingTaskId
   - Provides: toggleTask, setEditingTask, setInlineEditing, etc.

2. **useTaskTimer.ts** - Timer logic
   - activeTimerId, timerUpdateTrigger
   - Provides: startTimer, stopTimer, getFormattedTime, etc.

3. **useColumnPersistence.ts** - Column management
   - visibleColumns, viewTabs, column labels
   - Provides: toggleColumnVisibility, reorderTabs, updateColumnLabel, etc.

4. **useTaskFilters.ts** - Filter management
   - taskFilters state (persons, statuses, priorities, labels, groups)
   - Provides: addFilter, removeFilter, clearFilters, getFilteredTasks, etc.

5. **useCMSData.ts** - CMS data fetching and caching
   - statuses, priorities, members, labels, tags
   - Provides: fetchCMSData, createStatus, updatePriority, etc.

6. **usePopoverState.ts** - Popover management
   - openPopoverId state
   - Provides: openPopover, closePopover, togglePopover

### Phase 2: Extract Inline Components from WorkloadColumns
Move these to separate files for reusability and testability

1. **PersonPopover.tsx** - Person/assignee selection
2. **RatingStars.tsx** - Rating component
3. **EstimatedDatePicker.tsx** - Date range picker
4. **EstimatedTimePicker.tsx** - Time estimation picker

### Phase 3: Extract Shared Utilities
Create a utilities module for pure functions

1. **workload-utils.ts**
   - stringToHslColor()
   - formatDateRange()
   - formatSecondsToTime()
   - calculateGroupProgress()
   - parseEstimatedTime()
   - extractRating()

### Phase 4: Refactor WorkloadColumns
After extracting components, refactor to use them

1. Import extracted components
2. Simplify getWorkloadColumns() function
3. Remove inline component definitions

### Phase 5: Refactor WorkloadBoard
Split into smaller, focused components

1. **GroupList.tsx** - Renders groups and tasks
2. **FilterBar.tsx** - Filter UI
3. **ColumnHeader.tsx** - Column header with drag-and-drop
4. **TaskTable.tsx** - Main table rendering

### Phase 6: Create Shared Types
Centralize type definitions

1. **workload-types.ts**
   - Task, TaskGroup, Column interfaces
   - Props interfaces for components

## Implementation Order

1. ✅ Create workload-utils.ts (pure functions)
2. ✅ Create workload-types.ts (shared types)
3. ✅ Create hooks (useTaskState, useTaskTimer, etc.)
4. ✅ Extract inline components (PersonPopover, RatingStars, etc.)
5. ✅ Refactor WorkloadColumns to use extracted components
6. ✅ Refactor WorkloadBoard to use hooks
7. ✅ Create smaller components (GroupList, FilterBar, etc.)

## Benefits

- **Reusability**: 80% of logic can be reused in Kanban view
- **Maintainability**: Smaller, focused components
- **Testability**: Pure functions and hooks are easier to test
- **Scalability**: Easy to add new views (Calendar, Gantt, etc.)
- **Separation of Concerns**: UI, logic, and utilities are separated

## Timeline

- Phase 1-3: 2-3 hours (utilities and hooks)
- Phase 4-5: 2-3 hours (component refactoring)
- Phase 6: 1 hour (type definitions)
- **Total**: ~6 hours

## Notes

- No breaking changes to existing functionality
- All tests should pass after refactoring
- Kanban view will reuse extracted hooks and components
