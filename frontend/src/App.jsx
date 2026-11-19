
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "https://smart-todo-inyc.onrender.com/api/";

const CATEGORIES = ["Personal", "Work", "Study", "Health", "Other"];
const PRIORITIES = ["high", "medium", "low"];

const emptyForm = {
  title: "",
  description: "",
  due_date: "",
  reminder_at: "",
  priority: "medium",
  category: "Personal",
};

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toISO(value) {
  return value ? new Date(value).toISOString() : null;
}

function dateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("smartTodoToken") || ""
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem("smartTodoUsername") || ""
  );
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [tasks, setTasks] = useState([]);
  const [activePage, setActivePage] = useState("Overview");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    }),
    [token]
  );

  const loadTasks = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API}tasks/`, {
        headers: authHeaders,
      });

      if (response.status === 401) {
        localStorage.removeItem("smartTodoToken");
        localStorage.removeItem("smartTodoUsername");
        setToken("");
        setUsername("");
        setMessage("Your session expired. Please log in again.");
        return;
      }

      if (!response.ok) throw new Error("Could not load your tasks.");

      const data = await response.json();
      setTasks(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    }
  }, [token, authHeaders]);

  useEffect(() => {
    if (token) loadTasks();
  }, [token, loadTasks]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const endpoint = authMode === "login" ? "login/" : "register/";

    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail =
          data.detail ||
          data.username?.[0] ||
          data.password?.[0] ||
          "Authentication failed.";
        throw new Error(detail);
      }

      const newToken = data.token || data.key;
      if (!newToken) {
        throw new Error("The server did not return an authentication token.");
      }

      const signedInName = data.username || authForm.username;

      localStorage.setItem("smartTodoToken", newToken);
      localStorage.setItem("smartTodoUsername", signedInName);
      setToken(newToken);
      setUsername(signedInName);
      setAuthForm({ username: "", password: "" });
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch(`${API}logout/`, {
        method: "POST",
        headers: authHeaders,
      });
    } catch {
      // Clear the local session even if the server is unavailable.
    }

    localStorage.removeItem("smartTodoToken");
    localStorage.removeItem("smartTodoUsername");
    setToken("");
    setUsername("");
    setTasks([]);
    setActivePage("Overview");
    setMessage("");
  }

  function openNewTask() {
    setEditingTask(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  }

  function openEditTask(task) {
    setEditingTask(task);
    setForm({
      title: task.title || "",
      description: task.description || "",
      due_date: localDateTime(task.due_date),
      reminder_at: localDateTime(task.reminder_at),
      priority: task.priority || "medium",
      category: task.category || "Personal",
    });
    setShowForm(true);
    setMessage("");
  }

  async function saveTask(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Please enter a task title.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: toISO(form.due_date),
      reminder_at: toISO(form.reminder_at),
      priority: form.priority,
      category: form.category,
    };

    try {
      const response = await fetch(
        editingTask
          ? `${API}tasks/${editingTask.id}/`
          : `${API}tasks/`,
        {
          method: editingTask ? "PATCH" : "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not save the task. Please try again."
        );
      }

      if (editingTask) {
        setTasks((current) =>
          current.map((task) => (task.id === data.id ? data : task))
        );
      } else {
        setTasks((current) => [data, ...current]);
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingTask(null);
      setMessage(editingTask ? "Task updated successfully." : "Task added successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    const updatedValue = !task.is_completed;

    try {
      const response = await fetch(`${API}tasks/${task.id}/`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ is_completed: updatedValue }),
      });

      if (!response.ok) throw new Error("Could not update this task.");

      const data = await response.json();
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? data : item))
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteTask(id) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`${API}tasks/${id}/`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) throw new Error("Could not delete this task.");

      setTasks((current) => current.filter((task) => task.id !== id));
      setMessage("Task deleted successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setMessage("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      new Notification("Smart To-Do Pro", {
        body: "Notifications are enabled!",
      });
      setMessage("Notifications enabled successfully.");
    } else {
      setMessage("Notification permission was not granted.");
    }
  }

  useEffect(() => {
    if (!token || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const checkReminders = () => {
      const now = Date.now();

      tasks.forEach((task) => {
        if (!task.reminder_at || task.is_completed) return;

        const reminderTime = new Date(task.reminder_at).getTime();
        const reminderKey = `smartTodoReminder_${task.id}_${task.reminder_at}`;

        if (
          reminderTime <= now &&
          reminderTime > now - 60000 &&
          !localStorage.getItem(reminderKey)
        ) {
          new Notification("Task reminder", {
            body: task.title,
          });
          localStorage.setItem(reminderKey, "sent");
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [token, tasks]);

  const completedTasks = tasks.filter((task) => task.is_completed);
  const pendingTasks = tasks.filter((task) => !task.is_completed);
  const completionRate = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Completed" && task.is_completed) ||
        (statusFilter === "Pending" && !task.is_completed);

      const matchesCategory =
        categoryFilter === "All" || task.category === categoryFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
  }, [tasks, search, statusFilter, categoryFilter, priorityFilter]);

  const todayKey = dateKey(new Date());
  const todayTasks = tasks.filter((task) => dateKey(task.due_date) === todayKey);

  const monthYear = calendarMonth.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const categoryCounts = CATEGORIES.map((category) => ({
    name: category,
    count: tasks.filter((task) => task.category === category).length,
  }));

  function renderTask(task) {
    return (
      <article className={`task-card ${task.is_completed ? "task-done" : ""}`} key={task.id}>
        <button
          className={`task-check ${task.is_completed ? "checked" : ""}`}
          onClick={() => toggleTask(task)}
          aria-label={task.is_completed ? "Mark as pending" : "Mark as completed"}
        >
          {task.is_completed ? "✓" : ""}
        </button>

        <div className="task-main">
          <h3>{task.title}</h3>
          {task.description && <p className="task-description">{task.description}</p>}
          <div className="task-meta">
            <span className="category-tag">{task.category || "Personal"}</span>
            <span className={`priority-tag priority-${task.priority || "medium"}`}>
              {task.priority || "medium"} priority
            </span>
            {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
            {task.reminder_at && <span>Reminder: {formatDate(task.reminder_at)}</span>}
          </div>
        </div>

        <div className="task-actions">
          <button className="icon-button" onClick={() => openEditTask(task)} title="Edit task">
            ✎
          </button>
          <button className="icon-button delete-button" onClick={() => deleteTask(task.id)} title="Delete task">
            ×
          </button>
        </div>
      </article>
    );
  }

  if (!token) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="brand-mark">✓</div>
          <p className="eyebrow">YOUR PERSONAL PRODUCTIVITY SPACE</p>
          <h1>Smart To-Do <span>Pro</span></h1>
          <p className="auth-subtitle">
            Plan your day, stay focused, and make progress every day.
          </p>

          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => { setAuthMode("login"); setMessage(""); }}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => { setAuthMode("register"); setMessage(""); }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            <label>Username</label>
            <input
              value={authForm.username}
              onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
              placeholder="Enter your username"
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              placeholder="Enter your password"
              required
            />
            {message && <p className="message">{message}</p>}
            <button className="primary-button full-button" disabled={loading}>
              {loading ? "Please wait..." : authMode === "login" ? "Login to dashboard" : "Create account"}
            </button>
          </form>
          <p className="auth-footnote">Your tasks are saved to your account.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small-mark">✓</div>
          <div><strong>Smart To-Do</strong><span>PRO WORKSPACE</span></div>
        </div>

        <p className="nav-heading">WORKSPACE</p>
        <nav className="side-nav">
          {[
            ["Overview", "▦"],
            ["My Tasks", "☷"],
            ["Calendar", "▦"],
            ["Analytics", "◔"],
          ].map(([page, icon]) => (
            <button
              key={page}
              className={activePage === page ? "nav-item selected" : "nav-item"}
              onClick={() => setActivePage(page)}
            >
              <span>{icon}</span>{page}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">{(username || "U").charAt(0).toUpperCase()}</div>
          <div className="user-info"><strong>{username || "User"}</strong><span>Personal account</span></div>
          <button className="logout-button" onClick={logout} title="Logout">↪</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL WORKSPACE</p>
            <h1>{activePage}</h1>
          </div>
          <div className="topbar-actions">
            <button className="notification-button" onClick={enableNotifications}>♧ Enable notifications</button>
            <button className="primary-button" onClick={openNewTask}>＋ Add task</button>
          </div>
        </header>

        {message && (
          <div className="notice">
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {activePage === "Overview" && (
          <>
            <section className="welcome-banner">
              <div>
                <p className="eyebrow light-eyebrow">YOUR DAY, YOUR PROGRESS</p>
                <h2>Welcome back, {username || "there"}!</h2>
                <p>Small steps every day lead to big achievements.</p>
              </div>
              <div className="welcome-date">
                <span>{new Date().toLocaleDateString([], { weekday: "long" })}</span>
                <strong>{new Date().toLocaleDateString([], { day: "numeric", month: "short" })}</strong>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card"><span className="stat-icon purple-icon">☷</span><p>Total tasks</p><strong>{tasks.length}</strong><small>All your tasks</small></div>
              <div className="stat-card"><span className="stat-icon green-icon">✓</span><p>Completed</p><strong>{completedTasks.length}</strong><small>Tasks finished</small></div>
              <div className="stat-card"><span className="stat-icon orange-icon">◷</span><p>Pending</p><strong>{pendingTasks.length}</strong><small>Still to do</small></div>
              <div className="stat-card"><span className="stat-icon blue-icon">▦</span><p>Due today</p><strong>{todayTasks.length}</strong><small>Scheduled for today</small></div>
            </section>

            <section className="content-grid">
              <div className="panel recent-panel">
                <div className="panel-heading"><div><h2>Recent tasks</h2><p>Your latest activity</p></div><button className="text-button" onClick={() => setActivePage("My Tasks")}>View all →</button></div>
                {tasks.length ? tasks.slice(0, 5).map(renderTask) : <div className="empty-state"><span>✦</span><h3>No tasks yet</h3><p>Create your first task to get started.</p><button className="primary-button" onClick={openNewTask}>＋ Create task</button></div>}
              </div>

              <div className="panel progress-panel">
                <div className="panel-heading"><div><h2>Productivity</h2><p>Your completion progress</p></div></div>
                <div className="progress-circle" style={{ "--progress": `${completionRate}%` }}>
                  <div><strong>{completionRate}%</strong><span>Completed</span></div>
                </div>
                <div className="progress-legend"><span><i className="legend-dot done-dot"></i>Completed</span><strong>{completedTasks.length}</strong></div>
                <div className="progress-legend"><span><i className="legend-dot pending-dot"></i>Pending</span><strong>{pendingTasks.length}</strong></div>
              </div>
            </section>
          </>
        )}

        {activePage === "My Tasks" && (
          <section className="panel task-page-panel">
            <div className="panel-heading"><div><h2>All tasks</h2><p>Search, filter, edit, and manage your tasks.</p></div><span className="result-count">{filteredTasks.length} results</span></div>
            <div className="filter-bar">
              <input className="search-input" placeholder="⌕  Search tasks..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Pending</option><option>Completed</option></select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
              <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>)}</select>
            </div>
            {filteredTasks.length ? filteredTasks.map(renderTask) : <div className="empty-state"><span>⌕</span><h3>No matching tasks</h3><p>Try changing your filters or add a new task.</p></div>}
          </section>
        )}

        {activePage === "Calendar" && (
          <section className="panel calendar-panel">
            <div className="panel-heading">
              <div><h2>Task calendar</h2><p>See your tasks by due date.</p></div>
              <div className="calendar-controls">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button>
                <strong>{monthYear}</strong>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button>
              </div>
            </div>
            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
              {calendarCells.map((day, index) => {
                const key = day ? dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)) : "";
                const dayTasks = tasks.filter((task) => dateKey(task.due_date) === key);
                const isToday = key === todayKey;
                return <div className={`calendar-day ${!day ? "blank-day" : ""} ${isToday ? "today-cell" : ""}`} key={index}>
                  {day && <><span className="day-number">{day}</span>{dayTasks.slice(0, 2).map((task) => <button className={`calendar-task ${task.is_completed ? "calendar-done" : ""}`} key={task.id} title={task.title} onClick={() => openEditTask(task)}>{task.title}</button>)}{dayTasks.length > 2 && <small>+{dayTasks.length - 2} more</small>}</>}
                </div>;
              })}
            </div>
            <p className="calendar-hint">Select a task on the calendar to edit it. Tasks without a due date do not appear here.</p>
          </section>
        )}

        {activePage === "Analytics" && (
          <section className="analytics-layout">
            <div className="stats-grid analytics-stats">
              <div className="stat-card"><p>Total tasks</p><strong>{tasks.length}</strong><small>Created tasks</small></div>
              <div className="stat-card"><p>Completed</p><strong>{completedTasks.length}</strong><small>Finished tasks</small></div>
              <div className="stat-card"><p>Pending</p><strong>{pendingTasks.length}</strong><small>Remaining tasks</small></div>
              <div className="stat-card"><p>Completion rate</p><strong>{completionRate}%</strong><small>Overall progress</small></div>
            </div>
            <div className="panel analytics-panel">
              <div className="panel-heading"><div><h2>Tasks by category</h2><p>How your tasks are distributed.</p></div></div>
              {categoryCounts.map((item) => <div className="category-progress" key={item.name}><div><span>{item.name}</span><strong>{item.count}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${tasks.length ? (item.count / tasks.length) * 100 : 0}%` }} /></div></div>)}
            </div>
            <div className="panel analytics-panel">
              <div className="panel-heading"><div><h2>Priority breakdown</h2><p>Tasks grouped by priority.</p></div></div>
              {PRIORITIES.map((priority) => {
                const count = tasks.filter((task) => task.priority === priority).length;
                return <div className="priority-row" key={priority}><span className={`priority-tag priority-${priority}`}>{priority}</span><strong>{count}</strong></div>;
              })}
            </div>
          </section>
        )}
      </main>

      {showForm && (
        <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <section className="task-modal">
            <div className="modal-heading"><div><p className="eyebrow">TASK MANAGEMENT</p><h2>{editingTask ? "Edit task" : "Create a new task"}</h2></div><button className="modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <form onSubmit={saveTask} className="task-form">
              <label>Task title *</label>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What do you need to do?" required maxLength={200} />
              <label>Description</label>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add some details..." rows={3} />
              <div className="form-two-columns">
                <div><label>Category</label><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
                <div><label>Priority</label><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>)}</select></div>
              </div>
              <label>Due date and time</label>
              <input type="datetime-local" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
              <label>Reminder date and time</label>
              <input type="datetime-local" value={form.reminder_at} onChange={(event) => setForm({ ...form, reminder_at: event.target.value })} />
              <p className="form-hint">Reminders are checked while this app is open and notifications are allowed by your browser.</p>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving..." : editingTask ? "Save changes" : "Create task"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
