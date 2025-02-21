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
    return new Promise((resolve, reject) => {
        let userList = [];
        let dialog = document.querySelector(`[aria-label="${type}"]`);

        if (!dialog) {
            reject(`Could not find ${type} dialog`);
            return;
        }

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

        // Get the current URL
        const currentURL = window.location.href;

        // Check if we are on a user profile
        const usernameMatch = currentURL.match(/instagram\.com\/([^\/?]+)\/?/);
        if (!usernameMatch || usernameMatch[1] === "accounts" || usernameMatch[1] === "direct") {
            alert("Please go to your Instagram profile page.");
            return;
        }

        const username = usernameMatch[1];
        console.log(`Detected username: ${username}`);

        // Wait for "Following" and "Followers" buttons to appear
        let followingBtn = await waitForElement(`a[href="/${username}/following/"]`);
        let followersBtn = await waitForElement(`a[href="/${username}/followers/"]`);

        if (!followingBtn || !followersBtn) {
            alert("Couldn't find the follow lists. Ensure you're logged in and on your profile.");
            return;
        }

        // Click "Following" and scrape the list
        followingBtn.click();
        console.log("Opening Following list...");
        let following = await getUserList("Following");

        // Click "Followers" and scrape the list
        followersBtn.click();
        console.log("Opening Followers list...");
        let followers = await getUserList("Followers");

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
