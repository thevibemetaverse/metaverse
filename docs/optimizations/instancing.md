# Instancing Optimizations

## Overview
Instancing optimizations focus on rendering multiple instances of similar objects with minimal overhead, reducing draw calls and memory usage. Since portals share the same base model with different properties, instancing can significantly improve performance while preserving their core purpose as interactive game entry points.

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
- Creates separate geometry for each portal instance
- Duplicates model data even though the base model is identical
- Has individual draw calls for portal elements that could be instanced
- Creates separate materials for each portal instance
- Renders UI elements individually despite similar structures

## Optimization Opportunities

### 1. Portal Model Instancing
**Description**: Use instanced rendering for the base portal model structure.

**Steps**:
1. Convert portal model to use `InstancedMesh` from ThreeJS for core structure, ensuring individual portal collision areas remain distinct for traversal.
2. Set up instance matrices for position, rotation, and scale using `instancedMesh.setMatrixAt(index, matrix)`, maintaining accurate positioning for player interaction.
3. Implement unique instance attributes for portal-specific properties (e.g., color, ID) with `InstancedBufferAttribute`, preserving visual distinction of game image areas.
4. Add instance update system for portal changes by updating only modified instance data, ensuring no impact on interaction mechanics.
5. Test to ensure instancing does not interfere with portal traversal or collision detection.

**Expected Impact**: Dramatic reduction in draw calls for portal base models

**Risk Level**: Low-Medium - ThreeJS provides robust support for `InstancedMesh`, reducing implementation errors

**Implementation Complexity**: Medium

**Metrics to Track**:
- Draw call count before/after (target: 70-80% reduction for portal models)
- GPU time per frame (target: 15-20% reduction)
- Memory usage for geometry (target: 50% reduction in geometry buffer size)
- Tools: Use `renderer.info.render.calls` in ThreeJS for draw call stats
- **Behavior Check**: Verify player can walk through portals post-instancing without issues.

### 2. Like Button Instancing
**Description**: Use instancing for like button elements across all portals.

**Steps**:
1. Convert like button geometry to use `InstancedMesh` in ThreeJS, ensuring buttons remain interactive and visually distinct near portals.
2. Set up matrix transformations for button positions with `instancedMesh.setMatrixAt(index, matrix)`, aligning correctly with portal positions.
3. Implement instance attributes for button states (liked/not liked) using `InstancedBufferAttribute`, maintaining clear visual feedback.
4. Update instance buffer only when like state changes to minimize GPU updates, ensuring responsiveness at close range (within 10-15 units).
5. Test to ensure like button functionality and visibility are preserved near portals.

**Expected Impact**: Reduced draw calls for UI elements

**Risk Level**: Low - UI elements follow consistent patterns

**Implementation Complexity**: Low

**Metrics to Track**:
- Draw call reduction for UI elements (target: 60-70% reduction)
- Interaction responsiveness (target: maintain under 100ms response time)
- Memory usage for UI geometry (target: 40% reduction)
- Tools: Use Chrome DevTools Performance panel for interaction timing
- **Behavior Check**: Confirm like button interaction works correctly post-instancing.

### 3. Portal Name/Info Instancing
**Description**: Implement instanced rendering for portal name plates and info signs.

**Steps**:
1. Create shared geometry for name plates and info signs using `BufferGeometry`, ensuring high detail for legibility within 10 units.
2. Set up `InstancedMesh` for consistent elements in ThreeJS, maintaining individual orientation for nameplates (facing same as portal).
3. Use texture atlas or instance attributes (`InstancedBufferAttribute`) for text differences, prioritizing clarity of name and info sign content.
4. Update instance data only when portal information changes to optimize performance, ensuring immediate updates for critical info.
5. Test to ensure nameplate orientation and info sign readability are preserved post-instancing.

**Expected Impact**: Reduced draw calls for informational elements

**Risk Level**: Medium - Must ensure text legibility is maintained

**Implementation Complexity**: Medium

**Metrics to Track**:
- Draw call reduction (target: 50-60% for info elements)
- Text readability comparison (target: no noticeable degradation at 10 units distance)
- Memory usage for text/info elements (target: 30-40% reduction)
- Tools: Use visual inspection and `renderer.info.memory.geometries`
- **Behavior Check**: Verify nameplate orientation and info sign clarity post-instancing.

