// ---------------------------
// DOM Elements
// ---------------------------
const chatWindow = document.getElementById('chatWindow');
const ccpInput = document.getElementById('ccpInput');
const operationInput = document.getElementById('operationInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const themeSelect = document.getElementById('themeSelect');
const datetimeDisplay = document.getElementById('datetimeDisplay');

// ---------------------------
// Event Listeners
// ---------------------------
document.addEventListener('DOMContentLoaded', initializeApp);
sendBtn.addEventListener('click', sendMessage);
ccpInput.addEventListener('keydown', handleKeyDown);
operationInput.addEventListener('keydown', handleKeyDown);
themeSelect.addEventListener('change', changeTheme);

// ---------------------------
// Chat Functionality
// ---------------------------
function initializeApp() {
    // Initialize the 3D cube
    initFuturisticCube();
    
    // Set up the date/time display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Focus the input field
    ccpInput.focus();
    
    // Load any saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'theme-futuristic';
    document.documentElement.className = savedTheme;
    themeSelect.value = savedTheme;
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    datetimeDisplay.textContent = now.toLocaleDateString('en-US', options);
}

function handleKeyDown(e) {
    // Send message when Enter is pressed (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const ccpMessage = ccpInput.value.trim();
    const operationMessage = operationInput.value.trim();
    const selectedModel = modelSelect.value;
    
    if (!ccpMessage && !operationMessage) return;
    
    // Construct the prompt
    const prompt = `CCP New Trade Message: ${ccpMessage}\nSGW Full Service Operation Message: ${operationMessage}`;
    
    // Add user message to chat
    addMessageToChat('user', prompt);
    
    // Clear input fields
    ccpInput.value = '';
    operationInput.value = '';
    
    // Show loading indicator
    const assistantMessage = addMessageToChat('assistant', 'Thinking...');
    
    // Send to backend and handle streaming response
    streamResponse(prompt, selectedModel, assistantMessage);
}

function addMessageToChat(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    
    messageDiv.appendChild(paragraph);
    chatWindow.appendChild(messageDiv);
    
    // Scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    return paragraph; // Return for updating with stream content
}

function streamResponse(prompt, model, messageElement) {
    // Create EventSource for server-sent events
    fetch('/stream_chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, model })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.body;
    })
    .then(body => {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';
        
        messageElement.textContent = '';
        
        function processStream({ done, value }) {
            if (done) {
                return;
            }
            
            buffer += decoder.decode(value, { stream: true});
            
            // Process any complete SSE messages in the buffer
            const lines = buffer.split('\n\n');
            buffer = lines.pop(); // Keep the last incomplete chunk in the buffer
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                        return;
                    } else {
                        fullResponse += data;
                        messageElement.textContent = fullResponse;
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    }
                }
            }
            
            // Continue reading
            return reader.read().then(processStream);
        }
        
        return reader.read().then(processStream);
    })
    .catch(error => {
        console.error('Error:', error);
        messageElement.textContent = 'Error: Could not connect to the AI service.';
    });
}

// ---------------------------
// Theme Management
// ---------------------------
function changeTheme() {
    const newTheme = themeSelect.value;
    document.documentElement.className = newTheme;
    localStorage.setItem('theme', newTheme);
    
    // Reinitialize the cube with new theme colors
    initFuturisticCube();
}

// ---------------------------
// 3D Cube Animation
// ---------------------------
let scene, camera, renderer, cube;

function initFuturisticCube() {
    // Get cube color from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const cubeColor = computedStyle.getPropertyValue('--cube-color').trim();
    
    // Clean up if already initialized
    if (renderer) {
        renderer.dispose();
        document.getElementById('futuristicCube').remove();
        
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'futuristicCube';
        document.body.prepend(newCanvas);
    }
    
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('futuristicCube'),
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Create cube
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const material = new THREE.MeshBasicMaterial({ 
        color: cubeColor || '#4f46e5',
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Start animation
    animateCube();
}

function animateCube() {
    requestAnimationFrame(animateCube);
    
    // Rotate the cube
    cube.rotation.x += 0.005;
    cube.rotation.y += 0.005;
    
    renderer.render(scene, camera);
}