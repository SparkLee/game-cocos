// 假设你有一个 UI 节点（例如按钮），并且绑定了这个脚本
import { _decorator, Component, Vec3, UITransform, EventTouch, log } from 'cc';

@_decorator.ccclass('ClickDetector')
export class ClickDetector extends Component {
    // 确保节点有 UITransform 组件（UI 节点默认存在）
    private uiTransform: UITransform | null = null;

    onLoad() {
        this.uiTransform = this.node.getComponent(UITransform);
        // 启用触摸事件
        this.node.on('touchstart', this.onTouch, this);
    }

    private onTouch(event: EventTouch) {
        // 1. 获取触摸点的世界坐标（假设屏幕坐标转换为世界坐标）
        const worldPoint = event.getUILocation(); // 获取 UI 空间的触摸点
        console.log(`worldPoint: ${worldPoint}`);

        // 2. 将世界坐标转换为节点的局部坐标（以锚点为原点）
        const localPoint = this.uiTransform!.convertToNodeSpaceAR(new Vec3(worldPoint.x, worldPoint.y, 0));
        console.log(`localPoint: ${localPoint}`);

        // 3. 获取节点的尺寸（contentSize）
        const contentSize = this.uiTransform!.contentSize;
        console.log(`contentSize: ${contentSize}`);

        // 4. 判断转换后的坐标是否在节点内容区域内
        const halfWidth = contentSize.width / 2;
        const halfHeight = contentSize.height / 2;
        console.log(`halfWidth: ${halfWidth}, halfHeight: ${halfHeight}`);

        if (
            localPoint.x >= -halfWidth &&
            localPoint.x <= halfWidth &&
            localPoint.y >= -halfHeight &&
            localPoint.y <= halfHeight
        ) {
            console.log('点击在节点的局部区域内！');
        } else {
            console.log('点击在节点的局部区域外。');
        }
    }
}