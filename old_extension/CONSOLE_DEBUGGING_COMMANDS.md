# Console Debugging Commands - Quick Reference

Once you've added the performance instrumentation, use these console commands on Reddit to diagnose issues.

---

## Performance Monitoring

```javascript
// View performance summary (grouped by operation)
window.annotatorPerf.summary()

// Clear all timing data (run before tests)
window.annotatorPerf.clear()

// Temporarily disable monitoring
window.annotatorPerf.disable()

// Re-enable monitoring
window.annotatorPerf.enable()

// Get raw timing array
window.annotatorPerf.getTimings()

// Filter to specific operation
window.annotatorPerf.getTimings().filter(t => t.operation.includes('xpath'))
```

---

## Page Structure Analysis

```javascript
// Analyze current page DOM structure
window.analyzePageStructure()

// Example output:
// {
//   totalElements: 4523,
//   maxDepth: 28,
//   avgDepth: 12.4,
//   isReddit: true,
//   url: "https://www.reddit.com/r/..."
// }
```

---

## Manual Testing Workflow

### Test 1: Basic Performance

```javascript
// 1. Clear metrics
window.annotatorPerf.clear()

// 2. Activate paint bucket and color 5 elements
// (do this manually in UI)

// 3. View summary
window.annotatorPerf.summary()

// 4. Look for:
// - paintBucket.total average > 50ms? (SLOW)
// - paintBucket.xpath.generate > 20ms? (XPATH PROBLEM)
// - hover.update average > 10ms? (HOVER PROBLEM)
```

### Test 2: XPath Complexity

```javascript
// 1. Find a deeply nested Reddit comment (4+ levels)

// 2. Click it with paint bucket

// 3. Check console for logs:
// [XPATH COMPLEXITY] {depth: 22, length: 456, ...}
// [DEEP DOM] Clicking element at depth 23

// If depth > 20, XPath is your bottleneck
```

### Test 3: Virtual Scrolling

```javascript
// 1. Color 5 comments

// 2. Scroll down until they're out of view

// 3. Scroll back up

// 4. Check console for:
// [PageColorLayer] ... X xpath fallbacks, Y failed
// [STABLE ID] Re-injected after XPath lookup

// If many fallbacks/failures, virtual scrolling is breaking cache
```

### Test 4: Hover Performance

```javascript
// 1. Clear metrics
window.annotatorPerf.clear()

// 2. Activate paint bucket tool

// 3. Move mouse rapidly over 20+ elements

// 4. View summary
window.annotatorPerf.summary()

// 5. Check hover.update and hover.shouldIgnore
// Average > 5ms = problem
// p95 > 20ms = serious problem
```

---

## Interpreting Results

### Good Performance Indicators

```javascript
window.annotatorPerf.summary()

// Should see:
// operation              count  avg      max     p95
// paintBucket.total      10     8.45ms   15.2ms  12.1ms
// paintBucket.xpath.cached 8    0.12ms   0.23ms  0.19ms
// hover.update          145     1.23ms   4.51ms  2.87ms
// hover.shouldIgnore    145     0.34ms   1.12ms  0.89ms
```

**Key metrics:**
- ✅ paintBucket.total < 20ms average
- ✅ Most XPath lookups are cached
- ✅ hover.update < 5ms average
- ✅ No "SLOW" warnings in console

### Problem Indicators

```javascript
// BAD SIGNS:

// XPath generation is slow
// paintBucket.xpath.generate  15  127.3ms  245.1ms  189.4ms
// ❌ This means deep DOM is killing XPath performance

// Hover is slow
// hover.update  523  28.4ms  67.2ms  54.1ms
// ❌ Mouse movement is laggy

// Console shows:
[DEEP DOM] Clicking element at depth 28
[XPATH COMPLEXITY] {depth: 28, length: 782, hasPredicates: true}
[SLOW XPATH LOOKUP] 156.23ms for xpath: /html[1]/body[1]/div[1]...
// ❌ Reddit's DOM is too deep for XPath

// PageColorLayer shows failures:
[PageColorLayer] 234.5ms | 50 colors | 12 hits, 38 misses | 25 lookups (8 failed)
// ❌ Virtual scrolling is breaking element cache
```

---

## Advanced Debugging

### Check WeakMap Cache Size

```javascript
// You can't directly inspect WeakMaps, but you can test cache effectiveness

// 1. Click an element
// 2. Check console: Should see "paintBucket.xpath.generate"

// 3. Click same element again
// 4. Check console: Should see "paintBucket.xpath.cached"

// Cache is working if 2nd click uses cached version
```

### Manually Measure Operation

```javascript
// Measure any operation manually

const start = performance.now()
// ... do operation ...
const duration = performance.now() - start
console.log(`Duration: ${duration.toFixed(2)}ms`)
```

### Test querySelector vs XPath Speed

