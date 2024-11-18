/*
 * ARCHIVO: EQ4.js
 * 
 * AUTOR: Alfredo Romo
 * 
 * Este archivo contiene la implementación duplicada de un ecualizador gráfico utilizando el lienzo HTML5.
 * El ecualizador permite a los usuarios agregar, eliminar y manipular filtros que ajustan
 * la respuesta en frecuencia de una señal de audio.
 * 
 * Integra comunicación WebSocket
*/

// Elegir si imprimir mientras se arrastra el punto del filtro o cuando se termine de arrastrar
let printOnMove3 = false; // Bandera para controlar si se imprimen los valores del filtro mientras se arrastra o después de arrastrar

// Elementos del lienzo en el cuerpo de HTML
const canvas3 = document.getElementById('graph3'); // Obtener el elemento del lienzo
const ctx3 = canvas3.getContext('2d'); // Obtener el contexto de dibujo (2D) del lienzo

// Número máximo de filtros que se pueden crear
const MAX_NUM_OF_FILTERS3 = 5; // Límite para la cantidad de filtros

// Array para almacenar los colores disponibles para los filtros
const colors3 = ['red', 'blue', 'green', 'yellow', 'cyan']; // Colores predefinidos para cada filtro

// Objeto gráfico base que contiene las propiedades para los rangos de frecuencia y ganancia
const graph3 = {
    width: canvas3.width,   // Puedes usar canvas3 ya que todos los gráficos usarán el mismo tamaño
    height: canvas3.height,
    freqMin: 20,
    freqMax: 20000,
    gainMin: -20,
    gainMax: 20
};

// Objeto WebSocket para conexión multicliente
const socket3 = new WebSocket('ws://localhost:8765'); // Establecer conexión WebSocket con el servidor para la segunda instancia

let filters3 = [];                // Array para almacenar los objetos de filtro
let selectedFilterIndex3 = null;  // Índice del filtro actualmente seleccionado en el desplegable
let draggingFilterIndex3 = null;  // Índice del filtro que se está arrastrando actualmente en el lienzo
let isDragging3 = false;          // Bandera para saber si un filtro está siendo arrastrado

/**
 * Converts an x-coordinate on the canvas to a frequency value.
 * Función para convertir la coordenada x en el lienzo a un valor de frecuencia
 * 
 * @param {number} x - The x-coordinate on the canvas.
 * @returns {number} The corresponding frequency value.
 */
function xToFreq3(x) {
    const logFreqMin = Math.log10(graph3.freqMin); // Convertir la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph3.freqMax); // Convertir la frecuencia máxima a escala logarítmica
    const logFreq = logFreqMin + (x / graph3.width) * (logFreqMax - logFreqMin); // Mapear x a frecuencia logarítmica
    return Math.round(Math.pow(10, logFreq)); // Convertir de nuevo a frecuencia lineal, redondeada al entero más cercano
}

/**
 * Converts a frequency value to an x-coordinate on the canvas.
 * Función para convertir un valor de frecuencia a una coordenada x en el lienzo
 * 
 * @param {number} freq - The frequency value to convert.
 * @returns {number} The corresponding x-coordinate on the canvas.
 */
function freqToX3(freq) {
    const logFreqMin = Math.log10(graph3.freqMin); // Conversión a escala logarítmica
    const logFreqMax = Math.log10(graph3.freqMax);
    const logFreq = Math.log10(freq);
    return ((logFreq - logFreqMin) / (logFreqMax - logFreqMin)) * graph3.width; // Mapear frecuencia a coordenada x
}

/**
 * Converts a gain value to a y-coordinate on the canvas.
 * Función para convertir un valor de ganancia a una coordenada y en el lienzo
 * 
 * @param {number} gain - The gain value to convert.
 * @returns {number} The corresponding y-coordinate on the canvas.
 */
function gainToY3(gain) {
    return (graph3.height / 2) - ((gain / graph3.gainMax) * (graph3.height / 2)); // Mapear ganancia a coordenada y
}

/**
 * Converts a y-coordinate on the canvas to a gain value.
 * Función para convertir una coordenada y en el lienzo a un valor de ganancia
 * 
 * @param {number} y - The y-coordinate on the canvas.
 * @returns {number} The corresponding gain value.
 */
function yToGain3(y) {
    return parseFloat((((graph3.height / 2 - y) / (graph3.height / 2)) * graph3.gainMax).toFixed(1)); // Mapear y a ganancia
}

/**
 * Dibuja la curva de respuesta en frecuencia para un filtro dado en el segundo lienzo.
 * 
 * @param {Object} filter - El objeto filtro que contiene frecuencia, ganancia, q y propiedades de color.
 */
