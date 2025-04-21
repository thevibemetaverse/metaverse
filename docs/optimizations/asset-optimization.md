# Asset Optimization

## Overview
Asset optimization focuses on reducing the complexity, size, and loading time of 3D models, textures, and other assets used in the portal system. By optimizing these core assets, we can improve both load times and runtime performance while preserving the core purpose of portals as interactive game entry points.

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
- Uses potentially high-poly models for all portals
- Loads individual texture files for each portal
- May include unnecessary geometry detail
- Has complex shader materials
- Creates new textures dynamically for text elements
- Uses multiple image formats with varying optimization levels

## Optimization Opportunities

### 1. Portal Model Optimization
**Description**: Optimize the base portal 3D model to reduce polygon count while maintaining visual quality.

**Steps**:
1. Analyze current portal model for polygon count and complexity using a tool like Blender.
2. Create optimized version with reduced vertex count (target: reduce from ~10,000 to ~2,000 polygons) and simplified geometry.
3. Remove hidden or unnecessary geometry, ensuring the portal's interactive frame and collision area remain intact for player traversal.
4. Use `BufferGeometry` in ThreeJS for efficient geometry storage and rendering.
5. Ensure collision detection still works with optimized model by updating bounding boxes or physics shapes to match the portal's entry area.
6. Verify that the optimized model maintains structural integrity for the central game image display area to preserve visual purpose.

**Expected Impact**: Reduced memory usage and faster rendering for each portal

**Risk Level**: Low - Visual impact can be minimized with careful optimization

**Implementation Complexity**: Low

**Metrics to Track**:
- Polygon count reduction (target: 80% reduction)
- Model file size reduction (target: 50% smaller file size)
- Visual comparison before/after using side-by-side screenshots (ensure game image area remains clear)
- Frame rate improvement (target: 10-15% FPS increase on mid-range devices)
- Tools: Use Chrome DevTools for frame rate and memory tracking
- **Behavior Check**: Test player traversal through portal post-optimization to ensure no interaction issues.

### 2. Texture Compression and Optimization
**Description**: Apply optimal compression and format selection for all portal textures.

**Steps**:
1. Analyze current texture formats and sizes using browser dev tools or image analysis software.
2. Convert textures to optimal WebGL-friendly formats like KTX2 using Basis Universal compression with `KTX2Loader` from ThreeJS.
3. Apply appropriate compression based on texture content (e.g., higher compression for backgrounds, lower for UI elements like game images and info signs to maintain legibility).
4. Reduce texture resolution for elements that don't need high detail (e.g., from 2048x2048 to 1024x1024 for non-critical textures), prioritizing game image and nameplate clarity within 10 units.
5. Verify that compressed textures for game images, nameplates, and info signs remain legible at close range (within 10 units).

**Expected Impact**: Reduced memory usage and faster texture loading

**Risk Level**: Low - Modern compression formats preserve quality well

**Implementation Complexity**: Low

**Metrics to Track**:
- Texture memory usage (target: 50% reduction in GPU memory)
- Load time improvement (target: 30% faster texture loading)
- Visual quality comparison using visual diff tools or side-by-side images (focus on game image and info sign clarity)
- Tools: Use `renderer.info.memory.textures` in ThreeJS for memory stats
- **Behavior Check**: Confirm nameplate and info sign readability post-compression.

### 3. Image Atlas Creation
**Description**: Combine multiple portal images into optimized texture atlases.

**Steps**:
1. Group portal images by size and type for efficient packing, prioritizing game images for quality.
2. Create texture atlases for each group using a tool like `texture-packer` or manually in Photoshop, ensuring game images and UI elements (nameplates, info signs) are placed for high clarity.
3. Update UV coordinates in materials to reference atlas regions using `BufferGeometry.attributes.uv` in ThreeJS, maintaining correct mapping for key elements.
4. Implement mipmapping and compression for atlases with `texture.generateMipmaps = true`, with minimal compression on game images and info signs.
5. Verify that atlas mapping does not distort or reduce legibility of game images, nameplates, or info signs at close range (within 10 units).

