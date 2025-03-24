import { _decorator, Component, Node, Graphics, Button } from 'cc';
import { GridComponent } from './GridComponent';
const { ccclass, property } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {
    @property(Graphics)
    graphics: Graphics | null = null;

    @property(Button)
    randomizeButton: Button | null = null;

    @property(GridComponent)
    gridComponent: GridComponent | null = null;

    start() {
        // 初始化按钮点击事件
        if (this.randomizeButton) {
            this.randomizeButton.node.on(Button.EventType.CLICK, this.onRandomizeClick, this);
        }

        // 初始化网格组件
        if (this.gridComponent && this.graphics) {
            this.gridComponent.graphics = this.graphics;
        }
    }

    onRandomizeClick() {
        if (this.gridComponent) {
            this.gridComponent.randomizeVehicles();
        }
    }
}