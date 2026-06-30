import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spin } from 'antd';
import { documentsApi } from '../api';
import { documentPath } from '../seo/seoConfig';

const DocumentLegacyRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    documentsApi
      .get(id)
      .then((res) => {
        const path = documentPath(res.data);
        navigate(path, { replace: true });
      })
      .catch(() => navigate('/documents', { replace: true }));
  }, [id, navigate]);

  return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <Spin size="large" />
    </div>
  );
};

export default DocumentLegacyRedirect;
