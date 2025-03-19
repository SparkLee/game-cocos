import { Label, log, randomRangeInt, Size, UITransform, Vec3, Node, math } from "cc";
import { NodesManager } from "./NodesManager";
import { NodeScript } from "./NodeScript";
import { OBBUtils } from "./OBBUtils";

/**
 * 生成节点集合的工厂类
 */
export class NodesFactory {
    /**
     * 生成节点集合
     */
    static generate(movementAreaSize: Size, rows: number, cols: number): NodesManager {
        const nodes: Node[] = [];
        const baseNodeSize = new Size(60, 60);
        const spacing = 30;

        const startX = -((cols - 1) * (baseNodeSize.width + spacing)) / 2;
        const startY = ((rows - 1) * (baseNodeSize.height + spacing)) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let node: Node;
                let nodeScript: NodeScript;
                let uiTransform: UITransform;
                let position: Vec3;
                let isIntersecting: boolean;

                let cnt = 0;
                do {
                    cnt++;
                    if (cnt > 1000) { // 避免死循环（尝试多次依然被其他节点障碍）
                        break;
                    }

                    node = new Node(`Node${i * cols + j + 1}`);
                    nodeScript = node.addComponent(NodeScript);
                    // nodeScript.direction = nodeScript.randomPrimaryDirection; // 随机生成节点方向
                    nodeScript.direction = nodeScript.randomSecondaryDirection; // 随机生成节点方向

                    uiTransform = node.addComponent(UITransform);
                    const randomWidth = baseNodeSize.width;// + randomRangeInt(-10, 10);
                    const randomHeight = baseNodeSize.height;// + randomRangeInt(-10, 10);
                    uiTransform.setContentSize(new Size(randomWidth, randomHeight));

                    const labelNode = new Node(`Label${i * cols + j + 1}`);
                    const label = labelNode.addComponent(Label);
                    label.fontSize = 20;

                    // 根据箭头方向旋转节点
                    const direction = nodeScript.directionVector;
                    const angle = Math.atan2(direction.y, direction.x) * math.toDegree(1);
                    node.setRotationFromEuler(0, 0, angle);
                    labelNode.setRotationFromEuler(0, 0, -angle); // label展示文字要保持箭头方向不变，所以要逆向旋转

                    node.addChild(labelNode);

                    const randomOffsetX = randomRangeInt(-5, 5);
                    const randomOffsetY = randomRangeInt(-5, 5);
                    position = new Vec3(
                        startX + j * (baseNodeSize.width + spacing) + randomOffsetX,
                        startY - i * (baseNodeSize.height + spacing) + randomOffsetY,
                        0
                    );

                    node.setPosition(position);
                    isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                } while (isIntersecting);

                nodes.push(node);
            }
        }

        // // 上边对齐：生成所有节点后，再将首行所有节靠顶边对齐
        // const topNodes = nodes.filter((node, index) => index < cols);
        // topNodes.forEach((node) => {
        //     const uiTransform = node.getComponent(UITransform)!;
        //     const position = node.getPosition();
        //     const offsetY = startY - (position.y + uiTransform.height / 2);
        //     node.setPosition(position.add(new Vec3(0, offsetY + 40, 0)));
        // });
        // // 下边对齐：生成所有节点后，再将末行所有节靠底边对齐
        // const bottomNodes = nodes.filter((node, index) => index >= (rows - 1) * cols);
        // bottomNodes.forEach((node) => {
        //     const uiTransform = node.getComponent(UITransform)!;
        //     const position = node.getPosition();
        //     const offsetY = startY - (position.y - uiTransform.height / 2) - (rows - 1) * (baseNodeSize.height + spacing);
        //     node.setPosition(position.add(new Vec3(0, offsetY - 30, 0)));
        // });
        // // 左边对齐：生成所有节点后，再将最左侧所有节点的左侧边对齐
        // const leftNodes = nodes.filter((node, index) => index % cols === 0);
        // leftNodes.forEach((node) => {
        //     const uiTransform = node.getComponent(UITransform)!;
        //     const position = node.getPosition();
        //     const offsetX = startX - (position.x - uiTransform.width / 2);
        //     node.setPosition(position.add(new Vec3(offsetX - 40, 0, 0)));
        // });
        // // 右边对齐：生成所有节点后，再将最右侧所有节点的右侧边对齐
        // const rightNodes = nodes.filter((node, index) => index % cols === cols - 1);
        // rightNodes.forEach((node) => {
        //     const uiTransform = node.getComponent(UITransform)!;
        //     const position = node.getPosition();
        //     const offsetX = startX + cols * (baseNodeSize.width + spacing) - (position.x + uiTransform.width / 2);
        //     node.setPosition(position.add(new Vec3(offsetX - 25, 0, 0)));
        // });

        const nodesManager = new NodesManager(nodes, movementAreaSize);

        const allUnobstructedNodes = nodesManager.fixObstructedNodesDirection();
        log(`nodes Nodes:`, nodes.map(node => node.name));
        log(`全部无障碍节点集合 Nodes:`, allUnobstructedNodes.map(node => node.name));

        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));

        return nodesManager;
    }
}