// content.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checkFollowers") {
      openAndScrapeFollowers();
    } else if (request.action === "checkFollowing") {
      openAndScrapeFollowing();
    }
  });
  
  // Function to open the followers modal and scrape all followers
  async function openAndScrapeFollowers() {

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for modal to load

    // Find and click the followers link - more robust selector
    const followersLinks = document.querySelectorAll('a');
    let followersLink = null;
    
    for (const link of followersLinks) {
      if (link.textContent && link.textContent.includes('follower')) {
        followersLink = link;
        break;
      }
    }
    
    if (!followersLink) {
      alert("Followers link not found. Make sure you're on an Instagram profile page.");
      return;
    }
    
    // Click the link
    followersLink.click();
    
    // Wait for the modal to appear
    const dialog = await waitForElement('div[role="dialog"]');
    if (!dialog) {
      alert("Followers modal did not appear.");
      return;
    }
    
    // Give the modal a moment to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scrape all followers
    await scrapeAllUsers("Followers");
  }
  
  // Function to open the following modal and scrape all following
  async function openAndScrapeFollowing() {

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for modal to load

    // Find and click the following link - more robust selector
    const followingLinks = document.querySelectorAll('a');
    let followingLink = null;
    
    for (const link of followingLinks) {
      if (link.textContent && link.textContent.includes('following')) {
        followingLink = link;
        break;
      }
    }
    
    if (!followingLink) {
      alert("Following link not found. Make sure you're on an Instagram profile page.");
      return;
    }
    
    // Click the link
    followingLink.click();
    
    // Wait for the modal to appear
    const dialog = await waitForElement('div[role="dialog"]');
    if (!dialog) {
      alert("Following modal did not appear.");
      return;
    }
    
    // Give the modal a moment to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scrape all following
    await scrapeAllUsers("Following");
  }
  
  // Helper function to wait for an element to appear in the DOM
  function waitForElement(selector, timeout = 10000) { // Increased timeout
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}
  
  // Helper function to simulate scrolling
  function simulateScroll(element, distance) {
    element.scrollTop += distance;
  }
  
  async function scrapeAllUsers(type) {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) {
        alert(`${type} modal not found.`);
        return;
    }

    // Find the scrollable container
    let scrollableContainer = null;
    const allDivs = dialog.querySelectorAll('div');
    for (const div of allDivs) {
        if (div.scrollHeight > div.clientHeight && 
            window.getComputedStyle(div).overflowY !== 'hidden') {
            scrollableContainer = div;
            break;
        }
    }

    if (!scrollableContainer) {
        alert("Scrollable container not found. Please try again.");
        return;
    }

    // Debug the container
    console.log('Found scrollable container:', scrollableContainer);
    console.log('Container dimensions:', {
        scrollHeight: scrollableContainer.scrollHeight,
        clientHeight: scrollableContainer.clientHeight,
        children: scrollableContainer.children.length
    });

    // Test if we can find any user elements
    const testItems = scrollableContainer.querySelectorAll('a, div[role="button"]');
    console.log('Initial test for user elements:', testItems.length);

    // Clear any existing data
    const users = new Set();
    const userObjects = new Map();

    // Debug log
    console.log("Starting to scrape users for:", type);

    // Progress overlay
    const progressOverlay = document.createElement('div');
    progressOverlay.style.position = 'fixed';
    progressOverlay.style.top = '10px';
    progressOverlay.style.right = '10px';
    progressOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    progressOverlay.style.color = 'white';
    progressOverlay.style.padding = '10px';
    progressOverlay.style.borderRadius = '5px';
    progressOverlay.style.zIndex = '10000';
    document.body.appendChild(progressOverlay);

    async function extractUsers() {
        // Try different selectors for user items
        const selectors = [
            'div[role="dialog"] div[style*="height"] a', // Modern Instagram structure
            'div[role="dialog"] div[role="button"]',     // Alternative structure
            'div[role="dialog"] a[role="link"]'          // Another common structure
        ];
    
        let userItems = [];
        for (const selector of selectors) {
            userItems = scrollableContainer.querySelectorAll(selector);
            if (userItems.length > 0) {
                console.log(`Found users using selector: ${selector}`);
                break;
            }
        }
    
        let usersFound = false;
    
        userItems.forEach(item => {
            try {
                let username = '';
                let fullName = '';
                let profileImage = '';
    
                // Method 1: Try getting username from href
                if (item.href) {
                    username = item.href.split('/').filter(Boolean).pop();
                }
    
                // Method 2: Try getting username from spans
                if (!username) {
                    const spans = Array.from(item.querySelectorAll('span')).filter(span => 
                        span.textContent && span.textContent.trim()
                    );
    
                    if (spans.length > 0) {
                        username = spans[0].textContent.trim();
                        if (spans.length > 1) {
                            fullName = spans[1].textContent.trim();
                        }
                    }
                }
    
                // Method 3: Try getting username from div text
                if (!username) {
                    const divs = item.querySelectorAll('div');
                    for (const div of divs) {
                        if (div.textContent && div.textContent.trim() && !div.textContent.includes(' ')) {
                            username = div.textContent.trim();
                            break;
                        }
                    }
                }
    
                // Get profile image
                const img = item.querySelector('img');
                if (img) {
                    profileImage = img.src;
                }
    
                // Debug the extraction
                console.log('Extracted data:', { username, fullName, profileImage });
    
                if (username && !users.has(username)) {
                    // Remove any @ symbol if present
                    username = username.replace('@', '');
    
                    // Only add if it looks like a valid username
                    if (username.length > 0 && !username.includes(' ')) {
                        users.add(username);
                        userObjects.set(username, {
                            username,
                            fullName,
                            profileImage
                        });
                        usersFound = true;
                        console.log("Added user:", { username, fullName, profileImage });
                    }
                }
            } catch (e) {
                console.error("Error extracting user:", e);
            }
        });
    
        progressOverlay.textContent = `Loading ${type}... (${users.size} found)`;
    
        // Debug output
        console.log(`Current extraction found ${userItems.length} items, total unique users: ${users.size}`);
    
        return usersFound;
    }
    

    let previousHeight = 0;
    let noChangeCount = 0;
    const maxNoChangeCount = 5;

    while (noChangeCount < maxNoChangeCount) {
        const currentHeight = scrollableContainer.scrollHeight;
    
        // Extract users
        const foundUsers = await extractUsers();
        console.log(`Scroll iteration - Found users: ${foundUsers}, Total users: ${users.size}`);
    
        // Scroll down in smaller increments
        const scrollStep = Math.min(300, scrollableContainer.scrollHeight / 4);
        scrollableContainer.scrollTop += scrollStep;
    
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
    
        if (currentHeight === scrollableContainer.scrollHeight) {
            noChangeCount++;
            console.log(`No height change detected. Attempt ${noChangeCount} of ${maxNoChangeCount}`);
    
            if (noChangeCount === maxNoChangeCount - 1) {
                // Final attempt: scroll to very bottom
                scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
                await new Promise(resolve => setTimeout(resolve, 2000));
                await extractUsers();
            }
        } else {
            noChangeCount = 0;
            previousHeight = currentHeight;
        }
    
        // Add random delay
        await new Promise(resolve => 
            setTimeout(resolve, Math.random() * 800 + 700)
        );
    }
    

    // Final extraction to make sure we got everyone
    await extractUsers();

    // Debug log
    console.log("Finished scraping. Total users found:", users.size);

    // Remove progress overlay
    document.body.removeChild(progressOverlay);

    // Convert the Map to an array of user objects
    const userArray = Array.from(userObjects.values());

    // Display results
    displayResults(userArray, type);
}


