import debug from "debug";
import StyleUtils from "./StyleUtils";

const log = debug("property-inspector");

// TODO: Adjust log level from config
// debug.enable("property-inspector*");

window.connectElgatoStreamDeckSocket = function(port, uuid, registerEvent, info, actionInfo) {
  log("connectElgatoStreamDeckSocket", port, uuid, registerEvent, info, actionInfo);

  if(registerEvent === "registerPropertyInspector") {
    new ConfigApp({
      streamDeck: {
        port,
        uuid,
        registerEvent,
        info: JSON.parse(info || {}),
        actionInfo: JSON.parse(actionInfo || {}),
      }
    });
  }
};

export default class ConfigApp {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    log("config", JSON.stringify(config));
    this._config = config;
    this._roonActiveOutput = null;
    this._roonOutputs = [];
    this.isRoonCoreConnected = false;

    const { streamDeck } = config;
    const { actionInfo } = streamDeck;
    const payload = actionInfo ? actionInfo.payload || {} : {};
    this._actionUuid = actionInfo.action;
    this._settings = payload ? payload.settings || {} : {};

    // Connect to Stream Deck
    this._streamDeck = new WebSocket(`ws://127.0.0.1:${config.streamDeck.port}`);

    // Hook up event handlers
    this._streamDeck.onopen = this.onStreamDeckOpen.bind(this);
    this._streamDeck.onclose = this.onStreamDeckClose.bind(this);
    this._streamDeck.onmessage = this.onStreamDeckMessage.bind(this);

    StyleUtils.addDynamicStyles(streamDeck.info.colors);

    this.addEventHandlers();
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actionUuid() {
    return this._actionUuid;
  }

  get config() {
    return this._config;
  }

  get globalSettings() {
    return this._globalSettings;
  }

  set globalSettings(value) {
    this._globalSettings = value;
  }

  get settings() {
    return this._settings;
  }

  get streamDeck() {
    return this._streamDeck;
  }

  get roonActiveOutput() {
    return this._roonActiveOutput;
  }

  set roonActiveOutput(value) {
    if(value !== this._roonActiveOutput) {
      this._roonActiveOutput = value;

      this.setActionOptions();
    }
  }

  get isRoonCoreConnected() {
    return this._isRoonCoreConnected;
  }

  set isRoonCoreConnected(value) {
    this._isRoonCoreConnected = value;
    this.setRoonCoreConnectState();
  }

  get roonOutputs() {
    return this._roonOutputs;
  }

