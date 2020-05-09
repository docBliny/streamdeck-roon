import ActionBase from "./ActionBase";
import debug from "debug";

const ACTION_NAME = "play-item-base";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class PlayItemActionBase extends ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    super(config);

    log("ctor", config);

    this.setSettings(config.settings);
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return ACTION_UUID;
  }

  get itemAction() {
    return this._itemAction;
  }

  set itemAction(value) {
    this._itemAction = value;
  }

  get itemType() {
    return this._itemType;
  }

  set itemType(value) {
    this._itemType = value;
  }

  get itemTitle() {
    return this._itemTitle;
  }

  set itemTitle(value) {
    this._itemTitle = value;
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onSettingsUpdated(settings) {
    super.onSettingsUpdated(settings);

    if(settings) {
      this.itemAction = settings.itemAction;
      this.itemType = settings.itemType;
    }
  }

  async onKeyUp(data) {
    super.onKeyUp(data);

    let result = false;
    if(this.roonActiveOutput) {
      log(`Attempting play of "${this.itemTitle}", type: "${this.itemType}", action: "${this.itemAction}"`);
      if(await this.roonBrowseAndActivate({ outputId: this.roonActiveOutput.outputId, itemAction: this.itemAction, itemType: this.itemType, itemTitle: this.itemTitle }) === true) {
        result = true;
      }
    }

    if(result === true) {
      this.showOk();
    } else {
      this.showAlert();
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null) {
      this.setImage(undefined);
    } else {
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  setSettings(settings) {
    this.itemAction = settings && settings.itemAction;
    this.itemType = settings && settings.itemType;
    this.itemTitle = settings && settings.itemTitle;
  }
}
