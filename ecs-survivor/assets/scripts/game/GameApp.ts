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

@ccclass('GameApp')
export class GameApp extends Component {
    @property({ tooltip: '开局敌人上限，运行中按 1-4 切换 2000/5000/10000/20000' })
    maxEnemies = 5000;

    private readonly ctx = new GameContext();
    private readonly world = new World();
    private inputSystem: InputSystem | null = null;
    private spawnSystem: SpawnSystem | null = null;
    private started = false;

    onLoad(): void {
        this.syncViewSize();
        this.buildView();
        this.inputSystem = new InputSystem(this.ctx);
        this.spawnSystem = new SpawnSystem(this.ctx);
        this.world
            .register(this.inputSystem)
            .register(new MovementSystem(this.ctx))
            .register(new EnemyAISystem(this.ctx))
            .register(new WeaponSystem(this.ctx))
            .register(new CollisionSystem(this.ctx))
            .register(new CombatSystem(this.ctx))
            .register(new LifetimeSystem(this.ctx))
            .register(this.spawnSystem)
            .register(new MagnetSystem(this.ctx))
            .register(new XpSystem(this.ctx))
            .register(new RenderSystem(this.ctx))
            .register(new HudSystem(this.ctx));
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

    private startRun(): void {
        this.world.reset();
        this.spawnSystem?.reset();
        this.ctx.resetRun();
        this.ctx.config.maxEnemies = this.maxEnemies;
        this.ctx.player = this.spawnPlayer();
    }

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

    private buildView(): void {
        const worldNode = this.ensureChild('WorldDraw');
        const worldTransform = worldNode.getComponent(UITransform) ?? worldNode.addComponent(UITransform);
        worldTransform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        worldTransform.setAnchorPoint(0.5, 0.5);
        this.ctx.graphics = worldNode.getComponent(Graphics) ?? worldNode.addComponent(Graphics);

        const labels = this.ensureChild('EntityLabels');
        const labelsTransform = labels.getComponent(UITransform) ?? labels.addComponent(UITransform);
        labelsTransform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        labelsTransform.setAnchorPoint(0.5, 0.5);
        this.ctx.labelRoot = labels;

        const hud = this.ensureChild('HUD');
        const hudTransform = hud.getComponent(UITransform) ?? hud.addComponent(UITransform);
        hudTransform.setContentSize(this.ctx.viewW, this.ctx.viewH);
        this.ctx.hud.stats = this.makeLabel(hud, 'Stats', -this.ctx.viewW * 0.5 + 24, this.ctx.viewH * 0.5 - 18, 560, 220, 18, new Color(214, 222, 232), Label.HorizontalAlign.LEFT, 0, 1);
        this.ctx.hud.systems = this.makeLabel(hud, 'Systems', this.ctx.viewW * 0.5 - 24, this.ctx.viewH * 0.5 - 18, 360, 280, 16, new Color(168, 180, 196), Label.HorizontalAlign.RIGHT, 1, 1);
        this.ctx.hud.help = this.makeLabel(hud, 'Help', -this.ctx.viewW * 0.5 + 24, 70, 620, 140, 16, new Color(139, 155, 180), Label.HorizontalAlign.LEFT, 0, 1);
        this.ctx.hud.hint = this.makeLabel(hud, 'Hint', 0, -this.ctx.viewH * 0.5 + 28, this.ctx.viewW - 40, 36, 16, new Color(106, 118, 136), Label.HorizontalAlign.CENTER, 0.5, 0.5);
        this.ctx.hud.banner = this.makeLabel(hud, 'Banner', 0, 36, 720, 64, 36, new Color(255, 220, 140), Label.HorizontalAlign.CENTER, 0.5, 0.5);
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
