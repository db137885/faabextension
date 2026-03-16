// Inline Injection PoC for NFC
console.log("FAAB Advisor Extension loaded for inline injection!");

function injectInlineFAABBadges() {
    // 1. Find the data tables on the page. 
    // In a real scenario, you'd inspect the actual NFC DOM to find the specific table class or ID.
    // For this PoC, we look for table rows in the body.
    const tableRows = document.querySelectorAll('table tr');
    
    if (tableRows.length === 0) {
        console.log("FAAB Advisor: No tables found yet, retrying...");
        setTimeout(injectInlineFAABBadges, 1000);
        return;
    }

    console.log(`FAAB Advisor: Found ${tableRows.length} rows, injecting badges...`);

    // 2. Iterate through the rows and find the player name cell.
    // Assuming from the screenshot that "Player" is roughly the 4th column (index 3).
    // Note: This logic needs to be tailored to the exact HTML structure of nfc.shgn.com.
    
    tableRows.forEach((row, index) => {
        // Skip header rows if necessary
        if (index === 0) return; 

        // Get all cells in this row
        const cells = row.querySelectorAll('td');
        
        // Let's assume the 4th cell contains the player name (adjust based on actual NFC DOM)
        // If there are fewer cells or it's not a player row, continue.
        if (cells.length < 4) return;
        
        const playerCell = cells[3]; // 0-indexed, 4th column is 'Player' in the screenshot
        
        // Prevent duplicate injections
        if (playerCell.querySelector('.faab-inline-badge')) return;

        // In a real app, you would extract the player name here, e.g., playerCell.innerText,
        // send it to your backend, and get the specific bid amount.
        const mockBidInfo = { amount: Math.floor(Math.random() * 20) + 1, percentage: Math.floor(Math.random() * 15) + 1 };
        
        // 3. Create the inline badge container
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'faab-inline-badge';
        
        badgeSpan.innerHTML = `
            <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2338bdf8' width='12' height='12'><path d='M13 10V3L4 14h7v7l9-11h-7z'/></svg>" class="faab-icon" alt="bolt"/>
            <span class="faab-amount">$${mockBidInfo.amount}</span>
            <div class="faab-tooltip">
                <strong>Recommended Bid</strong><br/>
                Suggested: $${mockBidInfo.amount} (${mockBidInfo.percentage}%)<br/>
                <em>Click to adjust</em>
            </div>
        `;

        // Add click listener for future feature (e.g., opening a side panel)
        badgeSpan.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent clicking the row underneath
            alert(\`FAAB Advisor: You clicked the bid recommendation ($${mockBidInfo.amount})! This would open the calculator panel.\`);
        });

        // 4. Inject the badge directly into the cell next to the player name
        // We ensure the cell has relative positioning so the tooltip works correctly
        playerCell.style.position = 'relative';
        
        // Append the badge to the cell content
        playerCell.appendChild(badgeSpan);
    });
}

// Observe the DOM for dynamically loaded content
// NFC likely uses a modern frontend framework that loads tables asynchronously.
const observer = new MutationObserver((mutations) => {
    // Only run if nodes were added
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            injectInlineFAABBadges();
            break; // only need to run once per batch of mutations
        }
    }
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial run
// Use a timeout to wait for initial SPA render on nfc.shgn.com
setTimeout(injectInlineFAABBadges, 2000);
