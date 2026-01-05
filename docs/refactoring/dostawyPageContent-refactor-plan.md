# DostawyPageContent Component Refactoring Plan

## Executive Summary

The `DostawyPageContent.tsx` file is the largest frontend component in the codebase at **1937 lines**. It's a monolithic React component handling deliveries calendar, drag-and-drop, multiple dialogs, state management, and complex UI logic. This plan proposes splitting it into smaller, focused components and custom hooks following React best practices and the frontend architecture guidelines.

**Priority**: HIGH - This component is critical for UX and is extremely difficult to maintain.

**Estimated Effort**: 5-7 days for full refactoring with tests.

---

## Current State Analysis

### Lines of Code
- **Total**: 1937 lines (including JSX)
- **Component logic**: ~500 lines
- **JSX rendering**: ~1400 lines
- **State management**: ~200 lines
- **Event handlers**: ~300 lines

### Main Responsibilities

1. **View Mode Management** (5% of code)
   - Calendar vs List view toggle
   - Week/Month/8weeks view modes
   - Week offset navigation

2. **Data Fetching** (10% of code)
   - Batch calendar query
   - Deliveries, working days, holidays
   - Unassigned orders

3. **State Management** (15% of code)
   - 20+ useState hooks
   - Selected delivery
   - Dialog visibility states
   - Drag-and-drop state
   - Multi-select orders

4. **Drag & Drop** (10% of code)
   - DndContext setup
   - Drag start/end handlers
   - Multi-select dragging
   - Order assignment logic

5. **Mutations** (15% of code)
   - Create/delete delivery
   - Add/remove orders
   - Move orders between deliveries
   - Complete orders
   - Manage delivery items

6. **Calendar Rendering** (20% of code)
   - Generate days grid
   - Render delivery cells
   - Show holidays/working days
   - Statistics per day/week

7. **Dialog Management** (10% of code)
   - 8+ different dialogs
   - Dialog state coordination
   - Form validation

8. **Event Handlers** (10% of code)
   - Day click
   - Right-click for working days
   - Delivery selection
   - Order selection

9. **Calculations & Helpers** (5% of code)
   - Day statistics
   - Week statistics
   - Holiday checks
   - Date ranges

### Component Structure

```tsx
DostawyPageContent (1937 lines)
  ├─ Header
  ├─ Breadcrumb
  ├─ View Mode Toggle
  │
  ├─ List View (DeliveriesListView)
  │
  ├─ Calendar View
  │   ├─ Navigation
  │   ├─ View Mode Buttons
  │   ├─ Calendar Grid
  │   │   ├─ Day Headers
  │   │   ├─ Day Cells (with DeliveryCards)
  │   │   └─ Week Summaries
  │   └─ Right Panel (Unassigned Orders)
  │
  └─ Dialogs (8+)
      ├─ New Delivery Dialog
      ├─ Delivery Details Dialog
      ├─ Delete Delivery Dialog
      ├─ Add Order Dialog
      ├─ Add Item Dialog
      ├─ Complete Orders Dialog
      ├─ Window Stats Dialog
      ├─ Bulk Update Dates Dialog
      └─ Order Detail Modal
```

### Dependencies

**External Libraries**:
- React (hooks, state)
- Next.js (router)
- TanStack Query (data fetching, mutations)
- dnd-kit (drag & drop)
- Shadcn/ui components

**Custom Components/Hooks**:
- `useFormValidation`
- `useDownloadDeliveryProtocol`
- DragDrop components
- DeliveriesListView
- OrderDetailModal
- Various dialogs

---

## Problems Identified

### 1. Monolithic Component (Critical)

**Issue**: Single component with 1937 lines
- Handles 9+ distinct responsibilities
- 20+ state variables
- 10+ complex event handlers
- 1400+ lines of JSX

**Impact**:
- Extremely hard to understand
- Impossible to test in isolation
- Performance issues (re-renders entire component)
- Merge conflicts frequent

### 2. Excessive State Management (Critical)

