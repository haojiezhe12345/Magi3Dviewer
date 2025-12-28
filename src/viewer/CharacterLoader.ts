import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { mixTexture, parseCtrlMap } from './Texture';

/*
examples:
/src/models/chara_100101_battle_unit/chara_100101_battle_unit.fbx
/src/models/chara_100107_battle_unit/chara_100107_battle_unit.fbx
*/
const allModels = Object.values(import.meta.glob(`../models/**/*.fbx`, { as: 'url', eager: true }))
/*
examples:
/src/models/chara_100101_battle_unit/chara_100101_acc_color.png (hair accessories)
/src/models/chara_100101_battle_unit/chara_100101_body_color.png
/src/models/chara_100101_battle_unit/chara_100101_face_color.png
/src/models/chara_100101_battle_unit/chara_100101_hair_color.png
/src/models/chara_100101_battle_unit/chara_100101_weapon_a_color.png (there may be weapon_b, c, ...)
*/
const allTextures = Object.values(import.meta.glob(`../models/**/*.png`, { as: 'url', eager: true }))

console.log('All models:', allModels)
console.log('All textures:', allTextures)

export function getCharacterIdList() {
    return allModels.map(x => parseInt(x.match(/chara_(\d+)_battle_unit\//)![1]))
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

export async function loadCharacter(scene: THREE.Scene, characterId: number | string): Promise<THREE.Group> {
    return new Promise(resolve => {
        // filter out model and textures
        const model = allModels.find(x => x.includes(`chara_${characterId}_battle_unit/`))!
        const modelTextures = allTextures.filter(x => x.includes(`chara_${characterId}_battle_unit/`))

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

                let meshTextures = modelTextures.filter(x => x.includes(name))
                if (meshTextures.length == 0) {
                    // `weapon_a_mesh` and `weapon_b_mesh` may use the same `weapon_a.png`
                    if (name.includes('weapon')) {
                        meshTextures = modelTextures.filter(x => x.includes('weapon'))
                    }
                }
                console.log(`Using textures for mesh [${mesh.name} -> ${name}]:`, meshTextures)

                const colorMap = meshTextures.find(x => x.includes('color'))!
                const shadowMap = meshTextures.find(x => x.includes('shadow'))!
                const ctrlMap = meshTextures.find(x => x.includes('ctrl'))!

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
