#!/bin/bash

# Directory where models are stored
MODELS_DIR="/root/.ollama"

# Check if the models directory exists and has subdirectories
if [ -d "$MODELS_DIR" ]; then
  # Iterate over each subdirectory in the models directory
  for model_dir in "$MODELS_DIR"/*; do
    if [ -d "$model_dir" ]; then
      model_name=$(basename "$model_dir")
      modelfile_path="$model_dir/Modelfile"

      # Check if Modelfile exists for the model
      if [ -f "$modelfile_path" ]; then
        echo "Registering model: $model_name"
        ollama create "$model_name" -f "$modelfile_path"
      else
        echo "No Modelfile found for $model_name, skipping..."
      fi
    fi
  done
else
  echo "No models directory found at $MODELS_DIR, starting Ollama without custom models..."
fi

# Start the Ollama server to serve all registered models
echo "Starting Ollama server..."
exec ollama serve