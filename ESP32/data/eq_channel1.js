/*
 * ARCHIVO: eq.js
 * 
 * AUTOR: Alfredo Romo
 * 
 * Este archivo contiene la implementación de un ecualizador gráfico utilizando el lienzo HTML5.
 * El ecualizador permite a los usuarios agregar, eliminar y manipular filtros que ajustan
 * la respuesta en frecuencia de una señal de audio.
 * 
 * Integra comunicación WebSocket
*/

// Elegir si imprimir mientras se arrastra el punto del filtro o cuando se termine de arrastrar
let printOnMove = false; // Bandera para controlar si se imprimen los valores del filtro mientras se arrastra o después de arrastrar

// Elementos del lienzo en el cuerpo de HTML
const canvas1 = document.getElementById('graph1'); // Obtener el elemento del lienzo//
const ctx = canvas1.getContext('2d'); // Obtener el contexto de dibujo (2D) del lienzo

// Número máximo de filtros que se pueden crear
const MAX_NUM_OF_FILTERS = 5; // Límite para la cantidad de filtros

// Array para almacenar los colores disponibles para los filtros
const colors = ['red', 'blue', 'green', 'yellow', 'cyan']; // Colores predefinidos para cada filtro

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
const socket = new WebSocket('ws://localhost:8765'); // Establecer conexión WebSocket con el servidor

let filters = [];                // Array para almacenar los objetos de filtro
let selectedFilterIndex = null;  // Índice del filtro actualmente seleccionado en el desplegable
let draggingFilterIndex = null;  // Índice del filtro que se está arrastrando actualmente en el lienzo
let isDragging = false;          // Bandera para saber si un filtro está siendo arrastrado


/**
 * Converts an x-coordinate on the canvas1 to a frequency value.
 * Función para convertir la coordenada x en el lienzo a un valor de frecuencia
 * 
 * @param {number} x - The x-coordinate on the canvas1.
 * @returns {number} The corresponding frequency value.
 */
function xToFreq(x) {
    const logFreqMin = Math.log10(graph1.freqMin); // Convertir la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph1.freqMax); // Convertir la frecuencia máxima a escala logarítmica
    const logFreq = logFreqMin + (x / graph1.width) * (logFreqMax - logFreqMin); // Mapear x a frecuencia logarítmica
    return Math.round(Math.pow(10, logFreq)); // Convertir de nuevo a frecuencia lineal, redondeada al entero más cercano
}

/**
 * Converts a frequency value to an x-coordinate on the canvas1.
 * Función para convertir un valor de frecuencia a una coordenada x en el lienzo
 * 
 * @param {number} freq - The frequency value to convert.
 * @returns {number} The corresponding x-coordinate on the canvas1.
 */
function freqToX(freq) {
    const logFreqMin = Math.log10(graph1.freqMin); // Conversión a escala logarítmica
    const logFreqMax = Math.log10(graph1.freqMax);
    const logFreq = Math.log10(freq);
    return ((logFreq - logFreqMin) / (logFreqMax - logFreqMin)) * graph1.width; // Mapear frecuencia a coordenada x
}

/**
 * Converts a gain value to a y-coordinate on the canvas1.
 * Función para convertir un valor de ganancia a una coordenada y en el lienzo
 * 
 * @param {number} gain - The gain value to convert.
 * @returns {number} The corresponding y-coordinate on the canvas1.
 */
function gainToY(gain) {
    return (graph1.height / 2) - ((gain / graph1.gainMax) * (graph1.height / 2)); // Mapear ganancia a coordenada y
}

/**
 * Converts a y-coordinate on the canvas1 to a gain value.
 * Función para convertir una coordenada y en el lienzo a un valor de ganancia
 * 
 * @param {number}  - The y-coordinate on the canvas1.
 * @returns {number} The corresponding gain value.
 */
function yToGain(y) {
    return parseFloat((((graph1.height / 2 - y) / (graph1.height / 2)) * graph1.gainMax).toFixed(1)); // Mapear y a ganancia
}

