import { System, World } from '../../ecs/World';
import {
    Caption,
    Elite,
    Enemy,
    Health,
    Position,
    Radius,
    Tint,
    Velocity,
    makeCaption,
    makeHealth,
    makePosition,
    makeRadius,
    makeTint,
    makeVelocity,
} from '../Components';
import { GameContext } from '../GameConfig';

const KINDS = [
    { kind: 0, speed: 72, hp: 18, radius: 20, damage: 8, xp: 2, tint: [232, 92, 86] },
    { kind: 1, speed: 140, hp: 10, radius: 20, damage: 6, xp: 2, tint: [255, 164, 72] },
    { kind: 2, speed: 42, hp: 70, radius: 24, damage: 14, xp: 5, tint: [168, 74, 214] },
];

export class SpawnSystem implements System {
    name = 'Spawn';

    private acc = 0;

    constructor(private readonly ctx: GameContext) {}

    update(world: World, dt: number): void {
        if (this.ctx.paused || this.ctx.dead) {
            return;
        }
        this.ctx.time += dt;
        this.ctx.config.spawnPerSecond = 8 + Math.floor(this.ctx.time / 10) * 2;
        this.ctx.config.enemyHpScale = 1 + this.ctx.time / 80;

        this.acc += dt * this.ctx.config.spawnPerSecond;
        const playerPos = world.get(this.ctx.player, Position);
        if (!playerPos) {
            return;
        }
        while (this.acc >= 1) {
            this.acc -= 1;
            if (world.count(Enemy) >= this.ctx.config.maxEnemies) {
                break;
            }
            this.spawn(world, playerPos.x, playerPos.y);
        }
    }

    reset(): void {
        this.acc = 0;
    }

    private spawn(world: World, px: number, py: number): void {
        const late = this.ctx.time > 30;
        const roll = Math.random();
        const spec = late
            ? (roll < 0.55 ? KINDS[0] : roll < 0.8 ? KINDS[1] : KINDS[2])
            : (roll < 0.78 ? KINDS[0] : roll < 0.93 ? KINDS[1] : KINDS[2]);

        const angle = Math.random() * Math.PI * 2;
        const dist = 430 + Math.random() * 80;
        const x = px + Math.cos(angle) * dist;
        const y = py + Math.sin(angle) * dist;
        const elite = Math.random() < 0.08;
        const hp = spec.hp * this.ctx.config.enemyHpScale * (elite ? 2.4 : 1);

        const entity = world.create();
        const enemy = new Enemy();
        enemy.damage = spec.damage;
        enemy.xp = spec.xp;
        enemy.kind = spec.kind;
        world.add(entity, Enemy, enemy);
        world.add(entity, Position, makePosition(x, y));
        world.add(entity, Velocity, makeVelocity(Math.cos(angle + Math.PI) * spec.speed, Math.sin(angle + Math.PI) * spec.speed));
        world.add(entity, Radius, makeRadius(elite ? spec.radius + 8 : spec.radius));
        world.add(entity, Health, makeHealth(hp));
        world.add(entity, Tint, elite
            ? makeTint(255, 208, 72)
            : makeTint(spec.tint[0], spec.tint[1], spec.tint[2]));
        world.add(entity, Caption, makeCaption(elite ? '精英怪' : '普通怪'));
        if (elite) {
            world.add(entity, Elite);
        }
    }
}
