/*===================================== CHANNEL PARAMETERS ======================================*/
//Number of channels to initialize
const NUM_OF_CHANNELS = 3;

/*===================================== CHANNEL FUNCTIONS ======================================*/
// Initialize the page with 3 audio channels and 2 main channels
function initializeChannels() 
{
    const container = document.getElementById('channels-container');

    // Add 3 audio channels
    for (let i = 0; i < NUM_OF_CHANNELS; i++) {
        addChannel(i, container);
    }

    // Add MAIN L and MAIN R channels to the main container
    const mainContainer = document.getElementById('main-channels-container');
    mainContainer.style.display = 'flex';  // Asegurar que el contenedor principal sea flexbox
    mainContainer.style.flexDirection = 'row';  // Alinear horizontalmente
    mainContainer.style.gap = '110px';  // Espaciado entre los faders
    //addMainChannel("Left", mainContainer);
    addMainChannel("Right", mainContainer);
}

// Function to create and append a new audio channel
function addChannel(channelNumber, container = document.getElementById('channels-container')) {
    const channelDiv = document.createElement('div');
    channelDiv.classList.add('bottom-box');
    channelDiv.innerHTML = `
        <h3>Ch ${channelNumber+1}</h3>

        <button class="eq-btn" data-channel="${channelNumber}" onclick="selectChannel(${channelNumber})" id="eq-button${channelNumber}">EQ</button>
        
        <div class="range_content">
            <div class="range_slider">
                <div class="range_slider-line" id="range-line${channelNumber}"></div>
            </div>
            <div class="range_thumb" id="range-thumb${channelNumber}">
                <div class="range_value">
                    <span class="range_value-number" id="range-number${channelNumber}">50</span>
                </div>
            </div>
            <input type="range" class="range_input" id="range-input${channelNumber}" min="0" max="100" value="50" step="1">
        </div>

    `;
 
    // To add a mute button  
    // <button class="mute-btn" onclick="muteFilter(${channelNumber})" id="mute-button${channelNumber}">MUTE</button>
     
    container.insertBefore(channelDiv, document.getElementById('main-channels-container'));

    // Event Listener with debouncer//
    const rangeInput = document.getElementById(`range-input${channelNumber}`);


    let debounceTimer;
    rangeInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);  // Reset timer on each input event
        debounceTimer = setTimeout(() => {
            ws_sendChannelVolume(channelNumber, rangeInput.value);
            // console.log(`Channel ${channelNumber} value: ${rangeInput.value}`);
        }, 70);  // Adjust delay (in milliseconds) as needed
});
}

// Function to create and append a new main channel
function addMainChannel(name, container) {
    const channelDiv = document.createElement('div');
    channelDiv.classList.add('bottom-box');
    channelDiv.innerHTML = `
        <h3>Master</h3><div class="range_content">
            <div class="range_slider">
                <div class="range_slider-line" id="range-line-${name}"></div>
            </div>
            <div class="range_thumb" id="range-thumb-${name}">
                <div class="range_value">
                    <span class="range_value-number" id="range-number-${name}">50</span>
                </div>
            </div>
            <input type="range" class="range_input" id="range-input-${name}" min="0" max="100" value="50" step="1">
        </div>
        
    `;
    //To add mute btn
    // <button class="mute-btn" onclick="muteFilter('${name}')" id="mute-button-${name}">MUTE</button>


    container.appendChild(channelDiv);


    const rangeInput = document.getElementById(`range-input-${name}`);


    let debounceTimer;
    rangeInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);  // Reset timer on each input event
        debounceTimer = setTimeout(() => {
            ws_sendChannelVolume(9, rangeInput.value);
            // console.log(`Channel ${channelNumber} value: ${rangeInput.value}`);
        }, 70);  // Adjust delay (in milliseconds) as needed





/*     rangeInput.addEventListener('input', () => {
        ws_sendChannelVolume(name, rangeInput.value);
        //console.log(`Main Channel ${name} value: ${rangeInput.value}`); */
    });

}

// Placeholder functions for EQ and MUTE
function eqFilter(channel)
{
    console.log(`EQ Filter toggled for ${channel}`);
    alert(`EQ Filter toggled for ${channel}`);
}

function muteFilter(channel) {
    console.log(`Mute toggled for ${channel}`);
}

// Initialize the page
initializeChannels();

function setupRangeSlider(rangeThumbId, rangeNumberId, rangeLineId, rangeInputId, muteButtonId)
{
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

    };
    
    rangeInput.addEventListener('input', rangeInputSlider);
    rangeInputSlider(); // Inicializar el valor

    if (muteButton) {
        muteButton.addEventListener('click', function()
        {
            toggleMute(muteButton, rangeInput);
        });
    }
}

function toggleMute(muteButton, rangeInput)
{
    // IF button is muted, unmute
    if (rangeInput.disabled) 
    {
        rangeInput.disabled = false;
        muteButton.textContent = 'MUTE'; // Cambiar el texto del botón a "Mute"

        // send value to websockets


        //rangeInput.value = muteButton.dataset.previousValue || 50; // Restaurar valor anterior o establecer por defecto a 50
    }

    //Mute
    else
    {
        muteButton.dataset.previousValue = rangeInput.value; // Guardar el valor actual antes de mutear
        rangeInput.value = 0; // Setear el valor del fader a 0 cuando está muteado
        rangeInput.disabled = true;
        muteButton.textContent = 'Unmute'; // Cambiar el texto del botón a "Unmute"
    }
}

/*===================================== INITIALIZE CHANNELS ======================================*/
// Configura los canales para los faders
setupRangeSlider('range-thumb0', 'range-number0', 'range-line0', 'range-input0', 'mute-button0');
setupRangeSlider('range-thumb1', 'range-number1', 'range-line1', 'range-input1', 'mute-button1');
setupRangeSlider('range-thumb2', 'range-number2', 'range-line2', 'range-input2', 'mute-button2');
setupRangeSlider('range-thumb-Right', 'range-number-Right', 'range-line-Right', 'range-input-Right', 'mute-button-Right');
