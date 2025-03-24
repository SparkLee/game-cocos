import { _decorator, Component, instantiate, Label, log, Node, UITransform, Vec3 } from 'cc';
import { GRID_HEIGHT, GRID_WIDTH, gridFoo, Cell } from './backup.v2/Grid';
const { ccclass, property } = _decorator;

const CELL_SIZE = 40;  // 每个格子的像素大小
const CELL_GAP = 5;    // 格子之间的间距像素

@ccclass('Main2')
export class Main2 extends Component {
    @property(Node)
    templateNode: Node | null = null;

    start() {
        this.foo();
    }

    update(deltaTime: number) {

    }

    foo() {
        // 删除所有名称以"vehicle"开头的子节点
        this.node.children.forEach(child => {
            if (child.name.startsWith("vehicle")) {
                child.destroy();
            }
        });

        const vehicles: Cell[] = gridFoo();
        vehicles.forEach(vehicle => {
            log(`vehicle: ${vehicle}`);

            const node = instantiate(this.templateNode);
            node.active = true;
            node.name = `vehicle_${vehicle.typeId}`;

            const uiTransform = node.getComponent(UITransform);
            const nodeWidth = vehicle.width * CELL_SIZE - CELL_GAP;
            const nodeHeight = vehicle.height * CELL_SIZE - CELL_GAP;
            uiTransform.setContentSize(nodeWidth, nodeHeight);

            const labelUITransform = node.getChildByName('Label').getComponent(UITransform);
            labelUITransform.setContentSize(nodeWidth, nodeHeight);
            const labelLabel = node.getChildByName('Label').getComponent(Label);
            labelLabel.string = vehicle.typeId;

            node.setParent(this.node);
            this.setNodePosition(node, vehicle)
        });
    }

    /**
     * 综合考虑Vehicle的x,y,width,height属性，设置每个Vehicle的座标，最终使得所有Vehicle组成的矩形显示在屏幕中间。
     */
    setNodePosition(node: Node, vehicle: Cell) {
        const x = (vehicle.x * CELL_SIZE)     // Vehicle的x属性是相对于Grid的，所以要乘以GRID_SIZE
            + (vehicle.width * CELL_SIZE / 2) // 节点宽度的一半
            - GRID_WIDTH * CELL_SIZE / 2;     // 节点集合矩形宽度的一半（矩形显示在屏幕中间，不用管屏幕尺寸，我只管节点集合矩形在屏幕中间即可，此处不管它是否溢出屏幕）

        const y = (vehicle.y * CELL_SIZE) + (vehicle.height * CELL_SIZE / 2) - GRID_HEIGHT * CELL_SIZE / 2;

        node.setPosition(x, y, 0);
    }
}


