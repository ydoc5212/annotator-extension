import { Annotation, AnnotationStorage } from '../types';

const STORAGE_KEY = 'web_annotator_data';
const ENABLED_STATE_KEY = 'web_annotator_enabled_state';

export async function saveAnnotations(url: string, annotations: Annotation[]): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const storage: AnnotationStorage = result[STORAGE_KEY] || {};
    storage[url] = annotations;
    await chrome.storage.local.set({ [STORAGE_KEY]: storage });
  } catch (error) {
    console.error('Error saving annotations:', error);
  }
}

export async function loadAnnotations(url: string): Promise<Annotation[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const storage: AnnotationStorage = result[STORAGE_KEY] || {};
    return storage[url] || [];
  } catch (error) {
    console.error('Error loading annotations:', error);
    return [];
  }
}

export async function clearAnnotations(url: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const storage: AnnotationStorage = result[STORAGE_KEY] || {};
    delete storage[url];
    await chrome.storage.local.set({ [STORAGE_KEY]: storage });
  } catch (error) {
    console.error('Error clearing annotations:', error);
  }
}

export async function saveEnabledState(url: string, isEnabled: boolean): Promise<void> {
  try {
    const result = await chrome.storage.local.get(ENABLED_STATE_KEY);
    const states: { [url: string]: boolean } = result[ENABLED_STATE_KEY] || {};
    states[url] = isEnabled;
    await chrome.storage.local.set({ [ENABLED_STATE_KEY]: states });
  } catch (error) {
    console.error('Error saving enabled state:', error);
  }
}

export async function loadEnabledState(url: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(ENABLED_STATE_KEY);
    const states: { [url: string]: boolean } = result[ENABLED_STATE_KEY] || {};
    // Return true if this URL has annotations, false otherwise
    if (states[url] !== undefined) {
      return states[url];
    }
    // Check if URL has annotations - if so, enable by default
    const annotations = await loadAnnotations(url);
    return annotations.length > 0;
  } catch (error) {
    console.error('Error loading enabled state:', error);
    return false;
  }
}