```javascript
// Find an element
const el = document.querySelector('div')

// Test querySelector
const qStart = performance.now()
for (let i = 0; i < 1000; i++) {
  document.querySelector('div')
}
const qDuration = performance.now() - qStart
console.log(`querySelector: ${qDuration}ms for 1000 iterations`)

// Test XPath
const xStart = performance.now()
for (let i = 0; i < 1000; i++) {
  document.evaluate('//div[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
}
const xDuration = performance.now() - xStart
console.log(`XPath: ${xDuration}ms for 1000 iterations`)

console.log(`XPath is ${(xDuration / qDuration).toFixed(1)}x slower`)
// On Reddit, expect 10-50x slower
```

### Measure DOM Depth of Element

```javascript
// Click element with paint bucket, then find it in console

const el = document.querySelector('[data-annotator-id]') // or any selector

let depth = 0
let current = el
while (current && current.parentElement) {
  depth++
  current = current.parentElement
  if (depth > 100) break
}

console.log(`Element depth: ${depth}`)
// On Reddit comments, expect 15-30
```

---

## Expected Results by Site

### Reddit (new)
```
totalElements: 3000-8000
maxDepth: 25-35
avgDepth: 12-18
Expect: XPath generation slow on deep comments
```

### Reddit (old.reddit.com)
```
totalElements: 1000-3000
maxDepth: 15-25
avgDepth: 8-12
Expect: Better performance than new Reddit
```

### Wikipedia
```
totalElements: 500-2000
maxDepth: 10-15
avgDepth: 6-10
Expect: Good performance with XPath
```

### GitHub
```
totalElements: 1000-4000
maxDepth: 12-20
avgDepth: 8-12
Expect: Decent performance, has stable IDs
```

---

## Quick Diagnostic Checklist

Run through this checklist on Reddit:

- [ ] `window.analyzePageStructure()` - Is maxDepth > 25?
- [ ] Color 10 elements - Any "SLOW CLICK" warnings?
- [ ] `window.annotatorPerf.summary()` - paintBucket.total > 50ms?
- [ ] Hover over 20 elements - Any lag?
- [ ] Scroll test - Do colors disappear?
- [ ] Check console - Any "XPATH COMPLEXITY" warnings?
- [ ] Check ratio - More cached or generated XPaths?

**If you answered YES to 3+ questions:** XPath is the bottleneck. Implement stable ID solution.

---

## Sharing Results

When reporting findings, share:

1. **Output of `window.annotatorPerf.summary()`**
2. **Output of `window.analyzePageStructure()`**
3. **Screenshot of console warnings**
4. **Subjective lag experience** (seconds of delay? UI freeze?)
5. **Reddit version** (new vs old)
6. **Scroll behavior** (do colors persist?)

This gives complete picture of the performance issue.

---

## Pro Tips

- Run `clear()` before each test to get clean data
- Use p95 (95th percentile) more than average - it shows worst-case UX
- Watch for progressive slowdown (getting slower over time = memory issue)
- Test on incognito to rule out other extension interference
- Compare old.reddit.com vs new Reddit
- Long threads (500+ comments) stress test better than short threads

---

## Common Issues and Solutions

### "window.annotatorPerf is undefined"

**Cause:** Performance monitoring not loaded yet

**Fix:** Make sure you imported performance.ts in your components:
```typescript
import { perf } from '../utils/performance';
```

### No timing data showing

**Cause:** Monitoring might be disabled

**Fix:**
```javascript
window.annotatorPerf.enable()
```

### Too much data to read

**Cause:** Thousands of timing entries

**Fix:**
```javascript
// Clear and start fresh
window.annotatorPerf.clear()
// Then run your test
```

### Cache hit rate seems low

**Cause:** Clicking different elements (cache only helps on re-click)

**Fix:** This is expected. XPath cache helps when updating color of already-clicked element. Focus on generation speed instead.

---

## Example Session

```javascript
// 1. Open Reddit thread
// 2. Open console

window.analyzePageStructure()
// Output: {totalElements: 5234, maxDepth: 32, avgDepth: 14.2, isReddit: true}
// 👆 Wow, depth 32! That's very deep.

window.annotatorPerf.clear()

// 3. Click 10 different elements with paint bucket
// Console shows:
// [DEEP DOM] Clicking element at depth 28
// [XPATH COMPLEXITY] {depth: 28, length: 645, complexity: 42}
// [SLOW CLICK] 156.72ms
// 👆 Confirmed: Deep DOM is killing performance

window.annotatorPerf.summary()
// Output:
// operation                    count  avg        max        p95
// paintBucket.total            10     134.23ms   245.11ms   198.45ms
// paintBucket.xpath.generate   10     127.89ms   241.34ms   195.12ms
// 👆 XPath generation is 95% of the time!

// 4. Diagnosis: XPath is the bottleneck
// 5. Solution: Implement stable ID injection
// 6. Expected improvement: 134ms → <5ms (25-50x speedup)
```

---

Use these commands to get hard data on what's slow. No more guessing!
