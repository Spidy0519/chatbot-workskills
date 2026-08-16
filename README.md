# Workskills X AI Chatbot

A full-stack AI chatbot web app for Workskills X that answers visitor questions about programs, fees, placements, and policies using a local knowledge base, powered by the Gemini API.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript, Bootstrap 5
- **Backend:** Python Flask
- **Data:** Local JSON knowledge base
- **AI:** Google Gemini API

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file from the example and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and replace `your_gemini_api_key_here` with your actual API key.

3. Run the app:
   ```bash
   python app.py
   ```

4. Open `http://localhost:5000` in your browser.

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a free API key
3. Add it to your `.env` file

## Project Structure

```
workskills-chatbot/
├── app.py                          # Flask backend
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variable template
├── data/
│   └── workskills_knowledge_base.json  # Knowledge base
├── static/
│   ├── css/style.css               # Workskills theme styles
│   ├── js/chat.js                  # Chat widget functionality
│   └── img/                        # Logo and icons
└── templates/
    └── index.html                  # Landing page with chat widget
```
