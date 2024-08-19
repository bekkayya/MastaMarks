

//populate html popup
let instances_container = null
async function display_bookmarks_per_instance(bookmarks_per_instance) {
    const popup_body = document.body;
    
    if(instances_container){
        instances_container.remove();
    }

    instances_container = document.createElement('div');

    for(const instance of bookmarks_per_instance){
        const instance_container = document.createElement('div');

        const collapsible_container = document.createElement('details');
        collapsible_container.style.display = 'inline';

        const summary = document.createElement('summary');
        summary.textContent = `(${instance.bookmarks.length}) ${instance.url}`;
        collapsible_container.appendChild(summary);
        
        const content = document.createElement('div');
        for(const item of instance.bookmarks){
            const url_div = document.createElement('div');
            url_div.textContent = `${item.url}`;
            url_div.style.fontSize = '0.8em';
            content.appendChild(url_div);
    
            const comment_div = document.createElement('div');
            comment_div.textContent = `${item.content}`;
            comment_div.style.fontSize = '0.5em';
            content.appendChild(comment_div);
    
            content.appendChild(document.createElement('br'));
        }
        collapsible_container.appendChild(content);

        const guiContainer = document.createElement('div');
        guiContainer.style.display = 'inline';

        const instance_checkmark_result = await browser.storage.sync.get(instance.url + "_instance_checkmark")
        const instance_checkmark_checked = Object.values(instance_checkmark_result)[0]
        var instance_checkbox = document.createElement('input');
        instance_checkbox.type = 'checkbox';
        instance_checkbox.id = 'checkbox2'; 
        instance_checkbox.name = 'checkbox2';
        instance_checkbox.checked = instance_checkmark_checked
        instance_checkbox.addEventListener('change', function(event) {
            browser.storage.sync.set({[instance.url + "_instance_checkmark"]: event.target.checked});
        });
        guiContainer.appendChild(instance_checkbox)

        instance_container.appendChild(guiContainer);
        instance_container.appendChild(collapsible_container);

        instances_container.appendChild(instance_container)
    }

    popup_body.appendChild(instances_container);
}

//recurse through bookmarks to find folders, set selected
async function populate_dropdown(selected, items, level) {
    var dropdown = document.getElementById("folders");

    items.forEach(function(item) {
      if (item.type === "folder") {
        var option = document.createElement("option");
        option.textContent = "  ".repeat(level) + item.title;
        option.value = item.id;
        dropdown.appendChild(option);
        
        if (selected == item.id){
            dropdown.selectedIndex = dropdown.length-1
        }
        populate_dropdown(selected, item.children, level + 1);
      }
    });
}

//button display helpers

async function enable_button(button){
    const button_element = document.getElementById(button)
    if(button_element){
        button_element.disabled = false
        button_element.classList.remove('disabled-button');
    }
}

async function disable_button(button){
    const button_element = document.getElementById(button)
    if(button_element){
        button_element.disabled = true
        button_element.classList.add('disabled-button');
    }
}

//html element listeners ----------

browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    //console.log(message.type, message.message)
    if (message.type === "display") {
        display_bookmarks_per_instance(message.message)
    }
    else if(message.type == "button1_reactivate"){
        enable_button('button1')
        enable_button('button2')
    }
    else if(message.type == "button2_reactivate"){
        enable_button('button1')
        enable_button('button2')
    }
});

//buttons 1 (fetch)
document.getElementById('button1').addEventListener('click', function() {
    disable_button('button1')
    disable_button('button2')
    browser.runtime.sendMessage({ type: "fetch", message: true });
});

//button 2 (import)
document.getElementById('button2').addEventListener('click', function() {
    disable_button('button1')
    disable_button('button2')
    browser.runtime.sendMessage({ type: "import", message: null });
});

//load popup
document.addEventListener("DOMContentLoaded", function() {
    browser.alarms.get("import_alarm").then(function(result) {
        const timer = setInterval(function() {
            if(result){
                const alarm_time = new Date(result.scheduledTime)
                const diff_time = alarm_time - Date.now()
                const duration = new Date(diff_time);

                //const days = duration.getUTCDate() - 1;
                const hours = duration.getUTCHours();
                const minutes = duration.getUTCMinutes();
                const seconds = duration.getUTCSeconds();
      
                document.getElementById('countdown').innerText = `next import in ${hours}h ${minutes}m ${seconds}s`;
            }
        }, 1000);
    });

    //populate folder dropdown
    browser.bookmarks.getTree().then(function(bookmarks) {
        browser.storage.sync.get("selected_folder").then(function(result) {
            populate_dropdown(result.selected_folder, bookmarks[0].children, 0);
        });
    });

    //load values for static checkmarks
    browser.storage.sync.get("show_newest_checkmark").then(function(show_newest_checked) {
        document.getElementById("checkbox1").checked = show_newest_checked.show_newest_checkmark
    });

    //override fetch to only display local store on popup
    browser.runtime.sendMessage({ type: "fetch", message: false });
});

// Listen for changes in the dropdown selection
document.getElementById("folders").addEventListener("change", function() {
    var selected_folderId = this.options[this.selectedIndex].value;
    browser.storage.sync.set({ "selected_folder": selected_folderId });
});

//static checkbox changed
document.getElementById("checkbox1").addEventListener('change', function(event) {
    browser.storage.sync.set({["show_newest_checkmark"]: event.target.checked}).then(
        browser.runtime.sendMessage({ type: "fetch", message: false }))
});