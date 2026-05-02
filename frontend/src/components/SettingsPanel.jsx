import React, { useState } from 'react';

function SettingsPanel({ apiConfig, onConfigChange, onClose, rightOffset = 0 }) {
  const [localConfig, setLocalConfig] = useState(apiConfig);

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: rightOffset,
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
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>设置</h3>
        <button
          onClick={onClose}
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
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#333' }}>
          火山方舟 API 配置
        </h4>
        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px 0' }}>
          配置火山方舟平台的 API 密钥以启用 AI 功能（笔迹识别、自然语言生成等）
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '6px',
            color: '#333'
          }}>
            API Key
          </label>
          <input
            type="password"
            value={localConfig.apiKey}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="输入您的 API Key"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '6px',
            color: '#333'
          }}>
            模型名称
          </label>
          <input
            type="text"
            value={localConfig.modelName}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, modelName: e.target.value }))}
            placeholder="例如: doubao-pro-32k"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
          <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
            在火山方舟控制台获取部署的模型端点 ID
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '6px',
            color: '#333'
          }}>
            API 端点
          </label>
          <input
            type="text"
            value={localConfig.endpoint}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, endpoint: e.target.value }))}
            placeholder="API 端点 URL"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>如何获取 API Key？</strong>
          </p>
          <ol style={{ margin: 0, paddingLeft: '16px' }}>
            <li>访问 <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>火山方舟控制台</a></li>
            <li>创建 API Key</li>
            <li>部署一个模型（如 doubao-pro）</li>
            <li>获取模型的端点 ID</li>
          </ol>
        </div>
      </div>

      <div style={{
        padding: '16px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '8px 16px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '8px 16px',
            border: 'none',
            backgroundColor: '#4f46e5',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          保存设置
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;
