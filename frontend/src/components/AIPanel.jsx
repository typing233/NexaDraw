import React, { useState } from 'react';
import { generateFromPrompt, autoOrganizeElements } from '../utils/aiService';

function AIPanel({ apiConfig, onGenerate, onAutoOrganize, elements, onClose, rightOffset = 0 }) {
  const [prompt, setPrompt] = useState('');
  const [chartType, setChartType] = useState('flowchart');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    if (!apiConfig.apiKey) {
      alert('请先在设置中配置API Key');
      return;
    }

    setIsGenerating(true);
    try {
      const generatedElements = await generateFromPrompt(
        prompt,
        chartType,
        apiConfig
      );
      if (generatedElements && generatedElements.length > 0) {
        onGenerate(generatedElements);
        setPrompt('');
      }
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoOrganize = async () => {
    if (elements.length === 0) {
      alert('画布上没有可整理的元素');
      return;
    }

    if (!apiConfig.apiKey) {
      alert('请先在设置中配置API Key');
      return;
    }

    setIsOrganizing(true);
    try {
      const organizedElements = await autoOrganizeElements(
        elements,
        apiConfig
      );
      if (organizedElements && organizedElements.length > 0) {
        onAutoOrganize(organizedElements);
      }
    } catch (error) {
      console.error('整理失败:', error);
      alert('整理失败: ' + error.message);
    } finally {
      setIsOrganizing(false);
    }
  };

  const examplePrompts = {
    flowchart: [
      '用户登录流程：输入账号密码 -> 验证 -> 成功进入主页，失败显示错误',
      '订单处理：创建订单 -> 支付 -> 发货 -> 收货 -> 完成',
      '用户注册：填写信息 -> 验证邮箱 -> 设置密码 -> 完成'
    ],
    mindmap: [
      '产品开发：需求分析 -> UI设计 -> 前端开发 -> 后端开发 -> 测试 -> 上线',
      '学习计划：数学 -> 代数 -> 几何，英语 -> 词汇 -> 语法',
      '项目管理：范围 -> 时间 -> 成本 -> 质量 -> 风险 -> 沟通'
    ],
    relation: [
      '公司组织架构：CEO -> CTO, CFO, COO -> 各部门',
      '产品结构：汽车 -> 发动机 -> 气缸、活塞，底盘 -> 车轮、悬挂',
      '家族关系：祖父母 -> 父母 -> 子女'
    ]
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: rightOffset,
      width: '360px',
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
        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>AI 功能</h3>
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
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            color: '#333'
          }}>
            🎨 自然语言生成图表
          </h4>
          <p style={{
            fontSize: '12px',
            color: '#666',
            margin: '0 0 16px 0'
          }}>
            输入一段自然语言描述，系统将自动生成对应的图表
          </p>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '6px',
              color: '#333'
            }}>
              图表类型
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: 'flowchart', label: '流程图' },
                { value: 'mindmap', label: '思维导图' },
                { value: 'relation', label: '关系图' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setChartType(option.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: chartType === option.value ? '1px solid #4f46e5' : '1px solid #ddd',
                    backgroundColor: chartType === option.value ? '#eef2ff' : 'white',
                    color: chartType === option.value ? '#4f46e5' : '#666',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: chartType === option.value ? 500 : 400
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '6px',
              color: '#333'
            }}>
              描述内容
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：用户登录流程，输入账号密码后验证，成功进入主页，失败显示错误信息"
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontSize: '12px',
              color: '#999',
              margin: '0 0 8px 0'
            }}>
              示例提示：
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {examplePrompts[chartType].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(example)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: 1.4
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isGenerating || !prompt.trim() ? '#94a3b8' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? (
              <>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                正在生成...
              </>
            ) : (
              '生成图表'
            )}
          </button>
        </div>

        <div style={{
          borderTop: '1px solid #e0e0e0',
          paddingTop: '24px'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            color: '#333'
          }}>
            📐 自动整理画布
          </h4>
          <p style={{
            fontSize: '12px',
            color: '#666',
            margin: '0 0 16px 0'
          }}>
            自动分析画布上的元素关系，统一对齐和结构化整理
          </p>

          <div style={{
            backgroundColor: '#fefce8',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#854d0e',
              margin: 0,
              lineHeight: 1.5
            }}>
              <strong>提示：</strong>当前画布有 {elements.length} 个元素。
              系统将分析元素之间的连接关系、位置关系，进行智能对齐和重新布局。
            </p>
          </div>

          <button
            onClick={handleAutoOrganize}
            disabled={isOrganizing || elements.length === 0}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isOrganizing || elements.length === 0 ? '#94a3b8' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isOrganizing || elements.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isOrganizing ? (
              <>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                正在整理...
              </>
            ) : (
              '自动整理画布'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
