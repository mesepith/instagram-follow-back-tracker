document.getElementById("checkBtn").addEventListener("click", () => {
    chrome.scripting.executeScript({
        target: { tabId: chrome.tabs.TAB_ID_CURRENT },
        files: ["content.js"]
    });
});

chrome.storage.local.get("notFollowingBack", (data) => {
    let list = data.notFollowingBack || [];
    let resultList = document.getElementById("resultList");
    resultList.innerHTML = "";
    
    list.forEach(user => {
        let li = document.createElement("li");
        li.textContent = user;
        resultList.appendChild(li);
    });
});
