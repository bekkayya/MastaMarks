const json_instances_example = `[
  {
    "url": "https://example.com",
    "access_token": "eyJhbGciOiJIUz"
  },
  {
    "url": "https://example.club",
    "access_token": "oAuth"
  }
]`;

const json_alarms_example = `{
  "enabled": false,
  "start_hour": 14,
  "period_in_minutes": 1440
}`;


async function notify_complete(message){
  browser.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "MastaMarks",
      message: message,
  });
  console.log(message)
}

//storage helpers

async function get_data_store(element, local=false) { //prettier than single line with repeat element
  const result = (local) ? await browser.storage.local.get(element) : await browser.storage.sync.get(element) 
  const data = result[element]
  
  if (!result) {
      console.error("No data found for element:", element);
  }   
  return data
}

async function get_json_store(element, local=false){
  const json_text = await get_data_store(element, local)
  const json_object = JSON.parse(json_text)
  return json_object
}

//mastadon requests

async function request(url, access_token, options = {}) {
  const headers = {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
}

async function get_instance_bookmarks(instance_url, access_token, fetch=true) {
  const newest_bookmarks = [];

  //all instance data will be loaded and saved when fetched

  //get settings store
  const newest_checked_store = await get_data_store("show_newest_checkmark") || false
  const instance_checked_store = await get_data_store(instance_url + "_instance_checkmark") || false

  //get data store
  const instance_bookmarks_store = await get_data_store(instance_url, true) || []
  const instance_bookmarks_old_newest_store = await get_data_store(instance_url+"_newest", true) || [] 
  const instance_bookmarks_store_head = (instance_bookmarks_store[0]) ? instance_bookmarks_store[0].id : ""

  //get newest bookmarks one page at a time until reaching the head of stored bookmarks
  if(instance_checked_store && fetch){
      notify_complete('fetching ' + instance_url + " ...")
      
      //fetch and import new bookmarks
      let next_url = `${instance_url}/api/v1/bookmarks`;
      while (next_url) {
          //fetch bookmark page
          const response = await this.request(next_url, access_token);
          const data = await response.json();
          console.log('page retrieved', next_url)

          //push fetched bookmarks until reaching the head of the stored bookmarks
          let done = false
          for(const bookmark of data){
              if(bookmark.id == instance_bookmarks_store_head){
                  done = true
                  break
              }
              newest_bookmarks.push(bookmark)
          }

          //pagination 
          next_url = null;
          if(!done){
              let link_urls = response.headers.get('link');
              const parts = link_urls.split(',').map(part => part.trim());

              for (const part of parts) {
                  if (part.includes('rel="next"')) {
                      next_url = part.split(';')[0].slice(1, -1); // Remove '<' and '>'
                      break;
                  }
              }
          }
      }
  }

  //put all bookmarks in chronological order, then save
  const all_bookmarks = []
  all_bookmarks.push(...newest_bookmarks)
  all_bookmarks.push(...instance_bookmarks_store)

  browser.storage.local.set({[instance_url]: all_bookmarks});

  //if there was no online fetch then load and save previous newest
  if(!fetch){
    newest_bookmarks.push(...instance_bookmarks_old_newest_store)
  }
  browser.storage.local.set({[instance_url+"_newest"]: newest_bookmarks});

  if(newest_checked_store){
      return newest_bookmarks;
  }
  else{
      return all_bookmarks;
  }
}

async function get_bookmarks_per_instance(fetch=true){
  const bookmarks_per_instance = [];
  const instances = await get_json_store("instances")

  for(const instance of instances){
      const instance_bookmarks = await get_instance_bookmarks(instance.url, instance.access_token, fetch);
      bookmarks_per_instance.push({url: instance.url, bookmarks: instance_bookmarks})
  }

  return bookmarks_per_instance;
}

//bookmark importer

async function import_bookmarks_per_instance(bookmarks_per_instance) {
  const selected_folder_id = await get_data_store("selected_folder")
  
  if(!selected_folder_id){
    notify_complete("please select a folder")
    return false
  }

  notify_complete('importing...')

  let count = 0
  let auxcount = 0
  const selected_folder_children = await browser.bookmarks.getSubTree(selected_folder_id)
  for(const instance of bookmarks_per_instance){
    
    let subfolder = selected_folder_children[0].children.find(bookmark => bookmark.title === instance.url && bookmark.type === "folder");
    let subfolder_id = null

    if (!subfolder) {
        const newfolder = await browser.bookmarks.create({
            parentId: selected_folder_id,
            title: instance.url,
            type: "folder"
        });
        subfolder_id = newfolder.id
    }
    else{
        subfolder_id = subfolder.id
    }

    for(const item of instance.bookmarks){
        const exists = await browser.bookmarks.search(item.url);
        if (exists.length == 0) {
            await browser.bookmarks.create({parentId: subfolder_id, title: item.url, url: item.url});
            count = count + 1
        }
        auxcount = auxcount +1
    }
  }

  notify_complete("items imported: " + count + " out of " + auxcount)
}

//alarm 
async function reset_alarm(){
  const alarms = await get_json_store("alarms")
  
  if(!alarms.enabled){
    console.log("alarm disabled")
    browser.alarms.clear("import_alarm")
    return
  }

  var now = new Date();
  var nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarms.start_hour)
  
  // If the next hour is in the past, move it to the next day
  if (nextHour <= now) {
    nextHour.setDate(nextHour.getDate() + 1);
  }

  const when = nextHour.getTime();
  const periodInMinutes = alarms.period_in_minutes;

  console.log("setting alarm for ", nextHour)

  browser.alarms.create("import_alarm", {
    when,
    periodInMinutes
  })
}

async function handleAlarm(alarmInfo) {
  console.log("on alarm: " , alarmInfo);
  if(alarmInfo.name == "import_alarm"){
    await fetch_received()
    await import_received()
  }
}
browser.alarms.onAlarm.addListener(handleAlarm);

//messaging handlers

async function display_bookmarks_per_instance(bookmarks_per_instance){
  await browser.runtime.sendMessage({ type: "display", message: bookmarks_per_instance });
}

async function fetch_received(message=true){
  let bookmarks_per_instance = await get_bookmarks_per_instance(message)
  await display_bookmarks_per_instance(bookmarks_per_instance);
  if(message){
    notify_complete('fetch complete')
  }
  browser.runtime.sendMessage({ type: "button1_reactivate", message: null });
}

async function import_received(){
  let bookmarks_per_instance = await get_bookmarks_per_instance(false)
  await import_bookmarks_per_instance(bookmarks_per_instance);
  browser.runtime.sendMessage({ type: "button2_reactivate", message: null });
}

browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "fetch") {
      fetch_received(message.message)
    }
  else if (message.type === "import") {
    import_received(message.message)
  }
  else if (message.type === "reset_alarm"){
    reset_alarm()
  }
});

//open popup onclick
browser.browserAction.onClicked.addListener(() => {
  browser.browserAction.openPopup();
});

//do default settings on load
async function default_settings(){
    const instances = await get_data_store("instances")
    const alarms = await get_data_store("instances")

    if(instances && alarms) {
      return
    }

    if(!instances){
        await browser.storage.sync.set({ instances: json_instances_example });
    }
    if(!alarms){
      await browser.storage.sync.set({ alarms: json_alarms_example });
    }

    console.log('example settings applied')
}

//background startup order
async function first_load(){
  await default_settings()
  await reset_alarm()
}

first_load()