import { System, World } from '../../ecs/World';
import {
    Elite,
    Enemy,
    Experience,
    Health,
    HitFlash,
    Magnet,
    Player,
    Position,
    Radius,
    Tint,
    makePosition,
    makeRadius,
    makeTint,
} from '../Components';
import { GameContext } from '../GameConfig';

export class CombatSystem implements System {
    name = 'Combat';

    constructor(private readonly ctx: GameContext) {}

    update(world: World, dt: number): void {
        if (this.ctx.paused) {
            return;
        }

        const player = world.get(this.ctx.player, Player);
        if (player && player.contactTimer > 0) {
            player.contactTimer -= dt;
        }

        world.each(HitFlash, (_entity, flash) => {
            if (flash.remaining > 0) {
                flash.remaining -= dt;
            }
        });

        const damages = this.ctx.events.damages;
        for (let i = 0; i < damages.length; i++) {
            const hit = damages[i];
            if (!world.isAlive(hit.target)) {
                continue;
            }
            const health = world.get(hit.target, Health);
            if (!health) {
                continue;
            }
            health.current -= hit.amount;
            const flash = world.get(hit.target, HitFlash) ?? world.add(hit.target, HitFlash);
            flash.remaining = 0.08;
            if (health.current > 0) {
                continue;
            }
            this.kill(world, hit.target);
        }
    }

    private kill(world: World, entity: number): void {
        if (entity === this.ctx.player) {
            this.ctx.dead = true;
            this.ctx.paused = true;
            return;
        }
        const enemy = world.get(entity, Enemy);
        const pos = world.get(entity, Position);
        if (enemy && pos) {
            const gem = world.create();
            const exp = new Experience();
            exp.amount = world.has(entity, Elite) ? enemy.xp * 3 : enemy.xp;
            world.add(gem, Experience, exp);
            world.add(gem, Magnet);
            world.add(gem, Position, makePosition(pos.x, pos.y));
            world.add(gem, Radius, makeRadius(7));
            world.add(gem, Tint, makeTint(120, 230, 140));
            this.ctx.kills += 1;
        }
        world.destroy(entity);
    }
}
