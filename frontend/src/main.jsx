import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.scss';
import './styles/user-notes.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <h1 style={{ color: '#D32F2F' }}>Đã xảy ra lỗi</h1>
          <p>Vui lòng tải lại trang hoặc xóa cache trình duyệt.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '10px 24px',
              background: '#D32F2F',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
