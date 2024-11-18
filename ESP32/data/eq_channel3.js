/*
 * ARCHIVO: EQ3.js
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
let printOnMove2 = false; // Bandera para controlar si se imprimen los valores del filtro mientras se arrastra o después de arrastrar

// Elementos del lienzo en el cuerpo de HTML
const canvas2 = document.getElementById('graph2'); // Obtener el elemento del lienzo
const ctx2 = canvas2.getContext('2d'); // Obtener el contexto de dibujo (2D) del lienzo

// Número máximo de filtros que se pueden crear
const MAX_NUM_OF_FILTERS2 = 5; // Límite para la cantidad de filtros

// Array para almacenar los colores disponibles para los filtros
const colors2 = ['red', 'blue', 'green', 'yellow', 'cyan']; // Colores predefinidos para cada filtro

// Objeto gráfico base que contiene las propiedades para los rangos de frecuencia y ganancia
const graph2 = {
    width: canvas2.width,   // Puedes usar canvas2 ya que todos los gráficos usarán el mismo tamaño
    height: canvas2.height,
    freqMin: 20,
    freqMax: 20000,
    gainMin: -20,
    gainMax: 20
};

// Objeto WebSocket para conexión multicliente
const socket2 = new WebSocket('ws://localhost:8765'); // Establecer conexión WebSocket con el servidor para la segunda instancia

let filters2 = [];                // Array para almacenar los objetos de filtro
let selectedFilterIndex2 = null;  // Índice del filtro actualmente seleccionado en el desplegable
let draggingFilterIndex2 = null;  // Índice del filtro que se está arrastrando actualmente en el lienzo
let isDragging2 = false;          // Bandera para saber si un filtro está siendo arrastrado

/**
 * Converts an x-coordinate on the canvas to a frequency value.
 * Función para convertir la coordenada x en el lienzo a un valor de frecuencia
 * 
 * @param {number} x - The x-coordinate on the canvas.
 * @returns {number} The corresponding frequency value.
 */
function xToFreq2(x) {
    const logFreqMin = Math.log10(graph2.freqMin); // Convertir la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph2.freqMax); // Convertir la frecuencia máxima a escala logarítmica
    const logFreq = logFreqMin + (x / graph2.width) * (logFreqMax - logFreqMin); // Mapear x a frecuencia logarítmica
    return Math.round(Math.pow(10, logFreq)); // Convertir de nuevo a frecuencia lineal, redondeada al entero más cercano
}

/**
 * Converts a frequency value to an x-coordinate on the canvas.
 * Función para convertir un valor de frecuencia a una coordenada x en el lienzo
 * 
 * @param {number} freq - The frequency value to convert.
 * @returns {number} The corresponding x-coordinate on the canvas.
 */
function freqToX2(freq) {
    const logFreqMin = Math.log10(graph2.freqMin); // Conversión a escala logarítmica
    const logFreqMax = Math.log10(graph2.freqMax);
    const logFreq = Math.log10(freq);
    return ((logFreq - logFreqMin) / (logFreqMax - logFreqMin)) * graph2.width; // Mapear frecuencia a coordenada x
}

/**
 * Converts a gain value to a y-coordinate on the canvas.
 * Función para convertir un valor de ganancia a una coordenada y en el lienzo
 * 
 * @param {number} gain - The gain value to convert.
 * @returns {number} The corresponding y-coordinate on the canvas.
 */
function gainToY2(gain) {
    return (graph2.height / 2) - ((gain / graph2.gainMax) * (graph2.height / 2)); // Mapear ganancia a coordenada y
}

/**
 * Converts a y-coordinate on the canvas to a gain value.
 * Función para convertir una coordenada y en el lienzo a un valor de ganancia
 * 
 * @param {number} y - The y-coordinate on the canvas.
 * @returns {number} The corresponding gain value.
 */
function yToGain2(y) {
    return parseFloat((((graph2.height / 2 - y) / (graph2.height / 2)) * graph2.gainMax).toFixed(1)); // Mapear y a ganancia
}

/**
 * Dibuja la curva de respuesta en frecuencia para un filtro dado en el segundo lienzo.
 * 
 * @param {Object} filter - El objeto filtro que contiene frecuencia, ganancia, q y propiedades de color.
 */
function drawCurve2(filter) {
    const { frequency, gain, q, color } = filter;
    ctx2.strokeStyle = color; // Establecer el color de la curva para el segundo lienzo
    ctx2.lineWidth = 2;
    ctx2.beginPath();

    // Dibujar la curva punto por punto a lo largo del segundo lienzo
    for (let x = 0; x <= graph2.width; x++) {
        const freq = xToFreq2(x);
        const distance = Math.log(freq / frequency);
        const gainAdjustment = gain * Math.exp(-Math.pow(distance / q, 2));

        const y = gainToY2(gainAdjustment);

        if (x === 0) {
            ctx2.moveTo(x, y);
        } else {
            ctx2.lineTo(x, y);
        }
    }
    ctx2.stroke();
    drawDot2(filter);
}