/**
 * Draws the frequency response curve for a given filter.
 * Función para dibujar la curva de respuesta en frecuencia para un filtro dado
 * 
 * @param {Object} filter - The filter object containing frequency, gain, q, and color properties.
 */
function drawCurve(filter) {
    const { frequency, gain, q, color } = filter; // Desestructurar las propiedades del filtro
    ctx.strokeStyle = color; // Establecer el color de la curva
    ctx.lineWidth = 2; // Establecer el grosor de la línea
    ctx.beginPath(); // Iniciar una nueva trayectoria para la curva

    // Dibujar la curva punto por punto a lo largo del lienzo
    for (let x = 0; x <= graph1.width; x++) {
        const freq = xToFreq(x); // Convertir x a frecuencia
        const distance = Math.log(freq / frequency); // Calcular la distancia logarítmica desde la frecuencia central del filtro
        const gainAdjustment = gain * Math.exp(-Math.pow(distance / q, 2)); // Ajuste gaussiano para la ganancia

        const y = gainToY(gainAdjustment); // Convertir el ajuste de ganancia a coordenada y

        if (x === 0) {
            ctx.moveTo(x, y); // Moverse al primer punto
        } else {
            ctx.lineTo(x, y); // Dibujar línea al siguiente punto
        }
    }
    ctx.stroke(); // Renderizar la curva
    drawDot(filter); // Dibujar el punto de control sobre la curva
}

/**
 * Draws the dot representing a filter on the graph1.
 * Función para dibujar un punto que representa un filtro en el gráfico
 * 
 * @param {Object} filter - The filter object containing frequency, gain, and color properties.
 */
function drawDot(filter) {
    const { frequency, gain, color } = filter;
    const dotX = freqToX(frequency); // Convertir frecuencia a coordenada x
    const dotY = gainToY(gain); // Convertir ganancia a coordenada y

    ctx.beginPath(); // Iniciar una nueva trayectoria para el punto
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2); // Dibujar un círculo con radio 8
    ctx.fillStyle = color; // Establecer el color del punto
    ctx.fill(); // Rellenar el punto
}

// Función para borrar el lienzo y redibujar todas las curvas de filtros y la cuadrícula
function drawAllCurves() {
    ctx.clearRect(0, 0, graph1.width, graph1.height); // Borrar todo el lienzo
    drawGrid(); // Dibujar la cuadrícula de fondo

    // Dibujar la curva de cada filtro
    filters.forEach(filter => {
        drawCurve(filter);
    });

    drawResultingCurve(); // Dibujar la respuesta en frecuencia combinada de todos los filtros
}

// Función para dibujar la respuesta en frecuencia combinada de todos los filtros
function drawResultingCurve() {
    ctx.strokeStyle = 'grey'; // Establecer el color para la curva resultante
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= graph1.width; x++) {
        const freq = xToFreq(x);
        let totalGain = 0;

        // Sumar los ajustes de ganancia de todos los filtros en la frecuencia actual
        filters.forEach(filter => {
            const distance = Math.log(freq / filter.frequency);
            const gainAdjustment = filter.gain * Math.exp(-Math.pow(distance / filter.q, 2));
            totalGain += gainAdjustment;
        });

        const y = gainToY(totalGain); // Convertir la ganancia total a coordenada y

        if (x === 0) {
            ctx.moveTo(x, y); // Iniciar en el primer punto
        } else {
            ctx.lineTo(x, y); // Dibujar línea al siguiente punto
        }
    }
    ctx.stroke(); // Renderizar la curva resultante
}

/**
 * Agrega un nuevo filtro al array de filtros y actualiza la interfaz de usuario.
 */
