import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  DashboardOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SettingOutlined,
  TeamOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { createAgentDom } from 'agent-dom-js';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const INITIAL_USERS = [
  { id: 1, name: '张伟', email: 'zhangwei@example.com', role: '管理员', status: 'active' },
  { id: 2, name: '李娜', email: 'lina@example.com', role: '编辑', status: 'active' },
  { id: 3, name: '王磊', email: 'wanglei@example.com', role: '编辑', status: 'pending' },
  { id: 4, name: '赵敏', email: 'zhaomin@example.com', role: '访客', status: 'inactive' },
  { id: 5, name: '陈强', email: 'chenqiang@example.com', role: '访客', status: 'active' },
  { id: 6, name: '刘洋', email: 'liuyang@example.com', role: '管理员', status: 'active' },
  { id: 7, name: '周倩', email: 'zhouqian@example.com', role: '编辑', status: 'pending' },
  { id: 8, name: '吴昊', email: 'wuhao@example.com', role: '访客', status: 'inactive' },
];

const STATUS_MAP = { active: { label: '启用', color: 'green' }, inactive: { label: '停用', color: 'red' }, pending: { label: '待审核', color: 'orange' } };
const ROLES = ['管理员', '编辑', '访客'];

function AgentSidebar({ agentDom, rootRef }) {
  const [snapText, setSnapText] = useState('');
  const [target, setTarget] = useState('');
  const [action, setAction] = useState('click');
  const [value, setValue] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((msg, type = '') => {
    setLogs((prev) => [{ text: `[${new Date().toLocaleTimeString()}] ${msg}`, type }, ...prev.slice(0, 19)]);
  }, []);

  const refresh = useCallback(() => {
    const modalWrap = document.querySelector('.ant-modal-wrap');
    const scope = modalWrap ?? null;
    const r = agentDom.snapshot(scope ? { scope } : undefined);
    setSnapText(r.ok ? r.data.text : `[snapshot failed] ${r.error}`);
  }, [agentDom]);

  useEffect(() => { refresh(); }, [refresh]);

  const exec = useCallback(async () => {
    if (!target.trim()) { addLog('请输入目标', 'error'); return; }
    let r;
    switch (action) {
      case 'snapshot': refresh(); return;
      case 'click': r = await agentDom.click(target); break;
      case 'fill': r = await agentDom.fill(target, value); break;
      case 'focus': r = await agentDom.focus(target); break;
      case 'getText': r = agentDom.getText(target); break;
      case 'isVisible': r = agentDom.isVisible(target); break;
    }
    addLog(r.ok ? `[${action}] 成功` : `[${action}] ${r.code}: ${r.error}`, r.ok ? 'success' : 'error');
    setTimeout(refresh, 150);
  }, [agentDom, target, action, value, addLog, refresh]);

  return (
    <div ref={rootRef} style={{ width: 380, flexShrink: 0 }}>
    <Card
      size="small"
      title={<Space><ThunderboltOutlined />Agent DOM</Space>}
      extra={<Button size="small" icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>}
      style={{ borderRadius: 0, borderRight: 'none', borderTop: 'none', borderBottom: 'none', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 } }}
    >
      <Paragraph
        style={{ flex: 1, overflow: 'auto', margin: 0, padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#fafafa', minHeight: 0 }}
        code
      >
        {snapText || '等待 snapshot()...'}
      </Paragraph>
      <Divider style={{ margin: 0 }} />
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <Input size="small" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="目标 (ref 或 CSS selector)" prefix={<Text type="secondary" style={{ fontSize: 11 }}>@e1</Text>} />
          <Space.Compact block>
            <Select size="small" value={action} onChange={setAction} style={{ width: 120 }} getPopupContainer={(trigger) => trigger.parentElement || document.body}
              options={[{ value: 'click', label: 'click' }, { value: 'fill', label: 'fill' }, { value: 'focus', label: 'focus' }, { value: 'getText', label: 'getText' }, { value: 'isVisible', label: 'isVisible' }]}
            />
            {action === 'fill' && (
              <Input size="small" value={value} onChange={(e) => setValue(e.target.value)} placeholder="填充值" style={{ flex: 1 }} />
            )}
          </Space.Compact>
          <Button type="primary" size="small" block onClick={exec} icon={<ThunderboltOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }}>执行</Button>
        </Space>
        <div style={{ marginTop: 8, fontSize: 11, color: '#888', maxHeight: 72, overflow: 'auto', lineHeight: 1.6 }}>
          {logs.map((entry, i) => (
            <div key={i} style={{ color: entry.type === 'error' ? '#ff4d4f' : entry.type === 'success' ? '#52c41a' : '#888' }}>{entry.text}</div>
          ))}
        </div>
      </div>
    </Card>
    </div>
  );
}

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const agentDom = useRef(null);
  if (!agentDom.current) agentDom.current = createAgentDom();
  const [messageApi, contextHolder] = message.useMessage();
  const agentSidebarRef = useRef(null);
  const lastAgentSidebarPointerAt = useRef(0);

  // Record when pointer/mouse events originate from Agent sidebar
  useEffect(() => {
    const record = (event) => {
      const path = event.composedPath?.();
      const insideSidebar = path
        ? path.includes(agentSidebarRef.current)
        : agentSidebarRef.current?.contains(event.target);
      if (insideSidebar) lastAgentSidebarPointerAt.current = performance.now();
    };
    window.addEventListener('pointerdown', record, true);
    window.addEventListener('mousedown', record, true);
    return () => {
      window.removeEventListener('pointerdown', record, true);
      window.removeEventListener('mousedown', record, true);
    };
  }, []);

  const handleStatusSelectOpenChange = (nextOpen) => {
    if (!nextOpen && performance.now() - lastAgentSidebarPointerAt.current < 150) return;
    setStatusSelectOpen(nextOpen);
  };

  const filtered = users.filter((u) => {
    const s = searchText.toLowerCase();
    return (!s || u.name.includes(s) || u.email.toLowerCase().includes(s) || u.role.includes(s)) &&
      (!statusFilter || u.status === statusFilter);
  });

  function openAdd() {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ status: true });
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingId(record.id);
    form.setFieldsValue({ ...record, status: record.status === 'active' });
    setModalOpen(true);
  }

  function handleDelete(id) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    messageApi.success('已删除');
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      setLoading(true);
      setTimeout(() => {
        const data = {
          ...values,
          status: values.status ? 'active' : 'inactive',
        };
        if (editingId) {
          setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...data } : u)));
          messageApi.success('已更新');
        } else {
          setUsers((prev) => [{ id: Math.max(0, ...prev.map((u) => u.id)) + 1, ...data }, ...prev]);
          messageApi.success('已添加');
        }
        setModalOpen(false);
        setLoading(false);
      }, 300);
    }).catch(() => {});
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (v) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label}</Tag> },
    {
      title: '操作', key: 'actions', width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 32, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: collapsed ? 14 : 16, color: '#1677ff', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {collapsed ? 'AD' : 'Admin Pro'}
        </div>
        <Menu mode="inline" defaultSelectedKeys={['users']} items={[
          { key: 'users', icon: <TeamOutlined />, label: '用户管理' },
          { key: 'dashboard', icon: <DashboardOutlined />, label: '数据看板' },
          { key: 'content', icon: <FileTextOutlined />, label: '内容管理' },
          { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
          { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
        ]} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <Breadcrumb style={{ marginLeft: 16 }} items={[{ title: '首页' }, { title: '用户管理' }]} />
        </Header>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Content style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4} style={{ margin: 0 }}>用户管理</Title>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Input.Search placeholder="搜索姓名、邮箱..." allowClear style={{ width: 280 }} onSearch={setSearchText} onChange={(e) => { if (!e.target.value) setSearchText(''); }} />
              <Select open={statusSelectOpen} onOpenChange={handleStatusSelectOpenChange} placeholder="筛选状态" allowClear style={{ width: 140 }} onChange={setStatusFilter} options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
              <Button type="primary" icon={<span>+</span>} onClick={openAdd}>添加用户</Button>
            </div>
            <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }} />
          </Content>
          <AgentSidebar agentDom={agentDom.current} rootRef={agentSidebarRef} />
        </div>
      </Layout>

      <Modal title={editingId ? '编辑用户' : '添加用户'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={loading} destroyOnHidden width={520}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" autoComplete="name" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="user@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="请选择角色" options={ROLES.map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="可选备注" />
          </Form.Item>
          <Form.Item name="status" valuePropName="checked">
            <Checkbox>启用账号</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

createRoot(document.getElementById('root')).render(<App />);
