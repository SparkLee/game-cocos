// Grid：由 n*m 个格子组成的矩形网格（n列，m行）。
// Entity: 由 w*h 个格子组成的矩形实体（w列，h行；1*1：占用1个格子【小型车】，1*2：占用2个格子【中型车】，2*3：占用6个格子【大型车】）。
// 要将多个Entity实体尽量紧凑地排列，尽量铺满整个Grid网络。

export const GRID_WIDTH = 10; // 网格宽度（格子数）
export const GRID_HEIGHT = 10;// 网格高度（格式数）

/**
 * 实体类型（比如：小型车、中型车、大型车等）
 */
interface EntityType {
    id: string;            // 实体类型ID
    width: number;         // 宽度（占用格子数）
    height: number;        // 高度（占用格子数）
    color: string;         // 实体显示的颜色
    axisDirection: string; // 轴向（x: 可沿X轴正反方向移动；y：可沿Y轴正反方向移动; xy：可沿X轴和Y轴正反共4个方向任意移动）
    count: number;         // 实体数量
}

const ENTITY_TYPES: EntityType[] = [
    { id: '大x', width: 3, height: 2, color: '#FF6B6B', axisDirection: 'x', count: 3 },
    { id: '大y', width: 2, height: 3, color: '#FF6B6B', axisDirection: 'y', count: 3 },
    { id: '中xy', width: 2, height: 2, color: '#4ECDC4', axisDirection: 'xy', count: 4 },
    { id: '小x', width: 2, height: 1, color: '#45B7D1', axisDirection: 'x', count: 3 },
    { id: '小y', width: 1, height: 2, color: '#45B7D1', axisDirection: 'y', count: 3 },
];

/**
 * 实体（比如车辆，船只，飞机等）
 */
export class Entity {
    entityTypeId: string;  // 实体类型ID
    width: number;         // 宽度（占用格子数）
    height: number;        // 高度（占用格子数）
    color: string;         // 实体显示的颜色
    axisDirection: string; // 轴向
    x: number;             // 实体左上角单元格在网格中的x坐标
    y: number;             // 实体左上角单元格在网格中的y坐标
    placeIndex: number;    // 实体被放置的索引（用来标记实体被成功放置的先后顺序）

    constructor(entityTypeId: string, width: number, height: number, color: string, axisDirection: string) {
        this.entityTypeId = entityTypeId;
        this.width = width;
        this.height = height;
        this.color = color;
        this.axisDirection = axisDirection;
        this.x = 0;
        this.y = 0;
        this.placeIndex = 1;
    }

    toString(): string {
        return `${this.entityTypeId} (${this.width}x${this.height}) ${this.color} ${this.axisDirection} at (${this.x}, ${this.y})`;
    }
}

/**
 * 网络
 */
