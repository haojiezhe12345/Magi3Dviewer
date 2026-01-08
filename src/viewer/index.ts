import * as THREE from 'three'
import Stats from 'three/addons/libs/stats.module.js';
import ViewerScene from './scene';
import { initSelector } from './UIControls'
import { characters } from './character';

const viewerEl = document.getElementById('viewer')!
const menuEl = document.getElementById('menu')!

const characterSelector = document.getElementById('character-selector') as HTMLSelectElement
const animationSelector = document.getElementById('animation-selector') as HTMLSelectElement
const animationPlayBtn = document.getElementById('animation-play') as HTMLButtonElement
const animationLoopBtn = document.getElementById('animation-loop') as HTMLButtonElement
const animationStopBtn = document.getElementById('animation-stop') as HTMLButtonElement
const loadProgressEl = document.getElementById('load-progress')!

animationPlayBtn.onclick = () => scene?.character?.playAnimation(animationSelector.value)
animationLoopBtn.onclick = () => scene?.character?.playAnimation(animationSelector.value, true)
animationStopBtn.onclick = () => scene?.character?.mixer?.stopAllAction()

let scene: ViewerScene | undefined = undefined

const characterIdList = characters.getCharacterIdList()

const clock = new THREE.Clock()
const stats = new Stats()

function animateLoop() {
    const delta = clock.getDelta();
    if (scene?.character?.mixer) {
        scene.character.mixer.update(delta);
    }
    stats.update()
}

function tryChangeCharacterByHash(): boolean {
    let id = location.hash.replace('#', '')
    if (id === '') id = '100107'
    if (!characterIdList.includes(id)) return false
    changeCharacter(id)
    return true
}

function changeCharacter(id: number | string) {
    if (typeof id == 'number') id = id.toString()

    characterSelector.value = id

    scene?.switchCharacter(
        id,
        progress => loadProgressEl.textContent = progress
    ).then(() => {
        if (!(scene && scene.character)) return

        const selectorOldValue = animationSelector.value

        initSelector(
            animationSelector,
            scene.character.animations.reduce((obj, name) => {
                obj[name] = name
                return obj
            }, {} as Record<string, string>),
            value => value && scene?.character?.playAnimation(value)
        );

        if (scene.character.animations.includes(selectorOldValue)) {
            animationSelector.value = selectorOldValue
        }
    })
}

export function setupViewer() {
    initSelector(
        characterSelector,
        characterIdList.reduce((obj, id) => {
            obj[`${id} - ${characters.getCharacterNameById(id)}`] = id
            return obj
        }, {} as Record<string, string>),
        value => {
            console.log('Selector value change:', value)
            if (!value || location.hash == `#${value}`) return
            location.hash = value
        }
    )

    stats.dom.style.removeProperty('top')
    stats.dom.style.bottom = '0'
    menuEl.appendChild(stats.dom)

    scene = new ViewerScene(viewerEl)
    scene.animateLoopCallback = animateLoop

    window.addEventListener('hashchange', tryChangeCharacterByHash)
    tryChangeCharacterByHash() || changeCharacter(100107)
}
