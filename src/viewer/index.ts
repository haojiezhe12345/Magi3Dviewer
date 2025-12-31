import * as THREE from 'three'
import { createScene } from './Scene'
import { getCharacterIdList } from './CharacterLoader'
import characterList from '../models/getStyle3dCharacterMstList.json'
import * as CharacterController from './CharacterController'
import { initSelector } from './UIControls'

const clock = new THREE.Clock()

function animateLoop() {
    const delta = clock.getDelta();
    if (CharacterController.mixer) {
        CharacterController.mixer.update(delta);
    }
}

export async function setupViewer() {
    const selector = document.getElementById('character-selector') as HTMLSelectElement

    initSelector(
        selector,
        getCharacterIdList().map(x => x.toString()).reduce((obj, id) => {
            obj[`${id} - ${characterList.payload.mstList.find(x => x.resourceName.includes(id))?.name || 'Unknown'}`] = id
            return obj
        }, {} as Record<string, string>),
        value => value && CharacterController.switchCharacter(value)
    )

    const scene = createScene(document.getElementById('viewer')!, animateLoop)
    Object.assign(window, { scene })
    CharacterController.setScene(scene)

    selector.value = '100107'
    selector.dispatchEvent(new Event('change'))
}
