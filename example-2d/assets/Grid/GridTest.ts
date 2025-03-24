import { _decorator, Component, instantiate, Label, log, Node, UITransform } from 'cc';
import { GRID_HEIGHT, GRID_WIDTH, generateCompactArrangedGridEntities, Entity } from './Grid';
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
        // 删除所有名称以"car"开头的子节点
        this.node.children.forEach(child => {
            if (child.name.startsWith("car")) {
                child.destroy();
            }
        });

        const cars: Entity[] = generateCompactArrangedGridEntities();
        cars.forEach(car => {
            log(`car: ${car}`);

            const node = instantiate(this.templateNode);
            node.active = true;
            node.name = `car_${car.entityTypeId}`;

            const uiTransform = node.getComponent(UITransform);
            const nodeWidth = car.width * CELL_SIZE - CELL_GAP;
            const nodeHeight = car.height * CELL_SIZE - CELL_GAP;
            uiTransform.setContentSize(nodeWidth, nodeHeight);

            const labelUITransform = node.getChildByName('Label').getComponent(UITransform);
            labelUITransform.setContentSize(nodeWidth, nodeHeight);
            const labelLabel = node.getChildByName('Label').getComponent(Label);
            // labelLabel.string = car.entityTypeId;
            labelLabel.string = String(car.placeIndex);

            node.setParent(this.node);
            this.setNodePosition(node, car)
        });
    }

    /**
     * 综合考虑car的x,y,width,height属性，设置每个car的座标，最终使得所有car组成的矩形显示在屏幕中间。
     */
    setNodePosition(node: Node, car: Entity) {
        const x = (car.x * CELL_SIZE)     // car的x属性是相对于Grid的，所以要乘以GRID_SIZE
            + (car.width * CELL_SIZE / 2) // 节点宽度的一半
            - GRID_WIDTH * CELL_SIZE / 2;     // 节点集合矩形宽度的一半（矩形显示在屏幕中间，不用管屏幕尺寸，我只管节点集合矩形在屏幕中间即可，此处不管它是否溢出屏幕）

        const y = (car.y * CELL_SIZE) + (car.height * CELL_SIZE / 2) - GRID_HEIGHT * CELL_SIZE / 2;

        node.setPosition(x, y, 0);
    }
}


