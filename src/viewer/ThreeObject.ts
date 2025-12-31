import * as THREE from 'three'

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