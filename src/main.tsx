import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// HashRouter rather than BrowserRouter: GitHub Pages serves static files and
// cannot rewrite unknown paths to index.html, so a deep link like
// /app/applicants would 404 on refresh. Hash routing avoids that entirely and
// keeps deploys dependency-free. Switch to BrowserRouter after moving to AWS
// (CloudFront + S3 with a 404 -> index.html rule).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
