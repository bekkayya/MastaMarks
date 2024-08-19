async function saveTextbox1(e) {
    e.preventDefault();
    await browser.storage.sync.set({ instances: document.querySelector("#textbox1").value, });
    console.log("instances json updated")
}

async function saveTextbox2(e) {
    e.preventDefault();
    await browser.storage.sync.set({ alarms: document.querySelector("#textbox2").value, });
    browser.runtime.sendMessage({ type: "reset_alarm", message: null });
    console.log("alarms json updated")
}

async function restoreOptions() {
    const instances = await browser.storage.sync.get("instances");
    document.querySelector("#textbox1").value = instances.instances;

    const alarms = await browser.storage.sync.get("alarms");
    document.querySelector("#textbox2").value = alarms.alarms;
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#textbox1").addEventListener("change", saveTextbox1)
document.querySelector("#textbox2").addEventListener("change", saveTextbox2)

//buttons 1 (clear cache)
document.getElementById('button1').addEventListener('click', function() {
    browser.storage.local.clear()
});

