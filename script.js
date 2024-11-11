// Initialize chart
let motionChart = new Chart(document.getElementById('motionChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Jerk',
                data: [],
                borderColor: 'red',
                fill: false,
                yAxisID: 'y-jerk'
            },
            {
                label: 'Acceleration',
                data: [],
                borderColor: 'blue',
                fill: false,
                yAxisID: 'y-acceleration'
            },
            {
                label: 'Speed',
                data: [],
                borderColor: 'green',
                fill: false,
                yAxisID: 'y-speed'
            },
            {
                label: 'Position',
                data: [],
                borderColor: 'purple',
                fill: false,
                yAxisID: 'y-position'
            }
        ]
    },
    options: {
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time (s)'
                }
            },
            'y-jerk': {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Jerk'
                }
            },
            'y-acceleration': {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: 'Acceleration'
                }
            },
            'y-speed': {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Speed'
                },
                grid: {
                    drawOnChartArea: false // avoid overlapping grid lines
                }
            },
            'y-position': {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: 'Position'
                },
                grid: {
                    drawOnChartArea: false
                }
            }
        }
    }
});

// Funktion zum Generieren des Profil-Kurven
function generateCurveProfile(curveType, starttime, duration, amplitude, rampUpPercent, rampDownPercent, stepSize) {
    let values = [];
    let steps = Math.round(duration / stepSize); // Berechne die Anzahl der Schritte basierend auf der Schrittgröße

    // Berechne die Anzahl der Schritte bis zum Startzeitpunkt (alles mit 0 auffüllen)
    let startSteps = Math.round(starttime / stepSize);
    
    // Auffüllen bis zum Startzeitpunkt mit 0
    for (let i = 0; i < startSteps; i++) {
        values.push(0);
    }

    // Jetzt die Kurve basierend auf dem Startzeitpunkt und der Dauer berechnen
    let totalSteps = startSteps + steps;  // Gesamte Anzahl an Schritten inklusive der Auffüllung

    if (curveType === 'step') {
        values = values.concat(Array(steps).fill(amplitude));
    } else if (curveType === 'trapez') {
        let rampUpSteps = Math.round((rampUpPercent / 100) * steps);
        let rampDownSteps = Math.round((rampDownPercent / 100) * steps);
        let constantSteps = steps - rampUpSteps - rampDownSteps;

        // Ramp-up
        for (let i = 0; i < rampUpSteps; i++) {
            values.push((i / rampUpSteps) * amplitude);
        }
        // Konstanter Wert
        for (let i = 0; i < constantSteps; i++) {
            values.push(amplitude);
        }
        // Ramp-down
        for (let i = 1; i <= rampDownSteps; i++) {
            values.push(((rampDownSteps - i) / rampDownSteps) * amplitude);
        }
    } else if (curveType === 'halfsinus') {
        for (let i = 0; i < steps; i++) {
            values.push(amplitude * Math.sin((Math.PI * i) / steps));
        }
    }

    return values;
}

// Simple integration
function integrate(values, stepSize) {
    let integrated = [0];
    for (let i = 1; i < values.length; i++) {
        let inte = (values[i] + values[i - 1]) / 2 * stepSize;
        integrated.push(integrated[i-1] + inte);
    }
    return integrated;
}

// Simple differentiation
function differentiate(values, stepSize) {
    let differentiated = [0];
    for (let i = 1; i < values.length; i++) {
        let diff = values[i] - values[i - 1];
        differentiated.push(diff/stepSize);
    }
    return differentiated;
}


