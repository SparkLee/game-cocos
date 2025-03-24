import { _decorator, Component, Node, Color, Graphics } from 'cc';
import { VehicleComponent } from './VehicleComponent';
const { ccclass, property } = _decorator;

@ccclass('GridManager')
export class GridManager extends Component {
    @property({ type: Number })
    public gridSize = 40;

    @property({ type: Color })
    public gridColor = new Color(180, 180, 180, 255);

    @property({ type: Node })
    public vehiclesNode: Node = null!;

    private grid: (VehicleComponent | null)[][] = [];
    private vehicles: VehicleComponent[] = [];

    public init(width: number, height: number) {
        // 初始化网格数组
        this.grid = new Array(height)
            .fill(null)
            .map(() => new Array(width).fill(null));

        // 绘制网格线
        this.drawGridLines(width, height);
    }

    private drawGridLines(width: number, height: number) {
        const graphics = this.getComponent(Graphics);
        if (!graphics) return;

        graphics.strokeColor = this.gridColor;
        graphics.lineWidth = 1;

        // 绘制垂直线
        for (let x = -width; x <= width; x++) {
            graphics.moveTo(x * this.gridSize, 0);
            graphics.lineTo(x * this.gridSize, height * this.gridSize);
        }

        // 绘制水平线
        for (let y = -height; y <= height; y++) {
            graphics.moveTo(0, y * this.gridSize);
            graphics.lineTo(width * this.gridSize, y * this.gridSize);
        }

        graphics.stroke();
    }

    public canPlace(vehicle: VehicleComponent, x: number, y: number): boolean {
        // 边界检查
        if (x < 0 || y < 0 ||
            x + vehicle.width > this.grid[0].length ||
            y + vehicle.height > this.grid.length) {
            return false;
        }

        // 碰撞检查
        for (let dy = y; dy < y + vehicle.height; dy++) {
            for (let dx = x; dx < x + vehicle.width; dx++) {
                if (this.grid[dy][dx] !== null) return false;
            }
        }
        return true;
    }

    public placeVehicle(vehicle: VehicleComponent, x: number, y: number): boolean {
        if (!this.canPlace(vehicle, x, y)) return false;

        // 更新网格数据
        for (let dy = y; dy < y + vehicle.height; dy++) {
            for (let dx = x; dx < x + vehicle.width; dx++) {
                this.grid[dy][dx] = vehicle;
            }
        }

        // 设置车辆位置并添加到场景
        vehicle.setPosition(x, y, this.gridSize);
        vehicle.node.setParent(this.vehiclesNode);
        this.vehicles.push(vehicle);
        return true;
    }

    public compactArrangement(vehicles: VehicleComponent[]): boolean {
        // 重置网格状态
        this.grid.forEach(row => row.fill(null));
        this.vehicles = [];

        // 按面积从大到小排序
        const sortedVehicles = [...vehicles].sort((a, b) =>
            (b.width * b.height) - (a.width * a.height)
        );

        // 尝试放置每个车辆
        for (const vehicle of sortedVehicles) {
            let placed = false;

            // 从左上角开始寻找合适位置
            for (let y = 0; y < this.grid.length; y++) {
                for (let x = 0; x < this.grid[0].length; x++) {
                    if (this.canPlace(vehicle, x, y)) {
                        this.placeVehicle(vehicle, x, y);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }

            if (!placed) return false;
        }
        return true;
    }
}