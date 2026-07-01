import { useEffect, useMemo, useState } from 'react';
import { Card, Col, List, Row, Spin, Tag } from 'antd';
import {
  CalendarOutlined,
  EditOutlined,
  LeftOutlined,
  PushpinFilled,
  RightOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { notesApi, userApi } from '../../api';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const NotesOverview = ({ onOpenNote }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dates, setDates] = useState({});
  const [selected, setSelected] = useState(dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()));
  const [quota, setQuota] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      notesApi.calendar(year, month),
      notesApi.quota(),
      userApi.dashboard(),
    ])
      .then(([calRes, quotaRes, dashRes]) => {
        setDates(calRes.data.dates || {});
        setQuota(quotaRes.data);
        setDashboard(dashRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const selectedNotes = dates[selected] || [];

  const shiftMonth = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });

  if (loading && !dashboard) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="notes-overview">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="notes-overview__stat">
            <EditOutlined /> {dashboard?.note_count ?? 0} ghi chú
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="notes-overview__stat">
            <CalendarOutlined /> {Object.keys(dates).length} ngày có hoạt động
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="notes-overview__stat">
            <StarOutlined /> {dashboard?.bookmark_count ?? 0} bookmark
          </Card>
        </Col>
      </Row>

      {quota?.storage_warning && (
        <Card className="notes-overview__warn" size="small">
          Dung lượng ghi chú sắp đầy — hãy xóa bớt ghi chú để có thêm không gian lưu trữ.
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title="Lịch ghi chú"
            extra={
              <div className="notes-calendar__nav">
                <button type="button" className="notes-calendar__nav-btn" onClick={() => shiftMonth(-1)}>
                  <LeftOutlined />
                </button>
                <span className="notes-calendar__month">{monthLabel}</span>
                <button type="button" className="notes-calendar__nav-btn" onClick={() => shiftMonth(1)}>
                  <RightOutlined />
                </button>
              </div>
            }
          >
            <div className="notes-calendar__weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="notes-calendar__grid">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="notes-calendar__cell notes-calendar__cell--empty" />;
                const key = dateKey(year, month, day);
                const count = dates[key]?.length || 0;
                const isSelected = selected === key;
                const isToday = key === dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
                return (
                  <button
                    key={key}
                    type="button"
                    className={`notes-calendar__cell ${isSelected ? 'notes-calendar__cell--selected' : ''} ${isToday ? 'notes-calendar__cell--today' : ''}`}
                    onClick={() => setSelected(key)}
                  >
                    <span>{day}</span>
                    {count > 0 && <span className="notes-calendar__dot">{count}</span>}
                  </button>
                );
              })}
            </div>
            <p className="notes-calendar__hint">Chấm đỏ = có ghi chú cập nhật trong ngày. Bấm ngày để xem chi tiết.</p>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={`Ghi chú ngày ${selected.split('-').reverse().join('/')}`}>
            {selectedNotes.length === 0 ? (
              <div className="notes-overview__empty">Không có ghi chú nào trong ngày này</div>
            ) : (
              <List
                dataSource={selectedNotes}
                renderItem={(item) => (
                  <List.Item>
                    <button
                      type="button"
                      className="notes-overview__note-link"
                      onClick={() => onOpenNote?.(item.id)}
                    >
                      {item.is_pinned && <PushpinFilled style={{ color: '#c62828', marginRight: 6 }} />}
                      {item.title}
                    </button>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title="Ghi chú gần đây" style={{ marginTop: 16 }}>
            <List
              dataSource={dashboard?.recent_notes || []}
              renderItem={(n) => (
                <List.Item>
                  <button type="button" className="notes-overview__note-link" onClick={() => onOpenNote?.(n.id)}>
                    {n.title}
                  </button>
                </List.Item>
              )}
            />
          </Card>

          <Card title="Tài liệu đã xem" style={{ marginTop: 16 }}>
            <List
              dataSource={dashboard?.recent_documents || []}
              renderItem={(d) => (
                <List.Item>
                  <Link to={d.slug ? `/tai-lieu/${d.slug}` : `/documents/${d.id}`}>{d.title}</Link>
                  <Tag>{d.file_type}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NotesOverview;
