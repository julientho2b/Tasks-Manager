// 1. Éléments HTML

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const allTasks = document.querySelector(".all-tasks");
const todoTasks = document.querySelector(".todo-tasks");
const doneTasks = document.querySelector(".done-tasks");
const date = document.querySelector("#date-input");
const dateAujourdhui = new Date().toISOString().slice(0, 10);
const compteurTodoTasks = todoTasks.querySelector("span");
const compteurAllTasks = allTasks.querySelector("span");
const compteurDoneTasks = doneTasks.querySelector("span");
const modalModif = document.querySelector(".modal-modif");
const modalInput = document.querySelector(".modal-input");
const confirmButton = document.querySelector(".confirm");
const cancelButton = document.querySelector(".cancel");
const modalMessage = document.querySelector(".modal-message-modif");
const modalMessageAlert = document.querySelector(".modal-message-alert");
const modalAlert = document.querySelector(".modal-alert");
const closeAlert = document.querySelector(".modal-alert .cancel");
const secretLetter = document.querySelectorAll(".secret-letter");

let secretStep = 0;
let privateMode = false;
let currentFilter = "all";

let taskToEdit = null;
let spanToEdit = null;

// 2. Données
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Donne un identifiant aux anciennes tâches qui n'en ont pas encore
tasks.forEach((task) => {
  if (!task.id) task.id = createId();
});
localStorage.setItem("tasks", JSON.stringify(tasks));

function formatDate(date) {
  const [annee, mois, jour] = date.split("-");

  return `${jour}/${mois}/${annee.slice(2)}`;
}

// Export vers le calendrier du téléphone (fichier .ics)

