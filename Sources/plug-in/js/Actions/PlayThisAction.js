import PlayItemActionBase from "./PlayItemActionBase";
import debug from "debug";
import { PlayThisDisabled } from "../DataImages/play-this-key-disabled";

const ACTION_NAME = "play-this";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class PlayThisAction extends PlayItemActionBase {
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

  get itemType() {
    return this._itemType;
  }

  set itemType(value) {
    super.itemType = value;
    this.setItemTitle();
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    this.setItemTitle();
  }

  // ********************************************
  // * Private methods
  // ********************************************
  setItemTitle() {
    this.itemTitle = "";

    if(this.roonActiveOutput !== null) {
      switch(this.itemType){
      case "albums":
        if(this.roonActiveOutput.albumName && this.roonActiveOutput.albumName.length > 0) {
          this.itemTitle = this.roonActiveOutput.albumName;
        }
        break;
      case "artists":
        if(this.roonActiveOutput.artistName && this.roonActiveOutput.artistName.length > 0) {
          this.itemTitle = this.roonActiveOutput.artistName;
        }
        break;
      }
    }

    if(this.itemTitle === "") {
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  getDisabledImage() {
    return PlayThisDisabled;
  }
}
