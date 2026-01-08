# magia-exedra-character-three

Load Magia Exedra 3D character models into three.js

## Usage

```ts
import MagiaExedraCharacterThree from "magia-exedra-character-three"

// Import all models
const characters = new MagiaExedraCharacterThree(import.meta.glob([
    '../node_modules/magia-exedra-character-three/models/**/*.fbx*',
    '../node_modules/magia-exedra-character-three/models/**/*.png'
], { query: '?url', import: 'default', eager: true }))

// Load character model
const character = await characters.loadCharacterById(100107) // 100107 = Madoka Kaname

// Add to three.js scene
scene.add(character.object)
```