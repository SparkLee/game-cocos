import { Color, Graphics, Node } from 'cc';
import { Entity, System, World } from '../../ecs/World';
import { Caption, Elite, Enemy, Experience, HitFlash, Position, Projectile, Radius, Tint, Velocity, View, Weapon } from '../Components';
import { createEntityNode, EntityBinding, EntityKind, paintPlaceholder } from '../EntityView';
import { GameContext } from '../GameConfig';

const GRID = new Color(36, 44, 58, 255);
const FLASH = new Color(255, 255, 255, 255);
const PLAYER_CORE = new Color(90, 230, 210, 255);

/**
 * 把 ECS 数据同步到真实 Cocos 节点。
 *
 * 网格仍画在 WorldDraw 的 Graphics 上（不是实体）。
 * 主角 / 怪 / 子弹 / 经验球各有一棵节点树：Body 上以后可挂 Spine。
 * Visual 用同一张圆 Sprite 合批；Label 只给主角和精英，避免上千次 Draw Call。
 * Entities 根节点反向跟着主角平移，当作 2D 相机。
 */
export class RenderSystem implements System {
    name = 'Render';

    private readonly bound = new Map<Entity, EntityBinding>();
    private readonly pool: Record<EntityKind, EntityBinding[]> = {
        player: [],
        enemy: [],
        bullet: [],
        expOrb: [],
    };

    constructor(private readonly ctx: GameContext) {}

    /** 重开前先回收节点。World.reset() 会丢掉 View 组件，但 Node 还在场景里。 */
    reset(): void {
        this.bound.forEach((binding) => this.recycle(binding));
        this.bound.clear();
    }

    update(world: World): void {
        const graphics = this.ctx.graphics;
        const origin = world.get(this.ctx.player, Position);
        const root = this.ctx.entityRoot;
        if (!graphics || !origin || !root) {
            return;
        }

        this.recycleDead(world);

        this.ctx.shake *= 0.82;
        const ox = (Math.random() - 0.5) * this.ctx.shake;
        const oy = (Math.random() - 0.5) * this.ctx.shake;
        // 实体保留世界坐标；根节点移到 (-主角 + 抖动)，主角就会停在屏幕中心。
        root.setPosition(-origin.x + ox, -origin.y + oy, 0);

        this.drawGrid(graphics, origin.x, origin.y, ox, oy);
        world.each(Experience, Position, Radius, Tint, (entity, _t, pos, radius, tint) => {
            this.syncOne(world, origin, entity, 'expOrb', pos, radius, tint);
        });
        world.each(Enemy, Position, Radius, Tint, (entity, _t, pos, radius, tint) => {
            this.syncOne(world, origin, entity, 'enemy', pos, radius, tint);
        });
        world.each(Projectile, Position, Radius, Tint, (entity, _t, pos, radius, tint) => {
            this.syncOne(world, origin, entity, 'bullet', pos, radius, tint);
        });
        this.syncPlayer(world, origin);
    }

    private recycleDead(world: World): void {
        const dead: Entity[] = [];
        this.bound.forEach((binding, entity) => {
            if (!world.isAlive(entity)) {
                this.recycle(binding);
                dead.push(entity);
            }
        });
        for (let i = 0; i < dead.length; i++) {
            this.bound.delete(dead[i]);
        }
    }

    private recycle(binding: EntityBinding): void {
        binding.node.active = false;
        binding.paintedKey = '';
        this.pool[binding.kind].push(binding);
    }

    private syncOne(
        world: World,
        origin: Position,
        entity: Entity,
        kind: EntityKind,
        pos: Position,
        radius: Radius,
        tint: Tint,
    ): void {
        const hw = this.ctx.viewW * 0.5 + 40;
        const hh = this.ctx.viewH * 0.5 + 40;
        const binding = this.ensure(world, entity, kind);
        const sx = pos.x - origin.x;
        const sy = pos.y - origin.y;
        const onScreen = sx > -hw && sx < hw && sy > -hh && sy < hh;
        binding.node.active = onScreen;
        binding.node.setPosition(pos.x, pos.y, 0);
        if (!onScreen) {
            return;
        }
        this.paintEntity(world, entity, binding, radius, tint);
        this.faceVelocity(world, entity, binding);
    }

