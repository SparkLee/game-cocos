import { resources, sp, SpriteFrame } from 'cc';

export type SpineKind = 'player' | 'enemy' | 'elite';

/**
 * 角色 Spine + 子弹 SpriteFrame。路径相对 assets/resources/。
 *
 * 主角 / 普通怪 / 精英怪用骨骼；子弹、经验球用图。
 * 普通怪和精英怪不能共用同一份数据，对象池也要分开，否则换装会闪。
 */
export class SpineCatalog {
    player: sp.SkeletonData | null = null;   // resources/spines/role_yuanjun
    enemy: sp.SkeletonData | null = null;    // resources/spines/monster_101_wenzi
    elite: sp.SkeletonData | null = null;    // resources/spines/monster_111_wenzi
    bulletFrame: SpriteFrame | null = null;  // resources/images/bullet_1
    expOrbFrame: SpriteFrame | null = null;  // resources/images/icon_wurenjWeapon_312
}

const PATHS: Record<SpineKind, string> = {
    player: 'spines/role_yuanjun/role_yuanjun',
    enemy: 'spines/monster_101_wenzi/monster_101_wenzi',
    elite: 'spines/monster_111_wenzi/monster_111_wenzi',
};

/** 优先播放的动画名。没有对应名字时退回骨骼里的第一段，避免 setAnimation 抛错。 */
export const SPINE_ANIMS: Record<SpineKind, { move: string[]; idle: string[]; attack?: string[] }> = {
    player: { move: ['animation', 'walk', 'run', 'idle'], idle: ['animation', 'idle', 'walk'] },
    enemy: { move: ['walk', 'idle'], idle: ['walk', 'idle'], attack: ['attack'] },
    elite: { move: ['walk', 'idle'], idle: ['walk', 'idle'], attack: ['attack2'] },
};

/**
 * 主角 role_yuanjun 是换装骨骼：附件在 nan / skin1 里，默认皮肤是空的。
 * 不 setSkin 就只有空 pose，画面上只剩「主角」两个字。
 */
export const SPINE_SKINS: Record<SpineKind, string[]> = {
    player: ['nan', 'skin1', 'skin2', 'maiersi', 'lita'],
    enemy: ['default'],
    elite: ['default'],
};

export function spineDataOf(catalog: SpineCatalog, kind: SpineKind): sp.SkeletonData | null {
    if (kind === 'player') {
        return catalog.player;
    }
    if (kind === 'enemy') {
        return catalog.enemy;
    }
    if (kind === 'elite') {
        return catalog.elite;
    }
    return null;
}

export async function loadSpineCatalog(catalog: SpineCatalog): Promise<void> {
    const [player, enemy, elite, bulletFrame, expOrbFrame] = await Promise.all([
        loadSkeleton(PATHS.player),
        loadSkeleton(PATHS.enemy),
        loadSkeleton(PATHS.elite),
        loadSpriteFrame('images/bullet_1/spriteFrame'),
        loadSpriteFrame('images/icon_wurenjWeapon_312/spriteFrame'),
    ]);
    catalog.player = player;
    catalog.enemy = enemy;
    catalog.elite = elite;
    catalog.bulletFrame = bulletFrame;
    catalog.expOrbFrame = expOrbFrame;
}

export function pickSpineAnimation(data: sp.SkeletonData, preferred: string[]): string {
    const names = animationNames(data);
    for (let i = 0; i < preferred.length; i++) {
        if (names.indexOf(preferred[i]) >= 0) {
            return preferred[i];
        }
    }
    return names[0] || preferred[0] || '';
}

export function spineNativeHeight(data: sp.SkeletonData): number {
    const runtime = data.getRuntimeData();
    const height = runtime?.height ?? 0;
    return height > 1 ? height : 180;
}

/** 换装骨骼必须先指定皮肤，否则插槽上没有附件。 */
export function applySpineSkin(skeleton: sp.Skeleton, data: sp.SkeletonData, preferred: string[]): void {
    const runtime = data.getRuntimeData();
    const skin = pickSkinName(runtime, preferred);
    if (!skin) {
        return;
    }
    skeleton.setSkin(skin);
    skeleton.setSlotsToSetupPose();
}

function pickSkinName(runtime: ReturnType<sp.SkeletonData['getRuntimeData']>, preferred: string[]): string {
    if (!runtime) {
        return preferred[0] || '';
    }
    const names = skinNames(runtime);
    for (let i = 0; i < preferred.length; i++) {
        const name = preferred[i];
        if (names.length === 0 || names.indexOf(name) >= 0) {
            return name;
        }
    }
    for (let i = 0; i < names.length; i++) {
        if (names[i] && names[i] !== 'default') {
            return names[i];
        }
    }
    return names[0] || preferred[0] || '';
}

function skinNames(runtime: NonNullable<ReturnType<sp.SkeletonData['getRuntimeData']>>): string[] {
    const skins = runtime.skins;
    if (!skins || skins.length === 0) {
        return [];
    }
    const names: string[] = [];
    for (let i = 0; i < skins.length; i++) {
        names.push(skins[i].name);
    }
    return names;
}

function animationNames(data: sp.SkeletonData): string[] {
    const runtime = data.getRuntimeData();
    const animations = runtime?.animations;
    if (!animations || animations.length === 0) {
        return [];
    }
    const names: string[] = [];
    for (let i = 0; i < animations.length; i++) {
        names.push(animations[i].name);
    }
    return names;
}

function loadSkeleton(path: string): Promise<sp.SkeletonData | null> {
    return new Promise((resolve) => {
        resources.load(path, sp.SkeletonData, (err, data) => {
            if (err || !data) {
                console.warn(`[Spine] 加载失败 ${path}`, err);
                resolve(null);
                return;
            }
            resolve(data);
        });
    });
}

function loadSpriteFrame(path: string): Promise<SpriteFrame | null> {
    return new Promise((resolve) => {
        resources.load(path, SpriteFrame, (err, data) => {
            if (err || !data) {
                console.warn(`[Sprite] 加载失败 ${path}`, err);
                resolve(null);
                return;
            }
            resolve(data);
        });
    });
}
