# Reddit Performance Fix - Implementation Checklist

Use this checklist to track your progress through the investigation and fix.

---

## Phase 1: Diagnosis (30-60 minutes)

### Setup Instrumentation

- [ ] Import performance utilities in `App.tsx`
  ```typescript
  import { perf, isReddit, getDOMDepth } from '../utils/performance';
  ```

- [ ] Import performance utilities in `PageColorLayer.tsx`
  ```typescript
  import { perf } from '../utils/performance';
  ```

- [ ] Add timing to `handlePaintBucket` function (see REDDIT_DIAGNOSTIC_PLAN.md)

- [ ] Add timing to `updateHover` function

- [ ] Add timing to `PageColorLayer` useEffect

- [ ] Rebuild extension
  ```bash
  npm run build
  ```

- [ ] Reload extension in browser

### Run Tests on Reddit

- [ ] Test Suite A: Basic Performance
  - Open Reddit thread
  - Run `window.annotatorPerf.clear()`
  - Color 5 elements
  - Run `window.annotatorPerf.summary()`
  - Record average paintBucket.total: ________ ms

- [ ] Test Suite B: Deep Comment Threads
  - Find nested comment (4+ levels)
  - Color the deepest comment
  - Check console for XPath depth: ________ levels
  - Check console for XPath length: ________ characters

- [ ] Test Suite C: Virtual Scrolling
  - Color 10 comments
  - Scroll down (out of view)
  - Scroll back up
  - Did colors persist? YES / NO
  - Check console for XPath lookup failures: ________ failed

- [ ] Test Suite D: Hover Stress Test
  - Clear metrics
  - Activate paint bucket
  - Hover over 20+ elements rapidly
  - Run summary
  - Record hover.update average: ________ ms

- [ ] Run `window.analyzePageStructure()`
  - maxDepth: ________ levels
  - totalElements: ________ elements
  - avgDepth: ________ levels

### Analyze Results

- [ ] Is paintBucket.xpath.generate > 50ms? YES / NO

- [ ] Is XPath depth > 20 levels? YES / NO

- [ ] Is hover.update > 10ms average? YES / NO

- [ ] Are there XPath lookup failures after scrolling? YES / NO

- [ ] Are there "SLOW CLICK" warnings in console? YES / NO

### Decision Point

**If 3+ answers above are YES:**
- [x] XPath is the bottleneck → Proceed to Phase 2

**If only hover is slow:**
- [ ] Disable hover on Reddit (quick fix)
- [ ] Re-test and stop here if fixed

**If no performance issues detected:**
- [ ] Document findings - issue might be elsewhere
- [ ] Check network tab for other bottlenecks
- [ ] Check for conflicting extensions

---

## Phase 2: Implementation (2-3 hours)

### Backup Current Code

- [ ] Create git branch for changes
  ```bash
  git checkout -b feature/stable-id-optimization
  ```

- [ ] Commit current state
  ```bash
  git add .
  git commit -m "Pre-stable-ID implementation state"
  ```

### Update Types

- [ ] Open `/Users/codyhergenroeder/code/annotator-extension/src/types/index.ts`

- [ ] Add `stableId` field to PageColorAnnotation
  ```typescript
  export interface PageColorAnnotation {
    id: string;
    type: 'page-color';
    xpath: string;
    stableId?: string; // NEW
    color: string;
    modificationType: 'text' | 'background';
    timestamp: number;
  }
  ```

### Update Paint Bucket Handler

- [ ] Open `/Users/codyhergenroeder/code/annotator-extension/src/components/App.tsx`

- [ ] Replace `handlePaintBucket` with instrumented version from REDDIT_SOLUTION_STABLE_IDS.md

- [ ] Key changes:
  - [ ] Get or inject stableId on click
  - [ ] Store both stableId and xpath
  - [ ] Check for existing element by stableId first

- [ ] Add console.log for stableId injection (temporary debug)

### Update PageColorLayer

- [ ] Open `/Users/codyhergenroeder/code/annotator-extension/src/components/PageColorLayer.tsx`

