# Batching Strategies

## Overview
Batching optimizations focus on combining multiple draw calls into fewer, larger operations to reduce rendering overhead. By minimizing state changes and API calls, batching can significantly improve performance in scenes with many similar objects like portals.

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
1. Identify static, non-interactive portal components
2. Merge geometries of similar static elements
3. Implement proper UV mapping for texture variations
4. Ensure proper material attribute handling for variations

**Expected Impact**: Significant reduction in draw calls for static elements

**Risk Level**: Low - Static elements can be merged without functional changes

**Implementation Complexity**: Low

**Metrics to Track**:
- Draw call reduction
- Vertex and index buffer size
- Rendering performance improvement

### 2. Dynamic Batching for UI Elements
**Description**: Batch similar UI elements that change infrequently.

**Steps**:
1. Group UI elements by material type
2. Implement dynamic batching for elements with similar properties
3. Add update mechanism for when elements change
4. Optimize batch updates to minimize rebatching

**Expected Impact**: Reduced draw calls for UI elements

**Risk Level**: Low - UI elements follow consistent patterns

**Implementation Complexity**: Medium

**Metrics to Track**:
- Draw call reduction for UI elements
- Rebatching frequency
- Memory overhead of batching system

### 3. Text Atlas Generation
**Description**: Pre-render text into a shared texture atlas to avoid multiple canvas operations.

**Steps**:
1. Create a text rendering system that outputs to a shared texture atlas
2. Implement UV coordinate mapping for each portal's text
3. Update atlas only when text content changes
4. Implement texture compression for the atlas

**Expected Impact**: Reduced texture switches and canvas operations

**Risk Level**: Medium - Text legibility must be maintained

**Implementation Complexity**: Medium

**Metrics to Track**:
- Canvas operations before/after
- Memory usage for text textures
- Text rendering performance

### 4. Material Batching
**Description**: Minimize material switches by grouping objects with similar materials.

**Steps**:
1. Analyze material properties across all portals
2. Group materials with similar properties
3. Create shared materials with parameter variations
4. Implement a material sorting and batching system in rendering

**Expected Impact**: Reduced material state changes during rendering

**Risk Level**: Medium - Visual consistency must be maintained

**Implementation Complexity**: Medium

**Metrics to Track**:
- Material state changes per frame
- GPU time spent in material setup
- Memory usage for materials

### 5. Mesh Merging for Portal Groups
**Description**: Merge portals in close proximity into larger meshes.

**Steps**:
1. Identify portal clusters based on proximity
2. Merge geometries for portals in the same cluster
3. Implement proper attribute handling for portal variations
4. Add dynamic splitting/merging based on camera position

**Expected Impact**: Significant draw call reduction in dense portal areas

**Risk Level**: Medium - Interaction handling becomes more complex

**Implementation Complexity**: High

**Metrics to Track**:
- Total mesh count in scene
- Draw call reduction
- Interaction responsiveness

### 6. Atlas-Based Effect Batching
**Description**: Combine similar portal effects using texture atlases and batched geometry.

**Steps**:
1. Create texture atlases for effect textures
2. Implement shared particle systems with instance parameters
3. Batch similar visual effects into unified systems
4. Add variation parameters for unique appearances

**Expected Impact**: Reduced draw calls and texture switches for effects

**Risk Level**: Medium - Effects must maintain visual distinctiveness

**Implementation Complexity**: High

**Metrics to Track**:
- Effect draw calls
- Texture binding operations
- Visual quality comparison

## Implementation Priority
1. Static Geometry Batching - Easiest to implement with high impact
2. Material Batching - Good performance gain with moderate complexity
3. Dynamic Batching for UI Elements - Important for UI-heavy scenes
4. Text Atlas Generation - Significant for text-heavy portals
5. Atlas-Based Effect Batching - Important for effect-heavy portals
6. Mesh Merging for Portal Groups - Advanced optimization for dense portal areas 