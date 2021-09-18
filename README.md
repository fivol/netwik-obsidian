# Netwik
**Plugin for [Obsidian.md](https://obsidian.md)**

Provides access to global network of notes. Anyone can create, view or edit notes. All changes will be synchronized between all participants.

### Features
- Upload your notes to the cloud
- Access any note just by passing link
- Search global notes with auto suggestions by title

## Usage
### Commands
*Press `Ctrl + P` to open command palette*
- `Create note`
- `Update note` Download changes for current file from cloud
- `Delete remote note` Permanent delete the note system-wide. 
If you just delete file in your filesystem, nothing will happen in the cloud
- `Sync base` Synchronize the local database with the cloud
- `Upload current note` Upload current note (if it is not synchronized yet)

## Manual installation

1. Extract the netwik folder from the zip (or clone github) to your vault's plugins folder: `<vault>/.obsidian/plugins/`  
   Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
1. Reload Obsidian
1. If prompted about Safe Mode, you can disable safe mode and enable the plugin.