**Issue**: 20+ useState hooks in single component
```tsx
const [pageViewMode, setPageViewMode] = useState<PageViewMode>('calendar');
const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
const [weekOffset, setWeekOffset] = useState(0);
const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
const [showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false);
const [newDeliveryDate, setNewDeliveryDate] = useState('');
const [newDeliveryNotes, setNewDeliveryNotes] = useState('');
const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);
// ... 12+ more
```

**Impact**:
- Hard to track state dependencies
- Easy to introduce state bugs
- Performance issues from unnecessary re-renders

### 3. Complex Calculation Logic in Component (Major)

**Issue**: Date calculations and statistics directly in component
- `generateDays()` - 20 lines
- `getDeliveriesForDay()` - 10 lines
- `getDayStats()` - 15 lines
- `getWeekStats()` - 20 lines
- `getHolidayInfo()` - 25 lines

**Impact**:
- Cannot test calculations separately
- Hard to reuse logic
- Component re-runs all calculations on every render

### 4. Duplicate Rendering Logic (Major)

**Issue**: Calendar day rendering duplicated:
- Week view rendering (lines 996-1160)
- Month/8weeks view rendering (lines 1164-1285)
- ~200 lines of nearly identical JSX

**Impact**:
- Hard to maintain consistency
- Bug fixes need to be applied twice
- Visual inconsistencies

### 5. Large useMemo Dependencies (Medium)

**Issue**: Complex memos with multiple dependencies
```tsx
const { startOfWeek, endDate, totalDays } = useMemo(() => {
  // 60 lines of date calculation
}, [weekOffset, viewMode]);
```

**Impact**:
- Hard to understand what triggers recalculation
- Performance unpredictable
- Difficult to optimize

### 6. Inline Event Handlers (Medium)

**Issue**: Large anonymous functions in JSX
```tsx
onClick={() => {
  if (selectedDelivery && productionDate) {
    completeOrdersMutation.mutate({
      deliveryId: selectedDelivery.id,
      productionDate,
    });
  }
}}
```

**Impact**:
- Creates new function on every render
- Hard to test handlers
- Performance overhead

### 7. Dialog State Coordination (Medium)

**Issue**: 8+ dialogs with manual state management
- Each dialog has open/close state
- Form state for each dialog
- Validation state
- No clear coordination pattern

**Impact**:
- Easy to have multiple dialogs open
- Hard to reset state on close
- Memory leaks from uncleaned state

### 8. Drag & Drop Complexity (Medium)

**Issue**: Complex drag logic embedded in component
- Multi-select handling
- Three different drop scenarios
- Async mutation handling in drag handler

**Impact**:
- Hard to test drag scenarios
- Difficult to add new drag features
- State bugs common

---

## Proposed Structure

### Component Hierarchy

```
app/dostawy/
├── DostawyPageContent.tsx                  [Container - 200 lines]
│
├── components/
│   ├── DeliveryCalendar/
│   │   ├── DeliveryCalendar.tsx           [Calendar orchestrator - 150 lines]
│   │   ├── CalendarHeader.tsx             [Navigation + controls - 80 lines]
│   │   ├── CalendarGrid.tsx               [Grid layout - 100 lines]
│   │   ├── DayCell.tsx                    [Single day cell - 120 lines]
│   │   ├── DeliveryCard.tsx               [Delivery mini card - 50 lines]
│   │   ├── WeekSummary.tsx                [Week stats - 60 lines]
│   │   └── types.ts                       [Calendar types]
│   │
│   ├── UnassignedOrdersPanel/
│   │   ├── UnassignedOrdersPanel.tsx      [Right panel - 100 lines]
│   │   └── OrderCard.tsx                  [Draggable order - 60 lines]
│   │
│   ├── DeliveryDialogs/
│   │   ├── NewDeliveryDialog.tsx          [Create - 100 lines]
│   │   ├── DeliveryDetailsDialog.tsx      [Details - 150 lines]
│   │   ├── DeleteDeliveryDialog.tsx       [Confirm delete - 50 lines]
│   │   ├── AddItemDialog.tsx              [Add items - 80 lines]
│   │   └── CompleteOrdersDialog.tsx       [Complete - 70 lines]
│   │
│   └── DeliveriesListView.tsx             [Keep as-is]
│
└── hooks/
    ├── useDeliveryCalendar.ts             [Calendar state - 150 lines]
    ├── useDeliveryDragDrop.ts             [Drag & drop - 120 lines]
    ├── useDeliveryMutations.ts            [Mutations - 200 lines]
    ├── useCalendarData.ts                 [Data fetching - 100 lines]
    ├── useDateCalculations.ts             [Date helpers - 150 lines]
    ├── useDeliveryDialogs.ts              [Dialog state - 100 lines]
    └── useDeliveryStats.ts                [Statistics - 100 lines]
```