- [ ] Replace useEffect with version from REDDIT_SOLUTION_STABLE_IDS.md

- [ ] Key changes:
  - [ ] Use `getKey()` helper to prioritize stableId
  - [ ] Try querySelector first
  - [ ] Fall back to XPath if needed
  - [ ] Re-inject stableId when found via XPath
  - [ ] Track metrics (fast lookups vs fallbacks)

### Build and Test

- [ ] Rebuild extension
  ```bash
  npm run build
  ```

- [ ] Reload extension in browser

- [ ] Test basic functionality:
  - [ ] Can color elements
  - [ ] Can update colors
  - [ ] Can erase colors
  - [ ] Can undo/redo

- [ ] Check for errors in console

---

## Phase 3: Validation (30 minutes)

### Test on Reddit

- [ ] Clear performance metrics
  ```javascript
  window.annotatorPerf.clear()
  ```

- [ ] Color 10 elements on Reddit thread

- [ ] Check console for:
  - [ ] "[STABLE ID] Injected" messages (should see 10)
  - [ ] No error messages
  - [ ] No "SLOW" warnings

- [ ] Run performance summary
  ```javascript
  window.annotatorPerf.summary()
  ```

- [ ] Record new metrics:
  - paintBucket.total average: ________ ms (expect <10ms)
  - Fast lookups vs xpath fallbacks ratio: ________ / ________

### Test Virtual Scrolling

- [ ] Color 10 comments

- [ ] Scroll down until out of view

- [ ] Scroll back up

- [ ] Verify:
  - [ ] Colors reappear
  - [ ] Console shows "Re-injected after XPath lookup" (first time)
  - [ ] No failed lookups

- [ ] Update one of the colored elements

- [ ] Check console:
  - [ ] Should show fast stableId lookup, not XPath
  - [ ] Verify stableId was persisted from re-injection

### Test Page Reload

- [ ] With 10 colored elements, reload page

- [ ] Verify:
  - [ ] Colors reappear after load
  - [ ] Console shows XPath fallback initially
  - [ ] Then "[STABLE ID] Re-injected" messages

- [ ] Update a color

- [ ] Check console:
  - [ ] Should now use fast stableId lookup

### Test Old vs New Reddit

- [ ] Test on old.reddit.com
  - [ ] Color 5 elements
  - [ ] Check performance
  - [ ] Verify functionality

- [ ] Test on new Reddit
  - [ ] Color 5 elements
  - [ ] Check performance
  - [ ] Verify functionality

- [ ] Both should show significant improvement

### Measure Improvement

- [ ] Before optimization (from Phase 1):
  - paintBucket.total: ________ ms

- [ ] After optimization:
  - paintBucket.total: ________ ms

- [ ] Calculate speedup:
  - ________ ms / ________ ms = ________ x faster

- [ ] Expected speedup: 10-100x
  - [ ] Did we achieve this? YES / NO

---

## Phase 4: Cleanup and Ship

### Code Cleanup

- [ ] Remove temporary debug logs
  - [ ] Remove excessive console.log statements
  - [ ] Keep performance monitoring but make conditional

- [ ] Add comments explaining the hybrid approach
  ```typescript
  // Try fast stableId lookup first, fall back to XPath for cross-reload
  ```

- [ ] Update JSDoc comments if needed

### Testing on Other Sites

- [ ] Test on Wikipedia
  - [ ] Verify functionality
  - [ ] Check for conflicts

- [ ] Test on GitHub
  - [ ] Verify functionality
  - [ ] Check for conflicts

- [ ] Test on generic site (news article)
  - [ ] Verify functionality
  - [ ] Check backward compatibility

### Documentation

- [ ] Update main README with performance improvements

- [ ] Document the stable ID approach

- [ ] Add troubleshooting section if needed

### Commit Changes

- [ ] Review all changes
  ```bash
  git diff
  ```

- [ ] Stage changes
  ```bash
  git add .
  ```

