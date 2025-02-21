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
        let followingBtn = document.querySelector('a[href$="/following/"]');
        let followersBtn = document.querySelector('a[href$="/followers/"]');

        if (!followingBtn || !followersBtn) {
            alert("Please go to your Instagram profile page.");
            return;
        }

        followingBtn.click();
        let following = await getUserList("Following");
        
        followersBtn.click();
        let followers = await getUserList("Followers");

        let notFollowingBack = following.filter(user => !followers.includes(user));

        chrome.storage.local.set({ "notFollowingBack": notFollowingBack });
        alert(`Found ${notFollowingBack.length} users not following you back!`);
    } catch (error) {
        console.error(error);
        alert("Error fetching data. Try again.");
    }
}

fetchFollowData();
