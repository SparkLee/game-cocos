import { System, World } from '../../ecs/World';
import { Enemy, Position, Velocity } from '../Components';
import { GameContext } from '../GameConfig';

/** 所有敌人共用一条规则：朝玩家当前位置走。数据在连续数组里，AI 就是一次线性扫描。 */
export class EnemyAISystem implements System {
    name = 'EnemyAI';

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        if (this.ctx.paused || this.ctx.dead) {
            return;
        }
        const playerPos = world.get(this.ctx.player, Position);
        if (!playerPos) {
            return;
        }
        world.each(Enemy, Position, Velocity, (_entity, _enemy, position, velocity) => {
            const dx = playerPos.x - position.x;
            const dy = playerPos.y - position.y;
            const len = Math.hypot(dx, dy) || 1;
            const speed = Math.hypot(velocity.x, velocity.y) || 70; // 刷怪时写入的速率，这里只改方向
            velocity.x = (dx / len) * speed;
            velocity.y = (dy / len) * speed;
        });
    }
}
