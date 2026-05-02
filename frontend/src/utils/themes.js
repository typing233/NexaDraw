const THEMES = {
  default: {
    name: '默认风格',
    description: '简洁现代的默认样式',
    icon: '🎨',
    colors: {
      primary: '#1e1e1e',
      secondary: '#666666',
      accent: '#4f46e5',
      background: '#fafafa',
      grid: '#dddddd'
    },
    strokes: {
      width: 2,
      dasharray: null,
      linecap: 'round',
      linejoin: 'round'
    },
    effects: {
      shadow: false,
      glow: false,
      roundedness: 4,
      paperTexture: false,
      handwriting: false
    },
    pencil: {
      size: 2,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5
    }
  },
  tech: {
    name: '科技风',
    description: '未来感、科技感的赛博朋克风格',
    icon: '⚡',
    colors: {
      primary: '#00ffcc',
      secondary: '#0ea5e9',
      accent: '#8b5cf6',
      background: '#0a0a1a',
      grid: '#1e1e3e'
    },
    strokes: {
      width: 2.5,
      dasharray: null,
      linecap: 'round',
      linejoin: 'round'
    },
    effects: {
      shadow: true,
      shadowColor: 'rgba(0, 255, 204, 0.3)',
      shadowBlur: 15,
      glow: true,
      glowColor: '#00ffcc',
      glowBlur: 8,
      roundedness: 2,
      paperTexture: false,
      handwriting: false
    },
    pencil: {
      size: 2.5,
      thinning: 0.3,
      smoothing: 0.3,
      streamline: 0.7
    }
  },
  handdrawn: {
    name: '手绘风',
    description: '温暖、自然的手绘风格',
    icon: '✏️',
    colors: {
      primary: '#5c4033',
      secondary: '#8b7355',
      accent: '#d4a574',
      background: '#fdfbf7',
      grid: '#e8e0d5'
    },
    strokes: {
      width: 2,
      dasharray: null,
      linecap: 'round',
      linejoin: 'round'
    },
    effects: {
      shadow: false,
      glow: false,
      roundedness: 8,
      paperTexture: true,
      paperTextureColor: 'rgba(139, 115, 85, 0.03)',
      handwriting: true,
      jitterAmount: 1.5
    },
    pencil: {
      size: 2.5,
      thinning: 0.6,
      smoothing: 0.7,
      streamline: 0.3
    }
  },
  retroFuturism: {
    name: '复古未来风',
    description: '80年代霓虹风与几何设计',
    icon: '🌆',
    colors: {
      primary: '#ff006e',
      secondary: '#8338ec',
      accent: '#06ffa5',
      background: '#1a0a2e',
      grid: '#2e1a4e'
    },
    strokes: {
      width: 3,
      dasharray: '8,4',
      linecap: 'round',
      linejoin: 'round'
    },
    effects: {
      shadow: true,
      shadowColor: 'rgba(255, 0, 110, 0.4)',
      shadowBlur: 20,
      glow: true,
      glowColor: '#ff006e',
      glowBlur: 12,
      roundedness: 0,
      paperTexture: false,
      handwriting: false,
      gradient: true,
      gradientColors: ['#ff006e', '#8338ec', '#06ffa5']
    },
    pencil: {
      size: 3,
      thinning: 0.4,
      smoothing: 0.4,
      streamline: 0.6
    }
  },
  minimal: {
    name: '简约风',
    description: '极简主义，黑白灰搭配',
    icon: '◻️',
    colors: {
      primary: '#1a1a1a',
      secondary: '#666666',
      accent: '#333333',
      background: '#ffffff',
      grid: '#f0f0f0'
    },
    strokes: {
      width: 1.5,
      dasharray: null,
      linecap: 'butt',
      linejoin: 'miter'
    },
    effects: {
      shadow: false,
      glow: false,
      roundedness: 0,
      paperTexture: false,
      handwriting: false
    },
    pencil: {
      size: 1.5,
      thinning: 0.2,
      smoothing: 0.2,
      streamline: 0.8
    }
  },
  playful: {
    name: '活泼风',
    description: '明亮、活泼的卡通风格',
    icon: '🎈',
    colors: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      accent: '#ffe66d',
      background: '#f7fff7',
      grid: '#e8f4ea'
    },
    strokes: {
      width: 2.5,
      dasharray: null,
      linecap: 'round',
      linejoin: 'round'
    },
    effects: {
      shadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowBlur: 8,
      glow: false,
      roundedness: 12,
      paperTexture: false,
      handwriting: false
    },
    pencil: {
      size: 3,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5
    }
  }
};

function getTheme(themeName) {
  return THEMES[themeName] || THEMES.default;
}

function getThemeNames() {
  return Object.keys(THEMES);
}

function applyThemeToElement(element, theme) {
  const themeConfig = getTheme(theme);
  
  if (!themeConfig) return element;
  
  const newElement = { ...element };
  
  if (!element._originalColor) {
    newElement._originalColor = element.color;
  }
  
  if (themeConfig.colors.primary) {
    newElement.color = themeConfig.colors.primary;
  }
  
  if (themeConfig.strokes.width) {
    newElement.strokeWidth = themeConfig.strokes.width;
  }
  
  newElement._theme = theme;
  
  return newElement;
}

function revertThemeFromElement(element) {
  const newElement = { ...element };
  
  if (element._originalColor) {
    newElement.color = element._originalColor;
    delete newElement._originalColor;
  }
  
  delete newElement._theme;
  
  return newElement;
}

function applyThemeToAllElements(elements, theme) {
  return elements.map(el => applyThemeToElement(el, theme));
}

function getRenderStyleForElement(element, theme) {
  const themeConfig = getTheme(theme);
  const style = {};
  
  if (!themeConfig) return style;
  
  const effects = themeConfig.effects;
  
  if (effects.shadow && themeConfig.colors.primary) {
    const shadowColor = effects.shadowColor || 'rgba(0, 0, 0, 0.2)';
    const shadowBlur = effects.shadowBlur || 5;
    style.filter = `drop-shadow(0 0 ${shadowBlur}px ${shadowColor})`;
  }
  
  if (effects.glow && themeConfig.colors.primary) {
    const glowColor = effects.glowColor || themeConfig.colors.primary;
    const glowBlur = effects.glowBlur || 5;
    if (style.filter) {
      style.filter += ` drop-shadow(0 0 ${glowBlur}px ${glowColor})`;
    } else {
      style.filter = `drop-shadow(0 0 ${glowBlur}px ${glowColor})`;
    }
  }
  
  return style;
}

export {
  THEMES,
  getTheme,
  getThemeNames,
  applyThemeToElement,
  revertThemeFromElement,
  applyThemeToAllElements,
  getRenderStyleForElement
};