/**
 * Dibuja el punto que representa un filtro en el segundo gráfico.
 * 
 * @param {Object} filter - El objeto filtro que contiene frecuencia, ganancia y propiedades de color.
 */
function drawDot2(filter) {
    const { frequency, gain, color } = filter;
    const dotX = freqToX2(frequency);
    const dotY = gainToY2(gain);

    ctx2.beginPath();
    ctx2.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx2.fillStyle = color;
    ctx2.fill();
}

// Función para borrar el segundo lienzo y redibujar todas las curvas de filtros y la cuadrícula
function drawAllCurves2() {
    ctx2.clearRect(0, 0, graph2.width, graph2.height); // Borrar todo el lienzo secundario
    drawGrid2();

    // Dibujar la curva de cada filtro en el segundo lienzo
    filters2.forEach(filter => {
        drawCurve2(filter);
    });

    drawResultingCurve2();
}

// Función para dibujar la respuesta en frecuencia combinada de todos los filtros en el segundo lienzo
function drawResultingCurve2() {
    ctx2.strokeStyle = 'grey';
    ctx2.lineWidth = 2;
    ctx2.beginPath();

    for (let x = 0; x <= graph2.width; x++) {
        const freq = xToFreq2(x);
        let totalGain = 0;

        // Sumar los ajustes de ganancia de todos los filtros en la frecuencia actual
        filters2.forEach(filter => {
            const distance = Math.log(freq / filter.frequency);
            const gainAdjustment = filter.gain * Math.exp(-Math.pow(distance / filter.q, 2));
            totalGain += gainAdjustment;
        });

        const y = gainToY2(totalGain);

        if (x === 0) {
            ctx2.moveTo(x, y);
        } else {
            ctx2.lineTo(x, y);
        }
    }
    ctx2.stroke();
}

/**
 * Agrega un nuevo filtro al array de filtros del segundo ecualizador y actualiza la interfaz de usuario.
 */
function addFilter2() {
    if (filters2.length >= MAX_NUM_OF_FILTERS2) {
        alert("Se ha alcanzado el número máximo de filtros");
        console.error("Se alcanzó el número máximo de filtros en el segundo ecualizador, no se puede agregar más");
        return;
    }

    const filterId = filters2.length;

    const filter = {
        id: filterId,
        frequency: 1000,
        gain: 0,
        q: 1,
        color: colors2[filterId % colors2.length]
    };

    filters2.push(filter);
    addFilterToDropdown2(filter);
    selectFilter2(filterId);
    drawAllCurves2();
}

/**
 * Agrega una opción de filtro al menú desplegable del segundo ecualizador en la interfaz de usuario.
 *
 * @param {Object} filter - El objeto de filtro que se agregará al desplegable.
 */
function addFilterToDropdown2(filter) {
    const filterSelect2 = document.getElementById('filterSelect2'); // Obtener el elemento del menú desplegable para el segundo ecualizador
    const option = document.createElement('option'); // Crear un nuevo elemento de opción
    option.value = filter.id; // Establecer el valor de la opción como el ID del filtro
    option.textContent = `Filtro ${filter.id + 1}`; // Mostrar "Filtro X" en el desplegable
    filterSelect2.appendChild(option); // Agregar la nueva opción al menú
    filterSelect2.value = filter.id; // Seleccionar automáticamente el nuevo filtro
}

/**
 * Elimina el filtro actualmente seleccionado del array de filtros del segundo ecualizador y actualiza la interfaz de usuario.
 */
function removeFilter2() {
    if (selectedFilterIndex2 !== null) { // Verificar si hay un filtro seleccionado
        // Eliminar el filtro del array de filtros del segundo ecualizador
        filters2.splice(selectedFilterIndex2, 1);

        // Eliminar el filtro del menú desplegable del segundo ecualizador
        const filterSelect2 = document.getElementById('filterSelect2');
        filterSelect2.remove(selectedFilterIndex2);

        // Reasignar IDs y actualizar el menú desplegable después de la eliminación
        filters2.forEach((filter, index) => {
            filter.id = index; // Reasignar el ID del filtro según su nueva posición
            filter.color = colors2[index % colors2.length]; // Reasignar el color según la nueva posición
            filterSelect2.options[index].value = index; // Actualizar el valor del menú desplegable
            filterSelect2.options[index].text = `Filtro ${index + 1}`; // Actualizar el texto del menú desplegable
        });

        // Establecer el índice del filtro seleccionado al último o a null si no hay filtros
        if (filters2.length > 0) {
            selectedFilterIndex2 = filters2.length - 1; // Seleccionar el último filtro
            filterSelect2.value = selectedFilterIndex2; // Actualizar el valor del menú desplegable
        } else {
            selectedFilterIndex2 = null; // No hay filtros, establecer el índice seleccionado a null
            filterSelect2.value = ''; // Limpiar la selección del menú desplegable
        }

        updateSliders2(); // Actualizar los controles deslizantes del segundo ecualizador
        drawAllCurves2(); // Redibujar todas las curvas para reflejar los cambios en el segundo ecualizador
    }
}

