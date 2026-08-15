import { Color, Graphics, Node } from 'cc';
import { Entity, System, World } from '../../ecs/World';
import { Elite, Enemy, Experience, HitFlash, Position, Projectile, Radius, Tint, Velocity, View, Weapon } from '../Components';
import { bindBulletSprite, bindExpOrbSprite, bindSpine, createEntityNode, EntityBinding, EntityKind, faceBullet, faceSpine, fitSpine, paintPlayer, playSpine } from '../EntityView';
import { GameContext, PLAYER_CONTACT_RANGE } from '../GameConfig';
import { pickSpineAnimation, spineDataOf, SPINE_ANIMS, SpineKind } from '../SpineCatalog';

const GRID = new Color(36, 44, 58, 255);
const FLASH = new Color(255, 255, 255, 255);
const HIT_TINT = new Color(255, 120, 120, 255);
const PLAYER_CORE = new Color(90, 230, 210, 255);
const ELITE_RING = new Color(255, 255, 255, 255);
const fillScratch = new Color();

/**
 * 把 ECS 数据同步到节点。
 *
 * 主角 / 怪：Body 上挂 Spine。子弹、经验球用图。圆仍在 WorldDraw 上一次画完（加载失败时的占位）。
 * 屏外不挂节点，避免几千个 Spine 同时跑。普通怪和精英怪分池、分父节点，图集不同不能穿插。
 */
export class RenderSystem implements System {
    name = 'Render';

    private readonly bound = new Map<Entity, EntityBinding>();
    private readonly pool: Record<EntityKind, EntityBinding[]> = {
        player: [],
        enemy: [],
        elite: [],
        bullet: [],
        expOrb: [],
    };
    private pausedAnims = false;

    constructor(private readonly ctx: GameContext) {}

