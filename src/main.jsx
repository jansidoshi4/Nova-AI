import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/chat.css'
import './styles/theme.css'
import './styles/chatPastel.css'
import { GoogleOAuthProvider } from '@react-oauth/google'


// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// )

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
)