- [ ] Commit with descriptive message
  ```bash
  git commit -m "feat: implement stable ID injection for 10-100x Reddit performance

  - Add stableId field to PageColorAnnotation
  - Inject data-annotator-id on first click
  - Use querySelector for O(1) lookups instead of XPath O(depth)
  - Keep XPath as fallback for cross-reload and backward compatibility
  - Measured 50-200ms → <5ms click latency on deep Reddit comments

  Fixes Reddit-specific slowness from deep DOM structure (20-30 levels).
  Graceful degradation ensures backward compatibility with existing annotations."
  ```

- [ ] Optional: Create pull request if using GitHub

---

## Success Criteria

Mark complete when ALL are true:

- [ ] Average click time < 10ms on Reddit
- [ ] No "SLOW" console warnings
- [ ] Colors persist through virtual scrolling
- [ ] Works on both old and new Reddit
- [ ] Backward compatible with existing annotations
- [ ] No conflicts with Reddit's functionality
- [ ] Performance improvement confirmed (10x+ speedup)

---

## Rollback Plan (If Needed)

If issues arise:

- [ ] Check console errors - what's failing?

- [ ] Disable stable ID temporarily
  ```typescript
  // In handlePaintBucket, comment out stableId logic
  // Use only XPath
  ```

- [ ] Rebuild and test

- [ ] If XPath-only works:
  - Debug stable ID implementation
  - Check for attribute conflicts
  - Verify querySelector syntax

- [ ] If neither works:
  - Revert to previous commit
    ```bash
    git checkout main
    ```
  - Investigate other issues

---

## Troubleshooting

### Issue: Colors not applying

**Check:**
- [ ] Console errors?
- [ ] Is stableId being injected? (check element in DevTools)
- [ ] Is querySelector finding elements?

**Fix:**
- Verify attribute name is correct
- Check for typos in selector
- Ensure element is in DOM when queried

### Issue: Colors disappear after scroll

**Check:**
- [ ] XPath fallback working?
- [ ] Are elements being re-injected?
- [ ] Console showing failed lookups?

**Fix:**
- Verify XPath is stored correctly
- Check element.isConnected logic
- Ensure re-injection code runs

### Issue: Performance not improved

**Check:**
- [ ] Is querySelector actually being used?
- [ ] Console showing "fast lookups"?
- [ ] Or still seeing XPath fallbacks?

**Fix:**
- Verify stableId is being stored
- Check lookup priority (stableId first, then XPath)
- Ensure stableId persists on elements

### Issue: Conflicts with Reddit

**Check:**
- [ ] Reddit functionality broken?
- [ ] Console errors from Reddit's code?
- [ ] Attribute name collision?

**Fix:**
- Use more unique attribute name
- Check Reddit's source for conflicts
- Consider namespacing: `data-annotator-v1-id`

---

## Performance Benchmarks

Record your measurements:

### Before Optimization

```
Site: Reddit (new)
Thread length: ________ comments
DOM depth: ________ levels

Click latency: ________ ms
Hover latency: ________ ms
50 colors apply: ________ ms
Cache hit rate: ________ %
```

### After Optimization

```
Site: Reddit (new)
Thread length: ________ comments
DOM depth: ________ levels

Click latency: ________ ms
Hover latency: ________ ms
50 colors apply: ________ ms
Cache hit rate: ________ %
Fast lookups: ________ %
XPath fallbacks: ________ %
```

### Improvement

```
Click speedup: ________ x
Hover speedup: ________ x
Overall speedup: ________ x

User perception: INSTANT / FAST / ACCEPTABLE / SLOW
```

---

## Notes

Use this space for observations during implementation:

**Issues encountered:**
-
-

**Unexpected behaviors:**
-
-

**Performance surprises:**
-
-

**Ideas for future optimization:**
-
-

---

## Completion

- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] All Phase 4 tasks complete
- [ ] All success criteria met
- [ ] Changes committed
- [ ] Documentation updated

**Completion date:** ____________

**Final performance improvement:** ________ x faster

**Status:** COMPLETE / PARTIAL / NEEDS_WORK

---

Print this checklist or keep it open while working through the implementation.
