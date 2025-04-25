import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import PhyloTreeViewer from './components/PhyloTreeViewer';

function App() {
  return (
    <div className="App" >
      <PhyloTreeViewer />
    </div>
  );
}

export default App
