function setupRangeSlider(rangeThumbId, 
                          rangeNumberId, 
                          rangeLineId, 
                          rangeInputId, 
                          muteButtonId) {
    const rangeThumb = document.getElementById(rangeThumbId),
          rangeNumber = document.getElementById(rangeNumberId),
          rangeLine = document.getElementById(rangeLineId),
          rangeInput = document.getElementById(rangeInputId),
          muteButton = document.getElementById(muteButtonId);
    
      
    const rangeInputSlider = () => {
        rangeNumber.textContent = rangeInput.value;

        const thumbPosition = 1 - (rangeInput.value / rangeInput.max);
        const space = rangeInput.offsetWidth - rangeThumb.offsetWidth;

        rangeThumb.style.top = (thumbPosition * space) + 'px';
        
        /* Invertimos la altura de la línea de color
        const invertedHeight = 100 - rangeInput.value;
        rangeLine.style.height = invertedHeight + '%';*/
    };
    
    rangeInput.addEventListener('input', rangeInputSlider);
    rangeInputSlider(); // Inicializar el valor

    if (muteButton) {
        muteButton.addEventListener('click', function() {
            toggleMute(muteButton, rangeInput);
        });
    }
}

function toggleMute(muteButton, rangeInput) {
    // Alternar entre mute/unmute
    if (rangeInput.disabled) {
        rangeInput.disabled = false;
        muteButton.textContent = 'MUTE'; // Cambiar el texto del botón a "Mute"
        rangeInput.value = muteButton.dataset.previousValue || 50; // Restaurar valor anterior o establecer por defecto a 50
    } else {
        muteButton.dataset.previousValue = rangeInput.value; // Guardar el valor actual antes de mutear
        rangeInput.value = 0; // Setear el valor del fader a 0 cuando está muteado
        rangeInput.disabled = true;
        muteButton.textContent = 'Unmute'; // Cambiar el texto del botón a "Unmute"
    }
}

// Configura los canales para los faders
setupRangeSlider('range-thumb1', 'range-number1', 'range-line1', 'range-input1', 'mute-button1');
setupRangeSlider('range-thumb2', 'range-number2', 'range-line2', 'range-input2', 'mute-button2');
setupRangeSlider('range-thumb3', 'range-number3', 'range-line3', 'range-input3', 'mute-button3');
setupRangeSlider('range-thumb4', 'range-number4', 'range-line4', 'range-input4', 'mute-button4');
setupRangeSlider('range-thumb-right', 'range-number-right', 'range-lineright', 'range-input-right', 'mute-button-right');
setupRangeSlider('range-thumb-left', 'range-number-left', 'range-line-left', 'range-input-left', 'mute-button-left');

/********************************************************************************************************************************/

const eqWindows = {
    channel1: null,
    channel2: null,
    channel3: null,
    channel4: null
};


function eqFilter(channel) {
    const channelKey = `channel${channel}`;
    const eqButton = document.querySelector(`.eq-btn[data-channel="${channel}"]`);

    // Si la ventana ya está abierta, la cerramos
    if (eqWindows[channelKey] && !eqWindows[channelKey].closed) {
        eqWindows[channelKey].close();
        eqWindows[channelKey] = null;
        eqButton.classList.remove('active');
        return;
    }

    // Crear una nueva ventana si no está abierta
    eqWindows[channelKey] = window.open("", `Channel${channel}EQ`, "width=800,height=600");

    // Definir el contenido HTML de la nueva ventana
    eqWindows[channelKey].document.write(`
        <html>
        <head>
            <title>EQ Channel ${channel}</title>
            <link rel="stylesheet" href="styles.css">
        </head>
        <body>
            <h2>Equalizer for Channel ${channel}</h2>
            
            <!-- Selección de Filtros -->
            <div class="filter-container">
                <label for="filterSelect">Select Filter: </label>
                <select id="filterSelect" onchange="onFilterDropdownChange()"></select>
            </div>

            <!-- Controles de Filtros -->
            <div id="controls">
                <div class="slider-container">
                    <label>Frequency: <span id="frequencyValue">1000 Hz</span></label>
                    <input type="range" id="frequencySlider" min="20" max="20000" value="1000" step="1" onchange="updateFrequency()">
                </div>
                <div class="slider-container">
                    <label>Gain: <span id="gainValue">0 dB</span></label>
                    <input type="range" id="gainSlider" min="-20" max="20" value="0" step="0.1" onchange="updateGain()">
                </div>
                <div class="slider-container">
                    <label>Q: <span id="qValue">1.0</span></label>
                    <input type="range" id="qSlider" min="0.05" max="10" value="1" step="0.05" onchange="updateQ()">
                </div>
            </div>
            
            <button onclick="addFilter()">Add Filter</button>
            <button onclick="removeFilter()">Remove Filter</button>
            
            <canvas id="graph" width="700" height="300"></canvas>

            <script src="eq.js"></script>
        </body>
        </html>
    `);

    // Forzar la recarga del archivo de JavaScript en la nueva ventana
    eqWindows[channelKey].onload = function() {
        const script = eqWindows[channelKey].document.createElement('script');
        script.src = 'eq.js';
        eqWindows[channelKey].document.body.appendChild(script);
    };

    // Cambiar el estado del botón a activado
    eqButton.classList.add('active');
}
