let currentDay = 'DAY-1';
let scheduleData = { 'DAY-1': [], 'DAY-2': [] };

window.onload = () => {
  const title = document.getElementById("main-title");
  const subtitle = document.getElementById("subtitle");

  title.contentEditable = "true";
  subtitle.contentEditable = "true";

  title.style.cursor = "text";
  subtitle.style.cursor = "text";
};

document.addEventListener("DOMContentLoaded", () => {
  const addDayBtn = document.querySelector('.add-day-btn');
  addDayBtn.addEventListener("click", () => {
    const newDayNumber = Object.keys(scheduleData).length + 1;
    const newDay = `DAY-${newDayNumber}`;
    scheduleData[newDay] = [];

    const newButton = document.createElement("button");
    newButton.className = "btn-group-button";
    newButton.innerText = newDay;
    newButton.id = `btn-${newDay.toLowerCase()}`;
    newButton.onclick = () => switchDay(newDay);

    addDayBtn.parentElement.insertBefore(newButton, addDayBtn);
  });

  document.getElementById("addButton").disabled = false;
  switchDay(currentDay);
});

async function switchDay(day) {
  currentDay = day;
  document.getElementById("schedule-title").innerText = currentDay;
  document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(`btn-${day.toLowerCase()}`);
  if (btn) btn.classList.add("active");

  try {
    const res = await fetch(`https://medicalconf.onrender.com/api/schedule/${currentDay}`);
    const data = await res.json();
    scheduleData[currentDay] = data.sort((a, b) => getRawTime(a.startTime).localeCompare(getRawTime(b.startTime)));
  } catch (err) {
    console.error("Error loading schedule:", err);
    scheduleData[currentDay] = [];
  }

  renderTable();
  clearInputs();
  autoFillFromLast();
}

