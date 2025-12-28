import { createScene } from './Scene'
import { getCharacterIdList, loadCharacter } from './CharacterLoader'
import type { Group, Scene } from 'three'

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

    for (const id of getCharacterIdList()) {
        const idstr = id.toString()
        const option = document.createElement('option')
        option.value = idstr
        option.innerHTML = idstr
        selector.appendChild(option)
    }

    selector.onchange = e => {
        const value = (e!.target as HTMLSelectElement).value
        if (!value) return
        switchCharacter(value)
    }

    scene = createScene(document.getElementById('viewer')!)
    console.log(scene)

    selector.selectedIndex = 1
    selector.dispatchEvent(new Event('change'))
}
