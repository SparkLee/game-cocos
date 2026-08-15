/**
 * 教学用 ECS 内核。
 *
 * Entity   = 只是一个数字 ID，不继承 Node，也不带行为。
 * Component = 纯数据，按类型放进稀疏集合（Sparse Set），遍历时内存连续。
 * System    = 每帧按查询取出「拥有某组组件的实体」，批量处理。
 *
 * 割草游戏的实体数量通常是几百到几千，且绝大多数是同类敌人 / 子弹 / 掉落。
 * 用场景树 + 每节点 update() 会把时间花在对象跳转和组件查找上；
 * ECS 则让 Movement / Collision / Render 各自扫一遍紧凑数组。
 */

export type Entity = number;           // 实体就是递增数字 ID
export type Ctor<T> = new () => T;     // 组件类的构造函数，用来当「类型键」

export interface System {
    name: string;
    update(world: World, dt: number): void;
}

/** Sparse Set：dense 连续存放，sparse[entityId] 指向下标。删除时与末尾交换。 */
export class ComponentStore<T> {
    /** 连续存放的组件，遍历时走这条数组。 */
    readonly dense: T[] = [];
    /** 与 dense 平行的实体 ID。 */
    readonly entities: Entity[] = [];
    /** entityId -> dense 下标，-1 表示没有该组件。 */
    private sparse: number[] = [];

    get count(): number {
        return this.dense.length;
    }

    has(entity: Entity): boolean {
        const index = this.sparse[entity];
        return index !== undefined && index >= 0;
    }

    get(entity: Entity): T | undefined {
        const index = this.sparse[entity];
        if (index === undefined || index < 0) {
            return undefined;
        }
        return this.dense[index];
    }

    add(entity: Entity, component: T): T {
        const exist = this.sparse[entity];
        if (exist !== undefined && exist >= 0) {
            this.dense[exist] = component;
            return component;
        }
        const index = this.dense.length;
        this.dense.push(component);
        this.entities.push(entity);
        this.sparse[entity] = index; // 之后用 entityId 当数组下标做 O(1) 查找
        return component;
    }

    remove(entity: Entity): void {
        const index = this.sparse[entity];
        if (index === undefined || index < 0) {
            return;
        }
        // 不能在 dense 中间留空洞，否则遍历不再连续。
        // 做法：把末尾那一项搬到被删的位置，再 pop。被搬走的实体要改 sparse 下标。
        const last = this.dense.length - 1;
        if (index !== last) {
            this.dense[index] = this.dense[last];
            this.entities[index] = this.entities[last];
            this.sparse[this.entities[index]] = index;
        }
        this.dense.pop();
        this.entities.pop();
        this.sparse[entity] = -1; // 不能 splice sparse，ID 还不回收，只标记「没有这个组件」
    }

    clear(): void {
        this.dense.length = 0;
        this.entities.length = 0;
        this.sparse.length = 0;
    }
}

export class World {
    readonly systemMs: Record<string, number> = {}; // 各 System 上一帧耗时，给 HUD 用

    private nextEntityId = 1;
    private readonly alive = new Set<Entity>();
    private readonly pendingDestroy = new Set<Entity>(); // 本帧标记销毁，update 结束再真正删
    private readonly stores = new Map<Ctor<unknown>, ComponentStore<unknown>>();
    private readonly systems: System[] = [];

    get entityCount(): number {
        // pendingDestroy 里的实体本帧还在 alive 里，对 HUD / 刷怪上限要当成已经没了。
        return this.alive.size - this.pendingDestroy.size;
    }

    /** 下一个将要分配的实体 ID（已发出的最大 ID + 1）。 */
    get nextId(): number {
        return this.nextEntityId;
    }

    register(system: System): this {
        this.systems.push(system);
        return this;
    }

    /** 分配新 ID。本局不回收，重开 reset() 才从 1 再数。 */
    create(): Entity {
        const entity = this.nextEntityId++;
        this.alive.add(entity);
        return entity;
    }

    isAlive(entity: Entity): boolean {
        // 已标记销毁的实体本帧各系统还可能扫到，一律当死，避免打尸体、重复掉落。
        return this.alive.has(entity) && !this.pendingDestroy.has(entity);
    }

