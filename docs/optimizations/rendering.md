# Rendering Optimizations

## Overview
Rendering optimizations aim to reduce GPU and CPU workload by selectively rendering portals based on visibility and importance, while preserving the core purpose of portals as interactive game entry points. These techniques ensure that only necessary elements are processed, maintaining performance in dense portal areas.

## Core Rules for Portal Optimization
To ensure optimizations do not break expected behavior, the following rules must be followed:
1. **Preserve Portal Interaction**: Optimizations must not interfere with players walking through portals to visit games. Collision detection and traversal mechanics must remain intact.
2. **Maintain Visual Integrity of Key Elements**: The central game image, nameplate, and info sign must remain visible and legible within 10 units. Quality reductions must prioritize these elements.
3. **Ensure Nameplate Orientation**: The nameplate must face the same direction as the portal for readability from approach angles.
4. **Protect Info Sign Information**: Info sign must clearly display multiplayer and custom avatar support status without clarity loss.
5. **Prioritize Close-Range Quality**: Highest visual and functional quality within 10-15 units for interaction.
6. **Test Functional Behavior Post-Optimization**: Test traversal, nameplate visibility, and info sign readability after each change.

## Current Implementation Analysis
The current portal rendering system:
- Renders all portals in the scene regardless of visibility
- Uses uniform render distances without prioritization
- Applies full shader effects to all portals
- Lacks advanced culling techniques beyond basic frustum culling on mobile
- Does not account for device capabilities in rendering decisions

## Optimization Opportunities

### 1. Frustum Culling Implementation
**Description**: Only render portals within the camera's view frustum to avoid processing invisible objects.

**Steps**:
1. Implement frustum culling using `Frustum` and `Box3` classes from ThreeJS to check portal bounding boxes against the camera frustum, ensuring key elements like game images are rendered within 10-15 units.
2. Update culling logic in the render loop to skip portals outside the view, maintaining interaction capability for portals just outside the frustum if near interaction range.
3. Add a small buffer zone (e.g., 10% beyond frustum edges) to prevent flickering during camera movement, prioritizing close-range portals.
4. Optimize bounding box calculations by caching results and updating only on portal or camera movement, ensuring no performance impact on interaction.
5. Test to ensure culling does not hide portals prematurely during player movement or affect traversal mechanics.

**Expected Impact**: Significant reduction in rendered objects

**Risk Level**: Low - Well-supported technique with predictable results

**Implementation Complexity**: Low

**Metrics to Track**:
- Number of portals rendered per frame (target: 50-60% reduction)
- Frame rate improvement in dense areas (target: 20-25% FPS increase)
- Culling accuracy (target: no visible portals culled incorrectly)
- Tools: Use `renderer.info.render.calls` for render stats
- **Behavior Check**: Verify portal interaction and visibility of key elements post-culling implementation.

### 2. Occlusion Culling System
**Description**: Avoid rendering portals blocked by other geometry using occlusion queries or simplified checks.

**Steps**:
1. Implement occlusion culling using `OcclusionQuery` in WebGL or a custom raycasting approach to detect blocked portals, ensuring key elements within 10-15 units are not culled prematurely.
2. Use hierarchical scene structure or bounding volume hierarchy (BVH) to quickly identify potential occluders, prioritizing close-range portal rendering.
3. Add conservative culling to prevent false negatives (e.g., render if unsure about occlusion), maintaining visibility of interaction elements.
4. Implement fallback method for devices without occlusion query support using simplified distance and angle checks, ensuring no loss of key portal features.
5. Test to ensure occlusion culling does not hide portals during traversal or affect visibility of game images, nameplates, or info signs.

**Expected Impact**: Reduced rendering of hidden portals in complex scenes

**Risk Level**: Medium - May have false positives/negatives

**Implementation Complexity**: High

**Metrics to Track**:
- Reduction in rendered portals (target: 30-40% in dense scenes)
- GPU query time (target: under 1ms per frame)
- Visual accuracy (target: less than 5% incorrect culling)
- Tools: Use Chrome DevTools for GPU timing
- **Behavior Check**: Confirm visual integrity and interaction capability post-occlusion culling.

### 3. Render Distance Management
**Description**: Limit rendering of portals beyond a certain distance from the camera.

**Steps**:
1. Implement dynamic render distance based on portal importance and scene density (e.g., render important portals up to 50 units, others up to 30 units), prioritizing full rendering within 10-15 units for interaction.
2. Add user-configurable render distance settings with sensible defaults based on device capability, ensuring key elements remain visible at close range.
3. Use simplified representations (e.g., billboards) for portals just beyond render distance before fully culling, maintaining visual cues for portal presence.
4. Optimize distance calculations by using squared distances to avoid square root operations, ensuring no performance impact on interaction.
5. Test to ensure render distance changes do not affect portal traversal or visibility of key elements during player approach.

