import { _decorator, Component, Graphics, Node } from 'cc';
import { VehicleComponent } from './VehicleComponent';
const { ccclass, property } = _decorator;

// 定义车辆类型配置
interface VehicleType {
    type: string;
    width: number;
    height: number;
    color: string;
    count: number;
}

@ccclass('GridComponent')
export class GridComponent extends Component {
    @property
    gridWidth: number = 15;

    @property
    gridHeight: number = 15;

    @property(Graphics)
    graphics: Graphics | null = null;

    // 网格起始位置
    @property
    gridOffsetX: number = 50;

    @property
    gridOffsetY: number = 50;

    // 车辆类型配置
    private readonly VEHICLE_TYPES: VehicleType[] = [
        { type: '大型车', width: 3, height: 2, color: '#FF6B6B', count: 8 },
        { type: '中型车', width: 2, height: 2, color: '#4ECDC4', count: 10 },
        { type: '小型车', width: 2, height: 1, color: '#45B7D1', count: 12 },
        { type: '迷你', width: 1, height: 1, color: '#96CEB4', count: 10 }
    ];

    private grid: (VehicleComponent | null)[][] = [];
    private vehicles: VehicleComponent[] = [];

    start() {
        this.reset();
        this.randomizeVehicles();
    }

    // 重置网格状态
    private reset() {
        this.grid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(null));
        this.vehicles = [];
        if (this.graphics) {
            this.graphics.clear();
        }
    }

    // 检查是否可以在指定位置放置车辆
    private canPlace(vehicle: VehicleComponent, x: number, y: number): boolean {
        if (x + vehicle.width > this.gridWidth || y + vehicle.height > this.gridHeight) {
            return false;
        }
        for (let i = y; i < y + vehicle.height; i++) {
            for (let j = x; j < x + vehicle.width; j++) {
                if (this.grid[i][j] !== null) {
                    return false;
                }
            }
        }
        return true;
    }

    // 在指定位置放置车辆
    private place(vehicle: VehicleComponent, x: number, y: number): boolean {
        if (!this.canPlace(vehicle, x, y)) {
            return false;
        }
        for (let i = y; i < y + vehicle.height; i++) {
            for (let j = x; j < x + vehicle.width; j++) {
                this.grid[i][j] = vehicle;
            }
        }
        vehicle.gridX = x;
        vehicle.gridY = y;
        this.vehicles.push(vehicle);
        return true;
    }

    // 计算位置优先级分数
    private calculatePriority(x: number, y: number): number {
        const surroundingCars = 0;
        const distanceFromCenter = Math.abs(x - this.gridWidth / 2) + Math.abs(y - this.gridHeight / 2);
        return surroundingCars * 0.5 + distanceFromCenter * 0.3 + Math.random() * 0.2;
    }

    // 紧凑排列算法
    private compactArrangement(vehicles: VehicleComponent[]): boolean {
        this.reset();
        this.shuffleArray(vehicles);

        for (const vehicle of vehicles) {
            let placed = false;
            let positions: { x: number, y: number, priority: number }[] = [];

            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    if (this.canPlace(vehicle, x, y)) {
                        positions.push({ x, y, priority: this.calculatePriority(x, y) });
                    }
                }
            }

            if (positions.length > 0) {
                positions.sort((a, b) => a.priority - b.priority);
                const bestPos = positions[0];
                if (this.place(vehicle, bestPos.x, bestPos.y)) {
                    placed = true;
                }
            }

            if (!placed) {
                return false;
            }
        }

        this.fillEmptySpaces();
        return true;
    }

    // 填充空白区域
    private fillEmptySpaces() {
        let maxX = 0, maxY = 0;
        for (const vehicle of this.vehicles) {
            maxX = Math.max(maxX, vehicle.gridX + vehicle.width);
            maxY = Math.max(maxY, vehicle.gridY + vehicle.height);
        }

        for (let y = 0; y < maxY; y++) {
            for (let x = 0; x < maxX; x++) {
                if (this.grid[y][x] === null) {
                    this.tryFillSpace(x, y);
                }
            }
        }
    }

    // 尝试填充空白位置
    private tryFillSpace(x: number, y: number) {
        if (this.grid[y][x] !== null) return;

        let maxWidth = 0, maxHeight = 0;
        for (let w = 1; w <= 3; w++) {
            if (x + w > this.gridWidth) break;
            let canExtendWidth = true;
            for (let h = 1; h <= 2; h++) {
                if (y + h > this.gridHeight) break;
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

        const availableTypes = this.VEHICLE_TYPES.filter(type =>
            type.width <= maxWidth && type.height <= maxHeight);

        if (availableTypes.length > 0) {
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const vehicle = this.createVehicle(type);
            this.place(vehicle, x, y);
        }
    }

    // 创建车辆实例
    private createVehicle(type: VehicleType): VehicleComponent {
        const node = new Node(type.type);
        const vehicle = node.addComponent(VehicleComponent);
        vehicle.type = type.type;
        vehicle.width = type.width;
        vehicle.height = type.height;
        vehicle.color = type.color;
        node.parent = this.node;
        return vehicle;
    }

    // 创建所有车辆实例
    private createVehicles(): VehicleComponent[] {
        const vehicles: VehicleComponent[] = [];
        this.VEHICLE_TYPES.forEach(type => {
            for (let i = 0; i < type.count; i++) {
                vehicles.push(this.createVehicle(type));
            }
        });
        return vehicles;
    }

    // 数组随机打乱
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 绘制网格线
    private drawGrid() {
        if (!this.graphics) return;

        this.graphics.strokeColor.fromHEX('#dddddd');
        this.graphics.lineWidth = 1;

        // 绘制水平线
        for (let i = 0; i <= this.gridHeight; i++) {
            this.graphics.moveTo(this.gridOffsetX, this.gridOffsetY + i * VehicleComponent.GRID_SIZE);
            this.graphics.lineTo(this.gridOffsetX + this.gridWidth * VehicleComponent.GRID_SIZE, this.gridOffsetY + i * VehicleComponent.GRID_SIZE);
            this.graphics.stroke();
        }

        // 绘制垂直线
        for (let i = 0; i <= this.gridWidth; i++) {
            this.graphics.moveTo(this.gridOffsetX + i * VehicleComponent.GRID_SIZE, this.gridOffsetY);
            this.graphics.lineTo(this.gridOffsetX + i * VehicleComponent.GRID_SIZE, this.gridOffsetY + this.gridHeight * VehicleComponent.GRID_SIZE);
            this.graphics.stroke();
        }
    }

    // 重新随机排列车辆
    randomizeVehicles() {
        const vehicles = this.shuffleArray(this.createVehicles());
        if (this.compactArrangement(vehicles)) {
            if (this.graphics) {
                this.graphics.clear();
                this.drawGrid();
                this.vehicles.forEach(vehicle => vehicle.draw(this.graphics!));
            }
        }
    }
}