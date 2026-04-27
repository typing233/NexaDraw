import React, { useState } from 'react';

function CollaborationPanel({
  roomId,
  isConnected,
  collaborators,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom
}) {
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleCopyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        alert('房间号已复制到剪贴板');
      });
    }
  };

  const handleJoin = () => {
    if (joinRoomInput.trim()) {
      onJoinRoom(joinRoomInput.trim());
      setJoinRoomInput('');
      setShowJoinInput(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '60px',
      right: '16px',
      width: '280px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 50,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#334155' }}>
          实时协作
        </h4>
        {isConnected && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: '#22c55e'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e'
            }} />
            已连接
          </span>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {!roomId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              创建或加入一个房间开始实时协作
            </p>
            
            <button
              onClick={onCreateRoom}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              创建新房间
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '4px 0'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>或</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            </div>

            {!showJoinInput ? (
              <button
                onClick={() => setShowJoinInput(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'white',
                  color: '#4f46e5',
                  border: '1px solid #4f46e5',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                加入现有房间
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={joinRoomInput}
                  onChange={(e) => setJoinRoomInput(e.target.value)}
                  placeholder="输入房间号"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleJoin}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  加入
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                marginBottom: '4px'
              }}>
                房间号
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <div style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1e293b'
                }}>
                  {roomId}
                </div>
                <button
                  onClick={handleCopyRoomId}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  复制
                </button>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                marginBottom: '8px'
              }}>
                在线用户 ({collaborators.length + 1})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '4px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#22c55e'
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>
                    你
                  </span>
                </div>
                {collaborators.map(collaborator => (
                  <div key={collaborator.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6'
                    }} />
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                      {collaborator.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onLeaveRoom}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                marginTop: '8px'
              }}
            >
              离开房间
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborationPanel;
