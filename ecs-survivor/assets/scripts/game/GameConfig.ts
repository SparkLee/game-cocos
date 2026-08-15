import { Graphics, Label, Node } from 'cc';
import { Entity } from '../ecs/World';
import { Sfx } from './Sfx';
import { SpineCatalog } from './SpineCatalog';

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const PLAYER_CONTACT_RANGE = 200; // 敌人碰到主角的距离；精英 attack2 也用这个

/** 本局可调参数。敌人上限运行中按 1–4 切换。 */
export class GameConfig {
    maxEnemies = 5000;         // 同时存在的敌人上限
    useSpatialHash = true;     // true：空间哈希；false：全对全 O(n²)
    spawnPerSecond = 8;        // 每秒尝试刷几只怪，随时间在 SpawnSystem 里上涨
    enemyHpScale = 1;          // 敌人血量随时间放大的倍率
}

/** 本帧输入快照。InputSystem 写入，GameApp / 其它系统读取。 */
export class InputState {
    x = 0;                     // 水平方向，-1..1
    y = 0;                     // 垂直方向，-1..1
    restart = false;
    togglePause = false;
    toggleHash = false;
    toggleMute = false;
    toggleHud = false;         // H：隐藏 / 显示 HUD
    capPreset = -1;            // 1–4 对应 ENEMY_CAP_PRESETS 下标，-1 表示没按
}

/** 本帧碰撞结果。CollisionSystem 写入，Combat / XP 消费后 clear。 */
export class GameEvents {
    damages: { target: Entity; amount: number; source: Entity }[] = [];
    pickups: { entity: Entity; amount: number }[] = [];

    clear(): void {
        this.damages.length = 0;
        this.pickups.length = 0;
    }
}

/** HUD 五块 Label 的引用，文字由 HudSystem 填。 */
export class HudView {
    root: Node | null = null;           // HUD 根节点，按 H 开关显示
    stats: Label | null = null;     // 左上：状态
    systems: Label | null = null;   // 右上：耗时
    help: Label | null = null;      // 左下：说明
    hint: Label | null = null;      // 底部：按键
    banner: Label | null = null;    // 正中：暂停 / 死亡
    visible = true;
}

/** 一局游戏的共享状态。System 之间不互相引用，都读这份上下文。 */
export class GameContext {
    readonly input = new InputState();
    readonly events = new GameEvents();
    readonly config = new GameConfig();
    readonly hud = new HudView();
    readonly sfx = new Sfx();
    readonly spines = new SpineCatalog();  // 主角 / 怪的 SkeletonData + 子弹图，GameApp 启动时加载

    graphics: Graphics | null = null;  // 地面网格 + 经验球占位圆
    entityRoot: Node | null = null;    // 实体节点的父节点，跟主角反向平移当相机
    enemiesRoot: Node | null = null;   // 普通怪，单独一层方便同图集合批
    elitesRoot: Node | null = null;    // 精英怪，图集不同，不能和普通怪穿插
    bulletsRoot: Node | null = null;
    expOrbsRoot: Node | null = null;
    player: Entity = 0;
    paused = false;
    dead = false;
    time = 0;
    kills = 0;
    level = 1;
    xp = 0;
    xpToNext = 12;
    shake = 0;                         // 受击镜头抖动，RenderSystem 每帧衰减
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

export const ENEMY_CAP_PRESETS = [2000, 5000, 10000, 20000]; // 按键 1–4

export function xpNeeded(level: number): number {
    // 线性项 + 平方项：越往后每一级要的 XP 涨得越快。
    return Math.floor(12 + (level - 1) * 10 + (level - 1) * (level - 1) * 1.6);
}