function addFilter1()
{
    // Verificar si se ha alcanzado el límite máximo de filtros
    if (filters.length >= MAX_NUM_OF_FILTERS)
    {
        alert("Se ha alcanzado el número máximo de filtros");
        console.error("Se alcanzó el número máximo de filtros, no se puede agregar más");
        return; // Termina la ejecución si ya no se pueden agregar más filtros
    }

    const filterId = filters.length; // El id del nuevo filtro es el número actual de filtros

    const filter = {
        id: filterId,            // ID único para el filtro
        frequency: 1000,         // Frecuencia central predeterminada (1000 Hz)
        gain: 0,                 // Ganancia predeterminada (0 dB)
        q: 1,                    // Factor Q predeterminado (1)
        color: colors[filterId % colors.length]  // Asignar color basado en el índice
    };

    filters.push(filter);  // Agregar el nuevo filtro al array de filtros
    addFilter1ToDropdown(filter);  // Agregar la opción del filtro al menú desplegable
    selectFilter1(filterId);  // Seleccionar el nuevo filtro automáticamente
    drawAllCurves();  // Redibujar las curvas para reflejar el nuevo filtro
}

/**
 * Agrega una opción de filtro al menú desplegable en la interfaz de usuario.
 *
 * @param {Object} filter - El objeto de filtro que se agregará al desplegable.
 */
function addFilter1ToDropdown(filter)
{
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtener el elemento del menú desplegable
    const option = document.createElement('option'); // Crear un nuevo elemento de opción
    option.value = filter.id;  // Establecer el valor de la opción como el ID del filtro
    option.textContent = `Filtro ${filter.id + 1}`;  // Mostrar "Filtro X" en el desplegable
    filterSelect1.appendChild(option);  // Agregar la nueva opción al menú
    filterSelect1.value = filter.id;  // Seleccionar automáticamente el nuevo filtro
}

/**
 * Elimina el filtro actualmente seleccionado del array de filtros y actualiza la interfaz de usuario.
 */
function removeFilter1()
{
    if (selectedFilterIndex !== null) {  // Verificar si hay un filtro seleccionado
        // Eliminar el filtro del array de filtros
        filters.splice(selectedFilterIndex, 1);

        // Eliminar el filtro del menú desplegable
        const filterSelect1 = document.getElementById('filterSelect1');
        filterSelect1.remove(selectedFilterIndex);

        // Reasignar IDs y actualizar el menú desplegable después de la eliminación
        filters.forEach((filter, index) => {
            filter.id = index;  // Reasignar el ID del filtro según su nueva posición
            filter.color = colors[index % colors.length];  // Reasignar el color según la nueva posición
            filterSelect1.options[index].value = index;  // Actualizar el valor del menú desplegable
            filterSelect1.options[index].text = `Filtro ${index + 1}`;  // Actualizar el texto del menú desplegable
        });

        // Establecer el índice del filtro seleccionado al último o a null si no hay filtros
        if (filters.length > 0) {
            selectedFilterIndex = filters.length - 1;  // Seleccionar el último filtro
            filterSelect1.value = selectedFilterIndex;  // Actualizar el valor del menú desplegable
        } else {
            selectedFilterIndex = null;  // No hay filtros, establecer el índice seleccionado a null
            filterSelect1.value = '';  // Limpiar la selección del menú desplegable
        }

        updateSliders();  // Actualizar los controles deslizantes de la interfaz
        drawAllCurves();  // Redibujar todas las curvas para reflejar los cambios
    }
}

/**
 * Selecciona un filtro basado en su ID y actualiza la interfaz de usuario.
 *
 * @param {number} id - El ID del filtro que se desea seleccionar.
 */
function selectFilter1(id)
{
    selectedFilterIndex = id;  // Establece el índice del filtro seleccionado
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtiene el elemento del menú desplegable
    filterSelect1.value = id; // Actualiza el menú desplegable para reflejar el filtro seleccionado
    updateSliders();  // Actualiza los controles deslizantes según el filtro seleccionado
    drawAllCurves();  // Redibuja todas las curvas de filtros, incluida la del filtro seleccionado
}

/**
 * Maneja los cambios en el menú desplegable de filtros y selecciona el filtro correspondiente.
 */
function onFilterDropdownChange1()
{
    const filterSelect1 = document.getElementById('filterSelect1'); // Obtiene el menú desplegable
    const selectedId = parseInt(filterSelect1.value);  // Convierte el valor seleccionado en un número entero
    selectFilter1(selectedId);  // Llama a selectFilter1 para aplicar la selección
}

