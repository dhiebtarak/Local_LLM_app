import os
import re
import logging
import json
import requests
from flask import Flask, request, render_template, Response, stream_with_context, jsonify

# ---------------------------
# Configuration
# ---------------------------
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'tarak29590495')
    DEBUG = os.environ.get('DEBUG', 'False') == 'True'
    
    # Ollama settings
    OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
    DEFAULT_MODEL = "tinyllama:latest"
    ALLOWED_MODELS = None  # Will be populated after checking available models
    
    # Server configuration
    HOST = "0.0.0.0"
    PORT = 5000

# ---------------------------
# Initialize Flask Application
# ---------------------------
app = Flask(__name__, static_folder='static', template_folder='templates')
app.config.from_object(Config)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if app.config['DEBUG'] else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ANSI escape sequence cleaner
ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

# ---------------------------
# Helper Functions
# ---------------------------
def get_available_models():
    """Retrieve list of available Ollama models via API."""
    try:
        response = requests.get(f"{Config.OLLAMA_HOST}/api/tags", timeout=10)
        response.raise_for_status()
        models_data = response.json()
        model_names = [model['name'] for model in models_data.get('models', [])]
        logger.debug("Available models: %s", model_names)
        return model_names
    except Exception as e:
        logger.error("Failed to list models: %s", str(e))
        return []

# Initialize allowed models on app startup
Config.ALLOWED_MODELS = get_available_models()

# ---------------------------
# Routes
# ---------------------------
@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint for system health monitoring."""
    try:
        response = requests.get(f"{Config.OLLAMA_HOST}/api/version", timeout=5)
        response.raise_for_status()
        version_data = response.json()
        logger.debug(f"Ollama version: {version_data}")
        return jsonify({
            "status": "healthy",
            "ollama": "accessible",
            "version": version_data.get("version", "unknown")
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 503

@app.route("/models", methods=["GET"])
def list_models():
    """Endpoint to list available Ollama models via API."""
    try:
        model_names = get_available_models()
        logger.debug(f"Available models: {model_names}")
        return jsonify({"models": model_names}), 200
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/", methods=["GET"])
def index():
    """Render main chat interface with dynamically loaded models."""
    try:
        model_names = get_available_models()
        logger.debug(f"Available models for rendering: {model_names}")
        return render_template('index.html', models=model_names)
    except Exception as e:
        logger.error(f"Failed to fetch models for index: {str(e)}")
        return render_template('index.html', models=[])

@app.route("/stream_chat", methods=["POST"])
def stream_chat():
    # Extract prompt and model from the request
    data = request.get_json()
    if not data or 'prompt' not in data or 'model' not in data:
        logger.error("Invalid request: prompt and model are required")
        return jsonify({"error": "prompt and model are required"}), 400

    prompt = data['prompt']
    model = data['model']
    logger.debug(f"Streaming chat with model: {model}, prompt: {prompt}")

    # Validate model
    if model not in Config.ALLOWED_MODELS:
        logger.error(f"Model {model} not found in allowed models: {Config.ALLOWED_MODELS}")
        return jsonify({"error": f"Model {model} not found"}), 400

    # Ollama API endpoint for streaming
    url = f"{app.config['OLLAMA_HOST']}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True
    }

    try:
        response = requests.post(url, json=payload, stream=True)
        response.raise_for_status()

        def sse_generator():
            for line in response.iter_lines():
                if line:
                    try:
                        json_data = line.decode('utf-8').strip()
                        if json_data:
                            data = json.loads(json_data)
                            if 'response' in data:
                                # Decode Unicode escape sequences (e.g., \u003c to <)
                                raw_response = data['response'].encode().decode('unicode_escape')
                                # Clean ANSI escape codes
                                clean_response = ansi_escape.sub('', raw_response)
                                if clean_response.strip():
                                    logger.debug(f"Ollama output: {clean_response}")
                                    yield f"data: {clean_response}\n\n"
                            if data.get('done', False):
                                yield "data: [DONE]\n\n"
                                break
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON decode error: {str(e)}")
                        yield f"data: Error parsing response: {str(e)}\n\n"
                        yield "data: [DONE]\n\n"
                        break

        return Response(stream_with_context(sse_generator()), mimetype='text/event-stream')

    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama API error: {str(e)}")
        def sse_generator():
            yield f"data: Ollama API error: {str(e)}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(sse_generator()), mimetype='text/event-stream')
    except Exception as e:
        logger.error(f"Stream error: {str(e)}")
        def sse_generator():
            yield f"data: Exception in stream_chat: {str(e)}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(sse_generator()), mimetype='text/event-stream')

# ---------------------------
# Main Entry Point
# ---------------------------
if __name__ == "__main__":
    logger.info(f"Starting server on {Config.HOST}:{Config.PORT}")
    logger.info(f"Using Ollama host: {Config.OLLAMA_HOST}")
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        threaded=True
    )