function drawCurve3(filter) {
    const { frequency, gain, q, color } = filter;
    ctx3.strokeStyle = color; // Establecer el color de la curva para el segundo lienzo
    ctx3.lineWidth = 2;
    ctx3.beginPath();

    // Dibujar la curva punto por punto a lo largo del segundo lienzo
    for (let x = 0; x <= graph3.width; x++) {
        const freq = xToFreq3(x);
        const distance = Math.log(freq / frequency);
        const gainAdjustment = gain * Math.exp(-Math.pow(distance / q, 2));

        const y = gainToY3(gainAdjustment);

        if (x === 0) {
            ctx3.moveTo(x, y);
        } else {
            ctx3.lineTo(x, y);
        }
    }
    ctx3.stroke();
    drawDot3(filter);
}

/**
 * Dibuja el punto que representa un filtro en el segundo gráfico.
 * 
 * @param {Object} filter - El objeto filtro que contiene frecuencia, ganancia y propiedades de color.
 */
function drawDot3(filter) {
    const { frequency, gain, color } = filter;
    const dotX = freqToX3(frequency);
    const dotY = gainToY3(gain);

    ctx3.beginPath();
    ctx3.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx3.fillStyle = color;
    ctx3.fill();
}

// Función para borrar el segundo lienzo y redibujar todas las curvas de filtros y la cuadrícula
function drawAllCurves3() {
    ctx3.clearRect(0, 0, graph3.width, graph3.height); // Borrar todo el lienzo secundario
    drawGrid3();

    // Dibujar la curva de cada filtro en el segundo lienzo
    filters3.forEach(filter => {
        drawCurve3(filter);
    });

    drawResultingCurve3();
}

// Función para dibujar la respuesta en frecuencia combinada de todos los filtros en el segundo lienzo
function drawResultingCurve3() {
    ctx3.strokeStyle = 'grey';
    ctx3.lineWidth = 2;
    ctx3.beginPath();

    for (let x = 0; x <= graph3.width; x++) {
        const freq = xToFreq3(x);
        let totalGain = 0;

        // Sumar los ajustes de ganancia de todos los filtros en la frecuencia actual
        filters3.forEach(filter => {
            const distance = Math.log(freq / filter.frequency);
            const gainAdjustment = filter.gain * Math.exp(-Math.pow(distance / filter.q, 2));
            totalGain += gainAdjustment;
        });

        const y = gainToY3(totalGain);

        if (x === 0) {
            ctx3.moveTo(x, y);
        } else {
            ctx3.lineTo(x, y);
        }
    }
    ctx3.stroke();
}

/**
 * Agrega un nuevo filtro al array de filtros del segundo ecualizador y actualiza la interfaz de usuario.
 */
function addFilter3() {
    if (filters3.length >= MAX_NUM_OF_FILTERS3) {
        alert("Se ha alcanzado el número máximo de filtros");
        console.error("Se alcanzó el número máximo de filtros en el segundo ecualizador, no se puede agregar más");
        return;
    }

    const filterId = filters3.length;

    const filter = {
        id: filterId,
        frequency: 1000,
        gain: 0,
        q: 1,
        color: colors3[filterId % colors3.length]
    };

    filters3.push(filter);
    addFilterToDropdown3(filter);
    selectFilter3(filterId);
    drawAllCurves3();
}

/**
 * Agrega una opción de filtro al menú desplegable del segundo ecualizador en la interfaz de usuario.
 *
 * @param {Object} filter - El objeto de filtro que se agregará al desplegable.
 */
function addFilterToDropdown3(filter) {
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtener el elemento del menú desplegable para el segundo ecualizador
    const option = document.createElement('option'); // Crear un nuevo elemento de opción
    option.value = filter.id; // Establecer el valor de la opción como el ID del filtro
    option.textContent = `Filtro ${filter.id + 1}`; // Mostrar "Filtro X" en el desplegable
    filterSelect1.appendChild(option); // Agregar la nueva opción al menú
    filterSelect1.value = filter.id; // Seleccionar automáticamente el nuevo filtro
}

/**
 * Elimina el filtro actualmente seleccionado del array de filtros del segundo ecualizador y actualiza la interfaz de usuario.
 */
