import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Apply dark mode to the document
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
