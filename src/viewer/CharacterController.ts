import * as THREE from 'three'
import { loadCharacter } from './CharacterLoader'
import { initSelector } from './UIControls'
import { disposeObject } from './ThreeObject'

export let scene: THREE.Scene | undefined
export let character: THREE.Group | undefined
export let mixer: THREE.AnimationMixer | undefined

let characterLoading = false
let characterPending: number | string | undefined

const animationSelector = document.getElementById('animation-selector') as HTMLSelectElement
const animationPlayBtn = document.getElementById('animation-play') as HTMLButtonElement
const animationLoopBtn = document.getElementById('animation-loop') as HTMLButtonElement
const animationStopBtn = document.getElementById('animation-stop') as HTMLButtonElement

animationPlayBtn.onclick = () => playAnimation(animationSelector.value)
animationLoopBtn.onclick = () => playAnimation(animationSelector.value, true)
animationStopBtn.onclick = () => mixer?.stopAllAction()

export function setScene(s: THREE.Scene) {
    scene = s
}

export async function switchCharacter(id: number | string) {
    if (!scene) return

    if (characterLoading) {
        characterPending = id
        return
    }
    characterLoading = true
    characterPending = undefined

    try {
        if (character) {
            scene.remove(character)
            disposeObject(character)
            character = undefined
            mixer = undefined
        }

        character = await loadCharacter(scene, id)

        mixer = new THREE.AnimationMixer(character);
        mixer.addEventListener('finished', () => playAnimation())

        Object.assign(window, { character, mixer })

        const validAnimationNames = character.animations
            .filter(x => x.tracks.length > 0)
            .map(x => x.name.replace(/_\d/, ''))
            .sort()
        const selectorOldValue = animationSelector.value

        initSelector(
            animationSelector,
            validAnimationNames.reduce((obj, name) => {
                obj[name] = name
                return obj
            }, {} as Record<string, string>),
            value => value && playAnimation(value)
        );

        if (validAnimationNames.includes(selectorOldValue)) {
            animationSelector.value = selectorOldValue
        }

        playAnimation()

    } finally {
        setTimeout(() => {
            characterLoading = false
            if (characterPending) switchCharacter(characterPending)
        }, 0);
    }
}

export function playAnimation(name: string | undefined = undefined, loop = false) {
    if (!(character && mixer)) return

    if (!name) {
        name = 'CommonWait'
        loop = true
    }

    /*
    character and its weapon have seperate animations

    for example:
    CommonWait_L    - for body
    CommonWait_L_1  - for weapon

    if it plays `CommonWait_L`, `CommonWait_L_1` should also be played
    */
    const animations = character.animations.filter(x => x.name.startsWith(name))
    if (animations.length == 0) {
        console.warn(`Animation "${name}" not found in "${character.name}"`)
        return
    }

    mixer.stopAllAction()

    for (const animation of animations) {
        if (animation.tracks.length == 0) continue

        console.log('Playing animation:', animation.name)

        const action = mixer.clipAction(animation);

        if (loop) {
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
        } else {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = false;
        }

        action.play()
    }
}

Object.assign(window, {
    switchCharacter,
    playAnimation
})
