import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applySecurityHeaders } from '@/lib/security-headers'

// Apply security headers on app initialization
applySecurityHeaders();

createRoot(document.getElementById("root")!).render(<App />);
