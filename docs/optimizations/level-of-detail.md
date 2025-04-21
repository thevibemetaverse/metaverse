# Level of Detail (LOD) Implementations

## Overview
Level of Detail (LOD) optimizations focus on dynamically adjusting the complexity of portals based on their distance from the camera. By reducing detail for distant objects, we can significantly improve performance while maintaining visual quality where it matters most, preserving the core purpose of portals as interactive game entry points.

## Core Rules for Portal Optimization
To ensure optimizations do not break expected behavior, the following rules must be followed:
1. **Preserve Portal Interaction**: Optimizations must not interfere with players walking through portals to visit games. Collision detection and traversal mechanics must remain intact.
2. **Maintain Visual Integrity of Key Elements**: The central game image, nameplate, and info sign must remain visible and legible within 10 units. Quality reductions must prioritize these elements.
3. **Ensure Nameplate Orientation**: The nameplate must face the same direction as the portal for readability from approach angles.
4. **Protect Info Sign Information**: Info sign must clearly display multiplayer and custom avatar support status without clarity loss.
5. **Prioritize Close-Range Quality**: Highest visual and functional quality within 10-15 units for interaction.
6. **Test Functional Behavior Post-Optimization**: Test traversal, nameplate visibility, and info sign readability after each change.

## Current Implementation Analysis
The current portal system:
- Uses the same high-detail model for all portals regardless of distance
- Applies complex shaders uniformly across all portals
- Has some mobile optimizations but lacks a comprehensive LOD system
- Creates detailed text and UI elements even for distant portals
- Runs particle effects and animations at full quality regardless of visibility

## Optimization Opportunities

### 1. Portal Model LOD System
**Description**: Create multiple detail levels for portal models that switch based on distance.

**Steps**:
1. Create 2-3 detail levels for the portal model (high, medium, low) using tools like Blender or `simplify-js` for geometry reduction, ensuring high detail preserves game image area and collision frame.
2. Implement distance-based LOD switching in the `PortalManager` using the `LOD` class from ThreeJS, prioritizing high detail within 10-15 units for interaction.
3. Add smooth transitions between LOD levels to prevent popping by using alpha blending or dithering techniques, ensuring no visual disruption during player approach.
4. Optimize each LOD level for its viewing distance (e.g., high detail: 0-10 units, medium: 10-20 units, low: 20+ units), maintaining structural integrity for traversal at all levels.
5. Test to ensure LOD changes do not affect portal traversal or visibility of key elements at close range.

**Expected Impact**: Reduced polygon count and rendering time for distant portals

**Risk Level**: Medium - Care needed to maintain visual consistency across LOD levels

**Implementation Complexity**: Medium

**Metrics to Track**:
- Polygon count in the scene (target: 60-70% reduction for distant portals)
- Frame rate improvement at various distances (target: 15-20% FPS increase)
- Visual consistency between LOD transitions (target: no noticeable popping)
- Tools: Use `renderer.info.render.triangles` for polygon stats
- **Behavior Check**: Verify portal interaction and game image clarity post-LOD implementation.

### 2. Shader Complexity Reduction
**Description**: Dynamically adjust shader complexity based on portal distance from camera.

**Steps**:
1. Create tiered shader versions (high, medium, low complexity) by simplifying fragment and vertex shaders, ensuring high complexity preserves game image rendering within 10-15 units.
2. Implement distance-based shader switching using custom logic or material swapping in ThreeJS, maintaining high-quality shaders for close-range interaction.
3. Reduce or eliminate expensive effects (e.g., reflections, refractions) for distant portals beyond 20 units, prioritizing visual clarity for nearby portals.
4. Optimize shader uniforms and calculations for each distance tier by minimizing dynamic inputs, ensuring no impact on key element rendering.
5. Test to ensure shader reductions do not degrade visibility of game images, nameplates, or info signs at interaction distances.

**Expected Impact**: Reduced GPU load when viewing multiple portals

**Risk Level**: Medium - May affect visual appearance if not carefully balanced

**Implementation Complexity**: Medium

**Metrics to Track**:
- GPU time spent in fragment shaders (target: 20% reduction for distant portals)
- Frame rate improvement (target: 10-15% FPS increase)
- Visual quality comparison (target: minimal degradation at medium range)
- Tools: Use Chrome DevTools Performance panel for GPU timing
- **Behavior Check**: Confirm visual integrity of key portal elements post-shader optimization.

### 3. UI Element LOD
**Description**: Simplify or hide UI elements (like buttons, text) for distant portals.

**Steps**:
1. Create simplified versions of portal labels and UI elements (e.g., lower resolution textures, fewer polygons), ensuring full detail for nameplates and info signs within 10-15 units.
2. Implement distance thresholds for UI detail levels (e.g., full detail: 0-10 units, simplified: 10-20 units, hidden: 20+ units), prioritizing legibility at interaction range.
3. Merge or batch very distant UI elements using `BufferGeometryUtils.mergeBufferGeometries()`, maintaining individual rendering for close-range clarity.
4. Add visibility toggling for extremely distant elements (beyond 30 units) using `object.visible = false`, ensuring no toggling within interaction range.
5. Test to ensure nameplate orientation and info sign readability are preserved at close range.

