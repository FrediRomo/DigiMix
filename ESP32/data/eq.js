/*
 * FILE: eq.js
 * 
 * AUTHOR: Alfredo Romo
 * 
 * This file contains the implementation of a graphic equalizer using the HTML5 canvas.
 * The equalizer allows users to add, remove, and manipulate filters that adjust
 * the frequency response of an audio signal.
 * 
 * Integrates WebSocket communication
*/

// Choose whether to print while dragging the filter dot or when dragging ends
let printOnMove = false;

// Canvas elements in the HTML body
const canvas = document.getElementById('graph'); 
const ctx = canvas.getContext('2d');


// Maximum number of filters that can be created
const MAX_NUM_OF_FILTERS = 3;

// Available colors for filters
const colors = ['red', 'blue', 'green', 'yellow', 'cyan']; 

// Base graphic object containing properties for frequency and gain ranges
const graph = {
    width: canvas.width,   
    height: canvas.height,
    freqMin: 20,
    freqMax: 20000,
    gainMin: -20,
    gainMax: 20
};

// WebSocket object for multi-client connection
const socket = new WebSocket('ws://localhost:8765'); 

let filters = [];                // Array to store filter objects
let selectedFilterIndex = null;  // Index of the currently selected filter in the dropdown
let draggingFilterIndex = null;  // Index of the filter currently being dragged on the canvas
let isDragging = false;          // Flag to know if a filter is being dragged


/**
 * Converts an x-coordinate on the canvas to a frequency value.
 * 
 * @param {number} x - The x-coordinate on the canvas.
 * @returns {number} The corresponding frequency value.
 */
function xToFreq(x) {
    const logFreqMin = Math.log10(graph.freqMin); // Convert minimum frequency to logarithmic scale
    const logFreqMax = Math.log10(graph.freqMax); // Convert maximum frequency to logarithmic scale
    const logFreq = logFreqMin + (x / graph.width) * (logFreqMax - logFreqMin); // Map x to logarithmic frequency
    return Math.round(Math.pow(10, logFreq)); // Convert back to linear frequency, rounded to nearest integer
}

/**
 * Converts a frequency value to an x-coordinate on the canvas.
 * 
 * @param {number} freq - The frequency value to convert.
 * @returns {number} The corresponding x-coordinate on the canvas.
 */
function freqToX(freq) {
    const logFreqMin = Math.log10(graph.freqMin); // Log conversion
    const logFreqMax = Math.log10(graph.freqMax);
    const logFreq = Math.log10(freq);
    return ((logFreq - logFreqMin) / (logFreqMax - logFreqMin)) * graph.width; // Map frequency to x-coordinate
}

/**
 * Converts a gain value to a y-coordinate on the canvas.
 * 
 * @param {number} gain - The gain value to convert.
 * @returns {number} The corresponding y-coordinate on the canvas.
 */
function gainToY(gain) {
    return (graph.height / 2) - ((gain / graph.gainMax) * (graph.height / 2)); // Map gain to y-coordinate
}

/**
 * Converts a y-coordinate on the canvas to a gain value.
 * 
 * @param {number} y - The y-coordinate on the canvas.
 * @returns {number} The corresponding gain value.
 */
function yToGain(y) {
    return parseFloat((((graph.height / 2 - y) / (graph.height / 2)) * graph.gainMax).toFixed(1)); // Map y to gain
}

/**
 * Draws the frequency response curve for a given filter.
 * 
 * @param {Object} filter - The filter object containing frequency, gain, q, and color properties.
 */
function drawCurve(filter) {
    const { frequency, gain, q, color } = filter; // Destructure the filter properties
    ctx.strokeStyle = color; // Set the curve color
    ctx.lineWidth = 2; // Set line width
    ctx.beginPath(); // Start a new path for the curve

    // Draw the curve point by point across the canvas
    for (let x = 0; x <= graph.width; x++) {
        const freq = xToFreq(x);                                             // Convert x to frequency
        const distance = Math.log(freq / frequency);                         // Calculate logarithmic distance from the filter's center frequency
        const gainAdjustment = gain * Math.exp(-Math.pow(distance / q, 2)); // Gaussian adjustment for gain

        const y = gainToY(gainAdjustment); // Convert gain adjustment to y-coordinate

        if (x === 0)
        {
            ctx.moveTo(x, y); // Move to the first point
        } else
        {
            ctx.lineTo(x, y); // Draw line to the next point
        }
    }
    ctx.stroke(); // Render the curve
    drawDot(filter); // Draw the control point over the curve
}

