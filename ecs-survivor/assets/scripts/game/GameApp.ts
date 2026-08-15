import { _decorator, Color, Component, Graphics, Label, Node, UITransform } from 'cc';
import { World } from '../ecs/World';
import {
    Caption,
    Health,
    Player,
    Position,
    Radius,
    Tint,
    Velocity,
    Weapon,
    makeCaption,
    makeHealth,
    makePosition,
    makeRadius,
    makeTint,
    makeVelocity,
} from './Components';
import { ENEMY_CAP_PRESETS, GameContext } from './GameConfig';
import { CollisionSystem } from './systems/CollisionSystem';
import { CombatSystem } from './systems/CombatSystem';
import { EnemyAISystem } from './systems/EnemyAISystem';
import { HudSystem } from './systems/HudSystem';
import { InputSystem } from './systems/InputSystem';
import { LifetimeSystem } from './systems/LifetimeSystem';
import { MagnetSystem } from './systems/MagnetSystem';
import { MovementSystem } from './systems/MovementSystem';
import { RenderSystem } from './systems/RenderSystem';
import { SpawnSystem } from './systems/SpawnSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { XpSystem } from './systems/XpSystem';

const { ccclass, property } = _decorator;

/**
 * Cocos 入口：建画布、注册 System、每帧驱动 World。
 * 系统顺序：输入 → 移动 → AI → 武器 → 碰撞 → 战斗 → 寿命 → 刷怪 → 磁铁 → 经验 → 渲染 → HUD。
 */
@ccclass('GameApp')
export class GameApp extends Component {
    @property({ tooltip: '开局敌人上限，运行中按 1-4 切换 2000/5000/10000/20000' })
    maxEnemies = 5000;

    private readonly ctx = new GameContext();
    private readonly world = new World();
    private inputSystem: InputSystem | null = null;
    private spawnSystem: SpawnSystem | null = null;
    private renderSystem: RenderSystem | null = null;
    private started = false;

    onLoad(): void {
        this.syncViewSize();
        this.buildView();
        this.inputSystem = new InputSystem(this.ctx);
        this.spawnSystem = new SpawnSystem(this.ctx);
        this.renderSystem = new RenderSystem(this.ctx);
        this.world
            .register(this.inputSystem)                 // WASD / 鼠标 → 主角速度
            .register(new MovementSystem(this.ctx))     // Position += Velocity * dt
            .register(new EnemyAISystem(this.ctx))      // 怪朝主角走
            .register(new WeaponSystem(this.ctx))       // 冷却到了就生成子弹
            .register(new CollisionSystem(this.ctx))    // 写出 damages / pickups
            .register(new CombatSystem(this.ctx))       // 扣血、击杀掉落
            .register(new LifetimeSystem(this.ctx))     // 子弹超时消失
            .register(this.spawnSystem)                 // 在主角周围刷怪
            .register(new MagnetSystem(this.ctx))       // 经验球吸向主角
            .register(new XpSystem(this.ctx))           // 拾取升级
            .register(this.renderSystem)                // ECS 数据 → 真实 Node
            .register(new HudSystem(this.ctx));         // 叠字
        this.startRun();
        this.started = true;
    }

    onDestroy(): void {
        this.inputSystem?.dispose();
    }

    update(dt: number): void {
        if (!this.started) {
            return;
        }
        this.world.update(dt);
        this.applySessionCommands();
    }

    /** 清空 World，重新生成主角。R 重开走这里。 */
    private startRun(): void {
        this.renderSystem?.reset();
        this.world.reset();
        this.spawnSystem?.reset();
        this.ctx.resetRun();
        this.ctx.config.maxEnemies = this.maxEnemies;
        this.ctx.player = this.spawnPlayer();
    }

    /** 主角 = Player + Weapon + 位置/血量/颜色。行为不写在节点上。 */
    private spawnPlayer(): number {
        const entity = this.world.create();
        this.world.add(entity, Player);
        this.world.add(entity, Weapon);
        this.world.add(entity, Position, makePosition(0, 0));
        this.world.add(entity, Velocity, makeVelocity(0, 0));
        this.world.add(entity, Radius, makeRadius(20));
        this.world.add(entity, Health, makeHealth(100000));
        this.world.add(entity, Tint, makeTint(90, 230, 210));
        this.world.add(entity, Caption, makeCaption('主角'));
        return entity;
    }

    /** 消费本帧一次性按键：切碰撞、静音、敌人上限、暂停、重开。 */
    private applySessionCommands(): void {
        const input = this.ctx.input;
        if (input.toggleHash) {
            this.ctx.config.useSpatialHash = !this.ctx.config.useSpatialHash;
        }
        if (input.toggleMute) {
            this.ctx.sfx.muted = !this.ctx.sfx.muted;
        }
        if (input.capPreset >= 0 && input.capPreset < ENEMY_CAP_PRESETS.length) {
            this.ctx.config.maxEnemies = ENEMY_CAP_PRESETS[input.capPreset];
            this.maxEnemies = this.ctx.config.maxEnemies;
        }
        if (input.togglePause && !this.ctx.dead) {
            this.ctx.paused = !this.ctx.paused;
        }
        if (input.restart) {
            this.startRun();
        }
    }

