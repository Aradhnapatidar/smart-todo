
import { useState, useEffect, useRef } from "react";
import "./App.css";

//const API = "http://127.0.0.1:8000/api/";
const API = "https://smart-todo-inyc.onrender.com/api/";

function App() {
  // Authentication states
  const [authToken, setAuthToken] = useState(
    localStorage.getItem("smartTodoToken") || ""
  );

  const [username, setUsername] = useState(
    localStorage.getItem("smartTodoUsername") || ""
  );

  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Task states
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Reminder states
  const [reminderDate, setReminderDate] = useState("");
  const [reminderHour, setReminderHour] = useState("08");
  const [reminderMinute, setReminderMinute] = useState("00");
  const [reminderPeriod, setReminderPeriod] = useState("AM");

  const notifiedTasks = useRef(new Set());

  // Authentication headers
  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Token ${authToken}`,
    };
  }

  // Handle login and registration
  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");

    if (!authUsername.trim() || !authPassword) {
      setAuthError("Please enter your username and password.");
      return;
    }

    setAuthLoading(true);

    const endpoint =
      authMode === "register" ? "register/" : "login/";

    const body = {
      username: authUsername.trim(),
      password: authPassword,
    };

    if (authMode === "register") {
      body.email = authEmail.trim();
    }

    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.username?.[0] ||
          data.password?.[0] ||
          "Authentication failed."
        );
      }

      localStorage.setItem("smartTodoToken", data.token);
      localStorage.setItem("smartTodoUsername", data.username);

      setAuthToken(data.token);
      setUsername(data.username);
      setAuthPassword("");
      setAuthError("");

    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // Logout
  async function logout() {
    try {
      await fetch(`${API}logout/`, {
        method: "POST",
        headers: getHeaders(),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("smartTodoToken");
    localStorage.removeItem("smartTodoUsername");

    setAuthToken("");
    setUsername("");
    setTasks([]);
    setTitle("");
    notifiedTasks.current.clear();
  }

  // Load tasks belonging to the logged-in user
  useEffect(() => {
    if (!authToken) {
      setTasks([]);
      return;
    }

    let active = true;

    async function fetchTasks() {
      setLoadingTasks(true);

      try {
        const response = await fetch(`${API}tasks/`, {
          headers: getHeaders(),
        });

        if (response.status === 401) {
          localStorage.removeItem("smartTodoToken");
          localStorage.removeItem("smartTodoUsername");
          setAuthToken("");
          setUsername("");
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load tasks.");
        }

        const data = await response.json();

        if (active) {
          setTasks(data);
        }

      } catch (error) {
        console.error("Fetch tasks error:", error);
      } finally {
        if (active) {
          setLoadingTasks(false);
        }
      }
    }

    fetchTasks();

    return () => {
      active = false;
    };
  }, [authToken]);

  // Register service worker
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

  // Add task
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
      const response = await fetch(`${API}tasks/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          description: "",
          reminder_at: reminderISO,
          priority: "medium",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Failed to add task.");
      }

      setTasks((previous) => [...previous, data]);

      setTitle("");
      setReminderDate("");
      setReminderHour("08");
      setReminderMinute("00");
      setReminderPeriod("AM");

    } catch (error) {
      console.error("Add task error:", error);
      alert(error.message);
    }
  }

  // Delete task
  async function deleteTask(id) {
    try {
      const response = await fetch(`${API}tasks/${id}/`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete task.");
      }

      setTasks((previous) =>
        previous.filter((task) => task.id !== id)
      );

      notifiedTasks.current.delete(id);

    } catch (error) {
      console.error("Delete task error:", error);
      alert(error.message);
    }
  }

  // Complete or uncomplete task
  async function completeTask(id) {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    try {
      const response = await fetch(`${API}tasks/${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          is_completed: !task.is_completed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Failed to update task.");
      }

      setTasks((previous) =>
        previous.map((item) =>
          item.id === id ? data : item
        )
      );

    } catch (error) {
      console.error("Complete task error:", error);
      alert(error.message);
    }
  }

  // Check reminders every 5 seconds
  useEffect(() => {
    if (!authToken) return;

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
        console.error("Reminder error:", error);
      }
    }

    checkReminders();

    const interval = setInterval(checkReminders, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [tasks, authToken]);

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

  // LOGIN AND REGISTRATION SCREEN
  if (!authToken) {
    return (
      <div className="app auth-container">

        <h1>Smart To-Do</h1>

        <p>
          Organize your day and achieve your goals!
        </p>

        <div className="auth-box">

          <h2>
            {authMode === "login" ? "Welcome Back!" : "Create Account"}
          </h2>

          <form onSubmit={handleAuth}>

            <input
              type="text"
              placeholder="Enter username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              required
            />

            {authMode === "register" && (
              <input
                type="email"
                placeholder="Enter email (optional)"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
            )}

            <input
              type="password"
              placeholder="Enter password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />

            {authError && (
              <p className="error-message">
                {authError}
              </p>
            )}

            <button type="submit" disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Register"}
            </button>

          </form>

          <p>
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              className="link-button"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setAuthError("");
              }}
            >
              {authMode === "login" ? "Register" : "Login"}
            </button>
          </p>

        </div>
      </div>
    );
  }

  // LOGGED-IN DASHBOARD
  return (
    <div className="app">

      <div className="welcome-section">
        <div>
          <h1>Smart To-Do Dashboard</h1>
          <p>Welcome, {username}!</p>
          <p>Organize your day and complete your goals!</p>
        </div>

        <button onClick={logout}>
          Logout
        </button>
      </div>

      {/* Dashboard statistics */}
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

      {/* Add task */}
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

            return (
              <option key={hour} value={hour}>
                {hour}
              </option>
            );
          })}
        </select>

        <select
          value={reminderMinute}
          onChange={(e) => setReminderMinute(e.target.value)}
        >
          {Array.from({ length: 60 }, (_, i) => {
            const minute = String(i).padStart(2, "0");

            return (
              <option key={minute} value={minute}>
                {minute}
              </option>
            );
          })}
        </select>

        <select
          value={reminderPeriod}
          onChange={(e) => setReminderPeriod(e.target.value)}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>

        <button onClick={addTask}>
          Add Task
        </button>

      </div>

      <button onClick={enableNotifications}>
        Enable Notifications 🔔
      </button>

      <h2>My Tasks ({tasks.length})</h2>

      {loadingTasks ? (
        <p>Loading your tasks...</p>
      ) : tasks.length === 0 ? (
        <p>No tasks yet. Add your first task!</p>
      ) : (
        tasks.map((task) => (
          <div className="task" key={task.id}>

            <div>
              <span
                className={
                  task.is_completed ? "completed" : ""
                }
                onClick={() => completeTask(task.id)}
                style={{ cursor: "pointer" }}
              >
                {task.title || "Untitled Task"}
              </span>

              <p>
                🔔 {formatReminder(task.reminder_at)}
              </p>
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
