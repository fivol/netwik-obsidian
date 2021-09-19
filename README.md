# Netwik
**Plugin for [Obsidian.md](https://obsidian.md)**

Provides access to global network of notes. 
Anyone can create, view or edit notes. 
All changes will be synchronized between all participants.

### Features
- Upload your notes to the cloud
- Access any note just by passing link
- Search global notes with auto suggestions by title

## Usage
*If you on macOS read `Ctrl` like `Cmd` key in this instruction*
### Commands
*Press `Ctrl + P` to open command palette*
- `Create note`
- `Update note` Download changes for current file from cloud
- `Delete remote note` Permanent delete the note system-wide. 
If you just delete file in your filesystem, nothing will happen in the cloud
- `Sync base` Synchronize the local database with the cloud
- `Upload current note` Upload current note (if it is not synchronized yet)

### Suggestions
1. Type your trigger symbol (`/` by default) to open suggestions of remote notes
2. Press `Esc` to close suggestions or choose one with keyboard arrow or mouse click
3. Obsidian internal link will be generated and remote file will be downloaded to local storage

### Files manipulation
- If delete `.md` or `.json` files in `w` directory nothing will happen in the cloud.
  Local base exists only for comfortable obsidian navigation
- You can move (by mouse drag or file rename) any file in your obsidian vault to `w` folder. 
This file will be parsed and uploaded. Locally it will be renamed to normal note (id in begin of filename)
- In any local note call command `Upload current note` to move it to remote storage and `w` folder

### Settings
1. Go to the obsidian settings. `Ctrl + ','`
2. Open `Netwik` tab (if plugin enabled)

#### Change values you want
- `Trigger symbol`. Triggers suggestion show
- `Backend entrypoint`. Call API on this address, change only if plugin does not work properly

## System design
- There is remote mongo base, that contains all notes as json objects
- Distributed net of servers receives queries from plugin to provide data
- Plugin stores all files in `w/` folder in root of vault
- All note have contains it absolute id. Title can be changes, but id always the same
- There are also `w/.blocks` folder to store note related info in `json` files.
  Each `.json` corresponds single `.md` file

## Manual installation
1. Extract the netwik folder from the zip (or clone github) to your vault's plugins folder: `<vault>/.obsidian/plugins/`  
   Note: On some machines the `.obsidian` folder may be hidden. On MacOS you should be able to press `Command+Shift+Dot` to show the folder in Finder.
2. Reload Obsidian
3. If prompted about Safe Mode, you can disable safe mode and enable the plugin.

## Plans
- Add smart server side merge (not just replace with new content)
- Every note history in obsidian tab (like commits history in git)
- Recursive upload from local. Move single file to storage and choose in modal window dependent files to upload
- Internal links renaming. Change title to rename files and other base internal links
- Blocks query language in markdown files.
  You write query like code block -> plugin renders corresponding list of notes