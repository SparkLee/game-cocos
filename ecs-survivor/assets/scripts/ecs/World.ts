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

export type Entity = number;
export type Ctor<T> = new () => T;

export interface System {
    name: string;
    update(world: World, dt: number): void;
}

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
        this.sparse[entity] = index;
        return component;
    }

    remove(entity: Entity): void {
        const index = this.sparse[entity];
        if (index === undefined || index < 0) {
            return;
        }
        const last = this.dense.length - 1;
        if (index !== last) {
            this.dense[index] = this.dense[last];
            this.entities[index] = this.entities[last];
            this.sparse[this.entities[index]] = index;
        }
        this.dense.pop();
        this.entities.pop();
        this.sparse[entity] = -1;
    }

    clear(): void {
        this.dense.length = 0;
        this.entities.length = 0;
        this.sparse.length = 0;
    }
}

export class World {
    readonly systemMs: Record<string, number> = {};

    private nextEntityId = 1;
    private readonly alive = new Set<Entity>();
    private readonly pendingDestroy = new Set<Entity>();
    private readonly stores = new Map<Ctor<unknown>, ComponentStore<unknown>>();
    private readonly systems: System[] = [];

    get entityCount(): number {
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

    create(): Entity {
        const entity = this.nextEntityId++;
        this.alive.add(entity);
        return entity;
    }

    isAlive(entity: Entity): boolean {
        return this.alive.has(entity) && !this.pendingDestroy.has(entity);
    }

    /** 延迟销毁，避免系统遍历到一半实体被删掉。 */
    destroy(entity: Entity): void {
        if (this.alive.has(entity)) {
            this.pendingDestroy.add(entity);
        }
    }

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

    each<A>(a: Ctor<A>, fn: (entity: Entity, a: A) => void): void;
    each<A, B>(a: Ctor<A>, b: Ctor<B>, fn: (entity: Entity, a: A, b: B) => void): void;
    each<A, B, C>(a: Ctor<A>, b: Ctor<B>, c: Ctor<C>, fn: (entity: Entity, a: A, b: B, c: C) => void): void;
    each<A, B, C, D>(a: Ctor<A>, b: Ctor<B>, c: Ctor<C>, d: Ctor<D>, fn: (entity: Entity, a: A, b: B, c: C, d: D) => void): void;
    each(...args: unknown[]): void {
        const fn = args.pop() as (...params: unknown[]) => void;
        const ctors = args as Ctor<unknown>[];
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
                    miss = true;
                    break;
                }
                pack.push(comp);
            }
            if (!miss) {
                fn(...pack);
            }
        }
    }

    update(dt: number): void {
        for (let i = 0; i < this.systems.length; i++) {
            const system = this.systems[i];
            const start = nowMs();
            system.update(this, dt);
            this.systemMs[system.name] = nowMs() - start;
        }
        this.flushDestroyed();
    }

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
        let store = this.stores.get(ctor as Ctor<unknown>);
        if (!store) {
            store = new ComponentStore<T>();
            this.stores.set(ctor as Ctor<unknown>, store);
        }
        return store as ComponentStore<T>;
    }

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
