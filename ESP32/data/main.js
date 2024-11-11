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

function setupMuteButton(muteButtonId, rangeInputId) {
    const muteButton = document.getElementById(muteButtonId);
    const rangeInput = document.getElementById(rangeInputId);

    muteButton.addEventListener('click', function() {
        toggleMute(muteButton, rangeInput);
    });
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
setupRangeSlider('range-thumb1', 'range-number1', 'range-line1', 'range-input1');
setupRangeSlider('range-thumb2', 'range-number2', 'range-line2', 'range-input2');
setupRangeSlider('range-thumb3', 'range-number3', 'range-line3', 'range-input3');
setupRangeSlider('range-thumb4', 'range-number4', 'range-line4', 'range-input4');
setupRangeSlider('range-thumb-right', 'range-number-right', 'range-lineright', 'range-input-right');
setupRangeSlider('range-thumb-left', 'range-number-left', 'range-line-left', 'range-input-left');

//Configura los botones mute para los 6 canales
setupMuteButton('mute-button1', 'range-input1');
setupMuteButton('mute-button2', 'range-input2');
setupMuteButton('mute-button3', 'range-input3');
setupMuteButton('mute-button4', 'range-input4');
setupMuteButton('mute-button-right', 'range-input-right');
setupMuteButton('mute-button-left', 'range-input-left');
