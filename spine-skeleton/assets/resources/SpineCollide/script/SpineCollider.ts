// 导入 Cocos Creator 框架的必要模块
import { _decorator, Component, Node, PhysicsSystem2D, Contact2DType, Collider2D, Color, Sprite, ParticleSystem2D, EPhysics2DDrawFlags } from 'cc';
const { ccclass } = _decorator;

/**
 * Spine 碰撞检测组件
 * 
 * 用于实现基于 Spine 骨骼动画的碰撞检测功能。通过结合 Spine 挂点功能，
 * 可以对骨骼动画的某个部位（如人物的脚）进行碰撞检测。
 * 
 * 功能描述：
 * - 监听 2D 物理系统的碰撞事件（碰撞开始和结束）
 * - 记录与本节点相接触的所有碰撞体及其接触次数
 * - 当碰撞发生时，改变被接触对象的精灵颜色为红色，表示接触状态
 * - 当碰撞完全结束时，恢复被接触对象的精灵颜色为白色，表示无接触状态
 * - 支持同时处理多个碰撞体与同一对象的接触情况
 * - 提供调试模式下的物理碰撞形状可视化绘制
 * 
 * 使用场景：
 * 检测人物脚部与地面的接触，实现当人物跑动时，动态改变地面颜色的效果
 * 
 * 注意：
 * 由于挂点的实现机制，基于挂点的碰撞检测会存在延迟一帧的问题
 */
@ccclass('SpineCollider')
export class SpineCollider extends Component {

    /**
     * 接触次数映射表
     * 键：碰撞中的节点对象
     * 值：该节点当前与其他碰撞体的接触数量
     * 
     * 当多个碰撞体同时接触同一节点时，接触次数会大于 1
     * 用于正确判断何时完全结束接触状态
     */
    touchingCountMap : Map < Node, number > = new Map;

    /**
     * 物理系统调试绘制标志的备份值
     * 保存组件初始化时的调试状态，以便在组件禁用时恢复原状
     * 允许在启用/禁用组件时，灵活切换调试绘制的显示状态
     */
    private debugDrawFlags : number = 0;

    /**
     * 生命周期：组件初始化时调用
     * 
     * 在游戏运行开始时执行，用于：
     * 1. 注册物理系统的碰撞开始事件监听
     * 2. 注册物理系统的碰撞结束事件监听
     * 3. 保存当前物理系统的调试绘制标志状态
     */
    start () {
        // 监听物理系统的碰撞开始事件
        // 当两个碰撞体开始接触时自动触发 onBeginContact 回调
        PhysicsSystem2D.instance.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        
        // 监听物理系统的碰撞结束事件
        // 当两个碰撞体完全分离时自动触发 onEndContact 回调
        PhysicsSystem2D.instance.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        
        // 备份当前物理系统的调试绘制标志，便于后续恢复
        this.debugDrawFlags = PhysicsSystem2D.instance.debugDrawFlags;
    }

    /**
     * 生命周期：组件被启用时调用
     * 
     * 当组件从禁用状态变为启用状态时执行，用于打开物理调试绘制
     * 这样可以在编辑器预览或调试时看到碰撞体的轮廓和形状
     */
    onEnable () {
        // 启用物理碰撞形状的调试绘制
        // 通过位运算 OR 将 EPhysics2DDrawFlags.Shape 标志加入到调试标志中
        // 保留原有的调试设置，只额外添加形状绘制
        PhysicsSystem2D.instance.debugDrawFlags = this.debugDrawFlags | EPhysics2DDrawFlags.Shape;
    }

    /**
     * 生命周期：组件被禁用时调用
     * 
     * 当组件从启用状态变为禁用状态时执行，用于关闭物理调试绘制
     * 恢复到组件启用前的调试绘制状态
     */
    onDisable () {
        // 恢复之前备份的调试绘制标志
        // 关闭物理碰撞形状的调试绘制显示
        PhysicsSystem2D.instance.debugDrawFlags = this.debugDrawFlags;
    }

    /**
     * 处理碰撞接触的开始
     * 当碰撞体与其他对象开始接触时调用此方法
     * 
     * 功能：
     * 1. 增加接触计数
     * 2. 改变碰撞体关联节点的精灵颜色为红色
     * 
     * @param c 发生碰撞的碰撞体对象
     */
    addContact (c: Collider2D) {
        // 从映射表中获取该节点当前的接触次数，默认为 0（未接触）
        let count = this.touchingCountMap.get(c.node) || 0;
        
        // 接触次数加 1，并更新到映射表中
        // 这样可以正确处理多个碰撞体同时接触同一节点的情况
        this.touchingCountMap.set(c.node, ++count);

        // 尝试从碰撞体所属的节点中获取精灵组件
        let sprite = c.getComponent(Sprite);
        
        // 如果该节点有精灵组件，将其颜色改为红色
        // 用以表示该节点正在与其他对象发生碰撞
        if (sprite) {
            sprite.color = Color.RED;
        }
    }

    /**
     * 处理碰撞接触的结束
     * 当碰撞体与其他对象分离时调用此方法
     * 支持多个碰撞体同时接触的场景，只有在所有接触都结束时才恢复状态
     * 
     * 功能：
     * 1. 减少接触计数
     * 2. 当接触次数为 0 时，从映射表删除记录
     * 3. 当完全无接触时，恢复精灵颜色为白色
     * 
     * @param c 结束碰撞的碰撞体对象
     */
    removeContact (c: Collider2D) {
        // 从映射表中获取该节点当前的接触次数，默认为 0
        let count = this.touchingCountMap.get(c.node) || 0;
        
        // 接触次数减 1
        --count;
        
        // 判断是否所有接触都已完全结束
        if (count <= 0) {
            // 如果接触次数小于等于 0，说明该节点不再与任何对象接触
            // 从映射表中删除该节点的记录
            this.touchingCountMap.delete(c.node);

            // 尝试从碰撞体所属的节点中获取精灵组件
            let sprite = c.getComponent(Sprite);
            
            // 如果该节点有精灵组件，将其颜色恢复为白色
            // 用以表示该节点已经完全脱离碰撞状态
            if (sprite) {
                sprite.color = Color.WHITE;
            }
        } else {
            // 如果仍有其他碰撞体在接触此节点
            // 更新映射表中的接触次数，保持节点为接触状态
            this.touchingCountMap.set(c.node, count);
        }
    }

    /**
     * 物理系统碰撞开始回调方法
     * 当两个碰撞体开始接触时，物理系统会自动调用此方法
     * 
     * 处理逻辑：
     * 对两个接触的碰撞体都调用 addContact，分别处理它们各自的接触状态
     * 
     * @param a 碰撞体 A
     * @param b 碰撞体 B
     */
    onBeginContact (a: Collider2D, b: Collider2D) {
        // 为碰撞体 A 处理接触开始事件
        this.addContact(a);
        
        // 为碰撞体 B 处理接触开始事件
        this.addContact(b);
    }

    /**
     * 物理系统碰撞结束回调方法
     * 当两个碰撞体结束接触时，物理系统会自动调用此方法
     * 
     * 处理逻辑：
     * 对两个分离的碰撞体都调用 removeContact，分别处理它们各自的接触结束状态
     * 
     * @param a 碰撞体 A
     * @param b 碰撞体 B
     */
    onEndContact (a: Collider2D, b: Collider2D) {
        // 为碰撞体 A 处理接触结束事件
        this.removeContact(a);
        
        // 为碰撞体 B 处理接触结束事件
        this.removeContact(b);
    }
}