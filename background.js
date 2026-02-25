// ===========================
//  Mazilla — Background SW
// ===========================

// Open the sidebar when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Set the side panel to be available on all URLs
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Relay messages between content script and sidebar
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Forward content → sidebar messages
  if (
    msg.type === 'MAZILLA_ELEMENT_PICKED' ||
    msg.type === 'MAZILLA_PICK_CANCELLED' ||
    msg.type === 'MAZILLA_CLICK_RESULT'
  ) {
    // Broadcast to all extension views (sidebar)
    chrome.runtime.sendMessage(msg).catch(() => {
      // sidebar may not be open
    });
  }
  sendResponse({ relayed: true });
  return true;
});
