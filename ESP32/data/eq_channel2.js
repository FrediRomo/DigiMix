/*
 * ARCHIVO: EQ2.js
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
let printOnMove1 = false; // Bandera para controlar si se imprimen los valores del filtro mientras se arrastra o después de arrastrar

// Elementos del lienzo en el cuerpo de HTML
const canvas1 = document.getElementById('graph1'); // Obtener el elemento del lienzo
const ctx1 = canvas1.getContext('2d'); // Obtener el contexto de dibujo (2D) del lienzo

// Número máximo de filtros que se pueden crear
const MAX_NUM_OF_FILTERS1 = 5; // Límite para la cantidad de filtros

// Array para almacenar los colores disponibles para los filtros
const colors1 = ['red', 'blue', 'green', 'yellow', 'cyan']; // Colores predefinidos para cada filtro

// Objeto gráfico base que contiene las propiedades para los rangos de frecuencia y ganancia
const graph1 = {
    width: canvas1.width,   // Puedes usar canvas1 ya que todos los gráficos usarán el mismo tamaño
    height: canvas1.height,
    freqMin: 20,
    freqMax: 20000,
    gainMin: -20,
    gainMax: 20
};

// Objeto WebSocket para conexión multicliente
const socket1 = new WebSocket('ws://localhost:8765'); // Establecer conexión WebSocket con el servidor para la segunda instancia

let filters1 = [];                // Array para almacenar los objetos de filtro
let selectedFilterIndex1 = null;  // Índice del filtro actualmente seleccionado en el desplegable
let draggingFilterIndex1 = null;  // Índice del filtro que se está arrastrando actualmente en el lienzo
let isDragging1 = false;          // Bandera para saber si un filtro está siendo arrastrado

/**
 * Converts an x-coordinate on the canvas to a frequency value.
 * Función para convertir la coordenada x en el lienzo a un valor de frecuencia
 * 
 * @param {number} x - The x-coordinate on the canvas.
 * @returns {number} The corresponding frequency value.
 */
function xToFreq1(x) {
    const logFreqMin = Math.log10(graph1.freqMin); // Convertir la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph1.freqMax); // Convertir la frecuencia máxima a escala logarítmica
    const logFreq = logFreqMin + (x / graph1.width) * (logFreqMax - logFreqMin); // Mapear x a frecuencia logarítmica
    return Math.round(Math.pow(10, logFreq)); // Convertir de nuevo a frecuencia lineal, redondeada al entero más cercano
}

/**
 * Converts a frequency value to an x-coordinate on the canvas.
 * Función para convertir un valor de frecuencia a una coordenada x en el lienzo
 * 
 * @param {number} freq - The frequency value to convert.
 * @returns {number} The corresponding x-coordinate on the canvas.
 */
function freqToX1(freq) {
    const logFreqMin = Math.log10(graph1.freqMin); // Conversión a escala logarítmica
    const logFreqMax = Math.log10(graph1.freqMax);
    const logFreq = Math.log10(freq);
    return ((logFreq - logFreqMin) / (logFreqMax - logFreqMin)) * graph1.width; // Mapear frecuencia a coordenada x
}

/**
 * Converts a gain value to a y-coordinate on the canvas.
 * Función para convertir un valor de ganancia a una coordenada y en el lienzo
 * 
 * @param {number} gain - The gain value to convert.
 * @returns {number} The corresponding y-coordinate on the canvas.
 */
function gainToY1(gain) {
    return (graph1.height / 2) - ((gain / graph1.gainMax) * (graph1.height / 2)); // Mapear ganancia a coordenada y
}

/**
 * Converts a y-coordinate on the canvas to a gain value.
 * Función para convertir una coordenada y en el lienzo a un valor de ganancia
 * 
 * @param {number} y - The y-coordinate on the canvas.
 * @returns {number} The corresponding gain value.
 */
function yToGain1(y) {
    return parseFloat((((graph1.height / 2 - y) / (graph1.height / 2)) * graph1.gainMax).toFixed(1)); // Mapear y a ganancia
}

/**
 * Dibuja la curva de respuesta en frecuencia para un filtro dado en el segundo lienzo.
 * 
 * @param {Object} filter - El objeto filtro que contiene frecuencia, ganancia, q y propiedades de color.
 */
