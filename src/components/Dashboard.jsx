import React, { useEffect, useRef, useState } from 'react';
import '../styles/dashboard.css';

const SECTION_IDS = ['db-intro', 'db-sql', 'db-pdf'];

export default function Dashboard({ user, onSignOut, themeLabel, onCycleTheme, onOpenSQLChat, onOpenPDFChat }) {

  const sectionRefs = useRef([]);
  const navBtnRefs = useRef([]);
  const [activeTab, setActiveTab] = useState('db-intro');

  // Fade-in animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('db-visible'); });
    }, { threshold: 0.15 });
    sectionRefs.current.forEach(s => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Active nav tab on scroll — use IntersectionObserver, no stale closure issues
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    }, {
      rootMargin: '-40% 0px -55% 0px', // fires when section is roughly centered in viewport
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

      {/* ── Floating background bubbles ── */}
      <div className="db-orbit db-orbit-one" />
      <div className="db-orbit db-orbit-two" />
      <div className="db-orbit db-orbit-three" />

      {/* ── Top header ── */}
      <header className="dashboard-header">
        <h1 className="dashboard-logo">chatbots</h1>
        <div className="dashboard-actions">
          <button className="theme-toggle-btn" onClick={onCycleTheme}>{themeLabel}</button>
          <span className="dashboard-user-name">Hello, {user.name || user.email}</span>
          <button className="dashboard-logout-btn" onClick={onSignOut}>Log Out</button>
        </div>
      </header>

      {/* ── Sections ── */}
      <section id="db-intro" className="db-section" ref={el => sectionRefs.current[0] = el}>
        <div className="db-tag">Welcome</div>
        <h2 className="db-heading">Your AI chatbot hub</h2>
        <p className="db-desc">We offer a suite of smart chatbots — each built for a specific job. Scroll down or use the nav bar to explore.</p>
      </section>

      <section id="db-sql" className="db-section" ref={el => sectionRefs.current[1] = el}>
        <div className="db-emoji">🗄️</div>
        <div className="db-tag">SQL Chatbot</div>
        <h2 className="db-heading">Talk to your database</h2>
        <p className="db-desc">Paste your schema, ask questions in plain English, and get accurate SQL queries instantly — no SQL expertise needed.</p>
        <button className="db-try-btn" onClick={onOpenSQLChat}>Try SQL Chatbot</button>
      </section>

      <section id="db-pdf" className="db-section" ref={el => sectionRefs.current[2] = el}>
        <div className="db-emoji">📄</div>
        <div className="db-tag">PDF Chatbot</div>
        <h2 className="db-heading">Chat with any PDF</h2>
        <p className="db-desc">Upload any document — reports, papers, manuals — and ask questions. Get precise answers pulled straight from the file.</p>
        <button className="db-try-btn" onClick={onOpenPDFChat}>Try PDF Chatbot</button>
      </section>

      {/* ── Floating nav ── */}
      <nav className="db-float-nav">
        {SECTION_IDS.map((id, i) => (
          <button
            key={id}
            className={`db-nav-btn ${activeTab === id ? 'db-nav-active' : ''}`}
            data-target={id}
            ref={el => navBtnRefs.current[i] = el}
            onClick={() => { setActiveTab(id); scrollTo(id); }}
          >
            {['Intro', 'SQL Chatbot', 'PDF Chatbot'][i]}
          </button>
        ))}
      </nav>

    </div>
  );
}