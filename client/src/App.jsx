import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import ExpenseDetailPage from './pages/ExpenseDetailPage';
import LoginPage from './pages/LoginPage';
import InvitePage from './pages/InvitePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/:code" element={<InvitePage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="groups/:groupId" element={<GroupPage />} />
        <Route path="groups/:groupId/expenses/:expenseId" element={<ExpenseDetailPage />} />
      </Route>
    </Routes>
  );
}
