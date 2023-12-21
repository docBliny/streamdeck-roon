import ActionBase from "./ActionBase";
import debug from "debug";
import { MuteOffEncoder } from "../DataImages/mute-off-encoder";
import { MuteOnEncoder } from "../DataImages/mute-on-encoder";

const ACTION_NAME = "volume-encoder";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class VolumeEncoderAction extends ActionBase {
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
  onDialUp(data) {
    super.onDialUp(data);

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
      this.toggleMuteAll(data);
    } else {
      this.toggleMute(data);
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if (activeOutput !== null && activeOutput.volume) {
      this.isMuted = activeOutput.volume.isMuted === true;
      this.setImage(activeOutput.volume.isMuted === true ? MuteOnEncoder : MuteOffEncoder);
    } else {
      this.isMuted = false;
      this.setImage(MuteOffEncoder);
    }

    if(activeOutput) {
      const payload = {
        title: activeOutput.displayName,
      };

      if(activeOutput.volume) {
        this.setFeedbackLayout("plug-in/layouts/VolumeLayout.json");

        // Convert the volume value to a string with the correct units
        payload.value = this.formatVolume(activeOutput.volume);

        // Convert the volume value to a number between 0-100 for the indicator
        const range = activeOutput.volume.max - activeOutput.volume.min;
        const value = activeOutput.volume.value - activeOutput.volume.min;
        const percent = (value / range) * 100;

        payload.indicator = {
          value: parseInt(percent, 10),
          enabled: true,
        };
        payload.range = {
          min: activeOutput.volume.min,
          max: activeOutput.volume.max,
        };
        payload.icon = this.isMuted
          ? "plug-in/images/mute-on-encoder"
          : "plug-in/images/mute-off-encoder";
      } else {
        this.setFeedbackLayout("$A1");
        payload.value = "N/A";
        payload.icon = "plug-in/images/volume-disabled-key";
      }

      this.setFeedback(payload);
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
      const mute = !this.isMuted;
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
      } else {
        this.isAllMuted = mute;
      }
    });
  }

  formatVolume(volume) {
    const type = volume.type === "db" ? " dB" : "";

    return `${volume.value}${type}`;
  }
}