    private syncViewSize(): void {
        const canvas = this.node.parent?.getComponent(UITransform);
        if (canvas && canvas.contentSize.width > 0) {
            this.ctx.viewW = canvas.contentSize.width;
            this.ctx.viewH = canvas.contentSize.height;
        }
    }

    /** 网格、实体根节点（含敌人/子弹/经验球分组）、HUD。 */
    private buildView(): void {
        const worldNode = this.ensureChild('WorldDraw');
        const worldTransform = worldNode.getComponent(UITransform) ?? worldNode.addComponent(UITransform);
        worldTransform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        worldTransform.setAnchorPoint(0.5, 0.5);
        this.ctx.graphics = worldNode.getComponent(Graphics) ?? worldNode.addComponent(Graphics);

        const entities = this.ensureChild('Entities');
        const entitiesTransform = entities.getComponent(UITransform) ?? entities.addComponent(UITransform);
        entitiesTransform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        entitiesTransform.setAnchorPoint(0.5, 0.5);
        this.ctx.entityRoot = entities;
        this.ctx.enemiesRoot = this.ensureNamed(entities, 'Enemies');
        this.ctx.bulletsRoot = this.ensureNamed(entities, 'Bullets');
        this.ctx.expOrbsRoot = this.ensureNamed(entities, 'ExpOrbs');

        const leftoverLabels = this.node.getChildByName('EntityLabels');
        if (leftoverLabels) {
            leftoverLabels.destroy();
        }
        const leftoverGems = entities.getChildByName('Gems');
        if (leftoverGems) {
            leftoverGems.destroy();
        }

        const hud = this.ensureChild('HUD');
        const hudTransform = hud.getComponent(UITransform) ?? hud.addComponent(UITransform);
        hudTransform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        this.ctx.hud.stats = this.makeLabel(hud, 'Stats', -this.ctx.viewW * 0.5 + 24, this.ctx.viewH * 0.5 - 18, 560, 220, 18, new Color(214, 222, 232), Label.HorizontalAlign.LEFT, 0, 1);
        this.ctx.hud.systems = this.makeLabel(hud, 'Systems', this.ctx.viewW * 0.5 - 24, this.ctx.viewH * 0.5 - 18, 360, 280, 16, new Color(168, 180, 196), Label.HorizontalAlign.RIGHT, 1, 1);
        this.ctx.hud.help = this.makeLabel(hud, 'Help', -this.ctx.viewW * 0.5 + 24, 70, 620, 140, 16, new Color(139, 155, 180), Label.HorizontalAlign.LEFT, 0, 1);
        this.ctx.hud.hint = this.makeLabel(hud, 'Hint', 0, -this.ctx.viewH * 0.5 + 28, this.ctx.viewW - 40, 36, 16, new Color(106, 118, 136), Label.HorizontalAlign.CENTER, 0.5, 0.5);
        this.ctx.hud.banner = this.makeLabel(hud, 'Banner', 0, 36, 720, 64, 36, new Color(255, 220, 140), Label.HorizontalAlign.CENTER, 0.5, 0.5);
        hud.setSiblingIndex(this.node.children.length - 1);
    }

    private ensureChild(name: string): Node {
        let child = this.node.getChildByName(name);
        if (!child) {
            child = new Node(name);
            child.layer = this.node.layer;
            this.node.addChild(child);
        }
        return child;
    }

    private ensureNamed(parent: Node, name: string): Node {
        let child = parent.getChildByName(name);
        if (!child) {
            child = new Node(name);
            child.layer = parent.layer;
            parent.addChild(child);
        }
        const transform = child.getComponent(UITransform) ?? child.addComponent(UITransform);
        transform.setAnchorPoint(0.5, 0.5);
        transform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        return child;
    }

    private makeLabel(
        parent: Node,
        name: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        color: Color,
        align: number,
        anchorX: number,
        anchorY: number,
    ): Label {
        const node = parent.getChildByName(name) ?? new Node(name);
        node.layer = parent.layer;
        if (!node.parent) {
            parent.addChild(node);
        }
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(width, height);
        transform.setAnchorPoint(anchorX, anchorY);
        node.setPosition(x, y, 0);
        const label = node.getComponent(Label) ?? node.addComponent(Label);
        label.string = '';
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.useSystemFont = true;
        label.fontFamily = 'Microsoft YaHei, PingFang SC, sans-serif';
        label.horizontalAlign = align;
        label.verticalAlign = Label.VerticalAlign.TOP;
        label.overflow = Label.Overflow.NONE;
        label.enableWrapText = true;
        return label;
    }
}
