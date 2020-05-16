import ActionBase from "./ActionBase";
import debug from "debug";
import { RoonRadioDisabled } from "../DataImages/roon-radio-key-disabled";

const ACTION_NAME = "roon-radio";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class RoonRadioAction extends ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    super(config);

    log("ctor");

    this._autoRadio = false;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get autoRadio() {
    return this._autoRadio;
  }

  set autoRadio(value) {
    if(value !== this._autoRadio) {
      this._autoRadio = (value === true);

      this.setState(value === true ? 0 : 1);
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyUp(data) {
    super.onKeyUp(data);

    const auto_radio = (this.toggleDesiredState(data) === 0);
    this.transportSetting({ auto_radio });
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null) {
      this.autoRadio = activeOutput.autoRadio;
      this.setImage(undefined);
    } else {
      this.autoRadio = false;
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return RoonRadioDisabled;
  }
}
