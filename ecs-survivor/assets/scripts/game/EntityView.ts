import { Color, ImageAsset, Label, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';

/**
 * 每个实体一棵小节点树，方便以后把 Visual 换成 Spine：
 *
 *   Enemy / Player / Bullet / ExpOrb  （经验球，Experience Orb）
 *     Body      ← 朝向；以后 Spine 挂这里
 *       Ring    ← 描边（主角 / 精英），和 Visual 共用一张圆贴图才能合批
 *       Visual  ← Sprite 占位，有 Spine 后可删
 *       Weapon  ← 仅主角
 *     Caption   ← 只给主角和精英开，普通怪/子弹/经验球不开（Label 无法合批）
 *
 * 上千个 Graphics/Label 会各打一次 Draw Call。改成同一张白圆 Sprite，
 * 引擎才能合批；颜色用 sprite.color 染色。
 */
export type EntityKind = 'player' | 'enemy' | 'bullet' | 'expOrb';

export interface EntityBinding {
    kind: EntityKind;
    node: Node;
    body: Node;
    visual: Sprite;
    ring: Sprite | null;
    caption: Label | null;
    weapon: Node | null;
    paintedKey: string;
}

const LABEL_FILL = new Color(255, 255, 255, 255);
const LABEL_OUTLINE = new Color(20, 22, 28, 230);
const WEAPON_FILL = new Color(255, 220, 120, 255);
const PLAYER_RING = new Color(180, 255, 240, 180);
const ELITE_RING = new Color(255, 248, 200, 255);

const KIND_NAME: Record<EntityKind, string> = {
    player: 'Player',
    enemy: 'Enemy',
    bullet: 'Bullet',
    expOrb: 'ExpOrb',
};

let circleFrame: SpriteFrame | null = null;

/** 一张 64×64 白圆，所有实体 Sprite 共用，才能合进同一次 Draw Call。 */
export function getCircleFrame(): SpriteFrame {
    if (circleFrame) {
        return circleFrame;
    }
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.arc(size * 0.5, size * 0.5, size * 0.5 - 1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    const image = new ImageAsset(canvas);
    const texture = new Texture2D();
    texture.image = image;
    circleFrame = new SpriteFrame();
    circleFrame.texture = texture;
    return circleFrame;
}

function addSprite(parent: Node, name: string, layer: number, size: number): Sprite {
    const node = new Node(name);
    node.layer = layer;
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0.5, 0.5);
    transform.setContentSize(size, size);
    parent.addChild(node);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.trim = false;
    sprite.spriteFrame = getCircleFrame();
    return sprite;
}

export function createEntityNode(kind: EntityKind, layer: number): EntityBinding {
    const node = new Node(KIND_NAME[kind]);
    node.layer = layer;
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0.5, 0.5);
    transform.setContentSize(40, 40);

    const body = new Node('Body');
    body.layer = layer;
    const bodyTransform = body.addComponent(UITransform);
    bodyTransform.setAnchorPoint(0.5, 0.5);
    bodyTransform.setContentSize(40, 40);
    node.addChild(body);

    const needRing = kind === 'player' || kind === 'enemy';
    const ring = needRing ? addSprite(body, 'Ring', layer, 48) : null;
    if (ring) {
        ring.node.active = false;
    }
    const visual = addSprite(body, 'Visual', layer, 40);

    let weapon: Node | null = null;
    if (kind === 'player') {
        const weaponSprite = addSprite(body, 'Weapon', layer, 22);
        weapon = weaponSprite.node;
        weaponSprite.color = WEAPON_FILL;
        const wt = weapon.getComponent(UITransform);
        wt?.setContentSize(24, 10);
    }

    let caption: Label | null = null;
    if (kind === 'player' || kind === 'enemy') {
        const captionNode = new Node('Caption');
        captionNode.layer = layer;
        const captionTransform = captionNode.addComponent(UITransform);
        captionTransform.setContentSize(88, 32);
        captionTransform.setAnchorPoint(0.5, 0.5);
        node.addChild(captionNode);
        caption = captionNode.addComponent(Label);
        caption.useSystemFont = true;
        caption.fontFamily = 'Microsoft YaHei, PingFang SC, sans-serif';
        caption.horizontalAlign = Label.HorizontalAlign.CENTER;
        caption.verticalAlign = Label.VerticalAlign.CENTER;
        caption.overflow = Label.Overflow.NONE;
        caption.cacheMode = Label.CacheMode.CHAR;
        caption.enableOutline = true;
        caption.outlineColor = LABEL_OUTLINE;
        caption.outlineWidth = 2;
        caption.color = LABEL_FILL;
        caption.string = '';
        captionNode.active = kind === 'player';
    }

    return { kind, node, body, visual, ring, caption, weapon, paintedKey: '' };
}

export function paintPlaceholder(
    binding: EntityBinding,
    radius: number,
    fill: Color,
    elite: boolean,
    captionText: string,
): void {
    const showCaption = !!(binding.caption && (binding.kind === 'player' || elite));
    const key = `${radius}|${fill.r},${fill.g},${fill.b}|${elite ? 1 : 0}|${showCaption ? captionText : ''}`;
    if (binding.paintedKey === key) {
        return;
    }
    binding.paintedKey = key;

    const size = Math.max(8, radius * 2);
    binding.node.getComponent(UITransform)?.setContentSize(size + 8, size + 8);
    binding.body.getComponent(UITransform)?.setContentSize(size + 8, size + 8);
    binding.visual.node.getComponent(UITransform)?.setContentSize(size, size);
    binding.visual.color = new Color(fill.r, fill.g, fill.b, fill.a);

    if (binding.ring) {
        const showRing = binding.kind === 'player' || elite;
        binding.ring.node.active = showRing;
        if (showRing) {
            const ringSize = size + (binding.kind === 'player' ? 8 : 6);
            binding.ring.node.getComponent(UITransform)?.setContentSize(ringSize, ringSize);
            binding.ring.color = binding.kind === 'player' ? PLAYER_RING : ELITE_RING;
        }
    }

    if (binding.weapon) {
        binding.weapon.setPosition(radius + 2, 0, 0);
    }

    if (binding.caption) {
        binding.caption.node.active = showCaption;
        if (showCaption && binding.caption.string !== captionText) {
            binding.caption.string = captionText;
        }
        if (showCaption) {
            const fontSize = captionText.length > 2
                ? Math.max(9, Math.min(12, Math.floor(radius * 0.52)))
                : Math.max(10, Math.min(14, Math.floor(radius * 0.7)));
            if (binding.caption.fontSize !== fontSize) {
                binding.caption.fontSize = fontSize;
                binding.caption.lineHeight = fontSize + 2;
            }
        }
    }
}
