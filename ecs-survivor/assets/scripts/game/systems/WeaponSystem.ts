import { System, World } from '../../ecs/World';
import {
    Caption,
    Enemy,
    Lifetime,
    Position,
    Projectile,
    Radius,
    Tint,
    Velocity,
    Weapon,
    makeCaption,
    makeLifetime,
    makePosition,
    makeRadius,
    makeTint,
    makeVelocity,
} from '../Components';
import { GameContext } from '../GameConfig';

/**
 * 读取主角的 Weapon，按冷却自动瞄准并生成 Projectile（子弹）。
 */
export class WeaponSystem implements System {
    name = 'Weapon';

    constructor(private readonly ctx: GameContext) {}

    update(world: World, dt: number): void {
        if (this.ctx.paused || this.ctx.dead) {
            return;
        }
        const player = this.ctx.player;
        const weapon = world.get(player, Weapon);
        const origin = world.get(player, Position);
        if (!weapon || !origin) {
            return;
        }
        weapon.timer -= dt;
        if (weapon.timer > 0) {
            return;
        }

        const aim = findNearestEnemy(world, origin.x, origin.y, weapon.range);
        if (!aim) {
            return;
        }
        weapon.timer = weapon.cooldown;

        const base = Math.atan2(aim.y - origin.y, aim.x - origin.x);
        const count = weapon.count;
        const start = count === 1 ? base : base - weapon.spread * (count - 1) * 0.5;
        for (let i = 0; i < count; i++) {
            const angle = start + weapon.spread * i;
            spawnBullet(world, origin.x, origin.y, angle, weapon);
        }
        this.ctx.sfx.play('shoot');
    }
}

function findNearestEnemy(world: World, x: number, y: number, range: number): Position | null {
    let best: Position | null = null;
    let bestDist = range * range;
    world.each(Enemy, Position, (_entity, _enemy, position) => {
        const dx = position.x - x;
        const dy = position.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            bestDist = dist;
            best = position;
        }
    });
    return best;
}

function spawnBullet(world: World, x: number, y: number, angle: number, weapon: Weapon): void {
    const entity = world.create();
    const projectile = new Projectile();
    projectile.damage = weapon.damage;
    projectile.pierce = weapon.count >= 6 ? 1 : 0;
    world.add(entity, Projectile, projectile);
    world.add(entity, Position, makePosition(x, y));
    world.add(entity, Velocity, makeVelocity(Math.cos(angle) * weapon.speed, Math.sin(angle) * weapon.speed));
    world.add(entity, Radius, makeRadius(12));
    world.add(entity, Tint, makeTint(255, 228, 120));
    world.add(entity, Lifetime, makeLifetime(1.15));
    world.add(entity, Caption, makeCaption('子弹'));
}