document.getElementById("addButton").addEventListener("click", async () => {
  const timeInput = document.getElementById("time");
  const topic = document.getElementById("topic").value.trim();
  const faculty = document.getElementById("faculty").value.trim();
  const duration = parseInt(document.getElementById("duration").value.trim());
  const session = "Session 1";

  if (!timeInput.value.trim() || !topic || isNaN(duration)) {
    alert("Please fill all required fields: Start Time, Topic, and Duration.");
    return;
  }

  const startRaw = formatRawTime(timeInput.value.trim());
  const startTime = formatTimeToAMPM(startRaw);
  const endRaw = addMinutes(startRaw, duration);
  const endTime = formatTimeToAMPM(endRaw);

  const entry = { day: currentDay, startTime, endTime, topic, faculty, duration, session };

  try {
    const res = await fetch("https://medicalconf.onrender.com/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    });
    const savedEntry = await res.json();
    scheduleData[currentDay].push(savedEntry);
  } catch (err) {
    console.error("Add failed:", err);
  }

  renderTable();
  autoFillNextStartTime(endRaw);
  clearInputs(true);
});

function renderTable() {
  const tableBody = document.getElementById("scheduleTable");
  tableBody.innerHTML = "";

  scheduleData[currentDay].forEach((entry, index) => {
    const row = document.createElement("tr");
    row.classList.add("table-row-hover");

    const sessionCell = document.createElement("td");
    const sessionSelect = document.createElement("select");
    sessionSelect.style.padding = "3px";
    for (let i = 1; i <= 50; i++) {
      const opt = document.createElement("option");
      opt.value = `Session ${i}`;
      opt.text = `Session ${i}`;
      if (entry.session === `Session ${i}`) opt.selected = true;
      sessionSelect.appendChild(opt);
    }
    sessionSelect.addEventListener("change", async () => {
      entry.session = sessionSelect.value;
      try {
        await fetch(`https://medicalconf.onrender.com/api/schedule/${entry._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry)
        });
      } catch (err) {
        console.error("Session update failed:", err);
      }
    });
    sessionCell.appendChild(sessionSelect);

    const timeCell = document.createElement("td");
    timeCell.textContent = `${entry.startTime} - ${entry.endTime}`;

    const topicCell = createEditableCell(entry, "topic", index);
    const facultyCell = createEditableCell(entry, "faculty", index);
    const durationCell = createEditableCell(entry, "duration", index, true);

    const actionCell = document.createElement("td");
    actionCell.innerHTML = `
      <button class="action-btn delete" style="background-color:#8e24aa; color:white;" onclick="deleteEntry(${index})">🗑️ Delete</button>
      <button class="action-btn add-below" style="background-color:#6a1b9a; color:white; margin-left:5px;" onclick="showInlineAdd(${index})">➕ Add Below</button>
    `;

    row.append(sessionCell, timeCell, topicCell, facultyCell, durationCell, actionCell);
    tableBody.appendChild(row);
  });
}

function showInlineAdd(index) {
  const tableBody = document.getElementById("scheduleTable");
  const row = document.createElement("tr");
  row.classList.add("inline-form-row");

  row.innerHTML = `
    <td><select id="inline-session-${index}">${[...Array(50)].map((_, i) => `<option>Session ${i + 1}</option>`).join('')}</select></td>
    <td><input type="text" id="inline-time-${index}" placeholder="Start Time" style="width: 100px;"></td>
    <td><input type="text" id="inline-topic-${index}" placeholder="Topic"></td>
    <td><input type="text" id="inline-faculty-${index}" placeholder="Faculty (optional)"></td>
    <td><input type="number" id="inline-duration-${index}" placeholder="Duration" style="width: 60px;"></td>
    <td>
      <button onclick="saveInlineAdd(${index})" style="background-color:green; color:white;">✔️ Save</button>
      <button onclick="this.closest('tr').remove()" style="background-color:red; color:white;">❌ Cancel</button>
    </td>
  `;

  tableBody.insertBefore(row, tableBody.children[index + 1]);
}

async function saveInlineAdd(index) {
  const timeVal = document.getElementById(`inline-time-${index}`).value.trim();
  const topicVal = document.getElementById(`inline-topic-${index}`).value.trim();
  const facultyVal = document.getElementById(`inline-faculty-${index}`).value.trim();
  const durationVal = parseInt(document.getElementById(`inline-duration-${index}`).value.trim());
  const sessionVal = document.getElementById(`inline-session-${index}`).value;

  if (!timeVal || !topicVal || isNaN(durationVal)) {
    alert("Please fill required fields: Time, Topic, Duration.");
    return;
  }

  const startRaw = formatRawTime(timeVal);
  const startTime = formatTimeToAMPM(startRaw);
  const endRaw = addMinutes(startRaw, durationVal);
  const endTime = formatTimeToAMPM(endRaw);

  const entry = {
    day: currentDay,
    startTime,
    endTime,
    topic: topicVal,
    faculty: facultyVal,
    duration: durationVal,
    session: sessionVal
  };

  try {
    const res = await fetch("https://medicalconf.onrender.com/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    });
    const savedEntry = await res.json();

    scheduleData[currentDay].splice(index + 1, 0, savedEntry);
    updateFollowingTimes(index + 1);
    renderTable();
  } catch (err) {
    console.error("Add Below failed:", err);
  }
}

function createEditableCell(entry, key, index, isNumber = false) {
  const cell = document.createElement("td");
  const span = document.createElement("span");
  span.textContent = entry[key];
  span.style.marginRight = "8px";

  const editBtn = document.createElement("button");
  editBtn.innerHTML = "✏️";
  editBtn.classList.add("edit-btn");
  editBtn.style.border = "none";
  editBtn.style.background = "transparent";
  editBtn.style.cursor = "pointer";

  editBtn.onclick = () => {
    const newValue = prompt(`Edit ${key}:`, entry[key]);
    if (newValue !== null && newValue.trim() !== "") {
      const finalValue = isNumber ? parseInt(newValue.trim()) : newValue.trim();
      if (isNumber && isNaN(finalValue)) return;
      entry[key] = finalValue;

      if (key === "duration") {
        const startRaw = getRawTime(entry.startTime);
        const newEndRaw = addMinutes(startRaw, finalValue);
        entry.endTime = formatTimeToAMPM(newEndRaw);
      }

      fetch(`https://medicalconf.onrender.com/api/schedule/${entry._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry)
      }).then(() => {
        updateFollowingTimes(index);
        renderTable();
      }).catch(err => console.error("Update failed:", err));
    }
  };

  cell.append(span, editBtn);
  return cell;
}

async function deleteEntry(index) {
  const entry = scheduleData[currentDay][index];
  try {
    await fetch(`https://medicalconf.onrender.com/api/schedule/${entry._id}`, {
      method: "DELETE"
    });
    scheduleData[currentDay].splice(index, 1);
    updateFollowingTimes(index - 1);
    renderTable();
    autoFillFromLast();
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

function updateFollowingTimes(startIndex) {
  if (startIndex < 0) return;
  let prevEndRaw = getRawTime(scheduleData[currentDay][startIndex].endTime);
  for (let i = startIndex + 1; i < scheduleData[currentDay].length; i++) {
    const entry = scheduleData[currentDay][i];
    const newStartRaw = addMinutes(prevEndRaw, 1);
    const newEndRaw = addMinutes(newStartRaw, entry.duration);
    entry.startTime = formatTimeToAMPM(newStartRaw);
    entry.endTime = formatTimeToAMPM(newEndRaw);
    prevEndRaw = newEndRaw;
  }
}

function autoFillNextStartTime(endRaw) {
  const nextStart = addMinutes(endRaw, 1);
  document.getElementById("time").value = nextStart;
}

function autoFillFromLast() {
  const lastEntry = scheduleData[currentDay].at(-1);
  if (lastEntry) {
    const lastEndRaw = getRawTime(lastEntry.endTime);
    autoFillNextStartTime(lastEndRaw);
  } else {
    document.getElementById("time").value = '';
  }
}

function formatRawTime(input) {
  if (!input.includes(":")) {
    let hour = parseInt(input);
    if (isNaN(hour)) return "00:00";
    return `${hour.toString().padStart(2, '0')}:00`;
  }
  return input;
}

function formatTimeToAMPM(hhmm) {
  const [hourStr, minuteStr] = hhmm.split(":");
  let hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

function addMinutes(hhmm, minsToAdd) {
  const [hourStr, minStr] = hhmm.split(":");
  let hour = parseInt(hourStr);
  let minute = parseInt(minStr);
  let total = hour * 60 + minute + minsToAdd;
  let newHour = Math.floor(total / 60) % 24;
  let newMin = total % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
}

function getRawTime(amPmTime) {
  const [time, modifier] = amPmTime.split(" ");
  let [hour, minute] = time.split(":").map(Number);
  if (modifier === "PM" && hour !== 12) hour += 12;
  if (modifier === "AM" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

async function downloadPDF() {
  const pdfBody = document.getElementById("pdf-body");
  pdfBody.innerHTML = "";

  scheduleData[currentDay].forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.session || "Session 1"}</td>
      <td>${entry.startTime} - ${entry.endTime}</td>
      <td>${entry.topic}</td>
      <td>${entry.faculty}</td>
      <td>${entry.duration}</td>
    `;
    pdfBody.appendChild(row);
  });

  const pdfTable = document.getElementById("pdf-table");
  pdfTable.style.display = "table";

  const canvas = await html2canvas(pdfTable);
  const imgData = canvas.toDataURL("image/png");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, imgHeight);
  pdf.save("conference_schedule.pdf");
  pdfTable.style.display = "none";
}

function downloadWord() {
  let content = `
    <html><head><meta charset="utf-8"><title>Schedule</title></head><body>
    <h2>Medical Conference 2025 - ${currentDay}</h2>
    <table border="1" style="border-collapse:collapse; width:100%;">
      <tr>
        <th>Session</th>
        <th>Time</th>
        <th>Topic</th>
        <th>Faculty</th>
        <th>Duration (min)</th>
      </tr>`;

  scheduleData[currentDay].forEach(entry => {
    content += `
      <tr>
        <td>${entry.session || "Session 1"}</td>
        <td>${entry.startTime} - ${entry.endTime}</td>
        <td>${entry.topic}</td>
        <td>${entry.faculty}</td>
        <td>${entry.duration}</td>
      </tr>`;
  });

  content += `</table></body></html>`;

  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "conference_schedule.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
