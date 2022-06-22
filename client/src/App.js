import React from "react";
import "./App.css";

function App() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    fetch("/sets/21325-1")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>{!data ? "Loading..." : data.map(data => (
          <div>
            <h3>{data.name}#{data.set_num}</h3><br />
            <img src={data.img_url} alt={data.name} /><br />
            Themes: {data.themes.join(" - ")}<br/>
            No of Parts: {data.num_parts}<br/>
            Year: {data.year}<br/>
            {data.instructions.map(instruction => (
              <a href={instruction.url} target="_blank" rel="noreferrer">
                <img src={instruction.image.url} alt={instruction.image.alt} /><br />
                {instruction.name} <br/>
                {instruction.paper} <br/>
                {instruction.size}<br/>
              </a>
            ))}
          </div>
        ))}</p>
      </header>
    </div>
  );
}

export default App;