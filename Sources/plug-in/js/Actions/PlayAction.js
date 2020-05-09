import PlayActionBase from "./PlayActionBase";
import debug from "debug";

const ACTION_NAME = "play";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class PlayAction extends PlayActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    // Super will set Roon Outputs which will trigger some updates
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

    this.transportControl("play");
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
        } else {
          this.setImage(this.getDisabledImageWhenRequested());
        }
        break;
      default:
        if(this.roonActiveOutput.isPlayAllowed) {
          imageData = this.defaultPlayImageData;
        }
        break;
      }
    }

    return imageData;
  }
}
