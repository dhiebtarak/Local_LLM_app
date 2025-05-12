# Local AI Chat


A simple Flask-based web GUI for interacting with local AI models (LLMs) using [Ollama](https://github.com/ollama/ollama) for model serving. This project is in **Alpha** phase and open to contributions. Created by [@dhiebtarak].

---

## Table of Contents
- [Features](#features)
- [System Requirements](#system-requirements)
- [Setup Instructions](#setup-instructions)
  - [Clone the Repository](#clone-the-repository)
  - [Set Up a Virtual Environment](#set-up-a-virtual-environment)
  - [Install Dependencies](#install-dependencies)
  - [Install and Configure Ollama](#install-and-configure-ollama)
- [Running the Application](#running-the-application)
- [Application User Guide](#application-user-guide)
- [Security Notice](#security-notice)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **Multiple Model Support**: Switch between different local LLM models (e.g., `deepseek-r1`, `qwen2.5`, `codellama`, etc.) via a dropdown.
- **Streaming Responses**: View AI responses in real time as they are generated.
- **Futuristic UI**: Features a 3D cube animation in the background for a modern look.
- **Keyboard Shortcuts**:
  - **Shift+Enter**: Add a new line in the input fields.
  - **Enter**: Send your message to the AI.
- **Cross-Platform**: Compatible with Windows, Linux, and macOS.

---

## System Requirements

- **Python 3.7+**: Required for Flask compatibility.
- **pip/venv**: For dependency management and environment isolation.
- **Ollama**: Required for serving local AI models. Installation instructions provided below.
- **Hardware**:
  - **Minimum**: 8GB RAM (for smaller models).
  - **Recommended**: 16GB+ RAM + NVIDIA GPU (for larger models).
  - **Disk Space**: 10GB+ for model storage.

---

## Setup Instructions

### Set Up a Virtual Environment
Create and activate a virtual environment to isolate dependencies:

```bash
# Linux/macOS
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt, indicating the virtual environment is active.

### Install Dependencies
Install the required Python packages listed in `requirements.txt`:

```bash
pip install -r requirements.txt
```

This will install Flask and other necessary libraries for the web application.

### Install and Configure Ollama
Ollama is required to serve the AI models locally. Follow these steps to set it up:

1. **Install Ollama**:
   - Download and install Ollama by following the instructions on the [Ollama GitHub page](https://github.com/ollama/ollama#installation).
   - Verify the installation:
     ```bash
     ollama --version
     ```

2. **Start the Ollama Server**:
   - Run the Ollama server in the background:
     ```bash
     ollama serve
     ```

3. **Download a Model**:
   - Pull a model (e.g., `deepseek-r1:14b`) to use with the application:
     ```bash
     ollama pull deepseek-r1:14b
     ```
   - You can pull other models as needed (e.g., `qwen2.5`, `codellama`).

---

## Running the Application

1. Ensure the Ollama server is running (see above).
2. Start the Flask application:
   ```bash
   python app.py
   ```
3. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```
   The Local AI Chat interface will load, ready for interaction.

---

## Application User Guide

This section explains how to use the Local AI Chat application once it’s running.

### Accessing the Interface
- Navigate to `http://localhost:5000` in your web browser.
- The interface includes a navbar at the top, a chat window in the center, and an input area at the bottom, with a 3D cube animation in the background.

### Interface Overview
- **Navbar**:
  - **Title**: Displays "Local AI Chat".
  - **Date/Time**: Shows the current date and time, updated every second.
  - **Model Selector**: A dropdown menu to choose the AI model (e.g., `deepseek-r1:14b`).
  - **New Chat Button**: Clears the current chat to start a new conversation.
- **Chat Window**:
  - Initially shows a placeholder: "Start a new conversation".
  - Displays your messages (right-aligned, purple background) and AI responses (left-aligned, gray background).
- **Input Area**:
  - Two text areas:
    - **CCP New Trade Message**: Enter your primary query.
    - **Operation Message**: Add optional context or instructions.
  - A hint: "Press Enter to send, Shift+Enter for new line".

### Using the Chat
1. **Select a Model**:
   - Choose an AI model from the dropdown in the navbar. Ensure the model is downloaded via Ollama.
2. **Compose Your Message**:
   - Type your query in the "CCP New Trade Message" field.
   - Optionally, add context in the "Operation Message" field.
   - Use **Shift+Enter** to add a new line within the same field.
3. **Send the Message**:
   - Press **Enter** to send your message.
   - Your message will appear on the right with a purple background.
   - The AI will respond with "Thinking..." followed by a streaming response on the left with a gray background.
4. **Start a New Chat**:
   - Click the "+ New Chat" button to clear the chat window and start fresh.
5. **View Responses**:
   - AI responses stream in real time.
   - Scroll up in the chat window to review previous messages.

### Tips for Best Use
- **Keep Prompts Clear**: Short, specific queries often yield better responses.
- **Try Different Models**: Some models may perform better for specific tasks (e.g., `codellama` for coding).
- **Monitor Performance**: If the UI is slow, check your system’s resource usage, as LLMs can be resource-intensive.

---

## Security Notice

⚠️ **Important Security Considerations**:
- The app binds to `0.0.0.0` by default, making it accessible on your network.
- Do not expose to the public internet.
- No authentication is implemented; restrict access using firewall rules if needed.

---

## Troubleshooting

**Common Issues**:

1. **"Model not found" error**:
   - Ensure the model is downloaded:
     ```bash
     ollama pull <model-name>
     ```
   - Verify the Ollama server is running:
     ```bash
     ollama serve
     ```

2. **Port conflict**:
   - Modify the `PORT` variable in `app.py` to use a different port.

3. **Slow responses**:
   - Use a smaller model.
   - Check system resource usage.
   - Enable GPU acceleration if available.

4. **Ollama not responding**:
   - Restart the Ollama server and ensure it’s running before starting the Flask app.

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Submit a pull request with a detailed description.

**Guidelines**:
- Follow PEP 8 style for Python code.
- Add tests for new features.
- Update documentation as needed.

---