function drawCurve1(filter) {
    const { frequency, gain, q, color } = filter;
    ctx1.strokeStyle = color; // Establecer el color de la curva para el segundo lienzo
    ctx1.lineWidth = 2;
    ctx1.beginPath();

    // Dibujar la curva punto por punto a lo largo del segundo lienzo
    for (let x = 0; x <= graph1.width; x++) {
        const freq = xToFreq1(x);
        const distance = Math.log(freq / frequency);
        const gainAdjustment = gain * Math.exp(-Math.pow(distance / q, 2));

        const y = gainToY1(gainAdjustment);

        if (x === 0) {
            ctx1.moveTo(x, y);
        } else {
            ctx1.lineTo(x, y);
        }
    }
    ctx1.stroke();
    drawDot1(filter);
}

/**
 * Dibuja el punto que representa un filtro en el segundo gráfico.
 * 
 * @param {Object} filter - El objeto filtro que contiene frecuencia, ganancia y propiedades de color.
 */
function drawDot1(filter) {
    const { frequency, gain, color } = filter;
    const dotX = freqToX1(frequency);
    const dotY = gainToY1(gain);

    ctx1.beginPath();
    ctx1.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx1.fillStyle = color;
    ctx1.fill();
}

// Función para borrar el segundo lienzo y redibujar todas las curvas de filtros y la cuadrícula
function drawAllCurves1() {
    ctx1.clearRect(0, 0, graph1.width, graph1.height); // Borrar todo el lienzo secundario
    drawGrid1();

    // Dibujar la curva de cada filtro en el segundo lienzo
    filters1.forEach(filter => {
        drawCurve1(filter);
    });

    drawResultingCurve1();
}

// Función para dibujar la respuesta en frecuencia combinada de todos los filtros en el segundo lienzo
function drawResultingCurve1() {
    ctx1.strokeStyle = 'grey';
    ctx1.lineWidth = 2;
    ctx1.beginPath();

    for (let x = 0; x <= graph1.width; x++) {
        const freq = xToFreq1(x);
        let totalGain = 0;

        // Sumar los ajustes de ganancia de todos los filtros en la frecuencia actual
        filters1.forEach(filter => {
            const distance = Math.log(freq / filter.frequency);
            const gainAdjustment = filter.gain * Math.exp(-Math.pow(distance / filter.q, 2));
            totalGain += gainAdjustment;
        });

        const y = gainToY1(totalGain);

        if (x === 0) {
            ctx1.moveTo(x, y);
        } else {
            ctx1.lineTo(x, y);
        }
    }
    ctx1.stroke();
}

/**
 * Agrega un nuevo filtro al array de filtros del segundo ecualizador y actualiza la interfaz de usuario.
 */
function addFilter1() {
    if (filters1.length >= MAX_NUM_OF_FILTERS1) {
        alert("Se ha alcanzado el número máximo de filtros");
        console.error("Se alcanzó el número máximo de filtros en el segundo ecualizador, no se puede agregar más");
        return;
    }

    const filterId = filters1.length;

    const filter = {
        id: filterId,
        frequency: 1000,
        gain: 0,
        q: 1,
        color: colors1[filterId % colors1.length]
    };

    filters1.push(filter);
    addFilterToDropdown1(filter);
    selectFilter1(filterId);
    drawAllCurves1();
}

/**
 * Agrega una opción de filtro al menú desplegable del segundo ecualizador en la interfaz de usuario.
 *
 * @param {Object} filter - El objeto de filtro que se agregará al desplegable.
 */
