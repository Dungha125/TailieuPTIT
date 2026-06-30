import {
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileZipOutlined,
  FileOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Table, Tag, Tooltip, Pagination } from 'antd';
import { formatDate, formatFileSize, getFileIcon } from '../../utils/helpers';
import EmptyState from './EmptyState';

const FILE_ICONS = {
  image: FileImageOutlined,
  pdf: FilePdfOutlined,
  doc: FileWordOutlined,
  zip: FileZipOutlined,
  file: FileOutlined,
};

const DocThumbnail = ({ fileType }) => {
  const iconKey = getFileIcon(fileType);
  const Icon = FILE_ICONS[iconKey] || FileOutlined;
  return (
    <div className="doc-thumb">
      <Icon />
    </div>
  );
};

const DocumentListTable = ({
  documents,
  loading,
  selectedRowKeys,
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  pagination,
  onPageChange,
  bulkActions,
  canDelete = true,
}) => {
  const columns = [
    {
      title: '',
      key: 'thumb',
      width: 60,
      render: (_, record) => <DocThumbnail fileType={record.file_type} />,
    },
    {
      title: 'Tài liệu',
      key: 'title',
      render: (_, record) => (
        <div className="doc-title-cell">
          <div className="doc-title-cell__name">{record.title}</div>
          {record.description && (
            <div className="doc-title-cell__desc">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 180,
      render: (tags) =>
        tags?.length ? (
          tags.slice(0, 2).map((t) => (
            <Tag key={t.id} color="red" style={{ borderRadius: 12, marginBottom: 2 }}>
              {t.name}
            </Tag>
          ))
        ) : (
          <Tag style={{ borderRadius: 12 }}>Chưa phân loại</Tag>
        ),
    },
    {
      title: 'Loại',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 70,
      render: (v) => v?.toUpperCase(),
    },
    {
      title: 'Ngày upload',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v) => formatDate(v),
    },
    {
      title: 'Dung lượng',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (v) => formatFileSize(v),
    },
    {
      title: 'Lượt tải',
      dataIndex: 'download_count',
      key: 'download_count',
      width: 90,
      align: 'center',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      render: (v) => (
        <span className={`status-badge status-badge--${v ? 'public' : 'private'}`}>
          {v ? 'Public' : 'Private'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Xem">
            <button type="button" className="action-btn" onClick={() => onView(record)}>
              <EyeOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Sửa">
            <button type="button" className="action-btn" onClick={() => onEdit(record)}>
              <EditOutlined />
            </button>
          </Tooltip>
          {canDelete && (
            <Tooltip title="Xóa">
              <button
                type="button"
                className="action-btn action-btn--danger"
                onClick={() => onDelete(record)}
              >
                <DeleteOutlined />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  if (!loading && documents.length === 0) {
    return (
      <div className="admin-doc-panel">
        <EmptyState
          title="Chưa có tài liệu"
          description="Hãy upload tài liệu mới hoặc thử thay đổi bộ lọc"
        />
      </div>
    );
  }

  return (
    <div className="admin-doc-panel">
      {bulkActions && selectedRowKeys?.length > 0 && (
        <div className="admin-doc-panel__toolbar">
          <span className="admin-doc-panel__title">Đã chọn {selectedRowKeys.length} tài liệu</span>
          {bulkActions}
        </div>
      )}
      <Table
        dataSource={documents}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 1100 }}
        rowSelection={
          canDelete
            ? {
                selectedRowKeys,
                onChange: onSelectionChange,
              }
            : undefined
        }
      />
      {pagination && pagination.total > pagination.pageSize && (
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={onPageChange}
            showSizeChanger={false}
            showTotal={(total) => `${total} tài liệu`}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentListTable;
