import { Toolbar } from "kyju";

function App() {
  return (
    <>
      <button
        onClick={() => {
          fetch("https://jsonplaceholder.typicode.com/todos/1");
        }}
      >
        click me i do stuff
      </button>
      <Toolbar />
    </>
  );
}

export default App;
