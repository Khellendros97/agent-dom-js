import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const initialProfile = {
  name: '',
  email: '',
  role: 'viewer',
  notes: '',
  subscribe: false,
};

const users = [
  { id: 1, name: '孙八', role: '管理员', status: '启用' },
  { id: 2, name: '周九', role: '编辑', status: '停用' },
  { id: 3, name: '吴十', role: '访客', status: '待审核' },
];

function App() {
  const [profile, setProfile] = useState(initialProfile);
  const [keyword, setKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [announcement, setAnnouncement] = useState('React 公告内容可编辑');

  const filteredUsers = useMemo(() => {
    const value = keyword.trim();
    if (!value) {
      return users;
    }
    return users.filter((user) => user.name.includes(value) || user.role.includes(value));
  }, [keyword]);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setProfile((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function submitProfile(event) {
    event.preventDefault();
    setSubmitMessage(`已提交 React 表单：${profile.name || '未命名用户'}`);
  }

  function resetProfile() {
    setProfile(initialProfile);
    setSubmitMessage('React 表单已重置');
  }

  return (
    <main>
      <header>
        <h1>React 测试页</h1>
        <p>用于验证库对 React 受控表单、合成事件、表格筛选和内容编辑的兼容性。</p>
      </header>

      <section aria-labelledby="react-form-title">
        <h2 id="react-form-title">React 用户资料表单</h2>
        <form onSubmit={submitProfile}>
          <label>
            姓名
            <input name="name" value={profile.name} onChange={updateField} placeholder="请输入 React 用户姓名" autoComplete="name" />
          </label>
          <label>
            邮箱
            <input name="email" type="email" value={profile.email} onChange={updateField} placeholder="react@example.com" />
          </label>
          <label>
            角色
            <select name="role" value={profile.role} onChange={updateField}>
              <option value="viewer">访客</option>
              <option value="editor">编辑</option>
              <option value="admin">管理员</option>
            </select>
          </label>
          <label>
            备注
            <textarea name="notes" rows="4" value={profile.notes} onChange={updateField} placeholder="请输入 React 备注" />
          </label>
          <label className="inline">
            <input name="subscribe" type="checkbox" checked={profile.subscribe} onChange={updateField} />
            接收 React 通知
          </label>
          <div className="toolbar">
            <button type="submit">提交 React 表单</button>
            <button className="secondary" type="button" onClick={resetProfile}>重置 React 表单</button>
          </div>
        </form>
        <p className="status" role="status">{submitMessage}</p>
      </section>

      <section aria-labelledby="react-table-title">
        <h2 id="react-table-title">React 用户表格</h2>
        <label>
          筛选用户
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入姓名或角色" />
        </label>
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>角色</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.role}</td>
                <td>{user.status}</td>
                <td><button type="button" onClick={() => setSelectedUser(user.name)}>查看 {user.name}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="status" role="status">{selectedUser ? `正在查看 React 用户：${selectedUser}` : ''}</p>
      </section>

      <section aria-labelledby="react-editable-title">
        <h2 id="react-editable-title">React 可编辑内容</h2>
        <div
          className="editable"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="React 公告内容"
          onInput={(event) => setAnnouncement(event.currentTarget.textContent || '')}
        >{announcement}</div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
