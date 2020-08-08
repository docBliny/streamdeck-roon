import ActionBase from "./ActionBase";
import debug from "debug";
import { VolumeSetDisabled } from "../DataImages/volume-set-key-disabled";
import { VolumeSetImage } from "../DataImages/volume-set-key";

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

    // Create image data objects for default images
    const defaultVolumeImage = new Image();
    defaultVolumeImage.onload = () => {
      this._defaultVolumeImageData = {
        image: defaultVolumeImage,
        width: 144,
        height: 144,
      };

      // Trigger image updates based on this Action's custom settings once base image is ready
      this.showCoverArt = config && config.settings && config.settings.showCoverArt;
      this.showCurrentVolume = config && config.settings && config.settings.showCurrentVolume;
    };
    defaultVolumeImage.src = VolumeSetImage;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get defaultVolumeImageData() {
    return this._defaultVolumeImageData;
  }

  get showCurrentVolume() {
    return this._showCurrentVolume;
  }

  set showCurrentVolume(value) {
    if(value !== this._showCurrentVolume) {
      this._showCurrentVolume = (value === true);
      this.renderImage();
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onSettingsUpdated(settings) {
    super.onSettingsUpdated(settings);

    if(settings) {
      this.showCurrentVolume = settings.showCurrentVolume;
    }
  }

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

    this.renderImage();
  }

  // ********************************************
  // * Private methods
  // ********************************************
  formatVolume(volume) {
    const type = volume.type === "db" ? " dB" : "";
    // return "0";
    return `${volume.value}${type}`;
  }

  renderImage() {
    if(this.showCurrentVolume === true && this.roonActiveOutput !== null && this.roonActiveOutput.volume) {
      const { image, width, height } = this.defaultVolumeImageData;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const canvasContext = canvas.getContext("2d");
      const volumeText = this.formatVolume(this.roonActiveOutput.volume);

      // Render icon
      canvasContext.drawImage(image, 0, 0);

      let font;
      let left;
      if(volumeText.length <= 3) {
        left = 70;
        font = "36px Arial";
      } else if(volumeText.length <= 6) {
        left = 62;
        font = "26px Arial";
      } else {
        left = 62;
        font = "20px Arial";
      }

      canvasContext.font = font;
      canvasContext.textAlign = "left";
      canvasContext.textBaseline = "middle";
      canvasContext.shadowColor = "#000000";
      canvasContext.shadowBlur = 1;
      canvasContext.lineWidth = 3;
      canvasContext.strokeStyle = "#000000";
      canvasContext.strokeText(volumeText, left, height / 2 + 2);
      canvasContext.fillStyle = "#ffffff";
      canvasContext.fillText(volumeText, left, height / 2 + 2);

      // Set the image on the button
      const dataUri = canvas.toDataURL("image/png");
      this.setImage(dataUri);
    } else {
      if(this.roonActiveOutput !== null && this.roonActiveOutput.volume) {
        this.setImage(undefined);
      } else {
        this.setImage(this.getDisabledImageWhenRequested());
      }
    }
  }

  getDisabledImage() {
    return VolumeSetDisabled;
  }
}