/*function setupRangeSlider(frequencySlider1Id,
                          frequencyValue1Id,
                          gainSlider1Id,
                          gainValue1Id,
                          qSlider1Id,
                          qValue1Id){
    const frequencySlider1 = document.getElementById(frequencySlider1Id),
          frequencyValue1 = document.getElementById(frequencyValue1Id),
          gainSlider1= document.getElementById(gainSlider1Id),
          gainValue1= document.getElementById(gainValue1Id),
          qSlider1= document.getElementById(qSlider1Id),
          qValue1= document.getElementById(qValue1Id);
}*/

/**
 * Actualiza los valores de los deslizadores según el filtro seleccionado actualmente.
 */
function updateSliders()
{
    if (selectedFilterIndex !== null) {
        const filter = filters[selectedFilterIndex];
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


/**
 * Maneja los cambios de entrada en el deslizante de frecuencia y actualiza el filtro correspondiente.
 */
document.getElementById('frequencySlider1').oninput = function ()
{
    if (selectedFilterIndex !== null) {  // Verifica que haya un filtro seleccionado
        // Actualiza la frecuencia del filtro seleccionado con el nuevo valor del deslizante
        filters[selectedFilterIndex].frequency = parseInt(this.value);
        document.getElementById('frequencyValue1').textContent = this.value + ' Hz';  // Muestra la nueva frecuencia en la interfaz
        drawAllCurves();  // Redibuja todas las curvas de filtros para reflejar el cambio

        // Enviar los datos modificados al servidor
        ws_sendFilterData(selectedFilterIndex);  // Función para enviar los datos del filtro al servidor
        printFilterValues(filters[selectedFilterIndex]);  // Imprime los valores del filtro seleccionado
    }
};

/**
 * Maneja los cambios de entrada en el deslizante de ganancia y actualiza el filtro correspondiente.
 */
document.getElementById('gainSlider1').oninput = function (){
    if (selectedFilterIndex !== null) {  // Verifica que haya un filtro seleccionado
        filters[selectedFilterIndex].gain = parseFloat(this.value);  // Actualiza la ganancia del filtro seleccionado
        document.getElementById('gainValue1').textContent = this.value + ' dB';  // Muestra la ganancia actual en la interfaz
        drawAllCurves();  // Redibuja todas las curvas de filtros para reflejar el cambio

        // Envía los datos modificados al servidor
        ws_sendFilterData(selectedFilterIndex);  // Envía los datos al servidor para sincronización
        printFilterValues(filters[selectedFilterIndex]);  // Imprime los valores del filtro seleccionado
    }
};

/**
 * Maneja los cambios de entrada en el deslizante de Q (factor de calidad) y actualiza el filtro correspondiente.
 */
document.getElementById('qSlider1').oninput = function (){
    if (selectedFilterIndex !== null) {  // Verifica que haya un filtro seleccionado
        filters[selectedFilterIndex].q = parseFloat(this.value);  // Actualiza el valor de Q del filtro
        document.getElementById('qValue1').textContent = this.value;  // Muestra el valor de Q en la interfaz
        drawAllCurves();  // Redibuja todas las curvas de filtros para reflejar el cambio

        // Envía los datos modificados al servidor
        ws_sendFilterData(selectedFilterIndex);  // Envía los datos del filtro al servidor
        printFilterValues(filters[selectedFilterIndex]);  // Imprime los valores del filtro seleccionado
    }
};

/**
 * Maneja los eventos de "mousedown" en el canvas1 para el arrastre de filtros.
 *
 * @param {MouseEvent} event - El objeto del evento del ratón.
 */
canvas1.addEventListener('mousedown', function (e){
    const rect = canvas1.getBoundingClientRect();  // Obtiene las coordenadas del canvas1
    const mouseX = e.clientX - rect.left;  // Calcula la posición X del ratón dentro del canvas1
    const mouseY = e.clientY - rect.top;  // Calcula la posición Y del ratón dentro del canvas1

    // Recorre todos los filtros para verificar si el ratón hizo clic en un punto de filtro
    filters.forEach((filter, index) => {
        const dotX = freqToX(filter.frequency);  // Convierte la frecuencia del filtro en coordenada X
        const dotY = gainToY(filter.gain);  // Convierte la ganancia del filtro en coordenada Y

        // Calcula la distancia entre el clic del ratón y el punto del filtro
        const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));
        if (dist < 8) {  // Si la distancia es menor que el radio del punto (8px)
            draggingFilterIndex = index;  // Establece el índice del filtro que está siendo arrastrado
            selectFilter1(index);  // Actualiza el filtro seleccionado cuando se hace clic en él
            isDragging = true;  // Marca que un filtro está siendo arrastrado
        }
    });
});

