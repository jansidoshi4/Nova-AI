import React, { useEffect, useRef, useState } from 'react';
import Doodle from './Doodles';
import '../styles/dashboard.css';

const SECTION_IDS = ['db-intro', 'db-sql', 'db-pdf'];

export default function Dashboard({ user, onSignOut, themeLabel, onCycleTheme, onOpenSQLChat, onOpenPDFChat }) {

  const sectionRefs = useRef([]);
  const [activeTab, setActiveTab] = useState('db-intro');

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('db-visible'); });
    }, { threshold: 0.15 });
    sectionRefs.current.forEach(s => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    }, {
      rootMargin: '-40% 0px -55% 0px',
      threshold: 0,
    });

    sectionRefs.current.forEach(s => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="db-wrap">

      <header className="dashboard-header">
        <h1 className="dashboard-logo">
          <span className="dashboard-logo-icon" aria-hidden="true">
            <i className="ti ti-box" />
          </span>
          Nova AI
        </h1>
        <div className="dashboard-actions">
          <button className="theme-toggle-btn" onClick={onCycleTheme} type="button">
            {themeLabel}
          </button>
          <span className="dashboard-user-name">Hello, {user.name || user.email}</span>
          <button className="dashboard-logout-btn" onClick={onSignOut} type="button">Log Out</button>
        </div>
      </header>

      {/* Hero */}
      <div className="db-hero">
        <h2 className="db-hero-title">
          The only AI chatbot hub<br />
          <span>built for your team</span>
        </h2>
        <p className="db-hero-desc">
          SQL queries, PDF analysis, and smart conversations — all in one clean workspace. Scroll down to explore each tool.
        </p>
        <button className="db-cta-btn" type="button" onClick={() => scrollTo('db-sql')}>
          Get started
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>

      {/* Dashboard preview window */}
      <div className="db-preview">
        <div className="db-preview-window">
          <div className="db-window-bar">
            <span className="db-window-dot db-window-dot--red" />
            <span className="db-window-dot db-window-dot--yellow" />
            <span className="db-window-dot db-window-dot--green" />
            <span className="db-window-breadcrumb">Nova AI / Dashboard</span>
          </div>
          <div className="db-preview-body">
            <div className="db-metric-grid">
              <div className="db-metric-card">
                <i className="ti ti-database db-metric-icon" aria-hidden="true" />
                <div className="db-metric-label">SQL Chatbot</div>
                <div className="db-metric-value">Ready</div>
                <div className="db-metric-sub">Schema-aware queries</div>
              </div>
              <div className="db-metric-card">
                <i className="ti ti-file-text db-metric-icon" aria-hidden="true" />
                <div className="db-metric-label">PDF Chatbot</div>
                <div className="db-metric-value">Ready</div>
                <div className="db-metric-sub">Upload &amp; ask anything</div>
              </div>
              <div className="db-metric-card">
                <i className="ti ti-history db-metric-icon" aria-hidden="true" />
                <div className="db-metric-label">Chat history</div>
                <div className="db-metric-value">Saved</div>
                <div className="db-metric-sub">Synced to your account</div>
              </div>
              <div className="db-metric-card db-metric-card--warn">
                <i className="ti ti-alert-triangle db-metric-icon" aria-hidden="true" />
                <div className="db-metric-label">Status</div>
                <div className="db-metric-value">Online</div>
                <div className="db-metric-sub">All systems go</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <section id="db-intro" className="db-section" ref={el => sectionRefs.current[0] = el}>
        <div className="db-tag">Welcome</div>
        <h2 className="db-heading">Your AI chatbot <span>hub</span></h2>
        <p className="db-desc">We offer a suite of smart chatbots — each built for a specific job. Scroll down or use the nav bar to explore.</p>
      </section>

      <section id="db-sql" className="db-section" ref={el => sectionRefs.current[1] = el}>
        <div className="db-emoji"><Doodle name="database" size={48} /></div>
        <div className="db-tag">SQL Chatbot</div>
        <h2 className="db-heading">Talk to your <span>database</span></h2>
        <p className="db-desc">Paste your schema, ask questions in plain English, and get accurate SQL queries instantly — no SQL expertise needed.</p>
        <button className="db-try-btn" type="button" onClick={onOpenSQLChat}>
          Try SQL Chatbot
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </section>

      <section id="db-pdf" className="db-section" ref={el => sectionRefs.current[2] = el}>
        <div className="db-emoji"><Doodle name="document" size={48} /></div>
        <div className="db-tag">PDF Chatbot</div>
        <h2 className="db-heading">Chat with <span>any PDF</span></h2>
        <p className="db-desc">Upload any document — reports, papers, manuals — and ask questions. Get precise answers pulled straight from the file.</p>
        <button className="db-try-btn" type="button" onClick={onOpenPDFChat}>
          Try PDF Chatbot
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </section>

      <nav className="db-float-nav" aria-label="Section navigation">
        {SECTION_IDS.map((id, i) => (
          <button
            key={id}
            className={`db-nav-btn ${activeTab === id ? 'db-nav-active' : ''}`}
            type="button"
            onClick={() => { setActiveTab(id); scrollTo(id); }}
          >
            {['Intro', 'SQL Chatbot', 'PDF Chatbot'][i]}
          </button>
        ))}
      </nav>

    </div>
  );
}