function removeFilter3() {
    if (selectedFilterIndex3 !== null) { // Verificar si hay un filtro seleccionado
        // Eliminar el filtro del array de filtros del segundo ecualizador
        filters3.splice(selectedFilterIndex3, 1);

        // Eliminar el filtro del menú desplegable del segundo ecualizador
        const filterSelect1 = document.getElementById('filterSelect1');
        filterSelect1.remove(selectedFilterIndex3);

        // Reasignar IDs y actualizar el menú desplegable después de la eliminación
        filters3.forEach((filter, index) => {
            filter.id = index; // Reasignar el ID del filtro según su nueva posición
            filter.color = colors3[index % colors3.length]; // Reasignar el color según la nueva posición
            filterSelect1.options[index].value = index; // Actualizar el valor del menú desplegable
            filterSelect1.options[index].text = `Filtro ${index + 1}`; // Actualizar el texto del menú desplegable
        });

        // Establecer el índice del filtro seleccionado al último o a null si no hay filtros
        if (filters3.length > 0) {
            selectedFilterIndex3 = filters3.length - 1; // Seleccionar el último filtro
            filterSelect1.value = selectedFilterIndex3; // Actualizar el valor del menú desplegable
        } else {
            selectedFilterIndex3 = null; // No hay filtros, establecer el índice seleccionado a null
            filterSelect1.value = ''; // Limpiar la selección del menú desplegable
        }

        updateSliders3(); // Actualizar los controles deslizantes del segundo ecualizador
        drawAllCurves3(); // Redibujar todas las curvas para reflejar los cambios en el segundo ecualizador
    }
}

/**
 * Selecciona un filtro basado en su ID en el segundo ecualizador y actualiza la interfaz de usuario.
 *
 * @param {number} id - El ID del filtro que se desea seleccionar.
 */
function selectFilter3(id) {
    selectedFilterIndex3 = id; // Establece el índice del filtro seleccionado
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtener el elemento del menú desplegable
    filterSelect1.value = id; // Actualizar el menú desplegable para reflejar el filtro seleccionado
    updateSliders3(); // Actualizar los controles deslizantes según el filtro seleccionado
    drawAllCurves3(); // Redibujar todas las curvas de filtros, incluida la del filtro seleccionado
}

/**
 * Maneja los cambios en el menú desplegable de filtros del segundo ecualizador y selecciona el filtro correspondiente.
 */
function onFilterDropdownChange3() {
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtener el menú desplegable del segundo ecualizador
    const selectedId = parseInt(filterSelect1.value); // Convertir el valor seleccionado en un número entero
    selectFilter3(selectedId); // Llamar a selectFilter3 para aplicar la selección
}

function updateSliders3() {
    if (selectedFilterIndex3 !== null) {
        const filter = filters3[selectedFilterIndex3];
        document.getElementById('frequencySlider3').value = filter.frequency;
        document.getElementById('gainSlider3').value = filter.gain;
        document.getElementById('qSlider3').value = filter.q;

        document.getElementById('frequencyValue3').textContent = filter.frequency + ' Hz';
        document.getElementById('gainValue3').textContent = filter.gain + ' dB';
        document.getElementById('qValue3').textContent = filter.q;
    } else {
        document.getElementById('frequencySlider3').value = '';
        document.getElementById('gainSlider3').value = '';
        document.getElementById('qSlider3').value = '';

        document.getElementById('frequencyValue3').textContent = '';
        document.getElementById('gainValue3').textContent = '';
        document.getElementById('qValue3').textContent = '';
    }
}

// Controladores de deslizadores para el segundo ecualizador
document.getElementById('frequencySlider3').oninput = function () {
    if (selectedFilterIndex3 !== null) {
        filters3[selectedFilterIndex3].frequency = parseInt(this.value);
        document.getElementById('frequencyValue3').textContent = this.value + ' Hz';
        drawAllCurves3();
        ws_sendFilterData3(selectedFilterIndex3);
        printFilterValues3(filters3[selectedFilterIndex3]);
    }
};

document.getElementById('gainSlider3').oninput = function () {
    if (selectedFilterIndex3 !== null) {
        filters3[selectedFilterIndex3].gain = parseFloat(this.value);
        document.getElementById('gainValue3').textContent = this.value + ' dB';
        drawAllCurves3();
        ws_sendFilterData3(selectedFilterIndex3);
        printFilterValues3(filters3[selectedFilterIndex3]);
    }
};

document.getElementById('qSlider3').oninput = function () {
    if (selectedFilterIndex3 !== null) {
        filters3[selectedFilterIndex3].q = parseFloat(this.value);
        document.getElementById('qValue3').textContent = this.value;
        drawAllCurves3();
        ws_sendFilterData3(selectedFilterIndex3);
        printFilterValues3(filters3[selectedFilterIndex3]);
    }
};

canvas3.addEventListener('mousedown', function (e) {
    const rect = canvas3.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    filters3.forEach((filter, index) => {
        const dotX = freqToX3(filter.frequency);
        const dotY = gainToY3(filter.gain);

        const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));
        if (dist < 8) {
            draggingFilterIndex3 = index;
            selectFilter3(index);
            isDragging3 = true;
        }
    });
});

