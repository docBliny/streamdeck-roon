import ActionBase from "./ActionBase";
import debug from "debug";
import { LoopOneDisabled } from "../DataImages/loop-one-key-disabled";

const ACTION_NAME = "loop-one";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class LoopOneAction extends ActionBase {
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

  get loopOne() {
    return this._loopOne;
  }

  set loopOne(value) {
    if(value !== this._loopOne) {
      this._loopOne = value;

      this.setState(value === true ? 0 : 1);
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyUp(data) {
    super.onKeyUp(data);

    const loop = (this.toggleDesiredState(data) === 0) ? "loop_one" : "disabled";
    this.transportSetting({ loop });
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null) {
      this.loopOne = (activeOutput.loop === "loop_one");
      this.setImage(undefined);
    } else {
      this.loopOne = false;
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return LoopOneDisabled;
  }
}
