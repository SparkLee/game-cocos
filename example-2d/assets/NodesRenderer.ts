import { Label, Node, Sprite, SpriteFrame, UITransform, Vec3, math } from "cc";
import { NodesManager } from "./NodesManager";
import { NodeScript } from "./NodeScript";

/**
 * 节点集合渲染器（将生成的节点集合渲染到屏幕上）
 */
export class NodesRenderer {
    private targetNode: Node; // 将待渲染的节点集合挂载到此节点下
    private nodesManager: NodesManager;
    private nodeSpritFrame: SpriteFrame;
    private currentMovingNode: Node | null = null; // 当前正在移动的节点

    constructor(targetNode: Node, nodesManager: NodesManager, nodeSpritFrame: SpriteFrame) {
        this.targetNode = targetNode;
        this.nodesManager = nodesManager;
        this.nodeSpritFrame = nodeSpritFrame;
    }

    /**
     * 渲染节点集合到屏幕上
     */
    render() {
        let index = 0;
        this.nodesManager.unObstructedNodes.forEach(node => {
            index++;
            const nodeScript = node.getComponent(NodeScript)!;

            // 设置节点精灵帧/展示颜色
            const sprite = node.addComponent(Sprite);
            math.Color.fromHEX(sprite.color, nodeScript.directionColor);
            sprite.spriteFrame = this.nodeSpritFrame;

            // 设置节点展示文本
            const labelNode = node.children[0];
            const label = labelNode.getComponent(Label)!;
            label.string = `${index} ${nodeScript.directionSign}`;

            this.targetNode.addChild(node);
        });
    }

    /**
     * 清除所有已渲染节点，方便重新生成并渲染
     */
    clear() {
        this.nodesManager.unObstructedNodes.forEach(node => {
            node.destroy();
        });
    }

    /**
     * 每帧移动一个节点前进一步
     */
    moveOneNodeOneStep() {
        const unObstructedNodes = this.nodesManager.unObstructedNodes;

        // 若没有需要移动的剩余节点并且当前没有正在移动的节点，则直接返回。
        if ((unObstructedNodes.length === 0) && this.currentMovingNode === null) {
            return;
        }

        if (this.currentMovingNode === null) {
            if (unObstructedNodes.length === 0) {
                return; // 没有需要移动的节点
            }
            const node = unObstructedNodes.shift()!;
            this.currentMovingNode = node;
        }

        const currentNodeScript = this.currentMovingNode.getComponent(NodeScript)!;
        const direction: Vec3 = currentNodeScript.directionVector;
        const speed = 100;
        const speedyDirection = direction.clone().multiplyScalar(speed);

        const position = this.currentMovingNode.getPosition();
        this.currentMovingNode.setPosition(position.add(speedyDirection));
        const sceneSize = this.nodesManager.movementAreaSize;
        const currentPos = this.currentMovingNode.getPosition();
        if (
            currentPos.x < -sceneSize.width / 2 ||
            currentPos.x > sceneSize.width / 2 ||
            currentPos.y < -sceneSize.height / 2 ||
            currentPos.y > sceneSize.height / 2
        ) {
            // 将移出边界的节点根据其移动方向重新放回到屏幕的侧边，方便调试查看
            if (currentPos.x < -sceneSize.width / 2) {
                this.currentMovingNode.setPosition(new Vec3(-sceneSize.width / 2 + 20, currentPos.y, 0));
            } else if (currentPos.x > sceneSize.width / 2) {
                this.currentMovingNode.setPosition(new Vec3(sceneSize.width / 2 - 20, currentPos.y, 0));
            } else if (currentPos.y < -sceneSize.height / 2) {
                this.currentMovingNode.setPosition(new Vec3(currentPos.x, -sceneSize.height / 2 + 20, 0));
            } else if (currentPos.y > sceneSize.height / 2) {
                this.currentMovingNode.setPosition(new Vec3(currentPos.x, sceneSize.height / 2 - 20, 0));
            }

            this.currentMovingNode = null; // 移出边界后，将当前移动的节点置为null，并继续移动下一个节点
        }
    }
}