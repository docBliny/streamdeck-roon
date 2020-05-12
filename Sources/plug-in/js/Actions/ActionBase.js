import debug from "debug";

const log = debug("action:base");

export default class ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor({ streamDeck, roonCore, roonOutputs, actionUuid, context, settings } = {}) {
    // Bind and save bound event handlers
    this.onStreamDeckMessage = this.onStreamDeckMessage.bind(this);

    // Initialize internal state
    this._actionUuid = actionUuid;
    this._context = context;
    this.settings = settings || {};
    this.streamDeck = streamDeck;
    this.roonCore = roonCore;
    this.roonActiveOutput = null;
    this.roonOutputs = roonOutputs;
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return this._actionUuid;
  }

  get context() {
    return this._context;
  }

  get roonCore() {
    return this._roonCore;
  }

  set roonCore(value) {
    this._roonCore = value;

    if(value !== null) {
      this.roonTransport = this.roonCore.services.RoonApiTransport;
    } else {
      this.roonTransport = null;
    }
  }

  get roonTransport() {
    return this._roonTransport;
  }

  set roonTransport(value) {
    this._roonTransport = value;
  }

  get roonActiveOutput() {
    return this._roonActiveOutput;
  }

  set roonActiveOutput(value) {
    this._roonActiveOutput = value;
    this.onRoonActiveOutputChanged(value);
  }

  get roonOutputs() {
    return this._roonOutputs;
  }

  set roonOutputs(value) {
    if(value !== this._roonOutputs) {
      this._roonOutputs = value;

      // Find and set the active output, if available
      this.roonActiveOutput = this.getRoonOutputByOutputName(this.settings.roonOutputName);
    }
  }

  get settings() {
    return this._settings;
  }

  set settings(value) {
    this._settings = value;
  }

  get streamDeck() {
    return this._streamDeck;
  }

  set streamDeck(value) {
    if(value !== this._streamDeck) {
      // Check if we should attempt to remove previous event listener(s)
      if(this._streamDeck) {
        this._streamDeck.removeEventListener("message", this.onStreamDeckMessage);
      }

      this._streamDeck = value;

      // Add event listener(s)
      if(this._streamDeck) {
        this._streamDeck.addEventListener("message", this.onStreamDeckMessage);
      }
    }
  }

  // ********************************************
  // * Public methods
  // ********************************************
  dispose() {
    this.onDispose();
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onStreamDeckMessage(message) {
    const data = message.data || {};
    const { action, context, event, payload } = JSON.parse(data);

    // Check if this message was intended for this action
    if(action === this.actionUuid && context === this.context) {
      switch(event) {
      case "keyDown":
        this.onKeyDown(payload);
        break;
      case "keyUp":
        this.onKeyUp(payload);
        break;
      case "didReceiveSettings":
        this.onSettingsUpdated(payload.settings);
        break;
      }
    }
  }

  onKeyDown(data) {
    log(`${this.actionUuid} keyDown`);
  }

  onKeyUp(data) {
    log(`${this.actionUuid} keyUp`);
  }

  onSettingsUpdated(settings) {
    log(`${this.actionUuid} settings updated`, settings);
    this.settings = settings;

    // Find and set the active output, if available
    this.roonActiveOutput = this.getRoonOutputByOutputName(settings.roonOutputName);
  }

  onRoonActiveOutputChanged(activeOutput) {
    // log(`"${this.actionUuid}" activeRoonOutput changed`);
  }

  onDispose() {
    log(`${this.actionUuid} onDispose`);
    this.activeRoonOutput = null;
    this.roonOutputs = null;
    this.roonCore = null;
    this.streamDeck = null;
  }

  // ********************************************
  // * Private methods
  // ********************************************
  getDisabledImageWhenRequested() {
    const disableWhenUnavailable = this.settings && (this.settings.disableWhenUnavailable == true);
    let result = undefined;

    if(disableWhenUnavailable === true) {
      return this.getDisabledImage();
    }

    return result;
  }

  getDisabledImage() {
    return undefined;
  }

  getRoonOutputByOutputName(outputName) {
    let result = null;

    if(this.roonOutputs !== null) {
      for(const output of this.roonOutputs) {
        if(output.displayName === outputName) {
          result = output;
          break;
        }
      }
    }

    return result;
  }

  saveSettings() {
    this.sendMessage({
      event: "setSettings",
      context: this.context,
      payload: this.settings,
    });
  }

  setState(state) {
    this.sendMessage({
      event: "setState",
      context: this.context,
      payload: { state },
    });
  }

  showAlert() {
    this.sendMessage({
      event: "showAlert",
      context: this.context,
    });
  }

  showOk() {
    this.sendMessage({
      event: "showOk",
      context: this.context,
    });
  }

  setTitle(text) {
    this.sendMessage({
      event: "setTitle",
      context: this.context,
      payload: {
        title: text,
        target: 0,
      },
    });
  }

  setImage(imageData) {
    this.sendMessage({
      event: "setImage",
      context: this.context,
      payload: {
        image: imageData,
        target: 0,
      },
    });
  }

  transportControl(action) {
    const outputId = this.getActiveRoonOutputId();

    if(this.roonTransport === null) {
      log(`"${this.actionUuid}" transport control not available`);
      this.showAlert();
      return;
    }

    if(outputId !== null) {
      this.roonTransport.control(outputId, action, (err) => {
        if(err) {
          log(`"${this.actionUuid}" transport control error: ${err}`);
          this.showAlert();
        }
      });
    } else {
      log(`"${this.actionUuid}" transport control error: No active output`);
      this.showAlert();
    }
  }

  transportSeek(how, seconds) {
    const outputId = this.getActiveRoonOutputId();

    if(this.roonTransport === null) {
      log(`"${this.actionUuid}" transport seek not available`);
      this.showAlert();
      return;
    }

    if(outputId !== null) {
      this.roonTransport.seek(outputId, how, seconds, (err) => {
        if(err) {
          log(`"${this.actionUuid}" transport seek error: ${err}`);
          this.showAlert();
        }
      });
    } else {
      log(`"${this.actionUuid}" transport seek error: No active output`);
      this.showAlert();
    }
  }

  transportSetting(settings) {
    const outputId = this.getActiveRoonOutputId();

    if(this.roonTransport === null) {
      log(`"${this.actionUuid}" transport control not available`);
      this.showAlert();
      return;
    }

    if(outputId !== null) {
      this.roonTransport.change_settings(outputId, settings, (err) => {
        if(err) {
          log(`"${this.actionUuid}" transport change error: ${err}`);
          this.showAlert();
        }
      });
    } else {
      log(`"${this.actionUuid}" transport change error: No active output`);
      this.showAlert();
    }
  }

  async roonBrowseAndActivate({ outputId, itemType, itemTitle, itemAction }) {
    const browse = this.roonCore.services.RoonApiBrowse;
    let hierarchy = itemType;
    let path = [];
    let itemKey;
    let result = null;

    switch(itemType) {
    case "artists":
      path = [ itemTitle, "Play Artist", itemAction, itemAction ];
      break;
    case "albums":
      path = [ itemTitle, "Play Album", itemAction, itemAction ];
      break;
    case "composers":
      path = [ itemTitle, "Play Composer", itemAction, itemAction ];
      break;
    case "internet_radio":
      path = [ itemTitle, itemTitle ];
      break;
    case "genres":
      path = [ itemTitle, "Play Genre", itemAction, itemAction ];
      break;
    case "playlists":
      path = [ itemTitle, "Play Playlist", itemAction, itemAction ];
      break;
    case "tags":
      hierarchy = "browse";
      path = [ "Library", "Tags", itemTitle, "Play Tag", itemAction, itemAction ];
      break;
    }

    let index = 0;
    for(const pathItem of path) {
      index += 1;
      const options = {
        hierarchy,
        zone_or_output_id: outputId,
      };

      if(!itemKey) {
        options.pop_all = true;
      } else {
        options.item_key = itemKey;
      }

      result = await this.browseAndFind(options, pathItem);

      if(result !== null) {
        itemKey = result.item_key;
      } else {
        // Bail if this part wasn't found
        break;
      }
    }

    return index !== 0 && index === path.length;
  }

  async browseAndFind(options, name) {
    const browseResult = await this.roonBrowse(options);
    let result = null;

    if(name && name.length > 0) {
      if(browseResult && browseResult.action === "list") {
        let offset = 0;
        while(!result) {
          const loadResult = await this.roonLoad({
            hierarchy: options.hierarchy,
            outputId: options.outputId,
            offset,
          });

          // console.log(loadResult)

          // Check if this set of results had the item we were looking for
          result = this.findRoonListItem(loadResult, name);

          // Adjust offset and get next page if needed
          offset = offset + loadResult.items.length;
          if(offset >= loadResult.list.count) {
            // No more results
            break;
          }
        }
      }
    } else {
      log("ERROR: name is required");
    }

    return result;
  }

  async roonBrowse(options) {
    return new Promise((resolve, reject) => {
      this.roonCore.services.RoonApiBrowse.browse(options, (err, result) => {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(result);
        }
      });
    });
  }

  async roonLoad(options) {
    return new Promise((resolve, reject) => {
      this.roonCore.services.RoonApiBrowse.load(options, (err, result) => {
        if(err) {
          reject(new Error(err));
        } else {
          resolve(result);
        }
      });
    });
  }

  findRoonListItem(list, title) {
    let result = null;
    if(list && list.items) {
      for(const item of list.items) {
        if(item.title && title && item.title.toLowerCase() === title.toLowerCase()) {
          result = item;
          break;
        }
      }
    }

    return result;
  }

  getActiveRoonOutputId() {
    return this.roonActiveOutput && this.roonActiveOutput.outputId || null;
  }

  /**
   * Sends a message if Stream Deck is connected.
   *
   * @param      {Object}  message  The message
   */
  sendMessage(message) {
    if(this.streamDeck) {
      // log(`action "${this.actionUuid}" sending message`, message);
      this.streamDeck.send(JSON.stringify(message));
    }
  }
}
