import PlayItemActionBase from "./PlayItemActionBase";
import debug from "debug";
import { PlayItemDisabled } from "../DataImages/play-item-key-disabled";

const ACTION_NAME = "play-item";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class PlayItemAction extends PlayItemActionBase {
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

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onSettingsUpdated(settings) {
    super.onSettingsUpdated(settings);

    if(settings) {
      this.itemTitle = settings.itemTitle;
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return PlayItemDisabled;
  }
}
