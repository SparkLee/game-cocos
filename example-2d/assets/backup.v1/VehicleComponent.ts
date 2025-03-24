import { _decorator, Component, Color, Graphics, UITransform, Sprite, Label, Size, Color as ccColor, Node } from 'cc';
import { GridComponent } from './GridComponent';
const { ccclass, property } = _decorator;

@ccclass('VehicleComponent')
export class VehicleComponent extends Component {
    @property
    type: string = '';

    @property
    width: number = 1;

    @property
    height: number = 1;

    @property
    color: string = '#FF6B6B';

    // 网格中的位置
    gridX: number = 0;
    gridY: number = 0;

    // 网格大小和间距配置
    static readonly GRID_SIZE: number = 40;
    static readonly VEHICLE_GAP: number = 5;

    onLoad() {
        // 添加UITransform组件
        const transform = this.node.addComponent(UITransform);
        transform.setContentSize(new Size(
            this.width * VehicleComponent.GRID_SIZE - VehicleComponent.VEHICLE_GAP * 2,
            this.height * VehicleComponent.GRID_SIZE - VehicleComponent.VEHICLE_GAP * 2
        ));

        // 添加Graphics组件绘制边框
        const graphics = this.node.addComponent(Graphics);
        graphics.lineWidth = 2;
        graphics.strokeColor = Color.BLACK;
        graphics.rect(
            -transform.width / 2,
            -transform.height / 2,
            transform.width,
            transform.height
        );
        graphics.stroke();

        // 添加Sprite组件并设置颜色
        const sprite = this.node.addComponent(Sprite);
        const color = new Color();
        color.fromHEX(this.color);
        sprite.color = color;

        // 添加Label组件显示车辆类型
        const labelNode = new Node("Label");
        labelNode.setParent(this.node);
        const label = labelNode.addComponent(Label);
        label.string = this.type;
        label.color = Color.BLACK;
        label.fontSize = 14;

        // 设置Label节点的Transform
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(new Size(100, 20));
        labelTransform.setAnchorPoint(0.5, 0.5);
        
        // 调整节点层级
        this.node.setSiblingIndex(1000 + this.gridX * 100 + this.gridY);
    }

    // 更新车辆位置
    draw(graphics: Graphics) {
        // 获取网格组件
        const gridComponent = this.node.parent?.getComponent(GridComponent);
        if (!gridComponent) return;

        // 计算实际的网格位置，考虑网格大小和偏移量
        const x = gridComponent.gridOffsetX + this.gridX * VehicleComponent.GRID_SIZE;
        const y = gridComponent.gridOffsetY + this.gridY * VehicleComponent.GRID_SIZE;
        
        // 更新节点位置
        this.node.setPosition(
            x + (this.width * VehicleComponent.GRID_SIZE) / 2,
            y + (this.height * VehicleComponent.GRID_SIZE) / 2
        );
    }
}