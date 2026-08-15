import { System, World } from '../../ecs/World';
import {
    Caption,
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
    makeCaption,
    makePosition,
    makeRadius,
    makeTint,
} from '../Components';
import { GameContext } from '../GameConfig';

/**
 * Combat = 战斗。
 *
 * 不负责「谁碰到了谁」（那是 CollisionSystem），只处理碰撞交过来的伤害事件：
 * 扣血、受击闪白、播音效；血量归零则 kill。
 * 怪死时在原地新建经验球，再销毁怪实体——不是把怪变成球。
 */
export class CombatSystem implements System {
    name = 'Combat';

    constructor(private readonly ctx: GameContext) {}

    update(world: World, dt: number): void {
        if (this.ctx.paused) {
            return;
        }

        const player = world.get(this.ctx.player, Player);
        if (player && player.contactTimer > 0) {
            player.contactTimer -= dt; // 接触伤害冷却倒计时
        }

        world.each(HitFlash, (_entity, flash) => {
            if (flash.remaining > 0) {
                flash.remaining -= dt; // 闪白剩余时间
            }
        });

        const damages = this.ctx.events.damages; // CollisionSystem 本帧写下的伤害
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
            flash.remaining = 0.08; // 受击闪白约 0.08 秒
            if (hit.target === this.ctx.player) {
                this.ctx.sfx.play(health.current > 0 ? 'hurt' : 'death');
            } else if (health.current > 0) {
                this.ctx.sfx.play('hit');
            }
            if (health.current > 0) {
                continue;
            }
            this.kill(world, hit.target);
        }
    }

    /** 血量为 0：主角则结束本局；怪则在死处生成经验球并销毁自身。 */
    private kill(world: World, entity: number): void {
        if (entity === this.ctx.player) {
            this.ctx.dead = true;
            this.ctx.paused = true;
            return;
        }
        const enemy = world.get(entity, Enemy);
        const pos = world.get(entity, Position);
        if (enemy && pos) {
            const gem = world.create(); // 新实体，不是复用这只怪
            const exp = new Experience();
            exp.amount = world.has(entity, Elite) ? enemy.xp * 3 : enemy.xp; // 精英怪经验 ×3
            world.add(gem, Experience, exp);
            world.add(gem, Magnet); // 可被主角磁力吸附
            world.add(gem, Position, makePosition(pos.x, pos.y)); // 出现在怪的死亡坐标
            world.add(gem, Radius, makeRadius(16));
            world.add(gem, Tint, makeTint(120, 230, 140));
            world.add(gem, Caption, makeCaption('经验球'));
            this.ctx.kills += 1;
            this.ctx.sfx.play('kill');
        }
        world.destroy(entity); // 延迟销毁，本帧末才真正删掉
    }
}
