/**
 * FILE: eq.js
 * 
 * AUTHOR: Alfredo Romo
 * 
 * This file contains the implementation of a graphical equalizer using HTML5 canvas.
 * The equalizer allows users to add, remove, and manipulate filters that adjust 
 * the frequency response of an audio signal.
 * 
 * Integrates Websocket  communication
 */



// Choose to print when dragging the filter dot, or when finished dragging 
let printOnMove = false;


// Constants

const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');


const MAX_NUM_OF_FILTERS = 5
const colors = ['red', 'blue', 'green', 'orange', 'yellow'];
const graph = {
    width: canvas.width,
    height: canvas.height,
    freqMin: 20,
    freqMax: 20000,
    gainMin: -20,
    gainMax: 20
};





let filters = [];
let selectedFilterIndex = null;
let draggingFilterIndex = null;
let isDragging = false;



/**
 * Converts an x-coordinate on the canvas to a frequency value.
 *
 * @param {number} x - The x-coordinate on the canvas.
 * @returns {number} The corresponding frequency value.
 */
function xToFreq(x) 
{
    const logFreqMin = Math.log10(graph.freqMin);
    const logFreqMax = Math.log10(graph.freqMax);
    const logFreq = logFreqMin + (x / graph.width) * (logFreqMax - logFreqMin);
    return Math.round(Math.pow(10, logFreq));  // Ensure frequency is integer
}


/**
 * Converts a frequency value to an x-coordinate on the canvas.
 *
 * @param {number} freq - The frequency value to convert.
 * @returns {number} The corresponding x-coordinate on the canvas.
 */
function freqToX(freq) 
{
    const logFreqMin = Math.log10(graph.freqMin);
    const logFreqMax = Math.log10(graph.freqMax);
    const logFreq = Math.log10(freq);
    return ((logFreq - logFreqMin) / (logFreqMax - logFreqMin)) * graph.width;
}


/**
 * Converts a gain value to a y-coordinate on the canvas.
 *
 * @param {number} gain - The gain value to convert.
 * @returns {number} The corresponding y-coordinate on the canvas.
 */
function gainToY(gain)
{
    return (graph.height / 2) - ((gain / graph.gainMax) * (graph.height / 2));
}


/**
 * Converts a y-coordinate on the canvas to a gain value.
 *
 * @param {number}  - The y-coordinate on the canvas.
 * @returns {number} The corresponding gain value.
 */
function yToGain(y)
{
    return parseFloat((((graph.height / 2 - y) / (graph.height / 2)) * graph.gainMax).toFixed(1));  
    // Ensure gain has 1 decimal
}


/**
 * Draws the frequency response curve for a given filter.
 *
 * @param {Object} filter - The filter object containing frequency, gain, q, and color properties.
 */
function drawCurve(filter)
{
    const { frequency, gain, q, color } = filter;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= graph.width; x++) {
        const freq = xToFreq(x);
        const distance = Math.log(freq / frequency);
        const gainAdjustment = gain * Math.exp(-Math.pow(distance / (q), 2));

        const y = gainToY(gainAdjustment);

        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
    drawDot(filter);
}


/**
 * Draws the dot representing a filter on the graph.
 *
 * @param {Object} filter - The filter object containing frequency, gain, and color properties.
 */
function drawDot(filter)
{
    const { frequency, gain, color } = filter;
    const dotX = freqToX(frequency);
    const dotY = gainToY(gain);

    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}



/**
 * Clears the canvas and redraws all filter curves and the grid.
 */
function drawAllCurves()
{
    ctx.clearRect(0, 0, graph.width, graph.height);
    drawGrid();

    // Draw individual filter curves
    filters.forEach(filter => {
        drawCurve(filter);
    });

    // Draw the combined resulting curve
    drawResultingCurve();
}


/**
 * Draws the combined frequency response curve of all filters.
 */
