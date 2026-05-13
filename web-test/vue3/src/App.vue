<script setup>
import { computed, reactive, ref } from 'vue';

const profile = reactive({
  name: '',
  email: '',
  role: 'viewer',
  notes: '',
  subscribe: false,
});

const users = ref([
  { id: 1, name: '王五', role: '管理员', status: '启用' },
  { id: 2, name: '赵六', role: '编辑', status: '停用' },
  { id: 3, name: '钱七', role: '访客', status: '待审核' },
]);

const selectedUser = ref('');
const submitMessage = ref('');
const keyword = ref('');
const announcement = ref('Vue 公告内容可编辑');

const filteredUsers = computed(() => {
  const value = keyword.value.trim();
  if (!value) {
    return users.value;
  }
  return users.value.filter((user) => user.name.includes(value) || user.role.includes(value));
});

function submitProfile() {
  submitMessage.value = `已提交 Vue 表单：${profile.name || '未命名用户'}`;
}

function resetProfile() {
  profile.name = '';
  profile.email = '';
  profile.role = 'viewer';
  profile.notes = '';
  profile.subscribe = false;
  submitMessage.value = 'Vue 表单已重置';
}
</script>

<template>
  <main>
    <header>
      <h1>Vue 3 测试页</h1>
      <p>用于验证库对 Vue 受控表单、事件绑定、表格筛选和内容编辑的兼容性。</p>
    </header>

    <section aria-labelledby="vue-form-title">
      <h2 id="vue-form-title">Vue 用户资料表单</h2>
      <form @submit.prevent="submitProfile">
        <label>
          姓名
          <input v-model="profile.name" name="name" placeholder="请输入 Vue 用户姓名" autocomplete="name" />
        </label>
        <label>
          邮箱
          <input v-model="profile.email" name="email" type="email" placeholder="vue@example.com" />
        </label>
        <label>
          角色
          <select v-model="profile.role" name="role">
            <option value="viewer">访客</option>
            <option value="editor">编辑</option>
            <option value="admin">管理员</option>
          </select>
        </label>
        <label>
          备注
          <textarea v-model="profile.notes" name="notes" rows="4" placeholder="请输入 Vue 备注"></textarea>
        </label>
        <label class="inline">
          <input v-model="profile.subscribe" name="subscribe" type="checkbox" />
          接收 Vue 通知
        </label>
        <div class="toolbar">
          <button type="submit">提交 Vue 表单</button>
          <button class="secondary" type="button" @click="resetProfile">重置 Vue 表单</button>
        </div>
      </form>
      <p class="status" role="status">{{ submitMessage }}</p>
    </section>

    <section aria-labelledby="vue-table-title">
      <h2 id="vue-table-title">Vue 用户表格</h2>
      <label>
        筛选用户
        <input v-model="keyword" placeholder="输入姓名或角色" />
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
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.role }}</td>
            <td>{{ user.status }}</td>
            <td><button type="button" @click="selectedUser = user.name">查看 {{ user.name }}</button></td>
          </tr>
        </tbody>
      </table>
      <p class="status" role="status">{{ selectedUser ? `正在查看 Vue 用户：${selectedUser}` : '' }}</p>
    </section>

    <section aria-labelledby="vue-editable-title">
      <h2 id="vue-editable-title">Vue 可编辑内容</h2>
      <div
        class="editable"
        contenteditable="true"
        role="textbox"
        aria-label="Vue 公告内容"
        @input="announcement = $event.currentTarget.textContent"
      >{{ announcement }}</div>
    </section>
  </main>
</template>
