const BASE_URL = 'http://127.0.0.1:5000';
const token = localStorage.getItem('authToken');

document.addEventListener("DOMContentLoaded", async () => {
    if (!token) { 
        window.location.href = 'login-student.html'; 
        return; 
    }

    await loadProfile();
    await loadCourses();
    await loadNotifications();
});

// Fetch real profile from backend
async function loadProfile() {
    try {
        const res = await fetch(`${BASE_URL}/api/users/me`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.user) {
            document.getElementById("student-name").innerText = data.user.name;
            // Level and XP will come from leaderboard/progress later
            // For now show role
            document.getElementById("student-level").innerText = data.user.role;
        } else {
            // Token expired or invalid — redirect to login
            localStorage.removeItem('authToken');
            window.location.href = 'login-student.html';
        }
    } catch (err) {
        console.error('Failed to load profile:', err);
        document.getElementById("student-name").innerText = "Hero";
    }
}

// Fetch real courses and lessons from backend
async function loadCourses() {
    try {
        const res = await fetch(`${BASE_URL}/api/courses`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        const track = document.getElementById("pathway-track");
        track.innerHTML = '';

        if (!data.courses || data.courses.length === 0) {
            track.innerHTML = '<p>No courses available yet.</p>';
            return;
        }

        // Load lessons for the first course
        const firstCourse = data.courses[0];
        const lessonsRes = await fetch(`${BASE_URL}/api/courses/${firstCourse.id}/lessons`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const lessonsData = await lessonsRes.json();

        if (!lessonsData.lessons || lessonsData.lessons.length === 0) {
            track.innerHTML = '<p>No lessons available yet.</p>';
            return;
        }

        // Render lessons as nodes
        lessonsData.lessons.forEach((lesson, index) => {
            const node = document.createElement("div");
            node.classList.add("node");

            // First lesson is active, rest are locked by default
            // This will be replaced by real progress data later
            if (index === 0) {
                node.classList.add("active");
            } else {
                node.classList.add("locked");
            }

            node.innerText = `L${index + 1}`;
            node.title = lesson.title;

            if (index === 0) {
                node.addEventListener("click", () => {
                    window.location.href = `game.html?nodeSelectionID=${lesson.id}`;
                });
            }

            track.appendChild(node);
        });

        // Load XP from leaderboard
        const userId = localStorage.getItem('userId');
        const progressRes = await fetch(`${BASE_URL}/api/students/${userId}/progress`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (progressRes.ok) {
            const progressData = await progressRes.json();
            if (progressData.progress && progressData.progress.length > 0) {
                // Calculate average mastery across all lessons
                const avg = progressData.progress.reduce((sum, p) => 
                    sum + p.masteryScore, 0) / progressData.progress.length;
                document.getElementById("mastery-bar").style.width = avg + '%';
                document.getElementById("xp-counter").innerText = Math.round(avg);
            }
        }

    } catch (err) {
        console.error('Failed to load courses:', err);
        document.getElementById("pathway-track").innerHTML = '<p>Failed to load courses.</p>';
    }
}

// Fetch real notifications from backend
async function loadNotifications() {
    try {
        const res = await fetch(`${BASE_URL}/api/notifications`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        const notifList = document.getElementById("notifications-list");

        if (!data.notifications || data.notifications.length === 0) {
            notifList.innerHTML = '<p>No notifications yet.</p>';
            return;
        }

        notifList.innerHTML = data.notifications.map(n => `
            <div class="notification-item ${n.isRead ? 'read' : 'unread'}">
                <p>${n.message}</p>
                <small>${new Date(n.createdAt).toLocaleDateString()}</small>
            </div>
        `).join('');

    } catch (err) {
        console.error('Failed to load notifications:', err);
        document.getElementById("notifications-list").innerHTML = '<p>Failed to load notifications.</p>';
    }
}