/**
 * Maneja los eventos de "mousemove" en el canvas1 para arrastrar un filtro.
 *
 * @param {MouseEvent} event - El objeto del evento del ratón.
 */
canvas1.addEventListener('mousemove', function (e){
    if (isDragging && draggingFilterIndex !== null) {  // Verifica si se está arrastrando un filtro
        const rect = canvas1.getBoundingClientRect();  // Obtiene las coordenadas del canvas1
        const mouseX = e.clientX - rect.left;  // Calcula la posición X del ratón dentro del canvas1
        const mouseY = e.clientY - rect.top;  // Calcula la posición Y del ratón dentro del canvas1

        const filter = filters[draggingFilterIndex];  // Obtiene el filtro que está siendo arrastrado
        filter.frequency = xToFreq(mouseX);  // Convierte la posición X del ratón a una frecuencia
        filter.gain = yToGain(mouseY);  // Convierte la posición Y del ratón a una ganancia

        drawAllCurves();  // Redibuja todas las curvas de filtros

        updateSliders();  // Actualiza los deslizadores de la interfaz con los nuevos valores del filtro

        if (printOnMove)  // Si está habilitada la opción de imprimir mientras se mueve el filtro
        {
            printFilterValues(filter);  // Imprime los valores del filtro mientras se arrastra
        }
    }
});

/**
 * Maneja los eventos de "mouseup" (botón del ratón liberado) en el canvas1 para detener el arrastre de filtros.
 */
canvas1.addEventListener('mouseup', function () 
{
    isDragging = false;  // Detiene el arrastre cuando se suelta el botón del ratón

    if (draggingFilterIndex !== null && !printOnMove) {
        // Si hay un filtro siendo arrastrado y no se está imprimiendo continuamente
        printFilterValues(filters[draggingFilterIndex]);  // Imprime los valores del filtro después de soltar el ratón

        // Envía los datos del filtro al servidor
        ws_sendFilterData(selectedFilterIndex);
    }

    draggingFilterIndex = null;  // Resetea el índice del filtro arrastrado
});

/**
 * Maneja los eventos de "mouseleave" (cuando el ratón sale del área del canvas1) para detener el arrastre de filtros.
 */
canvas1.onmouseleave = function () 
{
    isDragging = false;  // Detiene el arrastre cuando el ratón sale del canvas1
    draggingFilterIndex = null;  // Resetea el índice del filtro arrastrado
};

/**
 * Escucha el evento cuando se abre la conexión WebSocket.
 */
socket.onopen = () => {
    console.log('WebSocket connection opened');  // Informa que la conexión WebSocket se abrió con éxito
}

/**
 * Escucha el evento cuando llega un mensaje desde el servidor WebSocket.
 */
socket.onmessage = (event) => {
    console.log('Message from server:', event.data);  // Imprime el mensaje recibido del servidor

    // Procesa los datos del filtro recibidos en el mensaje
    let filter = event.data;
    filters[filter.id] = filter;  // Actualiza el filtro correspondiente en el arreglo de filtros

    // Actualiza la interfaz de usuario y redibuja las curvas con los nuevos datos del filtro
    updateSliders();
    drawAllCurves();
};

/**
 * Función para manejar errores de WebSocket.
 */
socket.onerror = (error) => {
    console.error('WebSocket error:', error);  // Imprime el error si ocurre un problema con la conexión WebSocket
};

/**
 * Función para manejar el cierre de la conexión WebSocket.
 */
