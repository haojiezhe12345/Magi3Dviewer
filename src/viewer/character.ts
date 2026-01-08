import MagiaExedraCharacterThree from "magia-exedra-character-three"

export const characters = new MagiaExedraCharacterThree(
    import.meta.glob('../../node_modules/magia-exedra-character-three/models/**/*.fbx*', { as: 'url', eager: true }),
    import.meta.glob('../../node_modules/magia-exedra-character-three/models/**/*.png', { as: 'url', eager: true })
)

Object.assign(window, { characters })
console.log('All models:', characters.models)
console.log('All textures:', characters.textures)
