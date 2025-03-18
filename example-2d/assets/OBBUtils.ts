import { Vec3, Node, UITransform } from "cc";

export class OBBUtils {
    static areNodesIntersecting(node1: Node, node2: Node): boolean {
        return this.detectorObb(
            node1.getPosition().clone(), node1.getComponent(UITransform).width, node1.getComponent(UITransform).height, node1.angle * Math.PI / 180,
            node2.getPosition().clone(), node2.getComponent(UITransform).width, node2.getComponent(UITransform).height, node2.angle * Math.PI / 180,
        );
    }

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
    private static detectorObb(
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
}