/**
 * Draws the dot representing a filter on the graph.
 * 
 * @param {Object} filter - The filter object containing frequency, gain, and color properties.
 */
function drawDot(filter) {
    const { frequency, gain, color } = filter;
    const dotX = freqToX(frequency); // Convert frequency to x-coordinate
    const dotY = gainToY(gain); // Convert gain to y-coordinate

    ctx.beginPath(); // Start a new path for the dot
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2); // Draw a circle with radius 8
    ctx.fillStyle = color; // Set dot color
    ctx.fill(); // Fill the dot
}

// Function to clear the canvas and redraw all filter curves and the grid
function drawAllCurves() {
    ctx.clearRect(0, 0, graph.width, graph.height); // Clear the entire canvas
    drawGrid(); // Draw the background grid

    // Draw the curve of each filter
    filters.forEach(filter => {
        drawCurve(filter);
    });

    drawResultingCurve(); // Draw the combined frequency response of all filters
}

// Function to draw the combined frequency response of all filters
function drawResultingCurve()
{
    ctx.strokeStyle = 'grey'; // Set color for the resulting curve
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= graph.width; x++) {
        const freq = xToFreq(x);
        let totalGain = 0;

        // Sum the gain adjustments of all filters at the current frequency
        filters.forEach(filter => {
            const distance = Math.log(freq / filter.frequency);
            const gainAdjustment = filter.gain * Math.exp(-Math.pow(distance / filter.q, 2));
            totalGain += gainAdjustment;
        });

        const y = gainToY(totalGain); // Convert total gain to y-coordinate

        if (x === 0) {
            ctx.moveTo(x, y); // Start at the first point
        } else {
            ctx.lineTo(x, y); // Draw line to the next point
        }
    }
    ctx.stroke(); // Render the resulting curve
}

/**
 * Adds a new filter to the array of filters and updates the user interface.
 */
function addFilter() {
    // Check if the maximum number of filters has been reached
    if (filters.length >= MAX_NUM_OF_FILTERS) {
        alert("Maximum number of filters reached");
        console.error("Maximum number of filters reached, cannot add more");
        return;
    }

    const filterId = filters.length; // The new filter's ID is the current number of filters

    const filter = {
        id: filterId,            
        frequency: 1000,                         // Default center frequency 1000 Hz
        gain: 0,                                 // Default gain 0 dB
        q: 1,                                    // Default Q factor 1
        color: colors[filterId % colors.length]  // Assign color based on index
    };

    filters.push(filter);         // Add the new filter to the array of filters
    addFilterToDropdown(filter);  // Add the filter option to the dropdown menu
    selectFilter(filterId);       // Automatically select the new filter
    drawAllCurves();              // Redraw the curves to reflect the new filter
}

/**
 * Adds a filter option to the dropdown menu in the user interface.
 *
 * @param {Object} filter - The filter object to be added to the dropdown.
 */
function addFilterToDropdown(filter) {
    
    // Get the dropdown element
    const filterSelect = document.getElementById('filterSelect'); 

    // Create a new option element
    const option = document.createElement('option'); 
    option.value = filter.id;                         // Set the option value to the filter ID
    option.textContent = `Filter ${filter.id + 1}`;   // Display "Filter X" in the dropdown
    filterSelect.appendChild(option);                 // Add the new option to the dropdown
    filterSelect.value = filter.id;                   // Automatically select the new filter
}

/**
 * Removes the currently selected filter from the array of filters and updates the user interface.
 */
