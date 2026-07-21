export const CONFIG = {
    WORLD: {
        DEPTH: 250,
        LANE_WIDTH: 2.5,
        GROUND_LEVEL: 0.5,
        LANE_BUFFER: 5.75
    },
    GAMEPLAY: {
        BASE_SPEED: 0.40,
        MAX_SPEED: 1.8,
        JUMP_FORCE: 0.55,
        GRAVITY: -0.06,
        FAST_FALL_GRAVITY: -0.18,
        LANE_SWAP_SPEED: 0.5,
        RAMP_BOOST_MULTIPLIER: 1.8,
        TRAFFIC_SPEED_MULT: 2.5,
        POWERUP_SPAWN_INTERVAL: 2000
    },
    POWERUPS: {
        BASE_DURATION: 840,
        LEVEL_BONUS: 60,
        MAGNET_PULL_RANGE: 25,
        MAGNET_PULL_STRENGTH: 0.4
    },
    EFFECTS: {
        FLASH_DURATION: 30,
        LASER_MAX_TIMER: 60,
        RAMP_TRIGGER_DURATION: 30,
        COIN_MULTIPLIER_CHANCE: 0.1,
        SHADOW_Y: 0.06
    },
    SPAWNER: {
        CELL_DEPTH: 12,
        NUM_CELLS: 20,
        CELL_TREES: 10,
        CELL_ROCKS: 3,
        CELL_BUSHES: 2,
        CELL_GRASS: 8,
        CELL_DUNES: 8,
        CELL_PEBBLES: 4
    },
    UPGRADES: {
        magnet_duration: { name: 'Magnet Capacitor', desc: 'Increases Magnet duration by 1s per level.', baseCost: 1000, scale: 1.5 },
        shield_duration: { name: 'Titanium Plating', desc: 'Increases Shield duration by 1s per level.', baseCost: 1000, scale: 1.5 },
        extra_lives: { name: 'Backup Core', desc: 'Start with an extra heart.', baseCost: 5000, scale: 3.0 },
        coin_multiplier: { name: 'Greed Protocol', desc: '10% chance per level to double collected coins.', baseCost: 2000, scale: 1.5 },
        slow_start: { name: 'Inertia Dampeners', desc: 'Slows the starting run speed ramp-up.', baseCost: 3000, scale: 1.8 }
    },
    ZONES: [
        { name: 'VERDANT PLAINS', bg: 0x87CEEB, ground: 0x55aa55, path: 0x8b5a2b, rock: 0x888888 },
        { name: 'BURNING DESERT', bg: 0xc49a3a, ground: 0xb5a078, path: 0xa08860, rock: 0x8b4513 },
        { name: 'AUTUMN FOREST', bg: 0xffaa55, ground: 0xcc7722, path: 0x4a2c11, rock: 0x776655 },
        { name: 'ABYSSAL OCEAN', bg: 0x000033, ground: 0x003366, path: 0x004488, rock: 0x112244 },
        { name: 'FROZEN TUNDRA', bg: 0xcae8ff, ground: 0xeeeeff, path: 0x88bbee, rock: 0x99ccff },
        { name: 'VOLCANIC ASH', bg: 0x441111, ground: 0x222222, path: 0x331111, rock: 0x442222 },
        { name: 'SUGAR RUSH', bg: 0xffb6c1, ground: 0xff69b4, path: 0xffffff, rock: 0x00ffff },
        { name: 'ETERNAL HEAVEN', bg: 0xaaddff, ground: 0x88aabb, path: 0xcca600, rock: 0x99aabb },
        { name: 'INFERNAL HELL', bg: 0x330000, ground: 0x8b0000, path: 0x000000, rock: 0x220000 },
        { name: 'NEON VOID', bg: 0x010111, ground: 0x000000, path: 0x110033, rock: 0xff00ff }
    ],
    BIOME_COLORS: {
        'VERDANT PLAINS': { trunk: 0x6B4226, foliage: 0x2D8C2D, rock: 0x7A7A7A, bush: 0x3A7A2A, grass: 0x4A9A3A },
        'AUTUMN FOREST': { trunk: 0x5A3218, foliage: 0xCC6600, rock: 0x7A7A6A, bush: 0x8B6914, grass: 0x9B7B24 },
        'FROZEN TUNDRA': { trunk: 0x6B4226, foliage: 0xE0E8F0, rock: 0x9A9AA0, bush: 0xA8C8B8, grass: 0xC0D8C0 },
        'BURNING DESERT': { trunk: 0x5A3A28, foliage: 0x4A3020, rock: 0xAA9A7A, bush: 0x8A7A3A, grass: 0x8A9A4A },
        'ABYSSAL OCEAN': { trunk: 0x3A4A3A, foliage: 0x2A5A3A, rock: 0x556655, bush: 0x3A6A4A, grass: 0x3A7A4A },
        'SUGAR RUSH': { trunk: 0x8B5A3A, foliage: 0xFF88BB, rock: 0xFFAAAA, bush: 0xFF77AA, grass: 0xFF0000 },
        'ETERNAL HEAVEN': { trunk: 0xBBAA88, foliage: 0xCCA600, rock: 0xBBAAAA, bush: 0x88BB55, grass: 0x66AA44 },
        'NEON VOID': { trunk: 0x4A2066, foliage: 0x8833FF, rock: 0x553388, bush: 0x6644AA, grass: 0x8833FF },
        'VOLCANIC ASH': { trunk: 0x666666, foliage: 0x888888, rock: 0x444444, bush: 0x444444, grass: 0x000000 },
        'INFERNAL HELL': { trunk: 0x3A2020, foliage: 0x882200, rock: 0x554444, bush: 0x663300, grass: 0x554422 }
    },
    PATTERNS: {
        COIN_LINE: {
            spacing: 20,
            elements: [
                { type: 'coin', lane: 'L0', z: 0 },
                { type: 'coin', lane: 'L0', z: -2 },
                { type: 'coin', lane: 'L0', z: -4 },
                { type: 'coin', lane: 'L0', z: -6 },
                { type: 'coin', lane: 'L0', z: -8 }
            ]
        },
        ZIG_ZAG_COINS: {
            spacing: 25,
            elements: [
                { type: 'coin', lane: -1, z: 0 },
                { type: 'coin', lane: 0, z: -3 },
                { type: 'coin', lane: 1, z: -6 },
                { type: 'coin', lane: 0, z: -9 },
                { type: 'coin', lane: -1, z: -12 }
            ]
        },
        TRIPLE_SHORT_WALL: {
            spacing: 15,
            elements: [
                { type: 'sObs', lane: 'L0', z: 0 },
                { type: 'sObs', lane: 'L1', z: 0 },
                { type: 'sObs', lane: 'L2', z: 0 },
                { type: 'coin', lane: 'L1', z: 0, high: true }
            ]
        },
        WALL_GAP: {
            spacing: 25,
            elements: [
                { type: 'sObs', lane: 'L0', z: 0 },
                { type: 'coin', lane: 'L0', z: 0, high: true },
                { type: 'sObs', lane: 'L1', randZ: 2 }
            ]
        },
        JUMP_TRAP: {
            spacing: 20,
            elements: [
                { type: 'sObs', lane: 'L0', z: 0 },
                { type: 'coin', lane: 'L0', z: 0, high: true },
                { type: 'coin', lane: 'L0', z: -3 },
                { type: 'coin', lane: 'L0', z: -5 }
            ]
        },
        TALL_WALL_MIX: {
            spacing: 25,
            elements: [
                { type: 'tObs', lane: 'L0', z: 0 },
                { type: 'sObs', lane: 'L1', randZ: 2 },
                { type: 'coin', lane: 'L1', randZ: 2, high: true }
            ]
        },
        DOUBLE_WALL: {
            spacing: 25,
            elements: [
                { type: 'tObs', lane: 'L0', z: 0 },
                { type: 'sObs', lane: 'L1', z: 0 },
                { type: 'coin', lane: 'L1', z: 0, high: true }
            ]
        },
        CORRIDOR: {
            spacing: 40,
            elements: [
                { type: 'sObs', lane: 'L0', z: 0 },
                { type: 'sObs', lane: 'L1', z: 2 },
                { type: 'coin', lane: 'L2', z: 0 },
                { type: 'sObs', lane: 'L0', z: -10 },
                { type: 'sObs', lane: 'L1', z: -8 },
                { type: 'coin', lane: 'L2', z: -10 },
                { type: 'sObs', lane: 'L0', z: -20 },
                { type: 'sObs', lane: 'L1', z: -18 },
                { type: 'coin', lane: 'L2', z: -20 }
            ]
        },
        TRIPLE_WALL: {
            spacing: 25,
            elements: [
                { type: 'tObs', lane: 'L0', z: 0 },
                { type: 'tObs', lane: 'L1', z: 0 },
                { type: 'sObs', lane: 'L2', z: 0 },
                { type: 'coin', lane: 'L2', z: 0, high: true }
            ]
        },
        V_SHAPE: {
            spacing: 25,
            elements: [
                { type: 'sObs', lane: -1, z: 0 },
                { type: 'sObs', lane: 1, z: 0 },
                { type: 'coin', lane: 'BS', z: 0, high: true },
                { type: 'tObs', lane: 0, z: -10 },
                { type: 'tObs', lane: 'BS', z: -10 },
                { type: 'coin', lane: 'SS', z: -10 }
            ]
        },
        DIAMOND_COINS: {
            spacing: 20,
            elements: [
                { type: 'coin', lane: 0, z: 0 },
                { type: 'coin', lane: -1, z: -3 },
                { type: 'coin', lane: 1, z: -3 },
                { type: 'coin', lane: 0, z: -6 }
            ]
        },
        TIGHT_CORNER: {
            spacing: 30,
            elements: [
                { type: 'tObs', lane: 'L0', z: 0 },
                { type: 'tObs', lane: 'L1', z: 0 },
                { type: 'coin', lane: 'L2', z: 0 },
                { type: 'tObs', lane: 'L2', z: -9 },
                { type: 'tObs', lane: 'L1', z: -9 },
                { type: 'coin', lane: 'L0', z: -9 }
            ]
        },
        X_CROSSING: {
            spacing: 25,
            elements: [
                { type: 'sObs', lane: -1, z: 0 },
                { type: 'sObs', lane: 1, z: 0 },
                { type: 'coin', lane: 0, z: 0 },
                { type: 'tObs', lane: 0, z: -8 },
                { type: 'coin', lane: -1, z: -8 },
                { type: 'coin', lane: 1, z: -8 }
            ]
        },
        DEATH_TRAP: {
            spacing: 30,
            elements: [
                { type: 'tObs', lane: -1, z: 0 },
                { type: 'tObs', lane: 1, z: 0 },
                { type: 'sObs', lane: 0, z: 0 },
                { type: 'tObs', lane: 0, z: -6 },
                { type: 'sObs', lane: 'L1', z: -6 }
            ]
        },
        RAMP_JUMP: {
            spacing: 25,
            elements: [
                { type: 'ramp', lane: 'L0', z: 0 },
                { type: 'tObs', lane: 'L0', z: -8 },
                { type: 'coin', lane: 'L0', z: -3 },
                { type: 'coin', lane: 'L0', z: -6 }
            ]
        },
        TRAFFIC_JAM: {
            spacing: 25,
            elements: [
                { type: 'traffic', lane: 'L0', z: -20 },
                { type: 'sObs', lane: 'L1', z: 0 },
                { type: 'coin', lane: 'L2', z: -5 }
            ]
        },
        LASER_GATE: {
            spacing: 25,
            elements: [
                { type: 'laser', lane: 0, z: 0 },
                { type: 'coin', lane: 0, z: -3 }
            ]
        },
        FULL_BLOCK: {
            spacing: 30,
            elements: [
                { type: 'tObs', lane: -1, z: 0 },
                { type: 'tObs', lane: 1, z: 0 },
                { type: 'laser', lane: 0, z: 0 }
            ]
        },
        TRIPLE_TRAFFIC: {
            spacing: 50,
            elements: [
                { type: 'traffic', lane: 'L0', z: -20 },
                { type: 'traffic', lane: 'L1', z: -30 },
                { type: 'traffic', lane: 'L2', z: -40 }
            ]
        },
        ZIG_ZAG_TERROR: {
            spacing: 35,
            elements: [
                { type: 'tObs', lane: -1, z: 0 },
                { type: 'tObs', lane: 0, z: 0 },
                { type: 'coin', lane: 1, z: 0 },
                { type: 'tObs', lane: 1, z: -8 },
                { type: 'tObs', lane: 0, z: -8 },
                { type: 'coin', lane: -1, z: -8 },
                { type: 'tObs', lane: -1, z: -16 },
                { type: 'tObs', lane: 0, z: -16 },
                { type: 'coin', lane: 1, z: -16 }
            ]
        },
        LASER_STAIRS: {
            spacing: 40,
            elements: [
                { type: 'laser', lane: 0, z: 0 },
                { type: 'sObs', lane: -1, z: -12 },
                { type: 'sObs', lane: 1, z: -12 },
                { type: 'sObs', lane: 0, z: -12 },
                { type: 'laser', lane: 0, z: -24 }
            ]
        },
        TRAFFIC_WEAVE: {
            spacing: 40,
            elements: [
                { type: 'traffic', lane: 'L0', z: -20 },
                { type: 'traffic', lane: 'L1', z: -28 },
                { type: 'coin', lane: 'L2', z: -25 }
            ]
        },
        RAMP_OVER_LASER: {
            spacing: 30,
            elements: [
                { type: 'ramp', lane: 'L0', z: 0 },
                { type: 'laser', lane: 0, z: -5 },
                { type: 'tObs', lane: 'L0', z: -12 },
                { type: 'coin', lane: 'L1', z: -10 }
            ]
        },
        TIGHTROPE: {
            spacing: 25,
            elements: [
                { type: 'tObs', lane: -1, z: 0 },
                { type: 'tObs', lane: 1, z: 0 },
                { type: 'sObs', lane: 0, z: 0 },
                { type: 'tObs', lane: -1, z: -12 },
                { type: 'tObs', lane: 1, z: -12 },
                { type: 'sObs', lane: 0, z: -12 },
                { type: 'coin', lane: 0, z: -6 }
            ]
        },
        DOUBLE_LASER_JUMP: {
            spacing: 20,
            elements: [
                { type: 'laser', lane: 0, z: 0 },
                { type: 'laser', lane: 0, z: -8 },
                { type: 'coin', lane: 0, z: -4 }
            ]
        }
    },
    DIFFICULTY_THRESHOLDS: [
        { dist: 500, patterns: ['DIAMOND_COINS', 'TRAFFIC_JAM'] },
        { dist: 1000, patterns: ['JUMP_TRAP', 'TALL_WALL_MIX', 'LASER_GATE'] },
        { dist: 1500, patterns: ['TIGHT_CORNER', 'FULL_BLOCK'] },
        { dist: 2000, patterns: ['X_CROSSING', 'TRIPLE_TRAFFIC'] },
        { dist: 3000, patterns: ['DOUBLE_WALL', 'CORRIDOR'] },
        { dist: 4000, patterns: ['DEATH_TRAP'] },
        { dist: 5000, patterns: ['ZIG_ZAG_TERROR', 'LASER_STAIRS', 'TRAFFIC_WEAVE', 'RAMP_OVER_LASER', 'TIGHTROPE', 'DOUBLE_LASER_JUMP'] }
    ],
    ENTITY_DEFS: {
        coin: { size: 150 },
        sObs: { size: 50 },
        tObs: { size: 50 },
        traffic: { size: 15 },
        ramp: { size: 10 },
        laser: { size: 10 },
        heart: { size: 5 },
        shield: { size: 5 },
        magnet: { size: 5 }
    }
};
