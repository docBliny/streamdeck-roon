import ActionBase from "./ActionBase";
import debug from "debug";

const ACTION_NAME = "volume-encoder";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class VolumeSetAction extends ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    super(config);

    log("ctor");

    this._isAllMuted = false;
    this._isMuted = false;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get isAllMuted() {
    return this._isAllMuted;
  }

  set isAllMuted(value) {
    if (value !== this._isAllMuted) {
      this._isAllMuted = value === true;
    }
  }

  get isMuted() {
    return this._isMuted;
  }

  set isMuted(value) {
    if (value !== this._isMuted) {
      this._isMuted = value === true;
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onDialPress(data) {
    super.onDialPress(data);

    this.toggleMute(data);
  }

  onDialRotate(data) {
    super.onDialRotate(data);

    if(data.hasOwnProperty("ticks")) {
      this.setVolume(data.ticks);
    }
  }

  onTouchTap(data) {
    super.onTouchTap(data);

    if (data.hold === true) {
      this.toggleMute(data);
    } else {
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if (activeOutput !== null && activeOutput.volume) {
      this.isMuted = activeOutput.volume.isMuted === true;
      // this.setImage(undefined);
    } else {
      // this.setImage(this.getDisabledImageWhenRequested());
      this.isMuted = false;
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  setVolume(ticks) {
    const activeOutput = this.roonActiveOutput;

    if (activeOutput !== null && activeOutput.outputId !== null) {
      let step =
        activeOutput.volume && activeOutput.volume.step !== undefined
          ? activeOutput.volume.step
          : 1;

      step = step * ticks;

      this.roonTransport.change_volume(
        activeOutput.outputId,
        "relative_step",
        step,
        (err) => {
          if (err) {
            log(`"${this.actionUuid}" volume change error: ${err}`);
            this.showAlert();
          }
        }
      );
    } else {
      log(`"${this.actionUuid}" volume change error: No active output`);
      this.showAlert();
    }
  }

  toggleMute(data) {
    const outputId = this.getActiveRoonOutputId();

    if (this.roonTransport === null) {
      log(`"${this.actionUuid}" transport control not available`);
      this.showAlert();
      return;
    }

    if (outputId !== null) {
      const mute = this.toggleDesiredState(data) === 0;
      this.roonTransport.mute(outputId, mute ? "mute" : "unmute", (err) => {
        if (err) {
          log(`"${this.actionUuid}" mute change error: ${err}`);
          this.showAlert();
        }
      });
    } else {
      log(`"${this.actionUuid}" mute change error: No active output`);
      this.showAlert();
    }
  }

  toggleMuteAll(data) {
    if (this.roonTransport === null) {
      log(`"${this.actionUuid}" transport control not available`);
      this.showAlert();
      return;
    }

    const mute = !this.isAllMuted;
    this.roonTransport.mute_all(mute ? "mute" : "unmute", (err) => {
      if (err) {
        log(`"${this.actionUuid}" mute all change error: ${err}`);
        this.showAlert();
      }
    });
  }

  formatVolume(volume) {
    const type = volume.type === "db" ? " dB" : "";

    return `${volume.value}${type}`;
  }
}
