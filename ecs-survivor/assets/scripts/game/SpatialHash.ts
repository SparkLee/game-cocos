import { Entity } from '../ecs/World';

/**
 * 均匀网格空间哈希。割草里碰撞的主体是「大量小圆 vs 大量小圆」，
 * 全对全是 O(n²)；先按格子分桶，每个物体只和邻近格子比，接近 O(n)。
 */
export class SpatialHash {
    cellSize: number;
    private readonly cells = new Map<number, Entity[]>(); // 格子键 → 落在该格的实体
    private readonly pool: Entity[][] = [];               // 清空后回收桶，少 GC

    constructor(cellSize = 64) {
        this.cellSize = cellSize;
    }

    clear(): void {
        this.cells.forEach((bucket) => {
            bucket.length = 0;
            this.pool.push(bucket);
        });
        this.cells.clear();
    }

    /** 圆可能跨多格，每个覆盖到的桶都塞进去。 */
    insert(entity: Entity, x: number, y: number, radius: number): void {
        // 只塞圆心那一格会漏：圆边缘伸进邻格时，邻格的查询找不到它。
        const minX = this.cell(x - radius);
        const maxX = this.cell(x + radius);
        const minY = this.cell(y - radius);
        const maxY = this.cell(y + radius);
        for (let ix = minX; ix <= maxX; ix++) {
            for (let iy = minY; iy <= maxY; iy++) {
                const key = this.key(ix, iy);
                let bucket = this.cells.get(key);
                if (!bucket) {
                    bucket = this.pool.pop() ?? [];
                    this.cells.set(key, bucket);
                }
                bucket.push(entity);
            }
        }
    }

    /** 查出半径内邻近格子里的实体，同一实体可能跨格，用 indexOf 去重。 */
    query(x: number, y: number, radius: number, out: Entity[]): Entity[] {
        out.length = 0;
        const minX = this.cell(x - radius);
        const maxX = this.cell(x + radius);
        const minY = this.cell(y - radius);
        const maxY = this.cell(y + radius);
        for (let ix = minX; ix <= maxX; ix++) {
            for (let iy = minY; iy <= maxY; iy++) {
                const bucket = this.cells.get(this.key(ix, iy));
                if (!bucket) {
                    continue;
                }
                for (let i = 0; i < bucket.length; i++) {
                    const entity = bucket[i];
                    if (out.indexOf(entity) < 0) {
                        out.push(entity); // 跨格插入过多次，同一 ID 可能出现在好几个桶
                    }
                }
            }
        }
        return out;
    }

    private cell(value: number): number {
        return Math.floor(value / this.cellSize);
    }

    private key(ix: number, iy: number): number {
        // 格子坐标可为负。先 +32768 挪到正数，再把 x 放高 16 位、y 放低 16 位，当 Map 的一个整数键。
        return ((ix + 32768) << 16) | (iy + 32768);
    }
}