// Add this helper function to ensure the modal is fully loaded
async function waitForModalToLoad() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        const checkModal = setInterval(() => {
            const dialog = document.querySelector('div[role="dialog"]');
            if (dialog) {
                clearInterval(checkModal);
                resolve(true);
            }
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(checkModal);
                resolve(false);
            }
        }, 500);
    });
}

// Update the open and scrape functions
async function openAndScrapeFollowers() {
    const followersLinks = document.querySelectorAll('a');
    let followersLink = null;
    for (const link of followersLinks) {
        if (link.textContent && link.textContent.includes('follower')) {
            followersLink = link;
            break;
        }
    }

    if (!followersLink) {
        alert("Followers link not found. Make sure you're on an Instagram profile page.");
        return;
    }

    followersLink.click();

    // Wait for modal to load
    const modalLoaded = await waitForModalToLoad();
    if (!modalLoaded) {
        alert("Modal failed to load");
        return;
    }

    // Wait additional time for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start scraping
    await scrapeAllUsers("Followers");
}

// Similar update for openAndScrapeFollowing
async function openAndScrapeFollowing() {
    const followingLinks = document.querySelectorAll('a');
    let followingLink = null;
    for (const link of followingLinks) {
        if (link.textContent && link.textContent.includes('following')) {
            followingLink = link;
            break;
        }
    }

    if (!followingLink) {
        alert("Following link not found. Make sure you're on an Instagram profile page.");
        return;
    }

    followingLink.click();

    // Wait for modal to load
    const modalLoaded = await waitForModalToLoad();
    if (!modalLoaded) {
        alert("Modal failed to load");
        return;
    }

    // Wait additional time for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start scraping
    await scrapeAllUsers("Following");
}

