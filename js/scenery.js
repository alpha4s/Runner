import { CONFIG } from './config.js';
import { ShadowManager } from './visuals.js';

export class SceneryManager {
    constructor(scene, gm) {
        this.scene = scene;
        this.gm = gm;
        this.shadows = new ShadowManager();
        this.cells = [];
        this.glbModels = {};

        const size = 64;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < data.length; i += 4) {
            const v = Math.random() * 255;
            data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = Math.random() * 50;
        }
        this.noiseTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        this.noiseTexture.needsUpdate = true;
        this.noiseTexture.wrapS = this.noiseTexture.wrapT = THREE.RepeatWrapping;

        this.oceanHazeMat = new THREE.MeshStandardMaterial({
            color: 0x001d3d, displacementMap: this.noiseTexture, displacementScale: 0.5,
            transparent: true, opacity: 0.5, roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide
        });
        this.oceanHazeGeo = new THREE.PlaneGeometry(160, CONFIG.SPAWNER.CELL_DEPTH, 24, 24);
        this.oceanHazeGeo.rotateX(-Math.PI / 2);

        this.biomeVisibility = {
            dunes: isDune => isDune,
            normalTree: (isDune, isOcean) => !isDune && !isOcean,
            deadTree: isDune => isDune,
            grass: (isDune, isOcean) => !isOcean,
            bush: (isDune, isOcean) => !isOcean,
            pebbles: (isDune, isOcean) => !isOcean,
            ocean_haze: (isDune, isOcean) => isOcean
        };

        this.pebbleGeo = new THREE.BoxGeometry(0.15, 0.05, 0.15);
        this.pebbleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

        this.duneGeo = new THREE.SphereGeometry(2.0, 16, 16, 0, Math.PI * 2, 0, Math.PI / 3);
        this.duneGeo.scale(2.0, 0.15, 4.0);
        this.duneMat = new THREE.MeshStandardMaterial({ color: 0x9b8a68, roughness: 0.8, metalness: 0.2 });

