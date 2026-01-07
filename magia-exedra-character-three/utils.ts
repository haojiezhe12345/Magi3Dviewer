import * as THREE from 'three'

export function ObjFindByKey<T>(obj: Record<string, T>, predicate: (value: string) => boolean, lowerCase = true) {
    const key = Object.keys(obj).find(x => predicate(lowerCase ? x.toLowerCase() : x))
    if (key) return obj[key]
}

export function ObjFilterByKey<T>(obj: Record<string, T>, predicate: (value: string) => boolean, lowerCase = true) {
    return Object.keys(obj)
        .filter(x => predicate(lowerCase ? x.toLowerCase() : x))
        .reduce((newObj, key) => {
            newObj[key] = obj[key]
            return newObj
        }, {} as Record<string, T>)
}

export function humanizeBytes(b: number) {
    if (b < 1024 * 100) { // < 100 KB
        return (b / 1024).toFixed(1) + ' KB'
    } else if (b < 1024 * 1024) { // 100 KB - 1 MB
        return (b / 1024).toFixed(0) + ' KB'
    } else if (b < 1024 * 1024 * 10) { // 1 MB - 10 MB
        return (b / 1024 / 1024).toFixed(2) + ' MB'
    } else { // > 10 MB
        return (b / 1024 / 1024).toFixed(1) + ' MB'
    }
}

export function disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.dispose();

            // Disposing materials and textures
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => disposeMaterial(m));
            } else {
                disposeMaterial(mesh.material);
            }
        }
    });
}

function disposeMaterial(mat: THREE.Material) {
    mat.dispose();
    // Check for textures
    for (const key of Object.keys(mat)) {
        const value = (mat as any)[key];
        if (value && value.isTexture) {
            value.dispose();
        }
    }
}
