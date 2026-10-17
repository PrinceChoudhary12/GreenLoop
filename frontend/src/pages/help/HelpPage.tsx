import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  LifeBuoy,
  ChevronDown,
  ChevronUp,
  Mail,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import './HelpPage.css';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Reporting Waste',
    question: 'How do I report a waste incident or illegal dumping?',
    answer:
      'Navigate to the "+ Report Waste" link in the sidebar or top bar. Select the waste category (Plastic, Organic, Hazardous, E-Waste, etc.), enter description and address location, set priority level, and submit.',
  },
  {
    category: 'Pickups',
    question: 'How do I schedule a pickup for recyclable materials?',
    answer:
      'Go to "My Pickups" in the navigation menu and click "Request Pickup". Choose the date, time slot, and specify the materials. A verified collector in your zone will be assigned.',
  },
  {
    category: 'Verification & Safety',
    question: 'How are waste collectors verified on GreenLoop?',
    answer:
      'All waste collectors are authorized and vetted by GreenLoop platform administrators prior to receiving operational credentials and field pickup dispatches.',
  },
  {
    category: 'Notifications & Audit',
    question: 'Where can I track updates on my submitted reports?',
    answer:
      'You will receive real-time notifications in your notification center (bell icon) and can view a complete immutable log under "Activity Log".',
  },
];

export const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [ticketSent, setTicketSent] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const filteredFAQs = FAQ_DATA.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSubmitProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setTicketSent(true);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="help-page-container">
      {/* Header */}
      <div className="help-hero">
        <div className="help-hero-icon">
          <HelpCircle size={32} />
        </div>
        <h1 className="help-hero-title">Knowledge & Help Center</h1>
        <p className="help-hero-subtitle">
          Find answers, learn waste sorting protocols, and get support for GreenLoop platform operations.
        </p>

        {/* Search */}
        <div className="help-search-bar">
          <Search size={18} className="help-search-icon" />
          <input
            type="text"
            className="help-search-input"
            placeholder="Search help topics, FAQs, and waste categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search help topics"
          />
        </div>
      </div>

      <div className="help-layout">
        {/* FAQs List */}
        <div className="help-faq-section">
          <div className="section-header">
            <BookOpen size={20} className="section-icon" />
            <h2 className="section-heading">Frequently Asked Questions</h2>
          </div>

          <div className="faq-accordion">
            {filteredFAQs.length === 0 ? (
              <div className="faq-empty">No matching help articles found for "{searchQuery}".</div>
            ) : (
              filteredFAQs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div key={idx} className={`faq-card ${isOpen ? 'open' : ''}`}>
                    <button
                      className="faq-question-btn"
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                    >
                      <span className="faq-category-tag">{faq.category}</span>
                      <span className="faq-question-text">{faq.question}</span>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {isOpen && <div className="faq-answer">{faq.answer}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Contact Support Card */}
        <div className="help-contact-section">
          <div className="contact-card">
            <div className="contact-header">
              <LifeBuoy size={22} className="contact-icon" />
              <div>
                <h3>Report a Platform Issue</h3>
                <p>Submit feedback or request technical support.</p>
              </div>
            </div>

            {ticketSent ? (
              <div className="ticket-success">
                <CheckCircle size={24} className="success-icon" />
                <strong>Support Feedback Received</strong>
                <p>Thank you. Your message has been recorded for the GreenLoop engineering team.</p>
                <button className="btn btn-ghost btn-sm" onClick={() => setTicketSent(false)}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmitProblem}>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Issue scheduling pickup"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Describe what happened or what you need assistance with..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-full">
                  <Mail size={16} />
                  <span>Submit Support Request</span>
                </button>
              </form>
            )}

            <div className="contact-footer">
              <ShieldCheck size={16} />
              <span>GreenLoop Platform Operations & Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
