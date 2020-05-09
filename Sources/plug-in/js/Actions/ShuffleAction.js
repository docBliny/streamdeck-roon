import ActionBase from "./ActionBase";
import debug from "debug";
import { ShuffleDisabled } from "../DataImages/shuffle-key-disabled";

const ACTION_NAME = "shuffle";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class ShuffleAction extends ActionBase {
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

  get shuffle() {
    return this._shuffle;
  }

  set shuffle(value) {
    if(value !== this._shuffle) {
      this._shuffle = (value === true);

      this.setState(value === true ? 1 : 0);
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyUp(data) {
    super.onKeyUp(data);

    const shuffle = (data.state === 0);
    this.transportSetting({ shuffle });
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null) {
      this.shuffle = (activeOutput.shuffle === true);
      this.setImage(undefined);
    } else {
      this.shuffle = false;
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return ShuffleDisabled;
  }
}