**Expected Impact**: Reduced texture switches and memory fragmentation

**Risk Level**: Medium - Requires careful UV coordinate mapping

**Implementation Complexity**: Medium

**Metrics to Track**:
- Number of texture bindings (target: reduce by 70%)
- Memory usage for textures (target: 40% reduction)
- Texture loading time (target: 20% faster)
- Tools: Use Chrome DevTools Performance panel for binding counts
- **Behavior Check**: Test visibility and clarity of game images, nameplates, and info signs post-atlas creation.

### 4. Shader Asset Optimization
**Description**: Optimize and minify shader code to improve compilation and runtime performance.

**Steps**:
1. Analyze current shader complexity and size.
2. Remove unused uniforms and varying variables, ensuring shaders for game image display and UI elements remain functional.
3. Optimize math operations and simplify calculations, prioritizing visual quality for portals within 10-15 units.
4. Create pre-compiled shader variants for common cases, with high-quality variants for close-range rendering of key elements.
5. Test shader changes to ensure no visual degradation of central game image or UI elements at interaction distances.

**Expected Impact**: Faster shader compilation and execution

**Risk Level**: Medium - Shader optimization can affect visual appearance

**Implementation Complexity**: Medium

**Metrics to Track**:
- Shader compilation time
- GPU time in fragment/vertex shaders
- Visual quality comparison (focus on game image and nameplate clarity)
- **Behavior Check**: Verify game image rendering quality post-optimization.

### 5. 3D Text Mesh Optimization
**Description**: Replace dynamic canvas-based text with optimized 3D text meshes.

**Steps**:
1. Create optimized 3D text meshes for portal names and info, ensuring legibility for nameplates and info signs.
2. Implement text mesh sharing for common text elements, maintaining correct orientation for nameplates (facing same direction as portal).
3. Optimize geometry for text meshes, prioritizing clarity within 10 units.
4. Add LOD for text elements based on distance, ensuring full detail for nameplates and info signs within interaction range (10-15 units).
5. Verify that nameplate orientation and info sign readability are preserved post-optimization.

**Expected Impact**: Reduced canvas operations and draw calls

**Risk Level**: Medium - Text appearance may change

**Implementation Complexity**: Medium

**Metrics to Track**:
- Canvas operation reduction
- Memory usage for text elements
- Text rendering time
- **Behavior Check**: Confirm nameplate orientation and info sign clarity post-optimization.

### 6. Asset Loading Optimization
**Description**: Implement progressive and prioritized loading of portal assets.

**Steps**:
1. Create asset loading priority system based on visibility, prioritizing assets for portals within 15 units for immediate interaction.
2. Implement progressive loading for textures (low-res to high-res), ensuring game images and UI elements load high-res first at close range.
3. Add asset streaming for portals as they become visible, maintaining placeholder visuals that preserve portal frame for traversal.
4. Implement preloading for likely-to-be-seen portals based on player movement direction, ensuring seamless interaction.
5. Test to ensure placeholders do not interfere with portal traversal or mislead players about portal functionality.

**Expected Impact**: Faster initial scene load time, better resource distribution

**Risk Level**: Low - Improves loading without affecting final appearance

**Implementation Complexity**: Medium

**Metrics to Track**:
- Initial scene load time
- Time to interactive
- Texture loading progression
- **Behavior Check**: Verify portal traversal remains possible during loading phases.

## Implementation Priority
1. Portal Model Optimization - Fundamental optimization with immediate benefits
2. Texture Compression and Optimization - High impact with relatively low effort
3. Image Atlas Creation - Significant memory and performance benefits
4. Asset Loading Optimization - Improves perceived performance
5. Shader Asset Optimization - Important for GPU performance
6. 3D Text Mesh Optimization - Specialized optimization for text-heavy portals 