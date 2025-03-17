import { Vec3, Node, UITransform, Label, Size, log } from "cc";

export class OBBUtils {
    // 静态方法：计算投影半径
    private static getProjectionRadius(extents: number[], axes: Vec3[], axis: Vec3): number {
        return extents[0] * Math.abs(axis.dot(axes[0])) + extents[1] * Math.abs(axis.dot(axes[1]));
    }

    // 静态方法：创建轴向量
    private static createAxes(rotation: number): Vec3[] {
        return [
            new Vec3(Math.cos(rotation), Math.sin(rotation)),
            new Vec3(-Math.sin(rotation), Math.cos(rotation))
        ];
    }

    // 静态方法：检测两个 OBB 是否相交
    static detectorObb(
        pos1: Vec3, width1: number, height1: number, rotation1: number,
        pos2: Vec3, width2: number, height2: number, rotation2: number
    ): boolean {
        // 计算 extents
        const extents1 = [width1 / 2, height1 / 2];
        const extents2 = [width2 / 2, height2 / 2];

        // 计算 axes
        const axes1 = this.createAxes(rotation1);
        const axes2 = this.createAxes(rotation2);

        // 计算位置差
        const nv = pos1.subtract(pos2);

        // 检测分离轴
        for (const axis of [...axes1, ...axes2]) {
            const proj1 = this.getProjectionRadius(extents1, axes1, axis);
            const proj2 = this.getProjectionRadius(extents2, axes2, axis);
            if (proj1 + proj2 <= Math.abs(nv.dot(axis))) {
                return false; // 分离轴存在，未相交
            }
        }

        return true; // 未找到分离轴，相交
    }
    static areNodesIntersecting(node1: Node, node2: Node): boolean {
        return this.detectorObb(
            node1.getPosition().clone(), node1.getComponent(UITransform).width, node1.getComponent(UITransform).height, node1.angle * Math.PI / 180,
            node2.getPosition().clone(), node2.getComponent(UITransform).width, node2.getComponent(UITransform).height, node2.angle * Math.PI / 180,
        );
    }

    static findAllUnobstructedNodes(nodes: Node[], arrowDirections: object, sceneSize: Readonly<Size>): Node[] {
        const allUnobstructedNodes: Node[] = [];
        let currentIteration = 1;

        while (nodes.length > 0 && currentIteration < 10) {
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