// Barra de progreso para actualización de datos
// Muestra el porcentaje de datos actualizados en tiempo real

var progressBarState = {
  total: 0,
  completed: 0,
  isVisible: false
};

function createProgressBar() {
  // Crear el HTML de la barra de progreso
  var progressHTML = `
    <div id="progressBarContainer" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 255, 255, 0.98); border: 2px solid #7B68A6; border-radius: 12px; padding: 25px; z-index: 10000; box-shadow: 0 6px 24px rgba(123, 104, 166, 0.25); min-width: 450px;">
      <div style="text-align: center; margin-bottom: 18px;">
        <h3 style="margin: 0; color: #5A4A7D; font-size: 20px; font-weight: 600; font-family: 'Roboto', sans-serif;">Actualizando Detalles</h3>
        <p id="progressText" style="margin: 8px 0; color: #7B68A6; font-size: 14px;">Iniciando actualización...</p>
      </div>
      
      <div style="background: #F3F1F8; border-radius: 12px; height: 24px; overflow: hidden; margin-bottom: 12px; border: 1px solid #E0DBF0;">
        <div id="progressBarFill" style="background: linear-gradient(90deg, #9B8DC4, #7B68A6, #6B5896); height: 100%; width: 0%; transition: width 0.4s ease; border-radius: 12px; position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: shimmer 2s infinite;"></div>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #7B68A6; font-weight: 500;">
        <span id="progressCount">0 / 0</span>
        <span id="progressPercentage">0%</span>
      </div>
      
      <div id="progressDetails" style="margin-top: 12px; font-size: 12px; color: #9B8DC4; text-align: center;">
        <div>Tiempo estimado: <span id="estimatedTime">Calculando...</span></div>
        <div style="margin-top: 5px;">Velocidad: <span id="processingSpeed">-- items/min</span></div>
      </div>
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E0DBF0; text-align: center;">
        <span style="color: #7B68A6; font-size: 13px; font-weight: 500; font-family: 'Roboto', sans-serif;">Gerenciando Canales</span>
      </div>
    </div>
    
    <style>
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    </style>
  `;
  
  // Agregar al body si no existe
  if (!document.getElementById('progressBarContainer')) {
    document.body.insertAdjacentHTML('beforeend', progressHTML);
  }
}

function showProgressBar(total) {
  createProgressBar();
  
  progressBarState.total = total;
  progressBarState.completed = 0;
  progressBarState.isVisible = true;
  progressBarState.startTime = Date.now();
  
  document.getElementById('progressBarContainer').style.display = 'block';
  updateProgressDisplay();
}

function updateProgress(completed, currentItemName) {
  if (!progressBarState.isVisible) return;
  
  progressBarState.completed = completed;
  
  // Actualizar texto actual
  if (currentItemName) {
    document.getElementById('progressText').textContent = `Procesando: ${currentItemName}`;
  }
  
  updateProgressDisplay();
  
  // Si se completó, ocultar después de un momento
  if (completed >= progressBarState.total) {
    setTimeout(function() {
      hideProgressBar();
    }, 2000);
  }
}

function updateProgressDisplay() {
  var percentage = progressBarState.total > 0 ? 
    Math.round((progressBarState.completed / progressBarState.total) * 100) : 0;
  
  // Actualizar barra visual
  document.getElementById('progressBarFill').style.width = percentage + '%';
  
  // Actualizar textos
  document.getElementById('progressCount').textContent = 
    `${progressBarState.completed} / ${progressBarState.total}`;
  document.getElementById('progressPercentage').textContent = percentage + '%';
  
  // Calcular tiempo estimado
  if (progressBarState.completed > 0) {
    var elapsed = Date.now() - progressBarState.startTime;
    var avgTimePerItem = elapsed / progressBarState.completed;
    var remaining = progressBarState.total - progressBarState.completed;
    var estimatedMs = remaining * avgTimePerItem;
    
    var estimatedText = '';
    if (estimatedMs < 60000) {
      estimatedText = Math.round(estimatedMs / 1000) + ' segundos';
    } else {
      estimatedText = Math.round(estimatedMs / 60000) + ' minutos';
    }
    
    document.getElementById('estimatedTime').textContent = estimatedText;
    
    // Calcular velocidad
    var itemsPerMinute = Math.round((progressBarState.completed / elapsed) * 60000);
    document.getElementById('processingSpeed').textContent = itemsPerMinute + ' items/min';
  }
  
  // Actualizar texto de estado
  if (progressBarState.completed >= progressBarState.total) {
    document.getElementById('progressText').textContent = 'Actualización completada';
    document.getElementById('progressBarFill').style.background = 
      'linear-gradient(90deg, #9B8DC4, #7B68A6)';
  }
}

function hideProgressBar() {
  progressBarState.isVisible = false;
  var container = document.getElementById('progressBarContainer');
  if (container) {
    container.style.display = 'none';
  }
}

function incrementProgress(itemName) {
  if (progressBarState.isVisible) {
    updateProgress(progressBarState.completed + 1, itemName);
  }
}

// Función para mostrar progreso con detalles adicionales
function showDetailedProgress(total, title, subtitle) {
  showProgressBar(total);
  
  if (title) {
    document.querySelector('#progressBarContainer h3').textContent = title;
  }
  
  if (subtitle) {
    document.getElementById('progressText').textContent = subtitle;
  }
}

// Función para actualizar solo el texto sin cambiar el progreso
function updateProgressText(text) {
  if (progressBarState.isVisible) {
    document.getElementById('progressText').textContent = text;
  }
}

// Función para mostrar errores en la barra de progreso
function showProgressError(errorMessage) {
  if (progressBarState.isVisible) {
    document.getElementById('progressText').textContent = 'Error: ' + errorMessage;
    document.getElementById('progressBarFill').style.background = 
      'linear-gradient(90deg, #dc3545, #c82333)';
    
    setTimeout(function() {
      hideProgressBar();
    }, 3000);
  }
}

console.log('Progress bar component cargado correctamente');
