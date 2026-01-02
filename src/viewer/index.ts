import * as THREE from 'three'
import { createScene } from './Scene'
import { getCharacterIdList } from './CharacterLoader'
import characterList from '../models/getStyle3dCharacterMstList.json'
import * as CharacterController from './CharacterController'
import { initSelector } from './UIControls'
import Stats from 'three/addons/libs/stats.module.js';

const viewerEl = document.getElementById('viewer')!

const clock = new THREE.Clock()
const stats = new Stats()

function animateLoop() {
    const delta = clock.getDelta();
    if (CharacterController.mixer) {
        CharacterController.mixer.update(delta);
    }
    stats.update()
}

const selector = document.getElementById('character-selector') as HTMLSelectElement
const characterStringIdList = getCharacterIdList().map(x => x.toString())

function tryChangeCharacterByHash(): boolean {
    let id = location.hash.replace('#', '')
    if (id === '') id = '100107'
    if (characterStringIdList.includes(id)) {
        selector.value = id
        CharacterController.switchCharacter(id)
        return true
    } else return false
}

export async function setupViewer() {
    initSelector(
        selector,
        characterStringIdList.reduce((obj, id) => {
            obj[`${id} - ${characterList.payload.mstList.find(x => x.resourceName.includes(id))?.name || 'Unknown'}`] = id
            return obj
        }, {} as Record<string, string>),
        value => {
            console.log('Selector value change:', value)
            if (!value || location.hash == `#${value}`) return
            location.hash = value
        }
    )

    const scene = createScene(viewerEl, animateLoop)
    Object.assign(window, { scene })
    CharacterController.setScene(scene)

    stats.dom.style.removeProperty('top')
    stats.dom.style.bottom = '0'
    viewerEl.appendChild(stats.dom)

    window.addEventListener('hashchange', tryChangeCharacterByHash)
    tryChangeCharacterByHash()
}