### 4. Portal Effect Instancing
**Description**: Instance common particle effects and visual elements across portals.

**Steps**:
1. Identify shared visual effects across portals (e.g., glow, shimmer), ensuring effects do not obscure key elements like game images.
2. Convert particle systems to instanced implementations using `InstancedMesh` or custom shaders, maintaining visual quality at close range (10-15 units).
3. Use instance attributes (`InstancedBufferAttribute`) to control effect variations like intensity or color, preserving portal-specific visual cues.
4. Add distance-based effect detail control to disable or simplify effects beyond a threshold (e.g., 20 units), ensuring no interference with nearby interaction.
5. Test to ensure effects do not obstruct visibility of game images, nameplates, or info signs.

**Expected Impact**: Reduced overhead for visual effects

**Risk Level**: Medium - Effects need to maintain distinct appearance

**Implementation Complexity**: Medium

**Metrics to Track**:
- Particle count and rendering time (target: 50% reduction in rendering time)
- Draw call reduction (target: 40-50% for effects)
- Visual quality comparison (target: minimal degradation at close range)
- Tools: Use Chrome DevTools for GPU timing
- **Behavior Check**: Confirm effects do not interfere with visibility of key portal elements.

### 5. Hybrid Instancing System
**Description**: Implement a system that combines instancing with LOD for optimal performance.

**Steps**:
1. Create instanced versions of each LOD level using `InstancedMesh` for high, medium, and low detail, ensuring high detail for key elements within 10-15 units.
2. Dynamically assign portals to LOD groups based on distance (e.g., high detail 0-10 units, medium 10-20, low 20+), prioritizing game image and UI clarity at close range.
3. Update instance groups when camera moves, minimizing buffer updates, ensuring seamless transitions for player interaction.
4. Optimize instance buffers for minimal updates by using dirty flags for changed instances, maintaining responsiveness.
5. Test to ensure LOD transitions do not affect portal traversal or visibility of critical elements at interaction distances.

**Expected Impact**: Optimal combination of LOD and instancing benefits

**Risk Level**: High - Complex implementation with multiple interacting systems

**Implementation Complexity**: High

**Metrics to Track**:
- Overall frame rate improvement (target: 20-25% additional FPS)
- System complexity vs. performance gain (target: justify with metrics)
- Memory usage patterns (target: monitor for minimal increase)
- Tools: Use custom FPS monitoring scripts
- **Behavior Check**: Verify portal interaction and visual integrity post-hybrid implementation.

### 6. GPU Instance Culling
**Description**: Implement GPU-based culling for portal instances.

**Steps**:
1. Add visibility buffer to instance data using a custom `InstancedBufferAttribute`, ensuring culling does not prematurely hide portals near the player.
2. Implement frustum culling on the CPU to update visibility buffer with `Frustum` and `Box3` from ThreeJS, adding a buffer zone for portals just outside view to prevent pop-in during traversal.
3. Use instance visibility to skip rendering invisible portals via shader logic or instance count adjustment, maintaining visibility for portals within interaction range (10-15 units).
4. Add occlusion culling for dense portal arrangements as a secondary step, using raycasting if WebGL 2.0 queries are unavailable, ensuring no false negatives for nearby portals.
5. Test to ensure culling does not interfere with portal visibility or interaction during player movement.

**Expected Impact**: Efficient rendering of only visible portals

**Risk Level**: Medium - Requires careful implementation to prevent flickering

**Implementation Complexity**: Medium

**Metrics to Track**:
- CPU time for culling calculations (target: under 1ms per frame)
- GPU rendering time (target: 10-15% reduction)
- Visible vs. total portals rendered (target: render only 50-60% of total in dense scenes)
- Tools: Use `performance.now()` for timing measurements
- **Behavior Check**: Confirm portals remain visible and interactive during player movement post-culling.

## Implementation Priority
1. Portal Model Instancing - Highest impact optimization
2. Like Button Instancing - Easy win with clear benefits
3. Portal Name/Info Instancing - Good balance of impact vs. complexity
4. Portal Effect Instancing - Significant for effect-heavy scenes
5. GPU Instance Culling - Improves efficiency of instancing system
6. Hybrid Instancing System - Advanced optimization for maximum performance, dependent on basic instancing and LOD systems 