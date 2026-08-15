import { System, World } from '../../ecs/World';
import { Enemy, Experience, Health, Projectile } from '../Components';
import { ENEMY_CAP_PRESETS, GameContext } from '../GameConfig';

/**
 * HUD = Heads-Up Display，平视显示器。
 *
 * 源自战斗机把速度、高度等信息投射在座舱玻璃上，飞行员不用低头看仪表。
 * 游戏里借指叠在画面上、不挡操作的信息层：血量、等级、击杀、按键提示等。
 * 本系统只改这些 Label 的文字，不模拟玩法。
 */
export class HudSystem implements System {
    name = 'HUD';

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        const hud = this.ctx.hud;
        const health = world.get(this.ctx.player, Health);
        const hp = health ? Math.max(0, Math.ceil(health.current)) : 0;
        const hpMax = health ? health.max : 1;
        const bar = hpBar(hp, hpMax);
        const minutes = Math.floor(this.ctx.time / 60);
        const seconds = Math.floor(this.ctx.time % 60).toString().padStart(2, '0');
        const hashLabel = this.ctx.config.useSpatialHash ? '空间哈希 O(n)' : '全对全 O(n²)';

        if (hud.stats) { // 左上：局内状态与实体计数
            hud.stats.string = [
                'ECS 割草演示',
                `${minutes}:${seconds}   等级 ${this.ctx.level}   击杀 ${this.ctx.kills}`,
                `生命 ${bar}  ${hp}/${hpMax}`,
                `经验 ${this.ctx.xp}/${this.ctx.xpToNext}   敌人上限 ${this.ctx.config.maxEnemies}`,
                '',
                `实体 ${world.entityCount}   nextId ${world.nextId}   敌人 ${world.count(Enemy)}   子弹 ${world.count(Projectile)}   经验球 ${world.count(Experience)}`,
                `碰撞 ${hashLabel}`,
            ].join('\n');
        }

        if (hud.systems) { // 右上：各 System 本帧耗时
            const names = Object.keys(world.systemMs);
            let total = 0;
            const lines = ['系统耗时 ms'];
            for (let i = 0; i < names.length; i++) {
                const name = names[i];
                const ms = world.systemMs[name] || 0;
                total += ms;
                const mark = name === 'Collision' ? '  ← 对比按 C' : '';
                lines.push(`${pad(name, 10)} ${ms.toFixed(2)}${mark}`);
            }
            lines.push(`${pad('合计', 10)} ${total.toFixed(2)}`);
            hud.systems.string = lines.join('\n');
        }

        if (hud.help) { // 左下：ECS 说明
            hud.help.string = [
                '为什么割草适合 ECS',
                '1. 海量同类实体：移动 / AI / 渲染各扫一遍数组',
                '2. 组合优于继承：加 Elite 组件就是精英怪',
                '3. 碰撞可批处理：空间哈希挂在 CollisionSystem',
                '4. 逻辑在 ECS，画面是 Node：Body 上以后可换 Spine',
            ].join('\n');
        }

        if (hud.hint) { // 底部：操作提示
            hud.hint.string = `WASD / 按住左键移动    1-4 敌人上限 ${ENEMY_CAP_PRESETS.join('/')}    C 碰撞    M ${this.ctx.sfx.muted ? '已静音' : '静音'}    空格暂停    R 重开`;
        }

        if (hud.banner) { // 正中：死亡 / 暂停
            hud.banner.string = this.ctx.dead ? '你倒下了    按 R 重新开始' : (this.ctx.paused ? '已暂停' : '');
        }
    }
}

function hpBar(current: number, max: number): string {
    const n = 12;
    const filled = Math.round((current / max) * n);
    let bar = '';
    for (let i = 0; i < n; i++) {
        bar += i < filled ? '█' : '░';
    }
    return bar;
}

function pad(text: string, width: number): string {
    return text.length >= width ? text : text + ' '.repeat(width - text.length);
}
