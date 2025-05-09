import os
import re
import shutil
import subprocess
import logging
import requests
from flask import Flask, request, render_template, Response, stream_with_context, jsonify

# ---------------------------
# Configuration
# ---------------------------
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'tarak29590495')
    DEBUG = os.environ.get('DEBUG', 'False') == 'True'
    
    # Ollama settings
    OLLAMA_PATH = shutil.which("ollama") or "/usr/local/bin/ollama"
    OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
    DEFAULT_MODEL = "loratinylllama"  # Changed to your trained model
    
    # Server configuration
    HOST = "0.0.0.0"
    PORT = 5000

# ---------------------------
# Initialize Flask Application
# ---------------------------
app = Flask(__name__)
app.config.from_object(Config)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if app.config['DEBUG'] else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ANSI escape sequence cleaner
ansi_escape = re.compile(r'\x1B\[[0-?]*[ -/]*[@-~]')

# ---------------------------
# Routes
# ---------------------------
@app.route("/health", methods=["GET"])
def health_check():
    """Endpoint for system health monitoring."""
    try:
        result = subprocess.run(
            [Config.OLLAMA_PATH, "--version"],
            capture_output=True,
            check=True,
            text=True,
            timeout=5
        )
        logger.debug(f"Ollama version: {result.stdout.strip()}")
        return jsonify({
            "status": "healthy",
            "ollama": "accessible",
            "version": result.stdout.strip()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 503

@app.route("/models", methods=["GET"])
def list_models():
    """Endpoint to list available Ollama models."""
    try:
        result = subprocess.run(
            [Config.OLLAMA_PATH, "list"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10
        )
        models = result.stdout.strip().split("\n")[1:]  # Skip header
        model_names = [line.split()[0].strip() for line in models if line.strip()]
        logger.debug(f"Available models: {model_names}")
        return jsonify({"models": model_names}), 200
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/", methods=["GET"])
def index():
    """Render main chat interface with dynamically loaded models."""
    try:
        result = subprocess.run(
            [Config.OLLAMA_PATH, "list"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10
        )
        models = result.stdout.strip().split("\n")[1:]
        model_names = [line.split()[0].strip() for line in models if line.strip()]
        logger.debug(f"Available models for rendering: {model_names}")
        return render_template('index.html', models=model_names)
    except Exception as e:
        logger.error(f"Failed to fetch models for index: {str(e)}")
        return render_template('index.html', models=[])

@app.route("/stream_chat", methods=["POST"])
def stream_chat():
    """Handle streaming chat requests using Ollama generate API."""
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "").strip()
    model = data.get("model", Config.DEFAULT_MODEL).strip()

    if not prompt:
        def error_gen():
            yield "data: Missing prompt.\n\n"
            yield "data: [DONE]\n\n"
        logger.warning("Received request with missing prompt.")
        return Response(error_gen(), mimetype='text/event-stream')

    # Prepend the training prompt to provide context
    full_prompt = f"{prompt}"

    logger.info(f"Processing prompt with model {model}.")

    def sse_generator():
        try:
            # Use Ollama's generate endpoint
            response = requests.post(
                f"{Config.OLLAMA_HOST}/api/generate",
                json={"model": model, "prompt": full_prompt, "stream": True},
                stream=True,
                timeout=30
            )
            response.raise_for_status()

            for line in response.iter_lines():
                if line:
                    try:
                        json_data = line.decode('utf-8').strip()
                        if json_data:
                            import json
                            data = json.loads(json_data)
                            if 'response' in data:
                                clean_response = ansi_escape.sub('', data['response'])
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

        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama API error: {str(e)}")
            yield f"data: Ollama API error: {str(e)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Stream error: {str(e)}")
            yield f"data: Exception in stream_chat: {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(stream_with_context(sse_generator()), mimetype='text/event-stream')

# ---------------------------
# Main Entry Point
# ---------------------------
if __name__ == "__main__":
    logger.info(f"Starting server on {Config.HOST}:{Config.PORT}")
    logger.info(f"Using Ollama path: {Config.OLLAMA_PATH}")
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        threaded=True
    )