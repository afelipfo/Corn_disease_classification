// Corn Disease AI - Simplified Working Version

class CornDiseaseApp {
    constructor() {
        this.apiEndpoint = 'https://felipepflorezo-corn-disease-api.hf.space/predict';
        this.currentFile = null;
        this.predictionHistory = [];
        this.initializeElements();
        this.bindEvents();
        this.loadHistoryFromStorage();
        // No mostrar estado de API por defecto
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.imagePreviewContainer = document.getElementById('imagePreviewContainer');
        this.imagePreview = document.getElementById('imagePreview');
        this.actionButtons = document.getElementById('actionButtons');
        this.changeImageBtn = document.getElementById('changeImageBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultCard = document.getElementById('resultCard');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Status elements
        this.apiStatus = document.getElementById('apiStatus');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusText = document.getElementById('statusText');
        
        // Continue/History elements
        this.continueSection = document.getElementById('continueSection');
        this.continueBtn = document.getElementById('continueBtn');
        this.exitBtn = document.getElementById('exitBtn');
        this.historySection = document.getElementById('historySection');
        this.historyList = document.getElementById('historyList');
        this.historyCount = document.getElementById('historyCount');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    }

    bindEvents() {
        // Upload area events - Mejorado para asegurar que el clic funcione
        this.uploadArea.addEventListener('click', (e) => {
            console.log('Upload area clicked!');
            e.preventDefault();
            e.stopPropagation();
            console.log('Triggering file input click...');
            this.fileInput.click();
            console.log('File input click triggered');
        }, true);  // Usar capture para asegurar que se ejecute primero
        
        // Agregar eventos a elementos hijos para asegurar que el clic funcione
        const uploadIcon = this.uploadArea.querySelector('.upload-icon');
        const uploadText = this.uploadArea.querySelector('.upload-text');
        const uploadSubtext = this.uploadArea.querySelector('.upload-subtext');
        
        [uploadIcon, uploadText, uploadSubtext].forEach(element => {
            if (element) {
                element.addEventListener('click', (e) => {
                    console.log('Child element clicked, triggering file input');
                    e.preventDefault();
                    e.stopPropagation();
                    this.fileInput.click();
                });
            }
        });
        
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            console.log('File input changed:', e.target.files);
            this.handleFileSelect(e);
        });

        // Button events
        this.changeImageBtn.addEventListener('click', (e) => {
            console.log('Change image button clicked!');
            e.preventDefault();
            this.fileInput.click();
        });
        this.analyzeBtn.addEventListener('click', this.analyzeImage.bind(this));
        this.continueBtn.addEventListener('click', this.continueAnalysis.bind(this));
        this.exitBtn.addEventListener('click', this.exitApplication.bind(this));
        this.clearHistoryBtn.addEventListener('click', this.clearHistory.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Por favor selecciona un archivo de imagen válido (JPG, PNG, JPEG).');
            return;
        }

