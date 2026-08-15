import { Color, Graphics, Label, Node, UITransform } from 'cc';
import { System, World } from '../../ecs/World';
import { Caption, Elite, Enemy, Experience, HitFlash, Position, Projectile, Radius, Tint } from '../Components';
import { GameContext } from '../GameConfig';

const GRID = new Color(36, 44, 58, 255);
const PLAYER_CORE = new Color(90, 230, 210, 255);
const FLASH = new Color(255, 255, 255, 255);
const LABEL_FILL = new Color(255, 255, 255, 255);
const LABEL_OUTLINE = new Color(20, 22, 28, 230);

/**
 * 用一个 Graphics 按数据画圆，圆内文字来自 Label 对象池。
 * 相机跟主角：世界坐标减去主角位置，主角永远画在屏幕中心。
 * 屏外的怪 ECS 仍在模拟，这里裁掉不画。
 */
export class RenderSystem implements System {
    name = 'Render';

    private readonly pool: Label[] = []; // 标签对象池，不够再 new，多余的藏起来
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
        this.ctx.shake *= 0.82; // 每帧乘衰减，几帧后自然停，不必另做计时器
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
        // 网格要跟着主角平移，但不能整格跳。先把世界坐标模到一格内，再从屏幕左边画出。
        // ((n % step) + step) % step 是为了 n 为负时 JS 的 % 仍得到负数。
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
            // 世界坐标减主角位置 = 屏幕坐标。主角永远在 (0,0)，再加 ox/oy 做抖动。
            const x = pos.x - origin.x + ox;
            const y = pos.y - origin.y + oy;
            if (x < -hw || x > hw || y < -hh || y > hh) {
                return; // 屏外不画，实体还在 World 里
            }
            const flash = world.get(_entity, HitFlash);
            if (flash && flash.remaining > 0) {
                graphics.fillColor = FLASH;
            } else {
                graphics.fillColor = colorFrom(tint);
            }
            graphics.circle(x, y, radius.value);
            graphics.fill();
            if (world.has(_entity, Elite)) { // 精英金边，只看有没有 Elite 组件
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
        graphics.circle(ox, oy, r); // 主角已是相机原点，只画抖动偏移
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
            // 本帧需要的第 N 个标签池里还没有：才 new。之后一直复用，hideSpare 只是 active=false。
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
            this.pool[i].node.active = false; // 本帧没用到的标签藏起来，不销毁
        }
    }
}

const tintCache = new Color();
function colorFrom(tint: Tint): Color {
    // Graphics.fillColor 会立刻拷走颜色，可以复用同一个 Color，少 GC。
    tintCache.set(tint.r, tint.g, tint.b, tint.a);
    return tintCache;
}
