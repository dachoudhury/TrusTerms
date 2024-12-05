import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './styles.css';
import { IoIosSend } from "react-icons/io";

const GlobalScoreIndicator = ({ score }) => {
  const position = `${Math.min(Math.max(score, 0), 100)}%`;
  
  return (
    <div className="global-score">
      <h3>Overall Terms Score</h3>
      <div className="score-value">{score.toFixed(1)}%</div>
      
      {/* Gradient Band */}
      <div className="score-band">
        <div 
          className="score-marker"
          style={{ left: position }}
        />
      </div>
      
      {/* Labels */}
      <div className="score-labels">
        <span>Critical</span>
        <span>Poor</span>
        <span>Fair</span>
        <span>Good</span>
        <span>Excellent</span>
      </div>
    </div>
  );
};

const DetailedScores = ({ scores }) => {
  return (
    <div className="detailed-scores">
      {Object.entries(scores).map(([category, score]) => {
        const maxScore = getMaxScore(category);
        const percentage = (score / maxScore) * 100;
        let scoreClass = 
          percentage >= 80 ? 'excellent' :
          percentage >= 70 ? 'good' :
          percentage >= 60 ? 'fair' :
          percentage >= 50 ? 'poor' :
          'critical';
        
        return (
          <div key={category} className="score-item">
            <div className="score-item-header">
              <span className="score-item-title">
                {formatScoreCategory(category)}
              </span>
              <span className="score-item-value">
                {score}/{maxScore}
              </span>
            </div>
            <div className="score-bar">
              <div
                className={`score-bar-fill ${scoreClass}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Score formatting utilities
function formatScoreCategory(key) {
  const mapping = {
    clarity_and_accessibility: 'Clarity & Accessibility',
    transparency_on_data_collection_and_use: 'Data Collection & Usage Transparency',
    user_rights_and_control: "User Rights & Control",
    data_sharing_with_third_parties: 'Third-Party Data Sharing',
    security_measures: 'Security Measures',
    legal_compliance: 'Legal Compliance',
    fairness_of_terms: 'Terms Fairness',
    dispute_resolution_and_jurisdiction: 'Dispute Resolution',
    updates_and_notifications: 'Updates & Notifications',
    cookies_and_tracking: 'Cookies & Tracking',
    consent_mechanisms: 'Consent Mechanisms',
    industry_specific_practices: 'Industry Practices',
  };
  return mapping[key] || key;
}

function getMaxScores() {
  return {
    clarity_and_accessibility: 10,
    transparency_on_data_collection_and_use: 15,
    user_rights_and_control: 10,
    data_sharing_with_third_parties: 10,
    security_measures: 5,
    legal_compliance: 10,
    fairness_of_terms: 10,
    dispute_resolution_and_jurisdiction: 5,
    updates_and_notifications: 5,
    cookies_and_tracking: 5,
    consent_mechanisms: 5,
    industry_specific_practices: 15,
  };
}

function getMaxScore(key) {
  const maxScores = getMaxScores();
  return maxScores[key] || 0;
}

function calculateGlobalScore(scores) {
  const maxScores = getMaxScores();
  let totalScore = 0;
  let totalMaxScore = 0;
  
  Object.entries(scores).forEach(([category, score]) => {
    totalScore += score;
    totalMaxScore += maxScores[category];
  });
  
  return (totalScore / totalMaxScore) * 100;
}

// Global Score Component
const GlobalScore = ({ score }) => {
  const position = `${Math.min(Math.max(score, 0), 100)}%`;
  
  return (
    <div className="mb-8">
      <div className="text-center mb-2">
        <h3 className="text-2xl font-bold mb-1">Overall Terms Score</h3>
        <div className="text-4xl font-bold">{score.toFixed(1)}%</div>
      </div>
      <div className="relative h-8 rounded-full overflow-hidden mt-4">
        <div className="absolute w-full h-full"
             style={{
               background: 'linear-gradient(to right, #ef4444, #fbbf24, #22c55e)',
             }} />
        <div className="absolute h-full w-0.5 bg-white transform -translate-x-1/2"
             style={{ left: position }}>
          <div className="w-4 h-4 rounded-full bg-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-gray-800" />
        </div>
      </div>
      <div className="flex justify-between mt-1 text-sm">
        <span>Poor</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>
    </div>
  );
};


const ScoreDisplay = ({ scores }) => {
  const globalScore = calculateGlobalScore(scores);
  
  return (
    <div className="scores-container">
      <GlobalScoreIndicator score={globalScore} />
      <DetailedScores scores={scores} />
    </div>
  );
};


export default function App() {
  const [termsContent, setTermsContent] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    console.log('[Terms Analyzer - Popup] Initializing...');
    loadTermsContent();

    const messageListener = (message) => {
      if (message.type === 'TERMS_UPDATED') {
        setTermsContent({
          content: message.content,
          url: message.url
        });
        setAnalysis(null);
        setMessages([]);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadTermsContent = () => {
    chrome.storage.local.get(['termsContent', 'termsUrl'], (result) => {
      console.log('[Terms Analyzer - Popup] Storage content:', result);
      if (result.termsContent) {
        setTermsContent({
          content: result.termsContent,
          url: result.termsUrl
        });
        console.log('[Terms Analyzer - Popup] Terms content loaded');
      } else {
        console.log('[Terms Analyzer - Popup] No terms content found in storage');
      }
    });
  };

  const analyzeTerms = async () => {
    if (!termsContent) {
      console.log("No terms content to analyze.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: termsContent.content,
          url: termsContent.url,
        }),
      });
      
      const data = await response.json();
      console.log("API response:", data);
      
      if (data.status === 'success') {
        if (!data.data.summary) {
          throw new Error("The 'summary' field is missing in the API response.");
        }
        
        const summaryString = data.data.summary;
        const jsonMatch = summaryString.match(/```json\n([\s\S]*?)\n```/);
        
        if (!jsonMatch || jsonMatch.length < 2) {
          throw new Error("The 'summary' field format is incorrect.");
        }
        
        const jsonString = jsonMatch[1];
        let parsedSummary;
        
        try {
          parsedSummary = JSON.parse(jsonString);
        } catch (parseError) {
          throw new Error("Error parsing JSON in the 'summary' field.");
        }
        
        if (
          parsedSummary.scores &&
          typeof parsedSummary.data_collected === 'string' &&
          typeof parsedSummary.fees === 'string' &&
          typeof parsedSummary.subscription_cancellation === 'string' &&
          typeof parsedSummary.support_contact === 'string'
        ) {
          setAnalysis(parsedSummary);
          setMessages([
            { type: 'assistant', content: 'You can now ask questions about these terms and conditions.' },
          ]);
        } else {
          throw new Error("The returned JSON does not contain all necessary fields.");
        }
      } else {
        throw new Error(data.message || "Analysis failed");
      }
    } catch (err) {
      console.error("Error in analyzeTerms:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !termsContent) return;

    const userMessage = newMessage.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setNewMessage('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/inference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terms: termsContent.content,
          system_prompt: "You are a helpful assistant that explains terms and conditions clearly and concisely. Focus on providing accurate information based on the terms provided.",
          discussion: userMessage,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setMessages(prev => [...prev, { type: 'assistant', content: data.data.answer }]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (err) {
      setError(err.message);
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="extension-container">
      <div className="header">
        <h1>Trus<span>Terms</span></h1>
      </div>

      <div className="content">
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {termsContent ? (
          <div className="terms-detected">
            <div className="card">
              <h2>Terms Detected</h2>
              <p>{new URL(termsContent.url).hostname}</p>
            </div>

            {!analysis && !loading && (
              <button onClick={analyzeTerms} className="analyze-button">
                Analyze Terms
              </button>
            )}

            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Analyzing terms...</p>
              </div>
            )}

            {analysis && (
              <div className="analysis-result">
                {/* Scores section first */}
                <div className="card">
                  {analysis.scores && <ScoreDisplay scores={analysis.scores} />}
                </div>

                {/* Key information section */}
                <div className="card summary mt-6">
                  <h3 className="text-xl font-bold mb-4">Key Information</h3>
                  <div className="key-info space-y-3">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-semibold mb-1">Data Collection</p>
                      <p className="text-gray-700">{analysis.data_collected}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-semibold mb-1">Fees</p>
                      <p className="text-gray-700">{analysis.fees}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-semibold mb-1">Subscription Cancellation</p>
                      <p className="text-gray-700">{analysis.subscription_cancellation}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-semibold mb-1">Support Contact</p>
                      <p className="text-gray-700">{analysis.support_contact}</p>
                    </div>
                  </div>
                </div>

                <div className="chat-section mt-6">
                  <div className="chat-messages">
                    {messages.map((message, index) => (
                      <div key={index} className={`message ${message.type}`}>
                        <p><ReactMarkdown>{message.content}</ReactMarkdown></p>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="loading-chat">
                        <div className="spinner-small"></div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="chat-input">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ask about these terms..."
                    />
                    <button type="submit" disabled={!newMessage.trim() || chatLoading}>
                  <IoIosSend size={24} />
                </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-terms">
            <p>No terms detected. Please visit a page with terms and conditions.</p>
          </div>
        )}
      </div>
    </div>
  );
}