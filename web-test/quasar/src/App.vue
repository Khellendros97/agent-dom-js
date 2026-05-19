<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { createAgentDom } from 'agent-dom-js';

// ==================== Agent DOM ====================
const agentDom = createAgentDom();
const snapshotText = ref('');
const ctrlTarget = ref('');
const ctrlAction = ref('click');
const ctrlValue = ref('');
const logs = ref([]);
const ACTIONS = ['click', 'fill', 'focus', 'getText', 'isVisible'];

function now() { return new Date().toLocaleTimeString(); }
function addLog(msg, type = '') {
  logs.value = [{ text: `[${now()}] ${msg}`, type }, ...logs.value.slice(0, 19)];
}
function refreshSnapshot() {
  const qDialog = document.querySelector('.q-dialog');
  const scope = qDialog ?? null;
  const result = agentDom.snapshot(scope ? { scope } : undefined);
  snapshotText.value = result.ok ? result.data.text : `[snapshot failed] ${result.error}`;
}
async function executeAction() {
  const target = ctrlTarget.value.trim();
  if (!target) { addLog('请输入目标', 'error'); return; }
  let result;
  switch (ctrlAction.value) {
    case 'snapshot': refreshSnapshot(); return;
    case 'click': result = await agentDom.click(target); break;
    case 'fill': result = await agentDom.fill(target, ctrlValue.value); break;
    case 'focus': result = await agentDom.focus(target); break;
    case 'getText': result = agentDom.getText(target); break;
    case 'isVisible': result = agentDom.isVisible(target); break;
  }
  addLog(
    result.ok ? `[${ctrlAction.value}] ${target} 成功` : `[${ctrlAction.value}] ${result.code}: ${result.error}`,
    result.ok ? 'success' : 'error',
  );
  setTimeout(refreshSnapshot, 150);
}
onMounted(refreshSnapshot);

// ==================== Form ====================
const formData = reactive({
  name: '',
  email: '',
  role: null,
  notes: '',
  subscribe: false,
  notifications: true,
});
const roleOptions = [
  { label: '访客', value: 'viewer' },
  { label: '编辑', value: 'editor' },
  { label: '管理员', value: 'admin' },
];
const submitMessage = ref('');

function submitForm() {
  submitMessage.value = `已提交 Quasar 表单：${formData.name || '未命名用户'}`;
}
function resetForm() {
  formData.name = '';
  formData.email = '';
  formData.role = null;
  formData.notes = '';
  formData.subscribe = false;
  formData.notifications = true;
  submitMessage.value = 'Quasar 表单已重置';
}

// ==================== Table ====================
const users = ref([
  { id: 1, name: '王五', email: 'wangwu@example.com', role: '管理员', status: '启用', source: 'Web端' },
  { id: 2, name: '赵六', email: 'zhaoliu@example.com', role: '编辑', status: '停用', source: '移动端' },
  { id: 3, name: '钱七', email: 'qianqi@example.com', role: '访客', status: '待审核', source: 'API导入' },
  { id: 4, name: '孙八', email: 'sunba@example.com', role: '编辑', status: '启用', source: 'Web端' },
  { id: 5, name: '周九', email: 'zhoujiu@example.com', role: '管理员', status: '启用', source: '移动端' },
  { id: 6, name: '吴十', email: 'wushi@example.com', role: '访客', status: '待审核', source: 'API导入' },
]);
const searchFilter = ref('');
const roleFilter = ref(null);
const statusFilter = ref(null);
const selectedUser = ref('');

const statusOptions = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
  { label: '待审核', value: '待审核' },
];

const filteredUsers = computed(() => {
  let list = users.value;
  const kw = searchFilter.value.trim().toLowerCase();
  if (kw) {
    list = list.filter((u) =>
      u.name.includes(kw) || u.email.includes(kw) || u.role.includes(kw),
    );
  }
  if (roleFilter.value) {
    list = list.filter((u) => u.role === roleFilter.value);
  }
  if (statusFilter.value) {
    list = list.filter((u) => u.status === statusFilter.value);
  }
  return list;
});

