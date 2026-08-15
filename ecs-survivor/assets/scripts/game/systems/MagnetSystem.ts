import { System, World } from '../../ecs/World';
import { Experience, Magnet, Player, Position, Velocity, makeVelocity } from '../Components';
import { GameContext } from '../GameConfig';

/**
 * 磁力系统：把带 Magnet 的经验球吸向主角。
 * Magnet = 磁铁；吸附范围看玩家的 magnetRadius。
 */
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
                return; // 0.001：已经叠在主角身上就别再除零改速度
            }
            const speed = 220 + (1 - dist / range) * 260; // 越近吸得越快
            // 球平时没 Velocity；一进磁力范围才挂上，之后 MovementSystem 会带着飞。
            const velocity = world.get(entity, Velocity) ?? world.add(entity, Velocity, makeVelocity(0, 0));
            velocity.x = (dx / dist) * speed;
            velocity.y = (dy / dist) * speed;
        });
    }
}
