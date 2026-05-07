// Time Zone Data
const TIMEZONES = {
    local: { name: 'Your Local Time', offset: 'auto' },
    'America/New_York': { name: 'New York (EST)', offset: 'America/New_York' },
    'America/Chicago': { name: 'Chicago (CST)', offset: 'America/Chicago' },
    'America/Denver': { name: 'Denver (MST)', offset: 'America/Denver' },
    'America/Los_Angeles': { name: 'Los Angeles (PST)', offset: 'America/Los_Angeles' },
    'Europe/London': { name: 'London (GMT)', offset: 'Europe/London' },
    'Europe/Paris': { name: 'Paris (CET)', offset: 'Europe/Paris' },
    'Europe/Moscow': { name: 'Moscow (MSK)', offset: 'Europe/Moscow' },
    'Asia/Dubai': { name: 'Dubai (GST)', offset: 'Asia/Dubai' },
    'Asia/Kolkata': { name: 'India (IST)', offset: 'Asia/Kolkata' },
    'Asia/Bangkok': { name: 'Bangkok (ICT)', offset: 'Asia/Bangkok' },
    'Asia/Hong_Kong': { name: 'Hong Kong (HKT)', offset: 'Asia/Hong_Kong' },
    'Asia/Tokyo': { name: 'Tokyo (JST)', offset: 'Asia/Tokyo' },
    'Asia/Shanghai': { name: 'Shanghai (CST)', offset: 'Asia/Shanghai' },
    'Australia/Sydney': { name: 'Sydney (AEDT)', offset: 'Australia/Sydney' },
    'Pacific/Auckland': { name: 'Auckland (NZDT)', offset: 'Pacific/Auckland' }
};

// Global state
let state = {
    activeTimezones: ['local'],
    use24HourFormat: false,
    updateSpeed: 500,
    isDarkTheme: true
};

let updateInterval = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initializeEventListeners();
    updateClock();
    startClockUpdates();
    updateStats();
});

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('clockSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        state = { ...state, ...settings };
        
        // Apply saved settings to UI
        document.getElementById('formatToggle').checked = state.use24HourFormat;
        document.getElementById('updateSpeed').value = state.updateSpeed;
        document.getElementById('themeToggle').checked = !state.isDarkTheme;
        
        if (!state.isDarkTheme) {
            document.body.classList.add('light-theme');
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('clockSettings', JSON.stringify(state));
}

// Initialize event listeners
function initializeEventListeners() {
    // Timezone buttons
    document.querySelectorAll('.tz-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleTimezoneClick(e));
    });

    // Settings toggles
    document.getElementById('formatToggle').addEventListener('change', (e) => {
        state.use24HourFormat = e.target.checked;
        saveSettings();
        updateClock();
    });

    document.getElementById('updateSpeed').addEventListener('change', (e) => {
        state.updateSpeed = parseInt(e.target.value);
        saveSettings();
        clearInterval(updateInterval);
        startClockUpdates();
    });

    document.getElementById('themeToggle').addEventListener('change', (e) => {
        state.isDarkTheme = !e.target.checked;
        saveSettings();
        document.body.classList.toggle('light-theme');
    });
}

// Handle timezone button clicks
function handleTimezoneClick(event) {
    const timezone = event.target.getAttribute('data-timezone');
    
    if (state.activeTimezones.includes(timezone)) {
        // Remove timezone
        state.activeTimezones = state.activeTimezones.filter(tz => tz !== timezone);
        event.target.classList.remove('active');
    } else {
        // Add timezone
        state.activeTimezones.push(timezone);
        event.target.classList.add('active');
    }
    
    localStorage.setItem('activeTimezones', JSON.stringify(state.activeTimezones));
    updateClockGrid();
    updateStats();
    showToast(`${event.target.textContent} ${state.activeTimezones.includes(timezone) ? 'added' : 'removed'}`);
}

// Start automatic clock updates
function startClockUpdates() {
    updateInterval = setInterval(() => {
        updateClock();
        updateStats();
    }, state.updateSpeed);
}

// Update main clock and all displayed times
function updateClock() {
    const now = new Date();
    
    // Update main clock (local time)
    updateMainClock(now);
    
    // Update grid
    updateClockGrid();
}

