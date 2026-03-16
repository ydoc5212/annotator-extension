chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY" });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "OPEN_FEED") {
    const feedUrl = chrome.runtime.getURL("src/feed/index.html");
    chrome.tabs.create({ url: feedUrl });
  }
});
