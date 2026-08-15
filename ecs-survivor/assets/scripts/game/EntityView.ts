import { Color, ImageAsset, Node, Sprite, SpriteFrame, Texture2D, UITransform, sp } from 'cc';
import { pickSpineAnimation, spineNativeHeight, applySpineSkin, SPINE_ANIMS, SPINE_SKINS, SpineKind } from './SpineCatalog';

/**
 * 实体节点树：逻辑节点挂 Spine，经验球仍是空 Body（圆在 WorldDraw 上合批）。
 *
 *   Player / Enemy / Elite / Bullet / ExpOrb
 *     Body      ← 怪 / 主角挂 Spine；子弹、经验球挂 Sprite
 *       Visual  ← 仅主角占位 Sprite，有 Spine 后关掉
 *       Weapon  ← 仅主角，有 Spine 后关掉
 */
export type EntityKind = SpineKind | 'bullet' | 'expOrb';

export interface EntityBinding {
    kind: EntityKind;
    node: Node;
    body: Node;
    visual: Sprite | null;
    weapon: Node | null;
    skeleton: sp.Skeleton | null;
    anim: string;
    spineScale: number;
    fittedRadius: number;
    paintedKey: string;
}

const WEAPON_FILL = new Color(255, 220, 120, 255);

const KIND_NAME: Record<EntityKind, string> = {
    player: 'Player',
    enemy: 'Enemy',
    elite: 'Elite',
    bullet: 'Bullet',
    expOrb: 'ExpOrb',
};

let circleFrame: SpriteFrame | null = null;

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

    let visual: Sprite | null = null;
    let weapon: Node | null = null;

    if (kind === 'player') {
        visual = addSprite(body, 'Visual', layer, 40);
        const weaponSprite = addSprite(body, 'Weapon', layer, 22);
        weapon = weaponSprite.node;
        weaponSprite.color = WEAPON_FILL;
        weapon.getComponent(UITransform)?.setContentSize(24, 10);
    }
    if (kind === 'bullet' || kind === 'expOrb') {
        visual = addSprite(body, 'Visual', layer, 40);
    }

    return {
        kind,
        node,
        body,
        visual,
        weapon,
        skeleton: null,
        anim: '',
        spineScale: 1,
        fittedRadius: 0,
        paintedKey: '',
    };
}

/** 把 SkeletonData 挂到 Body 上。同一节点只绑一次，对象池复用时跳过。 */
export function bindSpine(binding: EntityBinding, data: sp.SkeletonData, radius: number): void {
    if (binding.kind === 'expOrb' || binding.kind === 'bullet') {
        return;
    }
    let skeleton = binding.skeleton;
    if (!skeleton) {
        skeleton = binding.body.getComponent(sp.Skeleton) ?? binding.body.addComponent(sp.Skeleton);
        binding.skeleton = skeleton;
    }
    if (skeleton.skeletonData !== data) {
        skeleton.premultipliedAlpha = true;
        // 同纹理连续绘制才能合批。主角只有一个，开了也合不上。
        skeleton.enableBatch = binding.kind !== 'player';
        skeleton.skeletonData = data;
        applySpineSkin(skeleton, data, SPINE_SKINS[binding.kind as SpineKind]);
        binding.anim = '';
        binding.fittedRadius = 0;
    }
    if (binding.visual) {
        binding.visual.node.active = false;
    }
    if (binding.weapon) {
        binding.weapon.active = false;
    }
    fitSpine(binding, radius);
    const preferred = SPINE_ANIMS[binding.kind as SpineKind].move;
    playSpine(binding, pickSpineAnimation(data, preferred));
}

export function fitSpine(binding: EntityBinding, radius: number): void {
    const data = binding.skeleton?.skeletonData;
    if (!data || binding.fittedRadius === radius) {
        return;
    }
    binding.fittedRadius = radius;
    const native = spineNativeHeight(data);
    const target = visualHeight(binding.kind, radius);
    binding.spineScale = target / native;
    binding.body.setScale(binding.spineScale, binding.spineScale);
    const box = Math.max(80, radius * 8, target * 1.5);
    binding.body.getComponent(UITransform)?.setContentSize(box, box);
    binding.node.getComponent(UITransform)?.setContentSize(box, box);
}

function visualHeight(kind: EntityKind, radius: number): number {
    if (kind === 'player') {
        return Math.max(radius * 2.4, 72);
    }
    return radius * 2.4;
}

/** bullet_1 原图朝上（+Y）。Cocos angle 0 也是 +Y，飞行方向从 +X 算，所以转角要减 90°。 */
export function faceBullet(binding: EntityBinding, radians: number): void {
    binding.body.angle = (radians * 180) / Math.PI - 90;
}

const BULLET_H = 36;
const BULLET_W = (35 / 69) * BULLET_H;

export function bindBulletSprite(binding: EntityBinding, frame: SpriteFrame): void {
    bindSprite(binding, frame, BULLET_W, BULLET_H);
}

const EXP_ORB_SIZE = 32;

export function bindExpOrbSprite(binding: EntityBinding, frame: SpriteFrame): void {
    bindSprite(binding, frame, EXP_ORB_SIZE, EXP_ORB_SIZE);
}

function bindSprite(binding: EntityBinding, frame: SpriteFrame, width: number, height: number): void {
    if (!binding.visual) {
        return;
    }
    binding.visual.spriteFrame = frame;
    binding.visual.sizeMode = Sprite.SizeMode.CUSTOM;
    binding.visual.trim = false;
    binding.visual.node.active = true;
    binding.visual.node.getComponent(UITransform)?.setContentSize(width, height);
    binding.body.getComponent(UITransform)?.setContentSize(width + 8, height + 8);
    binding.node.getComponent(UITransform)?.setContentSize(width + 8, height + 8);
    binding.body.setScale(1, 1);
    binding.body.angle = 0;
    binding.spineScale = 1;
}

export function playSpine(binding: EntityBinding, name: string): void {
    const skeleton = binding.skeleton;
    if (!skeleton || !name || binding.anim === name) {
        return;
    }
    try {
        skeleton.setAnimation(0, name, true);
        binding.anim = name;
    } catch {
        binding.anim = '';
    }
}

export function faceSpine(binding: EntityBinding, radians: number, flip: boolean): void {
    if (flip) {
        const facing = Math.cos(radians) >= 0 ? 1 : -1;
        binding.body.angle = 0;
        binding.body.setScale(binding.spineScale * facing, binding.spineScale);
        return;
    }
    binding.body.setScale(binding.spineScale, binding.spineScale);
    binding.body.angle = (radians * 180) / Math.PI;
}

export function paintPlayer(binding: EntityBinding, radius: number, fill: Color): void {
    const key = `${radius}|${fill.r},${fill.g},${fill.b}`;
    if (binding.paintedKey === key) {
        return;
    }
    binding.paintedKey = key;
    const size = Math.max(8, radius * 2);
    binding.node.getComponent(UITransform)?.setContentSize(size + 8, size + 8);
    binding.body.getComponent(UITransform)?.setContentSize(size + 8, size + 8);
    if (binding.visual) {
        binding.visual.node.getComponent(UITransform)?.setContentSize(size, size);
        binding.visual.color = new Color(fill.r, fill.g, fill.b, fill.a);
    }
    if (binding.weapon) {
        binding.weapon.setPosition(radius + 2, 0, 0);
    }
}
