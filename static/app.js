// ---------------------------
// DOM Elements
// ---------------------------
const chatWindow = document.getElementById('chatWindow');
const inputArea = document.getElementById('inputArea');
const dualInputTemplate = document.getElementById('dualInputTemplate');
const singleInputTemplate = document.getElementById('singleInputTemplate');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const themeSelect = document.getElementById('themeSelect');
const datetimeDisplay = document.getElementById('datetimeDisplay');

// Debug: Log element availability
console.log('chatWindow:', chatWindow);
console.log('inputArea:', inputArea);
console.log('dualInputTemplate:', dualInputTemplate);
console.log('singleInputTemplate:', singleInputTemplate);
console.log('sendBtn:', sendBtn);
console.log('modelSelect:', modelSelect);
console.log('themeSelect:', themeSelect);
console.log('datetimeDisplay:', datetimeDisplay);

// Dynamic input elements (will be updated based on model)
let ccpInput, operationInput, singleInput;

// ---------------------------
// Event Listeners
// ---------------------------
document.addEventListener('DOMContentLoaded', initializeApp);

// Conditional event listeners
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
} else {
    console.error('sendBtn element not found');
}

if (modelSelect) {
    modelSelect.addEventListener('change', updateInputArea);
} else {
    console.error('modelSelect element not found');
}

if (themeSelect) {
    themeSelect.addEventListener('change', changeTheme);
} else {
    console.error('themeSelect element not found');
}

// ---------------------------
// Chat Functionality
// ---------------------------
function initializeApp() {
    // Initialize input elements
    ccpInput = document.getElementById('ccpInput');
    operationInput = document.getElementById('operationInput');
    singleInput = document.getElementById('singleInput');

    console.log('ccpInput:', ccpInput);
    console.log('operationInput:', operationInput);
    console.log('singleInput:', singleInput);

    // Attach initial keydown listeners for dual input
    if (ccpInput) ccpInput.addEventListener('keydown', handleKeyDown);
    if (operationInput) operationInput.addEventListener('keydown', handleKeyDown);

    // Initialize the 3D cube (will fail gracefully if canvas is missing)
    if (document.getElementById('futuristicCube')) {
        initFuturisticCube();
    } else {
        console.warn('futuristicCube canvas not found, skipping 3D cube initialization');
    }
    
    // Set up the date/time display
    if (datetimeDisplay) {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }
    
    // Focus the appropriate input field based on the initial model
    updateInputArea();
    
    // Load any saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'theme-futuristic';
    document.documentElement.className = savedTheme;
    if (themeSelect) themeSelect.value = savedTheme;
}

function updateDateTime() {
    if (datetimeDisplay) {
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
}

function updateInputArea() {
    const selectedModel = modelSelect ? modelSelect.value : '';
    const isTinyllama = selectedModel === 'tinyllama:latest';

    // Show/hide input templates
    if (dualInputTemplate && singleInputTemplate) {
        if (isTinyllama) {
            dualInputTemplate.style.display = 'block';
            singleInputTemplate.style.display = 'none';
            if (ccpInput) ccpInput.addEventListener('keydown', handleKeyDown);
            if (operationInput) operationInput.addEventListener('keydown', handleKeyDown);
            if (singleInput) singleInput.removeEventListener('keydown', handleKeyDown);
            if (ccpInput) ccpInput.focus();
        } else {
            dualInputTemplate.style.display = 'none';
            singleInputTemplate.style.display = 'block';
            if (singleInput) singleInput.addEventListener('keydown', handleKeyDown);
            if (ccpInput) ccpInput.removeEventListener('keydown', handleKeyDown);
            if (operationInput) operationInput.removeEventListener('keydown', handleKeyDown);
            if (singleInput) singleInput.focus();
        }
    } else {
        console.error('dualInputTemplate or singleInputTemplate not found');
    }
}

function handleKeyDown(e) {
    // Send message when Enter is pressed (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (sendBtn) sendMessage();
    }
}

function sendMessage() {
    if (!modelSelect || !sendBtn) {
        console.error('modelSelect or sendBtn not available, cannot send message');
        return;
    }
    const selectedModel = modelSelect.value;
    const isTinyllama = selectedModel === 'tinyllama:latest';
    let prompt = '';

    // Construct prompt based on the selected model
    if (isTinyllama) {
        const ccpMessage = ccpInput ? ccpInput.value.trim() : '';
        const operationMessage = operationInput ? operationInput.value.trim() : '';
        if (!ccpMessage && !operationMessage) return;
        prompt = `CCP New Trade Message: ${ccpMessage} SGW Full Service Operation Message: ${operationMessage}`;
        if (ccpInput) ccpInput.value = '';
        if (operationInput) operationInput.value = '';
    } else {
        const message = singleInput ? singleInput.value.trim() : '';
        if (!message) return;
        prompt = message;
        if (singleInput) singleInput.value = '';
    }

    // Add user message to chat
    if (chatWindow) addMessageToChat('user', prompt);

    // Show loading indicator
    const assistantMessage = chatWindow ? addMessageToChat('assistant', 'Thinking...') : null;

    // Send to backend and handle streaming response
    if (assistantMessage) streamResponse(prompt, selectedModel, assistantMessage);
}

function addMessageToChat(sender, content) {
    if (chatWindow) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const paragraph = document.createElement('p');
        paragraph.textContent = content;
        
        messageDiv.appendChild(paragraph);
        chatWindow.appendChild(messageDiv);
        
        // Scroll to bottom
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        return paragraph;
    }
    return null;
}

function streamResponse(prompt, model, messageElement) {
    if (messageElement) {
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
                
                const lines = buffer.split('\n\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            return;
                        } else {
                            fullResponse += data;
                            messageElement.textContent = fullResponse;
                            if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
                    }
                }
                
                return reader.read().then(processStream);
            }
            
            return reader.read().then(processStream);
        })
        .catch(error => {
            console.error('Error:', error);
            if (messageElement) messageElement.textContent = 'Error: Could not connect to the AI service.';
        });
    }
}

// ---------------------------
// Theme Management
// ---------------------------
function changeTheme() {
    if (themeSelect) {
        const newTheme = themeSelect.value;
        document.documentElement.className = newTheme;
        localStorage.setItem('theme', newTheme);
        
        // Reinitialize the cube with new theme colors
        if (document.getElementById('futuristicCube')) {
            initFuturisticCube();
        }
    }
}

// ---------------------------
// 3D Cube Animation
// ---------------------------
let scene, camera, renderer, cube;

function initFuturisticCube() {
    const futuristicCube = document.getElementById('futuristicCube');
    if (!futuristicCube) {
        console.error('futuristicCube canvas not found');
        return;
    }

    // Get cube color from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const cubeColor = computedStyle.getPropertyValue('--cube-color').trim();
    
    // Clean up if already initialized
    if (renderer) {
        renderer.dispose();
        futuristicCube.remove();
        
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
        canvas: futuristicCube,
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
    if (renderer && cube) {
        requestAnimationFrame(animateCube);
        
        // Rotate the cube
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;
        
        renderer.render(scene, camera);
    }
}