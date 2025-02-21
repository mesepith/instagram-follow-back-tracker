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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Scrape all followers
    await scrapeAllUsers("Followers");
  }
  
  // Function to open the following modal and scrape all following
  async function openAndScrapeFollowing() {
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Scrape all following
    await scrapeAllUsers("Following");
  }
  
  // Helper function to wait for an element to appear in the DOM
  function waitForElement(selector, timeout = 5000) {
    return new Promise(resolve => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }
  
      const startTime = Date.now();
      const observer = new MutationObserver(mutations => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        } else if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(null);
        }
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }
  
  // Function to scrape all users from the modal
  async function scrapeAllUsers(type) {
    // Find the dialog
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) {
      alert(`${type} modal not found.`);
      return;
    }
    
    // Find the scrollable container - trying multiple approaches
    let scrollableContainer = null;
    
    // Approach 1: Look for a div with overflow style
    const potentialContainers = dialog.querySelectorAll('div');
    for (const container of potentialContainers) {
      const style = window.getComputedStyle(container);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollableContainer = container;
        break;
      }
    }
    
    // Approach 2: If still not found, look for a specific pattern in Instagram's layout
    if (!scrollableContainer) {
      // Instagram often has a specific structure with a main div inside the dialog
      const mainContent = dialog.querySelector('div > div > div > div > div');
      if (mainContent) {
        scrollableContainer = mainContent;
      }
    }
    
    // Approach 3: Last resort - use the dialog itself
    if (!scrollableContainer) {
      scrollableContainer = dialog;
    }
    
    console.log("Found scrollable container:", scrollableContainer);
    
    // Create a set to store unique usernames
    const users = new Set();
    let previousHeight = 0;
    let previousUserCount = 0;
    let noChangeCount = 0;
    let maxNoChangeCount = 5; // If no new users found after 5 scrolls, assume we're done
    
    // Function to extract users from the current view
    function extractUsers() {
      // Get all user items from the list
      const userRows = scrollableContainer.querySelectorAll('div[role="button"]');
      console.log(`Found ${userRows.length} user rows`);
      
      userRows.forEach(row => {
        // Extract username from the user row
        const usernameElement = row.querySelector('span');
        if (usernameElement && usernameElement.textContent) {
          const username = usernameElement.textContent.trim();
          if (username && username.length > 0 && !username.includes(' ')) {
            users.add(username);
          }
        }
      });
      
      // Alternative method: look for links
      const userLinks = scrollableContainer.querySelectorAll('a[href^="/"]');
      userLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/p/') && !href.includes('/explore/')) {
          const username = href.replace('/', '').split('/')[0];
          if (username && username.length > 0 && !username.includes(' ')) {
            users.add(username);
          }
        }
      });
      
      console.log(`Total unique users found: ${users.size}`);
    }
    
    // Initial extraction
    extractUsers();
    
    // Scroll to load more users
    while (noChangeCount < maxNoChangeCount) {
      // Scroll down
      scrollableContainer.scrollTop = scrollableContainer.scrollHeight;
      
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract newly loaded users
      extractUsers();
      
      // Check if we found new users
      if (users.size === previousUserCount) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
        previousUserCount = users.size;
      }
    }
    
    console.log(`Finished scraping. Found ${users.size} total users.`);
    
    // Create and display the results page
    displayResults(Array.from(users), type);
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
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    container.appendChild(header);
    
    // Add search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search users...';
    searchInput.style.width = '100%';
    searchInput.style.padding = '12px';
    searchInput.style.marginBottom = '20px';
    searchInput.style.boxSizing = 'border-box';
    searchInput.style.border = '1px solid #dbdbdb';
    searchInput.style.borderRadius = '4px';
    searchInput.style.fontSize = '14px';
    
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      document.querySelectorAll('.user-item').forEach(item => {
        const username = item.querySelector('a').textContent.toLowerCase();
        item.style.display = username.includes(searchTerm) ? 'block' : 'none';
      });
      
      // Update count of visible items
      const visibleCount = Array.from(document.querySelectorAll('.user-item'))
        .filter(item => item.style.display !== 'none').length;
      title.textContent = `${type} (${visibleCount} of ${users.length})`;
    });
    
    container.appendChild(searchInput);
    
    // Show "No users found" message if empty
    if (users.length === 0) {
      const noUsersMsg = document.createElement('div');
      noUsersMsg.textContent = "No users found. Try again or check if you're on a profile page.";
      noUsersMsg.style.padding = '20px';
      noUsersMsg.style.textAlign = 'center';
      noUsersMsg.style.color = '#8e8e8e';
      container.appendChild(noUsersMsg);
    } else {
      // Add user list
      const userList = document.createElement('div');
      userList.style.display = 'grid';
      userList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
      userList.style.gap = '10px';
      
      users.sort().forEach(username => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.style.padding = '10px';
        userItem.style.border = '1px solid #dbdbdb';
        userItem.style.borderRadius = '4px';
        userItem.style.transition = 'background-color 0.2s ease';
        userItem.style.backgroundColor = '#f9f9f9';
        
        userItem.onmouseover = function() {
          this.style.backgroundColor = '#f0f0f0';
        };
        
        userItem.onmouseout = function() {
          this.style.backgroundColor = '#f9f9f9';
        };
        
        const link = document.createElement('a');
        link.href = `https://instagram.com/${username}`;
        link.textContent = username;
        link.style.textDecoration = 'none';
        link.style.color = '#0095f6';
        link.style.fontWeight = '500';
        link.style.display = 'block';
        link.target = '_blank';
        
        userItem.appendChild(link);
        userList.appendChild(userItem);
      });
      
      container.appendChild(userList);
    }
    
    // Add to document
    document.body.appendChild(container);
    
    // Focus on search input
    searchInput.focus();
  }