---

## Module Details

### 1. DostawyPageContent (Container)

**Responsibilities**:
- Route view mode (calendar vs list)
- Provide global context
- Coordinate hooks
- Render top-level layout

**Implementation**:
```tsx
export default function DostawyPageContent({ initialSelectedOrderId }: Props) {
  // Custom hooks
  const calendarState = useDeliveryCalendar();
  const calendarData = useCalendarData(calendarState);
  const mutations = useDeliveryMutations();
  const dragDrop = useDeliveryDragDrop(mutations);
  const dialogs = useDeliveryDialogs();
  const stats = useDeliveryStats(calendarData.deliveries);

  return (
    <DndContext {...dragDrop.dndConfig}>
      <div className="flex flex-col h-full">
        <Header title="Dostawy" />

        <Breadcrumb items={breadcrumbItems} />

        <ViewModeToggle
          mode={calendarState.pageViewMode}
          onChange={calendarState.setPageViewMode}
        />

        {calendarState.pageViewMode === 'list' ? (
          <DeliveriesListView />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <DeliveryCalendar
              state={calendarState}
              data={calendarData}
              stats={stats}
              mutations={mutations}
              dragDrop={dragDrop}
              dialogs={dialogs}
            />

            <UnassignedOrdersPanel
              orders={calendarData.unassignedOrders}
              dragDrop={dragDrop}
            />
          </div>
        )}

        {/* Dialogs */}
        <DeliveryDialogs dialogs={dialogs} mutations={mutations} />
      </div>
    </DndContext>
  );
}
```

**Estimated Lines**: ~200

---

### 2. DeliveryCalendar Component

**Responsibilities**:
- Calendar layout orchestration
- Render header, grid, summaries
- Handle calendar-level events

