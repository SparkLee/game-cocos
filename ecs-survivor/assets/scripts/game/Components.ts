/**
 * 全部是纯数据。实体的「是什么」靠组件组合，而不是继承树。
 *
 * 例：精英怪 = Enemy + Health + ... + Elite
 *     经验球 = Position + Experience + Magnet
 * 系统只关心自己需要的那几列数据。
 */

export class Position {
    x = 0;
    y = 0;
}

export class Velocity {
    x = 0;
    y = 0;
}

export class Radius {
    value = 12;
}

export class Health {
    current = 1;
    max = 1;
}

/** Player = 玩家 / 主角。只挂在主角实体上；位置、血量、武器分别在 Position、Health、Weapon 里。 */
export class Player {
    moveSpeed = 560;       // 移动速度（世界坐标 / 秒）
    pickupRadius = 26;     // 拾取半径：经验球进入此距离就算捡到
    magnetRadius = 450;    // 磁力半径：经验球进入此距离会被吸向主角
    contactTimer = 0;      // 接触伤害冷却，>0 时碰到怪不会连续扣血
}

/** Enemy = 敌人。普通怪和精英怪都挂这个；精英只是再加 Elite 组件。 */
export class Enemy {
    damage = 8;   // 碰到主角时造成的伤害
    xp = 2;       // 被击杀掉落经验球的基础 XP
    kind = 0;     // 种类：0 普通、1 快速、2 高血量
}

/** 加上这个组件就是精英：不必再写 EliteEnemy 子类。 */
export class Elite {}

/**
 * Projectile = 抛射物。
 *
 * 从拉丁语 projectum（向前抛出）而来，游戏里泛指射出去的飞行物：子弹、箭、法球等。
 * 本组件只存伤害和穿透次数，位置与速度由 Position / Velocity 提供。
 */
export class Projectile {
    damage = 120;
    /**
     * pierce = 穿透次数。
     *
     * 子弹打中一个敌人后还剩几次可以继续飞。
     * 0 表示碰到第一个敌人就消失；1 表示能再穿过去打第二个。
     * CollisionSystem 每命中一次就减 1，减到小于 0 时销毁这颗子弹。
     */
    pierce = 0;
}

/**
 * Weapon = 武器。
 *
 * 挂在主角身上，描述「怎么开火」，不是飞在空中的那颗子弹。
 * cooldown / count / damage / speed / range / spread 都是枪的参数；
 * 真正飞出去的实体带的是 Projectile（抛射物）。
 * 升级时改的也是这把 Weapon，下次开火才会打出更强的 Projectile。
 */
export class Weapon {
    cooldown = 0.38;   // 开火间隔（秒）
    timer = 0;         // 距离下次开火的倒计时（秒）
    count = 2;         // 一次射出的弹道数
    damage = 120;      // 每发子弹的伤害，生成 Projectile 时拷过去
    speed = 540;       // 子弹飞行速度（世界坐标 / 秒）
    range = 520;       // 自动瞄准的最远距离
    spread = 0.18;     // 多弹道时的夹角（弧度）
}

/** Experience = 经验。挂在经验球上，amount 是捡到后增加的 XP（Experience Points，经验值）。 */
export class Experience {
    amount = 2;
}

/**
 * Magnet = 磁铁。
 *
 * 割草游戏里常把「经验球自动飞向玩家」叫做磁力 / 磁铁效果。
 * 这是一个标记组件，没有字段：经验球只要挂上它，MagnetSystem 就会在主角 magnetRadius 内把它吸过来。
 * 真正捡起来加 XP 的是碰撞后的 XpSystem，磁力只负责把球吸近。
 */
export class Magnet {}

export class Lifetime {
    remaining = 1;
}

/** Tint = 色调。实体圆圈的颜色，RenderSystem 按这四个通道填色。 */
export class Tint {
    r = 255;   // 红 0–255
    g = 255;   // 绿 0–255
    b = 255;   // 蓝 0–255
    a = 255;   // 不透明度 0–255，255 为完全不透明
}

/** HitFlash = 受击闪白。挨打时短暂把圆圈画成白色。 */
export class HitFlash {
    remaining = 0;   // 剩余闪白时间（秒），>0 时 RenderSystem 用白色绘制
}

/** 画在圆圈里的短标签，例如「主角」「普通怪」。 */
export class Caption {
    text = '';
}

export function makeCaption(text: string): Caption {
    const c = new Caption();
    c.text = text;
    return c;
}

export function makePosition(x: number, y: number): Position {
    const c = new Position();
    c.x = x;
    c.y = y;
    return c;
}

export function makeVelocity(x: number, y: number): Velocity {
    const c = new Velocity();
    c.x = x;
    c.y = y;
    return c;
}

export function makeRadius(value: number): Radius {
    const c = new Radius();
    c.value = value;
    return c;
}

export function makeHealth(max: number): Health {
    const c = new Health();
    c.current = max;
    c.max = max;
    return c;
}

export function makeTint(r: number, g: number, b: number, a = 255): Tint {
    const c = new Tint();
    c.r = r;
    c.g = g;
    c.b = b;
    c.a = a;
    return c;
}

export function makeLifetime(remaining: number): Lifetime {
    const c = new Lifetime();
    c.remaining = remaining;
    return c;
}
