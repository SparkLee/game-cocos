import { log, Node, Size } from "cc";
import { OBBUtils } from "./OBBUtils";
import { NodeScript } from "./NodeScript";

/**
 * 节点集合管理类
 */
export class NodesManager {
    originalNodes: Node[];          // 原始节点集合
    tmpNodes: Node[];               // 临时节点集合
    unObstructedNodes: Node[] = []; // 无障碍节点集合
    movementAreaSize: Size;         // 节点移动区域大小

    constructor(nodes: Node[], movementAreaSize: Size) {
        this.originalNodes = nodes;
        this.tmpNodes = [...nodes]; // 创建副本
        this.movementAreaSize = movementAreaSize;
    }

    /**
     * 修正被障碍节点的方向
     */
    fixObstructedNodesDirection(): Node[] {
        let cnt = 0;
        let unobstructedNodes: Node[] = [];
        while (this.hasObstructedTmpNodes()) {
            cnt++;
            if (cnt > 500) { // 避免死循环（尝试多次依然有障碍节点）
                break;
            }

            unobstructedNodes = this.transferOutermostUnobstructedTmpNodes();
            log(`fixObstructedNodesDirection [${cnt}] 无障碍节点集合:`, unobstructedNodes.map(node => node.name));
            if (unobstructedNodes.length > 0) {
                continue;
            }

            if (this.hasObstructedTmpNodes()) {
                const tmpObstructedNode = this.tmpNodes[0];
                log(`fixObstructedNodesDirection [${cnt}] 反转被障碍节点方向:`, tmpObstructedNode.name);
                tmpObstructedNode.getComponent(NodeScript).reverseDirection();
            }
        }

        return this.unObstructedNodes;
    }

    private hasObstructedTmpNodes() {
        return this.tmpNodes.length > 0;
    }

    /**
     * 转移临时节点集合的最外层无障碍节点集合
     * 
     * @returns 被转移的无障碍节点集合
     */
    private transferOutermostUnobstructedTmpNodes(): Node[] {
        const unObstructedNodes: Node[] = [];
        // log(`tmpNodes: ${this.tmpNodes.map(node => node.name)}`)
        let i = 0;
        while (i < this.tmpNodes.length) {
            const node = this.tmpNodes[i];
            // log(`transferOutermostUnobstructedTmpNodes:`, node.name);
            if (this.isUnobstructedNode(node)) {
                unObstructedNodes.push(node);
                this.unObstructedNodes.push(node); // 加节点  
                this.tmpNodes.splice(i, 1);        // 减节点
            } else {
                i++; // 只有在没有删除节点时才增加索引
            }
        }
        return unObstructedNodes;
    }

    /**
    * 判定节点是否为无障碍节点
    * 
    * @param node 要判定的节点
    */
    private isUnobstructedNode(node: Node): boolean {
        const nodeScript = node.getComponent(NodeScript)!;
        const originalPos = node.getPosition();
        let currentPos = originalPos.clone();

        while (true) {
            currentPos = currentPos.add(nodeScript.directionVector);

            // 若节点移出移动区域，则判定为无障碍节点
            if (
                currentPos.x < -this.movementAreaSize.width / 2 ||
                currentPos.x > this.movementAreaSize.width / 2 ||
                currentPos.y < -this.movementAreaSize.height / 2 ||
                currentPos.y > this.movementAreaSize.height / 2
            ) {
                log(`节点${node.name}是无障碍节点 at position: ${currentPos}`);
                node.setPosition(originalPos); // 恢复原位置
                // node.updateWorldTransform(); // 强制更新节点的变换矩阵（强制刷新节点新位置）
                return true;
            }

            node.setPosition(currentPos);
            // node.updateWorldTransform(); // 强制更新节点的变换矩阵（强制刷新节点新位置）

            for (const otherNode of this.tmpNodes) {
                if (otherNode !== node && OBBUtils.areNodesIntersecting(node, otherNode)) {
                    log(`节点${node.name}被阻挡 at position: ${currentPos}, otherNode: ${otherNode.name}|${otherNode.getPosition()}`);
                    node.setPosition(originalPos); // 恢复原位置
                    // node.updateWorldTransform(); // 强制更新节点的变换矩阵（强制刷新节点新位置）
                    return false;
                }
            }
        }
    }

    /**
     * 获取原始节点集合的最外层无障碍节点集合
     */
    private findOutermostUnobstructedOriginalNodes(): Node[] {
        const unobstructedNodes: Node[] = [];
        for (const node of this.originalNodes) {
            if (this.isUnobstructedNode(node)) {
                unobstructedNodes.push(node);
            }
        }
        return unobstructedNodes;
    }
}