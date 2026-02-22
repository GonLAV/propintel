# Property Historical Records Search & Filtering

## Overview

A comprehensive search and filtering system for finding specific properties in historical records, with advanced filtering capabilities for betterment levy calculations and audit trail logs.

## Features

### 1. Property Historical Search (`PropertyHistoricalSearch`)

Located in: `/src/components/PropertyHistoricalSearch.tsx`

A dedicated interface for searching and filtering historical betterment levy calculations with the following capabilities:

#### Search & Filter Options

**Full-Text Search:**
- Property address
- Property identifier
- Scenario name
- Plan numbers (both previous and new)
- Notes and comments

**Date Range Filtering:**
- From date
- To date
- Filters based on record creation date

**Plan Number Search:**
- Filter by specific plan numbers
- Searches both previous and new planning status

**Calculation Method Filter:**
- Direct calculation
- Weighted average
- Comparative method

**Levy Range Filtering:**
- Minimum levy amount
- Maximum levy amount
- Filters based on calculated levy values

**Sorting Options:**
- By date (newest/oldest)
- By levy amount (high/low)
- By address (alphabetical)
- By betterment value (high/low)

#### UI Features

**Active Filter Count:**
- Badge showing number of active filters
- Quick visibility into applied filters

**Clear All Filters:**
- One-click button to reset all filters
- Confirmation toast message

**Results Count:**
- Shows filtered results count
- Displays total records when filters are applied

**Collapsible Advanced Filters:**
- Animated expand/collapse panel
- Clean interface when filters not needed

**Export Functionality:**
- Export filtered results to CSV
- Includes all key fields:
  - Property address
  - Property identifier
  - Previous plan number
  - New plan number
  - Determining date
  - Average levy
  - Betterment value
  - Creation date

#### Record Display

**List View:**
- Clean card-based layout
- Key information at a glance
- Hover effects for interactivity
- Click to view full details

**Animated Transitions:**
- Smooth entry/exit animations
- Staggered appearance for visual polish

**Detail Dialog:**
- Full calculation breakdown
- Tabbed interface for:
  - Calculation results
  - Planning status comparison
  - Market data
- Conservative, average, and maximum levy values
- Side-by-side comparison of previous vs. new planning status

### 2. Enhanced Audit Trail Filtering

Located in: `/src/components/AuditTrail.tsx`

Enhanced the existing audit trail with additional filtering capabilities:

#### New Features Added

**Date Range Filtering:**
- From date selector
- To date selector
- Filters change logs within specified date range

**Clear All Filters:**
- Button appears when any filter is active
- Resets all filters including:
  - Search query
  - Entity type
  - Action type
  - Date range

**Improved Layout:**
- Two-row filter layout
- First row: search, entity type, action type
- Second row: date range selectors
- Better space utilization

### 3. Sidebar Navigation Integration

Updated: `/src/components/app/AppSidebar.tsx`

**New Menu Item:**
- "חיפוש היסטורי" (Historical Search)
- Icon: MagnifyingGlass
- Category: Business Management (💼 ניהול עסקי)
- Keywords for quick search:
  - חיפוש (search)
  - היסטוריה (history)
  - רשומות (records)
  - ארכיון (archive)
  - נתונים קודמים (previous data)
  - היטל (levy)
  - תכניות (plans)

### 4. App Routing

Updated: `/src/App.tsx`

**New Route:**
- Route ID: `historical-search`
- Component: `PropertyHistoricalSearch`
- Accessible from sidebar menu

## Usage

### Accessing Historical Search

1. Navigate to the sidebar
2. Scroll to "💼 ניהול עסקי" section
3. Click "חיפוש היסטורי"

Or use the quick search in the sidebar:
1. Click the search box at the top of the sidebar
2. Type keywords like "חיפוש", "היסטוריה", or "ארכיון"
3. Click the filtered menu item

### Performing a Search

#### Basic Search:
1. Type in the main search box
2. Search works across:
   - Addresses
   - Property identifiers
   - Plan numbers
   - Scenario names
   - Notes

#### Advanced Filtering:
1. Click "סינון מתקדם" (Advanced Filtering)
2. Set desired filters:
   - Date range
   - Plan number
   - Calculation method
   - Levy range
3. Results update automatically
4. Filter count badge shows active filters

#### Sorting Results:
1. Use the "מיין לפי" (Sort by) dropdown
2. Select sorting criteria
3. Click the arrow button to toggle ascending/descending

#### Viewing Details:
1. Click any record card
2. Modal opens with full details
3. Switch between tabs to see:
   - Calculation breakdown
   - Plan comparison
   - Market data

#### Exporting Results:
1. Apply desired filters
2. Click "ייצא תוצאות" (Export Results) button
3. CSV file downloads automatically
4. Includes all filtered records

### Using Enhanced Audit Trail

1. Navigate to "מעקב שינויים" (Audit Trail)
2. Use the enhanced filters:
   - Search by entity or user name
   - Filter by entity type
   - Filter by action type
   - Set date range
3. Click "נקה סננים" (Clear Filters) to reset

## Technical Details

### Data Storage

All historical records are stored using the `useKV` hook with key:
- `betterment-history` - Array of PropertyHistoricalRecord objects

### Record Structure

```typescript
interface PropertyHistoricalRecord {
  id: string
  propertyIdentifier: string
  propertyAddress: string
  createdAt: string
  scenario: BettermentScenario
  calculationResult: {
    delta: any
    valuePerSqm: number
    bettermentValue: number
    levy: number
    conservativeLevy: number
    averageLevy: number
    maximumLevy: number
  }
  notes: string
}
```

### Performance Optimization

**useMemo for Filtering:**
- Filtered results are memoized
- Recalculates only when filters or data change
- Prevents unnecessary re-renders

**Debounced Search:**
- Search updates trigger immediate filtering
- No artificial debounce needed due to memoization

**Lazy Loading:**
- Records load on-demand
- Smooth animations prevent UI jank

## Best Practices

### For Users

1. **Start Broad, Narrow Down:**
   - Begin with general search terms
   - Add filters to refine results

2. **Use Date Ranges:**
   - Narrow down by time period
   - Especially useful for large datasets

3. **Export Early:**
   - Export results before clearing filters
   - Reference for offline analysis

4. **Save Favorites:**
   - Pin frequently accessed records
   - Use sidebar favorites feature

### For Developers

1. **Add New Filter Fields:**
   - Update FilterState interface
   - Add UI control in filters panel
   - Add filtering logic in useMemo

2. **Customize Export:**
   - Modify CSV generation in exportResults
   - Add/remove fields as needed

3. **Extend Search:**
   - Add fields to search term filtering
   - Update the filter logic in useMemo

## Future Enhancements

Potential improvements for future iterations:

1. **Saved Searches:**
   - Save filter combinations
   - Quick access to common queries

2. **Batch Operations:**
   - Select multiple records
   - Bulk export or delete

3. **Advanced Comparison:**
   - Compare multiple properties side-by-side
   - Trend analysis across records

4. **Print View:**
   - Formatted print layout
   - Summary reports

5. **Chart Visualizations:**
   - Levy trends over time
   - Value distribution charts

6. **Excel Export:**
   - Multi-sheet workbook
   - Formatted with calculations

## Troubleshooting

### No Results Found

- Check if filters are too restrictive
- Clear all filters and try again
- Verify data exists in storage

### Slow Performance

- Reduce number of records displayed
- Use date range to limit results
- Consider pagination for large datasets

### Export Not Working

- Check browser download permissions
- Verify records contain required fields
- Try with smaller result set

## Related Components

- `/src/components/BettermentLevyCalculator.tsx` - Creates historical records
- `/src/components/AuditTrail.tsx` - General audit logging
- `/src/components/app/AppSidebar.tsx` - Navigation
- `/src/App.tsx` - Main routing
