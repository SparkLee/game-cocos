import { Label, Node, UITransform, Vec3, log } from "cc";
import { NodesManager } from "./NodesManager";
import { NodeScript } from "./NodeScript";

/**
 * 节点集合渲染器（将生成的节点集合渲染到屏幕上）
 */
export class NodesRenderer {
    private targetNode: Node; // 将待渲染的节点集合挂载到此节点下
    private nodesManager: NodesManager;
    private currentMovingNode: Node | null = null; // 当前正在移动的节点

    constructor(targetNode: Node, nodesManager: NodesManager) {
        this.targetNode = targetNode;
        this.nodesManager = nodesManager;
    }

    /**
     * 渲染节点集合到屏幕上
     */
    render() {
        let index = 0;
        // const nodesToRender = this.nodesManager.originalNodes; // 渲染原始节点集合
        const nodesToRender = this.nodesManager.unObstructedNodes; // 渲染修正了方向后的无障碍节点集合
        nodesToRender.forEach(node => {
            log(`setNodeUITransform: ${node.getComponent(UITransform).width} ${node.getComponent(UITransform).height}`);

            index++;
            const nodeScript = node.getComponent(NodeScript)!;

            // 重新设置节点展示文本
            (node.children[0].getComponent(Label)!).string = `${index} ${nodeScript.directionSign}`;

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
     * 
     * @returns 是否所有节点都已经移动完成
     */
    moveOneNodeOneStep(): boolean {
        const unObstructedNodes = this.nodesManager.unObstructedNodes;

        // 若没有需要移动的剩余节点并且当前没有正在移动的节点，则直接返回。
        if ((unObstructedNodes.length === 0) && this.currentMovingNode === null) {
            return true;
        }

        if (this.currentMovingNode === null) {
            if (unObstructedNodes.length === 0) {
                return true; // 没有需要移动的节点
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
        return false;
    }
}