import PlayPauseAction from "./PlayPauseAction";
import PlayAction from "./PlayAction";
import PauseAction from "./PauseAction";
import PlayItemAction from "./PlayItemAction";
import PlayThisAction from "./PlayThisAction";
import StopAction from "./StopAction";
import PreviousAction from "./PreviousAction";
import NextAction from "./NextAction";
import VolumeUpAction from "./VolumeUpAction";
import VolumeDownAction from "./VolumeDownAction";
import VolumeEncoderAction from "./VolumeEncoderAction";
import VolumeSetAction from "./VolumeSetAction";
import MuteUnmuteAction from "./MuteUnmuteAction";
import LoopAllAction from "./LoopAllAction";
import LoopOneAction from "./LoopOneAction";
import RoonRadioAction from "./RoonRadioAction";
import ShuffleAction from "./ShuffleAction";

export default class ActionFactory {
  static createAction(config) {
    const { actionUuid } = config;
    let result = null;

    switch (actionUuid) {
      case "net.bliny.roon.play-pause":
        result = new PlayPauseAction(config);
        break;
      case "net.bliny.roon.play":
        result = new PlayAction(config);
        break;
      case "net.bliny.roon.pause":
        result = new PauseAction(config);
        break;
      case "net.bliny.roon.play-this":
        result = new PlayThisAction(config);
        break;
      case "net.bliny.roon.play-item":
        result = new PlayItemAction(config);
        break;
      case "net.bliny.roon.stop":
        result = new StopAction(config);
        break;
      case "net.bliny.roon.previous":
        result = new PreviousAction(config);
        break;
      case "net.bliny.roon.next":
        result = new NextAction(config);
        break;
      case "net.bliny.roon.volume-up":
        result = new VolumeUpAction(config);
        break;
      case "net.bliny.roon.volume-down":
        result = new VolumeDownAction(config);
        break;
      case "net.bliny.roon.volume-encoder":
        result = new VolumeEncoderAction(config);
        break;
      case "net.bliny.roon.volume-set":
        result = new VolumeSetAction(config);
        break;
      case "net.bliny.roon.mute-unmute":
        result = new MuteUnmuteAction(config);
        break;
      case "net.bliny.roon.loop-all":
        result = new LoopAllAction(config);
        break;
      case "net.bliny.roon.loop-one":
        result = new LoopOneAction(config);
        break;
      case "net.bliny.roon.roon-radio":
        result = new RoonRadioAction(config);
        break;
      case "net.bliny.roon.shuffle":
        result = new ShuffleAction(config);
        break;
      default:
        console.error(`Unsupported action "${actionUuid}" requested.`);
        break;
    }

    return result;
  }
}