    reset(): void {
        this.bound.forEach((binding) => this.recycle(binding));
        this.bound.clear();
        this.pausedAnims = false;
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
        root.setPosition(-origin.x + ox, -origin.y + oy, 0);

        const hw = this.ctx.viewW * 0.5 + 40;
        const hh = this.ctx.viewH * 0.5 + 40;
        const paused = this.ctx.paused || this.ctx.dead;
        this.syncAnimPause(paused);

        graphics.clear();
        this.drawGrid(graphics, origin.x, origin.y, ox, oy);
        if (!this.ctx.spines.expOrbFrame) {
            world.each(Experience, Position, Radius, Tint, (entity, _t, pos, radius, tint) => {
                this.drawDot(world, graphics, origin, ox, oy, hw, hh, entity, pos, radius, tint, false);
            });
        }
        world.each(Enemy, Position, Radius, Tint, (entity, _t, pos, radius, tint) => {
            const hasSpine = world.has(entity, Elite) ? this.ctx.spines.elite : this.ctx.spines.enemy;
            if (!hasSpine) {
                this.drawDot(world, graphics, origin, ox, oy, hw, hh, entity, pos, radius, tint, true);
            }
        });
        if (!this.ctx.spines.bulletFrame) {
            world.each(Projectile, Position, Radius, Tint, (entity, _t, pos, radius, tint) => {
                this.drawDot(world, graphics, origin, ox, oy, hw, hh, entity, pos, radius, tint, false);
            });
        }

        world.each(Experience, Position, (entity, _t, pos) => {
            this.syncMassNode(world, origin, hw, hh, entity, pos, 'expOrb');
        });
        world.each(Enemy, Position, (entity, _t, pos) => {
            this.syncMassNode(world, origin, hw, hh, entity, pos, world.has(entity, Elite) ? 'elite' : 'enemy');
        });
        world.each(Projectile, Position, (entity, _t, pos) => {
            this.syncMassNode(world, origin, hw, hh, entity, pos, 'bullet');
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

    /** 同一支 Graphics 画占位圆；整帧只 clear 一次，所以是合批。 */
    private drawDot(
        world: World,
        graphics: Graphics,
        origin: Position,
        ox: number,
        oy: number,
        hw: number,
        hh: number,
        entity: Entity,
        pos: Position,
        radius: Radius,
        tint: Tint,
        markElite: boolean,
    ): void {
        const x = pos.x - origin.x + ox;
        const y = pos.y - origin.y + oy;
        if (x < -hw || x > hw || y < -hh || y > hh) {
            return;
        }
        const flash = world.get(entity, HitFlash);
        graphics.fillColor = flash && flash.remaining > 0 ? FLASH : colorFrom(tint);
        graphics.circle(x, y, radius.value);
        graphics.fill();
        if (markElite && world.has(entity, Elite)) {
            graphics.strokeColor = ELITE_RING;
            graphics.lineWidth = 2;
            graphics.circle(x, y, radius.value + 3);
            graphics.stroke();
        }
    }

    private syncMassNode(
        world: World,
        origin: Position,
        hw: number,
        hh: number,
        entity: Entity,
        pos: Position,
        kind: EntityKind,
    ): void {
        const sx = pos.x - origin.x;
        const sy = pos.y - origin.y;
        const onScreen = sx > -hw && sx < hw && sy > -hh && sy < hh;
        if (!onScreen) {
            const existing = this.bound.get(entity);
            if (existing) {
                this.recycle(existing);
                this.bound.delete(entity);
            }
            return;
        }
        const binding = this.ensure(world, entity, kind);
        binding.node.active = true;
        binding.node.setPosition(pos.x, pos.y, 0);
        this.syncSpine(world, entity, binding);
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
        const flash = world.get(entity, HitFlash);
        if (binding.skeleton) {
            this.syncSpine(world, entity, binding);
        } else {
            const fill = flash && flash.remaining > 0 ? FLASH : PLAYER_CORE;
            paintPlayer(binding, radius.value, fill);
            const weapon = world.get(entity, Weapon);
            binding.body.angle = ((weapon ? weapon.aimAngle : 0) * 180) / Math.PI;
        }
    }

    private syncSpine(world: World, entity: Entity, binding: EntityBinding): void {
        if (binding.kind === 'expOrb') {
            return;
        }
        if (binding.kind === 'bullet') {
            faceBullet(binding, facingOf(world, entity, this.ctx));
            return;
        }
        if (!binding.skeleton || binding.kind === 'expOrb') {
            this.faceVelocity(world, entity, binding);
            return;
        }
        const radius = world.get(entity, Radius);
        if (radius) {
            fitSpine(binding, radius.value);
        }
        const kind = binding.kind as SpineKind;
        const preferred = animsFor(world, entity, kind, this.ctx);
        const data = binding.skeleton.skeletonData;
        if (data) {
            playSpine(binding, pickSpineAnimation(data, preferred));
        }
        const flash = world.get(entity, HitFlash);
        binding.skeleton.color = flash && flash.remaining > 0 ? HIT_TINT : Color.WHITE;
        const radians = facingOf(world, entity, this.ctx);
        faceSpine(binding, radians, true);
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
        if (binding && binding.kind !== kind) {
            this.recycle(binding);
            this.bound.delete(entity);
            binding = undefined;
        }
        if (binding) {
            const parent = this.parentOf(kind);
            if (parent && binding.node.parent !== parent) {
                binding.node.parent = parent;
            }
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
        if (kind === 'bullet') {
            if (this.ctx.spines.bulletFrame) {
                bindBulletSprite(binding, this.ctx.spines.bulletFrame);
            }
        } else if (kind === 'expOrb') {
            if (this.ctx.spines.expOrbFrame) {
                bindExpOrbSprite(binding, this.ctx.spines.expOrbFrame);
            }
        } else {
            const data = spineDataOf(this.ctx.spines, kind);
            const radius = world.get(entity, Radius);
            if (data && radius) {
                bindSpine(binding, data, radius.value);
                if (binding.skeleton) {
                    binding.skeleton.timeScale = spinePlayback(kind, this.pausedAnims);
                }
            }
        }
        return binding;
    }

    /** 按种类回各自父节点。Cocos 按节点树顺序画，图集不同的怪不能穿插。 */
    private parentOf(kind: EntityKind): Node | null {
        if (kind === 'enemy') {
            return this.ctx.enemiesRoot;
        }
        if (kind === 'elite') {
            return this.ctx.elitesRoot;
        }
        if (kind === 'bullet') {
            return this.ctx.bulletsRoot;
        }
        if (kind === 'expOrb') {
            return this.ctx.expOrbsRoot;
        }
        return this.ctx.entityRoot;
    }

    private syncAnimPause(paused: boolean): void {
        if (this.pausedAnims === paused) {
            return;
        }
        this.pausedAnims = paused;
        this.bound.forEach((binding) => {
            if (binding.skeleton) {
                binding.skeleton.timeScale = spinePlayback(binding.kind, paused);
            }
        });
    }

    private drawGrid(graphics: Graphics, px: number, py: number, ox: number, oy: number): void {
        const step = 80;
        const hw = this.ctx.viewW * 0.5;
        const hh = this.ctx.viewH * 0.5;
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

function colorFrom(tint: Tint): Color {
    fillScratch.set(tint.r, tint.g, tint.b, tint.a);
    return fillScratch;
}

function spinePlayback(kind: EntityKind, paused: boolean): number {
    if (paused) {
        return 0;
    }
    return 1;
}

function isMoving(world: World, entity: Entity): boolean {
    const velocity = world.get(entity, Velocity);
    if (!velocity) {
        return false;
    }
    return velocity.x * velocity.x + velocity.y * velocity.y > 16;
}

function animsFor(world: World, entity: Entity, kind: SpineKind, ctx: GameContext): string[] {
    const table = SPINE_ANIMS[kind];
    if (table.attack && (kind === 'enemy' || kind === 'elite')) {
        const pos = world.get(entity, Position);
        const origin = world.get(ctx.player, Position);
        if (pos && origin) {
            const dx = pos.x - origin.x;
            const dy = pos.y - origin.y;
            const limit = PLAYER_CONTACT_RANGE; // 与 CollisionSystem 接触伤害同一圈
            if (dx * dx + dy * dy <= limit * limit) {
                return table.attack;
            }
        }
        return table.move;
    }
    return isMoving(world, entity) ? table.move : table.idle;
}

function facingOf(world: World, entity: Entity, ctx: GameContext): number {
    if (entity === ctx.player) {
        const weapon = world.get(entity, Weapon);
        return weapon ? weapon.aimAngle : 0;
    }
    const velocity = world.get(entity, Velocity);
    if (!velocity || velocity.x * velocity.x + velocity.y * velocity.y < 1) {
        return 0;
    }
    return Math.atan2(velocity.y, velocity.x);
}
