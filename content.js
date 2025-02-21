async function waitForElement(selector, timeout = 10000) {
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

        let lastHeight = 0;
        let scrollAttempts = 0;

        while (scrollAttempts < 20) { 
            let users = dialog.querySelectorAll('span a[role="link"]');  // 🔥 Corrected selector for usernames

            users.forEach(user => {
                let username = user.innerText;
                if (!userList.includes(username)) {
                    userList.push(username);
                }
            });

            dialog.scrollBy(0, 1000);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for new users to load
            
            let newHeight = dialog.scrollHeight;
            if (newHeight === lastHeight) {
                scrollAttempts++;
            } else {
                scrollAttempts = 0; // Reset attempts if new content loads
            }
            lastHeight = newHeight;

            if (users.length === userList.length) break; // Stop if no new users are found
        }

        console.log(`${type} users:`, userList);
        resolve(userList);
    });
}


async function fetchFollowData() {
    try {
        console.log("Fetching follow data...");

        const currentURL = window.location.href;
        const usernameMatch = currentURL.match(/instagram\.com\/([^\/?]+)\/?/);
        if (!usernameMatch || usernameMatch[1] === "accounts" || usernameMatch[1] === "direct") {
            alert("Please go to your Instagram profile page.");
            return;
        }

        const username = usernameMatch[1];
        console.log(`Detected username: ${username}`);

        let followingBtn = await waitForElement(`a[href="/${username}/following/"]`);
        let followersBtn = await waitForElement(`a[href="/${username}/followers/"]`);

        if (!followingBtn || !followersBtn) {
            alert("Couldn't find the follow lists. Ensure you're logged in and on your profile.");
            return;
        }

        // Click "Following" and wait for modal
        followingBtn.click();
        console.log("Opening Following list...");
        await waitForElement(`[role="dialog"]`);
        let following = await getUserList("Following");

        // Click "Followers" and wait for modal
        followersBtn.click();
        console.log("Opening Followers list...");
        await waitForElement(`[role="dialog"]`);
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
