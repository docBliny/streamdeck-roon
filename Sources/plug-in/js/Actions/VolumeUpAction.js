import RepeatingActionBase from "./RepeatingActionBase";
import debug from "debug";
import { VolumeUpDisabled } from "../DataImages/volume-up-key-disabled";

const ACTION_NAME = "volume-up";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class VolumeUpAction extends RepeatingActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    super(config);

    log("ctor");
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onTriggerAction(data, triggerCount) {
    super.onTriggerAction(data);

    const activeOutput = this.roonActiveOutput;

    if(activeOutput !== null && activeOutput.outputId !== null) {
      let step = (activeOutput.volume && activeOutput.volume.step !== undefined) ? activeOutput.volume.step : 1;

      step = step * (triggerCount + 1);

      this.roonTransport.change_volume(activeOutput.outputId, "relative_step", step, (err) => {
        if(err) {
          log(`"${this.actionUuid}" volume down change error: ${err}`);
          this.showAlert();
        }
      });
    } else {
      log(`"${this.actionUuid}" volume up change error: No active output`);
      this.showAlert();
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null && activeOutput.volume && activeOutput.volume.value < activeOutput.volume.max) {
      this.setImage(undefined);
    } else {
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return VolumeUpDisabled;
  }
}