// Add this helper function to automate scrolling
function autoScroll(element) {
    return new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 100;
        let timer = setInterval(() => {
            let scrollHeight = element.scrollHeight;
            element.scrollTop = totalHeight;
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
            }
        }, 100);
    });
}

  
  // Function to display the results in a new page
  function displayResults(users, type) {
    // Close the modal if it exists
    const closeButton = document.querySelector('div[role="dialog"] button');
    if (closeButton) {
        closeButton.click();
    }

    console.log("Displaying results for users:", users); // Debug log

    // Create a container for our results
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.backgroundColor = 'white';
    container.style.zIndex = '9999';
    container.style.padding = '20px';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'auto';
    container.style.fontFamily = 'Arial, sans-serif';

    // Add a header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';
    header.style.padding = '10px 0';
    header.style.borderBottom = '1px solid #dbdbdb';

    const title = document.createElement('h2');
    title.textContent = `${type} (${users.length})`;
    title.style.margin = '0';

    // Add export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export to CSV';
    exportBtn.style.padding = '8px 16px';
    exportBtn.style.backgroundColor = '#0095f6';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.cursor = 'pointer';
    exportBtn.onclick = () => {
        exportToCSV(users, `instagram_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}`);
    };

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.backgroundColor = '#dc3545';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
        document.body.removeChild(container);
    };

    header.appendChild(title);
    header.appendChild(exportBtn);
    header.appendChild(closeBtn);
    container.appendChild(header);

    // Add search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search users...';
    searchInput.style.width = '100%';
    searchInput.style.padding = '10px';
    searchInput.style.marginBottom = '20px';
    searchInput.style.border = '1px solid #dbdbdb';
    searchInput.style.borderRadius = '4px';
    container.appendChild(searchInput);

    // Create user list container
    const userList = document.createElement('div');
    userList.style.display = 'grid';
    userList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    userList.style.gap = '10px';
    container.appendChild(userList);

    // Function to render users
    function renderUsers(filterText = '') {
        userList.innerHTML = ''; // Clear current list
        const filteredUsers = users.filter(user => 
            user.username.toLowerCase().includes(filterText.toLowerCase()) ||
            user.fullName.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filteredUsers.length === 0) {
            const noResults = document.createElement('div');
            noResults.textContent = 'No users found';
            noResults.style.textAlign = 'center';
            noResults.style.gridColumn = '1 / -1';
            noResults.style.padding = '20px';
            userList.appendChild(noResults);
            return;
        }

        filteredUsers.forEach(user => {
            const userCard = document.createElement('div');
            userCard.style.border = '1px solid #dbdbdb';
            userCard.style.borderRadius = '4px';
            userCard.style.padding = '10px';
            userCard.style.display = 'flex';
            userCard.style.alignItems = 'center';
            userCard.style.gap = '10px';

            if (user.profileImage) {
                const img = document.createElement('img');
                img.src = user.profileImage;
                img.style.width = '40px';
                img.style.height = '40px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                userCard.appendChild(img);
            }

            const userInfo = document.createElement('div');

            const usernameLink = document.createElement('a');
            usernameLink.href = `https://instagram.com/${user.username}`;
            usernameLink.textContent = user.username;
            usernameLink.target = '_blank';
            usernameLink.style.textDecoration = 'none';
            usernameLink.style.color = '#0095f6';
            usernameLink.style.fontWeight = 'bold';
            userInfo.appendChild(usernameLink);

            if (user.fullName) {
                const fullName = document.createElement('div');
                fullName.textContent = user.fullName;
                fullName.style.color = '#8e8e8e';
                fullName.style.fontSize = '14px';
                userInfo.appendChild(fullName);
            }

            userCard.appendChild(userInfo);
            userList.appendChild(userCard);
        });

        // Update title count
        title.textContent = `${type} (${filteredUsers.length} of ${users.length})`;
    }

    // Add search functionality
    searchInput.addEventListener('input', (e) => {
        renderUsers(e.target.value);
    });

    // Initial render
    renderUsers();

    // Add to document
    document.body.appendChild(container);
}

// Helper function to export to CSV
function exportToCSV(users, filename) {
    const csv = [
        ['Username', 'Full Name', 'Profile URL'],
        ...users.map(user => [
            user.username,
            user.fullName,
            `https://instagram.com/${user.username}`
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    a.click();
}