import { System, World } from '../../ecs/World';
import { Position, Velocity } from '../Components';
import { GameContext } from '../GameConfig';

/** 所有带 Position + Velocity 的实体：位置 += 速度 × dt。主角、怪、子弹、被吸的经验球都走这里。 */
export class MovementSystem implements System {
    name = 'Movement';

    constructor(private readonly ctx: GameContext) {}

    update(world: World, dt: number): void {
        if (this.ctx.paused) {
            return;
        }
        world.each(Position, Velocity, (_entity, position, velocity) => {
            position.x += velocity.x * dt;
            position.y += velocity.y * dt;
        });
    }
}
