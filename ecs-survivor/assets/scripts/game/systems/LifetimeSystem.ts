import { System, World } from '../../ecs/World';
import { Lifetime } from '../Components';
import { GameContext } from '../GameConfig';

export class LifetimeSystem implements System {
    name = 'Lifetime';

    constructor(private readonly ctx: GameContext) {}

    update(world: World, dt: number): void {
        if (this.ctx.paused) {
            return;
        }
        world.each(Lifetime, (entity, life) => {
            life.remaining -= dt;
            if (life.remaining <= 0) {
                world.destroy(entity);
            }
        });
    }
}
