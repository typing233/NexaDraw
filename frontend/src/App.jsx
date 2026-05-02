import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SettingsPanel from './components/SettingsPanel';
import CollaborationPanel from './components/CollaborationPanel';
import AIPanel from './components/AIPanel';
import { useCollaboration } from './hooks/useCollaboration';
import { v4 as uuidv4 } from 'uuid';
import { THEMES, getTheme, applyThemeToAllElements } from './utils/themes';

const TOOLS = {
  SELECT: 'select',
  HAND: 'hand',
  PENCIL: 'pencil',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  LINE: 'line',
  TEXT: 'text'
};

function App() {
  const [currentTool, setCurrentTool] = useState(TOOLS.SELECT);
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [userId] = useState(() => uuidv4());
  const [userName, setUserName] = useState(() => {
    const randomName = `用户${Math.floor(Math.random() * 10000)}`;
    return localStorage.getItem('nexadraw_username') || randomName;
  });
  const [roomId, setRoomId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('nexadraw_theme') || 'default';
  });
  
  const [apiConfig, setApiConfig] = useState(() => {
    const saved = localStorage.getItem('nexadraw_api_config');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      modelName: 'doubao-pro-32k',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    };
  });

  const { isConnected, joinRoom, leaveRoom, sendElementUpdate, sendElementDelete, sendCursorUpdate } = useCollaboration({
    userId,
    userName,
    onElementUpdate: (element) => {
      setElements(prev => {
        const existingIndex = prev.findIndex(e => e.id === element.id);
        if (existingIndex >= 0) {
          const newElements = [...prev];
          newElements[existingIndex] = element;
          return newElements;
        }
        return [...prev, element];
      });
    },
    onElementDelete: (elementId) => {
      setElements(prev => prev.filter(e => e.id !== elementId));
    },
    onUserJoined: (user) => {
      setCollaborators(prev => [...prev.filter(u => u.id !== user.id), user]);
    },
    onUserLeft: (userId) => {
      setCollaborators(prev => prev.filter(u => u.id !== userId));
      setCursorPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[userId];
        return newPositions;
      });
    },
    onCursorUpdate: (uid, position) => {
      setCursorPositions(prev => ({
        ...prev,
        [uid]: position
      }));
    },
    onRoomData: (data) => {
      setElements(data.elements);
      setCollaborators(data.users.filter(u => u.id !== userId));
    }
  });

  useEffect(() => {
    localStorage.setItem('nexadraw_username', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('nexadraw_api_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem('nexadraw_theme', currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (themeName) => {
    const updatedElements = applyThemeToAllElements(elements, themeName);
    setElements(updatedElements);
    
    if (roomId && isConnected) {
      updatedElements.forEach(element => {
        sendElementUpdate(roomId, element);
      });
    }
    
    setCurrentTheme(themeName);
    setShowThemePanel(false);
  };

  const handleElementUpdate = (element) => {
    setElements(prev => {
      const existingIndex = prev.findIndex(e => e.id === element.id);
      if (existingIndex >= 0) {
        const newElements = [...prev];
        newElements[existingIndex] = element;
        return newElements;
      }
      return [...prev, element];
    });
    if (roomId && isConnected) {
      sendElementUpdate(roomId, element);
    }
  };

  const handleElementDelete = (elementId) => {
    setElements(prev => prev.filter(e => e.id !== elementId));
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
    if (roomId && isConnected) {
      sendElementDelete(roomId, elementId);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedElementId) {
      handleElementDelete(selectedElementId);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const response = await fetch('/api/create-room');
      const data = await response.json();
      setRoomId(data.roomId);
      joinRoom(data.roomId);
    } catch (error) {
      console.error('创建房间失败:', error);
    }
  };

  const handleJoinRoom = (roomId) => {
    setRoomId(roomId);
    joinRoom(roomId);
  };

  const handleLeaveRoom = () => {
    if (roomId) {
      leaveRoom(roomId);
    }
    setRoomId(null);
    setCollaborators([]);
    setCursorPositions({});
  };

  const handleAIGenerate = (elements) => {
    setElements(prev => [...prev, ...elements]);
    elements.forEach(element => {
      if (roomId && isConnected) {
        sendElementUpdate(roomId, element);
      }
    });
  };

  const handleAutoOrganize = (organizedElements) => {
    setElements(organizedElements);
    organizedElements.forEach(element => {
      if (roomId && isConnected) {
        sendElementUpdate(roomId, element);
      }
    });
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#fafafa'
    }}>
      <header style={{
        height: '48px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>NexaDraw</h1>
          {roomId && (
            <span style={{ 
              fontSize: '12px', 
              color: '#666', 
              backgroundColor: '#f0f0f0',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              房间: {roomId}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="用户名"
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              width: '120px'
            }}
          />
          <button
            onClick={() => setShowThemePanel(!showThemePanel)}
            style={{
              padding: '6px 12px',
              backgroundColor: showThemePanel ? '#6d28d9' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{getTheme(currentTheme)?.icon || '🎨'} 主题</span>
          </button>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            style={{
              padding: '6px 12px',
              backgroundColor: showAIPanel ? '#3730a3' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>AI 功能</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '6px 12px',
              backgroundColor: showSettings ? '#e0e0e0' : '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            设置
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        <Toolbar 
          currentTool={currentTool} 
          onToolChange={setCurrentTool} 
          tools={TOOLS}
          selectedElementId={selectedElementId}
          onDelete={handleDeleteSelected}
        />
        
        <Canvas
          currentTool={currentTool}
          elements={elements}
          onElementUpdate={handleElementUpdate}
          onElementDelete={handleElementDelete}
          collaborators={collaborators}
          cursorPositions={cursorPositions}
          userId={userId}
          roomId={roomId}
          isConnected={isConnected}
          apiConfig={apiConfig}
          selectedElementId={selectedElementId}
          onSelectedElementChange={setSelectedElementId}
          onSendCursorUpdate={sendCursorUpdate}
          currentTheme={currentTheme}
        />

        {showSettings && (
          <SettingsPanel
            apiConfig={apiConfig}
            onConfigChange={setApiConfig}
            onClose={() => setShowSettings(false)}
            rightOffset={(showThemePanel ? 320 : 0) + (showAIPanel ? 360 : 0)}
          />
        )}

        {showThemePanel && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '320px',
            height: '100%',
            backgroundColor: 'white',
            borderLeft: '1px solid #e0e0e0',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>🎨 主题风格</h3>
              <button
                onClick={() => setShowThemePanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '20px',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px 0' }}>
                选择一个主题风格，所有图形将自动应用新的颜色、阴影和线条样式
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeChange(key)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: currentTheme === key ? '#ede9fe' : '#fafafa',
                      border: currentTheme === key ? '2px solid #8b5cf6' : '1px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme !== key) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentTheme !== key) {
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '28px' }}>{theme.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: currentTheme === key ? 600 : 500,
                          color: currentTheme === key ? '#7c3aed' : '#333'
                        }}>
                          {theme.name}
                          {currentTheme === key && <span style={{ marginLeft: '8px' }}>✓</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {theme.description}
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '6px', 
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px dashed #ddd'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: theme.colors.primary
                      }} />
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: theme.colors.secondary
                      }} />
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: theme.colors.accent
                      }} />
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: theme.colors.background,
                        border: '1px solid #ddd'
                      }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showAIPanel && (
          <AIPanel
            apiConfig={apiConfig}
            onGenerate={handleAIGenerate}
            onAutoOrganize={handleAutoOrganize}
            onElementUpdate={handleElementUpdate}
            elements={elements}
            onClose={() => setShowAIPanel(false)}
            rightOffset={showThemePanel ? 320 : 0}
          />
        )}

        <CollaborationPanel
          roomId={roomId}
          isConnected={isConnected}
          collaborators={collaborators}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
        />
      </div>
    </div>
  );
}

export default App;