function addFilterToDropdown1(filter) {
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
function removeFilter1() {
    if (selectedFilterIndex1 !== null) { // Verificar si hay un filtro seleccionado
        // Eliminar el filtro del array de filtros del segundo ecualizador
        filters1.splice(selectedFilterIndex1, 1);

        // Eliminar el filtro del menú desplegable del segundo ecualizador
        const filterSelect1 = document.getElementById('filterSelect1');
        filterSelect1.remove(selectedFilterIndex1);

        // Reasignar IDs y actualizar el menú desplegable después de la eliminación
        filters1.forEach((filter, index) => {
            filter.id = index; // Reasignar el ID del filtro según su nueva posición
            filter.color = colors1[index % colors1.length]; // Reasignar el color según la nueva posición
            filterSelect1.options[index].value = index; // Actualizar el valor del menú desplegable
            filterSelect1.options[index].text = `Filtro ${index + 1}`; // Actualizar el texto del menú desplegable
        });

        // Establecer el índice del filtro seleccionado al último o a null si no hay filtros
        if (filters1.length > 0) {
            selectedFilterIndex1 = filters1.length - 1; // Seleccionar el último filtro
            filterSelect1.value = selectedFilterIndex1; // Actualizar el valor del menú desplegable
        } else {
            selectedFilterIndex1 = null; // No hay filtros, establecer el índice seleccionado a null
            filterSelect1.value = ''; // Limpiar la selección del menú desplegable
        }

        updateSliders1(); // Actualizar los controles deslizantes del segundo ecualizador
        drawAllCurves1(); // Redibujar todas las curvas para reflejar los cambios en el segundo ecualizador
    }
}

/**
 * Selecciona un filtro basado en su ID en el segundo ecualizador y actualiza la interfaz de usuario.
 *
 * @param {number} id - El ID del filtro que se desea seleccionar.
 */
function selectFilter1(id) {
    selectedFilterIndex1 = id; // Establece el índice del filtro seleccionado
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtener el elemento del menú desplegable
    filterSelect1.value = id; // Actualizar el menú desplegable para reflejar el filtro seleccionado
    updateSliders1(); // Actualizar los controles deslizantes según el filtro seleccionado
    drawAllCurves1(); // Redibujar todas las curvas de filtros, incluida la del filtro seleccionado
}

/**
 * Maneja los cambios en el menú desplegable de filtros del segundo ecualizador y selecciona el filtro correspondiente.
 */
function onFilterDropdownChange1() {
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtener el menú desplegable del segundo ecualizador
    const selectedId = parseInt(filterSelect1.value); // Convertir el valor seleccionado en un número entero
    selectFilter1(selectedId); // Llamar a selectFilter1 para aplicar la selección
}

function updateSliders1() {
    if (selectedFilterIndex1 !== null) {
        const filter = filters1[selectedFilterIndex1];
        document.getElementById('frequencySlider1').value = filter.frequency;
        document.getElementById('gainSlider1').value = filter.gain;
        document.getElementById('qSlider1').value = filter.q;

        document.getElementById('frequencyValue1').textContent = filter.frequency + ' Hz';
        document.getElementById('gainValue1').textContent = filter.gain + ' dB';
        document.getElementById('qValue1').textContent = filter.q;
    } else {
        document.getElementById('frequencySlider1').value = '';
        document.getElementById('gainSlider1').value = '';
        document.getElementById('qSlider1').value = '';

        document.getElementById('frequencyValue1').textContent = '';
        document.getElementById('gainValue1').textContent = '';
        document.getElementById('qValue1').textContent = '';
    }
}

// Controladores de deslizadores para el segundo ecualizador
document.getElementById('frequencySlider1').oninput = function () {
    if (selectedFilterIndex1 !== null) {
        filters1[selectedFilterIndex1].frequency = parseInt(this.value);
        document.getElementById('frequencyValue1').textContent = this.value + ' Hz';
        drawAllCurves1();
        ws_sendFilterData1(selectedFilterIndex1);
        printFilterValues1(filters1[selectedFilterIndex1]);
    }
};

document.getElementById('gainSlider1').oninput = function () {
    if (selectedFilterIndex1 !== null) {
        filters1[selectedFilterIndex1].gain = parseFloat(this.value);
        document.getElementById('gainValue1').textContent = this.value + ' dB';
        drawAllCurves1();
        ws_sendFilterData1(selectedFilterIndex1);
        printFilterValues1(filters1[selectedFilterIndex1]);
    }
};

document.getElementById('qSlider1').oninput = function () {
    if (selectedFilterIndex1 !== null) {
        filters1[selectedFilterIndex1].q = parseFloat(this.value);
        document.getElementById('qValue1').textContent = this.value;
        drawAllCurves1();
        ws_sendFilterData1(selectedFilterIndex1);
        printFilterValues1(filters1[selectedFilterIndex1]);
    }
};

canvas1.addEventListener('mousedown', function (e) {
    const rect = canvas1.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    filters1.forEach((filter, index) => {
        const dotX = freqToX1(filter.frequency);
        const dotY = gainToY1(filter.gain);

        const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));
        if (dist < 8) {
            draggingFilterIndex1 = index;
            selectFilter1(index);
            isDragging1 = true;
        }
    });
});

canvas1.addEventListener('mousemove', function (e) {
    if (isDragging1 && draggingFilterIndex1 !== null) {
        const rect = canvas1.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const filter = filters1[draggingFilterIndex1];
        filter.frequency = xToFreq1(mouseX);
        filter.gain = yToGain1(mouseY);

        drawAllCurves1();
        updateSliders1();

        if (printOnMove1) {
            printFilterValues1(filter);
        }
    }
});

