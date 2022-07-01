import React from "react";
import { Routes, Route } from "react-router-dom";
import { Playground } from "./components/Playground";
import Set from "./components/Set";
// import { Three } from "./components/Three";
// import { ThreePack } from "./components/ThreePack";

function App() {

  return (
    <div>
      Die mit Abstand coolste Lego App (:
      <Routes>
        <Route path="/sets">
          <Route path=":set_num" element={<Set />} />
        </Route>
        {/* <Route path="three" element={<Three />} /> */}
        <Route path="/three">
          <Route path=":id/:color" element={<Playground />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;