# Changelog

## [1.0.9] - 2023-03-15
### Changed
- Add support for StreamDeck+ knobs
- Update to latest SDK styles

## [1.0.8] - 2022-06-07
### Changed
- Update dependencies to latest for performance and security
- Update internal build configuration to match latest dependencies
- Remove port number placeholder text since it is now much more dynamic than the previous default

## [1.0.7] - 2020-08-07
### Changed
- Fix issues when waking up from sleep where dynamically rendered images may cause buttons to fail to work.

## [1.0.6] - 2020-08-04

### Changed
- Add ability to show current volume on volume set button

## [1.0.5] - 2020-06-27

### Changed
- Fixed race condition in cover art rendering
- Fixed an issue causing the cover art to not always be rendered
- Fixed an issue causing the Play button to not update correctly
- Fixed issue where previous cover art was not removed if the next track didn't have cover art available
- Fixed an issue when adding buttons and the default zone wasn't set
- Added ability to reconnect to Roon Core by pressing any key when disconnected
