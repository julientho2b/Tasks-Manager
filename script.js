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

function formatDate(date) {
  const [annee, mois, jour] = date.split("-");

  return `${jour}/${mois}/${annee.slice(2)}`;
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
  };

  tasks.push(nouvelleTache);

  updateCounters();

  localStorage.setItem("tasks", JSON.stringify(tasks));

  displayTask(nouvelleTache, tasks.length - 1);

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

      taskList.innerHTML = "";

      tasks.forEach((task, index) => {
        displayTask(task, index);
      });

      secretStep = 0;

      updateCounters();
    }
  });
});
// Mise à jour initiale

updateCounters();
