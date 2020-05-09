import RepeatingActionBase from "./RepeatingActionBase";
import debug from "debug";
import { NextDisabled } from "../DataImages/next-key-disabled";

const ACTION_NAME = "next";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class NextAction extends RepeatingActionBase {
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
  onTriggerAction(data, triggerCount) {
    super.onTriggerAction(data);

    if(triggerCount === 0) {
      this.transportControl("next");
    } else {
      if(this.roonActiveOutput && this.roonActiveOutput.isSeekAllowed) {

        let amount = triggerCount;
        if(triggerCount < 3) {
          amount = 5;
        } else {
          amount = Math.pow(2, triggerCount);
        }

        // Guardrails
        amount = Math.min(amount, 45);
        this.transportSeek("relative", amount);
      }
    }
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null && activeOutput.isNextAllowed === true) {
      this.setImage(undefined);
    } else {
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImage() {
    return NextDisabled;
  }
}