**Expected Impact**: Reduced draw calls and texture usage for UI elements

**Risk Level**: Low - Elements are already difficult to read at distance

**Implementation Complexity**: Low

**Metrics to Track**:
- Draw call reduction (target: 50-60% for UI elements at distance)
- Text element count (target: 70% reduction beyond 20 units)
- Frame rate improvement when viewing many portals (target: 5-10% FPS increase)
- Tools: Use `renderer.info.render.calls` for draw call stats
- **Behavior Check**: Verify nameplate and info sign clarity post-LOD adjustment.

### 4. Particle Effect LOD
**Description**: Adjust particle count and complexity based on distance and visibility.

**Steps**:
1. Implement distance-based particle count reduction (e.g., full particles: 0-10 units, 50% count: 10-20 units), ensuring effects do not obscure key elements at close range.
2. Simplify particle physics for distant effects by reducing update frequency or disabling physics beyond 20 units, maintaining visual appeal near portals.
3. Disable particle effects beyond certain distances (e.g., 30 units) using `particleSystem.visible = false`, ensuring no disablement within interaction range.
4. Add simplified billboard replacements for very distant effects using a single `Sprite` per effect, verifying no interference with portal visibility.
5. Test to ensure particle effects do not obstruct game images, nameplates, or info signs at interaction distances.

**Expected Impact**: Reduced CPU/GPU load for particle simulations

**Risk Level**: Low - Distant particles have minimal visual impact

**Implementation Complexity**: Low

**Metrics to Track**:
- Particle count in scene (target: 70% reduction beyond 20 units)
- CPU time spent on particle updates (target: 50% reduction)
- Visual impact assessment (target: no noticeable loss at close range)
- Tools: Use `performance.now()` for CPU timing
- **Behavior Check**: Confirm particle effects do not interfere with key element visibility.

### 5. Adaptive LOD Based on Performance
**Description**: Dynamically adjust LOD levels based on current system performance.

**Steps**:
1. Implement frame rate monitoring system using `performance.now()` to calculate FPS over a 1-second window.
2. Create dynamic LOD distance thresholds that adjust based on performance (e.g., if FPS < 30, increase LOD distances by 20%), ensuring high detail within 10-15 units unless performance is critically low.
3. Add global quality setting that affects all LOD transitions, configurable via user settings or device detection, prioritizing close-range quality.
4. Implement gradual quality recovery when performance improves (e.g., decrease LOD distances by 10% per second if FPS > 60), maintaining interaction quality.
5. Test to ensure adaptive changes do not compromise portal interaction or visibility of key elements during player movement.

**Expected Impact**: Consistent frame rates across different devices and scenarios

**Risk Level**: Medium - Must balance responsiveness with visual stability

**Implementation Complexity**: High

**Metrics to Track**:
- Frame rate stability (target: standard deviation under 5 FPS)
- LOD transition frequency (target: less than 1 transition per second)
- Performance consistency across devices (target: 30+ FPS on mid-range mobile)
- Tools: Use custom FPS monitoring scripts
- **Behavior Check**: Verify portal functionality and visual clarity post-adaptive LOD changes.

### 6. Billboard Replacement for Distant Portals
**Description**: Replace very distant portals with simple billboard textures.

**Steps**:
1. Create billboard representations of portals using a pre-rendered texture or snapshot of the portal, capturing key visual elements like game image if possible.
2. Implement distance threshold for billboard swap (e.g., beyond 30 units) using custom logic or `LOD` class, ensuring full model within interaction range (10-15 units).
3. Ensure proper orientation toward camera with `billboard.lookAt(camera.position)` in ThreeJS, mimicking portal facing for consistency.
4. Add smooth transition between full model and billboard using alpha blending if supported, preventing visual disruption during approach.
5. Test to ensure billboard swap does not mislead players or affect interaction when approaching portals.

**Expected Impact**: Dramatic reduction in geometry for very distant portals

**Risk Level**: Medium - May be noticeable if threshold is too aggressive

**Implementation Complexity**: Medium

**Metrics to Track**:
- Polygon count reduction (target: 80-90% for distant portals)
- Draw call reduction (target: 70% for billboards)
- Visual comparison at transition points (target: minimal popping)
- Tools: Use `renderer.info.render.triangles` for geometry stats
- **Behavior Check**: Confirm billboard transitions do not confuse players or hinder portal interaction.

## Implementation Priority
1. Portal Model LOD System - Fundamental building block for other LOD strategies
2. Billboard Replacement for Distant Portals - Significant optimization for far-away objects with high impact
3. Shader Complexity Reduction - High impact for GPU performance
4. UI Element LOD - Quick win with minimal visual impact
5. Particle Effect LOD - Good performance improvement for complex effects
6. Adaptive LOD Based on Performance - Advanced implementation after other LOD systems 