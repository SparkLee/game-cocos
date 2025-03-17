import { Node, UITransform, Vec3, Size, Label, log } from 'cc';

/**
 * AABB（Axis-Aligned Bounding Box 轴对齐包围盒） 碰撞检测工具类
 */
export class AABBUtils {
    /**
     * 判定两个节点是否相交（是否发生碰撞）
     * 
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

        log(`${node1.name} | boundingBox: ${boundingBox1} | position: ${node1.getPosition()}, ${node2.name} | boundingBox: ${boundingBox2} | position: ${node2.getPosition()}`);

        return boundingBox1.intersects(boundingBox2);
    }
}
