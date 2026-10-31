import { useState , useEffect } from "react";
import "react";

function App() {
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/tasks/")
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch tasks");
            }
            return response.json();
        })
        .then(data => {
            setTasks(data);
        })
        .catch(error => {
            console.error("Error fetching tasks:", error);
        });
}, []);
  function addTask() {
    if (title.trim() === "") {
      alert("Please enter a task!");
      return;
    }

    const newTask = {
      id: Date.now(),
      title: title,
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setTitle("");
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

  function completeTask(id) {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  }

  return (
    <div className="app">
      <h1>Smart To-Do List</h1>
      <p>Organize your day and complete your goals!</p>

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
              className={task.completed ? "completed" : ""}
              onClick={() => completeTask(task.id)}
            >
              {task.title}
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