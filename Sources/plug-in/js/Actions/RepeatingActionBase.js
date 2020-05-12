import ActionBase from "./ActionBase";
import debug from "debug";

const log = debug("action:repeating-base");

const INTERVAL = 500;

export default class RepeatingActionBase extends ActionBase {
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
  get triggerCount() {
    return this._triggerCount;
  }

  set triggerCount(value) {
    this._triggerCount = value;
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onKeyDown(data) {
    super.onKeyDown(data);

    this.triggerCount = 0;

    // Start repeat timer
    this.interval = setInterval(() => {
      this.triggerCount += 1;
      this.onTriggerAction(data, this.triggerCount);
    }, INTERVAL);
  }

  onKeyUp(data) {
    super.onKeyUp(data);

    if(this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    // Check if we should trigger the action or whether we already repeated it once or more
    if(this.triggerCount === 0) {
      this.onTriggerAction(data, 0);
    }

    this.triggerCount = 0;
  }

  onDispose() {
    if(!this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    super.onDispose();
  }

  onTriggerAction(data, count) {
    log("onTriggerAction");
  }
}
