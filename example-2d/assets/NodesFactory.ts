import { Label, log, Size, UITransform, Vec3, Node, instantiate, Sprite, math } from "cc";
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
    generate(templateNode: Node, movementAreaSize: Size, rows: number, cols: number): NodesManager {
        const nodes: Node[] = [];

        // 节点间距（1、旋转角度时一定要增加此值，2、若出现死障节点，可尝试增大此值），经测试：
        // 1、不旋转时，spacing最小可以为0，节点大小可以任意，长宽比任意。
        // 2、旋转45度，节点大小33*33时，spacing最小要为14，否则就会出现死障节点。
        // 3、旋转45度，节点大小60*60时，spacing最小要为25，否则就会出现死障节点。
        const spacing = 25;
        const baseNodeSize = new Size(60, 60);     // 节点大小尺寸
        const counterClockwiseRotationDegree = 45; // 节点逆时针旋转角度

        const startX = -((cols - 1) * (baseNodeSize.width + spacing)) / 2;
        const startY = ((rows - 1) * (baseNodeSize.height + spacing)) / 2;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let isIntersecting: boolean;
                let node: Node = instantiate(templateNode);
                node.active = true;

                // let cnt = 0;
                // do {
                //     cnt++;
                //     if (cnt > 1000) { // 避免死循环
                //         break;
                //     }

                const no = i * cols + j + 1;
                node.name = `Node${no}`;

                // 设置节点脚本+精灵帧
                this.setNodeScriptAndSprite(node, counterClockwiseRotationDegree);

                // 设置节点尺寸+文本
                this.setNodeUITransformAndLabelNode(node, baseNodeSize);

                // 设置节点位置
                this.setNodePosition(node, baseNodeSize, counterClockwiseRotationDegree, spacing, startX, startY, i, j);

                //     isIntersecting = nodes.some(existingNode => OBBUtils.areNodesIntersecting(node, existingNode));
                // } while (isIntersecting);

                nodes.push(node);
            }
        }

        // 边缘节点对齐摆放
        // this.alignEdgeNodes(nodes, baseNodeSize, cols, rows, spacing, startX, startY);

        const nodesManager = new NodesManager(nodes, movementAreaSize);

        const allUnobstructedNodes = nodesManager.fixObstructedNodesDirection();
        log(`nodes Nodes:`, nodes.map(node => node.name));
        log(`全部无障碍节点集合 Nodes:`, allUnobstructedNodes.map(node => node.name));

        const allObscuredNodes = nodes.filter(node => !allUnobstructedNodes.includes(node));
        log(`全部死障节点集合 Nodes:`, allObscuredNodes.map(node => node.name));

        return nodesManager;
    }

    private setNodeScriptAndSprite(node: Node, counterClockwiseRotationDegree: number) {
        const nodeScript = node.addComponent(NodeScript);
        nodeScript.direction = nodeScript.randomDirection;                          // 随机生成节点方向
        nodeScript.counterClockwiseRotationDegree = counterClockwiseRotationDegree; // 逆时针旋转角度

        const nodeSprite = node.getComponent(Sprite);
        math.Color.fromHEX(nodeSprite.color, nodeScript.directionColor);
    }

    private setNodeUITransformAndLabelNode(node: Node, baseNodeSize: Size) {
        const randomWidth = baseNodeSize.width; // + randomRangeInt(-10, 10);
        const randomHeight = baseNodeSize.height; // + randomRangeInt(-10, 10);
        (node.getComponent(UITransform)).setContentSize(new Size(randomWidth, randomHeight));

        const label = node.children[0].getComponent(Label);
        label.fontSize = 20;
        label.getComponent(UITransform).setContentSize(new Size(randomWidth, randomHeight));
    }

    private setNodePosition(node: Node, baseNodeSize: Size, counterClockwiseRotationDegree: number, spacing: number, startX: number, startY: number, i: number, j: number) {
        // 当节点不旋转且间距为0时，可以紧凑排列保证不相交；但节点旋转后，若不适当增加间距，则会有重叠，故此处自动增加一定间距保证不会因节点旋转而相交。
        // const radian = math.toRadian(counterClockwiseRotationDegree);
        // const adjustedWidth = baseNodeSize.width * Math.cos(radian) + baseNodeSize.height * Math.sin(radian);
        // const adjustedHeight = baseNodeSize.height * Math.cos(radian) + baseNodeSize.width * Math.sin(radian);

        const randomOffsetX = 0; //randomRangeInt(-5, 5);
        const randomOffsetY = 0; //randomRangeInt(-5, 5);

        const position = new Vec3(
            startX + j * (baseNodeSize.width + spacing) + randomOffsetX,
            startY - i * (baseNodeSize.height + spacing) + randomOffsetY,
            0
        );
        node.setPosition(position);
    }

    private alignEdgeNodes(nodes: Node[], baseNodeSize: Size, cols: number, rows: number, spacing: number, startX: number, startY: number) {
        // 上边对齐：生成所有节点后，再将首行所有节靠顶边对齐
        const topNodes = nodes.filter((node, index) => index < cols);
        topNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetY = startY - (position.y + uiTransform.height / 2);
            node.setPosition(position.add(new Vec3(0, offsetY + 40, 0)));
        });
        // 下边对齐：生成所有节点后，再将末行所有节靠底边对齐
        const bottomNodes = nodes.filter((node, index) => index >= (rows - 1) * cols);
        bottomNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetY = startY - (position.y - uiTransform.height / 2) - (rows - 1) * (baseNodeSize.height + spacing);
            node.setPosition(position.add(new Vec3(0, offsetY - 30, 0)));
        });
        // 左边对齐：生成所有节点后，再将最左侧所有节点的左侧边对齐
        const leftNodes = nodes.filter((node, index) => index % cols === 0);
        leftNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetX = startX - (position.x - uiTransform.width / 2);
            node.setPosition(position.add(new Vec3(offsetX - 40, 0, 0)));
        });
        // 右边对齐：生成所有节点后，再将最右侧所有节点的右侧边对齐
        const rightNodes = nodes.filter((node, index) => index % cols === cols - 1);
        rightNodes.forEach((node) => {
            const uiTransform = node.getComponent(UITransform)!;
            const position = node.getPosition();
            const offsetX = startX + cols * (baseNodeSize.width + spacing) - (position.x + uiTransform.width / 2);
            node.setPosition(position.add(new Vec3(offsetX - 25, 0, 0)));
        });
    }
}