function setupRangeSlider(rangeThumbId, rangeNumberId, rangeLineId, rangeInputId) {
    const rangeThumb = document.getElementById(rangeThumbId),
          rangeNumber = document.getElementById(rangeNumberId),
          rangeLine = document.getElementById(rangeLineId),
          rangeInput = document.getElementById(rangeInputId);
      
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
}

// Configura los cuatro canales
setupRangeSlider('range-thumb1', 'range-number1', 'range-line1', 'range-input1');
setupRangeSlider('range-thumb2', 'range-number2', 'range-line2', 'range-input2');
setupRangeSlider('range-thumb3', 'range-number3', 'range-line3', 'range-input3');
setupRangeSlider('range-thumb4', 'range-number4', 'range-line4', 'range-input4');
setupRangeSlider('range-thumb-right', 'range-number-right', 'range-lineright', 'range-input-right');
setupRangeSlider('range-thumb-left', 'range-number-left', 'range-line-left', 'range-input-left');