    /** 延迟销毁，避免系统遍历到一半实体被删掉。 */
    destroy(entity: Entity): void {
        if (this.alive.has(entity)) {
            this.pendingDestroy.add(entity); // 只打标；组件还在，本帧后续系统仍能读到位置去生成经验球
        }
    }

    /** 给实体挂上该类型组件；已有则覆盖。 */
    add<T>(entity: Entity, ctor: Ctor<T>, component?: T): T {
        const store = this.store(ctor);
        const value = component ?? new ctor();
        return store.add(entity, value) as T;
    }

    /** 读取实体上指定类型的组件；没有则返回 undefined。 */
    get<T>(entity: Entity, ctor: Ctor<T>): T | undefined {
        return this.store(ctor).get(entity) as T | undefined;
    }

    has<T>(entity: Entity, ctor: Ctor<T>): boolean {
        return this.store(ctor).has(entity);
    }

    remove<T>(entity: Entity, ctor: Ctor<T>): void {
        this.store(ctor).remove(entity);
    }

    count<T>(ctor: Ctor<T>): number {
        return this.store(ctor).count;
    }

    /** 查出同时拥有这些组件的实体。从数量最少的那张表扫，再核对其余组件。 */
    each<A>(a: Ctor<A>, fn: (entity: Entity, a: A) => void): void;
    each<A, B>(a: Ctor<A>, b: Ctor<B>, fn: (entity: Entity, a: A, b: B) => void): void;
    each<A, B, C>(a: Ctor<A>, b: Ctor<B>, c: Ctor<C>, fn: (entity: Entity, a: A, b: B, c: C) => void): void;
    each<A, B, C, D>(a: Ctor<A>, b: Ctor<B>, c: Ctor<C>, d: Ctor<D>, fn: (entity: Entity, a: A, b: B, c: C, d: D) => void): void;
    each(...args: unknown[]): void {
        const fn = args.pop() as (...params: unknown[]) => void;
        const ctors = args as Ctor<unknown>[];
        // 例：each(Enemy, Position) 时敌人远少于有位置的实体，从 Enemy 表扫更短。
        let smallest = this.store(ctors[0]);
        for (let i = 1; i < ctors.length; i++) {
            const store = this.store(ctors[i]);
            if (store.count < smallest.count) {
                smallest = store;
            }
        }

        const entities = smallest.entities;
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (!this.isAlive(entity)) {
                continue;
            }
            const pack: unknown[] = [entity];
            let miss = false;
            for (let c = 0; c < ctors.length; c++) {
                const comp = this.store(ctors[c]).get(entity);
                if (!comp) {
                    miss = true; // 最短表里有，但缺查询要求的其它组件
                    break;
                }
                pack.push(comp);
            }
            if (!miss) {
                fn(...pack);
            }
        }
    }

    /** 按注册顺序跑一遍 System，再把 pendingDestroy 真正清掉。 */
    update(dt: number): void {
        for (let i = 0; i < this.systems.length; i++) {
            const system = this.systems[i];
            const start = nowMs();
            system.update(this, dt);
            this.systemMs[system.name] = nowMs() - start;
        }
        this.flushDestroyed();
    }

    /** 清实体和组件，ID 从 1 重数。System 本身保留。 */
    reset(): void {
        this.alive.clear();
        this.pendingDestroy.clear();
        this.stores.forEach((store) => store.clear());
        this.nextEntityId = 1;
        for (const key of Object.keys(this.systemMs)) {
            this.systemMs[key] = 0;
        }
    }

    private store<T>(ctor: Ctor<T>): ComponentStore<T> {
        // 用组件 class 本身当 Map 键（不是字符串名），所以 World.add(e, Position) 能精确落到这一张表。
        let store = this.stores.get(ctor as Ctor<unknown>);
        if (!store) {
            store = new ComponentStore<T>();
            this.stores.set(ctor as Ctor<unknown>, store);
        }
        return store as ComponentStore<T>;
    }

    /** 从所有组件表里摘掉已标记销毁的实体。 */
    private flushDestroyed(): void {
        if (this.pendingDestroy.size === 0) {
            return;
        }
        this.pendingDestroy.forEach((entity) => {
            this.stores.forEach((store) => store.remove(entity));
            this.alive.delete(entity);
        });
        this.pendingDestroy.clear();
    }
}

function nowMs(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