function removeFilter() {

    // Check if there is a selected filter
    if (selectedFilterIndex !== null)
    {  
        
        // Remove the filter from the array of filters
        filters.splice(selectedFilterIndex, 1);

        // Remove the filter from the dropdown menu
        const filterSelect = document.getElementById('filterSelect');
        filterSelect.remove(selectedFilterIndex);

        // Reassign IDs and update the dropdown menu after removal
        filters.forEach((filter, index) => {
            filter.id = index;  // Reassign the filter ID according to its new position
            filter.color = colors[index % colors.length];  // Reassign color according to the new position
            filterSelect.options[index].value = index;  // Update dropdown value
            filterSelect.options[index].text = `Filter ${index + 1}`;  // Update dropdown text
        });

        // Set the selected filter index to the last or to null if no filters are left
        if (filters.length > 0) 
        {
            selectedFilterIndex = filters.length - 1;  // Select the last filter
            filterSelect.value = selectedFilterIndex;  // Update dropdown value
        } else 
        {
            selectedFilterIndex = null;  // No filters, set the selected index to null
            filterSelect.value = '';  // Clear the dropdown selection
        }

        updateSliders();  // Update interface sliders
        drawAllCurves();  // Redraw all curves to reflect changes
    }
}

/**
 * Selects a filter based on its ID and updates the user interface.
 *
 * @param {number} id - The ID of the filter to be selected.
 */
function selectFilter(id) {
    selectedFilterIndex = id;                                     // Set the selected filter index
    const filterSelect = document.getElementById('filterSelect'); // Get the dropdown element
    filterSelect.value = id;                                      // Update the dropdown to reflect the selected filter
    updateSliders();                                              // Update sliders according to the selected filter
    drawAllCurves();                                              // Redraw all filter curves, including the selected filter
}

/**
 * Handles changes in the filter dropdown menu and selects the corresponding filter.
 */
function onFilterDropdownChange() 
{
    const filterSelect = document.getElementById('filterSelect'); // Get the dropdown
    const selectedId = parseInt(filterSelect.value);              // Convert selected value to an integer
    selectFilter(selectedId);                                     // Call selectFilter to apply the selection
}

function updateSliders() 
{
    //Check if there is a Filter to update, if not set everything as empty
    if (selectedFilterIndex !== null) {
        const filter = filters[selectedFilterIndex];
        document.getElementById('frequencySlider').value = filter.frequency;
        document.getElementById('gainSlider').value = filter.gain;
        document.getElementById('qSlider').value = filter.q;

        document.getElementById('frequencyValue').textContent = filter.frequency + ' Hz';
        document.getElementById('gainValue').textContent = filter.gain + ' dB';
        document.getElementById('qValue').textContent = filter.q;
    }

    else
    {
        document.getElementById('frequencySlider').value = '';
        document.getElementById('gainSlider').value = '';
        document.getElementById('qSlider').value = '';

        document.getElementById('frequencyValue').textContent = '';
        document.getElementById('gainValue').textContent = '';
        document.getElementById('qValue').textContent = '';
    }
}


/**
 * Handles input changes in the frequency slider and updates the corresponding filter.
 */
document.getElementById('frequencySlider').oninput = function () 
{
    // Check that there is a selected filter
    if (selectedFilterIndex !== null)
    {  
        // Update the frequency of the selected filter with the new slider value
        filters[selectedFilterIndex].frequency = parseInt(this.value);
        document.getElementById('frequencyValue').textContent = this.value + ' Hz';  // Display new frequency in the interface
        drawAllCurves();                                                             // Redraw all filter curves to reflect the change

        // Send the modified data to the server
        ws_sendFilterData(selectedFilterIndex);           // Function to send filter data to the server
        printFilterValues(filters[selectedFilterIndex]);  // Print the selected filter's values
    }
};

/**
 * Handles input changes in the gain slider and updates the corresponding filter.
 */
document.getElementById('gainSlider').oninput = function ()
{
    // Check that there is a selected filter
    if (selectedFilterIndex !== null)
    {  
        filters[selectedFilterIndex].gain = parseFloat(this.value);             // Update gain of the selected filter
        document.getElementById('gainValue').textContent = this.value + ' dB';  // Display current gain in the interface
        drawAllCurves();                                                        // Redraw all filter curves to reflect the change

        // Send the modified data to the server
        ws_sendFilterData(selectedFilterIndex);  // Send data to the server for synchronization
        printFilterValues(filters[selectedFilterIndex]);  // Print the selected filter's values
    }
};