  set roonOutputs(value) {
    if(value !== this._roonOutputs) {
      this._roonOutputs = value;
      this.updateRoonOutputs();

      // Find and set the active output, if available
      this.setRoonActiveOutput();
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onStreamDeckOpen() {
    const { registerEvent, uuid } = this.config.streamDeck;
    log(`Registering property-inspector ${uuid}`);

    // WebSocket is connected, register the plugin
    const data = {
      event: registerEvent,
      uuid,
    };

    this.streamDeck.send(JSON.stringify(data));

    // We wait until we have global settings before populating the form
    this.requestGlobalSettings();
  }

  onStreamDeckClose() {
    log("Stream Deck disconnected");
    this._streamDeck = null;
  }

  onStreamDeckMessage(message) {
    const data = message.data || {};
    const { event, payload } = JSON.parse(data);
    log(`Stream Deck inspector message received: ${data}`);

    if(message && message.data) {
      switch(event) {
      case "didReceiveGlobalSettings":
        this.globalSettings = payload.settings;
        this.initializeForm();
        break;
      case "sendToPropertyInspector":
        if(payload && payload.roonOutputs) {
          this.roonOutputs = payload.roonOutputs;
        }
        if(payload && payload.isRoonCoreConnected !== undefined) {
          this.isRoonCoreConnected = payload.isRoonCoreConnected;
        }
        break;
      }
    }
  }

  onRoonHostnameChanged() {
    this.setRoonCoreConnectState();
  }

  onRoonPortChanged() {
    this.setRoonCoreConnectState();
  }

  onRoonConnectClicked() {
    // Disable the button for a short period as indication of connection attempt
    if(!this.isRoonCoreConnected) {
      const buttonEl = document.getElementById("roon-core-connect");
      buttonEl.disabled = true;
      buttonEl.textContent = "Connecting...";
      setTimeout(() => this.setRoonCoreConnectState(), 5000);
    }

    this.sendToPlugin({
      roonCoreAction: this.isRoonCoreConnected ? "disconnect" : "connect",
      roonHostname: document.getElementById("roon-hostname").value,
      roonPort: document.getElementById("roon-port").value,
    });
  }

  onSettingsChanged(field, value) {
    this.settings[field] = value;
    this.saveSettings();
  }

  onRoonOutputChanged(outputName) {
    this.onSettingsChanged("roonOutputName", outputName);
    this.setRoonActiveOutput();

    // Send last selection to plug-in, so it can be reused as default for other new actions
    this.sendToPlugin({ lastRoonOutput: outputName });
  }

  onRoonOutputSelected(selectedOutput) {
    if(selectedOutput && selectedOutput !== "") {
      document.getElementById("roon-output-name").value = selectedOutput;
      this.onRoonOutputChanged(selectedOutput);
    }
  }

  onPlayItemTypeChanged(itemType) {
    const itemActionEl = document.getElementById("play-item-action");
    const actionEl = document.getElementById("play-item-action-item");
    const actionAddNextEl = document.getElementById("play-item-action-add-next");
    const actionPlayNowEl = document.getElementById("play-item-action-play-now");
    const actionQueueEl = document.getElementById("play-item-action-queue");
    const actionRadioEl = document.getElementById("play-item-action-radio");
    const actionShuffleEl = document.getElementById("play-item-action-shuffle");

    actionEl.classList.add("hidden");
    actionAddNextEl.classList.add("hidden");
    actionPlayNowEl.classList.add("hidden");
    actionQueueEl.classList.add("hidden");
    actionRadioEl.classList.add("hidden");
    actionShuffleEl.classList.add("hidden");

    switch(itemType) {
    case "playlists":
      actionShuffleEl.classList.remove("hidden");
      actionAddNextEl.classList.remove("hidden");
      actionPlayNowEl.classList.remove("hidden");
      actionQueueEl.classList.remove("hidden");
      actionEl.classList.remove("hidden");
      itemActionEl.value = actionPlayNowEl.value;
      break;
    case "albums":
      // No shuffle
      actionAddNextEl.classList.remove("hidden");
      actionPlayNowEl.classList.remove("hidden");
      actionQueueEl.classList.remove("hidden");
      actionRadioEl.classList.remove("hidden");
      actionEl.classList.remove("hidden");
      itemActionEl.value = actionPlayNowEl.value;
      break;
    case "artists":
    case "composers":
    case "genres":
    case "tags":
      actionRadioEl.classList.remove("hidden");
      actionShuffleEl.classList.remove("hidden");
      actionEl.classList.remove("hidden");
      itemActionEl.value = actionShuffleEl.value;
      break;
    case "internet_radio":
      // No-op
      break;
    }

    this.settings.itemAction = itemActionEl.value;
    this.onSettingsChanged("itemType", itemType);
  }

  // ********************************************
  // * Private methods
  // ********************************************
  addEventHandlers() {
    document.getElementById("roon-hostname").addEventListener("keyup", (event) => this.onRoonHostnameChanged(event.target.value));
    document.getElementById("roon-port").addEventListener("keyup", (event) => this.onRoonPortChanged(event.target.value));
    document.getElementById("roon-core-connect").addEventListener("click", () => this.onRoonConnectClicked());

    document.getElementById("show-cover-art").addEventListener("change", (event) => this.onSettingsChanged("showCoverArt", (event.target.checked === true)));
    document.getElementById("show-seek-position").addEventListener("change", (event) => this.onSettingsChanged("showSeekPosition", (event.target.checked === true)));

    document.getElementById("play-item-type").addEventListener("change", (event) => this.onPlayItemTypeChanged(event.target.value));
    document.getElementById("play-item-title").addEventListener("change", (event) => this.onSettingsChanged("itemTitle", event.target.value));
    document.getElementById("play-item-action").addEventListener("change", (event) => this.onSettingsChanged("itemAction", event.target.value));

    document.getElementById("roon-volume-set").addEventListener("change", (event) => this.onSettingsChanged("volume", event.target.value));

    document.getElementById("available-roon-outputs").addEventListener("change", (event) => this.onRoonOutputSelected(event.target.value));
    document.getElementById("roon-output-name").addEventListener("change", (event) => this.onRoonOutputChanged(event.target.value));

    document.getElementById("disable-when-unavailable").addEventListener("change", (event) => this.onSettingsChanged("disableWhenUnavailable", (event.target.checked === true)));
  }

  setRoonCoreConnectState() {
    const cautionEl = document.getElementById("roon-core-not-connected");
    const hostnameEl = document.getElementById("roon-hostname");
    const portEl = document.getElementById("roon-port");
    const buttonEl = document.getElementById("roon-core-connect");

    if(this.isRoonCoreConnected) {
      cautionEl.classList.add("hidden");
      hostnameEl.disabled = true;
      portEl.disabled = true;
      buttonEl.disabled = false;
      buttonEl.textContent = "Disconnect";
    } else {
      cautionEl.classList.remove("hidden");
      buttonEl.textContent = "Connect";
      hostnameEl.disabled = false;
      portEl.disabled = false;

      const hostname = hostnameEl.value;
      const port = Number.parseInt(portEl.value, 10);

      if(hostname.length > 0 && port > 0 && port <= 65535) {
        buttonEl.disabled = false;
      } else {
        buttonEl.disabled = true;
      }
    }
  }

  setRoonActiveOutput() {
    // Find and set the active output, if available
    this.roonActiveOutput = this.getRoonOutputByOutputName(this.settings.roonOutputName);
  }

  updateWithSettings(settings) {
    if(settings.roonHostname !== undefined) {
      document.getElementById("roon-hostname").value = settings.roonHostname;
    }
    if(settings.roonPort !== undefined) {
      document.getElementById("roon-port").value = settings.roonPort;
    }

    // play
    if(settings.showCoverArt !== undefined) {
      document.getElementById("show-cover-art").checked = (settings.showCoverArt === true);
    }
    if(settings.showSeekPosition !== undefined) {
      document.getElementById("show-seek-position").checked = (settings.showSeekPosition === true);
    }

    // play-item / play-this
    if(settings.itemType !== undefined) {
      document.getElementById("play-item-type").value = settings.itemType;
    }
    if(settings.itemAction !== undefined) {
      document.getElementById("play-item-action").value = settings.itemAction;
    }
    if(settings.itemTitle !== undefined) {
      document.getElementById("play-item-title").value = settings.itemTitle;
    }

    // volume-set
    if(settings.volume !== undefined) {
      document.getElementById("roon-volume-set").value = settings.volume;
    }

    // Roon output
    if(settings.roonOutputName !== undefined) {
      document.getElementById("roon-output-name").value = settings.roonOutputName;
    }
    if(settings.disableWhenUnavailable !== undefined) {
      document.getElementById("disable-when-unavailable").checked = (settings.disableWhenUnavailable === true);
    }
  }

  initializeForm() {
    // Update available zones list
    this.updateRoonOutputs();

    // Set defaults
    const defaults = {
      roonHostname: this.globalSettings.roonHostname,
      roonPort: this.globalSettings.roonPort,
      roonOutputName: this.globalSettings.lastRoonOutput,
      disableWhenUnavailable: true,
    };

    if(this.actionUuid == "net.bliny.roon.play-pause") {
      defaults.showCoverArt = true;
      defaults.showSeekPosition = true;
    }

    if(this.actionUuid == "net.bliny.roon.play-item") {
      defaults.itemType = "playlists";
      defaults.itemAction = "Play Now";
    }

    if(this.actionUuid == "net.bliny.roon.play-this") {
      defaults.itemType = "artists";
      defaults.itemAction = "Shuffle";
    }

    this.updateWithSettings(defaults);

    // Override with action specific values
    this.updateWithSettings(this.settings);

    // Save if settings are empty
    this.saveIfEmpty();

    // Show any action specific controls
    this.setActionOptions();

    // Set Roon core fields
    this.setRoonCoreConnectState();
  }

  saveIfEmpty() {
    if(Object.keys(this.settings).length === 0) {
      this.settings.roonOutputName = document.getElementById("roon-output-name").value;
      this.settings.disableWhenUnavailable = (document.getElementById("disable-when-unavailable").checked === true);

      if(this.actionUuid == "net.bliny.roon.play-pause" || this.actionUuid == "net.bliny.roon.play") {
        this.settings.showCoverArt = (document.getElementById("show-cover-art").checked === true);
        this.settings.showSeekPosition = (document.getElementById("show-seek-position").checked === true);
      }

      // Play this/item
      if(this.actionUuid == "net.bliny.roon.play-item" || this.actionUuid == "net.bliny.roon.play-this") {
        this.settings.itemType = document.getElementById("play-item-type").value;
        this.settings.itemAction = document.getElementById("play-item-action").value;
      }
      if(this.actionUuid == "net.bliny.roon.play-item") {
        this.settings.itemTitle = document.getElementById("play-item-title").value;
      }

      if(this.actionUuid == "net.bliny.roon.volume-set") {
        this.settings.volume = document.getElementById("roon-volume-set").value;
      }

      this.saveSettings();
    }
  }

  updateRoonOutputs() {
    const availableOutputs = [];

    if(this.roonOutputs && this.roonOutputs.length > 0) {
      const option = document.createElement("option");
      option.appendChild(document.createTextNode("(Select an output)"));
      option.value = "";
      availableOutputs.push(option);
      this.roonOutputs.forEach((output) => {
        const option = document.createElement("option");
        option.appendChild(document.createTextNode(output.displayName));
        option.value = output.displayName;
        availableOutputs.push(option);
      });
    }

    if(availableOutputs.length === 0) {
      const option = document.createElement("option");
      option.appendChild(document.createTextNode("(No outputs available)"));
      option.value = "";
      availableOutputs.push(option);
    }

    const outputListEl = document.getElementById("available-roon-outputs");
    [...outputListEl.childNodes].forEach(el => el.remove());
    availableOutputs.forEach((child) => outputListEl.appendChild(child));
  }

  getRoonOutputByOutputName(outputName) {
    let result = null;

    if(outputName !== undefined) {
      for(const output of this.roonOutputs) {
        if(output.displayName.toLowerCase() === outputName.toLowerCase()) {
          result = output;
          break;
        }
      }
    }

    return result;
  }

  requestGlobalSettings() {
    this.sendMessage({
      event: "getGlobalSettings",
      context: this.config.streamDeck.uuid,
    });
  }

  sendToPlugin(payload) {
    this.sendMessage({
      event: "sendToPlugin",
      action: this.config.streamDeck.actionInfo.action,
      context: this.config.streamDeck.uuid,
      payload: payload,
    });
  }

  saveSettings() {
    log("Saving settings");
    this.sendMessage({
      event: "setSettings",
      context: this.config.streamDeck.uuid,
      payload: this.settings,
    });
  }

  /**
   * Sets control visibility, options, and options based on selected player if required.
   *
   * An example are available volume settings that may change based on Roon output.
   */
  setActionOptions() {
    const actionUuid = this.actionUuid;
    log(`Setting visibility for "${actionUuid}" elements, if necessary.`);

    const showElements = [];

    if(!this.globalSettings || !this.globalSettings.roonHostname || !this.globalSettings.roonPort) {
      document.getElementById("roon-core").open = true;
    }

    switch(actionUuid) {
    case "net.bliny.roon.play-pause":
    case "net.bliny.roon.play":
      showElements.push(document.getElementById("roon-play-options-item"));
      break;
    case "net.bliny.roon.play-item":
      this.onPlayItemTypeChanged(this.settings.itemType);
      showElements.push(document.getElementById("roon-play-item-item"));
      showElements.push(document.getElementById("play-item-title-item"));
      showElements.push(document.getElementById("play-item-type-album"));
      showElements.push(document.getElementById("play-item-type-artist"));
      showElements.push(document.getElementById("play-item-type-composer"));
      showElements.push(document.getElementById("play-item-type-radio"));
      showElements.push(document.getElementById("play-item-type-genre"));
      showElements.push(document.getElementById("play-item-type-playlist"));
      showElements.push(document.getElementById("play-item-type-tag"));
      break;
    case "net.bliny.roon.play-this":
      this.onPlayItemTypeChanged(this.settings.itemType);
      showElements.push(document.getElementById("roon-play-item-item"));
      showElements.push(document.getElementById("play-item-type-album"));
      showElements.push(document.getElementById("play-item-type-artist"));
      break;
    case "net.bliny.roon.mute":
    case "net.bliny.roon.mute-unmute":
    case "net.bliny.roon.volume-up":
    case "net.bliny.roon.volume-down":
      this.setVolumeOptions();
      break;
    case "net.bliny.roon.volume-set":
      showElements.push(document.getElementById("roon-volume-set-item"));
      this.setVolumeSetOptions();
      this.setVolumeOptions();
      break;
    }

    showElements.forEach((showElement) => showElement.classList.remove("hidden"));
  }

  setVolumeOptions() {
    const messageContainer = document.getElementById("zone-caution");
    const messageContent = document.getElementById("zone-caution-content");

    if(this.roonActiveOutput === null) {
      messageContainer.classList.add("hidden");
    } else if(this.roonActiveOutput.volume && this.roonActiveOutput.volume.type) {
      messageContainer.classList.add("hidden");
    } else if(this.roonActiveOutput && this.roonActiveOutput.volume === undefined) {
      messageContainer.classList.remove("hidden");
      messageContent.textContent = "Selected output has fixed volume";
    }
  }

  setVolumeSetOptions() {
    const volumeEl = document.getElementById("roon-volume-set");
    volumeEl.disabled = false;
    volumeEl.min = undefined;
    volumeEl.max = undefined;
    volumeEl.step = "any";
    let tipText = "";

    if(this.roonActiveOutput === null) {
      tipText = "(output info not available)";
    } else if(this.roonActiveOutput.volume && this.roonActiveOutput.volume.type) {
      const { volume } = this.roonActiveOutput;
      tipText = this.getVolumeTipText(volume);
      volumeEl.disabled = false;
      volumeEl.min = volume.min;
      volumeEl.max = volume.max;
      volumeEl.step = volume.step;
    } else if(this.roonActiveOutput && this.roonActiveOutput.volume === undefined) {
      tipText = "(fixed volume)";
      volumeEl.disabled = true;
      volumeEl.value = "";
    }

    volumeEl.placeholder = tipText;
  }

  getVolumeTipText(volumeData) {
    let result = "";
    switch(volumeData.type) {
    case "incremental":
      result = "Only increase/decrease available.";
      break;
    case "number":
    case "db":
      result = `${volumeData.min} - ${volumeData.max}${volumeData.type === "db" ? " (dB)" : ""}`;
    }

    return result;
  }

  /**
   * Sends a message if Stream Deck is connected.
   *
   * @param      {Object}  message  The message
   */
  sendMessage(message) {
    if(this.streamDeck) {
      this.streamDeck.send(JSON.stringify(message));
    }
  }
}