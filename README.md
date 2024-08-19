# MastaMarks
sync mastadon bookmarks to firefox

### Setup
1. install by local build, repo clone, or on the firefox store
2. navigate to manage extensions -> mastamarks -> preferences
3. for each server you wish to sync
    - visit your server account's preferences page and generate an oauth token
    - replace the example url the server's url
    - replace the example access_token with its oauth token

(optional) 
 - edit or disable the automatic import timer config


### Usage
1. click on the hotbar icon to bring up the main popup menu
2. select from the dropdown a folder to import new bookmarks into
- press fetch to retrieve the newest bookmarks from configured servers
- press import to fetch (if not already fetched) and then import all unseen bookmarks into firefox

(optional)
- untick newest to fetch and import the full bookmarks list from every server, ignoring the last seen cache
- untick server entries to ignore during fetch and import


### Build Local
1. install web-ext
2. clone the repo, cd into folder
3. type "web-ext build" 
4. navigate to the web-ext-artifacts folder
5. about:debugging -> this firefox -> temporrary extensions
6. upload the new zip file


### Debugging
the seen bookmarks cache is kept in synced storage and will prevent downloading already fetched bookmarks (to minimize fetch requests from rate limited servers)

- to reset seen bookmarks; go to manage extensions -> preferences, and press clear cache

the settings page accepts any number of server entries, must be valid json

theres no reason this shouldnt work on chromium but I havent tested it there. 
