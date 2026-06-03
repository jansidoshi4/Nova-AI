import React, { useEffect, useRef, useState } from 'react';
import '../styles/dashboard.css';

export default function Dashboard({ user, onSignOut, themeLabel, onCycleTheme, onOpenSQLChat, onOpenPDFChat }) {

  const sectionRefs = useRef([]);
  const navBtnRefs = useRef([]);
  const [activeTab, setActiveTab] = useState('db-intro');

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('db-visible'); });
    }, { threshold: 0.15 });
    sectionRefs.current.forEach(s => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const mid = window.scrollY + window.innerHeight;
      let active = 0;
      navBtnRefs.current.forEach((btn, i) => {
        const target = btn && document.getElementById(btn.dataset.target);
        if (target && target.offsetTop <= mid) active = i;
      });

            const ids = ['db-intro', 'db-sql', 'db-pdf'];
            console.log('Detected section:', ids[active]);

          if (activeTab !== ids[active]) {
            setActiveTab(ids[active]);
          }
      
      
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="db-wrap">

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
              <button
        className={`db-nav-btn ${activeTab === 'db-intro' ? 'db-nav-active' : ''}`}
        data-target="db-intro"
        ref={el => navBtnRefs.current[0] = el}
        onClick={() => {
          setActiveTab('db-intro')
          scrollTo('db-intro')
        }}
      >
        Intro
      </button>
        
        <button
          className={`db-nav-btn ${activeTab === 'db-sql' ? 'db-nav-active' : ''}`}
          data-target="db-sql"
          ref={el => navBtnRefs.current[1] = el}
         onClick={() => {
          setActiveTab('db-sql')
          scrollTo('db-sql')
        }}
        >
          SQL Chatbot
        </button>

        <button className={`db-nav-btn ${activeTab === 'db-pdf' ? 'db-nav-active' : ''}`}
        data-target="db-pdf" ref={el => navBtnRefs.current[2] = el} onClick={() => {
        setActiveTab('db-pdf')
        scrollTo('db-pdf')
      }}
       >
        PDF Chatbot
        </button>
      </nav>

    </div>
  );
}
