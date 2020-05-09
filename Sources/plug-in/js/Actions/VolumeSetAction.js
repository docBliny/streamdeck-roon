import ActionBase from "./ActionBase";
import debug from "debug";
import { VolumeSetDisabled } from "../DataImages/volume-set-key-disabled";

const ACTION_NAME = "volume-set";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class VolumeSetAction extends ActionBase {
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
  onKeyUp(data) {
    super.onKeyUp(data);

    const activeOutput = this.roonActiveOutput;

    if(activeOutput !== null && activeOutput.outputId !== null && this.settings && this.settings.volume !== undefined) {
      this.roonTransport.change_volume(activeOutput.outputId, "absolute", this.settings.volume, (err) => {
        if(err) {
          log(`"${this.actionUuid}" volume set error: ${err}`);
          this.showAlert();
        } else {
          this.showOk();
        }
      });
    } else {
      log(`"${this.actionUuid}" volume set error: No output or volume value`);
      this.showAlert();
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null && activeOutput.volume) {
      this.setImage(undefined);
    } else {
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return VolumeSetDisabled;
  }
}
