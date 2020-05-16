import ActionBase from "./ActionBase";
import debug from "debug";
import { LoopAllDisabled } from "../DataImages/loop-all-key-disabled";

const ACTION_NAME = "loop-all";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class LoopAllAction extends ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    super(config);

    log("ctor");

    this._loopAll = false;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get loopAll() {
    return this._loopAll;
  }

  set loopAll(value) {
    if(value !== this._loopAll) {
      this._loopAll = value;

      this.setState(value === true ? 0 : 1);
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyUp(data) {
    super.onKeyUp(data);

    const loop = (this.toggleDesiredState(data) === 0) ? "loop" : "disabled";
    this.transportSetting({ loop });
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null) {
      this.loopAll = (activeOutput.loop === "loop");
      this.setImage(undefined);
    } else {
      this.loopAll = false;
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return LoopAllDisabled;
  }
}
