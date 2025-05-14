# Local LLM Flask App with Ollama Setup Guide

This guide provides step-by-step instructions to set up a Flask application and an Ollama container to run the `tinyllama` model. The Flask app communicates with the Ollama container to generate trade report outputs in an XML-like format (`<TrdCaptRpt>`). The setup includes building images, creating containers, and setting up a network for communication.

## Prerequisites
- **Docker Desktop** installed on your system.
- **NVIDIA Container Toolkit** (optional, for GPU support in Ollama).
- **curl** installed for testing API endpoints (on Windows, you may need to install it or use Postman).
- Project folder containing:
  - Flask app files, including `app.py`, `requirements.txt`, and `Dockerfile`.
  - A folder with the `tinyllama` model files (`Modelfile` and the model file).

## Flask App Setup

### Step 1: Build the Flask App Image
A `Dockerfile` and `requirements.txt` are provided in the project folder to build the Flask app image.

- Navigate to the project folder containing the Flask app files.
- Build the Docker image:
  ```cmd
  docker build -t flask-app:latest .
  ```
  - `-t flask-app:latest`: Tags the image as `flask-app:latest`.

### Step 2: Create the Flask App Container
Run a container using the Flask app image.

- Create the container and connect it to a custom network:
  ```cmd
  docker run -d --name flask-app -p 5000:5000 --network myapp-network flask-app:latest
  ```
  - `-d`: Runs the container in detached mode.
  - `--name flask-app`: Names the container `flask-app`.
  - `-p 5000:5000`: Maps port 5000 to the host.
  - `--network myapp-network`: Connects to the `myapp-network` (created later).

## Ollama Setup

### Step 3: Prepare the Model Files
Ensure you have the `tinyllama` model files (`Modelfile` and the model file) in a folder within your project.

### Step 4: Create a Volume for Ollama
Create a Docker volume to store the `tinyllama` model files.

- Run:
  ```cmd
  docker volume create tinyllama_volume
  ```

### Step 5: Copy Model Files into the Volume
Use a temporary container to copy the model files into the volume.

- Run the following command, replacing `<path-to-model-folder>` with the path to the folder containing the `Modelfile` and model file:
  ```cmd
  docker run --rm -v "<path-to-model-folder>:/models" -v tinyllama_volume:/root/.ollama busybox sh -c "cp /models/Modelfile /root/.ollama/ && cp /models/unsloth.Q8_0.gguf /root/.ollama/"
  ```
  - This copies the `Modelfile` and model file into the volume.

### Step 6: Run the Ollama Container
Start the Ollama container and create the `tinyllama` model.

- Run the container:
  ```cmd
  docker run -d --gpus all --name ollama -v tinyllama_volume:/root/.ollama -p 11434:11434 --network myapp-network ollama/ollama
  ```
  - `--gpus all`: Enables GPU support (omit if not using GPU).

- Access the container to create the model:
  ```cmd
  docker exec -it ollama bash
  ollama create tinyllama -f /root/.ollama/Modelfile
  exit
  ```

- Verify the model:
  ```cmd
  docker exec ollama ollama list
  ```
  - Look for `tinyllama` in the output.

## Network Setup

### Step 7: Create a Custom Network
Create a Docker network for the Flask app and Ollama containers to communicate.

- Run:
  ```cmd
  docker network create myapp-network
  ```
  - This creates a bridge network named `myapp-network`.
  - Both containers are already connected to this network (as specified in the `docker run` commands).

## Docker Compose Setup

### Step 8: Use Docker Compose to Run the Application
A `docker-compose.yml` file is provided to simplify running both the Flask app and Ollama containers with a single command.

- Ensure you have a `docker-compose.yml` file in your project directory 
- **Important**: If your system does not have a GPU or the NVIDIA Container Toolkit installed, comment out the `deploy` section in the `docker-compose.yml` file to avoid errors:
  ```yaml
  # deploy:
  #   resources:
  #     reservations:
  #       devices:
  #         - driver: nvidia
  #           count: all
  #           capabilities: [gpu]
  ```

- Run the following command to start both containers:
  ```cmd
  docker-compose up -d
  ```
  - `-d`: Runs the containers in detached mode.
  - This command builds the Flask app image, creates the network, sets up the volume, and starts both the Flask app and Ollama containers.

- After running, follow **Step 6** to create the `tinyllama` model inside the Ollama container.

## Testing the Setup

### Step 9: Test the Ollama Container
Test the Ollama container directly using `curl`.

- Send a request:
  ```cmd
  curl http://localhost:11434/api/generate -d "{\"model\": \"tinyllama\", \"prompt\": \"Hello, world!\"}"
  ```

### Step 10: Test the Flask App
Test the Flask app, which communicates with the Ollama container, using Postman.

- Open Postman.
- Create a POST request:
  - **URL**: `http://localhost:5000/stream_chat`
  - **Method**: POST
  - **Body**: Select `raw` and `JSON`, then enter:
    ```json
    {
      "prompt": "Hello, test message",
      "model": "tinyllama"
    }
    ```
- Send the request.

## Additional Notes

### GPU Support
- GPU support requires the NVIDIA Container Toolkit. Verify it’s installed:
  ```cmd
  docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu20.04 nvidia-smi
  ```
- Monitor GPU usage during inference:
  ```cmd
  nvidia-smi
  ```

### Troubleshooting
- **Container Not Running**:
  - Check status:
    ```cmd
    docker ps
    ```
  - View logs:
    ```cmd
    docker logs flask-app
    docker logs ollama
    ```
- **Network Issues**:
  - Verify network:
    ```cmd
    docker network inspect myapp-network
    ```
- **Model Not Found**:
  - Ensure the `tinyllama` model is created (Step 6).

## Conclusion
This setup allows you to run a Flask app that communicates with an Ollama container running the `tinyllama` model. Using Docker Compose simplifies the process by starting both containers with a single command. Test thoroughly and adjust as needed.