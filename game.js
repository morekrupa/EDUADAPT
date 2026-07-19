let temporalTracker = Date.now();
let structuralAccumulatedPoints = 0;

const engineGeneratedMockPayload = {
    question: "Which modeling methodology handles the dynamic path generation capabilities within the EduAdapt platform architecture?",
    options: ["Predefined Static Arrays", "Bayesian Mathematical Models & Learning Engine Vectors", "Uniform Multi-Reward Templates", "Pre-structured Checklist Documents"],
    validatedIndex: 1
};

function bootstrapQuizFrame(payload) {
    document.getElementById("question-text").innerText = payload.question;
    const boxContainer = document.getElementById("options-box");
    boxContainer.innerHTML = "";

    payload.options.forEach((choiceElement, selectionIdx) => {
        const elementButton = document.createElement("button");
        elementButton.classList.add("option-btn");
        elementButton.innerText = choiceElement;
        elementButton.addEventListener("click", () => evaluateChoiceSequence(selectionIdx, payload.validatedIndex, elementButton));
        boxContainer.appendChild(elementButton);
    });
}

function evaluateChoiceSequence(selectedIndexCode, structuralCorrectIndexCode, clickedElement) {
    const totalButtonsArr = document.querySelectorAll(".option-btn");
    totalButtonsArr.forEach(target => target.disabled = true);

    if (selectedIndexCode === structuralCorrectIndexCode) {
        clickedElement.classList.add("correct");
        structuralAccumulatedPoints += 100;
        document.getElementById("score-counter").innerText = `Session XP: ${structuralAccumulatedPoints}`;
    } else {
        clickedElement.classList.add("wrong");
        totalButtonsArr[structuralCorrectIndexCode].classList.add("correct");
    }
    document.getElementById("next-btn").style.display = "block";
}

document.getElementById("next-btn").addEventListener("click", () => {
    const runtimeDurationSec = Math.round((Date.now() - temporalTracker) / 1000);
    
   fetch('http://127.0.0.1:5000/api/analytics/track-activity', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    },
    body: JSON.stringify({
        score: structuralAccumulatedPoints,
        timeSpentSeconds: runtimeDurationSec,
        lessonId: new URLSearchParams(window.location.search).get('nodeSelectionID'),
        accuracy: Math.round((structuralAccumulatedPoints / 100) * 100),
        difficultyLevel: 1
    })
}).finally(() => {
    window.location.href = 'dashboard.html';
});
});

bootstrapQuizFrame(engineGeneratedMockPayload);

setInterval(() => {
    const elapsedRunTime = Math.round((Date.now() - temporalTracker) / 1000);
    document.getElementById("timer-display").innerText = `Telemetry Tracking: ${elapsedRunTime}s`;
}, 1000);