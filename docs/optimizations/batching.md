# Batching Strategies

## Overview
Batching optimizations focus on combining multiple draw calls into fewer, larger operations to reduce rendering overhead. By minimizing state changes and API calls, batching can significantly improve performance in scenes with many similar objects like portals, while preserving their core purpose as interactive game entry points.

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
- Creates multiple separate meshes for each portal
- Has individual draw calls for portal components (model, name, info sign, like button)
- Uses separate canvas contexts for text rendering
- Creates independent geometries for similar elements
- Performs material switches between similar objects

## Optimization Opportunities

### 1. Static Geometry Batching
**Description**: Combine static portal elements into unified geometry to reduce draw calls.

**Steps**:
1. Identify static, non-interactive portal components (e.g., portal frame, base structure), ensuring the interactive collision area for traversal remains unaffected.
2. Merge geometries of similar static elements using `BufferGeometryUtils.mergeBufferGeometries()` from ThreeJS.
3. Implement proper UV mapping for texture variations by updating `BufferGeometry.attributes.uv`, preserving mappings for game image areas.
4. Ensure proper material attribute handling for variations by assigning material indices correctly, maintaining distinct materials for key visual elements like game images.
5. Verify that batching does not alter the portal's collision detection or traversal functionality.

**Expected Impact**: Significant reduction in draw calls for static elements

**Risk Level**: Low - Static elements can be merged without functional changes

**Implementation Complexity**: Low

**Metrics to Track**:
- Draw call reduction (target: 50-60% fewer draw calls for static elements)
- Vertex and index buffer size (target: monitor for minimal increase)
- Rendering performance improvement (target: 10-15% FPS increase on mid-range devices)
- Tools: Use `renderer.info.render.calls` in ThreeJS for draw call stats
- **Behavior Check**: Test player traversal through portals post-batching to ensure interaction remains intact.

### 2. Dynamic Batching for UI Elements
**Description**: Batch similar UI elements that change infrequently.

**Steps**:
1. Group UI elements by material type (e.g., like buttons, info signs), prioritizing nameplates and info signs for individual handling if batching affects clarity.
2. Implement dynamic batching for elements with similar properties using a custom batching system or `BufferGeometry`, excluding critical elements if necessary.
3. Add update mechanism for when elements change, updating only affected attributes, ensuring info sign updates (e.g., multiplayer status) are reflected accurately.
4. Optimize batch updates to minimize rebatching by using dirty flags for changed elements, verifying no delay in critical UI updates.
5. Test to ensure nameplate orientation and info sign readability are unaffected by batching.

**Expected Impact**: Reduced draw calls for UI elements

**Risk Level**: Low - UI elements follow consistent patterns

**Implementation Complexity**: Medium

**Metrics to Track**:
- Draw call reduction for UI elements (target: 40-50% reduction)
- Rebatching frequency (target: less than 5% of frames require rebatching)
- Memory overhead of batching system (target: less than 5% increase)
- Tools: Use Chrome DevTools Performance panel for frame analysis
- **Behavior Check**: Confirm nameplate and info sign visibility and orientation post-batching.

### 3. Text Atlas Generation
**Description**: Pre-render text into a shared texture atlas to avoid multiple canvas operations.

**Steps**:
1. Create a text rendering system that outputs to a shared texture atlas using `CanvasRenderingContext2D`, prioritizing high clarity for nameplate and info sign text.
2. Convert the canvas to a `CanvasTexture` in ThreeJS for rendering.
3. Implement UV coordinate mapping for each portal's text by updating `BufferGeometry.attributes.uv`, ensuring accurate mapping for nameplates and info signs.
4. Update atlas only when text content changes using a dirty flag system, verifying immediate updates for critical info sign changes.
5. Implement texture compression for the atlas with `texture.format = THREE.RGBAFormat` and appropriate compression, minimizing compression on nameplate and info sign text to maintain legibility within 10 units.
6. Test to ensure nameplate orientation (facing same as portal) and text clarity are preserved.