// Dans un .ics, certains caractères doivent être "échappés"
function escapeIcs(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Crée un identifiant unique pour une tâche
function createId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

// Construit les lignes d'UN événement du calendrier
function buildEvent(task) {
  // "2026-10-12" devient "20261012"
  const debut = task.dateLimite.replaceAll("-", "");

  // Pour un événement "toute la journée", la fin est le lendemain
  const lendemain = new Date(task.dateLimite);
  lendemain.setUTCDate(lendemain.getUTCDate() + 1);
  const fin = lendemain.toISOString().slice(0, 10).replaceAll("-", "");

  // Moment de création du fichier, ex. 20261008T093000Z
  const maintenant = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);

  return [
    "BEGIN:VEVENT",
    `UID:${task.id}@chachou-tasks`, // même tâche = même identifiant
    `DTSTAMP:${maintenant}Z`,
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`, // augmente à chaque export
    `DTSTART;VALUE=DATE:${debut}`,
    `DTEND;VALUE=DATE:${fin}`,
    `SUMMARY:${escapeIcs(task.text)}`,
    // Rappel la veille à 18h
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel",
    "TRIGGER:-PT6H",
    "END:VALARM",
    // Rappel le jour J à 9h
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel",
    "TRIGGER:PT9H",
    "END:VALARM",
    "END:VEVENT",
  ];
}

// Construit le fichier complet pour une liste de tâches
function buildIcs(liste) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chachou Tasks//FR",
    ...liste.flatMap(buildEvent),
    "END:VCALENDAR",
  ].join("\r\n");
}

// Télécharge le fichier : le téléphone propose de l'ouvrir dans le calendrier
function exportToCalendar(liste) {
  const fichier = new Blob([buildIcs(liste)], {
    type: "text/calendar;charset=utf-8",
  });
  const lien = document.createElement("a");

  lien.href = URL.createObjectURL(fichier);
  lien.download = liste.length === 1 ? "tache.ics" : "taches.ics";
  lien.click();

  URL.revokeObjectURL(lien.href);
}

// 3. Filtre actif au démarrage

allTasks.classList.add("active");
todoTasks.classList.remove("active");
doneTasks.classList.remove("active");

date.value = dateAujourdhui;

// 4. Afficher une tâche

function displayTask(task, index) {
  const span = document.createElement("span");

  span.classList.add("taskText");

  const li = document.createElement("li");
  const date = document.createElement("span");
  const dateEcheance = document.createElement("span");
  const dateLine = document.createElement("div");
  const taskInfo = document.createElement("div");
  const dateLineContainer = document.createElement("div");
  const reminderContainer = document.createElement("div");
  reminderContainer.classList.add("reminderContainer");
  const reminder = new Date(task.dateCreation);
  const reminderDate = new Date(dateAujourdhui);
  const echeance = new Date(task.dateLimite);

  const echeanceRappel = echeance.getTime() - reminderDate.getTime();
  const echeanceDifference = echeanceRappel / (1000 * 60 * 60 * 24);

  const difference = reminderDate.getTime() - reminder.getTime();
  const differenceEnJours = difference / (1000 * 60 * 60 * 24);

  const ringReminder = document.createElement("span");
  const ringReminderTwo = document.createElement("span");

  // Task private true or false //

  if (task.private && !privateMode) {
    return;
  }

  // Rappel

  ringReminderTwo.classList.add("ringReminderTwo");
  ringReminderTwo.textContent = "⏰";
  ringReminderTwo.setAttribute(
    "title",
    `Echeance dans ${echeanceDifference} jours`,
  );

  ringReminderTwo.addEventListener("click", (event) => {
    event.stopPropagation();

    modalAlert.style.display = "block";
    modalMessageAlert.textContent = ringReminderTwo.getAttribute("title");
  });

  ringReminder.classList.add("ringReminder");
  ringReminder.textContent = "🔔";

  ringReminder.addEventListener("click", (event) => {
    event.stopPropagation();

    modalAlert.style.display = "block";
    modalMessageAlert.textContent = ringReminder.getAttribute("title");
  });

  // Tache privées //

  if (task.private) {
    li.classList.add("private-task");
  }

  // Informations de la tâche

  li.appendChild(taskInfo);

  taskInfo.appendChild(span);

  dateLineContainer.appendChild(date);
  dateLineContainer.appendChild(dateEcheance);
  dateLine.appendChild(dateLineContainer);
  dateLineContainer.classList.add("dateLineContainer");

  // 🔔 Échéance dépassée depuis 3 jours ou plus
  if (echeanceDifference <= -3 && task.completed === false) {
    ringReminder.setAttribute(
      "title",
      `Échéance dépassée de ${Math.abs(echeanceDifference)} jours`,
    );

    reminderContainer.appendChild(ringReminder);

    // ⏰ Échéance dans 0 à 3 jours
  } else if (
    echeanceDifference <= 3 &&
    echeanceDifference >= 0 &&
    task.completed === false
  ) {
    reminderContainer.appendChild(ringReminderTwo);

    // 🔔 Tâche créée depuis 3 jours ou plus
  } else if (differenceEnJours >= 3 && task.completed === false) {
    ringReminder.setAttribute(
      "title",
      `Cette tâche attend depuis ${Math.floor(differenceEnJours)} jours`,
    );

    reminderContainer.appendChild(ringReminder);
  }

  taskInfo.classList.add("taskInfo");

  span.textContent = task.text;

  date.textContent = "📅 Créée : " + formatDate(task.dateCreation);
  dateEcheance.textContent = "🎯 Échéance : " + formatDate(task.dateLimite);

  taskInfo.appendChild(dateLine);
  taskInfo.appendChild(reminderContainer);

  // Groupe des boutons

  const buttonGroup = document.createElement("div");

  buttonGroup.classList.add("buttonGroup");

  // Bouton statut

  const status = document.createElement("button");

  status.classList.add("status");

  status.addEventListener("click", (event) => {
    event.stopPropagation();

    task.completed = !task.completed;

    if (task.completed) {
      li.classList.add("completed");

      status.textContent = "✓";

      status.classList.add("done");
      reminderContainer.innerHTML = "";
    } else {
      status.textContent = "";

      status.classList.remove("done");

      if (echeanceDifference <= -3) {
        reminderContainer.appendChild(ringReminder);
      }

      if (echeanceDifference <= 3 && echeanceDifference >= 0) {
        reminderContainer.appendChild(ringReminderTwo);
      }
    }

    localStorage.setItem("tasks", JSON.stringify(tasks));

    if (currentFilter !== "all") {
      li.remove();
    }

    updateCounters();
  });

  // État initial du bouton

  if (task.completed) {
    li.classList.add("completed");

    status.textContent = "✓";

    status.classList.add("done");
  } else {
    status.textContent = "";

    status.classList.remove("done");
  }

  buttonGroup.appendChild(status);

  // Bouton modifier

  const modifButton = document.createElement("button");

  modifButton.textContent = "✏️";

  // Bouton supprimer

  const deleteButton = document.createElement("button");

  deleteButton.textContent = "🗑️";

  deleteButton.addEventListener("click", () => {
    const indexNumber = tasks.indexOf(task);

    li.remove();

    tasks.splice(indexNumber, 1);

    updateCounters();

    localStorage.setItem("tasks", JSON.stringify(tasks));
  });

  buttonGroup.appendChild(deleteButton);

  buttonGroup.appendChild(modifButton);

  // Bouton calendrier (seulement si la tâche a une date limite)

  if (task.dateLimite) {
    const calendarButton = document.createElement("button");

    calendarButton.textContent = "📆";
    calendarButton.setAttribute("title", "Ajouter au calendrier");

    calendarButton.addEventListener("click", (event) => {
      event.stopPropagation();
      exportToCalendar([task]);
    });

    buttonGroup.appendChild(calendarButton);
  }

  li.appendChild(buttonGroup);

  // Modifier une tâche

  modifButton.addEventListener("click", (event) => {
    event.stopPropagation();

    taskToEdit = task;
    spanToEdit = span;

    modalModif.style.display = "block";
    modalInput.value = "";
  });

  taskList.appendChild(li);
}

// 5. Afficher les tâches déjà enregistrées

tasks.forEach((task, index) => {
  displayTask(task, index);
});

// 6. Ajouter une nouvelle tâche

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const task = input.value;

  if (task === "") {
    return;
  }

  const nouvelleTache = {
    text: task,
    completed: false,
    dateCreation: dateAujourdhui,
    dateLimite: date.value,
    private: privateMode,
    id: createId(),
  };

  tasks.push(nouvelleTache);

  updateCounters();

  localStorage.setItem("tasks", JSON.stringify(tasks));

  if (currentFilter !== "done") {
    displayTask(nouvelleTache, tasks.length - 1);
  }

  input.value = "";
});

// 7. Afficher toutes les tâches

allTasks.addEventListener("click", () => {
  currentFilter = "all";

  allTasks.classList.add("active");

  todoTasks.classList.remove("active");

  doneTasks.classList.remove("active");

  taskList.textContent = "";

  tasks.forEach((task, index) => {
    displayTask(task, index);
  });
});

// 8. Afficher les tâches à faire

todoTasks.addEventListener("click", () => {
  currentFilter = "todo";

  todoTasks.classList.add("active");

  allTasks.classList.remove("active");

  doneTasks.classList.remove("active");

  const tachesAfaire = tasks.filter((task) => task.completed === false);

  taskList.textContent = "";

  tachesAfaire.forEach((task, index) => {
    displayTask(task, index);
  });
});

// 9. Afficher les tâches terminées

doneTasks.addEventListener("click", () => {
  currentFilter = "done";

  doneTasks.classList.add("active");

  allTasks.classList.remove("active");

  todoTasks.classList.remove("active");

  const tachesFaite = tasks.filter((task) => task.completed === true);

  taskList.textContent = "";

  tachesFaite.forEach((task, index) => {
    displayTask(task, index);
  });
});

// 10. Mettre à jour les compteurs

function updateCounters() {
  const visibleTasks = tasks.filter((task) => {
    return task.private === false || privateMode === true;
  });

  compteurDoneTasks.textContent = visibleTasks.filter(
    (task) => task.completed === true,
  ).length;

  compteurTodoTasks.textContent = visibleTasks.filter(
    (task) => task.completed === false,
  ).length;

  compteurAllTasks.textContent = visibleTasks.length;
}

confirmButton.addEventListener("click", (event) => {
  event.stopPropagation();

  const newText = modalInput.value;

  if (newText.trim() === "") {
    modalMessage.textContent = "Arretes de changer d'avis TA MERE !!!";
    return;
  }

  taskToEdit.text = newText;
  spanToEdit.textContent = newText;

  localStorage.setItem("tasks", JSON.stringify(tasks));

  modalModif.style.display = "none";
});

cancelButton.addEventListener("click", () => {
  modalModif.style.display = "none";
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    confirmButton.click();
  }

  if (event.key === "Escape") {
    cancelButton.click();
    closeAlert.click();
  }
});

closeAlert.addEventListener("click", () => {
  modalAlert.style.display = "none";
});

secretLetter.forEach((letter, index) => {
  letter.addEventListener("click", () => {
    if (index === 0) {
      secretStep++;
    }
    if (index === 1 && secretStep === 1) {
      privateMode = !privateMode;

      document.querySelector("main").classList.toggle("private-mode");

      // On réaffiche selon le filtre actif
      if (currentFilter === "todo") {
        todoTasks.click();
      } else if (currentFilter === "done") {
        doneTasks.click();
      } else {
        allTasks.click();
      }

      secretStep = 0;

      updateCounters();
    }
  });
});

// Bouton "Tout exporter"

document.querySelector(".export-all").addEventListener("click", () => {
  const aExporter = tasks.filter((task) => {
    return (
      task.completed === false &&
      task.dateLimite &&
      (!task.private || privateMode)
    );
  });

  if (aExporter.length === 0) {
    modalAlert.style.display = "block";
    modalMessageAlert.textContent = "Aucune tâche à exporter.";
    return;
  }

  exportToCalendar(aExporter);
});

todoTasks.click();

// Mise à jour initiale

updateCounters();
