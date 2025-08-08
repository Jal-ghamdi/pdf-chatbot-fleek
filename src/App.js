import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, FileText, Brain, Loader, MessageSquare, Shield, Zap } from 'lucide-react';

const PDFChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [config, setConfig] = useState({
    geminiApiKey: '',
    pineconeApiKey: '',
    indexName: 'stroke',
    topK: 5
  });
  const [sources, setSources] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulated embedding function (in production, you'd use a proper embedding service)
  const generateEmbedding = async (text) => {
    // This is a placeholder - in a real app, you'd call a proper embedding service
    // For demo purposes, we'll create a mock embedding
    const words = text.toLowerCase().split(' ');
    const embedding = new Array(384).fill(0).map((_, i) => 
      Math.sin(i * words.length) * Math.cos(i * text.length) * 0.1
    );
    return embedding;
  };

  // Simulated Pinecone search
  const searchPinecone = async (queryEmbedding, topK) => {
    // Mock search results - in production, this would call Pinecone API
    const mockResults = [
      {
        id: "doc1-chunk1",
        score: 0.95,
        metadata: {
          source: "stroke_treatment_guidelines.pdf",
          text: "Acute ischemic stroke treatment involves rapid assessment and intervention. Time-sensitive protocols include CT imaging, blood work, and potential thrombolytic therapy within the critical time window."
        }
      },
      {
        id: "doc2-chunk3",
        score: 0.88,
        metadata: {
          source: "rehabilitation_protocols.pdf",
          text: "Post-stroke rehabilitation should begin as early as possible, typically within 24-48 hours of stroke onset. Early mobilization and multidisciplinary care significantly improve patient outcomes."
        }
      },
      {
        id: "doc3-chunk7",
        score: 0.82,
        metadata: {
          source: "stroke_prevention_study.pdf", 
          text: "Primary stroke prevention focuses on managing modifiable risk factors including hypertension, diabetes, smoking cessation, and maintaining healthy cholesterol levels."
        }
      }
    ];
    
    return { matches: mockResults.slice(0, topK) };
  };

  // Gemini API call
  const callGemini = async (prompt) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${config.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isConfigured) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(userMessage);
      
      // Search Pinecone (simulated)
      const searchResults = await searchPinecone(queryEmbedding, config.topK);
      
      // Prepare context for Gemini
      const context = searchResults.matches.map(match => 
        `Document: ${match.metadata.source}\nContent: ${match.metadata.text}`
      ).join('\n\n');

      const prompt = `Based on the following document excerpts, please answer the user's question comprehensively and accurately.

Context from documents:
${context}

User question: ${userMessage}

Instructions:
- Provide a detailed and accurate answer based on the provided context
- If the context doesn't contain enough information, clearly state what's missing
- Cite which documents you're referencing when possible
- Be concise but thorough and don't make up information
- Format your response in a clear, readable manner`;

      // Get response from Gemini
      const response = await callGemini(prompt);
      
      // Set sources for display
      setSources(searchResults.matches);

      // Add assistant message
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        sources: searchResults.matches
      }]);

    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please check your API keys and try again.`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigSave = () => {
    if (!config.geminiApiKey || !config.pineconeApiKey || !config.indexName) {
      alert('Please fill in all required fields');
      return;
    }
    setIsConfigured(true);
    setShowSettings(false);
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: '👋 Hello! I\'m your PDF Knowledge Assistant. I can help you find information from your uploaded documents. What would you like to know?',
      timestamp: new Date()
    }]);
  };

  const clearChat = () => {
    setMessages(isConfigured ? [{
      id: Date.now(),
      role: 'assistant',
      content: '👋 Hello! I\'m your PDF Knowledge Assistant. I can help you find information from your uploaded documents. What would you like to know?',
      timestamp: new Date()
    }] : []);
    setSources([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PDF Knowledge Assistant</h1>
                <p className="text-sm text-gray-600">AI-powered document search and analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isConfigured && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Connected</span>
                </div>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gemini API Key *
                    </label>
                    <input
                      type="password"
                      value={config.geminiApiKey}
                      onChange={(e) => setConfig(prev => ({...prev, geminiApiKey: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your Gemini API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pinecone API Key *
                    </label>
                    <input
                      type="password"
                      value={config.pineconeApiKey}
                      onChange={(e) => setConfig(prev => ({...prev, pineconeApiKey: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your Pinecone API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Index Name *
                    </label>
                    <input
                      type="text"
                      value={config.indexName}
                      onChange={(e) => setConfig(prev => ({...prev, indexName: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., stroke"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Results to Retrieve
                    </label>
                    <select
                      value={config.topK}
                      onChange={(e) => setConfig(prev => ({...prev, topK: parseInt(e.target.value)}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={7}>7</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleConfigSave}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Initialize Assistant
                  </button>
                  
                  {isConfigured && (
                    <button
                      onClick={clearChat}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Clear Chat
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className={showSettings ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col" style={{height: '70vh'}}>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {!isConfigured ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to PDF Knowledge Assistant</h3>
                    <p className="text-gray-600 mb-6">Configure your API keys to start chatting with your documents</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Sample Questions:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• What are the main findings?</li>
                          <li>• Summarize treatment options</li>
                          <li>• Explain the methodology</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• AI-powered responses</li>
                          <li>• Source citations</li>
                          <li>• Real-time search</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl px-4 py-3 rounded-xl ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                          : message.isError
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : 'bg-gray-50 border border-gray-200 text-gray-900'
                      }`}>
                        <div className="flex items-start space-x-2">
                          {message.role === 'assistant' && (
                            <Brain className={`h-5 w-5 mt-0.5 ${message.isError ? 'text-red-500' : 'text-blue-500'}`} />
                          )}
                          <div className="flex-1">
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            
                            {/* Sources */}
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-2 font-medium">Sources:</p>
                                <div className="space-y-2">
                                  {message.sources.map((source, index) => (
                                    <div key={index} className="p-2 bg-white rounded border text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-blue-600">{source.metadata.source}</span>
                                        <span className="text-gray-500">Score: {source.score.toFixed(3)}</span>
                                      </div>
                                      <p className="text-gray-700 line-clamp-2">{source.metadata.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center space-x-2">
                      <Loader className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-gray-600">Searching documents and generating response...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {isConfigured && (
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Ask a question about your documents..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFChatbot;