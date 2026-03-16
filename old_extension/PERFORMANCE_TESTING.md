# Paint Bucket Performance Testing Guide

## Performance Optimizations Applied

### 1. Debounced localStorage Writes
**Problem:** Every click triggered synchronous `JSON.stringify()` + `localStorage.setItem()` blocking main thread
**Solution:** Debounced writes to max once per 300ms
**Expected Impact:** 50-100ms saved per click

### 2. Incremental Color Application with Caching
**Problem:** O(n²) behavior - all colors removed and re-applied on every click
**Solution:**
- Cache XPath → Element mappings
- Only apply delta changes (new/changed colors)
- Skip re-applying unchanged colors
**Expected Impact:**
- With 50 colors: ~500ms saved per click
- With 100 colors: ~2000ms saved per click

### 3. Memoized `shouldIgnore()` Checks
**Problem:** 180 DOM traversals per second during hover (3 `closest()` calls × 60fps)
**Solution:** WeakSet cache for ignore checks
**Expected Impact:** Smoother hover, less CPU usage

### 4. Cached XPath Generation
**Problem:** Recursive tree walk on every click
**Solution:** WeakMap cache for generated XPaths
**Expected Impact:** 5-20ms saved per click on deep DOM trees

## How to Test

### Manual Testing

1. **Build and Load Extension:**
   ```bash
   cd /Users/codyhergenroeder/code/annotator-extension
   npm run build
   ```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

3. **Test on Complex Sites:**
   - Reddit thread with many comments
   - News article with complex layout
   - Wikipedia page
   - GitHub issue page

4. **Test Scenarios:**

   **Scenario A: First Click Performance**
   - Enable annotator (press `)
   - Select paint bucket tool (press `6`)
   - Click an element
   - **Expected:** Instant color application (<50ms)

   **Scenario B: Incremental Performance (The Big One)**
   - Color 20 elements on the page
   - Click to color the 21st element
   - **Before:** 200-500ms lag (re-applying all 20 colors)
   - **After:** <50ms lag (only applying 1 new color)

   **Scenario C: Hover Smoothness**
   - Select paint bucket tool
   - Move mouse rapidly over page elements
   - **Expected:** Smooth outline preview, no jank

   **Scenario D: Recolor Existing Element**
   - Click an already-colored element with new color
   - **Expected:** Instant color change

### Browser DevTools Profiling

#### Performance Tab Method:

1. Open DevTools → Performance tab
2. Click "Record"
3. Click paint bucket on an element (with 50+ existing colors)
4. Stop recording
5. Look for:
   - `getNodeByXPath` calls - should be 1-2, not 50+
   - `localStorage.setItem` - should be debounced, not immediate
   - Main thread time - should be <100ms total

#### Console Timing Method:

Add this to `PageColorLayer.tsx` after line 23:

```typescript
console.time('PageColorLayer update');
let xpathLookups = 0;
let skippedCached = 0;
```

After line 57, add:
```typescript
skippedCached++;
console.log(`Skipped cached element (same color)`);
```

After line 72, add:
```typescript
xpathLookups++;
```

Before line 122, add:
```typescript
console.timeEnd('PageColorLayer update');
console.log(`XPath lookups: ${xpathLookups}, Cached skips: ${skippedCached}`);
```

**Expected output on 51st click with 50 existing colors:**
```
PageColorLayer update: 5-15ms
XPath lookups: 1
Cached skips: 50
```

**Before optimization would show:**
```
PageColorLayer update: 200-500ms
XPath lookups: 51
Cached skips: 0
```

### Memory Leak Testing

1. Color 100 elements
2. Use eraser to remove all colors
3. Open DevTools → Memory tab → Take heap snapshot
4. Search for "ColorState" or "PageColorLayer"
5. **Expected:** Caches should be cleared (no retained elements)

### Stress Test

1. Navigate to a Reddit thread with 100+ comments
2. Color 100 different elements rapidly
3. **Expected:** No browser freeze, smooth operation
4. Check Chrome Task Manager (Shift+Esc)
5. **Expected:** Extension process <100MB memory

## Known Limitations

### WeakMap/WeakSet Cache Limitations

- Caches cleared when page navigates
- Elements removed from DOM are auto-cleaned from WeakMap
- This is GOOD - prevents memory leaks

### Debounced Storage Edge Case

- If you color an element and immediately close the tab, the last 300ms of changes might not save
- **Solution if critical:** Add `beforeunload` handler to flush pending saves

### XPath Cache Invalidation

- If page dynamically modifies DOM structure, XPath might become stale
- **Current behavior:** Next lookup will refresh cache
- **If problematic:** Add MutationObserver to invalidate cache on DOM changes

## Benchmarking Results Template

Test on: **[Site Name]** - **[Date]**

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| First click | ? ms | ? ms | ? ms |
| 20th click | ? ms | ? ms | ? ms |
| 50th click | ? ms | ? ms | ? ms |
| 100th click | ? ms | ? ms | ? ms |
| Hover lag (subjective) | Noticeable/Severe | Smooth/Minor | N/A |
| Memory usage (100 colors) | ? MB | ? MB | ? MB |

## Rollback Plan

If these changes cause issues:

```bash
git checkout HEAD~1 src/components/PageColorLayer.tsx
git checkout HEAD~1 src/utils/storage.ts
git checkout HEAD~1 src/components/App.tsx
npm run build
```

## Next Steps If Still Slow

If after these optimizations the paint bucket is still slow:

1. **Profile to identify remaining bottleneck**
2. **Potential nuclear options:**
   - Move color storage outside React entirely (global Map)
   - Use CSS injection instead of inline styles
   - Implement virtual rendering (only apply colors to visible elements)
   - Use Web Worker for XPath calculations
   - Limit max colors per page

## Questions to Answer During Testing

1. Does the slowness happen on first click or subsequent clicks?
2. How many colored elements before slowness appears?
3. Is hover lag still present?
4. Does eraser work smoothly?
5. Do colors persist across page refresh?
6. Does undo/redo still work correctly?