**Implementation**:
```tsx
interface DeliveryCalendarProps {
  state: CalendarState;
  data: CalendarData;
  stats: CalendarStats;
  mutations: DeliveryMutations;
  dragDrop: DragDropHandlers;
  dialogs: DialogsState;
}

export function DeliveryCalendar(props: DeliveryCalendarProps) {
  const { state, data, stats, mutations, dialogs } = props;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <Card>
        <CardHeader>
          <CalendarHeader
            state={state}
            onPrevious={() => state.setWeekOffset(state.weekOffset - 1)}
            onNext={() => state.setWeekOffset(state.weekOffset + 1)}
            onToday={() => state.setWeekOffset(0)}
            onNewDelivery={() => dialogs.openNewDelivery()}
          />
        </CardHeader>

        <CardContent>
          <CalendarGrid
            viewMode={state.viewMode}
            days={state.days}
            deliveries={data.deliveries}
            workingDays={data.workingDays}
            holidays={data.holidays}
            stats={stats}
            onDayClick={dialogs.handleDayClick}
            onDeliveryClick={dialogs.openDeliveryDetails}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Estimated Lines**: ~150

---

### 3. CalendarGrid Component

**Responsibilities**:
- Render calendar grid (days + deliveries)
- Handle week vs month layout
- Render week summaries

**Implementation**:
```tsx
interface CalendarGridProps {
  viewMode: CalendarViewMode;
  days: Date[];
  deliveries: Delivery[];
  workingDays: WorkingDay[];
  holidays: Holiday[];
  stats: CalendarStats;
  onDayClick: (date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
}

export function CalendarGrid(props: CalendarGridProps) {
  const { viewMode, days, stats } = props;

  if (viewMode === 'week') {
    return <WeekViewGrid {...props} />;
  }

  return <MonthViewGrid {...props} />;
}

function WeekViewGrid(props: CalendarGridProps) {
  const weeks = chunk(props.days, 7);

  return (
    <div className="space-y-4">
      {weeks.map((weekDays, idx) => (
        <Fragment key={idx}>
          <DayGrid days={weekDays} {...props} />
          <WeekSummary days={weekDays} stats={props.stats} />
        </Fragment>
      ))}
    </div>
  );
}

function MonthViewGrid(props: CalendarGridProps) {
  return (
    <div className="space-y-4">
      <DayGrid days={props.days} {...props} />
      <MonthSummaries days={props.days} stats={props.stats} />
    </div>
  );
}
```

**Estimated Lines**: ~100

**Key Improvement**: Single grid component, different layouts based on view mode

---

### 4. DayCell Component

**Responsibilities**:
- Render single calendar day
- Show deliveries for that day
- Display day stats, holidays
- Handle day click/right-click

**Implementation**:
```tsx
interface DayCellProps {
  date: Date;
  deliveries: Delivery[];
  isToday: boolean;
  isWeekend: boolean;
  isNonWorking: boolean;
  holidays: { polish: Holiday[]; german: Holiday[] };
  stats: { windows: number; sashes: number; glasses: number };
  onDayClick: (date: Date) => void;
  onDeliveryClick: (delivery: Delivery) => void;
}

export function DayCell(props: DayCellProps) {
  const {
    date,
    deliveries,
    isToday,
    isWeekend,
    isNonWorking,
    holidays,
    stats,
    onDayClick,
    onDeliveryClick,
  } = props;

  const cellClassName = cn(
    'h-48 border rounded-lg p-2 cursor-pointer transition-colors',
    isNonWorking && 'bg-red-200 border-red-500',
    isToday && 'border-blue-500 bg-blue-50',
    isWeekend && !isNonWorking && 'bg-slate-100'
  );

  return (
    <div
      className={cellClassName}
      onClick={() => onDayClick(date)}
      onContextMenu={(e) => handleRightClick(e, date)}
    >
      <DayHeader date={date} isToday={isToday} isNonWorking={isNonWorking} />

      <HolidayBadges holidays={holidays} />

      {stats.windows > 0 && <DayStats stats={stats} />}

      <DeliveryList deliveries={deliveries} onClick={onDeliveryClick} />
    </div>
  );
}
```

**Estimated Lines**: ~120

**Key Improvement**: Reusable cell, extracted sub-components

---

### 5. useDeliveryCalendar Hook

**Responsibilities**:
- Manage calendar view state
- Calculate date ranges
- Generate days array
- Provide navigation helpers

**Implementation**:
```tsx
export function useDeliveryCalendar() {
  const [pageViewMode, setPageViewMode] = useState<PageViewMode>('calendar');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  // Date calculations
  const dateRange = useMemo(() =>
    calculateDateRange(viewMode, weekOffset),
    [viewMode, weekOffset]
  );

  const days = useMemo(() =>
    generateDays(dateRange.start, dateRange.totalDays),
    [dateRange]
  );

  const monthsToFetch = useMemo(() =>
    getMonthsInRange(dateRange.start, dateRange.end),
    [dateRange]
  );

  return {
    // State
    pageViewMode,
    setPageViewMode,
    viewMode,
    setViewMode,
    weekOffset,
    setWeekOffset,

    // Computed
    dateRange,
    days,
    monthsToFetch,

    // Helpers
    goToToday: () => setWeekOffset(0),
    goToPrevious: () => setWeekOffset(weekOffset - 1),
    goToNext: () => setWeekOffset(weekOffset + 1),
  };
}
```

**Estimated Lines**: ~150

**Key Improvement**: All calendar state in one hook, testable

---

### 6. useDeliveryDragDrop Hook

**Responsibilities**:
- Manage drag & drop state
- Handle drag start/end events
- Execute mutations on drop
- Handle multi-select

**Implementation**:
```tsx
export function useDeliveryDragDrop(mutations: DeliveryMutations) {
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    setActiveDragItem({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      sourceDeliveryId: data.deliveryId,
    });
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveDragItem(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    const ordersToMove = selectedOrderIds.has(activeData.orderId)
      ? Array.from(selectedOrderIds)
      : [activeData.orderId];

    // Delegate to mutation helper
    await executeDrop(activeData, overData, ordersToMove, mutations);

    setActiveDragItem(null);
    setSelectedOrderIds(new Set());
  }, [selectedOrderIds, mutations]);

