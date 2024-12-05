// contentScript.js

function isLoginPage() {
  // URL patterns that might indicate a login page
  const urlPatterns = [
    /login/i, /signin/i, /sign-in/i, 
    /connexion/i, /authentification/i,
    /auth/i, /account/i, /connect/i
  ];

  // Form action patterns
  const formActionPatterns = [
    /login/i, /signin/i, /sign-in/i,
    /auth/i, /account/i, /session/i,
    /connexion/i, /authentification/i
  ];

  // Input name/id patterns that might indicate login fields
  const inputPatterns = [
    /username/i, /email/i, /login/i,
    /password/i, /passwd/i, /pass/i,
    /user/i, /mail/i
  ];

  // Text content that might indicate a login page
  const textPatterns = [
    /sign\s*in/i, /log\s*in/i, /login/i,
    /connexion/i, /connect/i, /authentification/i,
    /connect with/i, /sign in with/i, /login with/i,
    /forgot.*(password|id)/i, /reset.*(password|id)/i,
    /remember me/i, /keep me signed in/i,
    /don't have an account/i, /create.*account/i,
    /new here/i, /first time/i
  ];

  // Terms and conditions related patterns
  const termsPatterns = [
    /terms/i, /conditions/i, /privacy/i,
    /legal/i, /policy/i, /agreement/i,
    /terms of service/i, /terms of use/i,
    /terms & conditions/i, /privacy policy/i
  ];

  // Button text patterns
  const buttonPatterns = [
    /sign\s*in/i, /log\s*in/i, /login/i,
    /connect/i, /continue/i, /submit/i,
    /connexion/i, /authentification/i
  ];

  console.log('[Terms Analyzer - Content] Script loaded on:', window.location.href);

  function checkUrl() {
    return urlPatterns.some(pattern => pattern.test(window.location.href));
  }

  function checkForms() {
    const forms = document.getElementsByTagName('form');
    return Array.from(forms).some(form => {
      const action = form.action || '';
      return formActionPatterns.some(pattern => pattern.test(action)) ||
             form.querySelector('input[type="password"]') !== null;
    });
  }

  function checkInputs() {
    const inputs = document.getElementsByTagName('input');
    return Array.from(inputs).some(input => {
      const inputAttrs = (input.name + ' ' + input.id + ' ' + input.placeholder).toLowerCase();
      return inputPatterns.some(pattern => pattern.test(inputAttrs));
    });
  }

  function checkTextContent() {
    // Get all text content except footer
    const mainContent = document.body.cloneNode(true);
    const footer = mainContent.querySelector('footer');
    if (footer) {
      footer.remove();
    }
    
    // Also remove elements with footer-related classes
    const footerElements = mainContent.querySelectorAll('[class*="footer"], [id*="footer"]');
    footerElements.forEach(element => element.remove());
    
    const text = mainContent.innerText;
    return textPatterns.some(pattern => pattern.test(text));
  }

  function checkTermsPresence() {
    // Get all text content except footer
    const mainContent = document.body.cloneNode(true);
    const footer = mainContent.querySelector('footer');
    if (footer) {
      footer.remove();
    }
    
    // Remove footer-related elements
    const footerElements = mainContent.querySelectorAll('[class*="footer"], [id*="footer"]');
    footerElements.forEach(element => element.remove());
    
    const text = mainContent.innerText;
    return termsPatterns.some(pattern => pattern.test(text));
  }

  function checkButtons() {
    const buttons = Array.from(document.getElementsByTagName('button'))
      .concat(Array.from(document.getElementsByTagName('input')).filter(input => 
        input.type === 'submit' || input.type === 'button'
      ));
    
    return buttons.some(button => {
      const buttonText = button.innerText || button.value || '';
      return buttonPatterns.some(pattern => pattern.test(buttonText));
    });
  }

  function checkOAuthButtons() {
    // Exclude footer from the search
    const mainContent = document.body.cloneNode(true);
    const footer = mainContent.querySelector('footer');
    if (footer) {
      footer.remove();
    }
    
    const footerElements = mainContent.querySelectorAll('[class*="footer"], [id*="footer"]');
    footerElements.forEach(element => element.remove());

    const elements = mainContent.getElementsByTagName('*');
    return Array.from(elements).some(element => {
      const text = element.innerText || '';
      return /sign in with|login with|connect with/i.test(text) &&
             /(google|facebook|apple|github|twitter)/i.test(text);
    });
  }

  // Scoring system for login page detection
  let score = 0;

  if (checkUrl()) score += 2;
  if (checkForms()) score += 3;
  if (checkInputs()) score += 2;
  if (checkTextContent()) score += 2;
  if (checkButtons()) score += 2;
  if (checkOAuthButtons()) score += 2;
  if (document.querySelector('input[type="password"]')) score += 3;
  
  // Add score for terms presence
  if (checkTermsPresence()) score += 3;

  console.log('[Terms Analyzer] Detection scores:', {
    url: checkUrl() ? 2 : 0,
    forms: checkForms() ? 3 : 0,
    inputs: checkInputs() ? 2 : 0,
    textContent: checkTextContent() ? 2 : 0,
    buttons: checkButtons() ? 2 : 0,
    oauthButtons: checkOAuthButtons() ? 2 : 0,
    password: document.querySelector('input[type="password"]') ? 3 : 0,
    termsPresence: checkTermsPresence() ? 3 : 0,
    totalScore: score
  });

  // Consider it a login page if score is high enough
  return score >= 5;
}

