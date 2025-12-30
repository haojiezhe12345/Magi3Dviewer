import * as THREE from 'three';

const texLoader = new THREE.TextureLoader()
const imgLoader = new THREE.ImageLoader()

const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    alpha: true
})!;

export async function loadTexture(url: string) {
    const tex = await texLoader.loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export async function input2ImageData(input: string | ImageData): Promise<ImageData> {
    if (input instanceof ImageData) return input

    const img = await imgLoader.loadAsync(input);
    const { width, height } = img

    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height);

    const bitmap = await createImageBitmap(img, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
    });

    // Create a texture and upload the bitmap
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

    // Create a framebuffer to read from
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // Read the raw bytes
    const pixels = new Uint8ClampedArray(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Clean up
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(fb);
    bitmap.close();

    return new ImageData(pixels, width, height);
}

export function imageData2Texture(imgData: ImageData, textureProps: Partial<THREE.Texture> = {}) {
    const tex = new THREE.DataTexture(imgData.data, imgData.width, imgData.height);
    tex.flipY = true
    tex.needsUpdate = true
    Object.assign(tex, textureProps)
    return tex
}

interface CtrlMapParseOptions {
    invertRoughness: boolean
    invertAlpha: boolean
}

const defaultCtrlMapParseOptions: CtrlMapParseOptions = {
    invertRoughness: true,
    invertAlpha: false,
}

export async function parseCtrlMap(url: string, options: Partial<CtrlMapParseOptions> = {}): Promise<{ ctrlMapData: ImageData, alphaData: ImageData, pbrTex: THREE.Texture }> {
    options = {
        ...defaultCtrlMapParseOptions,
        ...options
    }

    const ctrlMapData = await input2ImageData(url)
    const { width, height } = ctrlMapData

    const pbrData = new ImageData(width, height)
    const alphaData = new ImageData(width, height)

    for (let i = 0; i < ctrlMapData.data.length; i += 4) {
        pbrData.data[i + 0] = 0
        pbrData.data[i + 1] = ctrlMapData.data[i + 1]  // Green slot -> Roughness (Inverted Green)
        pbrData.data[i + 2] = ctrlMapData.data[i + 2]  // Blue slot -> Metalness (Blue channel)
        pbrData.data[i + 3] = 255
        if (options.invertRoughness) pbrData.data[i + 1] = 255 - pbrData.data[i + 1]

        let alphaValue = ctrlMapData.data[i + 3]
        if (options.invertAlpha) alphaValue = 255 - alphaValue
        alphaData.data[i + 0] = alphaValue
        alphaData.data[i + 1] = alphaValue
        alphaData.data[i + 2] = alphaValue
        alphaData.data[i + 3] = 255
    }

    return {
        ctrlMapData,
        alphaData,
        pbrTex: imageData2Texture(pbrData),
    }
}

export function channel2AlphaMap(imgData: ImageData, channel = 3): THREE.Texture {
    const alphaData = new ImageData(imgData.width, imgData.height)
    for (let i = 0; i < imgData.data.length; i += 4) {
        const alphaValue = imgData.data[i + channel]
        alphaData.data[i + 0] = alphaValue
        alphaData.data[i + 1] = alphaValue
        alphaData.data[i + 2] = alphaValue
        alphaData.data[i + 3] = 255
    }
    return imageData2Texture(alphaData)
}

export async function mixImage(inputA: string | ImageData, inputB: string | ImageData, factor: number | ImageData, factorChannel = 0): Promise<ImageData> {
    const dataA = await input2ImageData(inputA)
    const dataB = await input2ImageData(inputB)
    const { width, height } = dataA

    const dataOut = new ImageData(width, height);

    for (let i = 0; i < dataA.data.length; i += 4) {
        const weight = typeof factor == 'number' ? factor : factor.data[i + factorChannel] / 255;

        dataOut.data[i + 0] = dataA.data[i + 0] * (1 - weight) + dataB.data[i + 0] * weight
        dataOut.data[i + 1] = dataA.data[i + 1] * (1 - weight) + dataB.data[i + 1] * weight
        dataOut.data[i + 2] = dataA.data[i + 2] * (1 - weight) + dataB.data[i + 2] * weight
        dataOut.data[i + 3] = 255;
    }

    return dataOut;
}
