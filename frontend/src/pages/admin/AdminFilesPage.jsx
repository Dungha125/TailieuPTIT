import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Form, message } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  FolderOutlined,
  RiseOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { documentPath } from '../../seo/seoConfig';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import StatsSkeleton from '../../components/admin/StatsSkeleton';
import DocumentFilters from '../../components/admin/DocumentFilters';
import DocumentListTable from '../../components/admin/DocumentListTable';
import EditDocumentModal from '../../components/admin/EditDocumentModal';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

const PAGE_SIZE = 15;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const sortDocuments = (docs, sort) => {
  const list = [...docs];
  switch (sort) {
    case 'date_asc':
      return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'downloads_desc':
      return list.sort((a, b) => b.download_count - a.download_count);
    case 'size_desc':
      return list.sort((a, b) => b.size - a.size);
    default:
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

const AdminFilesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    tagId: null,
    sort: 'date_desc',
  });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: searchParams.get('search') || '' }));
    setPage(1);
  }, [searchParams]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([adminApi.listDocuments(), documentsApi.tags()])
      .then(([docsRes, tagsRes]) => {
        setDocuments(docsRes.data);
        setTags(tagsRes.data.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const newThisWeek = documents.filter(
      (d) => now - new Date(d.created_at).getTime() < WEEK_MS
    ).length;
    return {
      total: documents.length,
      downloads: documents.reduce((sum, d) => sum + (d.download_count || 0), 0),
      categories: tags.length,
      newThisWeek,
    };
  }, [documents, tags]);

  const filtered = useMemo(() => {
    let result = documents;
    const q = filters.search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
      );
    }
    if (filters.tagId) {
      result = result.filter((d) => d.tags?.some((t) => t.id === filters.tagId));
    }
    return sortDocuments(result, filters.sort);
  }, [documents, filters]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleFilterChange = (next) => {
    setFilters(next);
    setPage(1);
    if (next.search) {
      setSearchParams({ search: next.search });
    } else {
      setSearchParams({});
    }
  };

  const handleReset = () => {
    setFilters({ search: '', tagId: null, sort: 'date_desc' });
    setSearchParams({});
    setPage(1);
  };

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      visibility: record.visibility,
      tag_ids: record.tags?.map((t) => t.id),
    });
  };

  const handleUpdate = async (values) => {
    try {
      await adminApi.updateDocument(editing.id, values);
      message.success('Cập nhật thành công');
      setEditing(null);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      if (deleteTarget?.bulk) {
        await Promise.all(deleteTarget.ids.map((id) => adminApi.deleteDocument(id)));
        message.success(`Đã xóa ${deleteTarget.ids.length} tài liệu`);
        setSelectedRowKeys([]);
      } else {
        await adminApi.deleteDocument(deleteTarget.id);
        message.success('Xóa thành công');
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const handleView = (record) => {
    window.open(documentPath(record), '_blank');
  };

  return (
    <div>
      <PageHeader
        title="Quản lý tài liệu"
        subtitle="Xem, chỉnh sửa và quản lý toàn bộ tài liệu hệ thống"
        breadcrumbs={[{ label: 'Quản lý tài liệu' }]}
      />

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="admin-stats">
          <StatCard icon={<FileTextOutlined />} label="Tổng tài liệu" value={stats.total} color="red" />
          <StatCard icon={<DownloadOutlined />} label="Tổng lượt tải" value={stats.downloads} color="blue" />
          <StatCard icon={<FolderOutlined />} label="Số danh mục" value={stats.categories} color="green" />
          <StatCard
            icon={<RiseOutlined />}
            label="Mới tuần này"
            value={stats.newThisWeek}
            trend={stats.newThisWeek > 0 ? `+${stats.newThisWeek} tài liệu` : undefined}
            color="orange"
          />
        </div>
      )}

      <DocumentFilters
        tags={tags}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          className="btn-gradient"
          icon={<PlusOutlined />}
          onClick={() => navigate('/internal-admin-portal/upload')}
        >
          Upload tài liệu
        </Button>
      </div>

      <DocumentListTable
        documents={paginated}
        loading={loading}
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        onEdit={handleEdit}
        onDelete={(record) => setDeleteTarget({ id: record.id, title: record.title })}
        onView={handleView}
        pagination={{ current: page, pageSize: PAGE_SIZE, total: filtered.length }}
        onPageChange={setPage}
        bulkActions={
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              setDeleteTarget({ bulk: true, ids: selectedRowKeys, title: '' })
            }
          >
            Xóa đã chọn
          </Button>
        }
      />

      <EditDocumentModal
        open={!!editing}
        document={editing}
        tags={tags}
        form={form}
        onCancel={() => setEditing(null)}
        onSubmit={handleUpdate}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={deleteTarget?.title}
        count={deleteTarget?.bulk ? deleteTarget.ids.length : 1}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminFilesPage;
