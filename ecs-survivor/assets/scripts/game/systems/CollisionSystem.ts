import { Entity, System, World } from '../../ecs/World';
import { Enemy, Experience, Player, Position, Projectile, Radius } from '../Components';
import { GameContext } from '../GameConfig';
import { SpatialHash } from '../SpatialHash';

/**
 * 割草最吃性能的一环：每帧都有「子弹×敌人」「敌人×玩家」「经验×玩家」。
 * 按 C 可切换空间哈希 / 全对全，HUD 里能直接看到 Collision 耗时差。
 */
export class CollisionSystem implements System {
    name = 'Collision';

    private readonly hash = new SpatialHash(72);
    private readonly nearby: Entity[] = [];

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        if (this.ctx.paused) {
            return;
        }
        this.ctx.events.clear();
        if (this.ctx.config.useSpatialHash) {
            this.resolveHashed(world);
        } else {
            this.resolveBrute(world);
        }
    }

    private resolveHashed(world: World): void {
        this.hash.clear();
        world.each(Enemy, Position, Radius, (entity, _enemy, position, radius) => {
            this.hash.insert(entity, position.x, position.y, radius.value);
        });
        this.hitProjectiles(world, (x, y, range, out) => this.hash.query(x, y, range, out));
        this.hitPlayer(world, (x, y, range, out) => this.hash.query(x, y, range, out));
        this.hitGems(world);
    }

    private resolveBrute(world: World): void {
        const enemies: Entity[] = [];
        world.each(Enemy, (_entity) => enemies.push(_entity));
        this.hitProjectiles(world, (_x, _y, _range, out) => {
            out.length = 0;
            for (let i = 0; i < enemies.length; i++) {
                out.push(enemies[i]);
            }
            return out;
        });
        this.hitPlayer(world, (_x, _y, _range, out) => {
            out.length = 0;
            for (let i = 0; i < enemies.length; i++) {
                out.push(enemies[i]);
            }
            return out;
        });
        this.hitGems(world);
    }

    private hitProjectiles(
        world: World,
        query: (x: number, y: number, range: number, out: Entity[]) => Entity[],
    ): void {
        world.each(Projectile, Position, Radius, (bullet, projectile, pos, radius) => {
            query(pos.x, pos.y, radius.value + 28, this.nearby);
            for (let i = 0; i < this.nearby.length; i++) {
                const target = this.nearby[i];
                if (!world.isAlive(target) || !world.has(target, Enemy)) {
                    continue;
                }
                if (!overlap(world, pos, radius.value, target)) {
                    continue;
                }
                this.ctx.events.damages.push({ target, amount: projectile.damage, source: bullet });
                projectile.pierce -= 1;
                if (projectile.pierce < 0) {
                    world.destroy(bullet);
                    break;
                }
            }
        });
    }

    private hitPlayer(
        world: World,
        query: (x: number, y: number, range: number, out: Entity[]) => Entity[],
    ): void {
        const player = this.ctx.player;
        const playerComp = world.get(player, Player);
        const playerPos = world.get(player, Position);
        const playerRadius = world.get(player, Radius);
        if (!playerComp || !playerPos || !playerRadius || playerComp.contactTimer > 0) {
            return;
        }
        query(playerPos.x, playerPos.y, playerRadius.value + 24, this.nearby);
        for (let i = 0; i < this.nearby.length; i++) {
            const target = this.nearby[i];
            const enemy = world.get(target, Enemy);
            if (!enemy || !overlap(world, playerPos, playerRadius.value, target)) {
                continue;
            }
            this.ctx.events.damages.push({ target: player, amount: enemy.damage, source: target });
            playerComp.contactTimer = 0.45;
            this.ctx.shake = 10;
            break;
        }
    }

    private hitGems(world: World): void {
        const player = this.ctx.player;
        const playerComp = world.get(player, Player);
        const playerPos = world.get(player, Position);
        if (!playerComp || !playerPos) {
            return;
        }
        const range = playerComp.pickupRadius;
        world.each(Experience, Position, (entity, exp, pos) => {
            const dx = pos.x - playerPos.x;
            const dy = pos.y - playerPos.y;
            if (dx * dx + dy * dy <= range * range) {
                this.ctx.events.pickups.push({ entity, amount: exp.amount });
            }
        });
    }
}

function overlap(world: World, origin: Position, radius: number, other: Entity): boolean {
    const pos = world.get(other, Position);
    const otherRadius = world.get(other, Radius);
    if (!pos || !otherRadius) {
        return false;
    }
    const dx = pos.x - origin.x;
    const dy = pos.y - origin.y;
    const limit = radius + otherRadius.value;
    return dx * dx + dy * dy <= limit * limit;
}
