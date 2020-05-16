import ActionFactory from "./Actions/ActionFactory";
import debug from "debug";
import RoonApi from "node-roon-api";
import RoonApiBrowse from "node-roon-api-browse";
import RoonApiImage from "node-roon-api-image";
import RoonApiTransport from "node-roon-api-transport";

const log = debug("plug-in");
const roonLog = debug("roon");
const roonSubscribeLog = debug("roon:subscribe");
const roonUpdateLog = debug("roon:update");

const VERSION_NUMBER = "1.0.4";

// TODO: Adjust log level from config
// debug.enable("plug-in,roon,roon:subscribe,roon:update,action:*");

global.Buffer = require("buffer/").Buffer;
window.connectElgatoStreamDeckSocket = function(port, uuid, registerEvent, info) {
  log("connectElgatoStreamDeckSocket", port, uuid, registerEvent, info);

  if(registerEvent === "registerPlugin") {
    new App({
      streamDeck: {
        port,
        uuid,
        registerEvent,
        info,
      },
    });
  }
};

export default class App {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    log("config", JSON.stringify(config));

    // Bind and save bound event handlers
    this.onStreamDeckOpen = this.onStreamDeckOpen.bind(this);
    this.onStreamDeckClose = this.onStreamDeckClose.bind(this);
    this.onStreamDeckMessage = this.onStreamDeckMessage.bind(this);
    this.getRoonPersistedState = this.getRoonPersistedState.bind(this);
    this.setRoonPersistedState = this.setRoonPersistedState.bind(this);
    this.onRoonCorePaired = this.onRoonCorePaired.bind(this);
    this.onRoonCoreUnpaired = this.onRoonCoreUnpaired.bind(this);

    // Initialize internal state
    this._actions = {};
    this._config = config;
    this._globalSettings = {};
    this._roonCore = null;
    this._roonOutputs = {};
    this._streamDeck = null;
    this._activePropertyInspector = null;

    // Initialize Roon extension
    this._roon = new RoonApi({
      extension_id:        "net.bliny.streamdeck-roon",
      display_name:        "Elgato Stream Deck controller",
      display_version:     VERSION_NUMBER,
      publisher:           "Tomi Blinnikka",
      email:               "tomi.blinnikka@censored",
      website:             "https://bliny.net/streamdeck-roon/",
      log_level:           "none",

      get_persisted_state: this.getRoonPersistedState,
      set_persisted_state: this.setRoonPersistedState,
      core_paired: this.onRoonCorePaired,
      core_unpaired: this.onRoonCoreUnpaired,
    });

    this.roon.init_services({
      required_services: [ RoonApiTransport, RoonApiBrowse, RoonApiImage ],
    });

