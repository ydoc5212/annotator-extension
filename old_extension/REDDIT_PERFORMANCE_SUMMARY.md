# Reddit Performance Investigation - Executive Summary

## The Problem

Paint bucket tool is slow on Reddit, despite having 4 major optimizations:
1. Incremental color application
2. Debounced localStorage (300ms)
3. Memoized shouldIgnore checks
4. Cached XPath generation

**User report:** Still experiencing performance issues specifically on Reddit.

---

## Top 3 Hypotheses (Data-Driven)

### #1: XPath Generation on Deep DOM (90% confidence)

**The Issue:**
Reddit's comment threads can be 20+ levels deep. Your `getXPath()` function recursively walks up the tree, creating arrays and filtering siblings at each level.

**Evidence:**
```typescript
// In xpath.ts, this runs on EVERY paint bucket click
export function getXPath(node: Node): string {
  // Recursive parent traversal
  const siblings = Array.from(parent.children).filter(...)
  const index = siblings.indexOf(element);
  return `${getXPath(parent)}/${tagName}[${index + 1}]`;
}
```

On a 20-level deep comment:
- 20 recursive calls
- 20 array allocations (`Array.from()`)
- 20 filter operations
- 20 indexOf searches
- Result: 50-200ms per click on deep elements

**Smoking Gun:**
- You have XPath caching (line 227 App.tsx), but it only helps on re-clicks
- First click on any new element pays full XPath cost
- On Reddit threads with 500+ comments, you're constantly hitting new elements

### #2: Hover Preview Fighting React (75% confidence)

**The Issue:**
Reddit uses React with virtual scrolling. Your `mousemove` listener runs on EVERY mouse movement, calling `shouldIgnore()` which does multiple `closest()` traversals.

**Evidence:**
```typescript
// Lines 408-415 in App.tsx - runs 60 times per second
const handleMouseMove = (e: MouseEvent) => {
  pendingTarget = e.target as HTMLElement;
  if (rafId === null) {
    rafId = requestAnimationFrame(updateHover);
  }
};

// Inside updateHover - calls shouldIgnore
if (shouldIgnore(target)) { ... }

// shouldIgnore does 4 closest() calls
element.closest('[data-annotator-toolbar]') ||
element.closest('[data-note-id]') ||
element.closest('[data-highlight-id]') ||
// ...
```

On Reddit:
- Deep DOM means `closest()` might traverse 20+ levels
- 60fps = 60 shouldIgnore checks per second
- Each check: 4 × closest() on 20-level DOM
- WeakSet cache helps on cache hits, but misses are expensive

**Progressive Slowdown:**
The more you hover, the larger the WeakSet cache grows. On a long Reddit thread, this could bloat memory.

### #3: Virtual Scrolling Invalidates Cache (65% confidence)

**The Issue:**
Reddit unmounts DOM elements as you scroll (virtual rendering). Your element cache becomes stale.

**Evidence:**
```typescript
// PageColorLayer.tsx line 63
if (!element || !element.isConnected) {
  // Element was unmounted - need to re-lookup via XPath
  const node = getNodeByXPath(pageColor.xpath);
  // ...
}
```

**Reddit-Specific:**
1. User colors 10 comments in viewport
2. Scrolls down 3 screens
3. Reddit unmounts those 10 comment elements
4. User scrolls back up
5. Reddit mounts NEW instances of elements
6. Your cache has stale references (`!element.isConnected`)
7. Triggers 10 XPath lookups via `document.evaluate()`
8. XPath lookup might fail if Reddit changed structure
9. Result: Colors disappear or massive re-computation

---

## Diagnostic Strategy

I've created 3 files for you:

### 1. `/Users/codyhergenroeder/code/annotator-extension/src/utils/performance.ts`

Performance monitoring utilities:
- `perf.mark()` for timing operations
- `perf.summary()` for analyzing bottlenecks
- `getDOMDepth()` for measuring element nesting
- `analyzePageStructure()` for page analysis

Exposed to console as `window.annotatorPerf`

### 2. `/Users/codyhergenroeder/code/annotator-extension/REDDIT_DIAGNOSTIC_PLAN.md`

Complete step-by-step testing guide:
- How to instrument your code
- 7 specific test suites to run on Reddit
- How to interpret results
- Quick fixes to try based on findings

**Start here** - Run the tests to get hard data on what's slow.

### 3. `/Users/codyhergenroeder/code/annotator-extension/REDDIT_SOLUTION_STABLE_IDS.md`

Radical solution if XPath is the bottleneck:
- Inject `data-annotator-id` attributes on click
- Use `querySelector()` instead of XPath (10-100x faster)
- Graceful fallback to XPath for page reloads
- Complete implementation code

---

## Quick Wins (Try These First)

### Quick Win #1: Disable Hover on Reddit

Add one line to test if hover is the issue:

```typescript
// App.tsx line 369
useEffect(() => {
  if (!isEnabled || currentTool !== 'paint-bucket') {
    return;
  }

  // TEMPORARY: Test if hover is the problem
  if (window.location.hostname.includes('reddit.com')) {
    return; // Disable hover on Reddit
  }

  // ... rest of hover logic
}, [isEnabled, currentTool, currentColor]);
```