const columns = [
  { name: 'name', required: true, label: '姓名', align: 'left', field: 'name', sortable: true },
  { name: 'email', label: '邮箱', field: 'email', sortable: true },
  { name: 'role', label: '角色', field: 'role' },
  { name: 'status', label: '状态', field: 'status' },
  { name: 'source', label: '来源', field: 'source' },
  {
    name: 'actions', label: '操作', field: 'actions',
    style: 'width: 120px',
  },
];

function viewUser(user) {
  selectedUser.value = `正在查看 Quasar 用户：${user.name}`;
}

function deleteUser(id) {
  users.value = users.value.filter((u) => u.id !== id);
}

// ==================== Dialog ====================
const dialogOpen = ref(false);
const editingId = ref(null);
const dialogForm = reactive({
  name: '', email: '', role: null, notes: '', active: true,
});

function openAddDialog() {
  editingId.value = null;
  dialogForm.name = '';
  dialogForm.email = '';
  dialogForm.role = null;
  dialogForm.notes = '';
  dialogForm.active = true;
  dialogOpen.value = true;
}

function openEditDialog(user) {
  editingId.value = user.id;
  dialogForm.name = user.name;
  dialogForm.email = user.email;
  dialogForm.role = user.role;
  dialogForm.notes = '';
  dialogForm.active = user.status === '启用';
  dialogOpen.value = true;
}

function saveDialog() {
  const data = {
    name: dialogForm.name,
    email: dialogForm.email,
    role: dialogForm.role,
    status: dialogForm.active ? '启用' : '停用',
    source: 'Web端',
  };
  if (editingId.value) {
    const idx = users.value.findIndex((u) => u.id === editingId.value);
    if (idx >= 0) users.value[idx] = { ...users.value[idx], ...data };
  } else {
    data.id = Math.max(0, ...users.value.map((u) => u.id)) + 1;
    users.value = [data, ...users.value];
  }
  dialogOpen.value = false;
}

