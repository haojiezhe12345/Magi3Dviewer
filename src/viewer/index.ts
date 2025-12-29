import { createScene } from './Scene'
import { getCharacterIdList, loadCharacter } from './CharacterLoader'
import type { Group, Scene } from 'three'
import characterList from '../models/getStyle3dCharacterMstList.json'

let scene: Scene | undefined
let character: Group | undefined

async function switchCharacter(id: number | string) {
    if (!scene) return

    if (character) {
        scene.remove(character)
    }

    character = await loadCharacter(scene, id)
}

export async function setupViewer() {
    const selector = document.getElementById('character-selector') as HTMLSelectElement

    for (const id of getCharacterIdList().map(x => x.toString())) {
        const option = document.createElement('option')
        option.value = id
        option.innerHTML = `${id} - ${characterList.payload.mstList.find(x => x.resourceName.includes(id))?.name || 'Unknown'}`
        selector.appendChild(option)
    }

    selector.onchange = e => {
        const value = (e!.target as HTMLSelectElement).value
        if (!value) return
        switchCharacter(value)
    }

    scene = createScene(document.getElementById('viewer')!)
    console.log(scene)

    selector.value = '100107'
    selector.dispatchEvent(new Event('change'))
}