function drawResultingCurve() 
{
    ctx.strokeStyle = 'grey';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= graph.width; x++) {
        const freq = xToFreq(x);
        let totalGain = 0;

        filters.forEach(filter => {
            const distance = Math.log(freq / filter.frequency);
            const gainAdjustment = filter.gain * Math.exp(-Math.pow(distance / (filter.q), 2));
            totalGain += gainAdjustment;
        });

        const y = gainToY(totalGain);

        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}


/**
 * Adds a new filter to the filters array and updates the UI.
 */
function addFilter()
{
    //check if the max number of filters limit has been reached
    if (filters.length >= MAX_NUM_OF_FILTERS)
    {
        alert("Maximum number if filters reached");
        console.error("Max number of filters reached, unable to add more");
        return;
    }

    const filterId = filters.length;

    const filter = {
        id: filterId,
        frequency: 1000,
        gain: 0,
        q: 1,
        color: colors[filterId % colors.length]  // Assign color based on id % number of available colors
    };

    filters.push(filter);
    addFilterToDropdown(filter);
    selectFilter(filterId);
    drawAllCurves();
}


/**
 * Adds a filter option to the dropdown menu in the UI.
 *
 * @param {Object} filter - The filter object to add to the dropdown.
 */
function addFilterToDropdown(filter)
{
    const filterSelect = document.getElementById('filterSelect');
    const option = document.createElement('option');
    option.value = filter.id;
    option.textContent = `Filter ${filter.id + 1}`;
    filterSelect.appendChild(option);
    filterSelect.value = filter.id; // Automatically select new filter
}


/**
 * Removes the currently selected filter from the filters array and updates the UI.
 */
function removeFilter()
{
    if (selectedFilterIndex !== null) {
        // Remove the filter from the filters array
        filters.splice(selectedFilterIndex, 1);

        // Remove the filter from the dropdown
        const filterSelect = document.getElementById('filterSelect');
        filterSelect.remove(selectedFilterIndex);

        // Reassign IDs and update dropdown after removal
        filters.forEach((filter, index) => {
            filter.id = index;
            filter.color = colors[index % colors.length];  // Reassign the color based on index
            filterSelect.options[index].value = index;
            filterSelect.options[index].text = `Filter ${index + 1}`;
        });

        // Set the selected filter index to the last one or null
        if (filters.length > 0) {
            selectedFilterIndex = filters.length - 1;
            filterSelect.value = selectedFilterIndex;
        } else {
            selectedFilterIndex = null;
            filterSelect.value = '';
        }

        updateSliders();
        drawAllCurves();
    }
}


/**
 * Selects a filter based on its ID and updates the UI.
 *
 * @param {number} id - The ID of the filter to select.
 */
function selectFilter(id)
{
    selectedFilterIndex = id;
    const filterSelect = document.getElementById('filterSelect');
    filterSelect.value = id; // Update dropdown to reflect the selected filter
    updateSliders();
    drawAllCurves();
}


/**
 * Handles changes to the filter dropdown menu and selects the appropriate filter.
 */
function onFilterDropdownChange()
{
    const filterSelect = document.getElementById('filterSelect');
    const selectedId = parseInt(filterSelect.value);
    selectFilter(selectedId);
}


/**
 * Updates the slider values based on the currently selected filter.
 */
function updateSliders()
{
    if (selectedFilterIndex !== null) {
        const filter = filters[selectedFilterIndex];
        document.getElementById('frequencySlider').value = filter.frequency;
        document.getElementById('gainSlider').value = filter.gain;
        document.getElementById('qSlider').value = filter.q;

        document.getElementById('frequencyValue').textContent = filter.frequency + ' Hz';
        document.getElementById('gainValue').textContent = filter.gain + ' dB';
        document.getElementById('qValue').textContent = filter.q;
    } else {
        document.getElementById('frequencySlider').value = '';
        document.getElementById('gainSlider').value = '';
        document.getElementById('qSlider').value = '';

        document.getElementById('frequencyValue').textContent = '';
        document.getElementById('gainValue').textContent = '';
        document.getElementById('qValue').textContent = '';
    }
}