// Event listener for the calculate button
document.getElementById('calculateBtn').addEventListener('click', () => {
    let stepSize = parseFloat(document.getElementById('stepSize').value);
    lastStepSize = stepSize;

    // Initialize arrays for accumulated values of each motion type
    let combinedTime = [];
    let combinedJerk = [];
    let combinedAcceleration = [];
    let combinedSpeed = [];
    let combinedPosition = [];

    // Track the maximum time steps across all curves to ensure all combined arrays are long enough
    let maxSteps = 0;

    // Get all curve definitions and process each one to calculate jerk
    const curves = document.querySelectorAll('.curveDefinition');
    curves.forEach(curve => {
        let motionType = curve.querySelector('.motionType').value;
        let curveType = curve.querySelector('.curveType').value;
        let startTime = parseFloat(curve.querySelector('.startTime').value);
        let duration = parseFloat(curve.querySelector('.duration').value);
        let amplitude = parseFloat(curve.querySelector('.amplitude').value);
        let rampUpPercent = parseFloat(curve.querySelector('.rampUpPercent').value || 0);
        let rampDownPercent = parseFloat(curve.querySelector('.rampDownPercent').value || 0);

        // Generate initial values based on the curve profile
        let curveValues = generateCurveProfile(curveType, startTime, duration, amplitude, rampUpPercent, rampDownPercent, stepSize);
        let jerk;

        // Adjust values based on the curve type
        if (motionType === "jerk") {
            jerk = curveValues;  // No change needed
        } else if (motionType === "acceleration") {
            jerk = differentiate(curveValues, stepSize);  // Differentiate once
        } else if (motionType === "speed") {
            jerk = differentiate(differentiate(curveValues, stepSize), stepSize);  // Differentiate twice
        } else if (motionType === "position") {
            jerk = differentiate(differentiate(differentiate(curveValues, stepSize), stepSize), stepSize);  // Differentiate three times
        }

        // Calculate the total steps needed for this curve, including its start time offset
        if (curveValues.length > maxSteps) {
            maxSteps = curveValues.length;  // Update the maximum number of steps
        }

        // Extend the combined arrays to match the required max length if necessary
        while (combinedTime.length < maxSteps) {
            combinedTime.push(combinedTime.length * stepSize);
            combinedJerk.push(0);
            combinedAcceleration.push(0);
            combinedSpeed.push(0);
            combinedPosition.push(0);
        }

        // Add jerk values to the combinedJerk array, accounting for the start time
        for (let i = 0; i < jerk.length; i++) {
            combinedJerk[i] += jerk[i] || 0;
        }
    });

    // Use the integrate function to calculate acceleration, speed, and position based on jerk
    combinedAcceleration = integrate(combinedJerk, stepSize);
    combinedSpeed = integrate(combinedAcceleration, stepSize);
    combinedPosition = integrate(combinedSpeed, stepSize);

    // Update the chart with the accumulated values
    updateChart(combinedTime, combinedJerk, combinedAcceleration, combinedSpeed, combinedPosition, stepSize);
});


// Funktion zum Runden auf eine bestimmte Anzahl von Dezimalstellen
function roundToDecimals(value, decimals) {
    return Number(value.toFixed(decimals));
}

// Update chart data und Zeitachse auf die gleiche Anzahl von Dezimalstellen runden
function updateChart(time, jerk, acceleration, speed, position, stepSize) {
    // Berechne die Anzahl der Dezimalstellen von stepSize
    const decimals = (stepSize.toString().split('.')[1] || '').length;

    // Runde die Zeitachse auf die gleiche Anzahl an Dezimalstellen
    const roundedTime = time.map(t => roundToDecimals(t, decimals));

    // Setze die gerundeten Zeitwerte auf der X-Achse
    motionChart.data.labels = roundedTime;  

    // Setze die anderen Daten
    motionChart.data.datasets[0].data = jerk;
    motionChart.data.datasets[1].data = acceleration;
    motionChart.data.datasets[2].data = speed;
    motionChart.data.datasets[3].data = position;

    // Aktualisiere das Diagramm
    motionChart.update();
}

function downloadCSVFromChart(chart, stepSize) {
    // Sicherstellen, dass der lastStepSize gesetzt wurde
    if (lastStepSize === null) {
        alert("Bitte führen Sie eine Berechnung durch, bevor Sie exportieren.");
        return;
    }

    // CSV-Header
    let csvContent = "Time;Jerk;Acceleration;Velocity;Position\n";
    
    // Extrahieren der Werte aus den Datasets
    const jerkData = chart.data.datasets[0].data;  // Jerk-Daten (Dataset 0)
    const accelerationData = chart.data.datasets[1].data;  // Acceleration-Daten (Dataset 1)
    const velocityData = chart.data.datasets[2].data;  // Velocity-Daten (Dataset 2)
    const positionData = chart.data.datasets[3].data;  // Position-Daten (Dataset 3)

    // Berechnung der Zeitwerte (Step-Size multipliziert mit dem Index)
    for (let i = 0; i < jerkData.length; i++) {
        const time = i * stepSize;  // Zeit basierend auf dem Step-Size
        const jerk = (jerkData[i] || 0).toFixed(9);
        const acceleration = (accelerationData[i] || 0).toFixed(9);
        const velocity = (velocityData[i] || 0).toFixed(9);
        const position = (positionData[i] || 0).toFixed(9);

        // CSV-Inhalt (jede Zeile repräsentiert eine Zeit und die zugehörigen Werte)
        csvContent += `${time};${jerk};${acceleration};${velocity};${position}\n`;
    }

    // Erstelle einen Blob mit den CSV-Daten
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    // Erstelle einen temporären Link für den Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Name der Datei mit aktuellem Datum und Uhrzeit
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.download = `chart_data_${date}.csv`;
    
    // Führe den Download aus und entferne den temporären Link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Speicherressourcen freigeben
    URL.revokeObjectURL(url);
}

let lastStepSize = null;  // Globale Variable für den letzten StepSize

// Event-Listener für den Export-Button
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    downloadCSVFromChart(motionChart, lastStepSize);
});