**Expected Impact**: Reduced texture switches and canvas operations

**Risk Level**: Medium - Text legibility must be maintained

**Implementation Complexity**: Medium

**Metrics to Track**:
- Canvas operations before/after (target: 80% reduction in canvas draws)
- Memory usage for text textures (target: 50% reduction)
- Text rendering performance (target: 20% faster rendering of text elements)
- Tools: Use Chrome DevTools for canvas operation tracking
- **Behavior Check**: Verify nameplate orientation and info sign readability post-atlas generation.

### 4. Material Batching
**Description**: Minimize material switches by grouping objects with similar materials.

**Steps**:
1. Analyze material properties across all portals using a custom script or manual inspection.
2. Group materials with similar properties (e.g., same shader, similar textures), ensuring distinct materials for game images and critical UI elements are preserved for quality.
3. Create shared materials with parameter variations using `Material` clones in ThreeJS, maintaining unique materials for nameplates and info signs if needed.
4. Implement a material sorting and batching system in rendering by sorting objects by material ID before rendering, verifying no visual degradation of key elements.
5. Test to ensure game image clarity and UI element visibility are unaffected by material batching.

**Expected Impact**: Reduced material state changes during rendering

**Risk Level**: Medium - Visual consistency must be maintained

**Implementation Complexity**: Medium

**Metrics to Track**:
- Material state changes per frame (target: 60% reduction)
- GPU time spent in material setup (target: 10% reduction in GPU time)
- Memory usage for materials (target: monitor for minimal increase)
- Tools: Use `renderer.info.render.calls` for state change stats
- **Behavior Check**: Confirm visual integrity of game images and UI elements post-batching.

### 5. Mesh Merging for Portal Groups
**Description**: Merge portals in close proximity into larger meshes.

**Steps**:
1. Identify portal clusters based on proximity, ensuring individual portal collision areas remain distinct for traversal.
2. Merge geometries for portals in the same cluster, preserving unique geometry for interactive areas and key visual elements like game image frames.
3. Implement proper attribute handling for portal variations, maintaining distinct UVs and materials for game images and UI elements.
4. Add dynamic splitting/merging based on camera position, ensuring no interference with player interaction at close range (within 10-15 units).
5. Test to ensure portal traversal and individual portal identification remain functional post-merging.

**Expected Impact**: Significant draw call reduction in dense portal areas

**Risk Level**: Medium - Interaction handling becomes more complex

**Implementation Complexity**: High

**Metrics to Track**:
- Total mesh count in scene
- Draw call reduction
- Interaction responsiveness
- **Behavior Check**: Verify player can still walk through individual portals post-merging.

### 6. Atlas-Based Effect Batching
**Description**: Combine similar portal effects using texture atlases and batched geometry.

**Steps**:
1. Create texture atlases for effect textures, ensuring effects around key elements like game images remain visually distinct.
2. Implement shared particle systems with instance parameters, preserving unique effects for close-range portals (within 10-15 units).
3. Batch similar visual effects into unified systems, maintaining visual quality for nearby interactions.
4. Add variation parameters for unique appearances, ensuring no loss of visual cues for portal functionality.
5. Test to ensure effects do not obscure game images, nameplates, or info signs at interaction distances.

**Expected Impact**: Reduced draw calls and texture switches for effects

**Risk Level**: Medium - Effects must maintain visual distinctiveness

**Implementation Complexity**: High

**Metrics to Track**:
- Effect draw calls
- Texture binding operations
- Visual quality comparison
- **Behavior Check**: Confirm effects do not interfere with visibility of key portal elements.

## Implementation Priority
1. Text Atlas Generation - High impact on canvas operations, a common bottleneck
2. Static Geometry Batching - Easiest to implement with high impact
3. Material Batching - Good performance gain with moderate complexity
4. Dynamic Batching for UI Elements - Important for UI-heavy scenes
5. Mesh Merging for Portal Groups - Advanced optimization for dense portal areas
6. Atlas-Based Effect Batching - Significant for effect-heavy portals 