    // Connect to Stream Deck
    this.streamDeck = new WebSocket(`ws://127.0.0.1:${config.streamDeck.port}`);
  }

  // ********************************************
  // * Properties
  // ********************************************
  get actions() {
    return this._actions;
  }

  get activePropertyInspector() {
    return this._activePropertyInspector;
  }

  set activePropertyInspector(value) {
    this._activePropertyInspector = value;
  }

  get config() {
    return this._config;
  }

  get globalSettings() {
    // We return an object reference and allow changes to its properties
    return this._globalSettings;
  }

  set globalSettings(value) {
    if(value) {
      this._globalSettings = value;
    } else {
      this._globalSettings = {};
    }
  }

  get roon() {
    return this._roon;
  }

  get roonCore() {
    return this._roonCore;
  }

  set roonCore(value) {
    if(value !== this._roonCore) {
      this._roonCore = value;
      this.updateActionRoonCore(value);
      this.updatePropertyInspectorIsRoonConnected();
    }
  }

  get roonOutputs() {
    // Everyone gets their own copy
    return Object.assign({}, this._roonOutputs);
  }

  get streamDeck() {
    return this._streamDeck;
  }

  set streamDeck(value) {
    if(value !== this._streamDeck) {
      // Remove old event handlers, if available
      if(this._streamDeck !== null) {
        this.streamDeck.removeEventListener("open", this.onStreamDeckOpen);
        this.streamDeck.removeEventListener("close", this.onStreamDeckClose);
        this.streamDeck.removeEventListener("message", this.onStreamDeckMessage);
      }

      this._streamDeck = value;

      // Hook up event handlers on new instance
      if(this._streamDeck !== null) {
        this.streamDeck.addEventListener("open", this.onStreamDeckOpen);
        this.streamDeck.addEventListener("close", this.onStreamDeckClose);
        this.streamDeck.addEventListener("message", this.onStreamDeckMessage);
      }

      this.updateActionStreamDeck(value);
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onStreamDeckOpen() {
    const { registerEvent, uuid } = this.config.streamDeck;
    log(`Registering plug-in ${uuid}`);

    // WebSocket is connected, register the plugin
    const data = {
      event: registerEvent,
      uuid,
    };

    this.streamDeck.send(JSON.stringify(data));

    // Request global settings
    this.requestGlobalSettings();
  }

  onStreamDeckClose() {
    log("Stream Deck disconnected");
    this.streamDeck = null;
  }

  onStreamDeckMessage(message) {
    const data = message.data || {};
    const { action, context, event, payload } = JSON.parse(data);
    const settings = payload ? payload.settings || {} : {};
    log(`Stream Deck message received: ${data}`);
    let actionObject;

    switch(event) {
    case "willAppear":
      if(!Object.prototype.hasOwnProperty.call(this.actions, context)) {
        const actionInstance = ActionFactory.createAction({
          streamDeck: this.streamDeck,
          roonCore: this.roonCore,
          roonOutputs: this.getRoonOutputsAsArray(),
          actionUuid: action,
          context,
          settings,
        });

        if(actionInstance !== null) {
          this.actions[context] = actionInstance;
        }
      }
      break;
    case "willDisappear":
      actionObject = this.actions[context];
      delete this.actions[context];
      if(actionObject) {
        actionObject.dispose();
      }
      break;
    case "didReceiveGlobalSettings":
      if(payload && payload.settings) {
        this.globalSettings = payload.settings;
        if(this.roonCore === null) {
          this.roonConnect(this.globalSettings.roonHostname, this.globalSettings.roonPort);
        }
      }
      break;
    case "keyUp":
      break;
    case "propertyInspectorDidAppear":
      this.activePropertyInspector = { actionUuid: action, context };
      this.sendToPropertyInspector({ isRoonCoreConnected: this.roonCore !== null , roonOutputs: this.getRoonOutputsAsArray() });
      break;
    case "propertyInspectorDidDisappear":
      this.activePropertyInspector = null;
      break;
    case "sendToPlugin":
      this.updateFromPropertyInspector(payload);
      break;
    }
  }

  onRoonCorePaired(core) {
    roonLog("Roon core paired");

    this.roonCore = core;
    const transport = core.services.RoonApiTransport;

    transport.subscribe_zones((response, data) => {
      switch(response) {
      case "Subscribed":
        roonSubscribeLog("subscribe_zones", response, JSON.stringify(data));
        this.setRoonOutputsFromZoneData(data.zones);
        break;
      case "Changed":
        if(data.zones_added) {
          roonUpdateLog("zones_added", response, JSON.stringify(data));
          this.setRoonOutputsFromZoneData(data.zones_added);
        }
        if(data.zones_changed) {
          roonUpdateLog("zones_changed", response, JSON.stringify(data));
          this.setRoonOutputsFromZoneData(data.zones_changed);
        }
        if(data.zones_removed) {
          roonUpdateLog("zones_removed", response, JSON.stringify(data));
          this.removeRoonOutputsFromZoneData(data.zones_removed);
        }
        if(data.zones_seek_changed) {
          // roonUpdateLog("zones_seek_changed", response, JSON.stringify(data));
          this.setRoonOutputsFromSeekData(data.zones_seek_changed);
        }
        break;
      default:
        roonSubscribeLog(`Unhandled subscription response "${response}"`);
        break;
      }
    });
  }

  onRoonCoreUnpaired(core) {
    roonLog("Roon core unpaired", core);
    this.roonCore = null;
    this._roonOutputs = {};
    this.updatePropertyInspectorIsRoonConnected();
    this.updatePropertyInspectorRoonOutputs();
    this.updateActionRoonOutputs();
  }

  // ********************************************
  // * Private methods
  // ********************************************
  roonConnect(roonHostname, roonPort) {
    if(roonHostname && roonHostname.length > 0 && roonPort && roonPort.length > 0 && Number.isInteger(Number.parseInt(roonPort, 10))) {
      this.roonDisconnect();

      this.globalSettings.roonHostname = roonHostname;
      this.globalSettings.roonPort = roonPort;
      this.saveGlobalSettings();

      roonLog(`Connecting to Roon core at ${roonHostname}:${roonPort}`);
      this.roon.ws_connect({
        host: roonHostname,
        port: roonPort,
        onclose: () => {
          if(this.roonCore !== null) {
            roonLog("Lost Roon connection, retrying in 3 seconds...");
            this.roonCore = null;
            setTimeout(() => {
              // Attempt to reconnect if still disconnected
              if(this.roonCore === null) {
                roonLog("Reconnecting...");
                this.roonConnect(roonHostname, roonPort);
              }
            }, 3000);
          } else {
            roonLog(`Succesfully disconnected from ${roonHostname}:${roonPort}`);
            this.roonCore = null;
          }
        },
      });
    } else {
      roonLog(`Cannot connect to Roon core with invalid settings: "${roonHostname}:${roonPort}"`);
    }
  }

  roonDisconnect() {
    if(this.roonCore !== null) {
      roonLog("Disconnecting from existing Roon core");
      const transport = this.roonCore.moo.transport;
      this.roonCore = null;
      transport.close();
    }
  }

  getRoonPersistedState() {
    return this.globalSettings.roonState || {};
  }

  setRoonPersistedState(value) {
    this.globalSettings.roonState = value;
    this.saveGlobalSettings();
  }

  removeRoonOutputsFromZoneData(zoneData) {
    if(Array.isArray(zoneData)) {
      // Loop all existing outputs and remove any that were in removed zones
      Object.keys(this._roonOutputs).map((key) => {
        if(zoneData.includes(this._roonOutputs[key].zoneId)) {
          delete this._roonOutputs[key];
        }
      });

      roonLog("Current outputs", JSON.stringify(this.roonOutputs));
      this.updatePropertyInspectorRoonOutputs();
      this.updateActionRoonOutputs();
    }
  }

  /**
   * Sets the outputs from Roon data. Creates a unique output name for each output.
   * Duplicate display names will get an index appended to the output name.
   *
   * @param      {Array}  zoneData      The Roon zone data.
   */
  setRoonOutputsFromZoneData(zoneData) {
    if(Array.isArray(zoneData)) {
      // Loop all zones and create unique internal entries
      zoneData.forEach((zone) => {
        zone.outputs.forEach((output) => {
          const roonOutputs = this._roonOutputs;
          const oldOutput = roonOutputs[output.output_id] || {};

          // Track by native output ID. This will retain (unique) zones while we're running
          const newOutput = {
            outputId: output.output_id,
            zoneId: output.zone_id,
            displayName: output.display_name,
          };

          // Only add volume information if this data update contains it to avoid overwriting existing info
          if(output.volume) {
            const outputVolume = output.volume;
            newOutput.volume = {
              type: outputVolume.type,
              min: outputVolume.min,
              max: outputVolume.max,
              value: outputVolume.value,
              step: outputVolume.step,
              isMuted: outputVolume.is_muted,
              hardLimitMin: outputVolume.hard_limit_min,
              hardLimitMax: outputVolume.hard_limit_max,
              softLimit: outputVolume.soft_limit,
            };
          }

          // Add current playback state when available
          this.conditionalAdd(zone, newOutput, "state", "state");
          this.conditionalAdd(zone, newOutput, "is_next_allowed", "isNextAllowed");
          this.conditionalAdd(zone, newOutput, "is_previous_allowed", "isPreviousAllowed");
          this.conditionalAdd(zone, newOutput, "is_pause_allowed", "isPauseAllowed");
          this.conditionalAdd(zone, newOutput, "is_play_allowed", "isPlayAllowed");
          this.conditionalAdd(zone, newOutput, "is_seek_allowed", "isSeekAllowed");
          if(zone.settings) {
            this.conditionalAdd(zone.settings, newOutput, "loop", "loop");
            this.conditionalAdd(zone.settings, newOutput, "shuffle", "shuffle");
            this.conditionalAdd(zone.settings, newOutput, "auto_radio", "autoRadio");
          }
          if(zone.now_playing) {
            this.conditionalAdd(zone.now_playing, newOutput, "seek_position", "seekPosition");
            this.conditionalAdd(zone.now_playing, newOutput, "image_key", "imageKey");
            if(zone.now_playing.three_line) {
              this.conditionalAdd(zone.now_playing.three_line, newOutput, "line1", "songName");
              this.conditionalAdd(zone.now_playing.three_line, newOutput, "line2", "artistName");
              this.conditionalAdd(zone.now_playing.three_line, newOutput, "line3", "albumName");
            } else if(zone.now_playing.two_line) {
              this.conditionalAdd(zone.now_playing.two_line, newOutput, "line1", "songName");
              this.conditionalAdd(zone.now_playing.two_line, newOutput, "line2", "artistName");
            }
          } else {
            newOutput.seekPosition = undefined;
            newOutput.imageKey = undefined;
            newOutput.songName = undefined;
            newOutput.artistName = undefined;
            newOutput.albumName = undefined;
          }

          // Save
          roonOutputs[output.output_id] = Object.assign({}, oldOutput, newOutput);
        });
      });
    }

    roonLog("Current outputs", JSON.stringify(this.roonOutputs));

    this.updatePropertyInspectorIsRoonConnected();
    this.updatePropertyInspectorRoonOutputs();
    this.updateActionRoonOutputs();
  }

  setRoonOutputsFromSeekData(zoneData) {
    if(Array.isArray(zoneData)) {
      zoneData.forEach((zone) => {
        if(zone.zone_id && zone.seek_position) {
          const roonOutputs = this._roonOutputs;
          this.getOutputsByZoneId(zone.zone_id).forEach((outputId) => {
            const output = roonOutputs[outputId] || {};

            // Update seek position
            output.seekPosition = zone.seek_position;

            // Save the output
            roonOutputs[output.outputId] = output;
          });

          // Update play/pause actions only
          this.updatePlayActionRoonOutputs();
        }
      });
    }
  }

  getOutputsByZoneId(zoneId) {
    const roonOutputs = this._roonOutputs;
    const result = [];

    if(roonOutputs) {
      Object.keys(roonOutputs).map((key) => {
        if(roonOutputs[key].zoneId === zoneId) {
          result.push(key);
        }
      });
    }

    return result;
  }

  conditionalAdd(source, target, sourceField, targetField) {
    if(source[sourceField] !== undefined) {
      target[targetField] = source[sourceField];
    }
  }

  updateActionRoonCore(roonCore) {
    Object.keys(this.actions).forEach((context) => {
      this.actions[context].roonCore = roonCore;
    });
  }

  updateActionRoonOutputs() {
    const roonOutputs = this.getRoonOutputsAsArray();
    Object.keys(this.actions).forEach((context) => {
      this.actions[context].roonOutputs = roonOutputs;
    });
  }

  updateActionStreamDeck(streamDeck) {
    Object.keys(this.actions).forEach((context) => {
      this.actions[context].streamDeck = streamDeck;
    });
  }

  updatePlayActionRoonOutputs() {
    const roonOutputs = this.getRoonOutputsAsArray();
    Object.keys(this.actions).forEach((context) => {
      const action = this.actions[context];
      if(action.actionUuid == "net.bliny.roon.play-pause") {
        this.actions[context].roonOutputs = roonOutputs;
      }
    });
  }

  updateFromPropertyInspector(data) {
    if(data.lastRoonOutput) {
      this.globalSettings.lastRoonOutput = data.lastRoonOutput;
    }

    if(data.roonCoreAction === "connect") {
      this.roonConnect(data.roonHostname, data.roonPort);
    } else if(data.roonCoreAction === "disconnect") {
      this.roonDisconnect();
    }

    this.saveGlobalSettings();
  }

  updatePropertyInspectorRoonOutputs() {
    const roonOutputs = this.getRoonOutputsAsArray();
    this.sendToPropertyInspector({ roonOutputs });
  }

  updatePropertyInspectorIsRoonConnected() {
    this.sendToPropertyInspector({ isRoonCoreConnected: this.roonCore !== null });
  }

  getRoonOutputsAsArray() {
    const roonOutputs = this.roonOutputs;
    const rootOutputsArray = Object.keys(roonOutputs).map((key) => roonOutputs[key]);

    return rootOutputsArray.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  requestGlobalSettings() {
    this.sendMessage({
      event: "getGlobalSettings",
      context: this.config.streamDeck.uuid,
    });
  }

  saveGlobalSettings() {
    this.sendMessage({
      event: "setGlobalSettings",
      context: this.config.streamDeck.uuid,
      payload: this.globalSettings,
    });
  }

  sendToPropertyInspector(data) {
    if(this.activePropertyInspector) {
      const { actionUuid, context } = this.activePropertyInspector;

      this.sendMessage({
        action: actionUuid,
        event: "sendToPropertyInspector",
        context,
        payload: data,
      });
    }
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