function extractTermsContent(document) {
  // Try different methods to find the terms content
  const selectors = [
    // Specific terms containers
    '[class*="terms-content"]',
    '[class*="legal-content"]',
    '[class*="terms-container"]',
    '[class*="legal-container"]',
    '[class*="terms-and-conditions"]',
    '[class*="terms_and_conditions"]',
    '[class*="legal-text"]',
    '[class*="policy-content"]',
    // Main content areas
    'main article',
    'main .content',
    'article',
    '.article-content',
    'main',
    '#main-content',
    '.main-content',
    '.content',
    '#content'
  ];

  let content = '';
  let element = null;

  // Try each selector
  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) {
      content = element.textContent.trim();
      if (isLikelyTermsContent(content)) {
        return content;
      }
    }
  }

  // If no specific container found, try finding by headers
  const headers = document.querySelectorAll('h1, h2');
  for (const header of headers) {
    if (isTermsHeader(header.textContent)) {
      // Get the parent container
      let parent = header.parentElement;
      for (let i = 0; i < 3; i++) { // Check up to 3 levels up
        if (parent) {
          content = parent.textContent.trim();
          if (isLikelyTermsContent(content)) {
            return content;
          }
          parent = parent.parentElement;
        }
      }
    }
  }

  return '';
}

function isTermsHeader(text) {
  const termsKeywords = [
    'terms', 'conditions', 'tos', 'terms of service',
    'terms of use', 'legal', 'terms & conditions',
    'privacy policy', 'user agreement'
  ];
  
  text = text.toLowerCase();
  return termsKeywords.some(keyword => text.includes(keyword));
}

function isLikelyTermsContent(text) {
  console.log('[Terms Analyzer] Checking content:', {
    length: text.length,
    preview: text.substring(0, 100) + '...'
  });

  if (!text || text.length < 1000) {
    console.log('[Terms Analyzer] Content too short:', text.length);
    return false;
  }

  const termsIndicators = [
    'terms', 'conditions', 'agreement', 'accept', 'privacy',
    'legal', 'rights', 'obligations', 'responsible'
  ];

  text = text.toLowerCase();
  const foundIndicators = termsIndicators.filter(indicator => 
    text.includes(indicator)
  );
  console.log('[Terms Analyzer] Found indicators:', foundIndicators);

  return foundIndicators.length >= 3;
}

