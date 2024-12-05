import re
from urllib.parse import urljoin, urlparse
from typing import Dict, Any
import google.generativeai as genai
from datetime import datetime
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

def generate_summary(terms: str, model_type: str = 'models/gemini-1.5-flash-001') -> str:
    # Barème détaillé des critères
    try:

        grading_criteria = """
### 1. Clarity and Accessibility (10 points)
- **Clear and understandable language (5 points):** Are the documents written without excessive legal jargon and easy to understand for an average user?
- **Ease of access (5 points):** Are the Terms of Use and Privacy Policy easily accessible from all pages of the website?

### 2. Transparency on Data Collection and Use (15 points)
- **Data collected (5 points):** Does the site specify which personal data is collected?
- **Collection methods (5 points):** Are the methods of data collection clearly explained (cookies, forms, etc.)?
- **Data usage (5 points):** Are the purposes for which the data is used clearly described?

### 3. User Rights and Control (10 points)
- **Access and rectification (5 points):** Are users informed of their right to access and correct their data?
- **Deletion and objection (5 points):** Are the right to be forgotten and the right to object to data processing mentioned?

### 4. Data Sharing with Third Parties (10 points)
- **Disclosure to third parties (5 points):** Does the site indicate if data is shared with partners or third parties?
- **Purpose of sharing (5 points):** Are the reasons for data sharing clearly justified?

### 5. Security Measures (5 points)
- **Data protection (5 points):** Does the site describe measures taken to ensure the security of personal data?

### 6. Compliance with Laws and Regulations (10 points)
- **Adherence to regulations (5 points):** Do the documents reference applicable laws (GDPR, CCPA, etc.)?
- **Data Protection Officer contact (5 points):** Is a contact for the Data Protection Officer provided?

### 7. Fairness of Terms of Use (10 points)
- **Balanced clauses (5 points):** Do the Terms of Use contain any unfair or imbalanced clauses to the user's disadvantage?
- **Clearly defined responsibilities (5 points):** Are the responsibilities of the website and the user clearly established?

### 8. Dispute Resolution and Jurisdiction (5 points)
- **Dispute procedure (3 points):** Is the procedure in case of a dispute clearly explained?
- **Applicable law and jurisdiction (2 points):** Is the jurisdiction mentioned in a manner fair to the user?

### 9. Updates and Notifications (5 points)
- **Notification of changes (3 points):** Does the site inform users of modifications to the documents?
- **Acceptance of new terms (2 points):** Is the process of accepting updates described?

### 10. Use of Cookies and Tracking Technologies (5 points)
- **Information on cookies (3 points):** Does the site explain the use of cookies and other trackers?
- **Preference management (2 points):** Can users customize their cookie settings?

### 11. Consent Mechanisms (5 points)
- **Obtaining consent (3 points):** Is consent obtained before data collection?
- **Withdrawal of consent (2 points):** Can users easily withdraw their consent?

### 12. Dubious Practices in the Industry (15 points)
- **Transparency on specific practices (10 points):** Does the site clearly disclose practices specific to its industry, especially if they might be controversial?
- **Ethics and compliance (5 points):** Does the site adhere to recognized ethical standards in its field?
"""

        # Building the prompt
        prompt = f"""
Please analyze the following Terms of Use (ToU) and Privacy Policy:

{terms}

Based on the provided documents, please:

1. Evaluate each of the following criteria and assign a score according to the grading scale (totaling 100 points):

{grading_criteria}

Provide the scores for each category.

2. Create a JSON file that includes:

- The scores for each area.
- A list of the data collected by the site.
- Indicate if this data is shared with third parties.
- A paragraph detailing all fees on the site.
- Information about the possibility of canceling a subscription, and how.
- A paragraph about how to contact support.

The JSON should be structured as follows:

{{
"scores": {{
    "clarity_and_accessibility": 10,
    "transparency_on_data_collection_and_use": 15,
    "user_rights_and_control": 10,
    "data_sharing_with_third_parties": 10,
    "security_measures": 5,
    "legal_compliance": 10,
    "fairness_of_terms": 10,
    "dispute_resolution_and_jurisdiction": 5,
    "updates_and_notifications": 5,
    "cookies_and_tracking": 5,
    "consent_mechanisms": 5,
    "industry_specific_practices": 15
}},
"data_collected": "Short summary of what data is used, why, and if it is shared",
"fees": "Short summary of all site fees",
"subscription_cancellation": "Short summary on how to cancel a subscription",
"support_contact": "Information on how to contact support"
}}

3. Do not include any comments or additional text outside of the JSON.
"""


        genai.configure(api_key="YOUR-API-KEY")
            
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

def detect_language(text: str) -> str:
    """Simple language detection based on keyword presence."""
    fr_indicators = ['conditions générales', 'utilisation', 'mentions légales', 'cgv', 'cgu']
    en_indicators = ['terms of service', 'terms of use', 'legal terms', 'conditions']
    
    text_lower = text.lower()
    fr_count = sum(1 for indicator in fr_indicators if indicator in text_lower)
    en_count = sum(1 for indicator in en_indicators if indicator in text_lower)
    
    return 'fr' if fr_count > en_count else 'en'

def analyze_terms_content(content: str, url: str) -> Dict[str, Any]:
    """Analyze terms content and generate summary."""
    try:
        if not content:
            return {
                'status': 'error',
                'message': 'No content provided'
            }

        # Clean content
        cleaned_content = '\n'.join(line.strip() for line in content.split('\n') if line.strip())
        
        # Check if it looks like terms content
        word_count = len(cleaned_content.split())
        if word_count < 200:
            return {
                'status': 'error',
                'message': 'Content too short to be terms'
            }
        
        # Generate summary
        summary = generate_summary(cleaned_content)
        
        # Save to file
        filename = save_to_file(url, cleaned_content, summary)
        
        return {
            'status': 'success',
            'type': 'found',
            'content': cleaned_content,
            'terms_url': url,
            'language': detect_language(cleaned_content),
            'summary': summary,
            'file': filename
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Error analyzing terms: {str(e)}'
        }

def inference(terms: str, system_prompt: str, discussion: str, model_type: str = 'models/gemini-1.5-flash-001') -> str:
    """
    Generate an answer based on terms content, system prompt, and discussion history.
    
    Args:
        terms: The terms and conditions text
        system_prompt: The system prompt to guide the model's behavior
        discussion: The conversation history or specific question
        model_type: The Gemini model to use
    
    Returns:
        str: The model's response
    """
    try:
        # Construct the complete prompt
        complete_prompt = f"""
{system_prompt}

Terms and Conditions:
{terms}

Current Discussion:
{discussion}

Please provide your response based on the terms and conditions above.
"""
        
        genai.configure(api_key="AIzaSyB-lGipmE-uSN0pr-2XZ6OP8ApI-YEPU3o")
        
        model_gemini = genai.GenerativeModel(model_type)
        response = model_gemini.generate_content(
            complete_prompt,
            generation_config=genai.types.GenerationConfig(
                candidate_count=1,
                max_output_tokens=1500,
                temperature=0.2  # Slightly higher temperature for more natural responses
            ),
            stream=False
        )
        
        return response.text
    except Exception as e:
        return f"Error generating inference: {str(e)}"
