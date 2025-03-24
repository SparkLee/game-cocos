import { _decorator, Component, Node, Button, instantiate, Prefab, Color } from 'cc';
import { GridManager } from './GridManager';
import { VehicleComponent } from './VehicleComponent';
const { ccclass, property } = _decorator;

const VEHICLE_TYPES = [
  { type: '轿车', width: 2, height: 1, color: '#FF6B6B', count: 5 },
  { type: '卡车', width: 3, height: 2, color: '#4ECDC4', count: 3 },
  { type: '巴士', width: 4, height: 2, color: '#45B7D1', count: 2 }
];

@ccclass('MainController')
export class MainController extends Component {
  @property({ type: Node })
  private gridManagerNode: Node = null!;

  @property({ type: Prefab })
  private vehiclePrefab: Prefab = null!;

  @property({ type: Button })
  private rearrangeButton: Button = null!;

  private gridManager: GridManager = null!;

  onLoad() {
    this.gridManager = this.gridManagerNode.getComponent(GridManager)!;
    this.gridManager.init(15, 15);
    this.rearrangeButton.node.on(Button.EventType.CLICK, this.onRearrange, this);
  }

  private onRearrange() {
    const vehicles = this.createVehicles();
    if (this.gridManager.compactArrangement(vehicles)) {
      this.scheduleOnce(() => {
        vehicles.forEach(vehicle => vehicle.updateAppearance());
      }, 0.1);
    } else {
      console.error('无法完成车辆排列，请调整参数');
    }
  }

  private createVehicles(): VehicleComponent[] {
    const vehicles: VehicleComponent[] = [];
    VEHICLE_TYPES.forEach(type => {
      for (let i = 0; i < type.count; i++) {
        const vehicleNode = instantiate(this.vehiclePrefab);
        const vehicle = vehicleNode.getComponent(VehicleComponent)!;
        vehicle.init(type.type, type.width, type.height, new Color().fromHEX(type.color));
        vehicles.push(vehicle);
      }
    });
    return vehicles;
  }
}