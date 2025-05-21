import { TestIFrame, Toolbar, useRemote } from "kyju";

function App() {
  useRemote({
    fn: () => {
      console.log("I run");
    },
  });
  return (
    <>
      <TestIFrame />
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
