import { Node, UITransform, Vec3, Size, director, log, Label } from 'cc';

export class AABBUtils {
    /**
     * 判定两个节点是否相交
     * @param node1 第一个节点
     * @param node2 第二个节点
     * @returns 如果相交返回 true，否则返回 false
     */
    static areNodesIntersecting(node1: Node, node2: Node): boolean {
        const uiTransform1 = node1.getComponent(UITransform);
        const uiTransform2 = node2.getComponent(UITransform);

        if (!uiTransform1 || !uiTransform2) {
            console.error('One or both nodes do not have UITransform component');
            return false;
        }

        const boundingBox1 = uiTransform1.getBoundingBoxToWorld();
        const boundingBox2 = uiTransform2.getBoundingBoxToWorld();

        // 若节点的长宽小于100，则生成的boundingBox1的长宽为100，此处将包围盒的长宽强制设置为节点的长宽
        boundingBox1.width = node1.getComponent(UITransform).contentSize.width
        boundingBox1.height = node1.getComponent(UITransform).contentSize.height
        boundingBox2.width = node1.getComponent(UITransform).contentSize.width
        boundingBox2.height = node1.getComponent(UITransform).contentSize.height

        // log(`${node1.name} | boundingBox: ${boundingBox1} | position: ${node1.getPosition()}, ${node2.name} | boundingBox: ${boundingBox2} | position: ${node2.getPosition()}`);

        return boundingBox1.intersects(boundingBox2);
    }

    static findAllUnobstructedNodes(nodes: Node[], arrowDirections: object, sceneSize: Readonly<Size>): Node[] {
        const allUnobstructedNodes: Node[] = [];
        let currentIteration = 1;

        while (nodes.length > 0 && currentIteration < 50) {
            const unobstructedNodes = this.findUnobstructedNodes(currentIteration, nodes, arrowDirections, sceneSize);
            allUnobstructedNodes.push(...unobstructedNodes);

            // 从nodes中删除已找到的无障碍节点
            nodes = nodes.filter(node => !unobstructedNodes.includes(node));
            console.log(`第 ${currentIteration} 轮被障碍节点集合 Nodes:`, nodes.map(node => node.name));

            currentIteration++;
        }

        console.log(`全部可解除障碍节点集合 Nodes:`, allUnobstructedNodes.map(node => node.name));
        return allUnobstructedNodes;
    }

    private static findUnobstructedNodes(currentIteration: number, nodes: Node[], arrowDirections: object, sceneSize: Readonly<Size>): Node[] {
        const unobstructedNodes: Node[] = [];
        for (const node of nodes) {
            const label = node.children[0].getComponent(Label)!;
            const arrow = label.string.split(' ')[1];
            const direction = arrowDirections[arrow];

            if (this.isUnobstructedNode(node, arrow, direction, nodes, sceneSize)) {
                unobstructedNodes.push(node);
            }
        }

        // 输出无障碍节点
        console.log(`第 ${currentIteration} 轮无障碍节点集合 Nodes:`, unobstructedNodes.map(node => node.name));
        return unobstructedNodes;
    }

    /**
    * 判定节点是否为无障碍节点
    * @param node 要判定的节点
    * @param direction 前进方向
    * @param allNodes 场景中的所有节点
    * @returns 如果节点为无障碍节点返回 true，否则返回 false
    */
    private static isUnobstructedNode(node: Node, arrow: string, direction: Vec3, allNodes: Node[], sceneSize: Size): boolean {
        // log(`Checking node ${node.name} ${arrow}`);
        // log(`sceneSize: ${sceneSize}`);

        const originalPos = node.getPosition();
        let currentPos = originalPos.clone();

        while (true) {
            // log(`Checking position before add direction: ${currentPos}`);
            currentPos = currentPos.add(direction);
            // log(`Checking position after add direction: ${currentPos}`);
            if (currentPos.x < -sceneSize.width / 2 || currentPos.x > sceneSize.width / 2 || currentPos.y < -sceneSize.height / 2 || currentPos.y > sceneSize.height / 2) {
                // log(`节点${node.name}无阻挡 at position: ${currentPos}`);
                node.setPosition(originalPos); // 恢复原位置
                return true;
            }

            node.setPosition(currentPos);
            node.updateWorldTransform(); // 强制更新节点的变换矩阵

            for (const otherNode of allNodes) {
                if (otherNode !== node && this.areNodesIntersecting(node, otherNode)) {
                    // log(`节点${node.name}被挡 at position: ${currentPos}, otherNode: ${otherNode.name}|${otherNode.getPosition()}`);
                    node.setPosition(originalPos); // 恢复原位置
                    return false;
                }
            }
        }
    }
}
