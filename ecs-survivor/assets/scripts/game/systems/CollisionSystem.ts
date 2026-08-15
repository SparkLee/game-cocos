import { Entity, System, World } from '../../ecs/World';
import { Enemy, Experience, Player, Position, Projectile, Radius } from '../Components';
import { GameContext, PLAYER_CONTACT_RANGE } from '../GameConfig';
import { SpatialHash } from '../SpatialHash';

/**
 * 割草最吃性能的一环：每帧都有「子弹×敌人」「敌人×玩家」「经验×玩家」。
 * 按 C 可切换空间哈希 / 全对全，HUD 里能直接看到 Collision 耗时差。
 */
export class CollisionSystem implements System {
    name = 'Collision';

    private readonly hash = new SpatialHash(72);
    private readonly nearby: Entity[] = []; // 查询结果复用，避免每帧 new 数组

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        if (this.ctx.paused) {
            return;
        }
        this.ctx.events.clear();
        if (this.ctx.config.useSpatialHash) {
            this.resolveHashed(world);
        } else {
            this.resolveBrute(world); // 全对全，给 HUD 对比用
        }
    }

    private resolveHashed(world: World): void { // 敌人入格，子弹/主角只查邻近桶
        this.hash.clear();
        world.each(Enemy, Position, Radius, (entity, _enemy, position, radius) => {
            this.hash.insert(entity, position.x, position.y, radius.value);
        });
        this.hitProjectiles(world, (x, y, range, out) => this.hash.query(x, y, range, out));
        this.hitPlayer(world, (x, y, range, out) => this.hash.query(x, y, range, out));
        this.hitExpOrbs(world);
    }

    private resolveBrute(world: World): void { // 每颗子弹对所有敌人，O(子弹×敌人)
        const enemies: Entity[] = [];
        world.each(Enemy, (_entity) => enemies.push(_entity));
        // 假装成 hash.query：忽略坐标，把全部敌人塞进 out。这样 hitProjectiles / hitPlayer 两套检测共用一份。
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
        this.hitExpOrbs(world);
    }

    /** 子弹 vs 敌人：命中写入 damages，并扣 pierce。 */
    private hitProjectiles(
        world: World,
        query: (x: number, y: number, range: number, out: Entity[]) => Entity[],
    ): void {
        world.each(Projectile, Position, Radius, (bullet, projectile, pos, radius) => {
            // +28 ≈ 敌人最大半径：哈希只按圆心分桶，查询半径要覆盖「子弹圆碰到邻格里的怪」。
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
                // pierce 初始 0 = 不能穿：命中后变成 -1，下一行销毁。初始 1 = 能再打一只。
                projectile.pierce -= 1;
                if (projectile.pierce < 0) {
                    world.destroy(bullet);
                    break;
                }
            }
        });
    }

    /** 敌人碰到主角：写一条伤害并进入接触冷却。 */
    private hitPlayer(
        world: World,
        query: (x: number, y: number, range: number, out: Entity[]) => Entity[],
    ): void {
        const player = this.ctx.player;
        const playerComp = world.get(player, Player);
        const playerPos = world.get(player, Position);
        if (!playerComp || !playerPos || playerComp.contactTimer > 0) {
            return;
        }
        query(playerPos.x, playerPos.y, PLAYER_CONTACT_RANGE, this.nearby);
        const rangeSq = PLAYER_CONTACT_RANGE * PLAYER_CONTACT_RANGE;
        for (let i = 0; i < this.nearby.length; i++) {
            const target = this.nearby[i];
            const enemy = world.get(target, Enemy);
            const pos = world.get(target, Position);
            if (!enemy || !pos) {
                continue;
            }
            const dx = pos.x - playerPos.x;
            const dy = pos.y - playerPos.y;
            if (dx * dx + dy * dy > rangeSq) {
                continue;
            }
            this.ctx.events.damages.push({ target: player, amount: enemy.damage, source: target });
            playerComp.contactTimer = 0.45; // 接触伤害冷却，避免每帧连扣
            this.ctx.shake = 10;
            break;
        }
    }

    /** 经验球进入 pickupRadius 则写入 pickups，真正加 XP 在 XpSystem。 */
    private hitExpOrbs(world: World): void {
        const player = this.ctx.player;
        const playerComp = world.get(player, Player);
        const playerPos = world.get(player, Position);
        if (!playerComp || !playerPos) {
            return;
        }
        const range = playerComp.pickupRadius; // 真正捡起的距离；magnetRadius 更大，只负责把球吸近
        world.each(Experience, Position, (entity, exp, pos) => {
            const dx = pos.x - playerPos.x;
            const dy = pos.y - playerPos.y;
            if (dx * dx + dy * dy <= range * range) { // 比 hypot 便宜，结果一样
                this.ctx.events.pickups.push({ entity, amount: exp.amount });
            }
        });
    }
}

/** 两圆是否相交：距离² ≤ (r1+r2)²，避免开方。 */
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
