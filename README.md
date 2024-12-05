# TrusTerms

TrusTerms is an open-source browser extension designed to help users navigate and better understand online Terms of Service (ToS) agreements. With the rise of lengthy and complicated legal documents, many users unknowingly agree to abusive terms. TrusTerms aims to simplify this process by offering an easy way to evaluate and understand ToS agreements before signing them.

## Features

- **Real-time Notifications**: When visiting a sign-in page that requires agreeing to terms, TrusTerms notifies you about the presence of a Terms of Service agreement and helps you assess it.
  
- **Score Generation**: TrusTerms evaluates the terms based on predefined criteria and generates a score to indicate the level of risk or abusiveness.

- **Terms Summarization**: The extension summarizes the key points of the Terms of Service to help users quickly understand what they are agreeing to.

- **Chatbot Assistance**: A built-in chatbot allows users to ask specific questions about the Terms of Service and get concise, understandable answers.


## Installation

1. **Download the Latest Release**
   - Go to the [Releases page](#) and download the latest version of the project.
   
2. **Set Up the API LLM Service**
   - Choose your preferred API LLM service (e.g., Mistral, Gemini, etc.) and obtain an API key.
   - Insert your API key into the terms.py.

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
   - Go to the extension settings and make sure to configure any additional settings, including your API key.

Once completed, the extension will be active in your browser and ready to use!

## Contributing

We welcome contributions from the community! If you'd like to help improve the project, please feel free to fork the repository, make changes, and submit a pull request.

### Criteria for Evaluation

*Note: The criteria for generating the score will be added here soon!*
