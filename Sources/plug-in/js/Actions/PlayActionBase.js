import ActionBase from "./ActionBase";
import debug from "debug";
import { PlayDisabledImage } from "../DataImages/play-key-disabled";
import { PlayImage } from "../DataImages/play-key";

const ACTION_NAME = "play-base";
const ACTION_UUID = `net.bliny.roon.${ACTION_NAME}`;

const log = debug(`action:${ACTION_NAME}`);

export default class PlayActionBase extends ActionBase {
  // ********************************************
  // * Constructors
  // ********************************************
  constructor(config) {
    // Super will set Roon Outputs which will trigger some updates
    super(config);

    log("ctor");

    // Create image data objects for default images
    const defaultPlayImage = new Image();
    defaultPlayImage.onload = () => {
      this._defaultPlayImageData = {
        image: defaultPlayImage,
        width: 144,
        height: 144,
      };
    };
    defaultPlayImage.src = PlayImage;

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

  get defaultPlayImageData() {
    return this._defaultPlayImageData;
  }

  get defaultStopImageData() {
    return this._defaultStopImageData;
  }

  get imageData() {
    return this._imageData;
  }

  set imageData(value) {
    this._imageData = value;
  }

  get imageKey() {
    return this._imageKey;
  }

  set imageKey(value) {
    if(value !== this._imageKey) {
      this._imageKey = value;

      this.onImageKeyChanged(value);
    }
  }

  get pauseTimerInterval() {
    return this._pauseTimerInterval;
  }

  set pauseTimerInterval(value) {
    this._pauseTimerInterval = value;
  }

  get pauseTimerCount() {
    return this._pauseTimerCount;
  }

  set pauseTimerCount(value) {
    this._pauseTimerCount = value;
  }

  get seekPosition() {
    return this._seekPosition;
  }

  set seekPosition(value) {
    if(value !== this._seekPosition) {
      this._seekPosition = value;
      this.renderImage();
    }
  }

  get showCoverArt() {
    return this._showCoverArt;
  }

  set showCoverArt(value) {
    if(value !== this._showCoverArt) {
      this._showCoverArt = (value === true);

      if(value === true) {
        // Trigger cover art refresh
        this.onImageKeyChanged(this.imageKey);
      } else {
        this.renderImage();
      }
    }
  }

  get showSeekPosition() {
    return this._showSeekPosition;
  }

  set showSeekPosition(value) {
    if(value !== this._showSeekPosition) {
      this._showSeekPosition = (value === true);
      this.renderImage();
    }
  }

  get state() {
    return this._state;
  }

  set state(value) {
    if(value !== this._state) {
      this._state = value;

      this.setState((value === "playing" || value == "loading") ? 1 : 0);

      if(value === "paused" && !this.pauseTimerInterval) {
        this.pauseTimerCount = 0;
        this.pauseTimerInterval = setInterval(() => {
          this.pauseTimerCount += 1;
          this.renderImage();
        }, 1000);
      } else if(this.pauseTimerInterval) {
        clearInterval(this.pauseTimerInterval);
        this.pauseTimerInterval = undefined;
      }

      this.renderImage();
    }
  }

  // ********************************************
  // * Private methods, event handlers
  // ********************************************
  onSettingsUpdated(settings) {
    super.onSettingsUpdated(settings);

    if(settings) {
      this.showCoverArt = settings.showCoverArt;
      this.showSeekPosition = settings.showSeekPosition;
    }
  }

  onKeyUp(data) {
    super.onKeyUp(data);
  }

  onRoonActiveOutputChanged(activeOutput) {
    super.onRoonActiveOutputChanged(activeOutput);

    if(activeOutput !== null) {
      this.state = activeOutput.state;
      this.seekPosition = activeOutput.seekPosition;
      this.imageKey = activeOutput.imageKey;
    } else {
      this.state = undefined;
      this.seekPosition = undefined;
      this.imageKey = null;
    }

    this.renderImage();
  }

  onDispose() {
    if(!this.pauseTimerInterval) {
      clearInterval(this.pauseTimerInterval);
      this.pauseTimerInterval = undefined;
    }

    super.onDispose();
  }

  onImageKeyChanged(imageKey) {
    const width = 144;
    const height = 144;

    if(this.roonCore && imageKey) {
      this.roonCore.services.RoonApiImage.get_image(
        imageKey,
        { scale: "fit", width, height, format: "image/jpeg" },
        (err, contentType, body) => {
          if(err) {
            log(`Error retrieving image from Roon: ${err}`);
            this.imageData = null;
          } else {
            const blob = new Blob([ body ], { type: contentType });
            const imagePromise = createImageBitmap(blob);

            imagePromise.then((image) => {
              this.imageData = {
                image,
                width,
                height,
              };
            });
          }

          this.renderImage();
        }
      );
    } else {
      this.imageData = null;
      this.renderImage();
    }
  }

  // ********************************************
  // * Private methods
  // ********************************************
  renderImage() {
    this.renderFinalImage(this.getStateImageData());
  }

  renderFinalImage(imageData) {
    // If we have either a default image or covert art, render with option text items
    if(imageData) {
      const { image, width, height } = imageData;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const canvasContext = canvas.getContext("2d");

      canvasContext.drawImage(image, 0, 0);

      if(this.showSeekPosition === true && this.seekPosition !== undefined && this.seekPosition !== null &&
        (!this.pauseTimerInterval || (this.pauseTimerInterval && this.pauseTimerCount % 2 ===0))) {
        const seekPositionText = this.formatDuration(this.seekPosition);

        canvasContext.font = "32px Arial";
        canvasContext.textAlign = "center";
        canvasContext.textBaseline = "middle";
        canvasContext.shadowColor = "#000000";
        canvasContext.shadowBlur = 1;
        canvasContext.lineWidth = 3;
        canvasContext.strokeStyle = "#000000";
        canvasContext.strokeText(seekPositionText, width / 2, height - 24);
        canvasContext.fillStyle = "#ffffff";
        canvasContext.fillText(seekPositionText, width / 2, height - 24);
      }

      // Set the image on the button
      const dataUri = canvas.toDataURL("image/png");
      this.setImage(dataUri);
    } else {
      this.setImage(this.getDisabledImageWhenRequested());
    }
  }

  getDisabledImage() {
    return PlayDisabledImage;
  }

  formatDuration(duration) {
    const secondsInt = Number.parseInt(duration, 10);
    let hours = Math.floor(secondsInt / 3600);
    let minutes = Math.floor((secondsInt - (hours * 3600)) / 60);
    let seconds = secondsInt - (hours * 3600) - (minutes * 60);

    hours = (hours === 0 ? "" : `${hours}:`);
    if(minutes < 10) { minutes = `0${minutes}`; }
    if(seconds < 10) { seconds = `0${seconds}`; }

    return `${hours == "00" ? "" : hours }${minutes}:${seconds}`;
  }
}
