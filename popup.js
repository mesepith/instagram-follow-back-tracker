// popup.js
document.getElementById('checkFollowers').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "checkFollowers"});
    });
  });
  
  document.getElementById('checkFollowing').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "checkFollowing"});
    });
  });