import { System, World } from '../../ecs/World';
import { Position, Velocity } from '../Components';
import { GameContext } from '../GameConfig';

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
