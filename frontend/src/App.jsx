import { useState , useEffect } from "react";
import "react";
function App() {

  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // Your existing fetch code
  }, []);

  // ADD TASK FUNCTION STARTS HERE
  async function addTask() {
    if (title.trim() === "") {
      alert("Please enter a task!");
      return;
    }

    try {
      const response = await fetch(
        "https://smart-todo-inyc.onrender.com/api/tasks/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title,
            description: "",
            reminder_at: null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add task");
      }

      const newTask = await response.json();

      setTasks([...tasks, newTask]);
      setTitle("");
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Could not add task. Please try again.");
    }
  }
  // ADD TASK FUNCTION ENDS HERE

  async function deleteTask(id) {
  try {
    const response = await fetch(
      `https://smart-todo-inyc.onrender.com/api/tasks/${id}/`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete task");
    }

    setTasks(tasks.filter((task) => task.id !== id));
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("Could not delete task. Please try again.");
  }
}

 async function completeTask(id) {
  const task = tasks.find((task) => task.id === id);

  if (!task) return;

  try {
    const response = await fetch(
      `https://smart-todo-inyc.onrender.com/api/tasks/${id}/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_completed: !task.is_completed,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update task");
    }

    const updatedTask = await response.json();

    setTasks(
      tasks.map((task) =>
        task.id === id ? updatedTask : task
      )
    );
  } catch (error) {
    console.error("Error completing task:", error);
    alert("Could not update task. Please try again.");
  }
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
              className={task.is_completed ? "completed" : ""}
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