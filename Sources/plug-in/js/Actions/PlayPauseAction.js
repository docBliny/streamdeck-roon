import PlayActionBase from "./PlayActionBase";
import debug from "debug";
import { PauseImage } from "../DataImages/pause-key";
import { StopImage } from "../DataImages/stop-key";

const ACTION_NAME = "play-pause";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class PlayPauseAction extends PlayActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    // Super will set Roon Outputs which will trigger some updates
    super(config);

    log("ctor");

    // Create image data objects for default images
    const defaultPauseImage = new Image();
    defaultPauseImage.onload = () => {
      this._defaultPauseImageData = {
        image: defaultPauseImage,
        width: 144,
        height: 144,
      };
    };
    defaultPauseImage.src = PauseImage;

    const defaultStopImage = new Image();
    defaultStopImage.onload = () => {
      this._defaultStopImageData = {
        image: defaultStopImage,
        width: 144,
        height: 144,
      };
    };
    defaultStopImage.src = StopImage;

    // Trigger image updates based on this Action's custom settings
    this.showCoverArt = config && config.settings && config.settings.showCoverArt;
    this.showSeekPosition = config && config.settings && config.settings.showSeekPosition;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get defaultPauseImageData() {
     return this._defaultPauseImageData;
  }

  get defaultStopImageData() {
    return this._defaultStopImageData;
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyUp(data) {
    super.onKeyUp(data);

    this.transportControl("playpause");
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getStateImageData() {
    let imageData;

    // Get default image first to work as fallback
    if(this.roonActiveOutput) {
      // Get the correct image based on play state
      switch(this.state) {
      case "playing":
      case "loading":
        // Show cover art if requested and available
        if(this.showCoverArt && this.imageData) {
          imageData = this.imageData;
        } else if(this.roonActiveOutput.isPauseAllowed) {
          imageData = this.defaultPauseImageData;
        } else {
          imageData = this.defaultStopImageData;
        }
        break;
      case "stopped":
      case "paused":
        if(this.roonActiveOutput.isPlayAllowed) {
          imageData = this.defaultPlayImageData;
        }
        break;
      }
    }

    return imageData;
  }
}
