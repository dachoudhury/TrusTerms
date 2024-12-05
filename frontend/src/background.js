console.log('[Terms Analyzer - Background] Background script loaded');

// Function to update badge
const updateBadge = (hasTerms) => {
  if (hasTerms) {
    chrome.action.setBadgeText({ text: '🔔' });  // Bell emoji
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red color
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
};

// Check initial state
chrome.storage.local.get(['termsContent'], (result) => {
  updateBadge(!!result.termsContent);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Terms Analyzer - Background] Message received:', request);
  console.log('[Terms Analyzer - Background] From:', sender.url);
  
  if (request.type === 'TERMS_FOUND') {
    console.log('[Terms Analyzer - Background] Terms found, attempting to save');
    chrome.storage.local.set({
      termsContent: request.content,
      termsUrl: request.url
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Terms Analyzer - Background] Error saving:', chrome.runtime.lastError);
      } else {
        console.log('[Terms Analyzer - Background] Terms saved successfully');
        updateBadge(true);
        chrome.runtime.sendMessage({
          type: 'TERMS_UPDATED',
          content: request.content,
          url: request.url
        });
      }
    });
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    console.log('[Terms Analyzer - Background] Navigation completed:', details.url);
    // Reset badge when navigating to a new page
    updateBadge(false);
    chrome.tabs.sendMessage(details.tabId, {
      type: 'URL_CHANGED',
      url: details.url
    });
  }
});