/**
 * Selecciona un filtro basado en su ID en el segundo ecualizador y actualiza la interfaz de usuario.
 *
 * @param {number} id - El ID del filtro que se desea seleccionar.
 */
function selectFilter2(id) {
    selectedFilterIndex2 = id; // Establece el índice del filtro seleccionado
    const filterSelect2 = document.getElementById('filterSelect2'); // Obtener el elemento del menú desplegable
    filterSelect2.value = id; // Actualizar el menú desplegable para reflejar el filtro seleccionado
    updateSliders2(); // Actualizar los controles deslizantes según el filtro seleccionado
    drawAllCurves2(); // Redibujar todas las curvas de filtros, incluida la del filtro seleccionado
}

/**
 * Maneja los cambios en el menú desplegable de filtros del segundo ecualizador y selecciona el filtro correspondiente.
 */
function onFilterDropdownChange2() {
    const filterSelect2 = document.getElementById('filterSelect2'); // Obtener el menú desplegable del segundo ecualizador
    const selectedId = parseInt(filterSelect2.value); // Convertir el valor seleccionado en un número entero
    selectFilter2(selectedId); // Llamar a selectFilter2 para aplicar la selección
}

function updateSliders2() {
    if (selectedFilterIndex2 !== null) {
        const filter = filters2[selectedFilterIndex2];
        document.getElementById('frequencySlider2').value = filter.frequency;
        document.getElementById('gainSlider2').value = filter.gain;
        document.getElementById('qSlider2').value = filter.q;

        document.getElementById('frequencyValue2').textContent = filter.frequency + ' Hz';
        document.getElementById('gainValue2').textContent = filter.gain + ' dB';
        document.getElementById('qValue2').textContent = filter.q;
    } else {
        document.getElementById('frequencySlider2').value = '';
        document.getElementById('gainSlider2').value = '';
        document.getElementById('qSlider2').value = '';

        document.getElementById('frequencyValue2').textContent = '';
        document.getElementById('gainValue2').textContent = '';
        document.getElementById('qValue2').textContent = '';
    }
}

// Controladores de deslizadores para el segundo ecualizador
document.getElementById('frequencySlider2').oninput = function () {
    if (selectedFilterIndex2 !== null) {
        filters2[selectedFilterIndex2].frequency = parseInt(this.value);
        document.getElementById('frequencyValue2').textContent = this.value + ' Hz';
        drawAllCurves2();
        ws_sendFilterData2(selectedFilterIndex2);
        printFilterValues2(filters2[selectedFilterIndex2]);
    }
};

document.getElementById('gainSlider2').oninput = function () {
    if (selectedFilterIndex2 !== null) {
        filters2[selectedFilterIndex2].gain = parseFloat(this.value);
        document.getElementById('gainValue2').textContent = this.value + ' dB';
        drawAllCurves2();
        ws_sendFilterData2(selectedFilterIndex2);
        printFilterValues2(filters2[selectedFilterIndex2]);
    }
};

document.getElementById('qSlider2').oninput = function () {
    if (selectedFilterIndex2 !== null) {
        filters2[selectedFilterIndex2].q = parseFloat(this.value);
        document.getElementById('qValue2').textContent = this.value;
        drawAllCurves2();
        ws_sendFilterData2(selectedFilterIndex2);
        printFilterValues2(filters2[selectedFilterIndex2]);
    }
};

canvas2.addEventListener('mousedown', function (e) {
    const rect = canvas2.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    filters2.forEach((filter, index) => {
        const dotX = freqToX2(filter.frequency);
        const dotY = gainToY2(filter.gain);

        const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));
        if (dist < 8) {
            draggingFilterIndex2 = index;
            selectFilter2(index);
            isDragging2 = true;
        }
    });
});

