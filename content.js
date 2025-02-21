async function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        let element = document.querySelector(selector);
        if (element) return resolve(element);

        const observer = new MutationObserver(() => {
            let element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(`Timeout: Element ${selector} not found`);
        }, timeout);
    });
}

async function getUserList(type) {
    return new Promise(async (resolve, reject) => {
        let userList = [];
        
        console.log(`Waiting for ${type} dialog...`);
        let dialog = await waitForElement(`[role="dialog"]`, 10000).catch(() => null);
        
        if (!dialog) {
            reject(`Could not find ${type} dialog`);
            return;
        }

        console.log(`${type} dialog found, extracting users...`);

        let interval = setInterval(() => {
            let users = dialog.querySelectorAll("a[role='link'] span");
            users.forEach(user => {
                let username = user.innerText;
                if (!userList.includes(username)) {
                    userList.push(username);
                }
            });

            dialog.scrollBy(0, 500);
            if (users.length === userList.length) {
                clearInterval(interval);
                resolve(userList);
            }
        }, 1000);
    });
}

async function fetchFollowData() {
    try {
        console.log("Fetching follow data...");

        // Get the current URL and extract username
        const currentURL = window.location.href;
        const usernameMatch = currentURL.match(/instagram\.com\/([^\/?]+)\/?/);
        if (!usernameMatch || usernameMatch[1] === "accounts" || usernameMatch[1] === "direct") {
            alert("Please go to your Instagram profile page.");
            return;
        }

        const username = usernameMatch[1];
        console.log(`Detected username: ${username}`);

        // Wait for the "Following" button
        let followingBtn = await waitForElement(`a[href="/${username}/following/"]`);
        let followersBtn = await waitForElement(`a[href="/${username}/followers/"]`);

        if (!followingBtn || !followersBtn) {
            alert("Couldn't find the follow lists. Ensure you're logged in and on your profile.");
            return;
        }

        // Click "Following" and wait for modal
        followingBtn.click();
        console.log("Opening Following list...");
        await waitForElement(`[role="dialog"]`); // Wait for modal to appear
        let following = await getUserList("Following");
        console.log('following:', following);

        // Click "Followers" and wait for modal
        followersBtn.click();
        console.log("Opening Followers list...");
        await waitForElement(`[role="dialog"]`); // Wait for modal to appear
        let followers = await getUserList("Followers");
        console.log('followers:', followers);
        // Find users not following back
        let notFollowingBack = following.filter(user => !followers.includes(user));
        console.log("Users not following back:", notFollowingBack);

        // Store in Chrome local storage for popup.js to read
        chrome.storage.local.set({ "notFollowingBack": notFollowingBack });

        alert(`Found ${notFollowingBack.length} users not following you back!`);
    } catch (error) {
        console.error("Error:", error);
        alert("Error fetching data. Try again.");
    }
}

// Ensure this runs when script executes
fetchFollowData();
