
import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);

  const API = "https://smart-todo-inyc.onrender.com/api/tasks/";

  useEffect(() => {
    fetch(API)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch tasks");
        return response.json();
      })
      .then((data) => setTasks(data))
      .catch((error) => console.error("Fetch error:", error));
  }, []);

  const completedTasks = tasks.filter(
    (task) => task.is_completed
  ).length;

  const pendingTasks = tasks.length - completedTasks;

  async function addTask() {
    if (!title.trim()) {
      alert("Please enter a task!");
      return;
    }

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: "",
          reminder_at: null,
        }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      const newTask = await response.json();
      setTasks((previous) => [...previous, newTask]);
      setTitle("");
    } catch (error) {
      console.error(error);
      alert("Could not add task.");
    }
  }

  async function deleteTask(id) {
    try {
      const response = await fetch(`${API}${id}/`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");

      setTasks((previous) =>
        previous.filter((task) => task.id !== id)
      );
    } catch (error) {
      console.error(error);
      alert("Could not delete task.");
    }
  }


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

    if (!response.ok) {
      throw new Error("Failed to update task");
    }

    // Keep the original task details and update only its status
    setTasks((previousTasks) =>
      previousTasks.map((item) =>
        item.id === id
          ? {
              ...item,
              is_completed: !task.is_completed,
            }
          : item
      )
    );
  } catch (error) {
    console.error("Complete task error:", error);
    alert("Could not update task.");
  }
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
        <button onClick={addTask}>Add Task</button>
      </div>

      <h2>My Tasks ({tasks.length})</h2>

      {tasks.length === 0 ? (
        <p>No tasks yet. Add your first task!</p>
      ) : (
        tasks.map((task) => (
          <div className="task" key={task.id}>
            <span
  className={task.is_completed ? "completed" : ""}
  onClick={() => completeTask(task.id)}
>
  {task.title || "Untitled Task"}
</span>

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
