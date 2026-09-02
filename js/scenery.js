import { CONFIG } from './config.js';
import { ShadowManager } from './entities.js';

export class SceneryManager {
    constructor(scene, gm) {
        this.scene = scene;
        this.gm = gm;
        this.shadows = new ShadowManager();
        this.cells = [];
        this.glbModels = {};
        this.sceneryMeshes = [];

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

        const duneW = 24, duneL = 32;
        this.duneGeo = new THREE.PlaneGeometry(duneW, duneL, 22, 22);
        this.duneGeo.rotateX(-Math.PI / 2);
        const posAttr = this.duneGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            const nx = x / (duneW * 0.5);
            const nz = z / (duneL * 0.5);
            const ridgeX = nx - 0.15 * (1 - nz * nz);
            const r = Math.sqrt(ridgeX * ridgeX + nz * nz);
            if (r < 1.0) {
                const h = 2.8 * Math.pow(Math.cos(r * Math.PI * 0.5), 2);
                posAttr.setY(i, h);
            } else {
                posAttr.setY(i, 0);
            }
        }
        this.duneGeo.computeVertexNormals();

        this.createCells();
        this.loadGLBModels();
    }

    createCells() {
        this.backZ = -CONFIG.WORLD.DEPTH - CONFIG.SPAWNER.CELL_DEPTH;
        const NUM_CELLS = CONFIG.SPAWNER.NUM_CELLS;
        const CELL_DEPTH = CONFIG.SPAWNER.CELL_DEPTH;

        this.pebbleMesh = new THREE.InstancedMesh(this.pebbleGeo, this.pebbleMat, NUM_CELLS * CONFIG.SPAWNER.CELL_PEBBLES);
        this.duneMesh = new THREE.InstancedMesh(this.duneGeo, this.gm.groundMat, NUM_CELLS * 2);
        this.hazeMesh = new THREE.InstancedMesh(this.oceanHazeGeo, this.oceanHazeMat, NUM_CELLS * 3);

        this.treeShadowMesh = new THREE.InstancedMesh(this.shadows.geos.tree, this.shadows.material, NUM_CELLS * CONFIG.SPAWNER.CELL_TREES);
        this.rockShadowMesh = new THREE.InstancedMesh(this.shadows.geos.rock, this.shadows.material, NUM_CELLS * CONFIG.SPAWNER.CELL_ROCKS);
        this.blobShadowMesh = new THREE.InstancedMesh(this.shadows.geos.blob, this.shadows.material, NUM_CELLS * (CONFIG.SPAWNER.CELL_BUSHES + CONFIG.SPAWNER.CELL_GRASS));

        const dummy = new THREE.Object3D();

        this.cells = [];
        for (let c = 0; c < NUM_CELLS; c++) {
            const zStart = -CONFIG.WORLD.DEPTH + (c * CELL_DEPTH) - CELL_DEPTH;
            const cell = {
                c,
                zStart,
                zEnd: zStart + CELL_DEPTH,
                currentBiome: null,
                items: []
            };

            for (let i = 0; i < CONFIG.SPAWNER.CELL_PEBBLES; i++) {
                const instIdx = c * CONFIG.SPAWNER.CELL_PEBBLES + i;
                dummy.scale.set(1, 1, 1);
                dummy.position.set((Math.random() - 0.5) * 7, 0.1, zStart + Math.random() * CELL_DEPTH);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                this.pebbleMesh.setMatrixAt(instIdx, dummy.matrix);
                cell.items.push({ mesh: this.pebbleMesh, idx: instIdx, baseY: 0.1, category: 'pebbles' });
            }

            for (let i = 0; i < 2; i++) {
                const instIdx = c * 2 + i;
                const s = 0.85 + Math.random() * 0.35;
                dummy.scale.set(s, s, s);
                const side = (i === 0) ? -1 : 1;
                const x = side * (15.5 + Math.random() * 10);
                const z = zStart + Math.random() * CELL_DEPTH;
                const rotY = (side > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.4;

                dummy.position.set(x, -999, z);
                dummy.rotation.set(0, rotY, 0);
                dummy.updateMatrix();
                this.duneMesh.setMatrixAt(instIdx, dummy.matrix);

                cell.items.push({ mesh: this.duneMesh, idx: instIdx, baseY: -0.05, category: 'dunes' });
            }

            const hazeZ = zStart + CELL_DEPTH / 2;
            [-85, 85, 0].forEach((x, i) => {
                const instIdx = c * 3 + i;
                dummy.scale.set(1, 1, 1);
                dummy.position.set(x, -999, hazeZ);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                this.hazeMesh.setMatrixAt(instIdx, dummy.matrix);
                cell.items.push({ mesh: this.hazeMesh, idx: instIdx, baseY: 0.1, category: 'ocean_haze' });
            });

            this.cells.push(cell);
        }

        this.sceneryMeshes = [
            this.pebbleMesh, this.duneMesh, this.hazeMesh,
            this.treeShadowMesh, this.rockShadowMesh, this.blobShadowMesh
        ];

        this.sceneryMeshes.forEach(m => {
            m.frustumCulled = false;
            this.scene.add(m);
        });
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
                        const defaultColor = DEFAULT_COLORS[def.type]?.[role] ?? 0xffffff;

                        const geometry = m.geometry.clone();
                        m.updateMatrixWorld(true);
                        geometry.applyMatrix4(m.matrixWorld);

                        return { geometry, material, role, defaultColor };
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
        const NUM_CELLS = CONFIG.SPAWNER.NUM_CELLS;
        const CELL_DEPTH = CONFIG.SPAWNER.CELL_DEPTH;

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
        const tempColor = new THREE.Color();

        this.glbInstancedMeshes = {};
        for (const modelKey in this.glbModels) {
            const parts = this.glbModels[modelKey];
            const countPerCell = layoutCounts[modelKey] || (modelKey.includes('Tree1') ? layoutCounts.tree1 : layoutCounts.tree2);

            parts.forEach((part, p) => {
                const key = `${modelKey}_${p}`;
                const instMesh = new THREE.InstancedMesh(part.geometry, part.material, NUM_CELLS * countPerCell);
                instMesh.frustumCulled = false;
                this.glbInstancedMeshes[key] = instMesh;
                this.sceneryMeshes.push(instMesh);
                this.scene.add(instMesh);
            });
        }

        let treeShadowIdx = 0;
        let rockShadowIdx = 0;
        let blobShadowIdx = 0;

        this.cells.forEach(cell => {
            const grassBoundaryX = 4.75;

            for (const layoutKey in layoutCounts) {
                const count = layoutCounts[layoutKey];
                const isTree = layoutKey.includes('tree');
                const isRock = layoutKey.includes('rock');
                const isGrass = layoutKey === 'grass';

                for (let i = 0; i < count; i++) {
                    const scale = isGrass ? Math.random() * 1.5 + 2.0 : Math.random() * 1.2 + 0.4;
                    dummy.scale.set(scale, scale, scale);
                    let xPos = (Math.random() - 0.5) * (isGrass ? 100 : 80);
                    const boundary = isGrass ? grassBoundaryX : CONFIG.WORLD.LANE_BUFFER;
                    if (Math.abs(xPos) < boundary) xPos += Math.sign(xPos || 1) * boundary;

                    const zPos = cell.zStart + Math.random() * CELL_DEPTH;
                    const rotY = Math.random() * Math.PI * 2;

                    let sMesh = null, sIdx = -1;
                    if (isTree) {
                        sMesh = this.treeShadowMesh;
                        sIdx = treeShadowIdx++;
                    } else if (isRock) {
                        sMesh = this.rockShadowMesh;
                        sIdx = rockShadowIdx++;
                    } else {
                        sMesh = this.blobShadowMesh;
                        sIdx = blobShadowIdx++;
                    }

                    dummy.position.set(xPos, 0.06, zPos);
                    dummy.rotation.set(0, rotY, 0);
                    dummy.updateMatrix();
                    sMesh.setMatrixAt(sIdx, dummy.matrix);

                    const modelKeys = (layoutKey === 'tree1') ? ['normalTree1', 'deadTree1'] :
                        (layoutKey === 'tree2') ? ['normalTree2', 'deadTree2'] : [layoutKey];

                    modelKeys.forEach(modelKey => {
                        const parts = this.glbModels[modelKey];
                        const isDead = modelKey.startsWith('dead');
                        let category = modelKey;
                        if (modelKey.includes('normalTree')) category = 'normalTree';
                        else if (modelKey.includes('deadTree')) category = 'deadTree';
                        else if (modelKey.includes('rock')) category = 'rock';

                        const instIdx = cell.c * count + i;
                        dummy.position.set(xPos, isDead ? -999 : 0, zPos);
                        dummy.rotation.set(0, rotY, 0);
                        dummy.updateMatrix();

                        parts.forEach((part, p) => {
                            const key = `${modelKey}_${p}`;
                            const instMesh = this.glbInstancedMeshes[key];
                            instMesh.setMatrixAt(instIdx, dummy.matrix);

                            tempColor.setHex(part.defaultColor);
                            instMesh.setColorAt(instIdx, tempColor);

                            cell.items.push({
                                mesh: instMesh,
                                shadowMesh: sMesh,
                                idx: instIdx,
                                shadowIdx: sIdx,
                                baseY: 0,
                                shadowY: 0.06,
                                category,
                                role: part.role
                            });
                        });
                    });
                }
            }
        });

        this.sceneryMeshes.forEach(m => {
            m.instanceMatrix.needsUpdate = true;
            if (m.instanceColor) m.instanceColor.needsUpdate = true;
        });
    }

    scrollCells(speed, biomeName) {
        this.backZ += speed;

        for (let m = 0; m < this.sceneryMeshes.length; m++) {
            const mesh = this.sceneryMeshes[m];
            const arr = mesh.instanceMatrix.array;
            const total = mesh.count * 16;
            for (let i = 14; i < total; i += 16) {
                arr[i] += speed;
            }
            mesh.instanceMatrix.needsUpdate = true;
        }

        for (let c = 0; c < this.cells.length; c++) {
            const cell = this.cells[c];
            cell.zStart += speed;
            cell.zEnd += speed;

            if (cell.zStart > 15) {
                const newZ = this.backZ - CONFIG.SPAWNER.CELL_DEPTH;
                this.backZ = newZ;
                this.recycleCell(cell, newZ, biomeName);
            }
        }
    }

    recycleCell(cell, newZStart, biomeName) {
        const deltaZ = newZStart - cell.zStart;
        cell.zStart = newZStart;
        cell.zEnd = newZStart + CONFIG.SPAWNER.CELL_DEPTH;

        const isDesert = biomeName === 'BURNING DESERT';
        const isOcean = biomeName === 'ABYSSAL OCEAN';
        const palette = biomeName ? CONFIG.BIOME_COLORS[biomeName] : null;

        cell.currentBiome = biomeName;

        const tempColor = new THREE.Color();
        const updatedColorMeshes = new Set();

        for (let i = 0; i < cell.items.length; i++) {
            const item = cell.items[i];
            const arr = item.mesh.instanceMatrix.array;
            const offset = item.idx * 16;

            arr[offset + 14] += deltaZ;

            const vis = this.biomeVisibility[item.category]?.(isDesert, isOcean) ?? true;
            arr[offset + 13] = vis ? item.baseY : -999;

            if (item.shadowMesh) {
                const sArr = item.shadowMesh.instanceMatrix.array;
                const sOffset = item.shadowIdx * 16;
                sArr[sOffset + 14] += deltaZ;
                sArr[sOffset + 13] = vis ? (item.shadowY || 0.06) : -999;
            }

            if (palette && item.role) {
                const color = palette[item.role];
                if (color !== undefined) {
                    tempColor.setHex(color);
                    item.mesh.setColorAt(item.idx, tempColor);
                    updatedColorMeshes.add(item.mesh);
                }
            }
        }

        updatedColorMeshes.forEach(mesh => {
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        });
    }
}

