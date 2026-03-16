# Reddit Performance Diagnostic Plan

## Quick Start

1. **Add instrumentation**: Import the performance monitor in your components
2. **Run tests**: Follow the test plan below on Reddit
3. **Analyze results**: Use console commands to see bottlenecks
4. **Apply fixes**: Implement the recommended optimizations

---

## Step 1: Add Instrumentation

### In `src/components/App.tsx`

Add this import at the top:
```typescript
import { perf, isReddit, getDOMDepth } from '../utils/performance';
```

### Instrument `handlePaintBucket` (around line 229)

Replace the function with this instrumented version:

```typescript
const handlePaintBucket = useCallback((e: MouseEvent) => {
  const perfTimer = perf.mark('paintBucket.total');
  const { currentColor, setAnnotations } = stateRef.current;
  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;

  // Log DOM depth on Reddit
  if (isReddit()) {
    const depth = getDOMDepth(target);
    if (depth > 15) {
      console.log(`[DEEP DOM] Clicking element at depth ${depth}`);
    }
  }

  // Handle existing annotations
  const noteDiv = target.closest('[data-note-id]');
  if (noteDiv) {
    const noteId = noteDiv.getAttribute('data-note-id');
    if (noteId) {
      setAnnotations((prev) =>
        prev.map((a) => a.id === noteId && a.type === 'note' ? { ...a, color: currentColor } : a)
      );
      perfTimer.end();
      return;
    }
  }

  const highlightSpan = target.closest('[data-highlight-id]');
  if (highlightSpan) {
    const highlightId = highlightSpan.getAttribute('data-highlight-id');
    if (highlightId) {
      setAnnotations((prev) =>
        prev.map((a) => a.id === highlightId && a.type === 'highlight' ? { ...a, color: currentColor } : a)
      );
      perfTimer.end();
      return;
    }
  }

  // Color page element
  const ignoreTimer = perf.mark('paintBucket.shouldIgnore');
  if (shouldIgnore(target)) {
    ignoreTimer.end();
    perfTimer.end();
    return;
  }
  ignoreTimer.end();

  try {
    // Use cached XPath if available
    const xpathTimer = perf.mark('paintBucket.xpath');
    let xpath = xpathCache.current.get(target);

    if (!xpath) {
      const genTimer = perf.mark('paintBucket.xpath.generate');
      xpath = getXPath(target);
      genTimer.end();

      xpathCache.current.set(target, xpath);

      // Analyze XPath complexity on Reddit
      if (isReddit()) {
        const analysis = perf.analyzeXPath(xpath);
        if (analysis.depth > 15) {
          console.log('[XPATH COMPLEXITY]', analysis, xpath.substring(0, 100) + '...');
        }
      }
    } else {
      perf.mark('paintBucket.xpath.cached').end();
    }
    xpathTimer.end();

    const modificationType = getColorType(target);

    const stateTimer = perf.mark('paintBucket.setState');
    setAnnotations((prev) => {
      // Check if this element already colored
      const existing = prev.find((a) => a.type === 'page-color' && (a as any).xpath === xpath);

      if (existing) {
        // Update color
        return prev.map((a) => a.id === existing.id ? { ...a, color: currentColor } : a);
      } else {
        // Create new
        const pageColor: any = {
          id: `page-color-${Date.now()}-${Math.random()}`,
          type: 'page-color',
          xpath,
          color: currentColor,
          modificationType,
          timestamp: Date.now(),
        };
        return [...prev, pageColor];
      }
    });
    stateTimer.end();
  } catch (error) {
    console.error('[PAINT BUCKET ERROR]', error);
  }

  perfTimer.end();
}, []);
```

### Instrument hover preview (around line 378)

Replace `updateHover` function:

