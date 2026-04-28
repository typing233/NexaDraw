import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import SettingsPanel from './components/SettingsPanel';
import CollaborationPanel from './components/CollaborationPanel';
import AIPanel from './components/AIPanel';
import { useCollaboration } from './hooks/useCollaboration';
import { v4 as uuidv4 } from 'uuid';

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
  const [collaborators, setCollaborators] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  
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

  const handleJoinRoom = (id) => {
    setRoomId(id);
    joinRoom(id);
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
            onClick={() => setShowAIPanel(!showAIPanel)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4f46e5',
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
              backgroundColor: '#f0f0f0',
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
          onCursorMove={(position) => {
            if (roomId && isConnected) {
              sendCursorUpdate(roomId, position);
            }
          }}
        />

        {showSettings && (
          <SettingsPanel
            apiConfig={apiConfig}
            onConfigChange={setApiConfig}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showAIPanel && (
          <AIPanel
            apiConfig={apiConfig}
            onGenerate={handleAIGenerate}
            onAutoOrganize={handleAutoOrganize}
            elements={elements}
            onClose={() => setShowAIPanel(false)}
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
