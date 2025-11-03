// Background service worker to handle extension icon clicks

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Send toggle message to content script
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_ANNOTATOR' });
  } catch (error) {
    // Content script might not be loaded, reload the tab
    chrome.tabs.reload(tab.id);
  }
});
