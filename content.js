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

    // Find the scrollable container using multiple methods
    let scrollableContainer = null;

    // Method 1: Try to find by class pattern (Instagram often uses class names starting with '_a')
    const possibleContainers = dialog.querySelectorAll('div[class^="_a"]');
    for (const container of possibleContainers) {
        const style = window.getComputedStyle(container);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            scrollableContainer = container;
            break;
        }
    }

    // Method 2: If not found, look for any div with overflow-y scroll/auto
    if (!scrollableContainer) {
        const allDivs = dialog.querySelectorAll('div');
        for (const div of allDivs) {
            const style = window.getComputedStyle(div);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
                div.clientHeight > 100) {  // Must be reasonably tall
                scrollableContainer = div;
                break;
            }
        }
    }

    // Method 3: Try to find by structure (usually the modal has a specific hierarchy)
    if (!scrollableContainer) {
        const modalChildren = dialog.children;
        if (modalChildren.length > 0) {
            const firstChild = modalChildren[0];
            const potentialContainer = firstChild.querySelector('div > div > div');
            if (potentialContainer) {
                scrollableContainer = potentialContainer;
            }
        }
    }

    if (!scrollableContainer) {
        alert("Could not find scrollable container. Please try again.");
        return;
    }

    const users = new Set();
    const userObjects = new Map();
    let previousHeight = 0;
    let noChangeCount = 0;
    const maxNoChangeCount = 5;

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
        // Try multiple selectors for user items
        const userSelectors = [
            'div[role="button"]',
            'div[class*="user"]',
            'a[href^="/"]',
            'div._ab8w._ab94._ab97._ab9f._ab9k._ab9p._abcm'  // Common Instagram class for user items
        ];

        let userItems = [];
        for (const selector of userSelectors) {
            userItems = scrollableContainer.querySelectorAll(selector);
            if (userItems.length > 0) break;
        }

        userItems.forEach(item => {
            try {
                // Try multiple methods to get username
                let username = null;
                let fullName = '';
                let profileImage = '';

                // Method 1: From span
                const spans = item.querySelectorAll('span');
                for (const span of spans) {
                    const text = span.textContent?.trim();
                    if (text && !text.includes(' ') && text.length > 0) {
                        username = text;
                        break;
                    }
                }

                // Method 2: From href
                if (!username) {
                    const link = item.querySelector('a[href^="/"]');
                    if (link) {
                        const href = link.getAttribute('href');
                        username = href.split('/')[1];
                    }
                }

                // Get full name
                const nameElement = item.querySelectorAll('span')[1];
                if (nameElement) {
                    fullName = nameElement.textContent?.trim() || '';
                }

                // Get profile image
                const img = item.querySelector('img');
                if (img) {
                    profileImage = img.src;
                }

                if (username && !users.has(username)) {
                    users.add(username);
                    userObjects.set(username, {
                        username,
                        fullName,
                        profileImage
                    });
                }
            } catch (e) {
                console.error("Error extracting user:", e);
            }
        });
        progressOverlay.textContent = `Loading ${type}... (${users.size} found)`;
    }

    // Initial extraction
    await extractUsers();

    // Continuous scrolling
    while (noChangeCount < maxNoChangeCount) {
        const currentHeight = scrollableContainer.scrollHeight;

        // Scroll in smaller increments
        const scrollStep = Math.min(500, currentHeight / 4);
        for (let i = 0; i < 4; i++) {
            scrollableContainer.scrollTop += scrollStep;
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Extract new users
        await extractUsers();

        // Check if we've reached the bottom
        if (currentHeight === previousHeight) {
            noChangeCount++;
        } else {
            noChangeCount = 0;
            previousHeight = currentHeight;
        }

        // Random delay
        await new Promise(resolve => 
            setTimeout(resolve, Math.random() * 500 + 1000)
        );
    }

    // Remove progress overlay
    document.body.removeChild(progressOverlay);

    // Convert the Map to an array of user objects
    const userArray = Array.from(userObjects.values());

    // Display results
    displayResults(userArray, type);
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
    
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export to CSV';
    exportBtn.style.padding = '8px 16px';
    exportBtn.style.backgroundColor = '#0095f6';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.cursor = 'pointer';
    exportBtn.style.fontWeight = 'bold';
    exportBtn.style.marginRight = '10px';
    exportBtn.onclick = function() {
      exportToCSV(users, `instagram_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}`);
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.backgroundColor = '#0095f6';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.onclick = function() {
      document.body.removeChild(container);
    };
    
    const buttonContainer = document.createElement('div');
    buttonContainer.appendChild(exportBtn);
    buttonContainer.appendChild(closeBtn);
    
    header.appendChild(title);
    header.appendChild(buttonContainer);
    container.appendChild(header);
    
    // Add search and filter options
    const controlsRow = document.createElement('div');
    controlsRow.style.display = 'flex';
    controlsRow.style.marginBottom = '20px';
    controlsRow.style.gap = '10px';
    
    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search users...';
    searchInput.style.flex = '1';
    searchInput.style.padding = '12px';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.border = '1px solid #dbdbdb';
    searchInput.style.borderRadius = '4px';
    searchInput.style.fontSize = '14px';
    
    // Sort dropdown
    const sortSelect = document.createElement('select');
    sortSelect.style.padding = '12px';
    sortSelect.style.border = '1px solid #dbdbdb';
    sortSelect.style.borderRadius = '4px';
    sortSelect.style.backgroundColor = 'white';
    
    const sortOptions = [
      { value: 'username-asc', text: 'Username (A-Z)' },
      { value: 'username-desc', text: 'Username (Z-A)' }
    ];
    
    sortOptions.forEach(option => {
      const optElement = document.createElement('option');
      optElement.value = option.value;
      optElement.textContent = option.text;
      sortSelect.appendChild(optElement);
    });
    
    controlsRow.appendChild(searchInput);
    controlsRow.appendChild(sortSelect);
    container.appendChild(controlsRow);
    
    // Function to filter and sort users
    function updateUserList() {
      const searchTerm = searchInput.value.toLowerCase();
      const sortValue = sortSelect.value;
      
      // Filter users
      const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm) || 
        (user.fullName && user.fullName.toLowerCase().includes(searchTerm))
      );
      
      // Sort users
      filteredUsers.sort((a, b) => {
        if (sortValue === 'username-asc') {
          return a.username.localeCompare(b.username);
        } else if (sortValue === 'username-desc') {
          return b.username.localeCompare(a.username);
        }
        return 0;
      });
      
      // Update title with count
      title.textContent = `${type} (${filteredUsers.length} of ${users.length})`;
      
      // Clear existing list
      userList.innerHTML = '';
      
      // Show "No users found" message if empty
      if (filteredUsers.length === 0) {
        const noUsersMsg = document.createElement('div');
        noUsersMsg.textContent = "No users found matching your search.";
        noUsersMsg.style.padding = '20px';
        noUsersMsg.style.textAlign = 'center';
        noUsersMsg.style.color = '#8e8e8e';
        userList.appendChild(noUsersMsg);
      } else {
        // Rebuild user list
        filteredUsers.forEach(user => {
          const userItem = document.createElement('div');
          userItem.className = 'user-item';
          userItem.style.padding = '10px';
          userItem.style.border = '1px solid #dbdbdb';
          userItem.style.borderRadius = '4px';
          userItem.style.transition = 'background-color 0.2s ease';
          userItem.style.backgroundColor = '#f9f9f9';
          userItem.style.display = 'flex';
          userItem.style.alignItems = 'center';
          userItem.style.gap = '10px';
          
          userItem.onmouseover = function() {
            this.style.backgroundColor = '#f0f0f0';
          };
          
          userItem.onmouseout = function() {
            this.style.backgroundColor = '#f9f9f9';
          };
          
          // Add profile image if available
          if (user.profileImage) {
            const img = document.createElement('img');
            img.src = user.profileImage;
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            userItem.appendChild(img);
          }
          
          // Container for username and full name
          const userInfo = document.createElement('div');
          userInfo.style.flexGrow = '1';
          
          const link = document.createElement('a');
          link.href = `https://instagram.com/${user.username}`;
          link.textContent = user.username;
          link.style.textDecoration = 'none';
          link.style.color = '#0095f6';
          link.style.fontWeight = '500';
          link.style.display = 'block';
          link.target = '_blank';
          userInfo.appendChild(link);
          
          // Add full name if available
          if (user.fullName) {
            const nameSpan = document.createElement('span');
            nameSpan.textContent = user.fullName;
            nameSpan.style.color = '#8e8e8e';
            nameSpan.style.fontSize = '14px';
            userInfo.appendChild(nameSpan);
          }
          
          userItem.appendChild(userInfo);
          userList.appendChild(userItem);
        });
      }
    }
    
    // Event listeners for filtering and sorting
    searchInput.addEventListener('input', updateUserList);
    sortSelect.addEventListener('change', updateUserList);
    
    // Create user list container
    const userList = document.createElement('div');
    userList.style.display = 'grid';
    userList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    userList.style.gap = '10px';
    container.appendChild(userList);
    
    // Function to export to CSV
    function exportToCSV(data, filename) {
      // Create CSV content
      const csvContent = [
        // CSV header
        ['Username', 'Full Name', 'Profile URL'].join(','),
        // CSV rows
        ...data.map(user => [
          `"${user.username}"`,
          `"${user.fullName || ''}"`,
          `"https://instagram.com/${user.username}"`
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Initial population of the list
    updateUserList();
    
    // Add to document
    document.body.appendChild(container);
    
    // Focus on search input
    searchInput.focus();
  }