# ECS 割草演示

用一套最小 ECS 内核做的 Vampire Survivors 式割草原型，用来讲清楚：**ECS 是什么**，以及它为什么特别适合这个品类。

工程结构对齐仓库里的 `spine-skeleton`（Cocos Creator 3.8.8，2D Canvas）。

## 快速开始

1. 用 **Cocos Creator 3.8.8** 打开目录 `ecs-survivor`。
2. 打开场景 `assets/scenes/main.scene`。
3. 点击预览。运行后 `GameApp` 会自动创建画布绘制层和 HUD。

## 操作

| 按键 | 作用 |
| --- | --- |
| WASD / 方向键 | 移动 |
| 按住鼠标左键 | 朝指针方向移动 |
| 1 / 2 / 3 / 4 | 敌人上限 2000 / 5000 / 10000 / 20000 |
| C | 切换碰撞：空间哈希 ↔ 全对全 |
| M | 静音 / 取消静音 |
| 空格 | 暂停 |
| R | 重新开始 |

角色会自动朝最近的敌人开火。击杀掉经验球，靠近即可吸取；升级会加伤害、缩短冷却，偶数级加弹道。金色描边的是精英怪——它只是多挂了一个 `Elite` 组件。

射击、命中、击杀、拾取、升级、受伤和死亡都有短音效（Web Audio 合成，无需音频文件）。浏览器要先按一次键或点一下才会出声。`M` 可静音。

## ECS 在这局里是什么

传统写法里，一只怪往往是 `Node + Sprite + Collider + EnemyScript`，五百只怪就是五百棵子树、五百次 `update()`。

这里改成三层：

- **Entity**：一个数字 ID，不继承 `Node`，也不带方法。
- **Component**：纯数据。`Position`、`Velocity`、`Enemy`、`Elite` 都只是字段。
- **System**：按查询取出「拥有某组组件的实体」，整列处理。例如移动系统只扫 `Position + Velocity`。

组件存在 **Sparse Set** 里：遍历走连续数组，删除用末尾交换。这就是数据导向——CPU 在扫同构数据，而不是在堆上跳对象。

## 割草为什么吃这套

1. **海量同类实体**  
   敌人、子弹、经验球数量大、行为高度重复。`EnemyAISystem` / `MovementSystem` / `RenderSystem` 各做一次线性扫描即可。
2. **组合优于继承**  
   普通怪、精英怪、经验球没有继承树。精英 = 普通敌人再 `add(Elite)`。`RenderSystem` 看到 `Elite` 就画金边，`CombatSystem` 看到就掉更多经验。
3. **碰撞必须批处理**  
   割草最贵的是「子弹 × 敌人」。按 `C` 可对比空间哈希和全对全，右上角 `Collision` 耗时会拉开。实体越多，差距越明显。
4. **逻辑在 ECS，画面是 Node**  
   实体仍然只是 ID + 数据，`update()` 不写在节点上。`RenderSystem` 给每个主角 / 敌人 / 子弹 / 经验球绑一棵 Cocos 节点（`Body` 上以后可挂 Spine）。网格仍用一个 `Graphics` 画。

## 建议对照实验

1. 按 `4` 拉到 20000 敌人，看实体数和系统耗时。
2. 再按 `C` 关掉空间哈希，看 `Collision` 是否明显变慢。
3. 打开 `assets/scripts/game/systems/SpawnSystem.ts`，给新怪加一个组件（而不是新子类），观察系统和渲染是否自动跟上。

## 目录

```
ecs-survivor/
├── assets/scenes/main.scene          # 启动场景（Canvas + GameApp）
└── assets/scripts/
    ├── ecs/World.ts                  # Entity / Sparse Set / System / World
    └── game/
        ├── Components.ts             # 纯数据组件
        ├── GameConfig.ts             # 运行时上下文、HUD、输入
        ├── SpatialHash.ts            # 均匀网格空间哈希
        ├── EntityView.ts             # 实体节点树（Body / Visual / Weapon）
        ├── GameApp.ts                # 启动、建视图、注册系统
        └── systems/                  # 一系统只做一件事
```

系统顺序：输入 → 移动 → 敌人 AI → 武器 → 碰撞 → 战斗 → 寿命 → 刷怪 → 磁铁 → 经验 → 渲染 → HUD。