    private syncPlayer(world: World, origin: Position): void {
        const entity = this.ctx.player;
        const radius = world.get(entity, Radius);
        const tint = world.get(entity, Tint);
        if (!radius || !tint) {
            return;
        }
        const binding = this.ensure(world, entity, 'player');
        binding.node.active = true;
        binding.node.setPosition(origin.x, origin.y, 0);
        this.paintEntity(world, entity, binding, radius, tint, PLAYER_CORE);
        const weapon = world.get(entity, Weapon);
        const deg = ((weapon ? weapon.aimAngle : 0) * 180) / Math.PI;
        binding.body.angle = deg;
    }

    private paintEntity(
        world: World,
        entity: Entity,
        binding: EntityBinding,
        radius: Radius,
        tint: Tint,
        fillOverride?: Color,
    ): void {
        const caption = world.get(entity, Caption);
        const text = caption ? caption.text : '';
        const flash = world.get(entity, HitFlash);
        const flashing = !!(flash && flash.remaining > 0);
        const fill = flashing ? FLASH : (fillOverride ?? colorFrom(tint));
        paintPlaceholder(binding, radius.value, fill, world.has(entity, Elite), text);
    }

    private faceVelocity(world: World, entity: Entity, binding: EntityBinding): void {
        const velocity = world.get(entity, Velocity);
        if (!velocity) {
            return;
        }
        if (velocity.x * velocity.x + velocity.y * velocity.y < 1) {
            return;
        }
        binding.body.angle = (Math.atan2(velocity.y, velocity.x) * 180) / Math.PI;
    }

    private ensure(world: World, entity: Entity, kind: EntityKind): EntityBinding {
        let binding = this.bound.get(entity);
        if (binding) {
            return binding;
        }
        const parent = this.parentOf(kind);
        binding = this.pool[kind].pop() ?? createEntityNode(kind, parent ? parent.layer : 0);
        if (parent && binding.node.parent !== parent) {
            binding.node.parent = parent;
        }
        binding.node.active = true;
        this.bound.set(entity, binding);
        const view = world.get(entity, View) ?? world.add(entity, View);
        view.node = binding.node;
        return binding;
    }

    private parentOf(kind: EntityKind): Node | null {
        if (kind === 'enemy') {
            return this.ctx.enemiesRoot;
        }
        if (kind === 'bullet') {
            return this.ctx.bulletsRoot;
        }
        if (kind === 'expOrb') {
            return this.ctx.expOrbsRoot;
        }
        return this.ctx.entityRoot;
    }

    private drawGrid(graphics: Graphics, px: number, py: number, ox: number, oy: number): void {
        const step = 80;
        const hw = this.ctx.viewW * 0.5;
        const hh = this.ctx.viewH * 0.5;
        graphics.clear();
        graphics.strokeColor = GRID;
        graphics.lineWidth = 1;
        const startX = -hw - ((px % step) + step) % step;
        const startY = -hh - ((py % step) + step) % step;
        for (let x = startX; x <= hw + step; x += step) {
            graphics.moveTo(x + ox, -hh);
            graphics.lineTo(x + ox, hh);
        }
        for (let y = startY; y <= hh + step; y += step) {
            graphics.moveTo(-hw, y + oy);
            graphics.lineTo(hw, y + oy);
        }
        graphics.stroke();
    }
}

const tintCache = new Color();
function colorFrom(tint: Tint): Color {
    tintCache.set(tint.r, tint.g, tint.b, tint.a);
    return tintCache;
}
