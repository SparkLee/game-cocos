import { System, World } from '../../ecs/World';
import { Weapon } from '../Components';
import { GameContext, xpNeeded } from '../GameConfig';

/**
 * XP = Experience Points，经验值。
 *
 * 玩家捡到经验球后累加 XP，攒满当前等级所需经验就会升级。
 * 本系统只处理「拾取 → 加经验 → 升级强化武器」，不负责经验球怎么飞过来。
 */
export class XpSystem implements System {
    name = 'XP';

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        if (this.ctx.paused && !this.ctx.dead) {
            return; // 死亡后 paused 也为 true，但仍要把本帧已捡的球结算掉
        }
        const pickups = this.ctx.events.pickups;
        for (let i = 0; i < pickups.length; i++) {
            const pickup = pickups[i];
            if (!world.isAlive(pickup.entity)) {
                continue;
            }
            this.ctx.xp += pickup.amount;
            world.destroy(pickup.entity); // 球捡走就销毁，不是藏起来
            this.ctx.sfx.play('pickup');
            while (this.ctx.xp >= this.ctx.xpToNext) { // 一颗大经验可能连升几级
                this.ctx.xp -= this.ctx.xpToNext;
                this.ctx.level += 1;
                this.ctx.xpToNext = xpNeeded(this.ctx.level);
                this.upgradeWeapon(world);
                this.ctx.sfx.play('level');
            }
        }
    }

    private upgradeWeapon(world: World): void {
        const weapon = world.get(this.ctx.player, Weapon);
        if (!weapon) {
            return;
        }
        weapon.damage += 20;
        weapon.cooldown = Math.max(0.12, weapon.cooldown * 0.92);
        if (this.ctx.level % 2 === 0) {
            weapon.count = Math.min(8, weapon.count + 1); // 偶数级加一条弹道，最多 8
        }
    }
}
