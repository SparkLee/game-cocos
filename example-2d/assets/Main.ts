import { _decorator, Component, log, Node, Vec3, UITransform, Size, randomRangeInt, Sprite, math, Label, SpriteFrame, resources } from 'cc';
import { OBBUtils } from './OBBUtils';
import { NodeScript } from './NodeScript';
import { NodesManager } from './NodesManager';
import { NodesRenderer } from './NodesRenderer';
import { NodesFactory } from './NodesFactory';
const { ccclass, property } = _decorator;

// 造成死障的原因：
// 1. 同一行或同一列的两个节点方向相反，相向而行，互不想让，堵死了。
// 2. 有四个节点，方向上首尾相连，形成一个环，互相堵死了。

// 生成节点集合需要考虑的几点要求：
// 1. 生成的节点不能相交。
// 2. 生成的节点不能超出屏幕范围。
// 3. 生成的节点集合最终要组成一个矩形区域，靠近边界的节点要对齐边界。
// 4. 生成的节点集合要尽量均匀分布。
// 5. 要随机生成一些跨两列或1列半，和一些跨两行或1行半的节点，但是依然要确保所有节点不相交。
// 6. 每个节点均有一个箭头方向，节点只能朝箭头方向移动，若节点箭头方向前面有其他节点，则不能移动；要确保所有节点最终都能移出屏幕范围。
// 6.1. 在X轴上，要确保向左移动的节点其左边不能有向右移动的节点
// 6.2. 在X轴上，要确保向右移动的节点其右边不能有向左移动的节点
// 6.3. 在Y轴上，要确保向上移动的节点其上边不能有向下移动的节点
// 6.4. 在Y轴上，要确保向下移动的节点其下边不能有向上移动的节点
// 7. 节点移动时，要保持节点的旋转角度不变，即节点的箭头方向不变。

@ccclass('Main')
export class Main extends Component {
    @property(Node)
    public node1: Node | null = null;
    @property(Node)
    public node2: Node | null = null;

    public myOBBV2Nodes: Node[] = [];

    public myOBBV2NodesWithRotation: Node[] = [];
    public myOBBV2ArrowDirectionsWithRotation: object = {};
    public myOBBV2AllUnobstructedNodesWithRotation: Node[] = [];

    private nodesRenderer: NodesRenderer = null;
    private autoMoveOnUpdate: boolean = false; // 是否在update中自动移动节点

    start() {
        this.showIt();
    }

    update(deltaTime: number) {
        if (this.autoMoveOnUpdate) {
            this.nodesRenderer.moveOneNodeOneStep();
        }
    }

    showIt() {
        if (this.nodesRenderer) {
            this.nodesRenderer.clear();
        }

        const nodeSpritFrame = this.node1!.getComponent(Sprite)!.spriteFrame;
        const movementAreaSize = this.node.getComponent(UITransform)!.contentSize;

        const nodesManager: NodesManager = NodesFactory.generate(movementAreaSize, 5, 5);
        const nodesRenderer: NodesRenderer = new NodesRenderer(this.node, nodesManager, nodeSpritFrame);
        nodesRenderer.render();

        this.nodesRenderer = nodesRenderer;
    }

    /**
     * 点击一下，所有节点都向前移动一步
     */
    onClickMove() {
        this.myOBBV2Nodes.forEach(node => {
            const nodeScript = node.getComponent(NodeScript)!;
            const currentPosition = node.getPosition();
            node.setPosition(currentPosition.add(nodeScript.directionVector));
        });
    }

    switchAutoMoveOnUpdate() {
        this.autoMoveOnUpdate = !this.autoMoveOnUpdate;
        log(`autoMoveOnUpdate: ${this.autoMoveOnUpdate}`);
    }
}