  return {
    // State
    activeDragItem,
    selectedOrderIds,
    setSelectedOrderIds,

    // DnD Config
    dndConfig: {
      sensors,
      collisionDetection: closestCenter,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  };
}
```

**Estimated Lines**: ~120

**Key Improvement**: Drag logic separated, testable

---

### 7. useDeliveryMutations Hook

**Responsibilities**:
- Define all mutations
- Handle optimistic updates
- Coordinate error handling
- Emit toast notifications

**Implementation**:
```tsx
export function useDeliveryMutations() {
  const queryClient = useQueryClient();

  const createDelivery = useMutation({
    mutationFn: deliveriesApi.create,
    onMutate: optimisticCreateDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries-calendar-batch']);
      showSuccessToast('Dostawa utworzona');
    },
    onError: rollbackOptimisticUpdate,
  });

  const deleteDelivery = useMutation({
    mutationFn: deliveriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries-calendar-batch']);
      showSuccessToast('Dostawa usunięta');
    },
  });

  // ... 10+ more mutations

  return {
    createDelivery,
    deleteDelivery,
    addOrderToDelivery,
    removeOrderFromDelivery,
    moveOrderBetweenDeliveries,
    addItem,
    deleteItem,
    completeOrders,
    // ... more
  };
}
```

**Estimated Lines**: ~200

**Key Improvement**: All mutations in one place, easier to test

---

### 8. useDeliveryDialogs Hook

**Responsibilities**:
- Manage all dialog states
- Coordinate dialog opening/closing
- Handle dialog data
- Reset form state on close

**Implementation**:
```tsx
export function useDeliveryDialogs() {
  // Dialog states
  const [newDeliveryDialog, setNewDeliveryDialog] = useState({
    open: false,
    date: '',
    notes: '',
  });

  const [deliveryDetailsDialog, setDeliveryDetailsDialog] = useState<{
    open: boolean;
    delivery: Delivery | null;
  }>({ open: false, delivery: null });

  // ... more dialog states

  return {
    // New Delivery
    newDelivery: newDeliveryDialog,
    openNewDelivery: (date?: string) =>
      setNewDeliveryDialog({ open: true, date: date || '', notes: '' }),
    closeNewDelivery: () =>
      setNewDeliveryDialog({ open: false, date: '', notes: '' }),
    updateNewDeliveryData: (data: Partial<typeof newDeliveryDialog>) =>
      setNewDeliveryDialog(prev => ({ ...prev, ...data })),

    // Delivery Details
    deliveryDetails: deliveryDetailsDialog,
    openDeliveryDetails: (delivery: Delivery) =>
      setDeliveryDetailsDialog({ open: true, delivery }),
    closeDeliveryDetails: () =>
      setDeliveryDetailsDialog({ open: false, delivery: null }),

    // ... more dialog methods
  };
}
```

**Estimated Lines**: ~100

**Key Improvement**: Dialog state centralized, easier to coordinate

---

### 9. useDateCalculations Hook

**Responsibilities**:
- Date range calculations
- Day generation
- Holiday checks
- Working day checks

**Implementation**:
```tsx
export function useDateCalculations(
  days: Date[],
  workingDays: WorkingDay[],
  holidays: Holiday[]
) {
  const getHolidayInfo = useCallback((date: Date) => {
    const polish = holidays.filter(h =>
      h.country === 'PL' && isSameDay(new Date(h.date), date)
    );
    const german = holidays.filter(h =>
      h.country === 'DE' && isSameDay(new Date(h.date), date)
    );
    return { polish, german };
  }, [holidays]);

  const isNonWorkingDay = useCallback((date: Date) => {
    const workingDay = workingDays.find(wd =>
      isSameDay(new Date(wd.date), date)
    );
    return workingDay && !workingDay.isWorking;
  }, [workingDays]);

  const isHolidayNonWorking = useCallback((holidayInfo) => {
    return holidayInfo.polish.some(h => !h.isWorking) ||
           holidayInfo.german.some(h => !h.isWorking);
  }, []);

  return {
    getHolidayInfo,
    isNonWorkingDay,
    isHolidayNonWorking,
  };
}
```

**Estimated Lines**: ~150

---

### 10. useDeliveryStats Hook

**Responsibilities**:
- Calculate day statistics
- Calculate week statistics
- Aggregate delivery stats

**Implementation**:
```tsx
export function useDeliveryStats(deliveries: Delivery[]) {
  const getDayStats = useCallback((date: Date) => {
    const dayDeliveries = deliveries.filter(d =>
      isSameDay(new Date(d.deliveryDate), date)
    );

    return dayDeliveries.reduce((acc, delivery) => {
      delivery.deliveryOrders.forEach(dOrder => {
        acc.windows += dOrder.order.totalWindows || 0;
        acc.sashes += dOrder.order.totalSashes || 0;
        acc.glasses += dOrder.order.totalGlasses || 0;
      });
      return acc;
    }, { windows: 0, sashes: 0, glasses: 0 });
  }, [deliveries]);

  const getWeekStats = useCallback((weekDays: Date[]) => {
    return weekDays.reduce((acc, date) => {
      const dayStats = getDayStats(date);
      acc.windows += dayStats.windows;
      acc.sashes += dayStats.sashes;
      acc.glasses += dayStats.glasses;
      return acc;
    }, { windows: 0, sashes: 0, glasses: 0 });
  }, [getDayStats]);

  return {
    getDayStats,
    getWeekStats,
  };
}
```

**Estimated Lines**: ~100

---

## Implementation Steps

### Phase 1: Extract Custom Hooks (Week 1, Days 1-3)
**Goal**: Move logic out of component into testable hooks

1. **Day 1**: Create `useDeliveryCalendar.ts`
   - Extract view mode state
   - Extract date calculations
   - Add tests

2. **Day 2**: Create `useDateCalculations.ts` + `useDeliveryStats.ts`
   - Extract helper functions
   - Add comprehensive tests

3. **Day 3**: Create `useDeliveryMutations.ts`
   - Extract all mutations
   - Test optimistic updates

**Deliverable**: 3 hooks with >85% coverage

**Risk**: LOW - Logic extraction, no UI changes

---

### Phase 2: Extract Dialog Management (Week 1, Day 4)
**Goal**: Simplify dialog state management

1. Create `useDeliveryDialogs.ts`
   - Centralize all dialog states
   - Add open/close methods
   - Add tests

2. Update component to use hook
   - Replace individual states
   - Verify dialogs still work

**Deliverable**: Dialog hook with tests

**Risk**: LOW - State refactoring only

---

### Phase 3: Extract Drag & Drop (Week 1, Day 5)
**Goal**: Isolate drag & drop complexity

1. Create `useDeliveryDragDrop.ts`
   - Move drag handlers
   - Move multi-select logic
   - Add tests

2. Update component
   - Use hook
   - Verify drag still works

**Deliverable**: Drag & drop hook with tests

**Risk**: MEDIUM - Complex logic

---

### Phase 4: Extract Calendar Components (Week 2, Days 1-3)
**Goal**: Break down massive JSX into smaller components

1. **Day 1**: Create `DayCell.tsx`
   - Extract single day rendering
   - Add sub-components (DayHeader, HolidayBadges, DayStats)
   - Add Storybook stories

2. **Day 2**: Create `CalendarGrid.tsx`
   - Extract grid layout
   - Support week/month modes
   - Add tests

3. **Day 3**: Create `CalendarHeader.tsx` + `WeekSummary.tsx`
   - Extract header navigation
   - Extract week summaries
   - Add tests

**Deliverable**: 4 calendar components with Storybook

**Risk**: MEDIUM - UI refactoring

---

### Phase 5: Extract Dialog Components (Week 2, Days 4-5)
**Goal**: Separate dialog implementations

1. **Day 4**: Create dialog components
   - `NewDeliveryDialog.tsx`
   - `DeliveryDetailsDialog.tsx`
   - `AddItemDialog.tsx`
   - Use shared dialog hook

2. **Day 5**: Create more dialogs
   - `CompleteOrdersDialog.tsx`
   - `DeleteDeliveryDialog.tsx`
   - Add tests

**Deliverable**: 5 dialog components with tests

**Risk**: LOW - Already well-isolated

---

### Phase 6: Assemble Container Component (Week 3, Day 1)
**Goal**: Simplify main component to orchestrator only

1. Create new `DostawyPageContent.tsx`
   - Use all extracted hooks
   - Render extracted components
   - Keep only orchestration logic

2. Delete old implementation
   - Verify all features work
   - Update tests

**Deliverable**: Container component (<200 lines)

**Risk**: MEDIUM - Integration

---

### Phase 7: Testing & Optimization (Week 3, Days 2-3)
**Goal**: Comprehensive testing and performance

1. **Day 2**: Integration tests
   - Full user flows
   - Drag & drop scenarios
   - Dialog workflows

2. **Day 3**: Performance optimization
   - Memoization check
   - Re-render analysis
   - Bundle size check

**Deliverable**: Test suite + performance report

**Risk**: LOW

---

### Phase 8: Documentation & Cleanup (Week 3, Days 4-5)
**Goal**: Document new structure

1. Update component documentation
2. Create Storybook for all components
3. Update frontend guidelines
4. Code review

**Deliverable**: Complete documentation

**Risk**: LOW

---

## Breaking Changes

### None Expected
All functionality remains the same, only internal structure changes.

---

## Testing Strategy

### Unit Tests (Target: 85% coverage)

**Hooks**:
```
useDeliveryCalendar: 95% coverage
  - View mode changes
  - Date calculations
  - Navigation

