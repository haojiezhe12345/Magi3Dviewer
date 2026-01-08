import MagiaExedraCharacter3D from './character'
import characterList from './getStyle3dCharacterMstList.json'
import { loadCharacter } from "./loader"
import { ObjFilterByKey } from './utils'

export default class MagiaExedraCharacterThree {
    files: Record<string, string>

    /**
     * Character resource manager  
     * Allows you to list characters and create instances from the given files
     * 
     * @param files An object of Path-URL records to FBX models and texture materials
     * 
     * @example
     * To use all the models shipped with the package:
     * ```
     * new MagiaExedraCharacterThree(import.meta.glob([
     *     '../path_to_node_modules/magia-exedra-character-three/models/**\/*.fbx*',
     *     '../path_to_node_modules/magia-exedra-character-three/models/**\/*.png'
     * ], { query: '?url', import: 'default', eager: true }))
     * ```
     * 
     * @example
     * To use only specific characters:
     * ```
     * new MagiaExedraCharacterThree(import.meta.glob([
     *     '../path_to_node_modules/magia-exedra-character-three/models/*chara_100101*\/*.fbx*',
     *     '../path_to_node_modules/magia-exedra-character-three/models/*chara_100101*\/*.png'
     * ], { query: '?url', import: 'default', eager: true }))
     * ```
     * Here, `chara_100101` refers to "Madoka Kaname (Magical Girl)".  
     * You can find character IDs in `node_modules/magia-exedra-character-three/getStyle3dCharacterMstList.json`.
     * 
     * During build, only the imported models will be bundled to `dist`, others will be tree-shaked.  
     * Importing only the models you need will significantly reduce `dist` size.
     * 
     * @example
     * You can also use your own models:
     * ```
     * new MagiaExedraCharacterThree({
     *     "chara_100101_battle_unit/VisualRoot.fbx": "http://localhost:4173/assets/VisualRoot.fbx-BQpKl_nK.txt",
     *     "../models/chara_100102/chara_100102.fbx.txt": "http://localhost:4173/assets/chara_100102.fbx-C7bwV_49.txt",
     *     "chara_100101/acc_color.png": "http://localhost:4173/assets/chara_100101_acc_color-DPp_iyGq.png",
     *     "/chara_100101_battle_unit/chara_100101_acc_ctrl.png": "http://localhost:4173/assets/chara_100101_acc_ctrl-DkjIVp5l.png",
     * })
     * ```
     */
    constructor(files: Record<string, string>) {
        this.files = files
    }

    getCharacterIdList() {
        return Object.keys(this.files)
            .filter(x => x.includes('.fbx'))
            .map(x => x.match(/chara_(\d+).*\//)![1])
    }

    getCharacterNameById(id: number | string): string {
        if (typeof id == 'number') id = id.toString()
        return characterList.payload.mstList.find(x => x.resourceName.includes(id))?.name
            || {
                '100101': 'Madoka Kaname (Magical Girl)',
                '100102': 'Madoka Kaname (School Uniform)',
            }[id]
            || 'Unknown'
    }

    /** Loads the FBX model and returns the character instance */
    async loadCharacterById(id: number | string, loadProgressCallback?: (progress: string) => any): Promise<MagiaExedraCharacter3D> {
        const files = ObjFilterByKey(this.files, x => new RegExp(`chara_${id}.*\/`).test(x))
        if (Object.keys(files).length == 0) throw new Error(`Could not find files for character "${id}"`)
        return new MagiaExedraCharacter3D(await loadCharacter(files, loadProgressCallback))
    }
}
