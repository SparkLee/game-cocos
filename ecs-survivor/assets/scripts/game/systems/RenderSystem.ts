import { Color, Graphics, Label, Node, UITransform } from 'cc';
import { System, World } from '../../ecs/World';
import { Caption, Elite, Enemy, Experience, HitFlash, Position, Projectile, Radius, Tint } from '../Components';
import { GameContext } from '../GameConfig';

const GRID = new Color(36, 44, 58, 255);
const PLAYER_CORE = new Color(90, 230, 210, 255);
const FLASH = new Color(255, 255, 255, 255);
const LABEL_FILL = new Color(255, 255, 255, 255);
const LABEL_OUTLINE = new Color(20, 22, 28, 230);

export class RenderSystem implements System {
    name = 'Render';

    private readonly pool: Label[] = [];
    private used = 0;

    constructor(private readonly ctx: GameContext) {}

    update(world: World): void {
        const graphics = this.ctx.graphics;
        const origin = world.get(this.ctx.player, Position);
        if (!graphics || !origin) {
            return;
        }
        graphics.clear();
        this.used = 0;
        this.ctx.shake *= 0.82;
        const ox = (Math.random() - 0.5) * this.ctx.shake;
        const oy = (Math.random() - 0.5) * this.ctx.shake;
        this.drawGrid(graphics, origin.x, origin.y, ox, oy);
        this.drawGroup(world, graphics, origin, ox, oy, Experience);
        this.drawGroup(world, graphics, origin, ox, oy, Enemy);
        this.drawGroup(world, graphics, origin, ox, oy, Projectile);
        this.drawPlayer(world, graphics, origin, ox, oy);
        this.hideSpare();
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
            const caption = world.get(_entity, Caption);
            if (caption) {
                this.placeCaption(caption.text, x, y, radius.value);
            }
        });
    }

    private drawPlayer(world: World, graphics: Graphics, origin: Position, ox: number, oy: number): void {
        const radius = world.get(this.ctx.player, Radius);
        const flash = world.get(this.ctx.player, HitFlash);
        const r = radius ? radius.value : 20;
        graphics.fillColor = flash && flash.remaining > 0 ? FLASH : PLAYER_CORE;
        graphics.circle(ox, oy, r);
        graphics.fill();
        graphics.strokeColor = new Color(180, 255, 240, 180);
        graphics.lineWidth = 2;
        graphics.circle(ox, oy, r + 4);
        graphics.stroke();
        const caption = world.get(this.ctx.player, Caption);
        this.placeCaption(caption ? caption.text : '主角', ox, oy, r);
    }

    private placeCaption(text: string, x: number, y: number, radius: number): void {
        const root = this.ctx.labelRoot;
        if (!root) {
            return;
        }
        let label = this.pool[this.used];
        if (!label) {
            const node = new Node('Caption');
            node.layer = root.layer;
            const transform = node.addComponent(UITransform);
            transform.setContentSize(88, 32);
            transform.setAnchorPoint(0.5, 0.5);
            label = node.addComponent(Label);
            label.useSystemFont = true;
            label.fontFamily = 'Microsoft YaHei, PingFang SC, sans-serif';
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.overflow = Label.Overflow.NONE;
            label.cacheMode = Label.CacheMode.CHAR;
            label.enableOutline = true;
            label.outlineColor = LABEL_OUTLINE;
            label.outlineWidth = 2;
            label.color = LABEL_FILL;
            root.addChild(node);
            this.pool[this.used] = label;
        }
        const fontSize = text.length > 2
            ? Math.max(9, Math.min(12, Math.floor(radius * 0.52)))
            : text.length > 1
                ? Math.max(10, Math.min(14, Math.floor(radius * 0.7)))
                : Math.max(10, Math.min(16, Math.floor(radius * 1.2)));
        if (label.string !== text) {
            label.string = text;
        }
        if (label.fontSize !== fontSize) {
            label.fontSize = fontSize;
            label.lineHeight = fontSize + 2;
        }
        label.node.active = true;
        label.node.setPosition(x, y, 0);
        this.used += 1;
    }

    private hideSpare(): void {
        for (let i = this.used; i < this.pool.length; i++) {
            this.pool[i].node.active = false;
        }
    }
}

const tintCache = new Color();
function colorFrom(tint: Tint): Color {
    tintCache.set(tint.r, tint.g, tint.b, tint.a);
    return tintCache;
}
