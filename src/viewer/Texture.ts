import * as THREE from 'three';

const texLoader = new THREE.TextureLoader()
const imgLoader = new THREE.ImageLoader()

function imageData2Texture(imgData: ImageData) {
    const tex = new THREE.DataTexture(imgData.data, imgData.width, imgData.height);
    tex.flipY = true
    tex.needsUpdate = true
    return tex
}

export async function loadTexture(url: string) {
    const tex = await texLoader.loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export async function parseCtrlMap(url: string): Promise<{ ctrlMapData: ImageData, pbrTex: THREE.Texture, alphaTex: THREE.Texture }> {
    const img = await imgLoader.loadAsync(url)
    const { width, height } = img;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0)
    const ctrlMapData = ctx.getImageData(0, 0, width, height)

    const pbrData = new ImageData(width, height)
    const alphaData = new ImageData(width, height)

    for (let i = 0; i < ctrlMapData.data.length; i += 4) {
        pbrData.data[i + 0] = 0
        pbrData.data[i + 1] = 255 - ctrlMapData.data[i + 1]  // Green slot -> Roughness (Inverted Green)
        pbrData.data[i + 2] = ctrlMapData.data[i + 2]  // Blue slot -> Metalness (Blue channel)
        pbrData.data[i + 3] = 255

        alphaData.data[i + 0] = ctrlMapData.data[i + 3]
        alphaData.data[i + 1] = ctrlMapData.data[i + 3]
        alphaData.data[i + 2] = ctrlMapData.data[i + 3]
        alphaData.data[i + 3] = 255
    }

    return {
        ctrlMapData,
        pbrTex: imageData2Texture(pbrData),
        alphaTex: imageData2Texture(alphaData)
    }
}

export async function mixTexture(inputAUrl: string, inputBUrl: string, factor: number | ImageData): Promise<THREE.Texture> {
    const [imgA, imgB] = await Promise.all([
        imgLoader.loadAsync(inputAUrl),
        imgLoader.loadAsync(inputBUrl)
    ]);
    const { width, height } = imgA;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // Helper to get pixel data
    const getPixels = (img: HTMLImageElement) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, width, height).data;
    };

    const dataA = getPixels(imgA);
    const dataB = getPixels(imgB);
    const dataOut = new ImageData(width, height);

    for (let i = 0; i < dataA.length; i += 4) {
        const weight = typeof factor == 'number' ? factor : factor.data[i] / 255;

        dataOut.data[i + 0] = dataA[i + 0] * (1 - weight) + dataB[i + 0] * weight
        dataOut.data[i + 1] = dataA[i + 1] * (1 - weight) + dataB[i + 1] * weight
        dataOut.data[i + 2] = dataA[i + 2] * (1 - weight) + dataB[i + 2] * weight
        dataOut.data[i + 3] = 255;
    }

    const tex = imageData2Texture(dataOut);
    tex.colorSpace = THREE.SRGBColorSpace;

    return tex;
}