```typescript
const updateHover = () => {
  const hoverTimer = perf.mark('hover.update');
  rafId = null;
  if (!pendingTarget) {
    hoverTimer.end();
    return;
  }

  const target = pendingTarget;
  pendingTarget = null;

  // Skip if same element
  if (lastHoverElement === target) {
    hoverTimer.end();
    return;
  }

  // Clear previous hover
  if (lastHoverElement) {
    lastHoverElement.style.outline = '';
    lastHoverElement.style.outlineOffset = '';
  }

  // Skip ignored elements
  const ignoreTimer = perf.mark('hover.shouldIgnore');
  if (shouldIgnore(target)) {
    ignoreTimer.end();
    lastHoverElement = null;
    hoverTimer.end();
    return;
  }
  ignoreTimer.end();

  // Add hover outline
  target.style.outline = `2px dashed ${currentColor}`;
  target.style.outlineOffset = '2px';
  lastHoverElement = target;
  hoverTimer.end();
};
```

### In `src/components/PageColorLayer.tsx`

Add import:
```typescript
import { perf } from '../utils/performance';
```

Replace the useEffect (around line 23) with:

```typescript
useEffect(() => {
  const effectTimer = perf.mark('PageColorLayer.effect');
  const appliedColors = appliedColorsRef.current;
  const elementCache = elementCacheRef.current;

  // Create a set of current XPaths for efficient lookup
  const currentXPaths = new Set(pageColors.map(pc => pc.xpath));
  const currentColorsMap = new Map(pageColors.map(pc => [pc.xpath, pc]));

  // Track metrics
  let removed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let xpathLookups = 0;
  let xpathLookupsFailed = 0;

  // STEP 1: Remove colors that are no longer in the list
  const removeTimer = perf.mark('PageColorLayer.remove');
  for (const [xpath, colorState] of appliedColors.entries()) {
    if (!currentXPaths.has(xpath)) {
      const { element, property, originalColor, originalImportant } = colorState;

      // Restore original style
      if (element && element.isConnected) {
        if (originalColor) {
          element.style.setProperty(property, originalColor, originalImportant ? 'important' : '');
        } else {
          element.style.removeProperty(property);
        }
        element.removeAttribute('data-page-color-id');
      }

      appliedColors.delete(xpath);
      elementCache.delete(xpath);
      removed++;
    }
  }
  removeTimer.end();

  // STEP 2: Apply new or changed colors (incremental updates only)
  const applyTimer = perf.mark('PageColorLayer.apply');
  pageColors.forEach((pageColor) => {
    const cached = appliedColors.get(pageColor.xpath);

    // Skip if already applied with same color and element still exists
    if (cached && cached.color === pageColor.color && cached.element.isConnected) {
      cacheHits++;
      return;
    }

    cacheMisses++;

    try {
      // Get element (use cache if available and still connected)
      let element = elementCache.get(pageColor.xpath);
      if (!element || !element.isConnected) {
        xpathLookups++;
        const lookupTimer = perf.mark('PageColorLayer.xpathLookup');
        const node = getNodeByXPath(pageColor.xpath);
        const lookupDuration = lookupTimer.end();

        if (lookupDuration > 10) {
          console.warn(`[SLOW XPATH LOOKUP] ${lookupDuration}ms for xpath:`, pageColor.xpath.substring(0, 80));
        }

        if (!node || !(node instanceof HTMLElement)) {
          // Cleanup stale cache entries
          xpathLookupsFailed++;
          elementCache.delete(pageColor.xpath);
          appliedColors.delete(pageColor.xpath);
          return;
        }
        element = node;
        elementCache.set(pageColor.xpath, element);
      }

      const property = pageColor.modificationType === 'text' ? 'color' : 'backgroundColor';

      // Store original value only if not already cached
      let originalColor = cached?.originalColor;
      let originalImportant = cached?.originalImportant;

      if (!cached) {
        originalColor = element.style.getPropertyValue(property);
        originalImportant = element.style.getPropertyPriority(property) === 'important';
      }

      // Apply color with !important to override site CSS
      element.style.setProperty(property, pageColor.color, 'important');
      element.setAttribute('data-page-color-id', pageColor.id);

      // Update cache
      appliedColors.set(pageColor.xpath, {
        element,
        color: pageColor.color,
        property,
        originalColor: originalColor || '',
        originalImportant: originalImportant || false,
      });

    } catch (error) {
      // Silent error - element may have been removed from DOM
      elementCache.delete(pageColor.xpath);
      appliedColors.delete(pageColor.xpath);
    }
  });
  applyTimer.end();

  const totalDuration = effectTimer.end();

  // Log summary if slow or on Reddit
  if (totalDuration > 20 || xpathLookupsFailed > 0) {
    console.log(
      `[PageColorLayer] ${totalDuration.toFixed(1)}ms | ` +
      `${pageColors.length} colors | ` +
      `${cacheHits} hits, ${cacheMisses} misses | ` +
      `${xpathLookups} lookups (${xpathLookupsFailed} failed) | ` +
      `${removed} removed`
    );
  }

  // Cleanup on unmount: restore ALL colors
  return () => {
    for (const [xpath, colorState] of appliedColors.entries()) {
      const { element, property, originalColor, originalImportant } = colorState;
      if (element && element.isConnected) {
        if (originalColor) {
          element.style.setProperty(property, originalColor, originalImportant ? 'important' : '');
        } else {
          element.style.removeProperty(property);
        }
        element.removeAttribute('data-page-color-id');
      }
    }
    appliedColors.clear();
    elementCache.clear();
  };
}, [pageColors]);
```