socket.onclose = () => {
    console.log('WebSocket connection closed');  // Informa cuando la conexión WebSocket se ha cerrado
};

/**
 * Envía los datos de un filtro específico al servidor WebSocket.
 *
 * @param {number} filterIndex - El índice del filtro que se va a enviar.
 */
function ws_sendFilterData(filterIndex) 
{
    // Verifica que el índice del filtro sea válido
    if (filterIndex !== null && filterIndex >= 0 && filterIndex < filters.length)
    {
        const filter = filters[filterIndex];  // Obtiene el filtro correspondiente al índice
        const data = {
            id: filter.id,
            frequency: filter.frequency,
            gain: filter.gain,
            q: filter.q
        };
        
        // Verifica si la conexión WebSocket está lista para enviar datos
        if (socket && socket.readyState === WebSocket.OPEN)
        {
            socket.send(JSON.stringify(data));  // Envía los datos como un mensaje JSON al servidor
            console.log("Data sent:", data);  // Imprime los datos enviados
        } 
        else 
        {
            console.error("WebSocket is not open.");  // Si la conexión no está abierta, imprime un error
        }
    } 
    else
    {
        console.error("Invalid filter index.");  // Si el índice del filtro es inválido, imprime un error
    }
}

/**
 * Dibuja la cuadrícula en el canvas1 para proporcionar una referencia visual.
 * Se dibujan líneas horizontales (para las ganancias) y líneas verticales (para las frecuencias).
 */
function drawGrid()
{
    ctx.strokeStyle = '#555';  // Establece el color de las líneas de la cuadrícula
    ctx.lineWidth = 1;  // Establece el grosor de las líneas

    // Dibuja líneas horizontales que representan las ganancias
    for (let gain = graph1.gainMin; gain <= graph1.gainMax; gain += 5) {
        const y = gainToY(gain);  // Convierte la ganancia a la posición Y correspondiente
        ctx.beginPath();
        ctx.moveTo(0, y);  // Comienza la línea en el borde izquierdo
        ctx.lineTo(graph1.width, y);  // Dibuja la línea hasta el borde derecho
        ctx.stroke();  // Traza la línea

        ctx.fillStyle = 'white';  // Establece el color del texto
        ctx.fillText(`${gain} dB`, 5, y - 5);  // Dibuja la etiqueta de ganancia cerca de la línea
    }

    // Dibuja líneas verticales que representan las frecuencias
    const logFreqMin = Math.log10(graph1.freqMin);  // Convierte la frecuencia mínima a escala logarítmica
    const logFreqMax = Math.log10(graph1.freqMax);  // Convierte la frecuencia máxima a escala logarítmica
    for (let logFreq = logFreqMin; logFreq <= logFreqMax; logFreq += 0.25) {
        const freq = Math.pow(10, logFreq);  // Convierte la frecuencia de nuevo a su valor real
        const x = freqToX(freq);  // Convierte la frecuencia a la posición X correspondiente

        ctx.beginPath();
        ctx.moveTo(x, 0);  // Comienza la línea en el borde superior
        ctx.lineTo(x, graph1.height);  // Dibuja la línea hasta el borde inferior
        ctx.stroke();  // Traza la línea

        ctx.fillStyle = 'white';  // Establece el color del texto
        ctx.fillText(`${Math.round(freq)} Hz`, x + 5, graph1.height - 5);  // Dibuja la etiqueta de frecuencia cerca de la línea
    }
}

/**
 * Imprime los valores actuales de un filtro en la consola.
 *
 * @param {Object} filter - El filtro cuyo valor se imprimirá.
 */
function printFilterValues(filter) 
{
    const filterData = {
        id: filter.id,  // ID del filtro
        frequency: filter.frequency,  // Frecuencia del filtro
        gain: parseFloat(filter.gain),  // Ganancia del filtro (convertida a número flotante)
        q: filter.q  // Valor Q del filtro
    };
    console.log(JSON.stringify(filterData));  // Imprime los datos del filtro como una cadena JSON
}

// Inicializa y dibuja la cuadrícula en el canvas1 sin filtros
drawGrid();
drawAllCurves();
