import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, List, Tag, Select } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  TableOutlined,
  HighlightOutlined,
  FileTextOutlined,
  FolderOutlined,
  PushpinOutlined,
  PushpinFilled,
  DeleteOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { documentsApi } from '../../api';
import { DocumentLink } from './DocumentLinkExtension';
import { flattenFolders } from './folderUtils';
import { normalizeLinkUrl, openNoteLink } from './linkUtils';
import { useDebouncedValue } from '../../utils/useDebouncedValue';

const NoteEditor = ({
  note,
  folders = [],
  readOnly = false,
  onSave,
  onTitleChange,
  onFolderChange,
  onPinToggle,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(note?.title || '');
  const [linkOpen, setLinkOpen] = useState(false);
  const [urlLinkOpen, setUrlLinkOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [docQuery, setDocQuery] = useState('');
  const [docResults, setDocResults] = useState([]);
  const debouncedQ = useDebouncedValue(docQuery);
  const savedSelectionRef = useRef(null);

  const handleEditorClick = useCallback(
    (_view, _pos, _node, _nodePos, event) => {
      const anchor = event.target?.closest?.('a[href]');
      if (!anchor) return false;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return false;
      event.preventDefault();
      event.stopPropagation();
      openNoteLink(href, { navigate, event });
      return true;
    },
    [navigate]
  );

  const closeUrlLinkModal = useCallback(() => {
    setUrlLinkOpen(false);
    setUrlInput('');
    setDisplayText('');
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: false,
      }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: { class: 'note-link', rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: 'Bắt đầu viết ghi chú...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'note-table' },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      DocumentLink,
    ],
    content: note?.content ? JSON.parse(note.content) : '',
    editorProps: {
      handleClickOn: handleEditorClick,
    },
    onUpdate: ({ editor: ed }) => {
      onSave?.({ content: JSON.stringify(ed.getJSON()) });
    },
  });

  useEffect(() => {
    if (!editor || !note) return;
    setTitle(note.title);
    const parsed = note.content ? JSON.parse(note.content) : '';
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(parsed)) {
      editor.commands.setContent(parsed);
    }
  }, [note?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!linkOpen) return;
    documentsApi
      .browse({ q: debouncedQ, pageSize: 10 })
      .then((res) => setDocResults(res.data.items))
      .catch(() => setDocResults([]));
  }, [debouncedQ, linkOpen]);

  const openUrlLinkModal = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const linkAttrs = editor.getAttributes('link');
    setUrlInput(linkAttrs.href || '');
    setDisplayText(selectedText || '');
    setUrlLinkOpen(true);
  }, [editor]);

  const applyDocumentLink = useCallback(
    (doc) => {
      if (!editor) return;
      const text =
        editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') ||
        doc.title;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          marks: [
            {
              type: 'documentLink',
              attrs: {
                documentId: doc.id,
                slug: doc.slug || '',
                anchorText: text,
                available: true,
              },
            },
          ],
          text,
        })
        .run();
      setLinkOpen(false);
      setDocQuery('');
    },
    [editor]
  );

  const applyUrlLink = useCallback(() => {
    if (!editor) return;
    const href = normalizeLinkUrl(urlInput);
    const text = (displayText || urlInput).trim();
    if (!href || !text) return;

    const saved = savedSelectionRef.current;
    const chain = editor.chain().focus();

    if (saved && saved.from !== saved.to) {
      chain.setTextSelection(saved).deleteSelection();
    }

    chain
      .insertContent({
        type: 'text',
        marks: [
          {
            type: 'link',
            attrs: {
              href,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          },
        ],
        text,
      })
      .run();

    savedSelectionRef.current = null;
    closeUrlLinkModal();
  }, [editor, urlInput, displayText, closeUrlLinkModal]);

  if (!editor) return null;

  const folderOptions = flattenFolders(folders).map((f) => ({ value: f.id, label: f.label }));

  const btn = (active, onClick, icon) => (
    <Button type={active ? 'primary' : 'text'} size="small" icon={icon} onClick={onClick} />
  );

  return (
    <div className="note-editor">
      <div className="note-editor__title-row">
        <Input
          className="note-editor__title"
          variant="borderless"
          value={title}
          placeholder="Tiêu đề"
          readOnly={readOnly}
          onChange={(e) => {
            setTitle(e.target.value);
            onTitleChange?.(e.target.value);
          }}
        />
        <div className="note-editor__actions">
          {readOnly ? (
            <>
              <Button type="primary" icon={<UndoOutlined />} onClick={onRestore}>
                Khôi phục
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={onPermanentDelete}>
                Xóa vĩnh viễn
              </Button>
            </>
          ) : (
            <>
              <Button
                type={note?.is_pinned ? 'primary' : 'default'}
                icon={note?.is_pinned ? <PushpinFilled /> : <PushpinOutlined />}
                onClick={onPinToggle}
              >
                {note?.is_pinned ? 'Bỏ ghim' : 'Ghim'}
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={onMoveToTrash}>
                Xóa
              </Button>
            </>
          )}
        </div>
      </div>
      {!readOnly && (
      <div className="note-editor__meta">
        <FolderOutlined className="note-editor__meta-icon" />
        <Select
          className="note-editor__folder"
          placeholder="Không có thư mục"
          allowClear
          value={note?.folder_id ?? undefined}
          options={folderOptions}
          onChange={(value) => onFolderChange?.(value ?? null)}
        />
        <span className="note-editor__meta-hint">Link ngoài mở tab mới · Ctrl+click mở tab mới (link nội bộ)</span>
      </div>
      )}
      {!readOnly && (
      <div className="note-editor__toolbar">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <BoldOutlined />)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <ItalicOutlined />)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineOutlined />)}
        {btn(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), <HighlightOutlined />)}
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <UnorderedListOutlined />)}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <OrderedListOutlined />)}
        {btn(false, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), <TableOutlined />)}
        {btn(false, () => setLinkOpen(true), <FileTextOutlined />)}
        {btn(false, () => openUrlLinkModal(), <LinkOutlined />)}
      </div>
      )}
      <EditorContent editor={editor} className="note-editor__content" />

      <Modal
        title="Gắn tài liệu nội bộ"
        open={linkOpen}
        onCancel={() => setLinkOpen(false)}
        footer={null}
      >
        <Input
          placeholder="Tìm theo tên, môn, khoa, tag..."
          value={docQuery}
          onChange={(e) => setDocQuery(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <List
          dataSource={docResults}
          renderItem={(doc) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => applyDocumentLink(doc)}
            >
              <div>
                <div>{doc.title}</div>
                <div>
                  {doc.tags?.subject && <Tag color="red">{doc.tags.subject}</Tag>}
                  {doc.tags?.faculty && <Tag>{doc.tags.faculty}</Tag>}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="Chèn liên kết web"
        open={urlLinkOpen}
        onCancel={closeUrlLinkModal}
        onOk={applyUrlLink}
        okText="Chèn"
        cancelText="Hủy"
        destroyOnClose
      >
        <div className="note-link-form">
          <label className="note-link-form__label" htmlFor="note-link-text">
            Nội dung hiển thị
          </label>
          <Input
            id="note-link-text"
            placeholder="Ví dụ: Tài liệu tham khảo"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <label className="note-link-form__label" htmlFor="note-link-url">
            Địa chỉ liên kết (URL)
          </label>
          <Input
            id="note-link-url"
            placeholder="https://example.com"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPressEnter={applyUrlLink}
          />
        </div>
      </Modal>
    </div>
  );
};

export default NoteEditor;
