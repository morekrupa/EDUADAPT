const subjectData = {
    "Math": ["Algebra Foundations", "Trigonometric Vectors", "Calculus Limits"],
    "Science": ["Physics Mechanics", "Organic Chemistry", "Cellular Biology"],
    "English": ["Grammar Syntax", "Literature Comprehension", "Vocabulary Mastery"]
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkRoleAccess('student_dashboard')) return;
    const user = JSON.parse(localStorage.getItem('eduadapt_current_user') || '{}');
    document.getElementById('class-indicator').innerText = `STANDARD: ${user.className || 'Class 10'}`;
    
    const subjContainer = document.getElementById('subject-list');
    Object.keys(subjectData).forEach(subj => {
        const btn = document.createElement('button');
        btn.className = 'btn-pixel btn-gold';
        btn.innerText = `📚 ${subj}`;
        btn.onclick = () => selectSubject(subj);
        subjContainer.appendChild(btn);
    });
});

function selectSubject(subj) {
    document.getElementById('step-subject').style.display = 'none';
    document.getElementById('step-topic').style.display = 'block';
    document.getElementById('selected-subject-title').innerText = `SUBJECT: ${subj}`;
    
    const topicContainer = document.getElementById('topic-list');
    topicContainer.innerHTML = '';
    subjectData[subj].forEach(top => {
        const btn = document.createElement('button');
        btn.className = 'btn-pixel btn-green';
        btn.innerText = `⚡ ${top}`;
        btn.onclick = () => selectTopic(top);
        topicContainer.appendChild(btn);
    });
}

function selectTopic(topic) {
    document.getElementById('step-topic').style.display = 'none';
    document.getElementById('step-game').style.display = 'block';
    document.getElementById('active-topic-title').innerText = `TOPIC: ${topic}`;
}

function playGameSession() {
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;
    startBtn.innerText = "PLAYING...";
    
    setTimeout(() => {
        const addedXp = Math.floor(Math.random() * 50) + 50;
        document.getElementById('current-score').innerText = addedXp;
        
        const user = JSON.parse(localStorage.getItem('eduadapt_current_user') || '{}');
        user.xp = (user.xp || 0) + addedXp;
        localStorage.setItem('eduadapt_current_user', JSON.stringify(user));
        
        alert(`SESSION COMPLETE! Earned ${addedXp} XP!`);
        startBtn.disabled = false;
        startBtn.innerText = "PLAY AGAIN";
    }, 1500);
}

function resetGameSteps() {
    document.getElementById('step-game').style.display = 'none';
    document.getElementById('step-topic').style.display = 'none';
    document.getElementById('step-subject').style.display = 'block';
}