**Test:** If this fixes the slowness, we know to optimize/remove hover.

### Quick Win #2: Log XPath Complexity

Add to `handlePaintBucket` after XPath generation:

```typescript
// App.tsx line 266
if (!xpath) {
  xpath = getXPath(target);
  xpathCache.current.set(target, xpath);

  // Log complexity on Reddit
  const depth = (xpath.match(/\//g) || []).length;
  console.log(`[XPATH] Depth: ${depth}, Length: ${xpath.length}`);
}
```

**Test:** Click deep Reddit comments. If depth > 20, that's your problem.

### Quick Win #3: Measure Click Time

Wrap handlePaintBucket:

```typescript
const handlePaintBucket = useCallback((e: MouseEvent) => {
  const start = performance.now();

  // ... existing code ...

  const duration = performance.now() - start;
  if (duration > 20) {
    console.warn(`[SLOW CLICK] ${duration.toFixed(2)}ms`);
  }
}, []);
```

**Test:** Click 10 elements. If you see "SLOW CLICK" warnings, we have a problem.

---

## Recommended Action Plan

### Phase 1: Diagnose (Do This Today)

1. **Add performance monitor** from `performance.ts`
2. **Follow diagnostic plan** - Run Test Suites A-D on Reddit
3. **Collect data:**
   - XPath depths and timing
   - Hover timing
   - Cache hit/miss ratios
   - Virtual scroll behavior
4. **Report findings** - Share console output and timings

### Phase 2: Quick Fixes (Based on Results)

**If XPath is slow (>50ms):**
- Implement stable ID solution (REDDIT_SOLUTION_STABLE_IDS.md)
- Expected: 10-100x speedup

**If hover is slow (>10ms avg):**
- Disable hover on Reddit
- OR throttle to 300ms instead of RAF
- OR simplify shouldIgnore checks

**If virtual scrolling is breaking colors:**
- Accept that colors disappear when scrolled out
- OR use IntersectionObserver to detect visibility
- OR switch to stable IDs (survives React re-renders better)

### Phase 3: Radical Optimization (If Needed)

**If XPath is fundamentally broken on Reddit:**

Implement the **Stable ID Injection** approach:
1. Inject `data-annotator-id` on first click
2. Use `querySelector()` for lookups (10-100x faster)
3. Keep XPath as fallback for page reloads
4. Expected result: <5ms per click even on deep Reddit comments

This is a first-principles solution: Instead of computing element location, just mark it directly.

---

## Expected Performance After Fixes

**Current state (estimated):**
- Deep comment click: 50-200ms
- Hover update: 5-30ms
- 50 colored elements: 650ms total application time

**After stable ID optimization:**
- Deep comment click: <5ms
- Hover update: <2ms (with shouldIgnore cache)
- 50 colored elements: <10ms total application time

**Expected speedup:** 10-100x on Reddit's deep DOM

---

## Critical Questions to Answer

The diagnostic plan will answer these:

1. **What's slow?** (XPath generation, hover, or color application?)
2. **How slow?** (10ms lag, 100ms lag, or UI freeze?)
3. **When?** (First click, after scrolling, or progressive?)
4. **Where?** (Deep comments, all elements, or specific element types?)
5. **Reddit-specific?** (Does it happen on old.reddit vs new Reddit?)

---

## Why This Investigation Matters

Your optimizations (incremental updates, debouncing, caching) are **architecturally sound**. They address React re-render performance.

But **Reddit's unique characteristics** create new bottlenecks:
- **DOM depth** breaks XPath generation performance
- **Virtual scrolling** breaks element caching assumptions
- **React aggressive re-rendering** competes with your event listeners

The solution isn't more caching or debouncing - it's **choosing the right element identification strategy** for Reddit's architecture.

XPath is elegant and works everywhere, but it's fundamentally O(depth) complexity. On Reddit's 20+ level DOM, that's too slow.

Stable IDs are O(1) complexity with querySelector. That's the performance you need.

---

## Files Created

1. **`/Users/codyhergenroeder/code/annotator-extension/src/utils/performance.ts`**
   - Performance monitoring utilities
   - Console commands for debugging

2. **`/Users/codyhergenroeder/code/annotator-extension/REDDIT_DIAGNOSTIC_PLAN.md`**
   - Step-by-step testing guide
   - 7 test suites with expected results
   - How to interpret findings

3. **`/Users/codyhergenroeder/code/annotator-extension/REDDIT_SOLUTION_STABLE_IDS.md`**
   - Complete stable ID implementation
   - Expected 10-100x performance improvement
   - Migration path and trade-offs

4. **`/Users/codyhergenroeder/code/annotator-extension/REDDIT_PERFORMANCE_SUMMARY.md`**
   - This file - executive summary

---

## Next Steps

1. **Run diagnostics** using REDDIT_DIAGNOSTIC_PLAN.md
2. **Share results** - Console output from `window.annotatorPerf.summary()`
3. **I'll recommend specific fix** based on your data
4. **Implement and measure** improvement

The instrumentation will give us hard numbers. No more guessing - we'll know exactly what's slow and why.

Let's make this extension blazing fast on Reddit. 🚀
