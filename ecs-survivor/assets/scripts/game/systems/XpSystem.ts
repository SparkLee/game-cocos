import { System, World } from '../../ecs/World';
import { Weapon } from '../Components';
import { GameContext, xpNeeded } from '../GameConfig';

export class XpSystem implements System {
    name = 'XP';

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        if (this.ctx.paused && !this.ctx.dead) {
            return;
        }
        const pickups = this.ctx.events.pickups;
        for (let i = 0; i < pickups.length; i++) {
            const pickup = pickups[i];
            if (!world.isAlive(pickup.entity)) {
                continue;
            }
            this.ctx.xp += pickup.amount;
            world.destroy(pickup.entity);
            this.ctx.sfx.play('pickup');
            while (this.ctx.xp >= this.ctx.xpToNext) {
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
        weapon.damage += 2;
        weapon.cooldown = Math.max(0.12, weapon.cooldown * 0.92);
        if (this.ctx.level % 2 === 0) {
            weapon.count = Math.min(8, weapon.count + 1);
        }
    }
}
