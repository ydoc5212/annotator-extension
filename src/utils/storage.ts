import { Annotation, AnnotationStorage } from '../types';

const STORAGE_KEY = 'web_annotator_data';
const ENABLED_STATE_KEY = 'web_annotator_enabled_state';

// Use localStorage instead of chrome.storage to survive extension reloads
export async function saveAnnotations(url: string, annotations: Annotation[]): Promise<void> {
  try {
    const storageData = localStorage.getItem(STORAGE_KEY);
    const storage: AnnotationStorage = storageData ? JSON.parse(storageData) : {};
    storage[url] = annotations;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Error saving annotations:', error);
  }
}

export async function loadAnnotations(url: string): Promise<Annotation[]> {
  try {
    const storageData = localStorage.getItem(STORAGE_KEY);
    const storage: AnnotationStorage = storageData ? JSON.parse(storageData) : {};
    return storage[url] || [];
  } catch (error) {
    console.error('Error loading annotations:', error);
    return [];
  }
}

export async function clearAnnotations(url: string): Promise<void> {
  try {
    const storageData = localStorage.getItem(STORAGE_KEY);
    const storage: AnnotationStorage = storageData ? JSON.parse(storageData) : {};
    delete storage[url];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Error clearing annotations:', error);
  }
}

export async function saveEnabledState(url: string, isEnabled: boolean): Promise<void> {
  try {
    const statesData = localStorage.getItem(ENABLED_STATE_KEY);
    const states: { [url: string]: boolean } = statesData ? JSON.parse(statesData) : {};
    states[url] = isEnabled;
    localStorage.setItem(ENABLED_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Error saving enabled state:', error);
  }
}

export async function loadEnabledState(url: string): Promise<boolean> {
  try {
    const statesData = localStorage.getItem(ENABLED_STATE_KEY);
    const states: { [url: string]: boolean } = statesData ? JSON.parse(statesData) : {};
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
