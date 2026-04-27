import React from 'react';

const TOOL_ICONS = {
  select: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    </svg>
  ),
  hand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </svg>
  ),
  pencil: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    </svg>
  ),
  rectangle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  ),
  circle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  arrow: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14"/>
      <path d="M13 5l7 7-7 7"/>
    </svg>
  ),
  line: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l16 16"/>
    </svg>
  ),
  text: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 5V3h14v2"/>
      <path d="M12 3v18"/>
      <path d="M9 21h6"/>
    </svg>
  )
};

const TOOL_NAMES = {
  select: '选择',
  hand: '手型',
  pencil: '画笔',
  rectangle: '矩形',
  circle: '圆形',
  arrow: '箭头',
  line: '直线',
  text: '文本'
};

function Toolbar({ currentTool, onToolChange, tools, selectedElementId, onDelete }) {
  const toolList = Object.values(tools);

  return (
    <div style={{
      width: '56px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 0',
      gap: '4px'
    }}>
      {toolList.map(tool => (
        <button
          key={tool}
          onClick={() => onToolChange(tool)}
          title={TOOL_NAMES[tool]}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            backgroundColor: currentTool === tool ? '#e0e7ff' : 'transparent',
            color: currentTool === tool ? '#4f46e5' : '#666',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (currentTool !== tool) {
              e.target.style.backgroundColor = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (currentTool !== tool) {
              e.target.style.backgroundColor = 'transparent';
            }
          }}
        >
          {TOOL_ICONS[tool]}
        </button>
      ))}
      
      <div style={{
        width: '32px',
        height: '1px',
        backgroundColor: '#e0e0e0',
        margin: '8px 0'
      }} />
      
      <button
        onClick={onDelete}
        disabled={!selectedElementId}
        title={selectedElementId ? "删除 (Delete)" : "请先选择元素"}
        style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          backgroundColor: selectedElementId ? '#fef2f2' : 'transparent',
          color: selectedElementId ? '#ef4444' : '#999',
          borderRadius: '6px',
          cursor: selectedElementId ? 'pointer' : 'not-allowed'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
  );
}

export default Toolbar;
