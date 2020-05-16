import ActionBase from "./ActionBase";
import debug from "debug";
import { MuteDisabled } from "../DataImages/mute-key-disabled";

const ACTION_NAME = "mute-unmute";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class MuteUnmuteAction extends ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    super(config);

    log("ctor");

    this._isMuted = false;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get isMuted() {
    return this._isMuted;
  }

  set isMuted(value) {
    if(value !== this._isMuted) {
      this._isMuted = (value === true);

      this.setState(value === true ? 0 : 1);
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyUp(data) {
    super.onKeyUp(data);

    const outputId = this.getActiveRoonOutputId();

    if(this.roonTransport === null) {
      log(`"${this.actionUuid}" transport control not available`);
      this.showAlert();
      return;
    }

    if(outputId !== null) {
      const mute = (this.toggleDesiredState(data) === 0);
      this.roonTransport.mute(outputId, mute ? "mute" : "unmute", (err) => {
        if(err) {
          log(`"${this.actionUuid}" mute change error: ${err}`);
          this.showAlert();
        }
      });
    } else {
      log(`"${this.actionUuid}" mute change error: No active output`);
      this.showAlert();
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null && activeOutput.volume) {
      this.isMuted = (activeOutput.volume.isMuted === true);
      this.setImage(undefined);
    } else {
      this.setImage(this.getDisabledImageWhenRequested());
      this.isMuted = false;
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return MuteDisabled;
  }
}