---

## Step 2: Test on Reddit

### Test Suite A: Basic Performance

1. Open any Reddit thread (new Reddit)
2. Open DevTools console
3. Type `window.annotatorPerf.clear()` to reset metrics
4. Color 5 different elements (mix of comments, post title, etc.)
5. Type `window.annotatorPerf.summary()` to see timing breakdown

**What to look for:**
- Is `paintBucket.xpath.generate` > 50ms?
- Is `hover.shouldIgnore` > 10ms?
- Any "DEEP DOM" or "XPATH COMPLEXITY" warnings?

### Test Suite B: Deep Comment Threads

1. Find a heavily nested comment chain (4-5+ levels deep)
2. Clear metrics: `window.annotatorPerf.clear()`
3. Color a deeply nested comment
4. Check console for XPath complexity warnings
5. Run `window.annotatorPerf.summary()`

**What to look for:**
- XPath depth > 20?
- XPath length > 500 characters?
- Generation time > 100ms?

### Test Suite C: Virtual Scrolling

1. Color 10 comments in the current viewport
2. Scroll down until they're completely out of view
3. Wait 5 seconds
4. Scroll back up
5. Check console for XPath lookup logs

**What to look for:**
- "SLOW XPATH LOOKUP" warnings?
- Are the colors still there?
- PageColorLayer logs showing failed lookups?

### Test Suite D: Hover Stress Test

1. Activate paint bucket tool
2. Clear metrics: `window.annotatorPerf.clear()`
3. Rapidly move mouse over 30+ different elements
4. Run `window.annotatorPerf.summary()`

**What to look for:**
- `hover.update` average > 5ms?
- `hover.shouldIgnore` average > 2ms?
- Any p95 times > 20ms?

### Test Suite E: Click Spam

1. Clear metrics
2. Rapidly click 20 different elements in quick succession (within 5 seconds)
3. Run `window.annotatorPerf.summary()`

**What to look for:**
- Ratio of `paintBucket.xpath.cached` vs `paintBucket.xpath.generate`
- Total time for `paintBucket.total`
- Any localStorage write warnings?

### Test Suite F: Old vs New Reddit

1. Test on `old.reddit.com` - repeat Test Suite A
2. Test on `new.reddit.com` - repeat Test Suite A
3. Compare XPath depths and timings

**What to look for:**
- Is old Reddit faster?
- XPath complexity differences?

### Test Suite G: Page Structure Analysis

1. Open Reddit thread
2. Run `window.analyzePageStructure()` in console
3. Note the maxDepth and avgDepth

**What to look for:**
- maxDepth > 30? (Very deep DOM)
- totalElements > 5000? (Heavy page)

---

## Step 3: Interpret Results

### Scenario 1: XPath Generation is Slow (>50ms)

**Diagnosis:** Reddit's deep DOM is killing XPath performance

**Solutions:**
- Implement Option A: Stable ID injection (recommended)
- OR: Add depth limit to getXPath (quick fix)
- OR: Switch to CSS selector-based identification

### Scenario 2: Hover is Slow (>10ms average)

