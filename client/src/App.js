import React from "react";
import { Routes, Route } from "react-router-dom";
import Set from "./components/Set";
import { Three } from "./components/Three";

function App() {

  return (
    <div>
      Die mit Abstand coolste Lego App (:
      <Routes>
        <Route path="/sets">
          <Route path=":set_num" element={<Set />} />
        </Route>
        <Route path="three" element={<Three />} />
      </Routes>
    </div>
  );
}

export default App;