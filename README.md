# TrusTerms

TrusTerms is an open-source browser extension designed to help users better understand and evaluate online Terms of Service (ToS) agreements. It simplifies the often complex and lengthy legal jargon, offering real-time feedback on the risks and clarity of terms before signing. This project was developed during the **Koyeb LLM x Law Hackathon** in 6 hours.

---

## Features

- **Real-time Notifications**: When you visit a sign-in page with Terms of Service, TrusTerms notifies you about the agreement and helps assess its fairness.
- **Score Generation**: The extension evaluates the ToS based on several criteria (to be detailed later) and generates a score to highlight potential risks or abusiveness.
- **Terms Summarization**: TrusTerms provides a brief summary of the key points in the Terms of Service, saving you time and effort.
- **Chatbot Assistance**: Ask specific questions about the terms, and the chatbot will provide concise, understandable answers.
---

## Installation

1. **Download the Latest Release**
   - Go to the [Releases page](#) and download the latest version of the project.

2. **Set Up the API LLM Service**
   - Choose your preferred API LLM service (e.g., Mistral, Gemini, etc.) and obtain an API key.
   - Insert your API key into the extension’s settings.

3. **Run the Backend**
   - Open a terminal and navigate to the project directory.
   - Run the backend by executing:
     ```bash
     python api.py
     ```

4. **Build the Frontend**
   - Install the necessary frontend dependencies by running:
     ```bash
     npm install
     ```
   - Build the frontend using:
     ```bash
     npm run build
     ```
   - This will create the production-ready version of the frontend.

5. **Install the Extension in Your Browser**
   - Open your browser’s extension page (e.g., `chrome://extensions/` in Chrome, or the equivalent in other browsers).
   - Enable "Developer Mode" and click "Load unpacked."
   - Select the folder where the build files were generated (`/build` folder).
   - The extension should now be installed and active.

6. **Configure the Extension Settings**
   - Go to the extension settings and ensure that your API key is correctly entered.

---

## Usage

- After installation, the extension will automatically detect sign-in pages with Terms of Service agreements.
- A notification will appear, showing a score based on the evaluation of the ToS.
- Click the extension icon to view the summarized terms, chatbot, and score details.

---

## Contributing

We welcome contributions from the community! If you’d like to help improve the project:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request with a description of the changes.

## Built by

Dimittri Choudhury - [Dimittri Choudhury - LinkedIn](https://www.linkedin.com/in/dimittrichoudhury/)

Pierre Choudhury - [Pierre Choudhury - LinkedIn](https://www.linkedin.com/in/pierre-shourdjyo-choudhury-9b2540277/)

Alexandre Klobb - [Alexandre Klobb - LinkedIn](https://www.linkedin.com/in/alexandre-klobb-09bb40225/)
