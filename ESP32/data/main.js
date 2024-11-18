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
    eqWindows[channelKey] = window.open("", `Channel${channel}EQ`, "width=1200,height=600");

    // Definir el contenido HTML de la nueva ventana
    eqWindows[channelKey].document.write(`
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DigiMix Proofs</title>

        <!--=============== Achivos Css ===============-->
        <link rel="stylesheet" href="styles.css">
        </head>

        <body>
            <div class="container">
                <!--Canal 1-->
                <div class="upper-content">
                    <div class="upper-box">

                        <!--Lado izquierdo para la modificación de las señales de EQ-->
                        <div class="lado-izquierdo">
                            <div class="parte-superior">
                                <div class="small-box">
                                    <h3><span style="color:#256b74"> Channel ${channel} </span></h3>
                                </div>
                            </div>

                            <div class="parte-inferior">
                                <!--Selección de Filtros-->
                                <div class="filter-container">
                                    <label for="filterSelect">Select Filter: </label>
                                    <select id="filterSelect" onchange="onFilterDropdownChange1()"></select>
                                </div>

                                <!--Manipulación de señales-->
                                <div id="controls">
                                    <br><br>
                                    <div class="slider-container">
                                        <label>Frequency: <span id="frequencyValue">1000 Hz</span></label>
                                        <br>
                                        <input type="range" id="frequencySlider" min="20" max="20000" value="1000" step="1">
                                    </div>
                                    <br><br>
                                    <div class="slider-container">
                                        <label>Gain: <span id="gainValue">0 dB</span></label>
                                        <br>
                                        <input type="range" id="gainSlider" min="-20" max="20" value="0" step="0.1">
                                    </div>
                                    <br><br>
                                    <div class="slider-container">
                                        <label>Q: <span id="qValue">1.0</span></label>
                                        <br>
                                        <input type="range" id="qSlider" min="0.05" max="10" value="1" step="0.05">
                                    </div>
                                </div>

                                <br><br>
                                <!--Creación y eliminación de filtros-->
                                <!--<button class="mute-btn" onclick="muteFilter()" id="mute-button1">MUTE</button>-->
                                <button class="add_remove-btn" onclick="addFilter()"> Add Filter </button>
                                <button class="add_remove-btn" onclick="removeFilter()"> Remove Filter </button>
                            
                            </div>
                        </div>

                        <!--Lado derecho del cuadro celeste con la tabla del EQ-->
                        <div class="lado-derecho">
                            <div class="parte-superior"></div>
                            <div class="pare-inferior">
                                <!-- width="800" height="400"-->
                                <canvas id="graph" width="800" height="400"></canvas>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>
            <script src="eq_channel1.js"></script>
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
