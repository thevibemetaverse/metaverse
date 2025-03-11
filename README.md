# Metaverse Walking Simulator

A satirical walking simulator set in a simplified "metaverse" environment where all users appear as identical avatars, reflecting the meme's commentary on virtual reality platforms.

## Features

- Identical Mark Zuckerberg avatars for all players (for maximum satirical effect)
- First-person and third-person camera options
- Simple movement controls (WASD/arrow keys, spacebar for jumping)
- Low-poly world with recognizable landmarks (Eiffel Tower, Sagrada Familia)
- Multiplayer support with real-time player position updates
- Minimalistic UI with player list and emoji reactions

## Technical Implementation

- Built with Three.js for 3D rendering
- WebSocket-based multiplayer using Socket.io
- Vite for fast development and building

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

### Development

To run the development server:

```bash
# Start the game client
npm run dev
# or
yarn dev

# In a separate terminal, start the multiplayer server
node server.js
```

The game will open in your default browser at `http://localhost:8080`.

### Building for Production

To build the project for production:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Controls

- **W/A/S/D or Arrow Keys**: Move
- **Mouse**: Look around
- **Spacebar**: Jump
- **V**: Toggle between first-person and third-person views
- **Settings Button (⚙️)**: Open settings panel
- **Emoji Buttons**: Send emoji reactions

## 3D Models

The project uses 3D models for landmarks and avatars in the metaverse.

### Supported Formats

- **GLB/GLTF** (recommended): Efficient format for web use, supports materials, textures, and animations
- **OBJ**: Alternative format, often with separate MTL files for materials

### Avatar Model

All players appear as identical Mark Zuckerberg avatars for satirical effect:

1. Place your Zuckerberg model in `public/assets/models/zuckerberg.gltf` or `zuckerberg.glb`
2. The model should be low-poly and in a T-pose for best results
3. See `public/assets/models/README-zuckerberg.md` for detailed specifications

### Landmark Models

For the Eiffel Tower and other landmarks:

1. Place your 3D model files in the `public/assets/models/` directory
2. For the Eiffel Tower, use:
   - `eiffel_tower.glb` or `eiffel_tower.gltf` (preferred)
   - `eiffel_tower.obj` and `eiffel_tower.mtl` (alternative)
3. The code includes fallback mechanisms if models fail to load

See `public/assets/models/README.md` for more detailed instructions on finding and using 3D models.

## Technical Notes

- The game uses WebGL for rendering through Three.js
- Player positions are synchronized in real-time using Socket.io
- The environment is intentionally simplified with low-poly models
- All avatars are identical by design (part of the satire)

## Performance Considerations

- The game targets 60 FPS on desktop and 30 FPS on mobile
- Graphics quality can be adjusted in the settings menu
- Asset loading is optimized for faster initial experience
- Use low-poly models (under 10,000 polygons) for better performance 