canvas3.addEventListener('mousemove', function (e) {
    if (isDragging3 && draggingFilterIndex3 !== null) {
        const rect = canvas3.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const filter = filters3[draggingFilterIndex3];
        filter.frequency = xToFreq3(mouseX);
        filter.gain = yToGain3(mouseY);

        drawAllCurves3();
        updateSliders3();

        if (printOnMove3) {
            printFilterValues3(filter);
        }
    }
});

canvas3.addEventListener('mouseup', function () {
    isDragging3 = false;

    if (draggingFilterIndex3 !== null && !printOnMove3) {
        printFilterValues3(filters3[draggingFilterIndex3]);
        ws_sendFilterData3(selectedFilterIndex3);
    }

    draggingFilterIndex3 = null;
});

canvas3.onmouseleave = function () {
    isDragging3 = false;
    draggingFilterIndex3 = null;
};

socket3.onopen = () => {
    console.log('WebSocket connection for EQ4 opened');
};

socket3.onmessage = (event) => {
    console.log('Message from server for EQ4:', event.data);

    // Procesa los datos recibidos para EQ4
    let filter = JSON.parse(event.data);
    filters3[filter.id] = filter;

    updateSliders3();
    drawAllCurves3();
};

socket3.onerror = (error) => {
    console.error('WebSocket error for EQ4:', error);
};

socket3.onclose = () => {
    console.log('WebSocket connection for EQ4 closed');
};

function ws_sendFilterData3(filterIndex) {
    if (filterIndex !== null && filterIndex >= 0 && filterIndex < filters3.length) {
        const filter = filters3[filterIndex];
        const data = {
            id: filter.id,
            frequency: filter.frequency,
            gain: filter.gain,
            q: filter.q
        };

        if (socket3 && socket3.readyState === WebSocket.OPEN) {
            socket3.send(JSON.stringify(data));
            console.log("Data sent for EQ4:", data);
        } else {
            console.error("WebSocket for EQ4 is not open.");
        }
    } else {
        console.error("Invalid filter index for EQ4.");
    }
}

/**
 * Dibuja la cuadrícula en el canvas para el segundo ecualizador (EQ4).
 */
function drawGrid3() {
    ctx3.strokeStyle = '#555';  // Establece el color de las líneas de la cuadrícula
    ctx3.lineWidth = 1;  // Establece el grosor de las líneas

    // Dibuja líneas horizontales que representan las ganancias
    for (let gain = graph3.gainMin; gain <= graph3.gainMax; gain += 5) {
        const y = gainToY3(gain);  // Convierte la ganancia a la posición Y correspondiente
        ctx3.beginPath();
        ctx3.moveTo(0, y);  // Comienza la línea en el borde izquierdo
        ctx3.lineTo(graph3.width, y);  // Dibuja la línea hasta el borde derecho
        ctx3.stroke();  // Traza la línea

        ctx3.fillStyle = 'white';  // Establece el color del texto
        ctx3.fillText(`${gain} dB`, 5, y - 5);  // Dibuja la etiqueta de ganancia cerca de la línea
    }

    // Dibuja líneas verticales que representan las frecuencias
    const logFreqMin = Math.log10(graph3.freqMin);  // Convierte la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph3.freqMax);  // Convierte la frecuencia máxima a escala logarítmica
    for (let logFreq = logFreqMin; logFreq <= logFreqMax; logFreq += 0.25) {
        const freq = Math.pow(10, logFreq);  // Convierte la frecuencia de nuevo a su valor real
        const x = freqToX3(freq);  // Convierte la frecuencia a la posición X correspondiente

        ctx3.beginPath();
        ctx3.moveTo(x, 0);  // Comienza la línea en el borde superior
        ctx3.lineTo(x, graph3.height);  // Dibuja la línea hasta el borde inferior
        ctx3.stroke();  // Traza la línea

        ctx3.fillStyle = 'white';  // Establece el color del texto
        ctx3.fillText(`${Math.round(freq)} Hz`, x + 5, graph3.height - 5);  // Dibuja la etiqueta de frecuencia cerca de la línea
    }
}

/**
 * Imprime los valores actuales de un filtro en el segundo ecualizador (EQ4).
 *
 * @param {Object} filter - El filtro cuyo valor se imprimirá.
 */
function printFilterValues3(filter) {
    const filterData = {
        id: filter.id,  // ID del filtro
        frequency: filter.frequency,  // Frecuencia del filtro
        gain: parseFloat(filter.gain),  // Ganancia del filtro (convertida a número flotante)
        q: filter.q  // Valor Q del filtro
    };
    console.log('EQ4 Filter:', JSON.stringify(filterData));  // Imprime los datos del filtro como una cadena JSON
}

// Inicializa y dibuja la cuadrícula en el canvas para el segundo ecualizador
drawGrid3();
drawAllCurves3();