// Update the main display clock
function updateMainClock(date) {
    const timeValue = document.getElementById('mainTime');
    const timePeriod = document.getElementById('mainPeriod');
    const dateDisplay = document.getElementById('mainDate');
    
    const { time, period } = formatTime(date, state.use24HourFormat);
    
    timeValue.textContent = time;
    timePeriod.textContent = period;
    dateDisplay.textContent = formatDate(date);
    
    // Update UTC offset
    const offset = getUTCOffset(date);
    document.getElementById('utcOffset').textContent = offset;
}

// Update the grid of timezone clocks
function updateClockGrid() {
    const grid = document.getElementById('clocksGrid');
    
    // Create or update cards for active timezones
    state.activeTimezones.forEach((timezone, index) => {
        let card = document.getElementById(`clock-${timezone}`);
        
        if (!card) {
            card = createClockCard(timezone, index);
            grid.appendChild(card);
        }
        
        updateClockCard(card, timezone);
    });
    
    // Remove cards for inactive timezones
    document.querySelectorAll('.clock-card').forEach(card => {
        const timezone = card.getAttribute('data-timezone');
        if (!state.activeTimezones.includes(timezone)) {
            card.remove();
        }
    });
}

// Create a new clock card element
function createClockCard(timezone, index) {
    const card = document.createElement('div');
    card.className = 'clock-card';
    card.id = `clock-${timezone}`;
    card.setAttribute('data-timezone', timezone);
    
    const tzName = TIMEZONES[timezone]?.name || timezone;
    
    card.innerHTML = `
        <button class="remove-clock-btn" onclick="removeTimezone('${timezone}')">×</button>
        <div class="card-timezone">${tzName}</div>
        <div class="card-time" id="time-${timezone}">00:00:00</div>
        <div class="card-date" id="date-${timezone}">Monday, May 7, 2026</div>
    `;
    
    return card;
}

// Update a clock card with current time
function updateClockCard(card, timezone) {
    let date;
    
    if (timezone === 'local') {
        date = new Date();
    } else {
        date = getDateInTimezone(timezone);
    }
    
    const { time } = formatTime(date, state.use24HourFormat);
    const formattedDate = formatDate(date);
    
    const timeEl = document.getElementById(`time-${timezone}`);
    const dateEl = document.getElementById(`date-${timezone}`);
    
    if (timeEl) timeEl.textContent = time;
    if (dateEl) dateEl.textContent = formattedDate;
}

// Get date/time in a specific timezone
function getDateInTimezone(timezone) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const values = {};
    parts.forEach(part => {
        values[part.type] = part.value;
    });
    
    const date = new Date(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
    return date;
}

// Format time for display
function formatTime(date, use24Hour) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    
    let period = 'AM';
    
    if (!use24Hour) {
        period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
    }
    
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    return { time, period };
}

// Format date for display
function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dateNum = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${dateNum}, ${year}`;
}

// Get UTC offset string
function getUTCOffset(date) {
    const offset = -date.getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Get week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Update statistics
function updateStats() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    document.getElementById('activeClocks').textContent = state.activeTimezones.length;
    document.getElementById('dayOfWeek').textContent = days[now.getDay()];
    document.getElementById('weekNumber').textContent = `Week ${getWeekNumber(now)}`;
    document.getElementById('utcOffset').textContent = getUTCOffset(now);
}

// Remove timezone from grid
function removeTimezone(timezone) {
    const btn = document.querySelector(`[data-timezone="${timezone}"]`);
    if (btn) {
        btn.click();
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize active timezone buttons on load
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('activeTimezones');
    if (saved) {
        state.activeTimezones = JSON.parse(saved);
    }
    
    // Set active class on buttons
    document.querySelectorAll('.tz-btn').forEach(btn => {
        const timezone = btn.getAttribute('data-timezone');
        if (state.activeTimezones.includes(timezone)) {
            btn.classList.add('active');
        }
    });
    
    updateClockGrid();
});

// Handle page visibility changes (pause/resume updates)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(updateInterval);
    } else {
        updateClock();
        startClockUpdates();
    }
});