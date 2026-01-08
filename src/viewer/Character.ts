import characterList from 'magia-exedra-character-three/getStyle3dCharacterMstList.json'
import type { CharacterResource } from 'magia-exedra-character-three'
import { ObjFilterByKey } from 'magia-exedra-character-three/utils'

/*
examples:
../models/chara_100101_battle_unit/chara_100101_battle_unit.fbx
../models/chara_100107_battle_unit/chara_100107_battle_unit.fbx
*/
const allModels = import.meta.glob('../../node_modules/magia-exedra-character-three/models/**/*.fbx*', { as: 'url', eager: true })
/*
examples:
../models/chara_100101_battle_unit/chara_100101_acc_color.png (hair accessories)
../models/chara_100101_battle_unit/chara_100101_body_color.png
../models/chara_100101_battle_unit/chara_100101_face_color.png
../models/chara_100101_battle_unit/chara_100101_hair_color.png
../models/chara_100101_battle_unit/chara_100101_weapon_a_color.png (there may be weapon_b, c, ...)
*/
const allTextures = import.meta.glob('../../node_modules/magia-exedra-character-three/models/**/*.png', { as: 'url', eager: true })

Object.assign(window, { allModels, allTextures })
console.log('All models:', allModels)
console.log('All textures:', allTextures)

export function getCharacterIdList() {
    return Object.keys(allModels).map(x => x.match(/chara_(\d+).*\//)![1])
}

export function getCharacterNameById(id: number | string): string {
    if (typeof id == 'number') id = id.toString()
    return characterList.payload.mstList.find(x => x.resourceName.includes(id))?.name
        || {
            '100101': 'Madoka Kaname (Magical Girl)',
            '100102': 'Madoka Kaname (School Uniform)',
        }[id]
        || 'Unknown'
}

export function getCharacterResourceById(id: number | string): CharacterResource {
    return {
        fbxPathUrl: ObjFilterByKey(allModels, x => new RegExp(`chara_${id}.*\/`).test(x)),
        texturePathUrl: ObjFilterByKey(allTextures, x => new RegExp(`chara_${id}.*\/`).test(x)),
    }
}
