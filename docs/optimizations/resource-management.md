# Resource Management Optimizations

## Overview
Resource management optimization focuses on how assets are loaded, cached, and shared across the portal system. The goal is to reduce memory usage and load times by implementing efficient resource sharing strategies.

## Current Implementation Analysis
The current portal system:
- Loads the same model for each portal instance
- Creates new textures and materials for each portal
- Contains redundant loading and initialization logic
- Lacks comprehensive texture/model caching
- Has limited resource disposal when portals are no longer needed

## Optimization Opportunities

### 1. Implement Model Caching
**Description**: Load the portal model once and reuse it across all portal instances.

**Steps**:
1. Create a central model cache in `PortalManager` using a JavaScript `Map` or object (e.g., `modelCache['portalModel'] = loadedModel`).
2. Load the model once during initialization using `GLTFLoader` or similar from ThreeJS.
3. Clone the model for each portal instead of reloading it, using `SkeletonUtils.clone()` if animations are involved.
4. Add cache miss handling for graceful fallback by reloading only if the model is not in cache.

**Expected Impact**: Reduced memory usage, faster portal initialization

**Risk Level**: Low - Minimal risk of breaking existing functionality

**Implementation Complexity**: Low

**Metrics to Track**:
- Memory usage before/after (target: 40-50% reduction in model memory)
- Portal initialization time (target: 60% faster)
- Total load time (target: 30% reduction for initial scene load)
- Tools: Use Chrome DevTools for memory profiling

### 2. Texture Atlas Implementation
**Description**: Combine portal textures into a texture atlas to reduce texture switches.

**Steps**:
1. Create a texture atlas containing all portal images using a tool like `texture-packer` or manual arrangement in an image editor.
2. Update shader to use UV coordinates to access the correct portal image by modifying `BufferGeometry.attributes.uv`.
3. Update portal creation to assign the correct UV coordinates to each portal based on atlas layout.
4. Add fallback for missing textures by using a default texture or color if atlas mapping fails.

**Expected Impact**: Reduced GPU memory usage, fewer texture bindings

**Risk Level**: Medium - May affect portal appearance if not implemented correctly

**Implementation Complexity**: Medium

**Metrics to Track**:
- GPU memory usage (target: 50% reduction for textures)
- Number of texture bindings (target: 70% reduction)
- FPS impact during portal rendering (target: 10% FPS increase)
- Tools: Use `renderer.info.memory.textures` for memory stats

### 3. Lazy Loading Strategy
**Description**: Only load portal resources when they come into view of the camera.

**Steps**:
1. Implement a distance-based loading system using camera position and portal distance calculations.
2. Add priority loading for nearby portals (e.g., load within 20 units first) using `LoadingManager` from ThreeJS.
3. Create low-detail placeholder representation for distant portals (e.g., simple `BoxGeometry` with basic material).
4. Add event listeners for camera movement to trigger loads when portals enter the loading radius.

**Expected Impact**: Reduced initial load time, better resource distribution

**Risk Level**: Medium - May cause pop-in effects if not properly implemented

**Implementation Complexity**: Medium

**Metrics to Track**:
- Initial scene load time (target: 40% reduction)
- Memory usage over time (target: gradual increase instead of spike)
- FPS when moving through the scene (target: maintain stability with <5% variance)
- Tools: Use Chrome DevTools for load timing

### 4. Centralized Resource Disposal
**Description**: Implement proper cleanup of unused resources to prevent memory leaks.

**Steps**:
1. Add explicit disposal methods for all portal resources using `geometry.dispose()`, `material.dispose()`, and `texture.dispose()` in ThreeJS.
2. Track resource references for proper cleanup by maintaining a resource registry in `PortalManager`.
3. Implement automatic garbage collection triggers when portals are removed or scene changes.
4. Add resource lifetime management based on portal usage (e.g., dispose after 5 minutes of invisibility).

**Expected Impact**: Reduced memory usage, fewer memory leaks

**Risk Level**: Low - Improves current implementation without changing behavior

**Implementation Complexity**: Low

**Metrics to Track**:
- Memory usage over time (target: no growth after prolonged use)
- Garbage collection frequency and duration (target: under 1ms per collection)
- Tools: Use `performance.memory` in Chrome for memory tracking

### 5. Shared Material System
**Description**: Implement material sharing for portal components with similar appearance.

**Steps**:
1. Identify common materials across portal elements (e.g., same color, shader type) via script or manual analysis.
2. Create a material library in `PortalManager` using a `Map` to store shared materials.
3. Reference materials from the library instead of creating new ones by assigning `object.material = materialLibrary.get(key)`.
4. Add material parameter configuration for minor variations using shader uniforms or texture swaps.

**Expected Impact**: Reduced memory usage, faster material initialization

**Risk Level**: Medium - May affect portal appearance if shared materials aren't properly configured

**Implementation Complexity**: Medium

**Metrics to Track**:
- Number of materials in the scene (target: 60% reduction)
- Memory usage (target: 30-40% reduction for materials)
- Material initialization time (target: 50% faster)
- Tools: Use `renderer.info.memory.textures` for material stats

## Implementation Priority
1. Model Caching - Highest impact with lowest risk
2. Centralized Resource Disposal - Important for stability
3. Lazy Loading Strategy - Complex but valuable for large scenes, high impact on initial load
4. Shared Material System - Good balance of impact vs. complexity
5. Texture Atlas Implementation - High impact but requires more work

### Tools
- Use Chrome DevTools for memory profiling
- Use `renderer.info.memory.textures` for memory stats
- Use `performance.memory` in Chrome for memory tracking 