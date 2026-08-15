import { Graphics, Label } from 'cc';
import { Entity } from '../ecs/World';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export class GameConfig {
    maxEnemies = 500;
    useSpatialHash = true;
    spawnPerSecond = 8;
    enemyHpScale = 1;
}

export class InputState {
    x = 0;
    y = 0;
    restart = false;
    togglePause = false;
    toggleHash = false;
    capPreset = -1;
}

export class GameEvents {
    damages: { target: Entity; amount: number; source: Entity }[] = [];
    pickups: { entity: Entity; amount: number }[] = [];

    clear(): void {
        this.damages.length = 0;
        this.pickups.length = 0;
    }
}

export class HudView {
    stats: Label | null = null;
    systems: Label | null = null;
    help: Label | null = null;
    hint: Label | null = null;
    banner: Label | null = null;
}

export class GameContext {
    readonly input = new InputState();
    readonly events = new GameEvents();
    readonly config = new GameConfig();
    readonly hud = new HudView();

    graphics: Graphics | null = null;
    player: Entity = 0;
    paused = false;
    dead = false;
    time = 0;
    kills = 0;
    level = 1;
    xp = 0;
    xpToNext = 12;
    shake = 0;
    viewW = VIEW_W;
    viewH = VIEW_H;

    resetRun(): void {
        this.paused = false;
        this.dead = false;
        this.time = 0;
        this.kills = 0;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 12;
        this.shake = 0;
        this.config.spawnPerSecond = 8;
        this.config.enemyHpScale = 1;
        this.events.clear();
    }
}

export const ENEMY_CAP_PRESETS = [200, 500, 1000, 2000];

export function xpNeeded(level: number): number {
    return Math.floor(12 + (level - 1) * 10 + (level - 1) * (level - 1) * 1.6);
}
