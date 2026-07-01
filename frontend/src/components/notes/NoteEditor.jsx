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
import { useCallback, useEffect, useState } from 'react';
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
} from '@ant-design/icons';
import { documentsApi } from '../../api';
import { DocumentLink } from './DocumentLinkExtension';
import { flattenFolders } from './folderUtils';
import { useDebouncedValue } from '../../utils/useDebouncedValue';

const NoteEditor = ({ note, folders = [], onSave, onTitleChange, onFolderChange }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(note?.title || '');
  const [linkOpen, setLinkOpen] = useState(false);
  const [docQuery, setDocQuery] = useState('');
  const [docResults, setDocResults] = useState([]);
  const debouncedQ = useDebouncedValue(docQuery);

  const handleEditorClick = useCallback(
    (_view, event) => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return false;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return false;
      event.preventDefault();
      event.stopPropagation();
      if (event.ctrlKey || event.metaKey || event.button === 1) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        navigate(href);
      }
      return true;
    },
    [navigate]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'note-link' } }),
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
      handleDOMEvents: {
        click: handleEditorClick,
      },
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
    if (!linkOpen) return;
    documentsApi
      .browse({ q: debouncedQ, pageSize: 10 })
      .then((res) => setDocResults(res.data.items))
      .catch(() => setDocResults([]));
  }, [debouncedQ, linkOpen]);

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

  if (!editor) return null;

  const folderOptions = flattenFolders(folders).map((f) => ({ value: f.id, label: f.label }));

  const btn = (active, onClick, icon) => (
    <Button type={active ? 'primary' : 'text'} size="small" icon={icon} onClick={onClick} />
  );

  return (
    <div className="note-editor">
      <Input
        className="note-editor__title"
        variant="borderless"
        value={title}
        placeholder="Tiêu đề"
        onChange={(e) => {
          setTitle(e.target.value);
          onTitleChange?.(e.target.value);
        }}
      />
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
        <span className="note-editor__meta-hint">Ctrl + click để mở liên kết trong tab mới</span>
      </div>
      <div className="note-editor__toolbar">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <BoldOutlined />)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <ItalicOutlined />)}
        {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <UnderlineOutlined />)}
        {btn(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), <HighlightOutlined />)}
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <UnorderedListOutlined />)}
        {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <OrderedListOutlined />)}
        {btn(false, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), <TableOutlined />)}
        {btn(false, () => setLinkOpen(true), <FileTextOutlined />)}
        {btn(false, () => {
          const url = window.prompt('URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }, <LinkOutlined />)}
      </div>
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
    </div>
  );
};

export default NoteEditor;