        this.createCells();
        this.loadGLBModels();
    }

    createCells() {
        const dummy = new THREE.Object3D();
        this.backZ = -CONFIG.WORLD.DEPTH - CONFIG.SPAWNER.CELL_DEPTH;
        const DECOS = [
            { key: 'pebbles', geo: this.pebbleGeo, mat: this.pebbleMat, count: CONFIG.SPAWNER.CELL_PEBBLES, shadow: false, visible: true, pos: (z) => ({ x: (Math.random() - 0.5) * 7, y: 0.1, z: z + Math.random() * CONFIG.SPAWNER.CELL_DEPTH, s: 1 }) }
        ];

        for (let c = 0; c < CONFIG.SPAWNER.NUM_CELLS; c++) {
            const zStart = -CONFIG.WORLD.DEPTH + (c * CONFIG.SPAWNER.CELL_DEPTH) - CONFIG.SPAWNER.CELL_DEPTH;
            const cell = { zStart, zEnd: zStart + CONFIG.SPAWNER.CELL_DEPTH, instancedMeshesArray: [], group: new THREE.Group(), currentBiome: null };
            cell.group.matrixAutoUpdate = false;
            this.scene.add(cell.group);

            DECOS.forEach(d => {
                const inst = new THREE.InstancedMesh(d.geo, d.mat, d.count);
                inst.castShadow = inst.receiveShadow = d.shadow;
                inst.visible = d.visible;
                inst.matrixAutoUpdate = false;
                inst.userData.key = d.key;
                inst.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);

                for (let i = 0; i < d.count; i++) {
                    const p = d.pos(zStart);
                    dummy.scale.set(p.s, p.s, p.s);
                    dummy.position.set(p.x, p.y, p.z);
                    dummy.updateMatrix();
                    inst.setMatrixAt(i, dummy.matrix);
                }
                cell.group.add(inst);
                cell.instancedMeshesArray.push(inst);
            });
            this.cells.push(cell);
        }
    }

    loadGLBModels() {
        const loader = new THREE.GLTFLoader();
        const MODEL_DEFS = {
            normalTree1: { file: 'models/NormalTree_3.glb', type: 'tree' },
            normalTree2: { file: 'models/NormalTree_5.glb', type: 'tree' },
            deadTree1: { file: 'models/DeadTree_2.glb', type: 'deadTree' },
            deadTree2: { file: 'models/DeadTree_6.glb', type: 'deadTree' },
            rock1: { file: 'models/Rock_1.glb', type: 'rock' },
            rock2: { file: 'models/Rock_2.glb', type: 'rock' },
            rock3: { file: 'models/Rock_3.glb', type: 'rock' },
            bush: { file: 'models/Bush_Small.glb', type: 'bush' },
            grass: { file: 'models/Grass_Large.glb', type: 'grass' }
        };

        const DEFAULT_COLORS = {
            tree: { trunk: 0x6B4226, foliage: 0x2D8C2D },
            deadTree: { trunk: 0x5A3A28, foliage: 0x4A3020 },
            rock: { rock: 0x7A7A7A },
            bush: { bush: 0x3A7A2A },
            grass: { grass: 0x4A9A3A }
        };

        const promises = Object.entries(MODEL_DEFS).map(([key, def]) => {
            return new Promise((resolve) => {
                loader.load(def.file, (gltf) => {
                    const meshes = [];
                    gltf.scene.traverse((child) => { if (child.isMesh) meshes.push(child); });

                    let trunkMesh = null;
                    if ((def.type === 'tree' || def.type === 'deadTree') && meshes.length > 1) {
                        let lowestY = Infinity;
                        meshes.forEach(m => {
                            m.geometry.computeBoundingBox();
                            const centerY = (m.geometry.boundingBox.min.y + m.geometry.boundingBox.max.y) / 2;
                            if (centerY < lowestY) { lowestY = centerY; trunkMesh = m; }
                        });
                    }

                    const modelParts = meshes.map(m => {
                        const isTrunk = (m === trunkMesh);
                        const role = (def.type === 'tree' || def.type === 'deadTree') ? (isTrunk ? 'trunk' : 'foliage') : def.type;
                        const material = new THREE.MeshLambertMaterial({ color: 0xffffff, map: m.material.map || null });
                        const color = DEFAULT_COLORS[def.type]?.[role];
                        if (color !== undefined) material.color.setHex(color);

                        const geometry = m.geometry.clone();
                        m.updateMatrixWorld(true);
                        geometry.applyMatrix4(m.matrixWorld);

                        return { geometry, material, role };
                    });

                    this.glbModels[key] = modelParts;
                    resolve();
                }, undefined, () => resolve());
            });
        });

        Promise.all(promises).then(() => {
            this.populateCellsWithGLB();
            this.gm.renderer.compile(this.gm.scene, this.gm.camera);
        });
    }

    populateCellsWithGLB() {
        const layoutCounts = {
            tree1: Math.floor(CONFIG.SPAWNER.CELL_TREES / 2),
            tree2: Math.ceil(CONFIG.SPAWNER.CELL_TREES / 2),
            rock1: Math.floor(CONFIG.SPAWNER.CELL_ROCKS / 3) + (CONFIG.SPAWNER.CELL_ROCKS % 3 > 0 ? 1 : 0),
            rock2: Math.floor(CONFIG.SPAWNER.CELL_ROCKS / 3) + (CONFIG.SPAWNER.CELL_ROCKS % 3 > 1 ? 1 : 0),
            rock3: Math.floor(CONFIG.SPAWNER.CELL_ROCKS / 3),
            bush: CONFIG.SPAWNER.CELL_BUSHES,
            grass: CONFIG.SPAWNER.CELL_GRASS
        };

        const dummy = new THREE.Object3D();

        this.cells.forEach(cell => {
            const grassBoundaryX = 4.75;

            for (const layoutKey in layoutCounts) {
                const count = layoutCounts[layoutKey];
                const modelKeys = (layoutKey === 'tree1') ? ['normalTree1', 'deadTree1'] :
                    (layoutKey === 'tree2') ? ['normalTree2', 'deadTree2'] : [layoutKey];

                const meshes = [];
                const shadowKey = layoutKey.includes('tree') ? 'tree' : layoutKey.includes('rock') ? 'rock' : 'blob';
                const shadowInst = new THREE.InstancedMesh(this.shadows.geos[shadowKey], this.shadows.material, count);
                shadowInst.position.y = 0.06;
                shadowInst.visible = false;
                shadowInst.userData.isShadow = true;
                cell.group.add(shadowInst);
                cell.instancedMeshesArray.push(shadowInst);

                modelKeys.forEach(modelKey => {
                    const parts = this.glbModels[modelKey];
                    let category = modelKey;
                    if (modelKey.includes('normalTree')) category = 'normalTree';
                    else if (modelKey.includes('deadTree')) category = 'deadTree';
                    else if (modelKey.includes('rock')) category = 'rock';

                    parts?.forEach((part, p) => {
                        const mat = part.material.clone();
                        mat.userData.role = part.role;
                        const instMesh = new THREE.InstancedMesh(part.geometry, mat, count);
                        instMesh.receiveShadow = true;
                        if (modelKey.startsWith('dead')) instMesh.visible = false;
                        if (!modelKey.startsWith('dead')) shadowInst.visible = true;
                        instMesh.userData.key = `${modelKey}_${p}`;
                        instMesh.userData.category = category;
                        instMesh.matrixAutoUpdate = false;
                        cell.group.add(instMesh);
                        cell.instancedMeshesArray.push(instMesh);
                        meshes.push(instMesh);
                    });
                });
                shadowInst.matrixAutoUpdate = false;
                meshes.push(shadowInst);

                for (let i = 0; i < count; i++) {
                    const isGrass = layoutKey === 'grass';
                    const scale = isGrass ? Math.random() * 1.5 + 2.0 : Math.random() * 1.2 + 0.4;
                    dummy.scale.set(scale, scale, scale);
                    let xPos = (Math.random() - 0.5) * (isGrass ? 100 : 80);
                    const boundary = isGrass ? grassBoundaryX : CONFIG.WORLD.LANE_BUFFER;
                    if (Math.abs(xPos) < boundary) xPos += Math.sign(xPos || 1) * boundary;

                    dummy.position.set(xPos, 0, cell.zStart + Math.random() * CONFIG.SPAWNER.CELL_DEPTH);
                    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
                    dummy.updateMatrix();

                    meshes.forEach(m => m.setMatrixAt(i, dummy.matrix));
                }

                const duneCount = 2;
                const duneInst = new THREE.InstancedMesh(this.duneGeo, this.duneMat, duneCount);
                const duneShadow = new THREE.InstancedMesh(this.shadows.geos.dune, this.shadows.material, duneCount);
                duneShadow.position.y = 0.04;
                duneShadow.rotation.x = -Math.PI / 2;

                duneInst.userData.key = 'dune';
                duneInst.userData.category = 'dunes';
                duneInst.visible = false;
                duneInst.matrixAutoUpdate = duneShadow.matrixAutoUpdate = false;

                for (let i = 0; i < duneCount; i++) {
                    const s = 1 + Math.random() * 1.5;
                    dummy.scale.set(s, s, s);
                    let x = (Math.random() - 0.5) * 120;
                    if (Math.abs(x) < 20) x += Math.sign(x || 1) * 20;
                    dummy.position.set(x, -0.4, cell.zStart + Math.random() * CONFIG.SPAWNER.CELL_DEPTH);
                    dummy.rotation.set(0, Math.random() * Math.PI, 0);
                    dummy.updateMatrix();

                    duneInst.setMatrixAt(i, dummy.matrix);
                    duneShadow.setMatrixAt(i, dummy.matrix);
                }
                duneInst.geometry.boundingSphere = duneShadow.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
                cell.group.add(duneInst, duneShadow);
                cell.instancedMeshesArray.push(duneInst, duneShadow);
            }

            const hazeInst = new THREE.InstancedMesh(this.oceanHazeGeo, this.oceanHazeMat, 3);
            const hazeDummy = new THREE.Object3D();
            const hazeZ = cell.zStart + CONFIG.SPAWNER.CELL_DEPTH / 2;
            [-85, 85, 0].forEach((x, i) => {
                hazeDummy.position.set(x, 0.1, hazeZ);
                hazeDummy.updateMatrix();
                hazeInst.setMatrixAt(i, hazeDummy.matrix);
            });

            hazeInst.userData.key = hazeInst.userData.category = 'ocean_haze';
            hazeInst.visible = false;
            cell.group.add(hazeInst);
            cell.instancedMeshesArray.push(hazeInst);
        });
    }

    scrollCells(speed, biomeName) {
        this.backZ += speed;
        this.cells.forEach(cell => {
            cell.group.position.z += speed;
            cell.group.updateMatrix();
            cell.zStart += speed;
            cell.zEnd += speed;

            if (cell.zStart > 15) {
                const newZ = this.backZ - CONFIG.SPAWNER.CELL_DEPTH;
                this.backZ = newZ;
                this.recycleCell(cell, newZ, biomeName);
            }
        });
    }

    recycleCell(cell, newZStart, biomeName) {
        cell.group.position.z += newZStart - cell.zStart;
        cell.zStart = newZStart;
        cell.zEnd = newZStart + CONFIG.SPAWNER.CELL_DEPTH;

        if (!biomeName || cell.currentBiome === biomeName) return;
        cell.currentBiome = biomeName;

        const isDesert = biomeName === 'BURNING DESERT';
        const isOcean = biomeName === 'ABYSSAL OCEAN';
        const palette = CONFIG.BIOME_COLORS[biomeName];

        cell.instancedMeshesArray.forEach(inst => {
            const cat = inst.userData.category;
            const vis = this.biomeVisibility[cat]?.(isDesert, isOcean);
            if (vis !== undefined) inst.visible = vis;

            if (palette && inst.material && !inst.userData.isShadow) {
                const role = inst.material.userData.role;
                const color = palette[role];
                if (color !== undefined) inst.material.color.setHex(color);
            }
        });
    }
}