export class Grid {
    width: number;
    height: number;
    grid: (Entity | null)[][];
    entities: Entity[];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.reset();
    }

    /**
     * 重置网格状态
     */
    reset() {
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
        this.entities = []; // 清空已放置的实体列表
    }

    /**
     * 检查是否可以在指定位置摆放 实体
     */
    canPlace(entity: Entity, x: number, y: number): boolean {
        // 检查是否超出网格边界
        if (x + entity.width > this.width || y + entity.height > this.height) {
            return false;
        }
        // 检查目标位置的每个 格子 是否已被占用
        for (let i = y; i < y + entity.height; i++) {
            for (let j = x; j < x + entity.width; j++) {
                if (this.grid[i][j] !== null) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 在指定位置放置【实体】
     * 
     * @returns 如果放置成功返回true，否则返回false。
     */
    place(entity: Entity, x: number, y: number): boolean {
        // 首先检查是否可以放置
        if (!this.canPlace(entity, x, y)) {
            return false;
        }
        // 在网格中标记【格子】已被指定【实体】占用
        for (let i = y; i < y + entity.height; i++) {
            for (let j = x; j < x + entity.width; j++) {
                this.grid[i][j] = entity;
            }
        }
        // 更新【实体】的位置信息
        entity.x = x;
        entity.y = y;
        entity.placeIndex = this.entities.length + 1;
        // 【实体】添加到已放置实体列表
        this.entities.push(entity);
        return true;
    }

    /**
     * 核心算法：在网络中紧凑排列所有【实体】
     * 
     * @returns true: 所有实体排布成功，false: 排布失败。
     */
    compactArrangement(entities: Entity[]): boolean {
        this.reset();
        this.shuffleArray(entities);

        for (const entity of entities) {
            let placed = false;
            let positions: { x: number, y: number, priority: number }[] = [];

            // 收集所有可能的放置位置
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.canPlace(entity, x, y)) {
                        // 计算该位置的优先级分数
                        positions.push({ x, y, priority: this.calculatePriority(x, y) });
                    }
                }
            }

            // 如果找到了可用位置
            if (positions.length > 0) {
                // 按优先级排序（分数越低越优先）
                positions.sort((a, b) => a.priority - b.priority);
                // 选择最优位置
                const bestPos = positions[0];
                // 尝试放置实体
                if (this.place(entity, bestPos.x, bestPos.y)) {
                    placed = true;
                }
            }

            // 如果无法放置当前【实体】，返回失败
            if (!placed) {
                return false;
            }
        }

        // 主要【实体】放置完成后（即：在ENTITY_TYPES中由count指定的所有实体都放置完成），再继续填充周边空白区域
        this.fillEmptySpaces();

        return true;
    }

    /**
     * 随机打乱数组
     */
    shuffleArray(entities: Entity[]): Entity[] {
        for (let i = entities.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [entities[i], entities[j]] = [entities[j], entities[i]];
        }
        return entities;
    }

    /**
     * 计算网格中某个位置的优先级分数
     * 
     * @returns 分数越低，表示该位置越适合放置【实体】
     */
    calculatePriority(x: number, y: number): number {
        // 周围实体数量（当前未实现，固定为0）（50% 权重）
        const surroundingCars = 0;
        // 计算到网格中心的曼哈顿距离（30% 权重）
        const distanceFromCenter = Math.abs(x - this.width / 2) + Math.abs(y - this.height / 2);
        // 随机因素（20% 权重）
        const random = Math.random();
        // 返回综合优先级分数
        return surroundingCars * 0.5 + distanceFromCenter * 0.3 + random * 0.2;
    }


    /**
     * 填充空白区域
     */
    fillEmptySpaces() {
        // 找出最大的空白区域边界
        let maxX = 0, maxY = 0;
        for (const entity of this.entities) {
            maxX = Math.max(maxX, entity.x + entity.width);
            maxY = Math.max(maxY, entity.y + entity.height);
        }

        // 扫描空白区域并填充
        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x < maxX; x++) {
                if (this.grid[y][x] === null) {
                    // 尝试放置不同大小的【实体】
                    this.tryFillSpace(x, y);
                }
            }
        }
    }

    /**
     * 尝试在指定位置填充实体
     */
    tryFillSpace(x: number, y: number) {
        // 如果该位置已被占用，直接返回
        if (this.grid[y][x] !== null) return;

        // 计算在该位置可以放置的最大【实体】尺寸
        let maxWidth = 0, maxHeight = 0;
        for (let w = 1; w <= 3; w++) {
            if (x + w > this.width) break;
            let canExtendWidth = true;
            for (let h = 1; h <= 2; h++) {
                if (y + h > this.height) break;
                let canPlace = true;
                for (let i = y; i < y + h; i++) {
                    for (let j = x; j < x + w; j++) {
                        if (this.grid[i][j] !== null) {
                            canPlace = false;
                            break;
                        }
                    }
                    if (!canPlace) break;
                }
                if (canPlace) {
                    maxWidth = w;
                    maxHeight = h;
                } else {
                    canExtendWidth = false;
                    break;
                }
            }
            if (!canExtendWidth) break;
        }

        // 根据可用空间选择合适的【实体类型】
        let availableTypes = ENTITY_TYPES.filter(type =>
            type.width <= maxWidth && type.height <= maxHeight);

        if (availableTypes.length > 0) {
            // 随机选择一个合适的【实体类型】
            const entityType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const entity = new Entity(entityType.id, entityType.width, entityType.height, entityType.color, entityType.axisDirection);
            this.place(entity, x, y);
        }
    }
}

/**
 * 创建所有类型的实体实例
 * 
 * 根据 ENTITY_TYPES 中定义的每种类型的数量创建对应数量的实体对象
 */
function createNodes(): Entity[] {
    const entities: Entity[] = [];
    ENTITY_TYPES.forEach(entityType => {
        // 根据每种类型的count属性创建指定数量的实体
        for (let i = 0; i < entityType.count; i++) {
            entities.push(new Entity(entityType.id, entityType.width, entityType.height, entityType.color, entityType.axisDirection));
        }
    });
    return entities;
}

/**
 * 生成在网络中紧凑排列的实体集合
 */
export function generateCompactArrangedGridEntities(): Entity[] {
    const nodes = createNodes();
    const grid = new Grid(GRID_WIDTH, GRID_HEIGHT);
    if (grid.compactArrangement(nodes)) {
        return grid.entities;
    } else {
        console.error('无法完成实体排列，请调整网格大小（GRID_WIDTH，GRID_HEIGHT）或减少实体数量（ENTITY_TYPES.count）');
    }
}