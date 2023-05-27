# Description
`Roon` is a plug-in that allows controlling music playback of Roon outputs.


# Features
- Play/Pause
  - Cover art
  - Elapsed playback time
- Play
- Pause
- Stop (may pause instead)
- Play playlist, tags, artist, album
- Play related artist/album
- Previous
- Next
- Loop mode (all/one/off)
- Shuffle mode (on/off)
- Volume up
- Volume down
- Volume set
- Mute/Unmute
- Roon radio on/off


# Installation
In the Release folder, you can find the file `net.bliny.roon.streamDeckPlugin`. If you double-click this file on your machine, Stream Deck will install the plugin.

## Configuration
Add one of the Roon actions to the Deck, then enter the hostname (or IP address) and port of your Roon Core (the port is likely to be 9100), and then click **Connect**.

Then open Roon, open the main menu, and select **Settings**. In the *Settings* window, select **Extensions** and find the the **Elgato Stream Deck controller** extension and click **Enable**.


# Local development
## Source code
The `Sources` folder contains the source code of the plugin. It will be built into the `Sources/net.bliny.roon.sdPlugin` folder during dev mode and production build.

## Enable Stream Deck debug mode
See https://developer.elgato.com/documentation/stream-deck/sdk/create-your-own-plugin/

### macOS
```
defaults write com.elgato.StreamDeck html_remote_debugging_enabled -bool YES
```

### Windows
In Registry Editor, add a `DWORD` `html_remote_debugging_enabled` with value `1` in the registry at `HKEY_CURRENT_USER\Software\Elgato Systems GmbH\StreamDeck`.

## Enable the plug-in (without install)
Link the development folder into the Stream Deck plug-ins folder (adjust the first path to match source folder location):
```
ln -s ~/dev/streamdeck-roon/Sources/net.bliny.roon.sdPlugin ~/Library/Application\ Support/com.elgato.StreamDeck/Plugins/net.bliny.roon.sdPlugin
```

Run the plug-in and property inspector in hot reload mode:
Development mode is run using beta version of Parcel 2 (https://parceljs.org/) to allow for hot reloads without a development web server.
```
cd Sources/
npm run plug-in:build:watch

# In second terminal
cd Sources/
npm run property-inspector:build:watch
```


# Build release package
* Update the `version` constant in `package.json`
* Update the `VERSION_NUMBER` constant in `index.js`
* Update the version number in `manifest.json`

Release packages are bundled using Webpack 5 (https://webpack.js.org/).
```
npm run build
```

Remember to stop both debug watches first!

Run the Distribution Tool to validate the package. See https://developer.elgato.com/documentation/stream-deck/sdk/packaging/


# Misc
Roon is (probably) a trademark or registered trademark of Roon Labs LLC.

Elgato, Corsair, and Stream Deck are (probably) trademarks or registered trademarks of Corsair GmbH

