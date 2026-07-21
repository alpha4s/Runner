const SHADOW_TYPES = {
    TREE: { x: 0, rx: 60, ry: 60, opacity: 0.5, w: 4.5, h: 4.5 },
    ROCK: { x: 128, rx: 60, ry: 60, opacity: 0.4, w: 5.5, h: 5.5 },
    DUNE: { x: 256, rx: 60, ry: 60, opacity: 0.4, w: 12.0, h: 24.0 },
    BLOB: { x: 384, rx: 60, ry: 60, opacity: 0.4, w: 3.0, h: 3.0 }
};

export class ShadowManager {
    constructor() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 512, 128);

        const entries = Object.entries(SHADOW_TYPES);
        const count = entries.length;

        entries.forEach(([_, t]) => {
            const grad = ctx.createRadialGradient(t.x + 64, 64, 0, t.x + 64, 64, 64);
            grad.addColorStop(0, `rgba(0,0,0,${t.opacity})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(t.x + 64, 64, t.rx, t.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        this.texture = new THREE.CanvasTexture(canvas);
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture, transparent: true, depthWrite: false, opacity: 0.5, blending: THREE.MultiplyBlending
        });

        this.geos = {};
        entries.forEach(([k, t], i) => {
            this.geos[k.toLowerCase()] = this._createGeo(i / count, (i + 1) / count, t.w, t.h);
        });
    }

    _createGeo(uStart, uEnd, w, h) {
        const geo = new THREE.PlaneGeometry(w, h);
        geo.rotateX(-Math.PI / 2);
        const uvs = geo.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i] = uvs[i] === 0 ? uStart : uEnd;
        }
        return geo;
    }
}