// ==================== Other Components ====================
const dateValue = ref('2026-05-19');
const timeValue = ref('14:00');
const sliderValue = ref(50);
const ratingValue = ref(3);
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-1">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          Agent DOM Quasar Test
          <q-badge outline color="white" class="q-ml-sm">Quasar UI</q-badge>
        </q-toolbar-title>
        <q-btn flat dense round icon="refresh" @click="refreshSnapshot" aria-label="刷新快照" />
      </q-toolbar>
    </q-header>

    <!-- Left Drawer / Menu -->
    <q-drawer side="left" v-model="leftDrawerOpen" persistent :width="200" class="bg-grey-2">
      <q-list>
        <q-item-label header class="text-weight-bold text-primary">导航菜单</q-item-label>
        <q-item clickable v-close-menu active-class="bg-primary text-white">
          <q-item-section avatar>
            <q-icon name="person" />
          </q-item-section>
          <q-item-section>用户管理</q-item-section>
        </q-item>
        <q-item clickable v-close-menu>
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>数据看板</q-item-section>
        </q-item>
        <q-item clickable v-close-menu>
          <q-item-section avatar>
            <q-icon name="description" />
          </q-item-section>
          <q-item-section>内容管理</q-item-section>
        </q-item>
        <q-item clickable v-close-menu>
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>系统设置</q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item clickable v-close-menu>
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>退出登录</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Main Content -->
    <q-page-container>
      <q-page class="q-pa-md row items-start q-gutter-md">
        <!-- ======== Section: User Profile Form ======== -->
        <q-card class="col-12 col-md-5">
          <q-card-section>
            <div class="text-h6">Quasar 用户资料表单</div>
            <div class="text-caption text-grey">用于验证 QForm、QInput、QSelect、QCheckbox、QToggle、QBtn</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-form @submit="submitForm" @reset="resetForm" class="q-gutter-md">
              <q-input
                v-model="formData.name"
                label="姓名"
                name="name"
                placeholder="请输入姓名"
                autocomplete="name"
                :rules="[(val) => !!val || '请输入姓名']"
              />
              <q-input
                v-model="formData.email"
                label="邮箱"
                type="email"
                name="email"
                placeholder="quasar@example.com"
                autocomplete="email"
                :rules="[(val) => /@/.test(val) || '请输入有效邮箱']"
              />
              <q-select
                v-model="formData.role"
                :options="roleOptions"
                label="角色"
                name="role"
                emit-value
                map-options
                placeholder="请选择角色"
              />
              <q-input
                v-model="formData.notes"
                label="备注"
                type="textarea"
                name="notes"
                placeholder="请输入备注"
                rows="3"
              />
              <q-checkbox v-model="formData.subscribe" label="订阅通知" name="subscribe" />
              <q-toggle v-model="formData.notifications" label="启用通知提醒" name="notifications" />
              <div class="q-gutter-sm">
                <q-btn label="提交" type="submit" color="primary" name="submit-btn" />
                <q-btn label="重置" type="reset" color="negative" flat name="reset-btn" />
              </div>
            </q-form>
            <q-banner v-if="submitMessage" inline-actions class="q-mt-md bg-positive text-white">
              {{ submitMessage }}
            </q-banner>
          </q-card-section>
        </q-card>

        <!-- ======== Section: Table ======== -->
        <q-card class="col-12 col-md-6">
          <q-card-section>
            <div class="text-h6">Quasar 用户表格</div>
            <div class="text-caption text-grey">用于验证 QTable、筛选输入和交互</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-gutter-sm q-mb-md items-center">
              <q-input
                v-model="searchFilter"
                label="搜索"
                placeholder="搜索姓名、邮箱、角色..."
                dense
                debounce="300"
                class="col"
              >
                <template v-slot:append>
                  <q-icon name="search" />
                </template>
              </q-input>
              <q-select
                v-model="roleFilter"
                :options="['管理员', '编辑', '访客']"
                label="角色筛选"
                clearable
                dense
                emit-value
                style="min-width: 120px"
              />
              <q-select
                v-model="statusFilter"
                :options="statusOptions"
                label="状态筛选"
                clearable
                dense
                emit-value
                map-options
                style="min-width: 130px"
              />
              <q-btn label="添加用户" color="primary" icon="add" @click="openAddDialog" name="add-user-btn" />
            </div>
            <q-table
              :rows="filteredUsers"
              :columns="columns"
              row-key="id"
              flat
              dense
              :pagination="{ rowsPerPage: 5 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.value === '启用' ? 'positive' : props.value === '停用' ? 'negative' : 'warning'"
                    text-color="white"
                    dense
                    size="12px"
                  >
                    {{ props.value }}
                  </q-chip>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn flat dense color="primary" size="sm" label="查看" @click="viewUser(props.row)" :name="`view-${props.row.id}`" />
                  <q-btn flat dense color="secondary" size="sm" label="编辑" @click="openEditDialog(props.row)" :name="`edit-${props.row.id}`" />
                  <q-btn flat dense color="negative" size="sm" label="删除" @click="deleteUser(props.row.id)" :name="`delete-${props.row.id}`" />
                </q-td>
              </template>
            </q-table>
            <q-banner v-if="selectedUser" inline-actions class="q-mt-sm bg-info text-white">
              {{ selectedUser }}
            </q-banner>
          </q-card-section>
        </q-card>

        <!-- ======== Section: Other Components ======== -->
        <q-card class="col-12">
          <q-card-section>
            <div class="text-h6">其他 Quasar 组件</div>
            <div class="text-caption text-grey">QDate、QTime、QBadge、QChip、QSlider、QRating 等</div>
          </q-card-section>
          <q-separator />
          <q-card-section class="row q-gutter-md items-start">
            <!-- Date Picker -->
            <q-input v-model="dateValue" label="日期选择" dense class="col-3">
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="dateValue" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>

            <!-- Time Picker -->
            <q-input v-model="timeValue" label="时间选择" dense class="col-3">
              <template v-slot:append>
                <q-icon name="access_time" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-time v-model="timeValue" format24h />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>

            <!-- Slider -->
            <div class="col-3">
              <div class="text-caption q-mb-xs">滑块: {{ sliderValue }}</div>
              <q-slider v-model="sliderValue" :min="0" :max="100" label />
            </div>

            <!-- Rating -->
            <div class="col-2">
              <div class="text-caption q-mb-xs">评分</div>
              <q-rating v-model="ratingValue" :max="5" size="24px" color="amber" />
            </div>

            <!-- Badges -->
            <div class="col-12 row q-gutter-sm items-center">
              <q-badge color="primary" label="主要" />
              <q-badge color="secondary" label="次要" />
              <q-badge color="positive" label="成功" />
              <q-badge color="warning" label="警告" />
              <q-badge color="negative" label="错误" />
              <q-badge color="info" label="信息" />
              <q-badge color="accent" label="强调" />
            </div>

            <!-- Chips -->
            <div class="col-12 row q-gutter-sm items-center">
              <q-chip label="默认标签" />
              <q-chip color="primary" text-color="white" label="主要标签" />
              <q-chip color="positive" text-color="white" icon="check" label="已完成" />
              <q-chip removable icon="close" label="可移除" />
            </div>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>

    <!-- Right Drawer: Agent DOM Debug Panel -->
    <q-drawer side="right" v-model="rightDrawerOpen" persistent :width="380" class="bg-white">
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title>
          <q-icon name="bolt" class="q-mr-xs" />
          Agent DOM
        </q-toolbar-title>
        <q-btn flat dense icon="refresh" @click="refreshSnapshot" aria-label="刷新快照" />
      </q-toolbar>

      <q-scroll-area style="height: calc(100% - 50px);">
        <div class="q-pa-sm">
          <!-- Snapshot display -->
          <pre class="snapshot-box q-pa-sm bg-grey-2 rounded-borders" style="font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; min-height: 120px; max-height: 360px; overflow: auto;">{{ snapshotText || '等待 snapshot()...' }}</pre>

          <q-separator class="q-my-sm" />

          <!-- Controls -->
          <div class="q-gutter-sm">
            <q-input v-model="ctrlTarget" label="目标 (ref 或 CSS selector)" dense placeholder="@e1" />
            <div class="row q-gutter-sm">
              <q-select
                v-model="ctrlAction"
                :options="ACTIONS"
                label="操作"
                dense
                emit-value
                style="min-width: 110px"
                class="col"
              />
              <q-input
                v-if="ctrlAction === 'fill'"
                v-model="ctrlValue"
                label="填充值"
                dense
                placeholder="填入的值"
                class="col"
              />
            </div>
            <q-btn label="执行" color="positive" class="full-width" icon="bolt" @click="executeAction" />

            <q-separator />

            <!-- Action Log -->
            <div class="text-caption text-grey">操作日志</div>
            <div class="log-box" style="max-height: 200px; overflow: auto; font-size: 11px; line-height: 1.6;">
              <div
                v-for="(entry, i) in logs"
                :key="i"
                :class="entry.type"
                class="q-pa-xs"
                :style="{ color: entry.type === 'error' ? '#C10015' : entry.type === 'success' ? '#21BA45' : '#888' }"
              >
                {{ entry.text }}
              </div>
              <div v-if="logs.length === 0" class="text-grey-4">暂无操作日志</div>
            </div>
          </div>
        </div>
      </q-scroll-area>
    </q-drawer>
  </q-layout>

  <!-- ======== Dialog: Add/Edit User ======== -->
  <q-dialog v-model="dialogOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ editingId ? '编辑用户' : '添加用户' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-form @submit="saveDialog" class="q-gutter-md">
          <q-input v-model="dialogForm.name" label="姓名" name="dialog-name" placeholder="请输入姓名" :rules="[(val) => !!val || '请输入姓名']" />
          <q-input v-model="dialogForm.email" label="邮箱" type="email" name="dialog-email" placeholder="user@example.com" :rules="[(val) => /@/.test(val) || '请输入有效邮箱']" />
          <q-select v-model="dialogForm.role" :options="['管理员', '编辑', '访客']" label="角色" name="dialog-role" emit-value placeholder="请选择角色" :rules="[(val) => !!val || '请选择角色']" />
          <q-input v-model="dialogForm.notes" label="备注" type="textarea" name="dialog-notes" placeholder="可选备注" rows="2" />
          <q-checkbox v-model="dialogForm.active" label="启用账号" name="dialog-active" />
          <div class="row q-gutter-sm justify-end">
            <q-btn label="取消" v-close-popup flat />
            <q-btn label="保存" type="submit" color="primary" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  data() {
    return {
      leftDrawerOpen: true,
      rightDrawerOpen: true,
    };
  },
};
</script>

<style scoped>
.snapshot-box {
  font-family: monospace;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
