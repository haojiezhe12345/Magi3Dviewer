import * as THREE from 'three';
import { disposeObject } from './utils';

export default class MagiaExedraCharacter3D {
    /** Can be added to three.js scene */
    object: THREE.Group
    mixer: THREE.AnimationMixer

    constructor(object: THREE.Group) {
        this.object = object
        this.mixer = new THREE.AnimationMixer(object)
    }

    get animations(): string[] {
        return this.object.animations
            .filter(x => x.tracks.length > 0)
            .map(x => x.name.replace(/_\d/, ''))
            .sort()
    }

    playAnimation(name: string | undefined = undefined, loop = false) {
        if (!name) loop = true

        /*
        character and its weapon have seperate animations
    
        for example:
        CommonWait_L    - for body
        CommonWait_L_1  - for weapon
    
        if it plays `CommonWait_L`, `CommonWait_L_1` should also be played
        */
        const animations = this.object.animations.filter(x => {
            if (name) {
                return x.name.startsWith(name)
            } else {
                return x.name.startsWith('CommonWait') || x.name.startsWith('DungeonWait')
            }
        })
        if (animations.length == 0) {
            console.warn(`Animation "${name}" not found in "${this.object.name}"`)
            return
        }

        this.mixer.stopAllAction()

        for (const animation of animations) {
            if (animation.tracks.length == 0) continue

            console.log('Playing animation:', animation.name)

            const action = this.mixer.clipAction(animation);

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

    dispose() {
        disposeObject(this.object)
    }
}
