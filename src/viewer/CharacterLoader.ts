import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { channel2AlphaMap, imageData2Texture, input2ImageData, mixImage, parseCtrlMap } from './Texture';

/*
examples:
../models/chara_100101_battle_unit/chara_100101_battle_unit.fbx
../models/chara_100107_battle_unit/chara_100107_battle_unit.fbx
*/
const allModels = import.meta.glob(`../models/**/*.fbx*`, { as: 'url', eager: true })
/*
examples:
../models/chara_100101_battle_unit/chara_100101_acc_color.png (hair accessories)
../models/chara_100101_battle_unit/chara_100101_body_color.png
../models/chara_100101_battle_unit/chara_100101_face_color.png
../models/chara_100101_battle_unit/chara_100101_hair_color.png
../models/chara_100101_battle_unit/chara_100101_weapon_a_color.png (there may be weapon_b, c, ...)
*/
const allTextures = import.meta.glob(`../models/**/*.png`, { as: 'url', eager: true })

console.log('All models:', allModels)
console.log('All textures:', allTextures)

export function getCharacterIdList() {
    return Object.keys(allModels).map(x => parseInt(x.match(/chara_(\d+)_battle_unit\//)![1]))
}

const loadProgressEl = document.getElementById('load-progress')!

// suppress warning `THREE.FBXLoader: unknown attribute mapping type NoMappingInformation`
const origConsoleWarn = console.warn
console.warn = function (...data: any[]) {
    for (const s of data) {
        if (typeof s == 'string' && s.includes('NoMappingInformation')) {
            return
        }
    }
    origConsoleWarn(...data)
}

function ObjFindByKey<T>(obj: Record<string, T>, predicate: (value: string) => boolean) {
    const key = Object.keys(obj).find(x => predicate(x))
    if (key) return obj[key]
}

function ObjFilterByKey<T>(obj: Record<string, T>, predicate: (value: string) => boolean) {
    return Object.keys(obj)
        .filter(x => predicate(x))
        .reduce((newObj, key) => {
            newObj[key] = obj[key]
            return newObj
        }, {} as Record<string, T>)
}

function humanizeBytes(b: number) {
    if (b < 1024 * 100) { // < 100 KB
        return (b / 1024).toFixed(1) + ' KB'
    } else if (b < 1024 * 1024) { // 100 KB - 1 MB
        return (b / 1024).toFixed(0) + ' KB'
    } else if (b < 1024 * 1024 * 10) { // 1 MB - 10 MB
        return (b / 1024 / 1024).toFixed(2) + ' MB'
    } else { // > 10 MB
        return (b / 1024 / 1024).toFixed(1) + ' MB'
    }
}

export async function loadCharacter(scene: THREE.Scene, characterId: number | string): Promise<THREE.Group> {
    if (typeof characterId == 'string') {
        characterId = parseInt(characterId)
    }
    return new Promise((resolve, reject) => {
        // filter out model and textures
        const model = ObjFindByKey(allModels, x => x.includes(`chara_${characterId}_battle_unit/`))!
        const modelTextures = ObjFilterByKey(allTextures, x => x.includes(`chara_${characterId}_battle_unit/`))

        // load model
        const fbxLoader = new FBXLoader();
        console.log('Loading model:', model)
        loadProgressEl.textContent = 'Loading FBX...'
        fbxLoader.load(model, async (modelObject) => {
            // add model to scene, load textures later
            scene.add(modelObject);
            console.log(`Model "${modelObject.name}" loaded successfully`);
            resolve(modelObject)

            // process and apply textures
            loadProgressEl.textContent = 'Loading textures...'
            console.log('Using textures:', modelTextures)

            const meshes: THREE.Mesh[] = []
            modelObject.traverse(child => (child as THREE.Mesh).isMesh && meshes.push(child as THREE.Mesh))

            await Promise.all(meshes.map(mesh => new Promise<void>(async (resolve) => {
                try {
                    /*
                    mesh.name may be:
                    Acc_Mesh (hair accessories)
                    Body_Mesh
                    Face_Mesh
                    Hair_Mesh
                    weapon_mesh (if there's only one weapon)
                    weapon_a_mesh
                    weapon_b_mesh
                    */
                    const name = mesh.name
                        .replace('_Mesh', '')
                        .replace('_mesh', '')
                        .toLowerCase();

                    let meshTextures = ObjFilterByKey(modelTextures, x => x.includes(name))
                    if (Object.keys(meshTextures).length == 0) {
                        // tomoe mami swimsuit
                        if (characterId == 100303 && ['glass', 'mint', 'tea'].includes(name)) {
                            meshTextures = ObjFilterByKey(modelTextures, x => x.includes('weapon_b'))
                        }
                        // `weapon_a_mesh` and `weapon_b_mesh` may use the same `weapon_a.png`
                        else if (name.includes('weapon')) {
                            meshTextures = ObjFilterByKey(modelTextures, x => x.includes('weapon'))
                        }
                        // defaults to `weapon`
                        else {
                            meshTextures = ObjFilterByKey(modelTextures, x => x.includes('weapon'))
                        }
                    }
                    console.log(`Using textures for mesh [${mesh.name} -> ${name}]:`, meshTextures)

                    const colorMap = ObjFindByKey(meshTextures, x => x.includes('color'))!
                    const shadowMap = ObjFindByKey(meshTextures, x => x.includes('shadow'))!
                    const ctrlMap = ObjFindByKey(meshTextures, x => x.includes('ctrl'))

                    console.log(`${name} color  ->`, colorMap)
                    console.log(`${name} shadow ->`, shadowMap)
                    console.log(`${name} ctrl   ->`, ctrlMap)

                    // mix color and shadow map and set texture
                    if (name.includes('face')) {
                        // face does not have control map / should not use
                        mesh.material = new THREE.MeshStandardMaterial({
                            map: imageData2Texture(await mixImage(shadowMap, colorMap, 0.67), { colorSpace: THREE.SRGBColorSpace })
                        });
                    }
                    else {
                        let ctrlMapData: ImageData | undefined,
                            alphaData: ImageData,
                            alphaTex: THREE.Texture | null = null,
                            pbrTex: THREE.Texture | null = null,
                            finalTex: THREE.Texture;

                        if (characterId == 113701 && name.includes('body')) {
                            /*
                            ultimate madoka

                            body_color ---\
                                           |--> body_ctrl[red] --\
                            body_shadow --/                       \
                                                                   |--> body_ctrl[alpha] --> final texture
                            body_space_color ---------------------/
                                                                      body_shadow[alpha] --> final alpha map
                            */
                            ({ ctrlMapData, alphaData, pbrTex } = await parseCtrlMap(ctrlMap!))
                            const shadowMapData = await input2ImageData(shadowMap)
                            alphaTex = channel2AlphaMap(shadowMapData)
                            const bodyImg = await mixImage(shadowMapData, colorMap, ctrlMapData)
                            const spaceImg = ObjFindByKey(meshTextures, x => x.includes('space'))!
                            finalTex = imageData2Texture(await mixImage(bodyImg, spaceImg, alphaData), { colorSpace: THREE.SRGBColorSpace })
                        }
                        else {
                            /*
                            color ---\
                                      |--> ctrl[red] --> final texture
                            shadow --/
                                         ctrl[alpha] --> final alpha map
                            */
                            if (ctrlMap) {
                                ({ ctrlMapData, alphaData, pbrTex } = await parseCtrlMap(ctrlMap))
                                alphaTex = imageData2Texture(alphaData)
                            }
                            finalTex = imageData2Texture(await mixImage(shadowMap, colorMap, ctrlMapData || 0.67), { colorSpace: THREE.SRGBColorSpace })
                        }

                        if (alphaTex) {
                            alphaTex.magFilter = THREE.LinearFilter
                            alphaTex.minFilter = THREE.LinearFilter
                            alphaTex.anisotropy = 4
                        }

                        if (pbrTex) {
                            pbrTex.magFilter = THREE.LinearFilter
                            pbrTex.minFilter = THREE.LinearFilter
                            pbrTex.anisotropy = 4
                        }

                        finalTex.magFilter = THREE.LinearFilter
                        finalTex.minFilter = THREE.LinearFilter
                        finalTex.anisotropy = 4

                        mesh.material = new THREE.MeshStandardMaterial({
                            map: finalTex,
                            metalnessMap: pbrTex, // blue channel
                            roughnessMap: pbrTex, // green channel
                            metalness: 1.0,
                            roughness: 1.0,
                            transparent: Boolean(alphaTex),
                            alphaMap: alphaTex,
                        });
                    }

                    resolve()

                } catch (error) {
                    console.error(`Error applying texture to ${mesh.name}:`, error)
                }
            })))

            loadProgressEl.innerHTML = ''

        }, (progress) => {
            const loaded = humanizeBytes(progress.loaded)
            const total = humanizeBytes(progress.total)
            loadProgressEl.textContent = `Loading FBX... ${progress.lengthComputable ? `${loaded} / ${total}` : loaded}`
        }, (error) => {
            loadProgressEl.textContent = 'Load FAILED'
            reject(error)
        });
    })
}
