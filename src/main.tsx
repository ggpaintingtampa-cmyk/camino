import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
import './features.css';
import './redesign-v2.css';
import './redesign-v3.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