/**
 * Handles input changes in the Q (quality factor) slider and updates the corresponding filter.
 */
document.getElementById('qSlider').oninput = function () 
{
    // Check that there is a selected filter
    if (selectedFilterIndex !== null) 
    {  
        filters[selectedFilterIndex].q = parseFloat(this.value);     // Update Q value of the filter
        document.getElementById('qValue').textContent = this.value;  // Display Q value in the interface
        drawAllCurves();                                             // Redraw all filter curves to reflect the change

        // Send the modified data to the server
        ws_sendFilterData(selectedFilterIndex);           // Send filter data to the server
        printFilterValues(filters[selectedFilterIndex]);  // Print the selected filter's values
    }
};

/**
 * Handles "mousedown" events on the canvas for dragging filters.
 *
 * @param {MouseEvent} event - The mouse event object.
 */
canvas.addEventListener('mousedown', function (e) {
    const rect = canvas.getBoundingClientRect();  // Get the canvas coordinates
    const mouseX = e.clientX - rect.left;         // Calculate mouse X position within the canvas
    const mouseY = e.clientY - rect.top;          // Calculate mouse Y position within the canvas

    // Iterate through all filters to check if the mouse clicked on a filter dot
    filters.forEach((filter, index) => {
        const dotX = freqToX(filter.frequency);  // Convert filter frequency to X coordinate
        const dotY = gainToY(filter.gain);       // Convert filter gain to Y coordinate

        // Calculate distance between mouse click and filter dot
        const dist = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));

        // If the distance is less than the dot's radius (8px)
        if (dist < 8)
        {  
            draggingFilterIndex = index;  // Set the index of the filter being dragged
            selectFilter(index);          // Update selected filter when clicked
            isDragging = true;            // Mark that a filter is being dragged
        }
    });
});

/**
 * Handles "mousemove" events on the canvas for dragging a filter.
 *
 * @param {MouseEvent} event - The mouse event object.
 */
canvas.addEventListener('mousemove', function (e) {

    // Check if a filter is being dragged
    if (isDragging && draggingFilterIndex !== null) 
    {  
        const rect = canvas.getBoundingClientRect();  // Get canvas coordinates
        const mouseX = e.clientX - rect.left;         // Calculate mouse X position within the canvas
        const mouseY = e.clientY - rect.top;          // Calculate mouse Y position within the canvas

        const filter = filters[draggingFilterIndex];  // Get the filter being dragged
        filter.frequency = xToFreq(mouseX);           // Convert mouse X position to frequency
        filter.gain = yToGain(mouseY);                // Convert mouse Y position to gain

        drawAllCurves();  // Redraw all filter curves
        updateSliders();  // Update sliders in the interface with new filter values

        // If the option to print while moving the filter is enabled
        if (printOnMove)  
        {
            printFilterValues(filter);  // Print the filter's values while dragging
            //ws_sendFilterData(filter);  // Send data to server
        }
    }
});

/**
 * Handles "mouseup" (mouse button released) events on the canvas to stop dragging filters.
 */
canvas.addEventListener('mouseup', function () {
    isDragging = false;  // Stop dragging when mouse button is released

    // If there is a filter being dragged and continuous printing is not enabled
    if (draggingFilterIndex !== null && !printOnMove) 
    {
        
        printFilterValues(filters[draggingFilterIndex]);  // Print the filter's values after releasing the mouse

        // Send the filter data to the server
        ws_sendFilterData(selectedFilterIndex);
    }

    draggingFilterIndex = null;  // Reset the dragged filter index
});

/**
 * Handles "mouseleave" events (when the mouse leaves the canvas) to stop dragging filters.
 */
canvas.onmouseleave = function () {
    isDragging = false;          // Stop dragging when mouse leaves canvas
    draggingFilterIndex = null;  // Reset the dragged filter index
};

/**
 * Listens for the WebSocket connection open event.
 */