**Diagnosis:** shouldIgnore checks or style manipulation is too heavy

**Solutions:**
- Disable hover preview on Reddit specifically
- Throttle more aggressively (300ms instead of RAF)
- Simplify shouldIgnore checks

### Scenario 3: XPath Lookups Failing After Scroll

**Diagnosis:** Reddit's virtual rendering is unmounting elements

**Solutions:**
- Implement IntersectionObserver (Option B)
- Accept that colors disappear when scrolled out
- Use stable IDs that survive remounts

### Scenario 4: High Cache Misses

**Diagnosis:** React re-renders or WeakMap getting cleared

**Solutions:**
- Switch from WeakMap to Map with manual cleanup
- Increase cache size
- Add better cache invalidation logic

---

## Step 4: Quick Fixes to Try

### Fix 1: Disable Hover on Reddit

Add to hover effect in App.tsx (line 369):

```typescript
useEffect(() => {
  if (!isEnabled || currentTool !== 'paint-bucket') {
    return;
  }

  // Disable hover on Reddit - it's too slow
  if (isReddit()) {
    return;
  }

  // ... rest of hover logic
}, [isEnabled, currentTool, currentColor]);
```

### Fix 2: Limit XPath Depth

Add to getXPath in xpath.ts:

```typescript
export function getXPath(node: Node, maxDepth: number = 25): string {
  let depth = 0;

  function recurse(node: Node): string {
    if (++depth > maxDepth) {
      console.warn('[XPATH] Max depth exceeded, using fallback');
      // Fallback: use simple selector
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        return `//*[@data-annotator-fallback="${Date.now()}"]`;
      }
      return '';
    }

    // ... existing getXPath logic, but call recurse() instead of getXPath()
  }

  return recurse(node);
}
```

### Fix 3: Increase shouldIgnore Cache Lifetime

In App.tsx, remove the cache clearing:

```typescript
const shouldIgnore = useCallback((element: HTMLElement): boolean => {
  // Check cache first
  if (ignoredElementsCache.current.has(element)) return true;
  if (validElementsCache.current.has(element)) return false;

  // Perform check
  const isIgnored =
    element.closest('[data-annotator-toolbar]') ||
    element.closest('[data-note-id]') ||
    element.closest('[data-highlight-id]') ||
    ['script', 'style', 'meta', 'link', 'noscript', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase());

  // Cache result (removed periodic clearing)
  if (isIgnored) {
    ignoredElementsCache.current.add(element);
  } else {
    validElementsCache.current.add(element);
  }

  return isIgnored;
}, []);
```

---

## Console Commands Reference

Once instrumentation is added:

```javascript
// View performance summary
window.annotatorPerf.summary()

// Clear metrics
window.annotatorPerf.clear()

// Disable monitoring
window.annotatorPerf.disable()

// Enable monitoring
window.annotatorPerf.enable()

// Analyze page structure
window.analyzePageStructure()

// Get raw timing data
window.annotatorPerf.getTimings()
```

---

## Expected Results

**Good performance:**
- paintBucket.total < 20ms average
- hover.update < 5ms average
- XPath depth < 15
- Cache hit rate > 80%

**Problem indicators:**
- paintBucket.xpath.generate > 50ms
- XPath depth > 20
- Many "SLOW XPATH LOOKUP" warnings
- PageColorLayer showing high failed lookup count
- Hover p95 > 30ms

---

## Next Steps After Testing

1. Report findings in this format:
   - Which tests showed slowness?
   - What were the specific timing numbers?
   - Did old.reddit.com vs new Reddit differ?
   - Were there XPath complexity warnings?

2. I'll recommend specific fixes based on results

3. We'll implement the fix and re-test to measure improvement

---

## Critical Questions to Answer

1. **When is it slow?** (hover, click, or both?)
2. **How slow?** (50ms lag, 500ms lag, or UI freeze?)
3. **Consistent or progressive?** (always slow vs gets slower over time?)
4. **Scroll-related?** (does it get worse after scrolling?)
5. **Thread size?** (happens on all threads or just long ones?)

The instrumentation will give us hard numbers to answer these questions.