canvas1.addEventListener('mouseup', function () {
    isDragging1 = false;

    if (draggingFilterIndex1 !== null && !printOnMove1) {
        printFilterValues1(filters1[draggingFilterIndex1]);
        ws_sendFilterData1(selectedFilterIndex1);
    }

    draggingFilterIndex1 = null;
});

canvas1.onmouseleave = function () {
    isDragging1 = false;
    draggingFilterIndex1 = null;
};

socket1.onopen = () => {
    console.log('WebSocket connection for EQ2 opened');
};

socket1.onmessage = (event) => {
    console.log('Message from server for EQ2:', event.data);

    // Procesa los datos recibidos para EQ2
    let filter = JSON.parse(event.data);
    filters1[filter.id] = filter;

    updateSliders1();
    drawAllCurves1();
};

socket1.onerror = (error) => {
    console.error('WebSocket error for EQ2:', error);
};

socket1.onclose = () => {
    console.log('WebSocket connection for EQ2 closed');
};

function ws_sendFilterData1(filterIndex) {
    if (filterIndex !== null && filterIndex >= 0 && filterIndex < filters1.length) {
        const filter = filters1[filterIndex];
        const data = {
            id: filter.id,
            frequency: filter.frequency,
            gain: filter.gain,
            q: filter.q
        };

        if (socket1 && socket1.readyState === WebSocket.OPEN) {
            socket1.send(JSON.stringify(data));
            console.log("Data sent for EQ2:", data);
        } else {
            console.error("WebSocket for EQ2 is not open.");
        }
    } else {
        console.error("Invalid filter index for EQ2.");
    }
}

/**
 * Dibuja la cuadrícula en el canvas para el segundo ecualizador (EQ2).
 */
function drawGrid1() {
    ctx1.strokeStyle = '#555';  // Establece el color de las líneas de la cuadrícula
    ctx1.lineWidth = 1;  // Establece el grosor de las líneas

    // Dibuja líneas horizontales que representan las ganancias
    for (let gain = graph1.gainMin; gain <= graph1.gainMax; gain += 5) {
        const y = gainToY1(gain);  // Convierte la ganancia a la posición Y correspondiente
        ctx1.beginPath();
        ctx1.moveTo(0, y);  // Comienza la línea en el borde izquierdo
        ctx1.lineTo(graph1.width, y);  // Dibuja la línea hasta el borde derecho
        ctx1.stroke();  // Traza la línea

        ctx1.fillStyle = 'white';  // Establece el color del texto
        ctx1.fillText(`${gain} dB`, 5, y - 5);  // Dibuja la etiqueta de ganancia cerca de la línea
    }

    // Dibuja líneas verticales que representan las frecuencias
    const logFreqMin = Math.log10(graph1.freqMin);  // Convierte la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph1.freqMax);  // Convierte la frecuencia máxima a escala logarítmica
    for (let logFreq = logFreqMin; logFreq <= logFreqMax; logFreq += 0.25) {
        const freq = Math.pow(10, logFreq);  // Convierte la frecuencia de nuevo a su valor real
        const x = freqToX1(freq);  // Convierte la frecuencia a la posición X correspondiente

        ctx1.beginPath();
        ctx1.moveTo(x, 0);  // Comienza la línea en el borde superior
        ctx1.lineTo(x, graph1.height);  // Dibuja la línea hasta el borde inferior
        ctx1.stroke();  // Traza la línea

        ctx1.fillStyle = 'white';  // Establece el color del texto
        ctx1.fillText(`${Math.round(freq)} Hz`, x + 5, graph1.height - 5);  // Dibuja la etiqueta de frecuencia cerca de la línea
    }
}

/**
 * Imprime los valores actuales de un filtro en el segundo ecualizador (EQ2).
 *
 * @param {Object} filter - El filtro cuyo valor se imprimirá.
 */
function printFilterValues1(filter) {
    const filterData = {
        id: filter.id,  // ID del filtro
        frequency: filter.frequency,  // Frecuencia del filtro
        gain: parseFloat(filter.gain),  // Ganancia del filtro (convertida a número flotante)
        q: filter.q  // Valor Q del filtro
    };
    console.log('EQ2 Filter:', JSON.stringify(filterData));  // Imprime los datos del filtro como una cadena JSON
}

// Inicializa y dibuja la cuadrícula en el canvas para el segundo ecualizador
drawGrid1();
drawAllCurves1();