/**
 * Handles input changes on the frequency slider and updates the corresponding filter.
 */
document.getElementById('frequencySlider').oninput = function ()
{
    if (selectedFilterIndex !== null) {
        filters[selectedFilterIndex].frequency = parseInt(this.value);
        document.getElementById('frequencyValue').textContent = this.value + ' Hz';
        drawAllCurves();
        printFilterValues(filters[selectedFilterIndex]);
    }
};


/**
 * Handles input changes on the gain slider and updates the corresponding filter.
 */
document.getElementById('gainSlider').oninput = function ()
{
    if (selectedFilterIndex !== null) {
        filters[selectedFilterIndex].gain = parseFloat(this.value);
        document.getElementById('gainValue').textContent = this.value + ' dB';
        drawAllCurves();
        printFilterValues(filters[selectedFilterIndex]);
    }
};


/**
 * Handles input changes on the Q slider and updates the corresponding filter.
 */
document.getElementById('qSlider').oninput = function ()
{
    if (selectedFilterIndex !== null) {
        filters[selectedFilterIndex].q = parseFloat(this.value);
        document.getElementById('qValue').textContent = this.value;
        drawAllCurves();
        printFilterValues(filters[selectedFilterIndex]);
    }
};


/**
 * Handles mouse down events on the canvas for filter dragging.
 *
 * @param {MouseEvent} event - The mouse event object.
 */
canvas.addEventListener('mousedown', function (e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    filters.forEach((filter, index) => {
        const dotX = freqToX(filter.frequency);
        const dotY = gainToY(filter.gain);

        const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));
        if (dist < 8) {
            draggingFilterIndex = index;
            selectFilter(index);  // Update selected filter when dot is clicked
            isDragging = true;
        }
    });
});


/**
 * Handles mouse move events on the canvas for filter dragging.
 *
 * @param {MouseEvent} event - The mouse event object.
 */
canvas.addEventListener('mousemove', function (e) {
    if (isDragging && draggingFilterIndex !== null) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const filter = filters[draggingFilterIndex];
        filter.frequency = xToFreq(mouseX);
        filter.gain = yToGain(mouseY);

        drawAllCurves();
        updateSliders();  // Update sliders when moving dot

        if (printOnMove)
        {
            printFilterValues(filter); // Print while moving
        }
    }
});


/**
 * Handles mouse up events on the canvas to stop dragging filters.
 */
canvas.addEventListener('mouseup', function () {
    isDragging = false;
    if (draggingFilterIndex !== null && !printOnMove) {
        printFilterValues(filters[draggingFilterIndex]); // Print after releasing the mouse button
    }
    draggingFilterIndex = null;
});


/**
 * Handles mouse leave events on the canvas to stop dragging filters.
 */
canvas.onmouseleave = function () {
    isDragging = false;
    draggingFilterIndex = null;
};

/**
 * Draws the grid on the canvas for better visual reference.
 */
function drawGrid()
{
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    // Draw horizontal lines (gains)
    for (let gain = graph.gainMin; gain <= graph.gainMax; gain += 5) {
        const y = gainToY(gain);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(graph.width, y);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.fillText(`${gain} dB`, 5, y - 5);
    }

    // Draw vertical lines (frequencies)
    const logFreqMin = Math.log10(graph.freqMin);
    const logFreqMax = Math.log10(graph.freqMax);
    for (let logFreq = logFreqMin; logFreq <= logFreqMax; logFreq += 0.25) {
        const freq = Math.pow(10, logFreq);
        const x = freqToX(freq);

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, graph.height);
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.fillText(`${Math.round(freq)} Hz`, x + 5, graph.height - 5);
    }
}


function printFilterValues(filter) 
{
    const filterData = {
        id: filter.id,
        frequency: filter.frequency,
        gain: parseFloat(filter.gain),
        q: filter.q
    };
    console.log(JSON.stringify(filterData));
}


// Initialize without filters
drawGrid();
drawAllCurves();