**Expected Impact**: Reduced rendering load in large scenes

**Risk Level**: Low - Straightforward to implement and tune

**Implementation Complexity**: Low

**Metrics to Track**:
- Number of portals rendered at various distances (target: 60% reduction beyond 30 units)
- Frame rate improvement (target: 15-20% FPS increase)
- Visual continuity (target: no jarring appearance/disappearance)
- Tools: Use custom counters for portal stats
- **Behavior Check**: Verify portal functionality and key element clarity post-render distance adjustment.

### 4. Portal Importance Prioritization
**Description**: Prioritize rendering of important portals based on user interaction or game relevance.

**Steps**:
1. Assign importance scores to portals based on factors like recent interaction, game popularity, or user favorites, ensuring high-priority portals maintain full detail within 10-15 units.
2. Implement rendering tiers based on importance (e.g., high importance always rendered, low importance culled early), prioritizing interaction elements for high-importance portals.
3. Adjust culling and LOD thresholds dynamically for low-priority portals to save resources, maintaining full functionality for high-priority ones.
4. Add visual indicators for high-priority portals to justify their rendering preference (e.g., subtle glow), ensuring no obstruction of key elements.
5. Test to ensure prioritization does not affect traversal mechanics or visibility of key elements for any portal.

**Expected Impact**: Focused rendering resources on relevant portals

**Risk Level**: Medium - Requires careful balancing to avoid neglecting portals

**Implementation Complexity**: Medium

**Metrics to Track**:
- Rendered portal distribution by importance (target: 80% of high-importance portals always rendered)
- Frame rate in mixed-importance scenes (target: 10-15% FPS increase)
- User feedback on portal visibility (target: positive response)
- Tools: Use custom logging for importance stats
- **Behavior Check**: Confirm interaction and visual clarity for all portal priorities.

### 5. Adaptive Effects Based on Device Capability
**Description**: Adjust portal visual effects based on detected device performance.

**Steps**:
1. Implement device capability detection using browser APIs or benchmark tests at startup (e.g., test FPS with sample scene), setting conservative defaults to preserve interaction quality.
2. Create effect tiers for portals (e.g., full effects, reduced effects, no effects) mapped to device capability levels, ensuring key elements like game images remain clear on all tiers.
3. Dynamically disable expensive effects (e.g., particles, reflections) on low-end devices or during performance drops, prioritizing close-range quality within 10-15 units.
4. Allow user override of automatic settings via a quality slider or preferences, maintaining full functionality regardless of effect level.
5. Test to ensure effect reductions do not compromise visibility of game images, nameplates, or info signs on any device.

**Expected Impact**: Consistent performance across device ranges

**Risk Level**: Medium - Must ensure minimum visual quality

**Implementation Complexity**: Medium

**Metrics to Track**:
- Frame rate across device tiers (target: 30+ FPS on low-end mobile)
- Effect usage distribution (target: appropriate tier per device)
- User override frequency (target: less than 10% of users)
- Tools: Use analytics for device stats
- **Behavior Check**: Verify portal interaction and key element visibility across effect tiers.

### 6. Shadow Optimization for Portals
**Description**: Optimize shadow rendering to balance visual quality and performance.

**Steps**:
1. Implement selective shadow casting for portals based on distance (e.g., cast shadows only within 20 units), ensuring shadows do not obscure key elements like nameplates at close range.
2. Use low-resolution shadow maps for distant portals or disable shadows entirely beyond a threshold, maintaining shadow quality for interaction range (10-15 units).
3. Optimize shadow updates by freezing shadow maps for static portals until they move or light changes, ensuring no performance impact on interaction.
4. Add option for users to disable portal shadows entirely on low-end devices via settings, preserving core functionality.
5. Test to ensure shadow optimizations do not affect visual clarity of key portal elements or mislead players during traversal.

**Expected Impact**: Reduced GPU load from shadow calculations

**Risk Level**: Low - Shadows are secondary to core visuals

**Implementation Complexity**: Medium

**Metrics to Track**:
- Shadow rendering time (target: 30-40% reduction)
- Frame rate improvement (target: 5-10% FPS increase)
- Visual impact (target: minimal loss in scene depth)
- Tools: Use GPU profiling tools
- **Behavior Check**: Confirm shadows do not interfere with key element visibility or portal interaction.

## Implementation Priority
1. Frustum Culling Implementation - High impact with minimal risk
2. Occlusion Culling System - Advanced optimization for complex scenes
3. Render Distance Management - Significant performance gain for minimal work
4. Portal Importance Prioritization - Focused rendering resources on relevant portals
5. Adaptive Effects Based on Device Capability - Consistent performance across device ranges
6. Shadow Optimization for Portals - Reduced GPU load from shadow calculations 