async function fetchAndExtractTerms(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract terms content
    const content = extractTermsContent(doc);
    
    if (content) {
      return {
        success: true,
        content,
        url
      };
    }
    
    return {
      success: false,
      error: 'No terms content found'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function fetchAndAnalyzeTermsPage(url, visited = new Set()) {
  console.log('[Terms Analyzer] Analyzing page:', url);
  
  // Prevent infinite loops
  if (visited.has(url)) {
    console.log('[Terms Analyzer] Already visited:', url);
    return { success: false, error: 'Circular reference' };
  }
  visited.add(url);

  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse the fetched page
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // First try to find terms content on this page
    const content = extractTermsContent(doc);
    if (content) {
      console.log('[Terms Analyzer] Found terms content on:', url);
      return { success: true, content, url };
    }
    
    // If no content found, look for terms links on this page
    console.log('[Terms Analyzer] No terms found, looking for more links on:', url);
    const newTermsLinks = findTermsLinks(doc);
    console.log('[Terms Analyzer] Found additional links:', newTermsLinks);

    // Try each new link
    for (const link of newTermsLinks) {
      if (!visited.has(link)) {
        const result = await fetchAndAnalyzeTermsPage(link, visited);
        if (result.success) {
          return result;
        }
      }
    }
    
    return { success: false, error: 'No terms content found in link or sub-links' };
  } catch (error) {
    console.error('[Terms Analyzer] Error analyzing page:', error);
    return { success: false, error: error.message };
  }
}

function findTermsLinks(doc) {
  const termsKeywords = [
    'terms', 'conditions', 'tos', 'terms of service',
    'terms of use', 'legal', 'terms & conditions',
    'privacy policy', 'user agreement', 'legal notice',
    'terms and conditions', 'terms & conditions',
    'conditions générales', 'mentions légales', 'cgv', 'cgu'
  ];
  
  return Array.from(doc.getElementsByTagName('a'))
    .filter(link => {
      const text = link.textContent.toLowerCase();
      const href = link.href.toLowerCase();
      return termsKeywords.some(keyword =>
        text.includes(keyword) || href.includes(keyword)
      );
    })
    .map(link => link.href);
}

async function init() {
  console.log('[Terms Analyzer - Content] Script loaded on:', window.location.href);
  
  const isLogin = isLoginPage();
  console.log('[Terms Analyzer] Is login page:', isLogin);

  if (isLogin) {
    const initialTermsLinks = findTermsLinks(document);
    console.log('[Terms Analyzer] Found initial terms links:', initialTermsLinks);

    const visited = new Set();
    for (const link of initialTermsLinks) {
      const result = await fetchAndAnalyzeTermsPage(link, visited);
      
      if (result.success) {
        console.log('[Terms Analyzer] Successfully found terms content');
        chrome.runtime.sendMessage({
          type: 'TERMS_FOUND',
          content: result.content,
          url: result.url
        });
        break;
      }
    }

    // If no terms found in links, analyze current page
    if (!visited.size) {
      console.log('[Terms Analyzer] Analyzing current page for terms');
      const currentPageContent = extractTermsContent(document);
      if (currentPageContent) {
        console.log('[Terms Analyzer] Found terms on current page');
        chrome.runtime.sendMessage({
          type: 'TERMS_FOUND',
          content: currentPageContent,
          url: window.location.href
        });
      }
    }
  }
}


async function init() {
console.log('[Terms Analyzer - Content] Script loaded on:', window.location.href);
await analyzeCurrentPage();
}

async function analyzeCurrentPage() {
const isLogin = isLoginPage();
console.log('[Terms Analyzer] Is login page:', isLogin);

if (isLogin) {
    const initialTermsLinks = findTermsLinks(document);
    console.log('[Terms Analyzer] Found initial terms links:', initialTermsLinks);

    const visited = new Set();
    for (const link of initialTermsLinks) {
        const result = await fetchAndAnalyzeTermsPage(link, visited);
        
        if (result.success) {
            console.log('[Terms Analyzer] Successfully found terms content');
            chrome.runtime.sendMessage({
                type: 'TERMS_FOUND',
                content: result.content,
                url: result.url
            });
            break;
        }
    }

    // If no terms found in links, analyze current page
    if (!visited.size) {
        console.log('[Terms Analyzer] Analyzing current page for terms');
        const currentPageContent = extractTermsContent(document);
        if (currentPageContent) {
            console.log('[Terms Analyzer] Found terms on current page');
            chrome.runtime.sendMessage({
                type: 'TERMS_FOUND',
                content: currentPageContent,
                url: window.location.href
            });
        }
    }
}
}

// Add navigation monitoring
let lastUrl = window.location.href;

// Create an observer to watch for URL changes
const observer = new MutationObserver(() => {
if (window.location.href !== lastUrl) {
    console.log('[Terms Analyzer] URL changed from', lastUrl, 'to', window.location.href);
    lastUrl = window.location.href;
    analyzeCurrentPage();
}
});

// Start observing the document with the configured parameters
observer.observe(document, {
subtree: true,
childList: true
});

// Also listen for history changes (for SPAs)
window.addEventListener('popstate', () => {
console.log('[Terms Analyzer] Navigation detected through popstate');
analyzeCurrentPage();
});

// Listen for pushState/replaceState changes
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
originalPushState.apply(this, args);
console.log('[Terms Analyzer] Navigation detected through pushState');
analyzeCurrentPage();
};

history.replaceState = function(...args) {
originalReplaceState.apply(this, args);
console.log('[Terms Analyzer] Navigation detected through replaceState');
analyzeCurrentPage();
};

// Run initialization
init();