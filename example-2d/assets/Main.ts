import { _decorator, Component, log, Node, UITransform, Sprite, EventKeyboard, macro, systemEvent, SystemEvent, input, Input, KeyCode } from 'cc';
import { NodesManager } from './NodesManager';
import { NodesRenderer } from './NodesRenderer';
import { NodesFactory } from './NodesFactory';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    @property(Node)
    public node1: Node | null = null;
    @property(Node)
    public node2: Node | null = null;

    private autoMoveOnUpdate: boolean = false; // 是否在update中自动移动节点
    private nodesRenderer: NodesRenderer = null;

    start() {
        this.generateNewLevelNodes();
    }

    update(deltaTime: number) {
        if (this.autoMoveOnUpdate) {
            if (this.nodesRenderer.moveOneNodeOneStep()) {
                log('所有节点都已经移动完成');
                this.switchAutoMoveOnUpdate();
            }
        }
    }

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    /**
     * 快捷键（难得老是点鼠标）
     * 1、按键盘字母 N 可以快捷生成新关卡
     * 2、按键盘字母 R 可以快捷“跑一把”
     */
    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.KEY_N) {
            this.generateNewLevelNodes();
            return
        }
        if (event.keyCode === KeyCode.KEY_R) {
            this.switchAutoMoveOnUpdate();
            return
        }
    }

    /**
     * 生成新关卡节点集合
     */
    generateNewLevelNodes() {
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

    switchAutoMoveOnUpdate() {
        this.autoMoveOnUpdate = !this.autoMoveOnUpdate;
        log(`autoMoveOnUpdate: ${this.autoMoveOnUpdate}`);
    }
}
