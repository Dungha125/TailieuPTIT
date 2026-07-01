import { Navigate, useParams } from 'react-router-dom';

const NotesPage = () => {
  const { noteId } = useParams();
  const params = new URLSearchParams({ tab: 'notes' });
  if (noteId) params.set('note', noteId);
  return <Navigate to={`/documents?${params.toString()}`} replace />;
};

export default NotesPage;
