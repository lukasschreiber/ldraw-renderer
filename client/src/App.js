import React from "react";
import { Routes, Route } from "react-router-dom";
import Set from "./components/Set";

function App() {

  return (
    <div>
      Die mit Abstand coolste Lego App (:
      <Routes>
        <Route path="/sets">
          <Route path=":set_num" element={<Set />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;