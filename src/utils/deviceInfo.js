/**
 * High-Fidelity Device Identification Protocol
 * Used to bypass User Agent truncation and identify specific device models (Samsung, OnePlus, iPhone, etc.)
 */

export const detectDeviceIdentity = async () => {
    const ua = navigator.userAgent;
    const { width, height } = window.screen;
    const ratio = window.devicePixelRatio;

    // 1. High-Precision Chromium Hinting (Android / Chrome)
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        try {
            const highEntropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
            if (highEntropy.model) {
                // Map common model codes to display names
                const model = highEntropy.model;
                if (model.includes('SM-')) return `Samsung Galaxy ${model}`;
                if (model.includes('CPH') || model.includes('PHB')) return `OnePlus ${model}`; // Simplified, can be expanded
                if (model.includes('Pixel')) return `Google ${model}`;
                return model; // Return the specific model string (e.g., "Pixel 8 Pro")
            }
        } catch (e) {
        }
    }

    // 2. iOS Resolution Mapping (iPhone / iPad) - Since iOS doesn't provide model in UA
    if (/iPhone|iPad|iPod/i.test(ua)) {
        return getIphoneModel(width, height, ratio);
    }

    // 3. Fallback Regex for Android (if user-agent-data is not supported)
    if (/Android/i.test(ua)) {
        if (/Samsung|SM-|GT-/i.test(ua)) return 'Samsung Galaxy';
        if (/OnePlus|PHB|CPH/i.test(ua)) return 'OnePlus';
        if (/Pixel/i.test(ua)) return 'Google Pixel';
        return 'Android Device';
    }

    // 4. Desktop Identification
    if (/Macintosh/i.test(ua)) return 'MacBook Pro';
    if (/Windows/i.test(ua)) return 'Windows PC';

    return 'Web Platform';
};

const getIphoneModel = (w, h, r) => {
    // Landscape support: sort to always have w < h
    const portraitW = Math.min(w, h);
    const portraitH = Math.max(w, h);

    // Common Resolution Map (Logical Pixels)
    if (portraitW === 430 && portraitH === 932) return 'iPhone 15/14 Pro Max';
    if (portraitW === 393 && portraitH === 852) return 'iPhone 15/14 Pro';
    if (portraitW === 428 && portraitH === 926) return 'iPhone 13 Pro Max';
    if (portraitW === 390 && portraitH === 844) return 'iPhone 14/13/12';
    if (portraitW === 375 && portraitH === 812) return 'iPhone 13/12 mini / X / XS';
    if (portraitW === 414 && portraitH === 896) return r === 3 ? 'iPhone 11 Pro Max / XS Max' : 'iPhone 11 / XR';
    if (portraitW === 375 && portraitH === 667) return 'iPhone SE / 8 / 7 / 6s';
    if (portraitW === 414 && portraitH === 736) return 'iPhone 8 Plus / 7 Plus';

    // iPads
    if (portraitW >= 768) return 'iPad Pro / Air';

    return 'iPhone';
};

// Advanced: WebGL GPU Identification (Loophole Fix for Seniors)
export const getGpuRenderer = () => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        return "Unknown GPU";
    }
};
