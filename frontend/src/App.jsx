
import { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);

  const [reminderDate, setReminderDate] = useState("");
  const [reminderHour, setReminderHour] = useState("08");
  const [reminderMinute, setReminderMinute] = useState("00");
  const [reminderPeriod, setReminderPeriod] = useState("AM");

  const notifiedTasks = useRef(new Set());

  const API = "https://smart-todo-inyc.onrender.com/api/tasks/";

  // Fetch tasks
  useEffect(() => {
    fetch(API)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch tasks");
        return response.json();
      })
      .then((data) => setTasks(data))
      .catch((error) => console.error("Fetch error:", error));
  }, []);

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker error:", error);
        });
    }
  }, []);

  // Dashboard statistics
  const completedTasks = tasks.filter(
    (task) => task.is_completed
  ).length;

  const pendingTasks = tasks.length - completedTasks;

  // Enable notifications
  async function enableNotifications() {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      alert("Service Worker is not supported.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Please allow notifications in browser settings.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification("Smart To-Do 🔔", {
        body: "Notifications enabled successfully!",
        tag: "notification-test",
      });

      alert("Notifications enabled successfully!");
    } catch (error) {
      console.error("Notification error:", error);
      alert("Could not enable notifications: " + error.message);
    }
  }

  // Add task with reminder
  async function addTask() {
    if (!title.trim()) {
      alert("Please enter a task!");
      return;
    }

    let reminderISO = null;

    if (reminderDate) {
      let hour = Number(reminderHour);

      if (reminderPeriod === "PM" && hour !== 12) {
        hour += 12;
      }

      if (reminderPeriod === "AM" && hour === 12) {
        hour = 0;
      }

      const selectedDate = new Date(
        `${reminderDate}T${String(hour).padStart(2, "0")}:${reminderMinute}:00`
      );

      if (selectedDate.getTime() <= Date.now()) {
        alert("Please select a future reminder date and time.");
        return;
      }

      reminderISO = selectedDate.toISOString();
    }

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: "",
          reminder_at: reminderISO,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      const newTask = await response.json();

      setTasks((previous) => [...previous, newTask]);

      setTitle("");
      setReminderDate("");
      setReminderHour("08");
      setReminderMinute("00");
      setReminderPeriod("AM");

    } catch (error) {
      console.error("Add task error:", error);
      alert("Could not add task.");
    }
  }

  // Delete task
  async function deleteTask(id) {
    try {
      const response = await fetch(`${API}${id}/`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");

      setTasks((previous) =>
        previous.filter((task) => task.id !== id)
      );

      notifiedTasks.current.delete(id);

    } catch (error) {
      console.error("Delete task error:", error);
      alert("Could not delete task.");
    }
  }

  // Complete or uncomplete task
  async function completeTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
      const response = await fetch(`${API}${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_completed: !task.is_completed,
        }),
      });

      if (!response.ok) throw new Error("Failed to update task");

      setTasks((previous) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, is_completed: !task.is_completed }
            : item
        )
      );

    } catch (error) {
      console.error("Complete task error:", error);
      alert("Could not update task.");
    }
  }

  // Check reminders
  useEffect(() => {
    let active = true;

    async function checkReminders() {
      if (
        !active ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const dueTasks = tasks.filter((task) => {
        return (
          task.reminder_at &&
          !task.is_completed &&
          !notifiedTasks.current.has(task.id) &&
          new Date(task.reminder_at).getTime() <= Date.now()
        );
      });

      if (dueTasks.length === 0) return;

      try {
        const registration = await navigator.serviceWorker.ready;

        for (const task of dueTasks) {
          if (!active) return;

          await registration.showNotification(
            "Smart To-Do Reminder 🔔",
            {
              body: `Time to complete: ${task.title}`,
              tag: `task-${task.id}`,
            }
          );

          notifiedTasks.current.add(task.id);
        }
      } catch (error) {
        console.error("Reminder notification error:", error);
      }
    }

    checkReminders();

    const interval = setInterval(checkReminders, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [tasks]);

  // Format reminder
  function formatReminder(date) {
    if (!date) return "No reminder set";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="app">
      <h1>Smart To-Do Dashboard</h1>
      <p>Organize your day and complete your goals!</p>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <h2>{tasks.length}</h2>
        </div>

        <div className="stat-card">
          <h3>Completed</h3>
          <h2>{completedTasks}</h2>
        </div>

        <div className="stat-card">
          <h3>Pending</h3>
          <h2>{pendingTasks}</h2>
        </div>
      </div>

      <div className="task-input">
        <input
          type="text"
          placeholder="Enter your task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="date"
          value={reminderDate}
          min={new Date().toLocaleDateString("en-CA")}
          onChange={(e) => setReminderDate(e.target.value)}
        />

        <select
          value={reminderHour}
          onChange={(e) => setReminderHour(e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const hour = String(i + 1).padStart(2, "0");
            return <option key={hour} value={hour}>{hour}</option>;
          })}
        </select>

        <select
          value={reminderMinute}
          onChange={(e) => setReminderMinute(e.target.value)}
        >
          {Array.from({ length: 60 }, (_, i) => {
            const minute = String(i).padStart(2, "0");
            return <option key={minute} value={minute}>{minute}</option>;
          })}
        </select>

        <select
          value={reminderPeriod}
          onChange={(e) => setReminderPeriod(e.target.value)}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>

        <button onClick={addTask}>Add Task</button>
      </div>

      <button onClick={enableNotifications}>
        Enable Notifications 🔔
      </button>

      <h2>My Tasks ({tasks.length})</h2>

      {tasks.length === 0 ? (
        <p>No tasks yet. Add your first task!</p>
      ) : (
        tasks.map((task) => (
          <div className="task" key={task.id}>
            <div>
              <span
                className={task.is_completed ? "completed" : ""}
                onClick={() => completeTask(task.id)}
              >
                {task.title || "Untitled Task"}
              </span>

              <p>🔔 {formatReminder(task.reminder_at)}</p>
            </div>

            <button onClick={() => deleteTask(task.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
