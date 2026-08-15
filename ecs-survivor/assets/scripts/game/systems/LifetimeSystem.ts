import { System, World } from '../../ecs/World';
import { Lifetime } from '../Components';
import { GameContext } from '../GameConfig';

/** 倒计时组件。remaining 归零就 destroy，目前主要给子弹用。 */
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
