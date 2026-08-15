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

export class Player {
    moveSpeed = 280;
    pickupRadius = 26;
    magnetRadius = 90;
    contactTimer = 0;
}

export class Enemy {
    damage = 8;
    xp = 2;
    kind = 0;
}

/** 加上这个组件就是精英：不必再写 EliteEnemy 子类。 */
export class Elite {}

export class Projectile {
    damage = 12;
    pierce = 0;
}

export class Weapon {
    cooldown = 0.38;
    timer = 0;
    count = 1;
    damage = 12;
    speed = 540;
    range = 520;
    spread = 0.18;
}

export class Experience {
    amount = 2;
}

export class Magnet {}

export class Lifetime {
    remaining = 1;
}

export class Tint {
    r = 255;
    g = 255;
    b = 255;
    a = 255;
}

export class HitFlash {
    remaining = 0;
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
