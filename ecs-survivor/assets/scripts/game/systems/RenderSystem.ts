import { Color, Graphics } from 'cc';
import { System, World } from '../../ecs/World';
import { Elite, Enemy, Experience, HitFlash, Position, Projectile, Radius, Tint } from '../Components';
import { GameContext } from '../GameConfig';

const GRID = new Color(36, 44, 58, 255);
const PLAYER_CORE = new Color(90, 230, 210, 255);
const FLASH = new Color(255, 255, 255, 255);

export class RenderSystem implements System {
    name = 'Render';

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        const graphics = this.ctx.graphics;
        const origin = world.get(this.ctx.player, Position);
        if (!graphics || !origin) {
            return;
        }
        graphics.clear();
        this.ctx.shake *= 0.82;
        const ox = (Math.random() - 0.5) * this.ctx.shake;
        const oy = (Math.random() - 0.5) * this.ctx.shake;
        this.drawGrid(graphics, origin.x, origin.y, ox, oy);
        this.drawGroup(world, graphics, origin, ox, oy, Experience, 8);
        this.drawGroup(world, graphics, origin, ox, oy, Enemy, 10);
        this.drawGroup(world, graphics, origin, ox, oy, Projectile, 8);
        this.drawPlayer(world, graphics, origin, ox, oy);
    }

    private drawGrid(graphics: Graphics, px: number, py: number, ox: number, oy: number): void {
        const step = 80;
        const hw = this.ctx.viewW * 0.5;
        const hh = this.ctx.viewH * 0.5;
        graphics.strokeColor = GRID;
        graphics.lineWidth = 1;
        const startX = -hw - ((px % step) + step) % step;
        const startY = -hh - ((py % step) + step) % step;
        for (let x = startX; x <= hw + step; x += step) {
            graphics.moveTo(x + ox, -hh);
            graphics.lineTo(x + ox, hh);
        }
        for (let y = startY; y <= hh + step; y += step) {
            graphics.moveTo(-hw, y + oy);
            graphics.lineTo(hw, y + oy);
        }
        graphics.stroke();
    }

    private drawGroup(
        world: World,
        graphics: Graphics,
        origin: Position,
        ox: number,
        oy: number,
        tag: typeof Enemy | typeof Projectile | typeof Experience,
        segments: number,
    ): void {
        const hw = this.ctx.viewW * 0.5 + 30;
        const hh = this.ctx.viewH * 0.5 + 30;
        world.each(tag, Position, Radius, Tint, (_entity, _tag, pos, radius, tint) => {
            const x = pos.x - origin.x + ox;
            const y = pos.y - origin.y + oy;
            if (x < -hw || x > hw || y < -hh || y > hh) {
                return;
            }
            const flash = world.get(_entity, HitFlash);
            if (flash && flash.remaining > 0) {
                graphics.fillColor = FLASH;
            } else {
                graphics.fillColor = colorFrom(tint);
            }
            graphics.circle(x, y, radius.value);
            graphics.fill();
            if (world.has(_entity, Elite)) {
                graphics.strokeColor = FLASH;
                graphics.lineWidth = 2;
                graphics.circle(x, y, radius.value + 3);
                graphics.stroke();
            }
        });
    }

    private drawPlayer(world: World, graphics: Graphics, origin: Position, ox: number, oy: number): void {
        const radius = world.get(this.ctx.player, Radius);
        const flash = world.get(this.ctx.player, HitFlash);
        const r = radius ? radius.value : 16;
        graphics.fillColor = flash && flash.remaining > 0 ? FLASH : PLAYER_CORE;
        graphics.circle(ox, oy, r);
        graphics.fill();
        graphics.strokeColor = new Color(180, 255, 240, 180);
        graphics.lineWidth = 2;
        graphics.circle(ox, oy, r + 4);
        graphics.stroke();
    }
}

const tintCache = new Color();
function colorFrom(tint: Tint): Color {
    tintCache.set(tint.r, tint.g, tint.b, tint.a);
    return tintCache;
}
