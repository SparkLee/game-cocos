import { _decorator, Component, log, Node } from 'cc';
import { AABBUtils } from './AABB/AABBUtils';
import { OBBUtils } from './OBB/OBBUtils';
import { OBBUtilsV2 } from './OBB/OBBUtilsV2';
const { ccclass, property } = _decorator;

@ccclass('CollisionDetectionScript')
export class CollisionDetectionScript extends Component {
    @property(Node)
    node1: Node = null;
    @property(Node)
    node2: Node = null;

    start() {

    }

    update(deltaTime: number) {
        this.testNodesAABBIntersecting();
        this.testNodesOBBIntersecting();
        this.testNodesOBBV2Intersecting();
    }

    testNodesAABBIntersecting() {
        const areNodesIntersecting = AABBUtils.areNodesIntersecting(this.node1!, this.node2!)
        log(`Are nodes aabb intersecting? ${areNodesIntersecting}`);
    }

    testNodesOBBIntersecting() {
        const areNodesIntersecting = OBBUtils.areNodesIntersecting(this.node1!, this.node2!)
        log(`Are nodes obb intersecting? ${areNodesIntersecting}`);
    }

    testNodesOBBV2Intersecting() {
        const areNodesIntersecting = OBBUtilsV2.areNodesIntersecting(this.node1!, this.node2!)
        log(`Are nodes obb.v2 intersecting? ${areNodesIntersecting}`);
    }
}


