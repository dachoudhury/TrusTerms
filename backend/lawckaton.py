import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from tqdm import tqdm
from typing import Set
import google.generativeai as genai
import json
from datetime import datetime

def generate_summary(terms: str, model_type: str = 'models/gemini-1.5-flash-001') -> str:
    """Generate a summary of the terms using Gemini API."""
    try:
        prompt = f"Resume this terms: {terms}"
        
        model_gemini = genai.GenerativeModel(model_type)
        response = model_gemini.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
                max_output_tokens=1500,
                temperature=0
            ),
            stream=False
        )
        return response.text
    except Exception as e:
        return f"Error generating summary: {str(e)}"

def save_to_file(url: str, terms: str, summary: str) -> str:
    """Save the URL, terms, and summary to a file."""
    try:
        # Create filename based on domain and timestamp
        domain = urlparse(url).netloc.replace('.', '_')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"terms_summary_{domain}_{timestamp}.txt"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"URL: {url}\n")
            f.write("\n" + "="*50 + "\n")
            f.write("TERMS:\n")
            f.write(terms)
            f.write("\n" + "="*50 + "\n")
            f.write("SUMMARY:\n")
            f.write(summary)
        
        return filename
    except Exception as e:
        return f"Error saving to file: {str(e)}"

def create_driver():
    """Create a headless Chrome driver with optimized settings to reduce warnings."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-software-rasterizer")
    chrome_options.add_argument("--disable-webgl")
    chrome_options.add_argument("--disable-webgl2")
    chrome_options.add_argument("--disable-device-discovery-notifications")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--disable-background-networking")
    chrome_options.add_argument("--disable-default-apps")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-component-extensions-with-background-pages")
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--ignore-certificate-errors')
    chrome_options.add_argument('--allow-running-insecure-content')
    chrome_options.add_argument('--log-level=3')
    chrome_options.add_argument(f'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    service = Service(ChromeDriverManager().install())
    service.creation_flags = 0x08000000
    
    return webdriver.Chrome(service=service, options=chrome_options)

def is_same_domain(url1: str, url2: str) -> bool:
    """Check if two URLs belong to the same domain."""
    domain1 = urlparse(url1).netloc
    domain2 = urlparse(url2).netloc
    return domain1 == domain2 or domain1.endswith(domain2) or domain2.endswith(domain1)

def find_terms_link(driver, base_url: str, visited_urls: Set[str]) -> list:
    """Find potential terms of service links in the page using Selenium."""
    terms_keywords = {
        'en': [
            'terms', 'conditions', 'tos', 'terms of service',
            'terms of use', 'legal', 'terms & conditions',
            'privacy policy', 'user agreement'
        ],
        'fr': [
            'conditions', 'mentions légales', 'cgu', 'cgv',
            'conditions générales', "conditions d'utilisation",
            'conditions générales de vente', 'mentions légales',
            'conditions générales d\'utilisation'
        ]
    }
    
    potential_links = []
    
    # Try different methods to find links
    methods = [
        # Method 1: Check footer
        lambda: driver.find_elements(By.TAG_NAME, "footer"),
        # Method 2: Check bottom of page
        lambda: driver.find_elements(By.CSS_SELECTOR, ".footer, .bottom, .legal-links, [class*='footer'], [class*='bottom']"),
        # Method 3: Check all links
        lambda: driver.find_elements(By.TAG_NAME, "a")
    ]
    
    all_links = []
    for method in methods:
        try:
            elements = method()
            for element in elements:
                try:
                    # For containers (footer, etc.), get all links within
                    if element.tag_name != 'a':
                        links = element.find_elements(By.TAG_NAME, "a")
                    else:
                        links = [element]
                    all_links.extend(links)
                except:
                    continue
        except:
            continue
    
    # Process all found links
    for link in all_links:
        try:
            href = link.get_attribute('href')
            text = link.text.lower().strip()
            
            if not href or href in visited_urls:
                continue
                
            # Clean and normalize the URL
            href = href.split('#')[0]  # Remove fragment identifier
            if href.endswith('/'):
                href = href[:-1]
            
            # Only process links that belong to the same domain
            if not is_same_domain(href, base_url):
                continue
            
            # Check both link text and href for keywords
            href_lower = href.lower()
            
            # Score the link based on how likely it is to be a terms page
            score = 0
            
            # Check text matches
            for keywords in terms_keywords.values():
                for keyword in keywords:
                    if keyword in text:
                        score += 2
                    if keyword in href_lower:
                        score += 1
            
            # Additional URL patterns that might indicate terms
            url_patterns = ['/legal/', '/terms/', '/tos/', '/conditions/', '/cgu/', '/cgv/']
            for pattern in url_patterns:
                if pattern in href_lower:
                    score += 2
            
            if score > 0:
                potential_links.append((href, score))
                
        except Exception as e:
            continue
    
    # Sort links by score and return unique URLs
    seen_urls = set()
    sorted_links = []
    for url, score in sorted(potential_links, key=lambda x: x[1], reverse=True):
        if url not in seen_urls:
            sorted_links.append(url)
            seen_urls.add(url)
    
    return sorted_links

def extract_terms_content(driver) -> tuple:
    """
    Extract potential terms of service content from the page using Selenium.
    Returns (content, is_navigation_page)
    """
    time.sleep(3)  # Increased wait time for content to load
    
    def clean_content(text: str) -> str:
        """Clean extracted content while preserving structure."""
        lines = text.split('\n')
        # Remove empty lines while preserving paragraph structure
        cleaned_lines = []
        last_line_empty = False
        
        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)
                last_line_empty = False
            elif not last_line_empty:
                cleaned_lines.append('')  # Keep one empty line between paragraphs
                last_line_empty = True
                
        return '\n'.join(cleaned_lines).strip()
    
    def is_terms_content(text: str) -> bool:
        """Check if the content looks like terms."""
        text_lower = text.lower()
        indicators = [
            'terms', 'conditions', 'agreement', 'accept', 'privacy',
            'legal', 'rights', 'obligations', 'responsible',
            'conditions générales', 'mentions légales', 'utilisation'
        ]
        word_count = len(text.split())
        indicator_count = sum(1 for ind in indicators if ind in text_lower)
        return word_count > 200 and indicator_count >= 2
    
    def get_element_content_with_js(driver, element) -> str:
        """Use JavaScript to get the full content of an element."""
        try:
            # Use JavaScript to get the text content, including hidden elements
            script = """
                function getVisibleText(element) {
                    let text = '';
                    // Get all text nodes
                    let walk = document.createTreeWalker(
                        element,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    let node;
                    while(node = walk.nextNode()) {
                        text += node.textContent.trim() + '\\n';
                    }
                    return text;
                }
                return getVisibleText(arguments[0]);
            """
            return driver.execute_script(script, element)
        except:
            return element.text
    
    def remove_navigation_elements(driver):
        """Remove navigation elements from the page to clean up content extraction."""
        elements_to_remove = [
            'header', 'footer', 'nav',
            '[role="navigation"]',
            '.navigation', '.nav-menu',
            '#navigation', '#nav-menu',
            '.header', '.footer',
            '#header', '#footer',
            '[class*="cookie"]',
            '[class*="banner"]',
            '[class*="menu"]'
        ]
        
        script = """
            function removeElements(selector) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            }
        """
        
        for selector in elements_to_remove:
            try:
                driver.execute_script(script + f"removeElements('{selector}');")
            except:
                continue
    
    # Wait for dynamic content to load
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
    except:
        pass
    
    # First try: Look for specific terms containers
    content_selectors = [
        # Specific terms selectors
        "[class*='terms-content']", "[class*='legal-content']",
        "[class*='terms-container']", "[class*='legal-container']",
        "[class*='terms-and-conditions']", "[class*='terms_and_conditions']",
        "[class*='legal-text']", "[class*='policy-content']",
        # Generic content selectors
        "main article", "main .content", 
        "article", ".article-content",
        "main", "#main-content", ".main-content",
        ".content", "#content", ".container-content",
        "[role='main']"
    ]
    
    content_found = None
    
    # Try each selector
    for selector in content_selectors:
        try:
            elements = driver.find_elements(By.CSS_SELECTOR, selector)
            for element in elements:
                content = get_element_content_with_js(driver, element)
                content = clean_content(content)
                if is_terms_content(content):
                    content_found = content
                    break
        except:
            continue
        
        if content_found:
            break
    
    # Second try: Look for headers and get their container
    if not content_found:
        try:
            headers = driver.find_elements(
                By.XPATH,
                """//h1[
                    contains(translate(., 'TERMS', 'terms'), 'terms') or
                    contains(translate(., 'CONDITIONS', 'conditions'), 'conditions') or
                    contains(translate(., 'LEGAL', 'legal'), 'legal') or
                    contains(., 'CGU') or contains(., 'CGV')
                ] | //h2[
                    contains(translate(., 'TERMS', 'terms'), 'terms') or
                    contains(translate(., 'CONDITIONS', 'conditions'), 'conditions') or
                    contains(translate(., 'LEGAL', 'legal'), 'legal') or
                    contains(., 'CGU') or contains(., 'CGV')
                ]"""
            )
            
            for header in headers:
                try:
                    # Get the main container
                    current = header
                    for _ in range(5):  # Look up to 5 levels up
                        parent = current.find_element(By.XPATH, '..')
                        content = get_element_content_with_js(driver, parent)
                        content = clean_content(content)
                        if is_terms_content(content):
                            content_found = content
                            break
                        current = parent
                except:
                    continue
                
                if content_found:
                    break
        except:
            pass
    
    # Final try: Get full page content if URL suggests it's a terms page
    if not content_found and any(term in driver.current_url.lower() 
                                for term in ['/terms', '/conditions', '/legal', '/cgu', '/cgv']):
        try:
            # Remove navigation elements
            remove_navigation_elements(driver)
            
            # Wait a bit for any dynamic changes
            time.sleep(1)
            
            # Get the main content
            body = driver.find_element(By.TAG_NAME, 'body')
            content = get_element_content_with_js(driver, body)
            content = clean_content(content)
            
            if is_terms_content(content):
                content_found = content
        except:
            pass
    
    # Verify content and check if it's a navigation page
    if content_found:
        word_count = len(content_found.split())
        try:
            links = driver.find_elements(By.TAG_NAME, 'a')
            links_count = len(links)
            
            # If it has too many links relative to content, it might be a navigation page
            if word_count < 200 or (links_count > 10 and links_count / word_count > 0.1):
                return content_found, True
            
            return content_found, False
        except:
            if word_count >= 200:
                return content_found, False
    
    # Check if it's a navigation page
    try:
        links = driver.find_elements(By.TAG_NAME, 'a')
        terms_links = [link for link in links if any(term in link.text.lower() 
                      for term in ['terms', 'conditions', 'legal', 'cgu', 'cgv'])]
        if terms_links:
            return '\n'.join(link.text for link in terms_links), True
    except:
        pass
    
    return '', True

def detect_language(text: str) -> str:
    """Simple language detection based on keyword presence."""
    fr_indicators = ['conditions générales', 'utilisation', 'mentions légales', 'cgv', 'cgu']
    en_indicators = ['terms of service', 'terms of use', 'legal terms', 'conditions']
    
    text_lower = text.lower()
    fr_count = sum(1 for indicator in fr_indicators if indicator in text_lower)
    en_count = sum(1 for indicator in en_indicators if indicator in text_lower)
    
    return 'fr' if fr_count > en_count else 'en'

def get_terms(url: str, max_depth: int = 3):
    """Main function to get terms of service and generate summary."""
    driver = None
    visited_urls = set()
    
    try:
        driver = create_driver()
        current_depth = 0
        urls_to_visit = [(url, 0)]
        
        with tqdm(total=100, desc="Searching for terms") as pbar:
            while urls_to_visit and current_depth < max_depth:
                current_url, depth = urls_to_visit.pop(0)
                
                if current_url in visited_urls:
                    continue
                    
                visited_urls.add(current_url)
                current_depth = depth
                
                pbar.update(10)
                pbar.set_description(f"Checking page {len(visited_urls)}")
                
                try:
                    driver.get(current_url)
                    time.sleep(2)
                    
                    terms_content, is_navigation_page = extract_terms_content(driver)
                    
                    if terms_content and not is_navigation_page:
                        language = detect_language(terms_content)
                        pbar.update(100 - pbar.n)
                        
                        # Generate summary using Gemini
                        print("\nGenerating summary...")
                        summary = generate_summary(terms_content)
                        
                        # Save to file
                        filename = save_to_file(current_url, terms_content, summary)
                        
                        return {
                            'status': 'success',
                            'type': 'found',
                            'content': terms_content,
                            'terms_url': current_url,
                            'language': language,
                            'pages_checked': len(visited_urls),
                            'summary': summary,
                            'file': filename
                        }
                    
                    if is_navigation_page or not terms_content:
                        new_links = find_terms_link(driver, url, visited_urls)
                        for link in new_links:
                            if link not in visited_urls:
                                urls_to_visit.append((link, depth + 1))
                
                except Exception as e:
                    print(f"Error accessing {current_url}: {str(e)}")
                    continue
                
                pbar.update(5)
        
        pbar.update(100 - pbar.n)
        return {
            'status': 'error',
            'message': 'No terms found after checking all possible pages',
            'pages_checked': len(visited_urls)
        }
        
    except Exception as e:
        return {'status': 'error', 'message': f'Error: {str(e)}'}
    finally:
        if driver:
            driver.quit()

# Example usage
if __name__ == "__main__":
    # Initialize Gemini API (you'll need to set your API key)
    genai.configure(api_key="AIzaSyB-lGipmE-uSN0pr-2XZ6OP8ApI-YEPU3o")
    
    url = input("Enter website URL: ")
    result = get_terms(url)
    
    if result['status'] == 'success':
        print(f"\nTerms found!")
        print(f"Pages checked: {result['pages_checked']}")
        print(f"Detected language: {result['language']}")
        print(f"Terms URL: {result['terms_url']}")
        print(f"\nOutput saved to: {result['file']}")
        print("\nSummary:")
        print("="*50)
        print(result['summary'])
        print("="*50)
        print("\nContent preview:")
        print(result['content'][:500] + "...")
    else:
        print(f"Error: {result['message']}")
        print(f"Pages checked: {result.get('pages_checked', 0)}")