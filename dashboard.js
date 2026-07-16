document.addEventListener("DOMContentLoaded", () => {
    if(!localStorage.getItem('authToken')) { window.location.href = 'login-student.html'; return; }

    const profileVectorMock = { name: "Krupa More", level: 4, currentXp: 1850 };
    const trackingNodesMock = [
        { id: 101, designator: "B1", state: "completed" },
        { id: 102, designator: "B2", state: "completed" },
        { id: 103, designator: "⚡", state: "remediation" }, // AI path remediation diversion node
        { id: 104, designator: "B3", state: "active" },
        { id: 105, designator: "B4", state: "locked" }
    ];

    document.getElementById("student-name").innerText = profileVectorMock.name;
    document.getElementById("student-level").innerText = profileVectorMock.level;
    document.getElementById("xp-counter").innerText = profileVectorMock.currentXp;

    const dynamicLineTrack = document.getElementById("pathway-track");
    
    trackingNodesMock.forEach(node => {
        const structuralElement = document.createElement("div");
        structuralElement.classList.add("node", node.state);
        structuralElement.innerText = node.designator;
        
        if(node.state === "active" || node.state === "remediation") {
            structuralElement.addEventListener("click", () => {
                window.location.href = `game.html?nodeSelectionID=${node.id}`;
            });
        }
        dynamicLineTrack.appendChild(structuralElement);
    });
});