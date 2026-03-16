// Popup script to toggle the annotator on/off

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getEnabledState(url: string): Promise<boolean> {
  const result = await chrome.storage.local.get('web_annotator_enabled_state');
  const states = result.web_annotator_enabled_state || {};
  return states[url] || false;
}

async function setEnabledState(url: string, isEnabled: boolean): Promise<void> {
  const result = await chrome.storage.local.get('web_annotator_enabled_state');
  const states = result.web_annotator_enabled_state || {};
  states[url] = isEnabled;
  await chrome.storage.local.set({ web_annotator_enabled_state: states });
}

async function updateUI() {
  const tab = await getCurrentTab();
  if (!tab.url) return;

  const isEnabled = await getEnabledState(tab.url);

  const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLDivElement;

  if (isEnabled) {
    toggleBtn.textContent = 'Disable Annotator';
    toggleBtn.classList.add('disabled');
    status.textContent = 'Currently: ON';
    status.className = 'enabled';
  } else {
    toggleBtn.textContent = 'Enable Annotator';
    toggleBtn.classList.remove('disabled');
    status.textContent = 'Currently: OFF';
    status.className = 'disabled';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await updateUI();

  const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;

  toggleBtn.addEventListener('click', async () => {
    const tab = await getCurrentTab();
    if (!tab.url || !tab.id) return;

    const currentState = await getEnabledState(tab.url);
    const newState = !currentState;

    await setEnabledState(tab.url, newState);

    // Send message to content script to update
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_ANNOTATOR',
        isEnabled: newState
      });
    } catch (e) {
      // Content script might not be loaded yet, reload the tab
      chrome.tabs.reload(tab.id);
    }

    await updateUI();
  });
});