socket.onopen = () => {
    console.log('WebSocket connection opened');  // Notify that WebSocket connection was successfully opened
}

/**
 * Listens for messages received from the WebSocket server.
 */
socket.onmessage = (event) => {
    console.log('Message from server:', event.data);  // Print the message received from the server

    // Process the filter data received in the message
    let filter = event.data;
    filters[filter.id] = filter;  // Update the corresponding filter in the filter array

    // Update the user interface and redraw the curves with the new filter data
    updateSliders();
    drawAllCurves();
};

/**
 * Handles WebSocket errors.
 */
socket.onerror = (error) => {
    console.error('WebSocket error:', error);  // Print the error if there is an issue with the WebSocket connection
};

/**
 * Handles WebSocket connection close event.
 */
socket.onclose = () => {
    console.log('WebSocket connection closed');  // Notify when the WebSocket connection is closed
};

/**
 * Sends specific filter data to the WebSocket server.
 *
 * @param {number} filterIndex - The index of the filter to be sent.
 */
function ws_sendFilterData(filterIndex)
{
    // Check that the filter index is valid
    if (filterIndex !== null && filterIndex >= 0 && filterIndex < filters.length)
    {
        const filter = filters[filterIndex];  // Get the corresponding filter
        const data = {
            id: filter.id,
            frequency: filter.frequency,
            gain: filter.gain,
            q: filter.q
        };
        
        // Check if the WebSocket connection is ready to send data
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));  // Send the data as a JSON message to the server
            console.log("Data sent:", data);  // Print the data sent
        } 
        else {
            console.error("WebSocket is not open.");  // If connection is not open, print an error
        }
    } 
    else
    {
        console.error("Invalid filter index.");  // If filter index is invalid, print an error
    }
}

/**
 * Draws the grid on the canvas to provide a visual reference.
 * Horizontal lines (for gains) and vertical lines (for frequencies) are drawn.
 */
function drawGrid() {
    ctx.strokeStyle = '#555';  // Set the color of the grid lines
    ctx.lineWidth = 1;         // Set the line thickness

    // Draw horizontal lines representing gains
    for (let gain = graph.gainMin; gain <= graph.gainMax; gain += 5)
    {
        const y = gainToY(gain);     // Convert gain to the corresponding Y position
        ctx.beginPath();
        ctx.moveTo(0, y);            // Start line at the left edge
        ctx.lineTo(graph.width, y);  // Draw line to the right edge
        ctx.stroke();                // Stroke the line

        ctx.fillStyle = 'white';               // Set text color
        ctx.fillText(`${gain} dB`, 5, y - 5);  // Draw the gain label near the line
    }

    // Draw vertical lines representing frequencies
    const logFreqMin = Math.log10(graph.freqMin);  // Convert minimum frequency to logarithmic scale
    const logFreqMax = Math.log10(graph.freqMax);  // Convert maximum frequency to logarithmic scale
    for (let logFreq = logFreqMin; logFreq <= logFreqMax; logFreq += 0.25) {
        const freq = Math.pow(10, logFreq);  // Convert frequency back to its real value
        const x = freqToX(freq);             // Convert frequency to the corresponding X position

        ctx.beginPath();
        ctx.moveTo(x, 0);             // Start line at the top edge
        ctx.lineTo(x, graph.height);  // Draw line to the bottom edge
        ctx.stroke();                 // Stroke the line

        ctx.fillStyle = 'white';  // Set text color
        ctx.fillText(`${Math.round(freq)} Hz`, x + 5, graph.height - 5);  // Draw the frequency label near the line
    }
}

/**
 * Prints the current values of a filter to the console.
 *
 * @param {Object} filter - The filter whose values will be printed.
 */
function printFilterValues(filter)
{
    const filterData = {
        id: filter.id,  // Filter ID
        frequency: filter.frequency,  // Filter frequency
        gain: parseFloat(filter.gain),  // Filter gain (converted to a float)
        q: filter.q  // Filter Q value
    };
    console.log(JSON.stringify(filterData));  // Print the filter data as a JSON string
}





// Initialize and draw the grid on the canvas without filters
drawGrid();
drawAllCurves();