useDateCalculations: 100% coverage
  - Holiday checks
  - Working day checks
  - Edge cases

useDeliveryStats: 95% coverage
  - Day stats
  - Week stats
  - Empty data

useDeliveryMutations: 80% coverage
  - All mutations
  - Optimistic updates
  - Error handling

useDeliveryDialogs: 90% coverage
  - Open/close
  - State reset

useDeliveryDragDrop: 85% coverage
  - Drag handlers
  - Multi-select
```

**Components**:
```
DayCell: 90% coverage
  - Rendering variations
  - Click handlers
  - Holiday display

CalendarGrid: 85% coverage
  - Week mode
  - Month mode
  - Empty state

Dialogs: 80% coverage each
  - Form submission
  - Validation
  - Cancel/close
```

### Integration Tests

**Critical Flows**:
1. Navigate calendar → Click day → Create delivery → See delivery appear
2. Drag order from unassigned → Drop on delivery → Order assigned
3. Click delivery → View details → Add item → Item appears
4. Multi-select orders → Drag to delivery → All assigned

---

## Success Metrics

### Code Quality

- **Lines per file**: <250 (from 1937)
- **Component complexity**: <50 per component
- **Test coverage**: 85%+
- **Storybook stories**: 100% of UI components

### Performance

- **Bundle size**: No significant increase
- **Re-renders**: Reduced by 50%+
- **LCP**: < 2.5s (no regression)

### Maintainability

- **Time to add new dialog**: <2 hours
- **Time to add new stat**: <1 hour
- **Component comprehension**: <15 min per component

---

## Conclusion

This refactoring transforms a monolithic 1937-line component into 15+ focused, testable modules. The work is split into 8 phases over 3 weeks.

**Expected Benefits**:
- 85%+ test coverage
- <250 lines per file
- Reusable components
- Better performance
- Easier to maintain

**Next Action**: Approve plan and start Phase 1 (extract hooks).
