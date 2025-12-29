import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mixTexture, parseCtrlMap } from './Texture';

/*
examples:
../models/chara_100101_battle_unit/chara_100101_battle_unit.fbx
../models/chara_100107_battle_unit/chara_100107_battle_unit.fbx
*/
const allModels = import.meta.glob(`../models/**/*.fbx`, { as: 'url', eager: true })
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
    return obj[Object.keys(obj).find(x => predicate(x))!]
}

function ObjFilterByKey<T>(obj: Record<string, T>, predicate: (value: string) => boolean) {
    return Object.keys(obj)
        .filter(x => predicate(x))
        .reduce((newObj, key) => {
            newObj[key] = obj[key]
            return newObj
        }, {} as Record<string, T>)
}

export async function loadCharacter(scene: THREE.Scene, characterId: number | string): Promise<THREE.Group> {
    return new Promise(resolve => {
        // filter out model and textures
        const model = ObjFindByKey(allModels, x => x.includes(`chara_${characterId}_battle_unit/`))
        const modelTextures = ObjFilterByKey(allTextures, x => x.includes(`chara_${characterId}_battle_unit/`))

        // load model
        const fbxLoader = new FBXLoader();
        console.log('Loading model:', model)
        fbxLoader.load(model, async (modelObject) => {
            // process and apply textures
            console.log('Using textures:', modelTextures)
            modelObject.traverse(async (child) => {
                if (!(child as THREE.Mesh).isMesh) {
                    return
                }
                const mesh = child as THREE.Mesh;

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
                    // `weapon_a_mesh` and `weapon_b_mesh` may use the same `weapon_a.png`
                    if (name.includes('weapon')) {
                        meshTextures = ObjFilterByKey(modelTextures, x => x.includes('weapon'))
                    }
                }
                console.log(`Using textures for mesh [${mesh.name} -> ${name}]:`, meshTextures)

                const colorMap = ObjFindByKey(meshTextures, x => x.includes('color'))
                const shadowMap = ObjFindByKey(meshTextures, x => x.includes('shadow'))
                const ctrlMap = ObjFindByKey(meshTextures, x => x.includes('ctrl'))

                // mix color and shadow map and set texture
                if (name.includes('face')) {
                    // face does not have control map
                    mesh.material = new THREE.MeshStandardMaterial({
                        map: await mixTexture(shadowMap, colorMap, 0.5)
                    });
                } else {
                    const { ctrlMapData, pbrTex, alphaTex } = await parseCtrlMap(ctrlMap)
                    const diffuseTex = await mixTexture(shadowMap, colorMap, ctrlMapData)
                    diffuseTex.anisotropy = 8

                    mesh.material = new THREE.MeshStandardMaterial({
                        map: diffuseTex,
                        metalnessMap: pbrTex, // blue channel
                        roughnessMap: pbrTex, // green channel
                        metalness: 1.0,
                        roughness: 1.0,
                        transparent: true,
                        alphaMap: alphaTex,
                    });
                }
            });

            scene.add(modelObject);
            console.log('Model loaded successfully');
            resolve(modelObject)

        }, undefined, (error) => console.error(error));
    })
}
