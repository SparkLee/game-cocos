import { error, log } from "cc";

export const GRID_WIDTH = 10; // 网格宽度（格子数）
export const GRID_HEIGHT = 10;// 网格高度（格子数）

/**
 * 格子类型
 */
interface CellType {
    id: string;     // 格子类型ID
    width: number;  // 宽度（占用格子数）
    height: number; // 高度（占用格子数）
    color: string;  // 格子显示的颜色
    count: number;  // 格子数量
}

const CELL_TYPES: CellType[] = [
    { id: '大型车', width: 3, height: 2, color: '#FF6B6B', count: 3 },
    { id: '中型车', width: 2, height: 2, color: '#4ECDC4', count: 4 },
    { id: '小型车', width: 2, height: 1, color: '#45B7D1', count: 3 }
];

/**
 * 格子
 */
export class Cell {
    typeId: string;
    width: number;
    height: number;
    color: string;
    x: number;
    y: number;

    constructor(typeId: string, width: number, height: number, color: string) {
        this.typeId = typeId; // 格子类型ID
        this.width = width;   // 格子占用的网格宽度
        this.height = height; // 格子占用的网格高度
        this.color = color;   // 格子显示的颜色
        this.x = 0;           // 格子在网格中的x坐标
        this.y = 0;           // 格子在网格中的y坐标
    }

    toString(): string {
        return `${this.typeId} (${this.width}x${this.height}) at (${this.x}, ${this.y})`;
    }
}

// 网格类：管理整个停车场的网格系统
// 负责格子的放置、位置检查和布局优化
export class Grid {
    width: number;
    height: number;
    grid: (Cell | null)[][];
    nodes: Cell[];

    constructor(width: number, height: number) {
        this.width = width;     // 网格的宽度
        this.height = height;   // 网格的高度
        this.reset();          // 初始化网格状态
    }

    // 重置网格状态
    // 创建一个二维数组表示网格，初始值都是null
    // 清空已放置的格子列表
    reset() {
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
        this.nodes = [];
    }

    // 检查是否可以在指定位置放置格子
    // 需要检查两个条件：
    // 1. 格子是否会超出网格边界
    // 2. 指定位置是否已经被其他格子占用
    canPlace(vehicle: Cell, x: number, y: number): boolean {
        // 检查是否超出网格边界
        if (x + vehicle.width > this.width || y + vehicle.height > this.height) {
            return false;
        }
        // 检查目标位置的每个格子是否已被占用
        for (let i = y; i < y + vehicle.height; i++) {
            for (let j = x; j < x + vehicle.width; j++) {
                if (this.grid[i][j] !== null) {
                    return false;
                }
            }
        }
        return true;
    }

    // 在指定位置放置格子
    // 如果放置成功返回true，否则返回false
    place(vehicle: Cell, x: number, y: number): boolean {
        // 首先检查是否可以放置
        if (!this.canPlace(vehicle, x, y)) {
            return false;
        }
        // 在网格中标记格子占用的位置
        for (let i = y; i < y + vehicle.height; i++) {
            for (let j = x; j < x + vehicle.width; j++) {
                this.grid[i][j] = vehicle;
            }
        }
        // 更新格子的位置信息
        vehicle.x = x;
        vehicle.y = y;
        // 将格子添加到已放置格子列表
        this.nodes.push(vehicle);
        return true;
    }

    // 核心算法：紧凑排列所有格子
    // 算法步骤：
    // 1. 重置网格状态
    // 2. 随机打乱格子顺序
    // 3. 对每个格子：
    //    a. 找出所有可能的放置位置
    //    b. 计算每个位置的优先级
    //    c. 选择优先级最高的位置放置格子
    compactArrangement(vehicles: Cell[]): boolean {
        this.reset();
        // 完全随机分布，不按面积排序
        shuffleArray(vehicles);

        for (const vehicle of vehicles) {
            let placed = false;
            let positions: { x: number, y: number, priority: number }[] = [];

            // 收集所有可能的放置位置
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.canPlace(vehicle, x, y)) {
                        // 计算该位置的优先级分数
                        positions.push({ x, y, priority: calculatePriority(x, y, this) });
                    }
                }
            }

            // 如果找到了可用位置
            if (positions.length > 0) {
                // 按优先级排序（分数越低越优先）
                positions.sort((a, b) => a.priority - b.priority);
                // 选择最优位置
                const bestPos = positions[0];
                // 尝试放置格子
                if (this.place(vehicle, bestPos.x, bestPos.y)) {
                    placed = true;
                }
            }

            // 如果无法放置当前格子，返回失败
            if (!placed) {
                return false;
            }
        }

        // 主要格子放置完成后，填充空白区域
        this.fillEmptySpaces();
        return true;
    }

    // 填充空白区域
    fillEmptySpaces() {
        // 找出最大的空白区域边界
        let maxX = 0, maxY = 0;
        for (const vehicle of this.nodes) {
            maxX = Math.max(maxX, vehicle.x + vehicle.width);
            maxY = Math.max(maxY, vehicle.y + vehicle.height);
        }

        // 扫描空白区域并填充
        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x < maxX; x++) {
                if (this.grid[y][x] === null) {
                    // 尝试放置不同大小的格子
                    this.tryFillSpace(x, y);
                }
            }
        }
    }

    // 尝试在指定位置填充格子
    tryFillSpace(x: number, y: number) {
        // 如果该位置已被占用，直接返回
        if (this.grid[y][x] !== null) return;

        // 计算在该位置可以放置的最大格子尺寸
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

        // 根据可用空间选择合适的格子类型
        let availableTypes = CELL_TYPES.filter(type =>
            type.width <= maxWidth && type.height <= maxHeight);

        if (availableTypes.length > 0) {
            // 随机选择一个合适的格子类型
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const vehicle = new Cell(type.id, type.width, type.height, type.color);
            this.place(vehicle, x, y);
        }
    }
}

// 计算网格中某个位置的优先级分数
// 优先级由三个因素决定：
// 1. 周围格子数量（当前未实现，固定为0）
// 2. 到网格中心的曼哈顿距离（占30%权重）
// 3. 随机因素（占20%权重）
// 分数越低，表示该位置越适合放置格子
function calculatePriority(x: number, y: number, grid: Grid): number {
    const surroundingCars = 0; // 周围格子数量，目前未实现此功能
    // 计算到网格中心的曼哈顿距离
    const distanceFromCenter = Math.abs(x - grid.width / 2) + Math.abs(y - grid.height / 2);
    // 返回综合优先级分数
    return surroundingCars * 0.5 + distanceFromCenter * 0.3 + Math.random() * 0.2;
}

// 创建所有类型的格子实例
// 根据VEHICLE_TYPES中定义的每种类型的数量创建对应数量的格子对象
function createNodes(): Cell[] {
    const vehicles: Cell[] = [];
    CELL_TYPES.forEach(type => {
        // 根据每种类型的count属性创建指定数量的格子
        for (let i = 0; i < type.count; i++) {
            vehicles.push(new Cell(type.id, type.width, type.height, type.color));
        }
    });
    return vehicles;
}

function shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function gridFoo() {
    const nodes = shuffleArray(createNodes());
    const grid = new Grid(GRID_WIDTH, GRID_HEIGHT);
    if (grid.compactArrangement(nodes)) {
        return grid.nodes;
    } else {
        error('无法完成格子排列，请调整网格大小或减少格子数量');
    }
}