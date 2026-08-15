import { System, World } from '../../ecs/World';
import { Experience, Magnet, Player, Position, Velocity, makeVelocity } from '../Components';
import { GameContext } from '../GameConfig';

export class MagnetSystem implements System {
    name = 'Magnet';

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        if (this.ctx.paused) {
            return;
        }
        const player = world.get(this.ctx.player, Player);
        const origin = world.get(this.ctx.player, Position);
        if (!player || !origin) {
            return;
        }
        const range = player.magnetRadius;
        world.each(Experience, Magnet, Position, (entity, _exp, _magnet, pos) => {
            const dx = origin.x - pos.x;
            const dy = origin.y - pos.y;
            const dist = Math.hypot(dx, dy);
            if (dist > range || dist < 0.001) {
                return;
            }
            const speed = 220 + (1 - dist / range) * 260;
            const velocity = world.get(entity, Velocity) ?? world.add(entity, Velocity, makeVelocity(0, 0));
            velocity.x = (dx / dist) * speed;
            velocity.y = (dy / dist) * speed;
        });
    }
}