        this.currentFile = file;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.imagePreview.src = e.target.result;
            this.showImagePreview();
        };
        
        reader.readAsDataURL(file);
    }

    showImagePreview() {
        this.imagePreviewContainer.style.display = 'block';
        this.actionButtons.style.display = 'flex';
        this.resultsSection.classList.remove('show');
        
        setTimeout(() => {
            this.imagePreviewContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }

    async analyzeImage() {
        if (!this.currentFile) {
            this.showError('Por favor selecciona una imagen primero.');
            return;
        }

        console.log('Iniciando análisis de imagen...');
        this.showLoading(true);
        this.analyzeBtn.disabled = true;
        this.setApiStatus('checking', 'Analizando imagen...');

        const formData = new FormData();
        formData.append('file', this.currentFile);

        try {
            console.log('Enviando solicitud a:', this.apiEndpoint);
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });

            console.log('Respuesta recibida. Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Error del servidor (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            // Verificar que los datos tengan la estructura esperada
            if (!data.predicted_class || !data.confidence || !data.all_probabilities) {
                throw new Error('Respuesta inválida del servidor');
            }
            
            this.displayResults(data);
            this.addToHistory(data);
            this.showContinueOptions();
            this.setApiStatus('online', 'Análisis completado exitosamente');

        } catch (error) {
            console.error('Error completo:', error);
            this.setApiStatus('offline', 'Error en el análisis');
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showError('Error de conexión: No se pudo conectar con el servidor. Verifique su conexión a internet.');
            } else if (error.message.includes('CORS')) {
                this.showError('Error de CORS: Problema de configuración del navegador.');
            } else {
                this.showError(`Error: ${error.message}`);
            }
        } finally {
            this.showLoading(false);
            this.analyzeBtn.disabled = false;
        }
    }

    displayResults(data) {
        const diseaseIcons = {
            'Blight': { icon: '🦠', class: 'icon-blight' },
            'Common_Rust': { icon: '🔶', class: 'icon-rust' },
            'Gray_Leaf_Spot': { icon: '⚫', class: 'icon-spot' },
            'Healthy': { icon: '✅', class: 'icon-healthy' }
        };

        const diseaseNames = {
            'Blight': 'Tizón',
            'Common_Rust': 'Roya Común',
            'Gray_Leaf_Spot': 'Mancha Gris',
            'Healthy': 'Saludable'
        };

        const predictedClass = data.predicted_class;
        const confidence = data.confidence;
        const probabilities = data.all_probabilities;

        let resultHTML = `
            <div class="diagnosis-header">
                <div class="diagnosis-title">Diagnóstico</div>
                <div class="diagnosis-value">${diseaseNames[predictedClass] || predictedClass}</div>
                <div class="confidence-badge">
                    <i class="fas fa-check-circle"></i>
                    Confianza: ${confidence}
                </div>
            </div>
            <div class="probabilities-section">
                <div class="probabilities-title">Análisis Detallado</div>
        `;

        // Sort probabilities by value (descending)
        const sortedProbs = Object.entries(probabilities)
            .sort(([,a], [,b]) => parseFloat(b.replace('%', '')) - parseFloat(a.replace('%', '')));

        sortedProbs.forEach(([className, prob], index) => {
            const isHighest = index === 0;
            const diseaseInfo = diseaseIcons[className] || { icon: '❓', class: 'icon-default' };
            const displayName = diseaseNames[className] || className;
            
            resultHTML += `
                <div class="probability-item ${isHighest ? 'highest' : ''}">
                    <div class="probability-name">
                        <div class="disease-icon ${diseaseInfo.class}">${diseaseInfo.icon}</div>
                        ${displayName}
                    </div>
                    <div class="probability-value">${prob}</div>
                </div>
            `;
        });

        resultHTML += '</div>';
        
        this.resultCard.innerHTML = resultHTML;
        this.resultsSection.classList.add('show');

        setTimeout(() => {
            this.resultsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
    }

    showError(message) {
        this.resultCard.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
        this.resultsSection.classList.add('show');
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    setApiStatus(status, message) {
        if (this.apiStatus) {
            this.apiStatus.className = `api-status ${status}`;
            this.statusText.textContent = message;
        }
    }

    addToHistory(data) {
        const diseaseNames = {
            'Blight': 'Tizón',
            'Common_Rust': 'Roya Común',
            'Gray_Leaf_Spot': 'Mancha Gris',
            'Healthy': 'Saludable'
        };

        const historyItem = {
            id: Date.now(),
            diagnosis: diseaseNames[data.predicted_class] || data.predicted_class,
            confidence: data.confidence,
            timestamp: new Date().toLocaleString('es-ES'),
            fileName: this.currentFile ? this.currentFile.name : 'Imagen desconocida'
        };

        this.predictionHistory.unshift(historyItem);
        this.saveHistoryToStorage();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        if (!this.historyCount) return;
        
        this.historyCount.textContent = this.predictionHistory.length;

        if (this.predictionHistory.length === 0) {
            this.historyList.innerHTML = `
                <div style="text-align: center; color: #666; font-style: italic;">
                    No hay predicciones aún
                </div>
            `;
            this.historySection.classList.remove('show');
            return;
        }

        let historyHTML = '';
        this.predictionHistory.forEach(item => {
            const diseaseIcons = {
                'Tizón': '🦠',
                'Roya Común': '🔶',
                'Mancha Gris': '⚫',
                'Saludable': '✅'
            };

            const icon = diseaseIcons[item.diagnosis] || '❓';

            historyHTML += `
                <div class="history-item">
                    <div class="history-diagnosis">
                        <span style="font-size: 1.2rem;">${icon}</span>
                        ${item.diagnosis}
                        <div class="history-time">${item.timestamp}</div>
                    </div>
                    <div class="history-confidence">${item.confidence}</div>
                </div>
            `;
        });

        this.historyList.innerHTML = historyHTML;
        this.historySection.classList.add('show');
    }

    showContinueOptions() {
        if (this.continueSection) {
            this.continueSection.style.display = 'block';
            
            setTimeout(() => {
                this.continueSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 500);
        }
    }

    continueAnalysis() {
        this.currentFile = null;
        this.imagePreviewContainer.style.display = 'none';
        this.actionButtons.style.display = 'none';
        this.resultsSection.classList.remove('show');
        this.continueSection.style.display = 'none';
        this.fileInput.value = '';
        // Reset sin mostrar estado de API

        this.uploadArea.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    exitApplication() {
        if (confirm('¿Estás seguro de que deseas salir de la aplicación?')) {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: 'Inter', sans-serif;
                    text-align: center;
                    color: white;
                ">
                    <div style="
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(20px);
                        padding: 3rem;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    ">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🌽</div>
                        <h1 style="font-size: 2rem; margin-bottom: 1rem;">¡Gracias por usar Corn Disease AI!</h1>
                        <p style="font-size: 1.2rem; opacity: 0.9;">Esperamos haberte ayudado con el diagnóstico de tus cultivos</p>
                    </div>
                </div>
            `;
        }
    }

    clearHistory() {
        if (confirm('¿Estás seguro de que deseas limpiar todo el historial?')) {
            this.predictionHistory = [];
            this.saveHistoryToStorage();
            this.updateHistoryDisplay();
        }
    }

    saveHistoryToStorage() {
        try {
            localStorage.setItem('cornDiseaseHistory', JSON.stringify(this.predictionHistory));
        } catch (error) {
            console.warn('No se pudo guardar el historial:', error);
        }
    }

    loadHistoryFromStorage() {
        try {
            const savedHistory = localStorage.getItem('cornDiseaseHistory');
            if (savedHistory) {
                this.predictionHistory = JSON.parse(savedHistory);
                this.updateHistoryDisplay();
            }
        } catch (error) {
            console.warn('No se pudo cargar el historial:', error);
            this.predictionHistory = [];
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando Corn Disease AI...');
    try {
        new CornDiseaseApp();
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
    }
});
