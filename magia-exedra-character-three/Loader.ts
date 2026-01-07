import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { channel2AlphaMap, imageData2Texture, input2ImageData, loadTexture, mixImage, parseCtrlMap } from './Texture.js';
import { ObjFindByKey, ObjFilterByKey, humanizeBytes } from './utils.js';

const fbxLoader = new FBXLoader();

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

export async function loadCharacter(fbxPathUrl: Record<string, string>, texturePathUrl: Record<string, string>, loadProgressCallback: (progress: string) => any = () => { }): Promise<THREE.Group> {
    const fbxPath = Object.keys(fbxPathUrl)[0]
    const characterId = parseInt(fbxPath.match(/chara_(\d+).*\//)![1])
    const fbxUrl = fbxPathUrl[fbxPath]

    return new Promise((resolve, reject) => {
        // load model
        console.log('Loading model:', fbxPathUrl)
        loadProgressCallback('Loading FBX...')
        fbxLoader.load(fbxUrl, async (modelObject) => {
            // return model, load textures later
            console.log(`Model "${modelObject.name}" loaded successfully`);
            resolve(modelObject)

            // process and apply textures
            loadProgressCallback('Loading textures...')
            console.log('Using textures:', texturePathUrl)

            const meshes: THREE.Mesh[] = []
            modelObject.traverse(child => (child as THREE.Mesh).isMesh && meshes.push(child as THREE.Mesh))

            await Promise.all(meshes.map(mesh => new Promise<void>(async (resolve, _reject) => {
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

                    let meshTextures = ObjFilterByKey(texturePathUrl, x => x.includes(name))
                    if (Object.keys(meshTextures).length == 0) {
                        // tomoe mami swimsuit
                        if (characterId == 100303 && ['glass', 'mint', 'tea'].includes(name)) {
                            meshTextures = ObjFilterByKey(texturePathUrl, x => x.includes('weapon_b'))
                        }
                        // `weapon_a_mesh` and `weapon_b_mesh` may use the same `weapon_a.png`
                        else if (name.includes('weapon')) {
                            meshTextures = ObjFilterByKey(texturePathUrl, x => x.includes('weapon'))
                        }
                        // defaults to `weapon`
                        else {
                            meshTextures = ObjFilterByKey(texturePathUrl, x => x.includes('weapon'))
                        }
                    }
                    if (name.includes('face')) {
                        meshTextures = ObjFilterByKey(
                            { ...meshTextures, ...ObjFilterByKey(texturePathUrl, x => x.includes('eye')) }, // add `eyehighlight_ctrl.png`
                            x => !x.includes('face_ctrl') // remove `face_ctrl.png`
                        )
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
                        const colorTex = await loadTexture(colorMap, { colorSpace: THREE.SRGBColorSpace });
                        const shadowTex = await loadTexture(shadowMap, { colorSpace: THREE.SRGBColorSpace });
                        const ctrlTex = await loadTexture(ctrlMap!);

                        const material = new THREE.MeshStandardMaterial({
                            map: colorTex,
                            // transparent: true,
                        });

                        // 2. Inject your custom Blush/Highlight logic
                        material.onBeforeCompile = (shader) => {
                            // Add your extra uniforms
                            shader.uniforms.tShadow = { value: shadowTex };
                            shader.uniforms.tCtrl = { value: ctrlTex };

                            shader.uniforms.uShadowMix = { value: 0.67 }
                            shader.uniforms.uHighlightBrightness = { value: 1.0 }
                            shader.uniforms.uBlushStrength = { value: 0.33 };

                            // Update Vertex Shader to handle UV1 (uv1 attribute)
                            shader.vertexShader = /*glsl*/`
                                attribute vec2 uv1;
                                varying vec2 vUv;
                                varying vec2 vUv2;
                                ${shader.vertexShader}
                            `.replace(
                                '#include <uv_vertex>',
                                /*glsl*/`
                                #include <uv_vertex>
                                vUv = uv;
                                vUv2 = uv1;
                                `
                            );

                            // Update Fragment Shader
                            shader.fragmentShader = /*glsl*/`
                                varying vec2 vUv;
                                varying vec2 vUv2;

                                uniform sampler2D tShadow;
                                uniform sampler2D tCtrl;
                                
                                uniform float uShadowMix;
                                uniform float uHighlightBrightness;
                                uniform float uBlushStrength;
                                ${shader.fragmentShader}
                            `.replace(
                                '#include <map_fragment>',
                                /*glsl*/`
                                vec4 faceColor = texture2D(map, vUv);
                                vec4 faceShadow = texture2D(tShadow, vUv);
                                vec4 faceCtrl = texture2D(tCtrl, vUv2);
                                
                                // mix color and shadow map
                                faceColor.rgb = mix(faceShadow.rgb, faceColor.rgb, uShadowMix);

                                float eyeMask = step(vUv2.y, 0.5); // extract eye highlights (bottom-half)
                                float highlightIntensity = smoothstep(0.5, 1.0, faceCtrl.r) * eyeMask; // hide pixels with value < 0.5
                                vec3 highlightColor = vec3(highlightIntensity * uHighlightBrightness);

                                float blushMask = step(0.5, vUv2.y); // extract blush (top-half)
                                float blushFactor = faceCtrl.r * blushMask * uBlushStrength; // calculate factor
                                vec3 blushCyan = vec3(0.0, blushFactor, blushFactor); // map red to grenn-blue, used for subtraction later

                                faceColor.rgb += highlightColor; // add eye highlights
                                faceColor.rgb -= blushCyan; // add blush (subtract the inverted red)

                                // Apply back to the standard variable 'diffuseColor'
                                diffuseColor = faceColor;
                                `
                            );
                        };

                        mesh.material = material
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

                } catch (error) {
                    console.error(`Error applying texture to ${mesh.name}:`, error)
                } finally {
                    resolve()
                }
            })))

            loadProgressCallback('')

        }, (progress) => {
            const loaded = humanizeBytes(progress.loaded)
            const total = humanizeBytes(progress.total)
            loadProgressCallback(`Loading FBX... ${progress.lengthComputable ? `${loaded} / ${total}` : loaded}`)
        }, (error) => {
            loadProgressCallback('Load FAILED')
            reject(error)
        });
    })
}