canvas2.addEventListener('mousemove', function (e) {
    if (isDragging2 && draggingFilterIndex2 !== null) {
        const rect = canvas2.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const filter = filters2[draggingFilterIndex2];
        filter.frequency = xToFreq2(mouseX);
        filter.gain = yToGain2(mouseY);

        drawAllCurves2();
        updateSliders2();

        if (printOnMove2) {
            printFilterValues2(filter);
        }
    }
});

canvas2.addEventListener('mouseup', function () {
    isDragging2 = false;

    if (draggingFilterIndex2 !== null && !printOnMove2) {
        printFilterValues2(filters2[draggingFilterIndex2]);
        ws_sendFilterData2(selectedFilterIndex2);
    }

    draggingFilterIndex2 = null;
});

canvas2.onmouseleave = function () {
    isDragging2 = false;
    draggingFilterIndex2 = null;
};

socket2.onopen = () => {
    console.log('WebSocket connection for EQ3 opened');
};

socket2.onmessage = (event) => {
    console.log('Message from server for EQ3:', event.data);

    // Procesa los datos recibidos para EQ3
    let filter = JSON.parse(event.data);
    filters2[filter.id] = filter;

    updateSliders2();
    drawAllCurves2();
};

socket2.onerror = (error) => {
    console.error('WebSocket error for EQ3:', error);
};

socket2.onclose = () => {
    console.log('WebSocket connection for EQ3 closed');
};

function ws_sendFilterData2(filterIndex) {
    if (filterIndex !== null && filterIndex >= 0 && filterIndex < filters2.length) {
        const filter = filters2[filterIndex];
        const data = {
            id: filter.id,
            frequency: filter.frequency,
            gain: filter.gain,
            q: filter.q
        };

        if (socket2 && socket2.readyState === WebSocket.OPEN) {
            socket2.send(JSON.stringify(data));
            console.log("Data sent for EQ3:", data);
        } else {
            console.error("WebSocket for EQ3 is not open.");
        }
    } else {
        console.error("Invalid filter index for EQ3.");
    }
}

/**
 * Dibuja la cuadrícula en el canvas para el segundo ecualizador (EQ3).
 */
function drawGrid2() {
    ctx2.strokeStyle = '#555';  // Establece el color de las líneas de la cuadrícula
    ctx2.lineWidth = 1;  // Establece el grosor de las líneas

    // Dibuja líneas horizontales que representan las ganancias
    for (let gain = graph2.gainMin; gain <= graph2.gainMax; gain += 5) {
        const y = gainToY2(gain);  // Convierte la ganancia a la posición Y correspondiente
        ctx2.beginPath();
        ctx2.moveTo(0, y);  // Comienza la línea en el borde izquierdo
        ctx2.lineTo(graph2.width, y);  // Dibuja la línea hasta el borde derecho
        ctx2.stroke();  // Traza la línea

        ctx2.fillStyle = 'white';  // Establece el color del texto
        ctx2.fillText(`${gain} dB`, 5, y - 5);  // Dibuja la etiqueta de ganancia cerca de la línea
    }

    // Dibuja líneas verticales que representan las frecuencias
    const logFreqMin = Math.log10(graph2.freqMin);  // Convierte la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph2.freqMax);  // Convierte la frecuencia máxima a escala logarítmica
    for (let logFreq = logFreqMin; logFreq <= logFreqMax; logFreq += 0.25) {
        const freq = Math.pow(10, logFreq);  // Convierte la frecuencia de nuevo a su valor real
        const x = freqToX2(freq);  // Convierte la frecuencia a la posición X correspondiente

        ctx2.beginPath();
        ctx2.moveTo(x, 0);  // Comienza la línea en el borde superior
        ctx2.lineTo(x, graph2.height);  // Dibuja la línea hasta el borde inferior
        ctx2.stroke();  // Traza la línea

        ctx2.fillStyle = 'white';  // Establece el color del texto
        ctx2.fillText(`${Math.round(freq)} Hz`, x + 5, graph2.height - 5);  // Dibuja la etiqueta de frecuencia cerca de la línea
    }
}

/**
 * Imprime los valores actuales de un filtro en el segundo ecualizador (EQ3).
 *
 * @param {Object} filter - El filtro cuyo valor se imprimirá.
 */
function printFilterValues2(filter) {
    const filterData = {
        id: filter.id,  // ID del filtro
        frequency: filter.frequency,  // Frecuencia del filtro
        gain: parseFloat(filter.gain),  // Ganancia del filtro (convertida a número flotante)
        q: filter.q  // Valor Q del filtro
    };
    console.log('EQ3 Filter:', JSON.stringify(filterData));  // Imprime los datos del filtro como una cadena JSON
}

// Inicializa y dibuja la cuadrícula en el canvas para el segundo ecualizador
drawGrid2();
drawAllCurves2();
