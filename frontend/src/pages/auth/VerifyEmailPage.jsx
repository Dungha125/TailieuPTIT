import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { userAuthApi } from '../../api';
import SeoHead from '../../seo/SeoHead';

const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    userAuthApi
      .verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [params]);

  return (
    <div className="auth-page">
      <SeoHead title="Xác thực email | TailieuPTIT" />
      <div className="auth-card auth-card--center">
        {status === 'loading' && <Spin size="large" />}
        {status === 'ok' && (
          <>
            <h1>Email đã xác thực</h1>
            <p>
              <Link to="/login">Đăng nhập ngay</Link>
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Link không hợp lệ</h1>
            <p>Token hết hạn hoặc đã được sử dụng.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
