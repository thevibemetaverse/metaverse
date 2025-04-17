# Portal Performance Testing Framework

## Overview
This document outlines a standardized testing framework for measuring and validating performance improvements in the portal optimization project. Consistent testing methodology is critical for accurately assessing the impact of each optimization and ensuring that improvements don't introduce regressions.

## Testing Environment Setup

### Hardware Profiles
Tests should be conducted on the following device categories:

1. **High-End Desktop**
   - Modern GPU (RTX 3070+ or equivalent)
   - 16GB+ RAM
   - Current Chrome and Firefox browsers

2. **Mid-Range Desktop/Laptop**
   - Integrated GPU or mid-range dedicated GPU
   - 8GB RAM
   - Current Chrome and Firefox browsers

3. **Mobile - High End**
   - Latest iPhone or flagship Android device
   - Safari (iOS) and Chrome (Android)

4. **Mobile - Mid Range**
   - 2-3 year old mobile device
   - Safari (iOS) and Chrome (Android)

### Test Scene Configuration
Create standardized test scenes with controlled parameters:

1. **Portal Density Test**
   - Scene with 30 portals arranged in a grid
   - Camera path moving through the portal array
   - Fixed lighting and environmental conditions

2. **Portal Interaction Test**
   - Scene with 10 portals with interactive elements
   - Scripted interactions with like buttons and portal activations
   - Measures interaction responsiveness

3. **Portal Scaling Test**
   - Scenes with increasing portal counts (10, 30, 50, 100)
   - Fixed camera positions for measurement
   - Used to determine scaling characteristics

## Performance Metrics

### Primary Metrics
These metrics are the primary indicators of optimization success:

1. **Frame Rate (FPS)**
   - Average FPS over 60-second test runs
   - FPS stability (standard deviation)
   - Minimum FPS during test run

2. **Memory Usage**
   - Peak memory consumption
   - Stable memory usage after 5 minutes
   - Memory growth rate over time

3. **Loading Times**
   - Initial scene load time
   - Time to first interactive frame
   - Asset loading completion time

### Secondary Metrics

1. **CPU Performance**
   - JavaScript execution time per frame
   - Time spent in specific functions (portal updates, effects)
   - Garbage collection frequency and duration

2. **GPU Performance**
   - Draw calls per frame
   - Triangle count rendered
   - Texture memory usage
   - GPU time in vertex/fragment shaders

3. **Interaction Performance**
   - Time from click to visual response
   - Animation smoothness during interaction
   - UI element responsiveness

## Measurement Tools

### Browser Performance Tools
- Chrome DevTools Performance panel
- Firefox Performance Tools
- Safari Web Inspector

### Custom Instrumentation
Implement custom performance measurement code:

1. **FPS Counter**
   ```javascript
   const fpsMonitor = {
     frames: 0,
     lastTime: performance.now(),
     fpsHistory: [],
     
     tick() {
       this.frames++;
       const now = performance.now();
       if (now - this.lastTime >= 1000) {
         const fps = Math.round((this.frames * 1000) / (now - this.lastTime));
         this.fpsHistory.push(fps);
         this.frames = 0;
         this.lastTime = now;
         return fps;
       }
       return null;
     },
     
     getAverageFps() {
       return this.fpsHistory.length ? 
         this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length : 
         0;
     }
   };
   ```

2. **Memory Monitor**
   ```javascript
   const memoryMonitor = {
     memoryHistory: [],
     
     measure() {
       if (performance.memory) {
         const memory = {
           total: performance.memory.totalJSHeapSize,
           used: performance.memory.usedJSHeapSize,
           limit: performance.memory.jsHeapSizeLimit,
           timestamp: performance.now()
         };
         this.memoryHistory.push(memory);
         return memory;
       }
       return null;
     },
     
     getAverageMemory() {
       return this.memoryHistory.length ?
         this.memoryHistory.reduce((sum, m) => sum + m.used, 0) / this.memoryHistory.length :
         0;
     }
   };
   ```

3. **Performance Marker API**
   ```javascript
   const performanceMarker = {
     startMarker(name) {
       performance.mark(`${name}-start`);
     },
     
     endMarker(name) {
       performance.mark(`${name}-end`);
       performance.measure(name, `${name}-start`, `${name}-end`);
       const measures = performance.getEntriesByName(name);
       return measures.length ? measures[measures.length - 1].duration : 0;
     }
   };
   ```

## Testing Protocol

### Baseline Establishment
Before implementing any optimizations:

1. Run all test scenes on all hardware profiles
2. Collect all primary and secondary metrics
3. Record detailed information about the test environment
4. Store baseline results as reference points

### Per-Optimization Testing
For each individual optimization:

1. Implement the optimization in isolation when possible
2. Run the same test scenes on the same hardware
3. Compare results with baseline and previous optimizations
4. Document percentage improvements for each metric
5. Note any regressions or unexpected behaviors

### Visual Comparison
For each optimization that affects visual appearance:

1. Create screenshots from fixed camera positions
2. Compare before/after visual quality
3. Document any visual differences
4. Assess subjective quality impact

### Regression Testing
After implementing multiple optimizations:

1. Run full test suite periodically
2. Verify that combined optimizations maintain expected improvements
3. Check for unexpected interactions between optimizations
4. Monitor long-term stability

## Reporting Format

### Individual Optimization Report Template
```
# Optimization Report: [Optimization Name]

## Implementation Details
- Files changed: [list of files]
- Approach: [brief description]
- Complexity: [Low/Medium/High]

## Performance Impact
- Average FPS improvement: [percentage]
- Memory usage reduction: [percentage]
- Loading time improvement: [percentage]

## Device-Specific Results
- High-End Desktop: [summary]
- Mid-Range Desktop: [summary]
- Mobile High-End: [summary]
- Mobile Mid-Range: [summary]

## Visual Impact
- Quality assessment: [description]
- Screenshots: [before/after comparison links]

## Issues and Limitations
- [list any known issues or limitations]

## Recommendations
- [suggestions for further improvement]
```

### Cumulative Progress Report
Generate weekly reports showing:

1. Cumulative performance improvements across all metrics
2. Progress toward overall project goals
3. Identified bottlenecks and remaining issues
4. Updated priorities based on findings

## Automation
Automate as much of the testing process as possible:

1. Create test runner scripts for consistent execution
2. Implement automatic metric collection and storage
3. Generate comparison reports automatically
4. Set up visual regression testing for screenshots

## Conclusion
Following this testing framework will ensure consistent, reliable measurement of portal optimization efforts. The data collected will guide prioritization decisions, validate optimization approaches, and provide clear evidence of performance improvements. 