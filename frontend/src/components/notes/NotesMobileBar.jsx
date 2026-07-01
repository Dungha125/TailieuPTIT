import { Button } from 'antd';
import {
  ArrowLeftOutlined,
  MenuOutlined,
  PlusOutlined,
} from '@ant-design/icons';

const NotesMobileBar = ({
  showBack,
  title,
  canCreateNote,
  onMenuOpen,
  onBack,
  onCreateNote,
}) => (
  <div className="notes-mobile-bar">
    {showBack ? (
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
        Danh sách
      </Button>
    ) : (
      <Button type="text" icon={<MenuOutlined />} onClick={onMenuOpen}>
        Menu
      </Button>
    )}
    <span className="notes-mobile-bar__title">{title}</span>
    {!showBack && (
      <Button
        type="primary"
        size="small"
        icon={<PlusOutlined />}
        className="btn-gradient"
        disabled={!canCreateNote}
        onClick={onCreateNote}
      >
        Mới
      </Button>
    )}
  </div>
);

export default NotesMobileBar;
